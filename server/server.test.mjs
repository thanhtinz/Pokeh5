/**
 * Bài kiểm của máy chủ.
 *
 * Chạy trên chính `.mjs` mà máy chủ chạy — không qua bundler, không bước dựng,
 * nên thứ được kiểm đúng là thứ sẽ chạy thật.
 */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { checkCredentials, hashPassword, hashToken, mintToken, verifyPassword } from './auth.mjs';
import { createQueries, openDb, publicUser } from './db.mjs';
import { rateLimiter } from './http.mjs';
import { ABSOLUTE_CEILING, OPENING_CEILING, ceilingFor, gradeScore } from './scores.mjs';
import { orders, seasonOf, weekEnds, weekOf } from './season.mjs';

describe('mật khẩu', () => {
  it('băm rồi kiểm lại được, và hai lần băm ra hai chuỗi khác nhau', async () => {
    const a = await hashPassword('matkhaudai');
    const b = await hashPassword('matkhaudai');

    // Muối khác nhau nên chuỗi khác nhau — nếu bằng nhau là quên bỏ muối, và
    // lúc đó rò cơ sở dữ liệu là lộ luôn ai dùng chung mật khẩu với ai.
    expect(a).not.toBe(b);
    expect(await verifyPassword('matkhaudai', a)).toBe(true);
    expect(await verifyPassword('matkhaudai', b)).toBe(true);
  });

  it('sai mật khẩu thì không qua', async () => {
    const stored = await hashPassword('matkhaudai');
    expect(await verifyPassword('matkhaudad', stored)).toBe(false);
    expect(await verifyPassword('', stored)).toBe(false);
  });

  it('bản ghi hỏng thì trả false chứ không ném lỗi', async () => {
    for (const junk of ['', 'x', 'scrypt$a$b$c$d$e', 'md5$1$1$1$aa$bb', null, undefined, 42]) {
      expect(await verifyPassword('matkhaudai', junk)).toBe(false);
    }
  });

  it('không lưu mật khẩu thô ở đâu trong chuỗi băm', async () => {
    const stored = await hashPassword('conchomeo123');
    expect(stored).not.toContain('conchomeo123');
  });
});

describe('token', () => {
  it('cái gửi cho client khác cái lưu trong kho', () => {
    const { token, hash } = mintToken();
    expect(hash).not.toBe(token);
    expect(hashToken(token)).toBe(hash);
  });

  it('hai lần cấp ra hai token khác nhau', () => {
    expect(mintToken().token).not.toBe(mintToken().token);
  });
});

describe('kiểm tên và mật khẩu', () => {
  it('nhận tên hợp lệ', () => {
    expect(checkCredentials('tinz', 'matkhaudai')).toBeNull();
    expect(checkCredentials('a_b-9', 'matkhaudai')).toBeNull();
  });

  it('loại tên sai khuôn', () => {
    expect(checkCredentials('ab', 'matkhaudai')).toBe('name.shape');
    expect(checkCredentials('a'.repeat(17), 'matkhaudai')).toBe('name.shape');
    // Tên đăng nhập chỉ ASCII: hai tên trông y hệt mà khác byte là một cách
    // mạo danh trên bảng xếp hạng.
    expect(checkCredentials('tinź', 'matkhaudai')).toBe('name.shape');
    expect(checkCredentials('có dấu', 'matkhaudai')).toBe('name.shape');
  });

  it('loại mật khẩu ngắn và dài quá', () => {
    expect(checkCredentials('tinz', 'ngan')).toBe('password.short');
    expect(checkCredentials('tinz', 'x'.repeat(201))).toBe('password.long');
  });
});

