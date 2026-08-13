import type { Holding } from './stocks';

export const SAVE_VERSION = 1;

/** Chỗ mọi ván bắt đầu: âm một tỷ. */
export const STARTING_BALANCE = -1_000_000_000;

export interface ActiveJob {
  jobId: string;
  /** Epoch millis the job finishes at. */
  endsAt: number;
}

export interface ActiveBoost {
  multiplier: number;
  endsAt: number;
}

export interface PendingCard {
  /** Template id, drawn once and held until taken or expired. */
  key: string;
  kind: string;
  value: number;
  seconds: number;
  icon: string;
  expiresAt: number;
}

export interface PlayerState {
  version: number;
  createdAt: number;
  lastSeenAt: number;

  /** Cash on hand. Negative for most of the first act. */
  cash: number;
  /** Đỉnh tài sản của lượt này; làm lại thì về mốc đầu. */
  peakNetWorth: number;
  /** Đỉnh mọi thời, không bao giờ về — chỉ để khoe và để hiện mốc đã chuộc. */
  bestNetWorth: number;

  /** Uy tín tiêu được. */
  reputation: number;
  /** Tổng uy tín từng kiếm — không bao giờ giảm, và đây mới là thứ nhân thu nhập. */
  reputationTotal: number;
  /** Đã làm lại bao nhiêu lần. */
  runs: number;
  /** Bậc đặc quyền đã mua bằng uy tín, sống qua mọi lần làm lại. */
  perks: Record<string, number>;

  /** Ore mined by tapping, spent by the refinery. */
  ore: number;
  tapLevel: number;
  refineryLevel: number;

  /** Units owned, keyed by business id. */
  businesses: Record<string, number>;
  /** Business ids with a manager hired. */
  managers: string[];
  /** Cycle progress in seconds, keyed by business id. */
  cycles: Record<string, number>;
  /** Bậc nâng cấp riêng của từng cơ sở. */
  upgrades: Record<string, number>;

  holdings: Record<string, Holding>;
  /** Ticks the market has advanced; prices are derived from this and the seed. */
  marketTick: number;
  marketSeed: number;
  /** Whether the manager trades small positions automatically. */
  autoTrader: boolean;

  job: ActiveJob | null;
  card: PendingCard | null;
  /** Epoch millis the next card is offered at. */
  nextCardAt: number;
  boost: ActiveBoost | null;

  /** Life milestones already acknowledged. */
  claimed: string[];
  /** Thành tựu đã ghi nhận, sống qua mọi lần làm lại. */
  achievements: string[];
  /** Người trên bảng đã từng vượt — để tiền vượt mặt chỉ trả một lần trong đời. */
  beaten: string[];

  /** Điểm danh: lần nhận gần nhất và chuỗi ngày. */
  dailyClaimedAt: number;
  dailyStreak: number;

  /**
   * Việc trong ngày: ngày đang chạy, đề đã rút, mốc số đếm lúc sang ngày, và
   * việc đã nhận.
   *
   * Đề được **lưu** chứ không tính lại từ ngày, vì bộ rút phụ thuộc vào chỗ
   * người chơi đang đứng — tính lại giữa ngày là đề tự đổi dưới tay người chơi
   * đúng lúc họ vừa mở được sàn.
   */
  questDay: number;
  questIds: string[];
  questBase: Record<string, number>;
  questDone: string[];

  /** Số đếm cộng dồn cho thành tựu — không reset khi làm lại. */
  stats: {
    taps: number;
    cards: number;
    jobs: number;
    trades: number;
    units: number;
    upgrades: number;
  };
  /** Seed for card draws, kept so a reload does not reroll an offer. */
  rngSeed: number;
}

export function createNewSave(seed: number): PlayerState {
  const now = Date.now();

  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastSeenAt: now,

    cash: STARTING_BALANCE,
    peakNetWorth: STARTING_BALANCE,
    bestNetWorth: STARTING_BALANCE,

    reputation: 0,
    reputationTotal: 0,
    runs: 0,
    perks: {},

    ore: 0,
    tapLevel: 1,
    refineryLevel: 1,

    businesses: {},
    managers: [],
    cycles: {},
    upgrades: {},

    holdings: {},
    marketTick: 0,
    marketSeed: seed,
    autoTrader: false,

    job: null,
    card: null,
    // The first card lands soon enough to teach the mechanic without being
    // part of the opening beat.
    nextCardAt: now + 45_000,
    boost: null,

    claimed: [],
    achievements: [],
    beaten: [],

    dailyClaimedAt: 0,
    dailyStreak: 0,

    // Ngày 0 không phải một ngày thật, nên lần tick đầu tiên sẽ tự đổi bộ việc
    // và chụp mốc số đếm — khỏi phải gọi Date.now() thêm một lần ở đây.
    questDay: 0,
    questIds: [],
    questBase: {},
    questDone: [],

    stats: { taps: 0, cards: 0, jobs: 0, trades: 0, units: 0, upgrades: 0 },

    rngSeed: seed,
  };
}

export function ownedOf(state: PlayerState, businessId: string): number {
  return state.businesses[businessId] ?? 0;
}

export function upgradeOf(state: PlayerState, businessId: string): number {
  return state.upgrades[businessId] ?? 0;
}

export function perkLevel(state: PlayerState, perkId: string): number {
  return state.perks[perkId] ?? 0;
}

export function hasManager(state: PlayerState, businessId: string): boolean {
  return state.managers.includes(businessId);
}

export function holdingOf(state: PlayerState, stockId: string): Holding {
  return state.holdings[stockId] ?? { shares: 0, avgCost: 0 };
}
