/**
 * Chép ván ra một chuỗi, và dán chuỗi ấy vào lại.
 *
 * ## Vì sao cần
 *
 * Bản có máy chủ thì ván nằm trên mây, đổi máy vẫn còn. Bản chơi một mình
 * (`net/solo.ts`, tức là bản trên GitHub Pages) thì ván nằm trong
 * `localStorage` của đúng một trình duyệt — xoá dữ liệu duyệt web, đổi sang
 * máy khác, hay mở bằng chế độ ẩn danh là mất sạch, không có gì cứu.
 *
 * Cho một game người ta chơi hàng tuần thì đó không phải một hạn chế chấp nhận
 * được, nó là một cái bẫy. Nên phải có một lối mang ván đi: một chuỗi chữ, copy
 * được, dán được, gửi qua tin nhắn cho chính mình cũng được.
 *
 * ## Vì sao có tiền tố `BTB1.`
 *
 * Không phải để trang trí. Dán nhầm một thứ khác vào ô nhập là chuyện thường —
 * một đoạn base64 nào đó, nửa cái link, cả một trang JSON. Không có tiền tố
 * thì mọi thứ ấy đều đi tới bước giải mã rồi mới hỏng, và câu báo lỗi cuối
 * cùng là "ván hỏng" — nghe như *ván của bạn* hỏng, trong khi thật ra người
 * chơi chỉ dán nhầm. Có tiền tố thì phân biệt được ngay hai chuyện đó.
 *
 * Số `1` là số hiệu của **định dạng chuỗi**, không phải của bản lưu. Bản lưu đã
 * có `version` riêng bên trong và `sanitise` đã lo phần đó.
 */
import { sanitise } from './save';
import type { PlayerState } from './state';

/** Đầu chuỗi. Dấu chấm để mắt tách được tiền tố khỏi phần mã. */
const PREFIX = 'BTB1.';

/** Lý do một chuỗi không dùng được — lớp vẽ dịch ra câu cho người đọc. */
export type TransferError = 'transfer.empty' | 'transfer.foreign' | 'transfer.broken';

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(code: string): string {
  const binary = atob(code);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

/** Ván → chuỗi mang đi được. */
export function encodeSave(state: PlayerState): string {
  return PREFIX + toBase64(JSON.stringify(state));
}

/**
 * Chuỗi → ván, hoặc lý do không được.
 *
 * Đi qua `sanitise` chứ không tin thẳng cái JSON: chuỗi này người chơi cầm
 * trong tay, nên nó **là** đầu vào của người dùng. Sửa một con số trong đó rồi
 * dán lại là chuyện ai cũng thử, và mọi thứ `sanitise` chặn cho bản lưu trong
 * máy thì cũng phải chặn ở đây.
 */
export function decodeSave(input: string): PlayerState | TransferError {
  const text = input.trim();
  if (text === '') return 'transfer.empty';
  if (!text.startsWith(PREFIX)) return 'transfer.foreign';

  let json: string;
  try {
    json = fromBase64(text.slice(PREFIX.length));
  } catch {
    return 'transfer.broken';
  }

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return 'transfer.broken';
  }

  const state = sanitise(raw);
  return state ?? 'transfer.broken';
}

/** Chuỗi trả về từ `decodeSave` có phải lỗi không. */
export function isTransferError(value: PlayerState | TransferError): value is TransferError {
  return typeof value === 'string';
}
