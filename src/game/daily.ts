/**
 * Điểm danh hằng ngày.
 *
 * Lý do quay lại app, và là thứ rẻ nhất để làm ra nó: một phần thưởng chỉ tồn
 * tại nếu hôm nay có mở game. Bảy ngày một vòng, ngày sau to hơn ngày trước,
 * nên bỏ một hôm là mất chỗ đã leo.
 *
 * Thưởng tính bằng **giây thu nhập của chính người chơi** chứ không phải con số
 * cố định — cùng một cách các thẻ cơ hội làm — để ngày thứ bảy vẫn đáng ở giờ
 * chơi thứ năm mươi, chứ không thành tiền lẻ.
 */

export const DAY = 86_400_000;

/**
 * Quá hai ngày không mở là đứt chuỗi. Một ngày thì tha, vì lệch múi giờ hay đi
 * ngủ sớm không phải là bỏ game.
 */
export const STREAK_GRACE = 2 * DAY;

/** Ngày thứ n trong vòng bảy ngày đáng bao nhiêu giây thu nhập. */
export const REWARD_SECONDS = [180, 300, 480, 720, 1_080, 1_620, 3_600];

export const CYCLE = REWARD_SECONDS.length;

export interface DailyState {
  /** Hôm nay đã có phần thưởng chờ chưa. */
  available: boolean;
  /** Chuỗi hiện tại, tính cả hôm nay nếu nhận. */
  streak: number;
  /** Vị trí trong vòng bảy ngày, đếm từ không. */
  day: number;
}

/** Đầu ngày theo giờ máy — mốc so sánh là ngày lịch chứ không phải đủ 24 tiếng. */
function startOfDay(at: number): number {
  const date = new Date(at);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/**
 * Trạng thái điểm danh lúc `now`.
 *
 * So theo ngày lịch chứ không phải "đủ 24 tiếng kể từ lần trước", vì người chơi
 * nghĩ theo ngày: mở lúc 23h rồi mở lại lúc 8h sáng hôm sau là hai ngày.
 */
export function dailyState(lastClaimAt: number, streak: number, now: number): DailyState {
  if (lastClaimAt <= 0) return { available: true, streak: 0, day: 0 };

  const today = startOfDay(now);
  const claimed = startOfDay(lastClaimAt);

  if (claimed >= today) {
    const held = Math.max(1, streak);
    return { available: false, streak: held, day: held % CYCLE };
  }

  const broken = now - lastClaimAt > STREAK_GRACE;
  const held = broken ? 0 : Math.max(0, streak);
  return { available: true, streak: held, day: held % CYCLE };
}

/**
 * Tiền của lần điểm danh thứ `day`.
 *
 * Có sàn tính theo giá trị một lần chạm, để những ngày đầu — lúc thu nhập thụ
 * động vẫn bằng không — phần thưởng không làm tròn về số lẻ.
 */
export function dailyReward(day: number, incomePerSecond: number, tapValue: number): number {
  const seconds = REWARD_SECONDS[day % CYCLE] ?? REWARD_SECONDS[0]!;
  const baseline = Math.max(incomePerSecond, tapValue * 0.6);
  return Math.max(20_000, baseline * seconds);
}
