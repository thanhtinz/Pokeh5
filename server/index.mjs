/**
 * Máy chủ tài khoản của Broke to Boss.
 *
 * Không một thư viện ngoài nào: `node:http`, `node:sqlite`, `node:crypto`. Cả
 * game client cũng chỉ có mỗi Preact, nên máy chủ đi kèm mà kéo về ba trăm gói
 * thì lệch hẳn với phần còn lại của dự án — và mỗi gói là một thứ phải theo dõi
 * lỗ hổng suốt đời.
 *
 *   node server/index.mjs
 *   PORT=8787 DB_FILE=/var/lib/btb.sqlite node server/index.mjs
 *
 * Đường dẫn:
 *
 *   POST   /api/register  {name, password}      → {token, user}
 *   POST   /api/login     {name, password}      → {token, user}
 *   POST   /api/logout                          → 204
 *   GET    /api/me                              → {user}
 *   POST   /api/password  {current, next}       → 204
 *   DELETE /api/account   {password}            → 204
 *   PUT    /api/save      {save, score}         → {user}
 *   GET    /api/save                            → {save, seenAt}
 *   GET    /api/board?mode=week&limit=50        → {mode, rows, total, you, endsAt}
 *   GET    /api/health                          → {ok, players, uptime}
 *
 * Mọi đường có dấu sao cần `Authorization: Bearer <token>`.
 */
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';

import { checkCredentials, hashPassword, hashToken, mintToken, verifyPassword } from './auth.mjs';
import { SESSION_TTL, createQueries, openDb, publicUser } from './db.mjs';
import { bearer, clientIp, fail, rateLimiter, readJson, send } from './http.mjs';
import { gradeScore } from './scores.mjs';
import { seasonOf, weekEnds, weekOf } from './season.mjs';

const PORT = Number(process.env['PORT'] ?? 8787);
const DB_FILE = process.env['DB_FILE'] ?? 'broketoboss.sqlite';
const TRUST_PROXY = process.env['TRUST_PROXY'] === '1';
/** Ghi một dòng cho mỗi request. Tắt bằng `LOG=0` khi có lớp khác lo việc đó. */
const LOG = process.env['LOG'] !== '0';

/** Bao nhiêu dòng bảng xếp hạng trả về nhiều nhất trong một lần gọi. */
const BOARD_MAX = 100;

const db = openDb(DB_FILE);
const q = createQueries(db);

/**
 * Một chuỗi băm giả để so lúc không tìm thấy tài khoản.
 *
 * Trả về cùng một câu lỗi cho "không có tên này" và "sai mật khẩu" vẫn chưa đủ:
 * không có tài khoản thì bỏ qua luôn scrypt, nên máy chủ trả lời trong một mili
 * giây thay vì một trăm — và cái chênh lệch đó *chính là* câu trả lời cho "tên
 * này có tồn tại không". Băm một lần với chuỗi giả cho hai nhánh tốn thời gian
 * như nhau.
 */
const DECOY = await hashPassword(randomBytes(32).toString('hex'));

// Đăng ký và đăng nhập bị siết chặt hơn hẳn phần còn lại: đó là hai chỗ duy
// nhất mà gọi nhiều lần có ích cho kẻ đang dò mật khẩu.
const allowAuth = rateLimiter({ windowMs: 60_000, max: 10 });
const allowWrite = rateLimiter({ windowMs: 60_000, max: 30 });
const allowRead = rateLimiter({ windowMs: 60_000, max: 120 });

/** Phiên đăng nhập ứng với request, hoặc null. */
function sessionOf(req, now) {
  const token = bearer(req);
  if (token === null) return null;

  const hash = hashToken(token);
  const row = q.sessionByHash.get(hash);
  if (!row) return null;

  if (now - row.last_used_at > SESSION_TTL) {
    q.deleteSession.run(hash);
    return null;
  }

  const user = q.userById.get(row.user_id);
  if (!user) return null;

  q.touchSession.run(now, hash);
  return { hash, user };
}

