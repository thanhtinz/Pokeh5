/**
 * Mật khẩu và phiên đăng nhập.
 *
 * Không có thư viện ngoài nào ở đây, và đó là chủ ý: `node:crypto` đã có sẵn
 * scrypt — một hàm băm mật khẩu *đúng nghĩa*, tốn bộ nhớ có chủ đích để máy
 * đào GPU không bẻ nhanh được — nên kéo thêm bcrypt về chỉ để làm đúng việc đó
 * là thêm một thứ phải vá về sau mà chẳng đổi lại được gì.
 *
 * Ba luật của chỗ này:
 *
 *  - **Không bao giờ lưu mật khẩu.** Chỉ lưu muối và chuỗi băm.
 *  - **Không bao giờ lưu token.** Lưu băm SHA-256 của nó. Rò cả cơ sở dữ liệu
 *    thì kẻ lấy được vẫn không đăng nhập vào tài khoản nào, vì cái trong tay
 *    không phải cái người dùng gửi lên.
 *  - **So sánh bằng hàm thời gian hằng.** So bằng `===` là để lộ độ dài phần
 *    khớp qua thời gian trả lời.
 */
import {
  randomBytes,
  scrypt as scryptCallback,
  createHash,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

/** Tham số scrypt. N=2^15 là khoảng 100ms mỗi lần trên máy chủ thường. */
const COST = { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_BYTES = 64;
const SALT_BYTES = 16;
const TOKEN_BYTES = 32;

/** Băm một mật khẩu thô. Trả về chuỗi tự mô tả, để đổi tham số sau vẫn đọc được. */
export async function hashPassword(password) {
  const salt = randomBytes(SALT_BYTES);
  const key = await scrypt(password, salt, KEY_BYTES, COST);
  return `scrypt$${COST.N}$${COST.r}$${COST.p}$${salt.toString('base64')}$${key.toString('base64')}`;
}

/**
 * Kiểm mật khẩu.
 *
 * Đọc tham số ra từ chính chuỗi đã lưu chứ không dùng hằng số hiện tại, để
 * ngày nào tăng `COST` lên thì tài khoản cũ vẫn đăng nhập được.
 */
export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;

  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, n, r, p, salt, key] = parts;
  const expected = Buffer.from(key, 'base64');

  let actual;
  try {
    actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: COST.maxmem,
    });
  } catch {
    // Tham số hỏng trong bản ghi thì coi như không khớp, không ném lỗi ra ngoài.
    return false;
  }

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Token mới: một chuỗi ngẫu nhiên gửi cho client, và băm của nó để lưu. */
export function mintToken() {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

/** Tên đăng nhập: chữ, số, gạch dưới, gạch ngang. Ba tới mười sáu ký tự. */
const NAME_SHAPE = /^[a-zA-Z0-9_-]{3,16}$/;

/**
 * Kiểm tên và mật khẩu, trả về câu lỗi hoặc null.
 *
 * Chỉ cho ASCII trong tên, dù cả game là tiếng Việt. Tên hiển thị thì nên cho
 * dấu, nhưng tên *đăng nhập* mà cho Unicode thì hai tên trông y hệt nhau có
 * thể khác nhau về byte — và đó là cách mạo danh trên bảng xếp hạng.
 */
export function checkCredentials(name, password) {
  if (typeof name !== 'string' || !NAME_SHAPE.test(name)) return 'name.shape';
  if (typeof password !== 'string' || password.length < 8) return 'password.short';
  if (password.length > 200) return 'password.long';
  return null;
}
