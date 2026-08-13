/**
 * Cơ sở dữ liệu — SQLite có sẵn trong Node, không cài gì thêm.
 *
 * Một điểm thiết kế đáng nói: **bảng xếp hạng đọc đúng cái dòng mà bản lưu ghi
 * vào**. Không có bảng điểm riêng, không có đường nào gửi điểm mà không kèm bản
 * lưu. Tách ra thì sẽ có ngày bảng nói một đằng bản lưu một nẻo, và lúc đó
 * chẳng ai biết cái nào đúng.
 */
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    name_lower    TEXT    NOT NULL UNIQUE,
    password      TEXT    NOT NULL,
    created_at    INTEGER NOT NULL,

    best_net_worth   REAL    NOT NULL DEFAULT -1e9,
    reputation_total INTEGER NOT NULL DEFAULT 0,
    runs             INTEGER NOT NULL DEFAULT 0,
    claimed          INTEGER NOT NULL DEFAULT 0,

    -- Mùa: tuần đang tính, chỗ đứng lúc vào tuần, và số bậc leo được từ đó.
    week_key      INTEGER NOT NULL DEFAULT 0,
    week_base     REAL    NOT NULL DEFAULT 0,
    week_climb    REAL    NOT NULL DEFAULT 0,

    save_json     TEXT,
    save_seen_at  INTEGER NOT NULL DEFAULT 0,
    updated_at    INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash   TEXT    PRIMARY KEY,
    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at   INTEGER NOT NULL,
    last_used_at INTEGER NOT NULL
  );

  -- Bảng mọi thời quét theo cột này, và chỉ theo cột này.
  CREATE INDEX IF NOT EXISTS users_by_best ON users (best_net_worth DESC, id ASC);
  CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions (user_id);
`;

/**
 * Cột thêm sau, cho những kho đã có sẵn.
 *
 * `CREATE TABLE IF NOT EXISTS` không đụng tới bảng đã tồn tại, nên một kho lập
 * từ trước bản mùa sẽ không tự có ba cột mới — và mọi câu truy vấn chạm tới
 * chúng sẽ hỏng ngay khi khởi động. Thêm tay, đúng cái nào thiếu.
 */
const ADDED = [
  ['week_key', `ALTER TABLE users ADD COLUMN week_key INTEGER NOT NULL DEFAULT 0`],
  ['week_base', `ALTER TABLE users ADD COLUMN week_base REAL NOT NULL DEFAULT 0`],
  ['week_climb', `ALTER TABLE users ADD COLUMN week_climb REAL NOT NULL DEFAULT 0`],
];

export function openDb(file = 'broketoboss.sqlite') {
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);

  const have = new Set(db.prepare(`PRAGMA table_info(users)`).all().map((col) => col.name));
  for (const [name, sql] of ADDED) {
    if (!have.has(name)) db.exec(sql);
  }

  // Sau phần thêm cột, không trước: trên một kho cũ thì lúc này ba cột kia mới
  // tồn tại, mà đánh chỉ mục lên một cột chưa có là một lỗi lúc khởi động.
  db.exec(
    `CREATE INDEX IF NOT EXISTS users_by_week ON users (week_key, week_climb DESC, id ASC)`,
  );

  return db;
}

/** Phiên quá hạn này mà không dùng thì coi như hết. Ba mươi ngày. */
export const SESSION_TTL = 30 * 86_400_000;

export function createQueries(db) {
  const q = {
    insertUser: db.prepare(
      `INSERT INTO users (name, name_lower, password, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    ),
    userByName: db.prepare(`SELECT * FROM users WHERE name_lower = ?`),
    userById: db.prepare(`SELECT * FROM users WHERE id = ?`),

    setPassword: db.prepare(`UPDATE users SET password = ? WHERE id = ?`),
    deleteUser: db.prepare(`DELETE FROM users WHERE id = ?`),

    insertSession: db.prepare(
      `INSERT INTO sessions (token_hash, user_id, created_at, last_used_at) VALUES (?, ?, ?, ?)`,
    ),
    // Đổi mật khẩu thì mọi phiên khác phải chết. Giữ lại đúng phiên đang thao
    // tác, vì đá luôn cả người vừa đổi ra ngoài là phạt nhầm người.
    deleteOtherSessions: db.prepare(
      `DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?`,
    ),
    sessionByHash: db.prepare(`SELECT * FROM sessions WHERE token_hash = ?`),
    touchSession: db.prepare(`UPDATE sessions SET last_used_at = ? WHERE token_hash = ?`),
    deleteSession: db.prepare(`DELETE FROM sessions WHERE token_hash = ?`),
    expireSessions: db.prepare(`DELETE FROM sessions WHERE last_used_at < ?`),

    writeSave: db.prepare(
      `UPDATE users
          SET best_net_worth = ?, reputation_total = ?, runs = ?, claimed = ?,
              week_key = ?, week_base = ?, week_climb = ?,
              save_json = ?, save_seen_at = ?, updated_at = ?
        WHERE id = ?`,
    ),

    // Hạng tính bằng "có bao nhiêu người trên mình, cộng một" chứ không bằng
    // số thứ tự trong một trang, để hạng của người thứ 900 vẫn đúng mà không
    // phải kéo về 900 dòng.
    rankOf: db.prepare(
      `SELECT COUNT(*) AS above FROM users
        WHERE best_net_worth > ? OR (best_net_worth = ? AND id < ?)`,
    ),
    top: db.prepare(
      `SELECT id, name, best_net_worth, reputation_total, runs, claimed,
              week_key, week_climb, updated_at
         FROM users
        WHERE updated_at > 0
        ORDER BY best_net_worth DESC, id ASC
        LIMIT ?`,
    ),
    playerCount: db.prepare(`SELECT COUNT(*) AS total FROM users WHERE updated_at > 0`),

    // Bảng mùa. Lọc đúng tuần đang chạy, và bỏ những người chưa leo được bậc
    // nào — một danh sách dài toàn số 0 thì không nói lên điều gì.
    rankOfWeek: db.prepare(
      `SELECT COUNT(*) AS above FROM users
        WHERE week_key = ? AND (week_climb > ? OR (week_climb = ? AND id < ?))`,
    ),
    topWeek: db.prepare(
      `SELECT id, name, best_net_worth, reputation_total, runs, claimed,
              week_key, week_climb, updated_at
         FROM users
        WHERE week_key = ? AND week_climb > 0
        ORDER BY week_climb DESC, id ASC
        LIMIT ?`,
    ),
    weekCount: db.prepare(
      `SELECT COUNT(*) AS total FROM users WHERE week_key = ? AND week_climb > 0`,
    ),
  };

  return q;
}

/** Dòng trong cơ sở dữ liệu thành thứ gửi ra ngoài — không lộ băm mật khẩu. */
export function publicUser(row) {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    bestNetWorth: row.best_net_worth,
    reputationTotal: row.reputation_total,
    runs: row.runs,
    claimed: row.claimed,
    weekClimb: row.week_climb,
    updatedAt: row.updated_at,
  };
}