async function route(req, res, url, now) {
  const ip = clientIp(req, TRUST_PROXY);
  const path = url.pathname;

  if (req.method === 'OPTIONS') return send(res, 204);

  // Đủ để một cái giám sát biết máy chủ sống *và* đọc được kho — `ok: true`
  // suông thì vẫn trả về đúng ngay cả khi ổ đĩa đã hỏng. Không có gì ở đây mà
  // bảng xếp hạng chưa công khai sẵn.
  if (path === '/api/health') {
    return send(res, 200, {
      ok: true,
      players: q.playerCount.get().total,
      uptime: Math.round(process.uptime()),
    });
  }

  // ------------------------------------------------------------- tài khoản --

  if (path === '/api/register' && req.method === 'POST') {
    if (!allowAuth(ip, now)) return fail(res, 429, 'rate.limited');

    const body = await readJson(req);
    if (!body) return fail(res, 400, 'body.invalid');

    const problem = checkCredentials(body.name, body.password);
    if (problem) return fail(res, 400, problem);

    if (q.userByName.get(String(body.name).toLowerCase())) {
      return fail(res, 409, 'name.taken');
    }

    const password = await hashPassword(body.password);

    // Băm mật khẩu mất cả trăm mili giây, thừa thời gian cho một request khác
    // lấy mất cái tên vừa kiểm ở trên. Ràng buộc UNIQUE mới là chỗ quyết định;
    // bắt lại nó ở đây để chuyện đó ra "tên đã có người lấy" chứ không ra 500.
    let inserted;
    try {
      inserted = q.insertUser.run(
        String(body.name),
        String(body.name).toLowerCase(),
        password,
        now,
        0,
      );
    } catch {
      return fail(res, 409, 'name.taken');
    }

    const user = q.userById.get(inserted.lastInsertRowid);
    const { token, hash } = mintToken();
    q.insertSession.run(hash, user.id, now, now);

    return send(res, 201, { token, user: publicUser(user) });
  }

  if (path === '/api/login' && req.method === 'POST') {
    if (!allowAuth(ip, now)) return fail(res, 429, 'rate.limited');

    const body = await readJson(req);
    if (!body) return fail(res, 400, 'body.invalid');

    const user = q.userByName.get(String(body.name ?? '').toLowerCase());
    // Cùng một câu trả lời *và* cùng một khoảng thời gian cho "không có tài
    // khoản này" với "sai mật khẩu", để trang đăng nhập không thành chỗ dò xem
    // ai đã đăng ký.
    const ok = await verifyPassword(String(body.password ?? ''), user ? user.password : DECOY);
    if (!user || !ok) return fail(res, 401, 'login.wrong');

    const { token, hash } = mintToken();
    q.insertSession.run(hash, user.id, now, now);

    return send(res, 200, { token, user: publicUser(user) });
  }

  if (path === '/api/logout' && req.method === 'POST') {
    const session = sessionOf(req, now);
    if (session) q.deleteSession.run(session.hash);
    // Đăng xuất luôn thành công. Token hỏng hay hết hạn thì kết quả mong muốn
    // đã đạt được rồi, báo lỗi chỉ tổ làm client kẹt ở màn hình không thoát ra được.
    return send(res, 204);
  }

  if (path === '/api/me' && req.method === 'GET') {
    const session = sessionOf(req, now);
    if (!session) return fail(res, 401, 'auth.required');
    return send(res, 200, { user: publicUser(session.user) });
  }

  /*
   * Đổi mật khẩu.
   *
   * Bắt buộc đăng nhập mới chơi được, nên quên mật khẩu là mất luôn ván. Không
   * có email thì không gửi được link đặt lại, và cái làm được thì phải làm:
   * người còn nhớ mật khẩu cũ phải đổi được sang cái mới.
   *
   * Đổi xong thì **mọi phiên khác chết**. Lý do người ta đổi mật khẩu thường là
   * vì nghi có người khác đang dùng, mà đổi xong phiên của người kia vẫn sống
   * thì việc vừa làm chẳng có tác dụng gì.
   */
  if (path === '/api/password' && req.method === 'POST') {
    const session = sessionOf(req, now);
    if (!session) return fail(res, 401, 'auth.required');
    if (!allowAuth(ip, now)) return fail(res, 429, 'rate.limited');

    const body = await readJson(req);
    if (!body) return fail(res, 400, 'body.invalid');

    const problem = checkCredentials(session.user.name, body.next);
    if (problem) return fail(res, 400, problem);

    const ok = await verifyPassword(String(body.current ?? ''), session.user.password);
    if (!ok) return fail(res, 403, 'password.wrong');

    q.setPassword.run(await hashPassword(body.next), session.user.id);
    q.deleteOtherSessions.run(session.user.id, session.hash);

    return send(res, 204);
  }

  /*
   * Xoá tài khoản.
   *
   * Bắt người ta lập tài khoản mới thì phải để người ta bỏ đi được — và bỏ đi
   * nghĩa là dữ liệu biến mất thật, không phải một lá cờ "đã ẩn". Phiên đăng
   * nhập tự đi theo nhờ `ON DELETE CASCADE`.
   */
  if (path === '/api/account' && req.method === 'DELETE') {
    const session = sessionOf(req, now);
    if (!session) return fail(res, 401, 'auth.required');
    if (!allowAuth(ip, now)) return fail(res, 429, 'rate.limited');

    const body = await readJson(req);
    const ok = await verifyPassword(String(body?.password ?? ''), session.user.password);
    if (!ok) return fail(res, 403, 'password.wrong');

    q.deleteUser.run(session.user.id);
    return send(res, 204);
  }

  // -------------------------------------------------------------- bản lưu --

  if (path === '/api/save' && req.method === 'PUT') {
    const session = sessionOf(req, now);
    if (!session) return fail(res, 401, 'auth.required');
    if (!allowWrite(`u${session.user.id}`, now)) return fail(res, 429, 'rate.limited');

    const body = await readJson(req);
    if (!body || typeof body.save !== 'object' || body.save === null) {
      return fail(res, 400, 'body.invalid');
    }

    const graded = gradeScore(body.score, {
      ageSeconds: (now - session.user.created_at) / 1000,
      previousBest: session.user.best_net_worth,
    });
    if (!graded.ok) return fail(res, 422, graded.reason);

    const season = seasonOf(session.user, graded.score.bestNetWorth, now);

    const seenAt = Number(body.save.lastSeenAt);
    q.writeSave.run(
      graded.score.bestNetWorth,
      graded.score.reputationTotal,
      graded.score.runs,
      graded.score.claimed,
      season.key,
      season.base,
      season.climb,
      JSON.stringify(body.save),
      Number.isFinite(seenAt) ? seenAt : now,
      now,
      session.user.id,
    );

    return send(res, 200, { user: publicUser(q.userById.get(session.user.id)) });
  }

  if (path === '/api/save' && req.method === 'GET') {
    const session = sessionOf(req, now);
    if (!session) return fail(res, 401, 'auth.required');

    const raw = session.user.save_json;
    if (!raw) return send(res, 200, { save: null, seenAt: 0 });

    try {
      return send(res, 200, { save: JSON.parse(raw), seenAt: session.user.save_seen_at });
    } catch {
      // Bản lưu hỏng trong kho thì trả về "chưa có" chứ không trả về 500: client
      // đã biết cách bắt đầu lại từ đầu, còn một cái lỗi máy chủ thì nó không biết.
      return send(res, 200, { save: null, seenAt: 0 });
    }
  }

  // ------------------------------------------------------ bảng xếp hạng ----

  if (path === '/api/board' && req.method === 'GET') {
    if (!allowRead(ip, now)) return fail(res, 429, 'rate.limited');

    const asked = Number(url.searchParams.get('limit') ?? 50);
    const limit = Math.min(BOARD_MAX, Math.max(1, Number.isFinite(asked) ? asked : 50));
    // Hai bảng, một đường: mọi thời là mặc định, tuần này là thứ hỏi thêm.
    const mode = url.searchParams.get('mode') === 'week' ? 'week' : 'all';
    const week = weekOf(now);

    // Số bậc leo được đọc kèm nhãn tuần: một người bỏ chơi từ tháng trước vẫn
    // còn nguyên `week_climb` của tuần đó trong kho, và bày nó ra như thành
    // tích của tuần này là nói sai.
    const shape = (row, rank) => ({
      rank,
      name: row.name,
      bestNetWorth: row.best_net_worth,
      reputationTotal: row.reputation_total,
      runs: row.runs,
      claimed: row.claimed,
      weekClimb: row.week_key === week ? row.week_climb : 0,
    });

    const listed = mode === 'week' ? q.topWeek.all(week, limit) : q.top.all(limit);
    const rows = listed.map((row, index) => shape(row, index + 1));

    // Hạng của chính mình tính riêng, vì người thứ chín trăm cũng phải thấy
    // được mình đứng đâu mà không cần tải về chín trăm dòng.
    let you = null;
    const session = sessionOf(req, now);
    if (session && session.user.updated_at > 0) {
      const me = session.user;

      if (mode !== 'week') {
        const { above } = q.rankOf.get(me.best_net_worth, me.best_net_worth, me.id);
        you = shape(me, above + 1);
      } else if (me.week_key === week && me.week_climb > 0) {
        const { above } = q.rankOfWeek.get(week, me.week_climb, me.week_climb, me.id);
        you = shape(me, above + 1);
      } else {
        // Tuần này chưa leo được bậc nào thì chưa có hạng. Hạng 0 nghĩa là
        // "chưa vào bảng", và nói thế đúng hơn là gán cho người ta số thứ tự
        // cuối của một danh sách không có tên họ.
        you = shape(me, 0);
      }
    }

    const total = mode === 'week' ? q.weekCount.get(week).total : q.playerCount.get().total;
    return send(res, 200, { mode, rows, total, you, endsAt: weekEnds(now) });
  }

  return fail(res, 404, 'not.found');
}