describe('trần điểm', () => {
  it('tài khoản vừa lập không đứng đầu bảng được', () => {
    expect(ceilingFor(0)).toBe(OPENING_CEILING);
    expect(gradeScore({ bestNetWorth: 1e40 }, { ageSeconds: 0 }).ok).toBe(false);
    expect(gradeScore({ bestNetWorth: 1e40 }, { ageSeconds: 0 }).reason).toBe('score.tooFast');
  });

  it('nới dần theo tuổi rồi dừng ở trần tuyệt đối', () => {
    expect(ceilingFor(300)).toBeCloseTo(OPENING_CEILING * 10, 0);
    expect(ceilingFor(1e9)).toBe(ABSOLUTE_CEILING);
    expect(gradeScore({ bestNetWorth: 1e40 }, { ageSeconds: 1e9 }).ok).toBe(true);
  });

  it('số vô nghĩa thì vứt', () => {
    for (const bad of [Infinity, NaN, 'nhieu lam', null, undefined, {}]) {
      expect(gradeScore({ bestNetWorth: bad }, { ageSeconds: 1e9 }).ok).toBe(false);
    }
    expect(gradeScore(null, { ageSeconds: 1e9 }).ok).toBe(false);
    expect(gradeScore({ bestNetWorth: 1e300 }, { ageSeconds: 1e9 }).reason).toBe(
      'score.impossible',
    );
  });

  it('uy tín có trần tính từ chính kỷ lục gửi lên', () => {
    // Uy tín là căn bậc hai của đỉnh chia một tỷ, nên gửi kèm một con số to
    // hơn thế là tự khai đã sửa bản lưu.
    const at = { ageSeconds: 1e9 };
    expect(gradeScore({ bestNetWorth: 1e12, reputationTotal: 31 }, at).ok).toBe(true);
    expect(gradeScore({ bestNetWorth: 1e12, reputationTotal: 5000 }, at).reason).toBe(
      'score.impossible',
    );
  });

  it('kỷ lục chỉ đi lên, gửi số nhỏ hơn không xoá thành tích cũ', () => {
    const graded = gradeScore(
      { bestNetWorth: 1e10 },
      { ageSeconds: 1e9, previousBest: 5e12 },
    );
    expect(graded.ok).toBe(true);
    expect(graded.score.bestNetWorth).toBe(5e12);
  });
});

describe('mùa', () => {
  /** Một mốc thứ Tư bất kỳ, để không rơi đúng vào chỗ chuyển tuần. */
  const WED = Date.UTC(2026, 7, 12, 3, 0, 0);
  const DAY = 86_400_000;

  it('bắt đầu ván ở đúng bậc không, và mỗi bậc là một số mười', () => {
    expect(orders(-1e9)).toBeCloseTo(0, 6);
    expect(orders(0)).toBeCloseTo(9, 3);
    expect(orders(1e12)).toBeCloseTo(12, 2);
  });

  it('số vô nghĩa rơi về đáy chứ không thành NaN', () => {
    // Cột trong kho có thể là null ở một dòng cũ, và một cái NaN lọt vào cột
    // xếp hạng thì cả bảng xếp sai mà không ai thấy lỗi ở đâu.
    for (const bad of [null, undefined, NaN, Infinity, -Infinity, 'nhiều']) {
      expect(orders(bad)).toBe(0);
    }
  });

  it('tuần đổi vào nửa đêm thứ Hai giờ Việt Nam', () => {
    // 0h thứ Hai ở Việt Nam là 17h Chủ nhật theo UTC.
    const justBefore = Date.UTC(2026, 7, 9, 16, 59) + 60_000 - 1;
    expect(weekOf(justBefore)).toBe(weekOf(justBefore - 3 * DAY));
    expect(weekOf(justBefore + 2)).toBe(weekOf(justBefore) + 1);
  });

  it('mốc hết tuần nằm đúng ở chỗ số tuần nhảy', () => {
    const ends = weekEnds(WED);
    expect(weekOf(ends - 1)).toBe(weekOf(WED));
    expect(weekOf(ends)).toBe(weekOf(WED) + 1);
  });

  it('trong cùng một tuần thì giữ nguyên vạch xuất phát', () => {
    const row = { week_key: weekOf(WED), week_base: 9, best_net_worth: 1e12 };
    const season = seasonOf(row, 1e15, WED);

    expect(season.key).toBe(weekOf(WED));
    expect(season.base).toBe(9);
    expect(season.climb).toBeCloseTo(orders(1e15) - 9, 6);
  });

  it('sang tuần mới thì vạch là chỗ đứng lúc bước vào tuần, không phải chỗ đứng bây giờ', () => {
    // Người này lên bảng tuần trước, nghỉ, rồi tuần này chơi tiếp. Nếu vạch
    // lấy theo kỷ lục mới thì lần ghi đầu tiên của tuần luôn ra 0 bậc và mọi
    // thứ leo được trước lúc bản lưu kịp gửi lên bị mất trắng.
    const row = { week_key: weekOf(WED) - 1, week_base: 0, best_net_worth: 1e12 };
    const season = seasonOf(row, 1e15, WED);

    expect(season.key).toBe(weekOf(WED));
    expect(season.base).toBeCloseTo(orders(1e12), 6);
    expect(season.climb).toBeCloseTo(orders(1e15) - orders(1e12), 6);
  });

  it('người mới tinh được tính cả quãng đường tuần đầu', () => {
    const row = { week_key: 0, week_base: 0, best_net_worth: -1e9 };
    expect(seasonOf(row, 1e9, WED).climb).toBeCloseTo(orders(1e9), 6);
  });

  it('không có số bậc âm', () => {
    // Kỷ lục thì chỉ tăng, nhưng cột trong kho là dữ liệu, và dữ liệu thì có
    // ngày lệch. Bảng xếp hạng không phải chỗ để phát hiện ra điều đó.
    const row = { week_key: weekOf(WED), week_base: 30, best_net_worth: 1e30 };
    expect(seasonOf(row, 1e12, WED).climb).toBe(0);
  });
});

