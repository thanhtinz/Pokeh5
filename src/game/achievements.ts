/**
 * Thành tựu.
 *
 * Cái đuôi dài của game. Cơ ngơi thì có trần, mốc cuộc đời thì hết sau mười
 * hai cái, còn danh sách này luôn còn một ô chưa tích — và mỗi ô tích được đều
 * cộng vĩnh viễn vào thu nhập, nên nó không phải huy hiệu suông.
 *
 * Đo bằng **số đếm cộng dồn** (đã chạm bao nhiêu lần, đã nhận bao nhiêu kèo)
 * chứ không phải trạng thái hiện tại, vì làm lại sẽ xoá trạng thái. Thành tựu
 * phải sống sót qua mọi lần làm lại, không thì nó chỉ là mục tiêu của một lượt.
 */

export type Metric =
  | 'taps'
  | 'cards'
  | 'jobs'
  | 'trades'
  | 'units'
  | 'managers'
  | 'upgrades'
  | 'best'
  | 'runs'
  | 'claimed';

export interface Achievement {
  id: string;
  metric: Metric;
  target: number;
}

/** Mỗi thành tựu cộng bằng này vào mọi khoản thu. */
export const ACHIEVEMENT_BONUS = 0.03;

function ladder(prefix: string, metric: Metric, targets: readonly number[]): Achievement[] {
  return targets.map((target, index) => ({ id: `${prefix}${index + 1}`, metric, target }));
}

/**
 * Mỗi nhánh là một bậc thang, nên lúc nào cũng có đúng một ô sắp tích ở mỗi
 * nhánh — đó mới là thứ kéo người chơi đi tiếp, chứ không phải một danh sách
 * phẳng ba mươi ô rời rạc.
 */
export const ACHIEVEMENTS: readonly Achievement[] = [
  ...ladder('tap', 'taps', [100, 1_000, 10_000, 50_000, 250_000]),
  ...ladder('card', 'cards', [10, 50, 200, 750]),
  ...ladder('job', 'jobs', [10, 100, 500, 2_000]),
  ...ladder('trade', 'trades', [10, 100, 500]),
  ...ladder('unit', 'units', [100, 1_000, 5_000, 20_000, 80_000]),
  ...ladder('mgr', 'managers', [1, 6, 12, 24, 36]),
  ...ladder('up', 'upgrades', [1, 10, 40, 100, 180]),
  ...ladder('rich', 'best', [0, 1e12, 1e15, 1e18, 1e21]),
  ...ladder('run', 'runs', [1, 3, 10, 25]),
  ...ladder('life', 'claimed', [1, 4, 8, 12]),
];

export function achievementById(id: string): Achievement | null {
  return ACHIEVEMENTS.find((achievement) => achievement.id === id) ?? null;
}

/** Số đo hiện tại của mọi nhánh. */
export type Metrics = Record<Metric, number>;

export function earned(metrics: Metrics, achievement: Achievement): boolean {
  return metrics[achievement.metric] >= achievement.target;
}

/** Những thành tựu vừa đạt mà chưa ghi nhận. */
export function newlyEarned(metrics: Metrics, unlocked: readonly string[]): Achievement[] {
  const seen = new Set(unlocked);
  return ACHIEVEMENTS.filter(
    (achievement) => !seen.has(achievement.id) && earned(metrics, achievement),
  );
}

export function achievementMultiplier(unlocked: readonly string[]): number {
  // Id lạ thì bỏ qua: bản lưu cũ hơn code không được phép thổi phồng hệ số.
  const valid = unlocked.filter((id) => achievementById(id) !== null).length;
  return 1 + ACHIEVEMENT_BONUS * valid;
}

/** Ô sắp tích của mỗi nhánh, để giao diện xếp cái gần nhất lên trên. */
export function nextInLadder(metrics: Metrics, unlocked: readonly string[]): Achievement[] {
  const seen = new Set(unlocked);
  const byMetric = new Map<Metric, Achievement>();

  for (const achievement of ACHIEVEMENTS) {
    if (seen.has(achievement.id) || earned(metrics, achievement)) continue;
    if (!byMetric.has(achievement.metric)) byMetric.set(achievement.metric, achievement);
  }
  return [...byMetric.values()];
}
