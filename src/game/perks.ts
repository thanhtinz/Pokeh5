/**
 * Cửa hàng uy tín.
 *
 * Làm lại mà chỉ được một con số nhân thì lần thứ ba đã chán. Chỗ này biến uy
 * tín thành **lựa chọn**: mua gì trước, đánh đổi cái gì, mỗi lượt chơi đi một
 * hướng khác nhau.
 *
 * Uy tín có hai sổ. `reputationTotal` là tổng đã kiếm được, không bao giờ giảm,
 * và nó mới là thứ nhân vào thu nhập — nên tiêu uy tín không hề làm yếu đi.
 * `reputation` là số dư tiêu được. Tách ra vì nếu tiêu mà tụt hệ số thì người
 * chơi sẽ ngồi ôm uy tín không dám mua, và cả cửa hàng thành vô nghĩa.
 */

export type PerkId = 'offline' | 'tap' | 'speed' | 'card' | 'credit' | 'seed';

export interface PerkDef {
  id: PerkId;
  /** Mua được tối đa bao nhiêu bậc. */
  max: number;
  /** Giá bậc đầu, tính bằng uy tín. */
  baseCost: number;
  /** Giá nhân lên sau mỗi bậc. */
  growth: number;
}

export const PERKS: readonly PerkDef[] = [
  { id: 'offline', max: 12, baseCost: 4, growth: 1.55 },
  { id: 'tap', max: 15, baseCost: 3, growth: 1.5 },
  { id: 'speed', max: 10, baseCost: 6, growth: 1.7 },
  { id: 'card', max: 8, baseCost: 5, growth: 1.65 },
  { id: 'credit', max: 10, baseCost: 4, growth: 1.6 },
  { id: 'seed', max: 12, baseCost: 8, growth: 1.75 },
];

export function perkById(id: string): PerkDef | null {
  return PERKS.find((perk) => perk.id === id) ?? null;
}

export function perkCost(def: PerkDef, level: number): number {
  return Math.ceil(def.baseCost * Math.pow(def.growth, level));
}

export interface PerkEffects {
  /** Giờ ăn tiền offline cộng thêm. */
  offlineHours: number;
  /** Nhân vào giá trị mỗi lần chạm. */
  tap: number;
  /** Nhân vào tốc độ chạy của mọi cơ sở. */
  speed: number;
  /** Nhân vào tần suất thẻ cơ hội. */
  cardRate: number;
  /** Nhân vào hạn mức tín dụng. */
  credit: number;
  /** Tiền mặt có sẵn khi bắt đầu lượt mới. */
  seedCash: number;
}

/** Mỗi bậc của từng đặc quyền cộng thêm gì. */
const STEP = {
  offline: 2,
  tap: 1.35,
  speed: 1.12,
  card: 1.18,
  credit: 1.3,
  seed: 4,
} as const;

export function effectsFrom(levels: Record<string, number>): PerkEffects {
  const at = (id: PerkId) => Math.max(0, Math.floor(levels[id] ?? 0));

  return {
    offlineHours: STEP.offline * at('offline'),
    tap: Math.pow(STEP.tap, at('tap')),
    speed: Math.pow(STEP.speed, at('speed')),
    cardRate: Math.pow(STEP.card, at('card')),
    credit: Math.pow(STEP.credit, at('credit')),
    // Tiền mồi: mỗi bậc gấp bốn, bắt đầu từ mười triệu — đủ để lượt sau bỏ qua
    // đoạn nhặt ve chai chứ không đủ để bỏ qua cả khu.
    seedCash: at('seed') === 0 ? 0 : 10_000_000 * Math.pow(STEP.seed, at('seed') - 1),
  };
}

/** Mô tả một bậc, để giao diện khỏi phải tự tính. */
export function describePerk(id: PerkId, level: number): { current: string; next: string } {
  const now = effectsFrom({ [id]: level });
  const then = effectsFrom({ [id]: level + 1 });

  switch (id) {
    case 'offline':
      return { current: `+${now.offlineHours}h`, next: `+${then.offlineHours}h` };
    case 'tap':
      return { current: `×${now.tap.toFixed(2)}`, next: `×${then.tap.toFixed(2)}` };
    case 'speed':
      return { current: `×${now.speed.toFixed(2)}`, next: `×${then.speed.toFixed(2)}` };
    case 'card':
      return { current: `×${now.cardRate.toFixed(2)}`, next: `×${then.cardRate.toFixed(2)}` };
    case 'credit':
      return { current: `×${now.credit.toFixed(2)}`, next: `×${then.credit.toFixed(2)}` };
    case 'seed':
      return { current: String(now.seedCash), next: String(then.seedCash) };
  }
}
