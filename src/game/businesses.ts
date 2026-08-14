/**
 * Businesses — the passive income spine.
 *
 * Each one runs a cycle: it takes `cycleSeconds` to produce `payout`, and the
 * player either taps it or hires a manager to run it forever. Owning more
 * units shortens nothing but multiplies the payout, and the cost of the next
 * unit grows geometrically, which is what gives an idle game its shape.
 */

export interface BusinessDef {
  id: string;
  /** District the business sits in; districts unlock in order. */
  district: District;
  /** Cost of the first unit. */
  baseCost: number;
  /** Payout per cycle at one unit. */
  basePayout: number;
  /** Seconds per cycle before any speed upgrades. */
  cycleSeconds: number;
  /** Cost of the manager that automates the cycle. */
  managerCost: number;
  /** Emoji standing in for art. */
  icon: string;
}

/** Cost of unit `n + 1`, given `owned` already bought. */
export const COST_GROWTH = 1.11;

/** District ids. Display names live in `src/i18n/`. */
export const DISTRICTS = ['skidrow', 'docks', 'midtown', 'financial', 'uptown', 'heights'] as const;

export type District = (typeof DISTRICTS)[number];

/**
 * Thirty-six businesses across six districts. Each district steps the numbers
 * up by roughly two orders of magnitude, so a new one always feels like a
 * different weight class rather than more of the same.
 */
export const BUSINESSES: readonly BusinessDef[] = [
  // --- Skid Row: cents and hustle -----------------------------------------
  b('cans', 'skidrow', 4000, 1000, 1.0, 1_000_000, 'can'),
  b('cart', 'skidrow', 60_000, 12_000, 3.0, 8_000_000, 'cart'),
  b('wash', 'skidrow', 720_000, 90_000, 6.0, 60_000_000, 'spray'),
  b('busk', 'skidrow', 8_640_000, 720_000, 12.0, 480_000_000, 'mic'),
  b('scrap', 'skidrow', 103_680_000, 5_760_000, 24.0, 4_000_000_000, 'gear'),
  b('flip', 'skidrow', 1_244_160_000, 46_080_000, 48.0, 32_000_000_000, 'gem'),

  // --- The Docks ----------------------------------------------------------
  b('forklift', 'docks', 14_929_920_000, 368_640_000, 60.0, 260_000_000_000, 'forklift'),
  b('crate', 'docks', 179_159_040_000, 2_949_120_000, 90.0, 2_100_000_000_000, 'crate'),
  b('fish', 'docks', 2_149_908_480_000, 23_592_960_000, 120.0, 17_000_000_000_000, 'fish'),
  b('tug', 'docks', 25_798_901_760_000, 188_743_680_000, 180.0, 136_000_000_000_000, 'anchor'),
  b('customs', 'docks', 309_586_821_120_000, 1_509_949_440_000, 240.0, 1.09e15, 'stamp'),
  b('yard', 'docks', 3.7e15, 12_000_000_000_000, 300.0, 8.7e15, 'containers'),

  // --- Midtown ------------------------------------------------------------
  b('food', 'midtown', 4.5e16, 97_000_000_000_000, 45.0, 7e16, 'truck'),
  b('laundry', 'midtown', 5.4e17, 770_000_000_000_000, 75.0, 5.6e17, 'washer'),
  b('gym', 'midtown', 6.4e18, 6.2e15, 110.0, 4.5e18, 'dumbbell'),
  b('cafe', 'midtown', 7.7e19, 4.9e16, 150.0, 3.6e19, 'coffee'),
  b('cinema', 'midtown', 9.3e20, 4e17, 200.0, 2.9e20, 'film'),
  b('hotel', 'midtown', 1.1e22, 3.2e18, 280.0, 2.3e21, 'bed'),

  // --- Financial District -------------------------------------------------
  b('fund', 'financial', 1.3e23, 2.5e19, 90.0, 1.8e22, 'chart'),
  b('bank', 'financial', 1.6e24, 2e20, 130.0, 1.5e23, 'bank'),
  b('insure', 'financial', 1.9e25, 1.6e21, 180.0, 1.2e24, 'shield'),
  b('broker', 'financial', 2.3e26, 1.3e22, 240.0, 9.4e24, 'briefcase'),
  b('ratings', 'financial', 2.7e27, 1e23, 320.0, 7.5e25, 'star'),
  b('exchange', 'financial', 3.3e28, 8.2e23, 420.0, 6e26, 'scales'),

  // --- Uptown -------------------------------------------------------------
  b('gallery', 'uptown', 3.9e29, 6.6e24, 120.0, 4.8e27, 'frame'),
  b('auction', 'uptown', 4.7e30, 5.3e25, 170.0, 3.9e28, 'gavel'),
  b('yacht', 'uptown', 5.7e31, 4.2e26, 230.0, 3.1e29, 'yacht'),
  b('jet', 'uptown', 6.8e32, 3.4e27, 310.0, 2.5e30, 'plane'),
  b('vineyard', 'uptown', 8.2e33, 2.7e28, 400.0, 2e31, 'wine'),
  b('island', 'uptown', 9.8e34, 2.2e29, 520.0, 1.6e32, 'island'),

  // --- The Heights --------------------------------------------------------
  b('tower', 'heights', 1.2e36, 1.7e30, 150.0, 1.3e33, 'tower'),
  b('media', 'heights', 1.4e37, 1.4e31, 210.0, 1e34, 'media'),
  b('space', 'heights', 1.7e38, 1.1e32, 290.0, 8.2e34, 'rocket'),
  b('fusion', 'heights', 2e39, 8.8e32, 380.0, 6.6e35, 'atom'),
  b('bank2', 'heights', 2.4e40, 7.1e33, 500.0, 5.3e36, 'vault'),
  b('empire', 'heights', 2.9e41, 5.7e34, 650.0, 4.2e37, 'crown'),
];

