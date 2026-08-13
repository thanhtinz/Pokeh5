import { locale, t as tr } from '../i18n';

/**
 * Định dạng tiền.
 *
 * Game chạy từ âm một tỷ tới những con số ba mươi mấy chữ số, và cả hai đầu
 * đều phải đọc được trên màn hình điện thoại. Số âm quan trọng hơn bình
 * thường: cả hồi đầu game người chơi sống dưới vạch không, nên dấu trừ là một
 * phần của thiết kế chứ không phải trường hợp ngoại lệ.
 *
 * Thang đơn vị đi theo ngôn ngữ. Người Việt viết "50k", "3tr", "1 tỷ" hằng
 * ngày — đó mới là cách rút gọn tự nhiên, không phải K/M/B. Dấu thập phân
 * cũng vậy: tiếng Việt dùng dấu phẩy.
 */

/**
 * Bậc nghìn dùng chung cho cả hai ngôn ngữ; chỉ nhãn là khác. Tiếng Việt ghép
 * tiếp sau "tỷ" (nghìn tỷ, triệu tỷ, tỷ tỷ) rồi mới sang hai chữ cái như mọi
 * game nhàn rỗi, vì từ đó trở đi con số chỉ còn là con số.
 */
const SUFFIXES: Record<'vi' | 'en', readonly string[]> = {
  vi: ['', 'k', 'tr', 'tỷ', 'ngt', 'trt', 'tt', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am', 'an'],
  en: ['', 'K', 'M', 'B', 'T', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'ag', 'ah', 'ai', 'aj', 'ak', 'al', 'am', 'an', 'ao', 'ap'],
};

/**
 * Ký hiệu tiền. Tiếng Việt không cần gắn "đ" từ "k" trở lên vì bản thân hậu
 * tố đã là tiền rồi; tiếng Anh thì "1B" trơ trọi chẳng nói lên đơn vị nào,
 * nên luôn phải có "₫" — tiền trong game là đồng ở cả hai thứ tiếng.
 */
const UNIT: Record<'vi' | 'en', { mark: string; always: boolean }> = {
  vi: { mark: 'đ', always: false },
  en: { mark: '₫', always: true },
};

/** Dấu thập phân — tiếng Việt dùng phẩy. */
function decimal(): string {
  return locale() === 'vi' ? ',' : '.';
}

/**
 * Một con số lẻ, theo dấu thập phân của ngôn ngữ đang dùng.
 *
 * Có chỗ trong game hiện số mà không phải tiền — số bậc leo được trong tuần
 * chẳng hạn — và một cái "3.2 bậc" đứng cạnh "144,2ngt" thì đọc như của một
 * game khác.
 */
export function fixed(value: number, places = 1): string {
  return value.toFixed(places).replace('.', decimal());
}

/** "1,23tr", "-998,4k", "450đ". */
export function money(value: number): string {
  const unit = UNIT[locale()];
  if (!Number.isFinite(value)) return `${value > 0 ? '' : '-'}∞${unit.mark}`;

  const negative = value < 0;
  const magnitude = Math.abs(value);
  const body =
    magnitude < 1000
      ? `${formatSmall(magnitude)}${unit.mark}`
      : `${formatLarge(magnitude)}${unit.always ? unit.mark : ''}`;

  return `${negative ? '-' : ''}${body}`;
}

/**
 * Dưới một nghìn thì vẫn còn đếm từng đồng, nên giữ phần lẻ. Chỉ ở khúc này
 * mới cần ghi đơn vị: từ "k" trở lên bản thân hậu tố đã là tiền rồi.
 */
function formatSmall(value: number): string {
  if (value === 0) return '0';
  if (value < 10) return trim(value.toFixed(2)).replace('.', decimal());
  return String(Math.floor(value));
}

function formatLarge(value: number): string {
  const ladder = SUFFIXES[locale()];
  let n = value;
  let tier = 0;

  while (n >= 1000 && tier < ladder.length - 1) {
    n /= 1000;
    tier += 1;
  }

  // Ba chữ số có nghĩa để mọi con số rộng bằng nhau — quan trọng khi cả một
  // cột số đang nhảy.
  const digits = n >= 100 ? 1 : n >= 10 ? 2 : 3;
  return `${trim(n.toFixed(digits)).replace('.', decimal())}${ladder[tier]}`;
}

function trim(text: string): string {
  return text.includes('.') ? text.replace(/\.?0+$/, '') : text;
}

/** "1,2tr/s" — nhãn tốc độ dưới mỗi nguồn thu. */
export function rate(perSecond: number): string {
  return `${money(perSecond)}/s`;
}

/** Số đếm thuần, không có đơn vị tiền: "1,23tr". */
export function count(value: number): string {
  const magnitude = Math.abs(value);
  const body = magnitude < 1000 ? formatSmall(magnitude) : formatLarge(magnitude);
  return `${value < 0 ? '-' : ''}${body}`;
}

/** Giây thành đồng hồ gọn: "12s", "1:04", "2:05:30". */
export function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  if (s < 60) return `${s}s`;

  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Khoảng thời gian viết bằng chữ, cho hộp thoại lúc đi vắng. */
export function duration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? tr('time.hoursMinutes', { hours, minutes }) : tr('time.hours', { hours });
  }
  if (minutes > 0) return tr('time.minutes', { minutes });
  return tr('time.seconds', { seconds: s });
}

export function percent(fraction: number): string {
  return `${(fraction * 100).toFixed(1).replace('.', decimal())}%`;
}

/** Phần trăm có dấu, cho cột biến động cổ phiếu: "+2,40%", "-0,80%". */
export function signedPercent(fraction: number): string {
  const sign = fraction >= 0 ? '+' : '';
  return `${sign}${(fraction * 100).toFixed(2).replace('.', decimal())}%`;
}
