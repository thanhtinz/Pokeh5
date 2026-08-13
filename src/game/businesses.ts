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
  name: string;
  /** District the business sits in; districts unlock in order. */
  district: string;
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

export const DISTRICTS = [
  'Skid Row',
  'The Docks',
  'Midtown',
  'Financial District',
  'Uptown',
  'The Heights',
] as const;

export type District = (typeof DISTRICTS)[number];

/**
 * Thirty-six businesses across six districts. Each district steps the numbers
 * up by roughly two orders of magnitude, so a new one always feels like a
 * different weight class rather than more of the same.
 */
export const BUSINESSES: readonly BusinessDef[] = [
  // --- Skid Row: cents and hustle -----------------------------------------
  b('cans', 'Can Collecting', 'Skid Row', 4, 1, 1.0, 1_000, 'can'),
  b('cart', 'Shopping Cart Haul', 'Skid Row', 60, 12, 3.0, 8_000, 'cart'),
  b('wash', 'Windshield Washing', 'Skid Row', 720, 90, 6.0, 60_000, 'spray'),
  b('busk', 'Subway Busking', 'Skid Row', 8_640, 720, 12.0, 480_000, 'mic'),
  b('scrap', 'Scrap Metal Run', 'Skid Row', 103_680, 5_760, 24.0, 4_000_000, 'gear'),
  b('flip', 'Pawn Shop Flipping', 'Skid Row', 1_244_160, 46_080, 48.0, 32_000_000, 'gem'),

  // --- The Docks ----------------------------------------------------------
  b('forklift', 'Forklift Contracts', 'The Docks', 14_929_920, 368_640, 60.0, 260_000_000, 'forklift'),
  b('crate', 'Crate Unloading', 'The Docks', 179_159_040, 2_949_120, 90.0, 2_100_000_000, 'crate'),
  b('fish', 'Fishing Trawler', 'The Docks', 2_149_908_480, 23_592_960, 120.0, 17_000_000_000, 'fish'),
  b('tug', 'Tugboat Service', 'The Docks', 25_798_901_760, 188_743_680, 180.0, 136_000_000_000, 'anchor'),
  b('customs', 'Customs Brokerage', 'The Docks', 309_586_821_120, 1_509_949_440, 240.0, 1.09e12, 'stamp'),
  b('yard', 'Container Yard', 'The Docks', 3.7e12, 1.2e10, 300.0, 8.7e12, 'containers'),

  // --- Midtown ------------------------------------------------------------
  b('food', 'Food Truck Fleet', 'Midtown', 4.5e13, 9.7e10, 45.0, 7.0e13, 'truck'),
  b('laundry', 'Laundromat Chain', 'Midtown', 5.4e14, 7.7e11, 75.0, 5.6e14, 'washer'),
  b('gym', 'Budget Gym Franchise', 'Midtown', 6.4e15, 6.2e12, 110.0, 4.5e15, 'dumbbell'),
  b('cafe', 'Coffee Chain', 'Midtown', 7.7e16, 4.9e13, 150.0, 3.6e16, 'coffee'),
  b('cinema', 'Cinema Complex', 'Midtown', 9.3e17, 4.0e14, 200.0, 2.9e17, 'film'),
  b('hotel', 'Boutique Hotel', 'Midtown', 1.1e19, 3.2e15, 280.0, 2.3e18, 'bed'),

  // --- Financial District -------------------------------------------------
  b('fund', 'Hedge Fund', 'Financial District', 1.3e20, 2.5e16, 90.0, 1.8e19, 'chart'),
  b('bank', 'Regional Bank', 'Financial District', 1.6e21, 2.0e17, 130.0, 1.5e20, 'bank'),
  b('insure', 'Insurance Arm', 'Financial District', 1.9e22, 1.6e18, 180.0, 1.2e21, 'shield'),
  b('broker', 'Brokerage House', 'Financial District', 2.3e23, 1.3e19, 240.0, 9.4e21, 'briefcase'),
  b('ratings', 'Ratings Agency', 'Financial District', 2.7e24, 1.0e20, 320.0, 7.5e22, 'star'),
  b('exchange', 'Private Exchange', 'Financial District', 3.3e25, 8.2e20, 420.0, 6.0e23, 'scales'),

  // --- Uptown -------------------------------------------------------------
  b('gallery', 'Art Gallery', 'Uptown', 3.9e26, 6.6e21, 120.0, 4.8e24, 'frame'),
  b('auction', 'Auction House', 'Uptown', 4.7e27, 5.3e22, 170.0, 3.9e25, 'gavel'),
  b('yacht', 'Yacht Brokerage', 'Uptown', 5.7e28, 4.2e23, 230.0, 3.1e26, 'yacht'),
  b('jet', 'Private Jet Charter', 'Uptown', 6.8e29, 3.4e24, 310.0, 2.5e27, 'plane'),
  b('vineyard', 'Vineyard Estate', 'Uptown', 8.2e30, 2.7e25, 400.0, 2.0e28, 'wine'),
  b('island', 'Private Island', 'Uptown', 9.8e31, 2.2e26, 520.0, 1.6e29, 'island'),

  // --- The Heights --------------------------------------------------------
  b('tower', 'Tower Development', 'The Heights', 1.2e33, 1.7e27, 150.0, 1.3e30, 'tower'),
  b('media', 'Media Conglomerate', 'The Heights', 1.4e34, 1.4e28, 210.0, 1.0e31, 'media'),
  b('space', 'Orbital Logistics', 'The Heights', 1.7e35, 1.1e29, 290.0, 8.2e31, 'rocket'),
  b('fusion', 'Fusion Utility', 'The Heights', 2.0e36, 8.8e29, 380.0, 6.6e32, 'atom'),
  b('bank2', 'Central Reserve Seat', 'The Heights', 2.4e37, 7.1e30, 500.0, 5.3e33, 'vault'),
  b('empire', 'The Empire', 'The Heights', 2.9e38, 5.7e31, 650.0, 4.2e34, 'crown'),
];

function b(
  id: string,
  name: string,
  district: District,
  baseCost: number,
  basePayout: number,
  cycleSeconds: number,
  managerCost: number,
  icon: string,
): BusinessDef {
  return { id, name, district, baseCost, basePayout, cycleSeconds, managerCost, icon };
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