function b(
  id: string,
  district: District,
  baseCost: number,
  basePayout: number,
  cycleSeconds: number,
  managerCost: number,
  icon: string,
): BusinessDef {
  return { id, district, baseCost, basePayout, cycleSeconds, managerCost, icon };
}

const BY_ID = new Map(BUSINESSES.map((business) => [business.id, business]));

export function businessById(id: string): BusinessDef | null {
  return BY_ID.get(id) ?? null;
}

/** Cost of buying one more unit when `owned` are already held. */
export function unitCost(def: BusinessDef, owned: number): number {
  return def.baseCost * Math.pow(COST_GROWTH, owned);
}

/**
 * Cost of buying `amount` more units, as a closed-form geometric sum — looping
 * would be fine at ten but not at the "buy max" the late game needs.
 */
export function bulkCost(def: BusinessDef, owned: number, amount: number): number {
  if (amount <= 0) return 0;
  const first = unitCost(def, owned);
  return (first * (Math.pow(COST_GROWTH, amount) - 1)) / (COST_GROWTH - 1);
}

/** How many units `budget` can buy, given `owned` already held. */
export function affordableUnits(def: BusinessDef, owned: number, budget: number): number {
  if (budget <= 0) return 0;
  const first = unitCost(def, owned);
  if (budget < first) return 0;

  // Invert the geometric sum rather than stepping, so this stays O(1) even
  // when the answer is in the thousands.
  const n = Math.log((budget * (COST_GROWTH - 1)) / first + 1) / Math.log(COST_GROWTH);
  return Math.max(0, Math.floor(n));
}

/**
 * Milestone multipliers. Every business doubles its payout at fixed unit
 * counts, which is what makes "one more to 25" a real pull.
 */
const MILESTONES = [10, 25, 50, 100, 200, 300, 400, 500, 750, 1000];

export function milestoneMultiplier(owned: number): number {
  let multiplier = 1;
  for (const milestone of MILESTONES) {
    if (owned >= milestone) multiplier *= 2;
  }
  return multiplier;
}

/** The next milestone a business is working toward, or null past the last. */
export function nextMilestone(owned: number): number | null {
  return MILESTONES.find((milestone) => milestone > owned) ?? null;
}

/** Payout per completed cycle. */
export function cyclePayout(def: BusinessDef, owned: number, globalMultiplier: number): number {
  if (owned <= 0) return 0;
  return def.basePayout * owned * milestoneMultiplier(owned) * globalMultiplier;
}

/** Income per second if the cycle runs continuously. */
export function incomePerSecond(
  def: BusinessDef,
  owned: number,
  globalMultiplier: number,
  speedMultiplier: number,
): number {
  if (owned <= 0) return 0;
  return cyclePayout(def, owned, globalMultiplier) / (def.cycleSeconds / speedMultiplier);
}
