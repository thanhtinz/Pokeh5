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

  -- Bảng xếp hạng luôn quét theo cột này, và chỉ theo cột này.
  CREATE INDEX IF NOT EXISTS users_by_best ON users (best_net_worth DESC, id ASC);
  CREATE INDEX IF NOT EXISTS sessions_by_user ON sessions (user_id);
`;

export function openDb(file = 'broketoboss.sqlite') {
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
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
      `SELECT id, name, best_net_worth, reputation_total, runs, claimed, updated_at
         FROM users
        WHERE updated_at > 0
        ORDER BY best_net_worth DESC, id ASC
        LIMIT ?`,
    ),
    playerCount: db.prepare(`SELECT COUNT(*) AS total FROM users WHERE updated_at > 0`),
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
    updatedAt: row.updated_at,
  };
}
