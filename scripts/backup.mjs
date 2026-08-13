/**
 * Sao lưu kho dữ liệu, **trong lúc máy chủ vẫn đang chạy**.
 *
 *   node scripts/backup.mjs [thư-mục-đích] [giữ-lại-bao-nhiêu-bản]
 *   DB_FILE=/var/lib/btb.sqlite node scripts/backup.mjs /var/backups/btb 14
 *
 * Dùng `VACUUM INTO` chứ không copy file. Ở chế độ WAL, cái file `.sqlite`
 * không phải toàn bộ cơ sở dữ liệu — phần ghi gần nhất còn nằm trong `-wal` —
 * nên `cp` một mình nó ra là copy một bản thiếu, và thiếu đúng phần mới nhất.
 * `VACUUM INTO` bắt SQLite tự viết ra một bản đầy đủ, nhất quán, đã dọn gọn,
 * mà không cần dừng máy chủ và không chặn ai đang ghi.
 *
 * Bản sao ra là một file `.sqlite` mở được ngay: khôi phục là đổi tên, không
 * phải chạy công cụ gì.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';

const SOURCE = process.env['DB_FILE'] ?? 'broketoboss.sqlite';
const DEST = process.argv[2] ?? 'backups';
const KEEP = Number(process.argv[3] ?? 14);

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, '-')
  .replace('T', '_')
  .slice(0, 19);

const target = `${DEST}/btb-${stamp}.sqlite`;

await mkdir(DEST, { recursive: true });

// Mở chỉ-đọc: một lệnh sao lưu không có việc gì phải sửa được cái nó đang chép.
const db = new DatabaseSync(SOURCE, { readOnly: true });
try {
  // Tham số không nhét được vào VACUUM INTO, nên đường dẫn phải tự bọc. Nó đến
  // từ dòng lệnh chứ không từ ngoài mạng, nhưng một dấu nháy trong tên thư mục
  // cũng đủ làm hỏng lệnh, và đó là một buổi tối đi tìm nguyên nhân.
  db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
} finally {
  db.close();
}

const { size } = await stat(target);
console.log(`${target} — ${(size / 1024 / 1024).toFixed(2)} MB`);

// Dọn bản cũ. Sắp theo tên chứ không theo giờ sửa file: cái tem thời gian nằm
// ngay trong tên nên xếp chữ cũng là xếp thời gian, mà giờ sửa file thì một
// lệnh `cp` vô ý là đảo lộn hết.
const kept = (await readdir(DEST))
  .filter((name) => name.startsWith('btb-') && name.endsWith('.sqlite'))
  .sort()
  .reverse();

for (const stale of kept.slice(Math.max(1, KEEP))) {
  await rm(`${DEST}/${stale}`, { force: true });
  console.log(`bỏ ${stale}`);
}