const server = createServer((req, res) => {
  const now = Date.now();
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  /*
   * Một dòng cho mỗi request, ra stdout để cái nào đang trông tiến trình thì
   * gom. Chỉ đường dẫn, mã trả về và số mili giây — **không thân request, không
   * header**. Thân của `/api/login` là mật khẩu thô và header là token; ghi
   * chúng vào log là biến file log thành thứ nguy hiểm hơn cả cơ sở dữ liệu,
   * vì log thì ai cũng nghĩ là đọc được.
   */
  if (LOG) {
    res.on('finish', () => {
      console.log(
        `${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - now}ms`,
      );
    });
  }

  route(req, res, url, now).catch((error) => {
    // Một request hỏng không được phép mang cả tiến trình đi theo, và cũng
    // không được kể cho người gọi nghe stack trace của mình.
    console.error(`${req.method} ${url.pathname}`, error);
    if (!res.headersSent) fail(res, 500, 'server.error');
    else res.end();
  });
});

/**
 * Tắt cho sạch.
 *
 * SQLite chịu được cúp điện, nên chuyện này không phải để chống hỏng dữ liệu.
 * Nó để hai việc: request đang dở được trả lời xong thay vì đứt giữa chừng, và
 * `db.close()` gộp nốt phần WAL vào file chính — nên bản sao lưu ngay sau khi
 * dừng máy chủ là một file, không phải ba.
 */
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`${signal} — đang đóng`);
    server.close(() => {
      db.close();
      process.exit(0);
    });
    // Ai đó giữ kết nối mở mãi thì cũng không được giữ cả tiến trình lại.
    setTimeout(() => process.exit(0), 5_000).unref();
  });
}

// Phiên bỏ quên lâu ngày dọn mỗi giờ. `unref` để lệnh dừng máy chủ không phải
// đợi hết một tiếng mới thoát được.
setInterval(() => q.expireSessions.run(Date.now() - SESSION_TTL), 3_600_000).unref();

server.listen(PORT, () => {
  console.log(`broke-to-boss api on :${PORT} (db ${DB_FILE})`);
});