describe('đếm lượt gọi', () => {
  it('cho tới hạn rồi chặn, và mở lại khi qua cửa sổ', () => {
    const allow = rateLimiter({ windowMs: 1000, max: 3 });

    expect(allow('ip', 0)).toBe(true);
    expect(allow('ip', 100)).toBe(true);
    expect(allow('ip', 200)).toBe(true);
    expect(allow('ip', 300)).toBe(false);

    // Khoá theo từng người gọi, không phải một cái đếm chung.
    expect(allow('ip2', 300)).toBe(true);
    expect(allow('ip', 1500)).toBe(true);
  });
});

describe('kho dữ liệu', () => {
  /** Mở trong bộ nhớ, khỏi để lại file rác sau mỗi lần chạy. */
  function fresh() {
    const db = openDb(':memory:');
    return { db, q: createQueries(db) };
  }

  it('tên trùng thì không tạo được, kể cả khác hoa thường', () => {
    const { q } = fresh();
    q.insertUser.run('Tinz', 'tinz', 'hash', 1, 0);
    expect(() => q.insertUser.run('TINZ', 'tinz', 'hash', 1, 0)).toThrow();
  });

  it('không lộ băm mật khẩu ra ngoài', () => {
    const { q } = fresh();
    const row = q.userById.get(q.insertUser.run('Tinz', 'tinz', 'bimat', 1, 0).lastInsertRowid);
    expect(JSON.stringify(publicUser(row))).not.toContain('bimat');
  });

  it('bảng xếp theo kỷ lục giảm dần, và chỉ đếm người đã chơi', () => {
    const { q } = fresh();
    for (const [name, best] of [['a', 5e12], ['b', 1e15], ['c', 2e9]]) {
      const id = q.insertUser.run(name, name, 'hash', 1, 0).lastInsertRowid;
      q.writeSave.run(best, 0, 0, 0, 0, 0, 0, '{}', 1, 1, id);
    }
    // Đăng ký xong chưa chơi buổi nào thì chưa lên bảng.
    q.insertUser.run('d', 'd', 'hash', 1, 0);

    expect(q.top.all(10).map((row) => row.name)).toEqual(['b', 'a', 'c']);
    expect(q.playerCount.get().total).toBe(3);
  });

  it('hạng tính bằng đếm số người trên đầu, không cần kéo cả bảng về', () => {
    const { q } = fresh();
    const ids = [];
    for (const [name, best] of [['a', 5e12], ['b', 1e15], ['c', 2e9]]) {
      const id = q.insertUser.run(name, name, 'hash', 1, 0).lastInsertRowid;
      q.writeSave.run(best, 0, 0, 0, 0, 0, 0, '{}', 1, 1, id);
      ids.push({ name, id, best });
    }

    const c = ids.find((row) => row.name === 'c');
    expect(q.rankOf.get(c.best, c.best, c.id).above + 1).toBe(3);
  });

  it('xoá phiên quá hạn, giữ phiên còn dùng', () => {
    const { q } = fresh();
    const id = q.insertUser.run('a', 'a', 'hash', 1, 0).lastInsertRowid;
    q.insertSession.run('cu', id, 0, 0);
    q.insertSession.run('moi', id, 0, 10_000);

    q.expireSessions.run(5_000);
    expect(q.sessionByHash.get('cu')).toBeUndefined();
    expect(q.sessionByHash.get('moi')).toBeTruthy();
  });
});

