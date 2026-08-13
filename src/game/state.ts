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

  /** Uy tín tích được qua các lần làm lại. */
  reputation: number;
  /** Đã làm lại bao nhiêu lần. */
  runs: number;

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
    runs: 0,

    ore: 0,
    tapLevel: 1,
    refineryLevel: 1,

    businesses: {},
    managers: [],
    cycles: {},

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
    rngSeed: seed,
  };
}

export function ownedOf(state: PlayerState, businessId: string): number {
  return state.businesses[businessId] ?? 0;
}

export function hasManager(state: PlayerState, businessId: string): boolean {
  return state.managers.includes(businessId);
}

export function holdingOf(state: PlayerState, stockId: string): Holding {
  return state.holdings[stockId] ?? { shares: 0, avgCost: 0 };
}
