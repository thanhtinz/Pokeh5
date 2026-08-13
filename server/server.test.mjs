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
      q.writeSave.run(best, 0, 0, 0, '{}', 1, 1, id);
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
      q.writeSave.run(best, 0, 0, 0, '{}', 1, 1, id);
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

describe('đổi mật khẩu và xoá tài khoản', () => {
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

    return { call, stop };
  }

  const signUp = (call, name, password) =>
    call('/register', { method: 'POST', body: { name, password } }).then((r) => r.json());

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