/**
 * Chạy máy chủ thật trên một cổng riêng.
 *
 * Mấy đường này là chuyện của cả một phiên — đổi mật khẩu rồi *phiên kia*
 * phải chết — nên gọi hàm rời rạc không kiểm được. Phải đi qua HTTP.
 */
async function serve() {
  const port = 8790 + Math.floor(performance.now() % 40);
  const file = `test-${port}.sqlite`;
  for (const leftover of [file, `${file}-wal`, `${file}-shm`]) rmSync(leftover, { force: true });

  const child = spawn('node', ['server/index.mjs'], {
    env: { ...process.env, PORT: String(port), DB_FILE: file },
    stdio: 'ignore',
  });

  const base = `http://localhost:${port}/api`;
  for (let i = 0; i < 100; i += 1) {
    try {
      if ((await fetch(`${base}/health`)).ok) break;
    } catch {
      // Chưa lên.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  const call = (path, options = {}) =>
    fetch(base + path, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

  const stop = () => {
    child.kill();
    for (const leftover of [file, `${file}-wal`, `${file}-shm`]) {
      rmSync(leftover, { force: true });
    }
  };

  return { call, stop, file };
}

const signUp = (call, name, password) =>
  call('/register', { method: 'POST', body: { name, password } }).then((r) => r.json());

describe('đổi mật khẩu và xoá tài khoản', () => {

  it('đổi được mật khẩu, và mật khẩu cũ thôi dùng được', async () => {
    const { call, stop } = await serve();
    try {
      const me = await signUp(call, 'doimatkhau', 'matkhaucu123');

      const wrong = await call('/password', {
        method: 'POST',
        token: me.token,
        body: { current: 'doanbua123', next: 'matkhaumoi123' },
      });
      expect(wrong.status).toBe(403);

      const ok = await call('/password', {
        method: 'POST',
        token: me.token,
        body: { current: 'matkhaucu123', next: 'matkhaumoi123' },
      });
      expect(ok.status).toBe(204);

      const old = await call('/login', {
        method: 'POST',
        body: { name: 'doimatkhau', password: 'matkhaucu123' },
      });
      expect(old.status).toBe(401);

      const fresh = await call('/login', {
        method: 'POST',
        body: { name: 'doimatkhau', password: 'matkhaumoi123' },
      });
      expect(fresh.status).toBe(200);
    } finally {
      stop();
    }
  });

  // Người ta đổi mật khẩu thường là vì nghi có người khác đang dùng. Đổi xong
  // mà phiên của người kia vẫn sống thì việc vừa làm chẳng có tác dụng gì.
  it('đổi xong thì phiên trên máy khác chết, phiên đang thao tác thì không', async () => {
    const { call, stop } = await serve();
    try {
      const first = await signUp(call, 'haiphien', 'matkhaucu123');
      const second = await call('/login', {
        method: 'POST',
        body: { name: 'haiphien', password: 'matkhaucu123' },
      }).then((r) => r.json());

      await call('/password', {
        method: 'POST',
        token: second.token,
        body: { current: 'matkhaucu123', next: 'matkhaumoi123' },
      });

      expect((await call('/me', { token: first.token })).status).toBe(401);
      expect((await call('/me', { token: second.token })).status).toBe(200);
    } finally {
      stop();
    }
  });

  it('không cho đặt mật khẩu mới quá ngắn', async () => {
    const { call, stop } = await serve();
    try {
      const me = await signUp(call, 'ngan', 'matkhaucu123');
      const response = await call('/password', {
        method: 'POST',
        token: me.token,
        body: { current: 'matkhaucu123', next: 'ngan' },
      });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe('password.short');
    } finally {
      stop();
    }
  });

  it('xoá tài khoản thì tên trả lại cho người khác, và phiên cũng đi theo', async () => {
    const { call, stop } = await serve();
    try {
      const me = await signUp(call, 'roi_di', 'matkhaudai123');

      expect((await call('/account', {
        method: 'DELETE',
        token: me.token,
        body: { password: 'doanbua123' },
      })).status).toBe(403);

      expect((await call('/account', {
        method: 'DELETE',
        token: me.token,
        body: { password: 'matkhaudai123' },
      })).status).toBe(204);

      // Phiên đi theo nhờ ON DELETE CASCADE.
      expect((await call('/me', { token: me.token })).status).toBe(401);

      // Và cái tên không còn bị giữ chỗ bởi một tài khoản không tồn tại.
      const again = await call('/register', {
        method: 'POST',
        body: { name: 'roi_di', password: 'matkhaudai123' },
      });
      expect(again.status).toBe(201);
    } finally {
      stop();
    }
  });
});

describe('bảng mùa qua HTTP', () => {
  /**
   * Một bản lưu tối thiểu kèm điểm.
   *
   * Trần theo tuổi tài khoản đứng chắn ở đây, nên con số phải nằm trong tầm
   * một tài khoản vừa lập — đúng bằng cái mà một người chơi thật gửi lên trong
   * mấy phút đầu.
   */
  const put = (call, token, best) =>
    call('/save', {
      method: 'PUT',
      token,
      body: { save: { lastSeenAt: 1 }, score: { bestNetWorth: best } },
    });

  it('xếp theo số bậc leo được, nên người mới hơn được người đã giàu', async () => {
    const { call, stop, file } = await serve();
    try {
      // Người cũ bước vào tuần này khi đã có sẵn ba trăm tỷ, rồi tuần này leo
      // thêm một quãng ngắn. Vạch xuất phát của họ phải đặt thẳng vào kho: sang
      // tuần là chuyện của đồng hồ, và bài kiểm thì không đợi được tới thứ Hai.
      const cu = await signUp(call, 'nguoi_cu', 'matkhaudai123');
      await put(call, cu.token, 3e11);

      const db = openDb(file);
      db.exec(
        `UPDATE users SET week_base = ${orders(3e11)}, week_climb = 0
          WHERE name_lower = 'nguoi_cu'`,
      );
      db.close();

      await put(call, cu.token, 6e11);

      // Người mới thì đi từ đáy lên một triệu — ít tiền hơn hẳn, nhưng là sáu
      // bậc so với chưa tới một bậc.
      const moi = await signUp(call, 'nguoi_moi', 'matkhaudai123');
      await put(call, moi.token, 1e6);

      const week = await (await call('/board?mode=week', { token: moi.token })).json();
      expect(week.mode).toBe('week');
      expect(week.rows.map((row) => row.name)).toEqual(['nguoi_moi', 'nguoi_cu']);
      expect(week.you.name).toBe('nguoi_moi');
      expect(week.you.rank).toBe(1);
      expect(week.endsAt).toBeGreaterThan(Date.now());

      // Còn trên bảng mọi thời thì thứ tự ngược lại, đúng như nó vẫn thế.
      const all = await (await call('/board', { token: moi.token })).json();
      expect(all.mode).toBe('all');
      expect(all.rows.map((row) => row.name)).toEqual(['nguoi_cu', 'nguoi_moi']);
    } finally {
      stop();
    }
  });

  it('chưa gửi bản lưu nào thì chưa có hạng, không phải hạng bét', async () => {
    const { call, stop } = await serve();
    try {
      const me = await signUp(call, 'chua_choi', 'matkhaudai123');
      const week = await (await call('/board?mode=week', { token: me.token })).json();

      expect(week.rows).toEqual([]);
      expect(week.total).toBe(0);
      // `you` là null vì chưa từng ghi bản lưu; ghi rồi mà chưa leo bậc nào thì
      // mới ra hạng 0.
      expect(week.you).toBeNull();
    } finally {
      stop();
    }
  });
});
