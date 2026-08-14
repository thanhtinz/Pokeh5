/**
 * Tiếng của game, viết ra bằng số chứ không bằng file.
 *
 * Cả dự án này không có một tấm ảnh nào — mọi thứ nhìn thấy đều là CSS vẽ ra.
 * Âm thanh đi theo đúng lối đó: không có mp3, không có gói nào phải tải về,
 * chỉ có mấy con dao động ghép lại. Đổi lại là một bộ tiếng nặng đúng vài trăm
 * byte mã nguồn, không có bước tải, và không có cái khoảng lặng khó chịu lần
 * đầu bấm khi trình duyệt còn đang kéo file về.
 *
 * File này **không đụng tới Web Audio**. Nó chỉ nói "cue này gồm những nốt
 * nào", nên chạy được trong Node và kiểm được bằng bài test. Phần cắm dây nằm
 * ở `sound.ts`.
 */
import type { CueId } from '../game/store';

export interface Note {
  /** Hz. */
  freq: number;
  /** Bắt đầu sau bao nhiêu mili giây kể từ lúc phát cue. */
  start: number;
  ms: number;
  type: OscillatorType;
  /** 0..1, trước khi nhân với âm lượng chung. */
  gain: number;
}

/**
 * Thang năm nốt, tính bằng nửa cung so với nốt gốc.
 *
 * Đây là chỗ quyết định game *nghe* thế nào. Bấm liên tục mà mỗi lần lên đều
 * một nửa cung thì thành tiếng còi báo động; lên theo thang năm nốt thì bấm
 * nhanh cỡ nào cũng không có hai nốt nghịch nhau, vì thang này không chứa
 * quãng nào chỏi. Cùng một cơ chế, khác hẳn cảm giác.
 */
const PENTATONIC = [0, 3, 5, 7, 10];

/** Nốt gốc của tiếng bấm — La quãng tám thứ ba. */
const ROOT = 220;

/** Bấm cách nhau lâu hơn chừng này thì chuỗi tính lại từ đầu. */
export const STREAK_WINDOW = 900;

/**
 * Bấm liên tục lên tới đây là kịch trần.
 *
 * Có trần vì hai lẽ: quá 4 kHz thì nghe chói chứ không nghe hay, và một cái
 * thang leo mãi thì phần thưởng của việc bấm nhanh biến mất sau vài giây — cứ
 * cao dần đều thì không còn là cao dần nữa.
 */
export const STREAK_CAP = 14;

/** Chuỗi tiếp theo, biết lần bấm trước cách đây bao lâu. */
export function nextStreak(streak: number, sinceLastMs: number): number {
  if (!Number.isFinite(sinceLastMs) || sinceLastMs > STREAK_WINDOW) return 0;
  return Math.min(STREAK_CAP, streak + 1);
}

/** Tần số của lần bấm thứ `streak` trong chuỗi. */
export function tapFreq(streak: number): number {
  const step = Math.max(0, Math.min(STREAK_CAP, Math.floor(streak)));
  const semitones = PENTATONIC[step % PENTATONIC.length]! + 12 * Math.floor(step / PENTATONIC.length);
  return ROOT * Math.pow(2, semitones / 12);
}

/** Một nốt, viết gọn. */
function note(freq: number, start: number, ms: number, gain: number, type: OscillatorType): Note {
  return { freq, start, ms, type, gain };
}

/**
 * Cue thành nốt.
 *
 * `streak` chỉ có nghĩa với tiếng bấm; mấy cue khác bỏ qua nó.
 */
export function notesFor(cue: CueId, streak = 0): Note[] {
  switch (cue) {
    // Ngắn và khô. Tiếng này nghe vài nghìn lần một buổi, nên thứ duy nhất nó
    // được phép làm là kêu đúng lúc rồi tắt ngay.
    case 'tap':
      return [note(tapFreq(streak), 0, 70, 0.5, 'triangle')];

    // Hai nốt đi lên: "xong rồi". Quãng năm, vì nó là quãng dễ chịu nhất và
    // không mang màu vui hay buồn — mua một cái sạp không phải một chiến thắng.
    case 'buy':
      return [
        note(392, 0, 90, 0.42, 'triangle'),
        note(587.33, 70, 130, 0.36, 'triangle'),
      ];

    // Thấp, đục, một tiếng. Không chói, và ít khi nghe: nút nào không mua nổi
    // thì giao diện đã tắt sẵn rồi, nên tiếng này chỉ vang lên khi hai bên
    // nghĩ khác nhau — rõ nhất là ở sàn, nơi giá nhảy giữa lúc vẽ nút và lúc
    // ngón tay chạm xuống. Đúng cái lúc người chơi cần biết vì sao không được.
    case 'deny':
      return [note(146.83, 0, 110, 0.3, 'sawtooth')];

    // Tiền vào. Hai nốt cao đi lên, nhanh, hơi kim loại.
    case 'cash':
      return [
        note(1046.5, 0, 60, 0.28, 'square'),
        note(1568, 45, 110, 0.22, 'square'),
      ];

    case 'info':
      return [note(880, 0, 70, 0.2, 'sine')];

    // Thẻ cơ hội hiện ra. Một tiếng chuông đơn, đủ để ngẩng đầu lên nhìn.
    case 'card':
      return [
        note(659.25, 0, 120, 0.26, 'sine'),
        note(987.77, 90, 220, 0.2, 'sine'),
      ];

    // Ba nốt của một hợp âm trưởng. Cả game có đúng mười hai lần nghe được
    // tiếng này, nên nó được phép dài hơn mọi tiếng khác.
    case 'milestone':
      return [
        note(523.25, 0, 160, 0.32, 'triangle'),
        note(659.25, 110, 160, 0.32, 'triangle'),
        note(783.99, 220, 420, 0.34, 'triangle'),
      ];
  }
}

/** Cue này rung bao nhiêu mili giây; 0 là không rung. */
export function buzzFor(cue: CueId): number {
  switch (cue) {
    case 'tap':
      return 8;
    case 'buy':
      return 14;
    case 'deny':
      return 30;
    case 'milestone':
      return 40;
    default:
      return 0;
  }
}
