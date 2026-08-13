/**
 * Nâng cấp riêng từng cơ sở.
 *
 * Mua thêm đơn vị thì tiền tăng theo cấp số nhân còn thu nhập tăng tuyến tính,
 * nên tới một lúc mua thêm gần như vô nghĩa. Nâng cấp là chỗ đổ tiền lúc đó:
 * mở theo số lượng đang sở hữu, mỗi bậc nhân thẳng vào thu nhập của đúng cơ sở
 * ấy, và giá cố định theo giá gốc chứ không theo số lượng — nên nó luôn là một
 * món hời rõ ràng, chỉ là phải đủ tiền.
 *
 * Đây cũng là thứ giữ cho màn Cơ ngơi còn việc để làm sau khi đã thuê hết quản
 * lý: cày thêm một bậc nâng cấp là mục tiêu ngắn, khác với mua đơn vị thứ 301.
 */
import type { BusinessDef } from './businesses';

export interface UpgradeTier {
  /** Phải sở hữu bằng này đơn vị mới mở. */
  at: number;
  /** Nhân vào thu nhập của riêng cơ sở này. */
  multiplier: number;
  /** Giá = giá gốc × hệ số này. */
  costMultiple: number;
}

/**
 * Năm bậc, giá nhảy nhanh hơn thưởng — bậc cuối đắt gấp ba trăm lần bậc đầu mà
 * chỉ nhân gấp bốn. Có vậy thì bậc sau mới là mục tiêu chứ không phải thủ tục.
 */
export const TIERS: readonly UpgradeTier[] = [
  { at: 25, multiplier: 2, costMultiple: 40 },
  { at: 50, multiplier: 2, costMultiple: 140 },
  { at: 100, multiplier: 3, costMultiple: 700 },
  { at: 200, multiplier: 3, costMultiple: 3_200 },
  { at: 400, multiplier: 4, costMultiple: 14_000 },
];

/** Tổng hệ số nhân từ số bậc đã mua. */
export function upgradeMultiplier(level: number): number {
  let multiplier = 1;
  for (let i = 0; i < Math.min(level, TIERS.length); i += 1) {
    multiplier *= TIERS[i]!.multiplier;
  }
  return multiplier;
}

export interface NextUpgrade {
  tier: UpgradeTier;
  /** Bậc thứ mấy, đếm từ một, để hiện "2/5". */
  index: number;
  cost: number;
  /** Đã đủ số lượng sở hữu chưa. */
  unlocked: boolean;
}

/** Bậc kế tiếp của một cơ sở, hoặc null khi đã lên hết. */
export function nextUpgrade(def: BusinessDef, owned: number, level: number): NextUpgrade | null {
  const tier = TIERS[level];
  if (!tier) return null;

  return {
    tier,
    index: level + 1,
    cost: def.baseCost * tier.costMultiple,
    unlocked: owned >= tier.at,
  };
}

/** Đã lên hết năm bậc chưa. */
export function isMaxed(level: number): boolean {
  return level >= TIERS.length;
}
