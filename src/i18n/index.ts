/**
 * Ngôn ngữ hiển thị.
 *
 * Lớp luật trong `src/game/` chỉ giữ **id** — `cans`, `night`, `zero` — chứ
 * không giữ chữ. Mọi câu chữ người chơi đọc đều nằm ở đây, nên đổi ngôn ngữ
 * không đụng tới một dòng luật chơi nào, và một bản lưu cũ vẫn đọc được ở bất
 * kỳ thứ tiếng nào.
 *
 * Mặc định là tiếng Việt. Tiếng Anh giữ lại làm ngôn ngữ thứ hai chứ không
 * phải ngôn ngữ gốc.
 */
import { en } from './en';
import { vi } from './vi';

export type Locale = 'vi' | 'en';

const DICTS: Record<Locale, Record<string, string>> = { vi, en };

const KEY = 'broketoboss.locale';

function read(): Locale {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved === 'vi' || saved === 'en') return saved;
  } catch {
    // Không có localStorage — chạy trong test hoặc bị chặn. Dùng mặc định.
  }
  return 'vi';
}

let current: Locale = read();

export function locale(): Locale {
  return current;
}

export function setLocale(next: Locale): void {
  if (next === current) return;
  current = next;

  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    // Không lưu được thì vẫn đổi cho phiên này.
  }
}

/**
 * Tra chuỗi theo khoá, thay các chỗ trống dạng `{ten}`.
 *
 * Khoá thiếu thì trả về chính nó thay vì chuỗi rỗng: một khoá lòi ra màn hình
 * là lỗi nhìn thấy ngay, còn một ô trống thì lặng lẽ trôi qua.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  const text = DICTS[current][key] ?? DICTS.vi[key] ?? key;
  if (!vars) return text;

  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}
