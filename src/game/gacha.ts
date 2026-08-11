import { addShards, shardsPerDuplicate } from './ascension';
import { DEX, DEX_BY_RARITY, type DexEntry } from './data/pokedex';
import { Rng } from './rng';
import { createMon, type OwnedMon, type PlayerState } from './state';

export interface BannerDef {
  id: string;
  name: string;
  /** Currency spent per pull. */
  currency: 'diamonds' | 'tickets';
  cost: number;
  /** Rarity weights, indexed 1..5. */
  weights: readonly number[];
  /** Guaranteed rarity 4+ after this many pulls without one. */
  pity: number;
}

export const BANNERS: readonly BannerDef[] = [
  {
    id: 'standard',
    name: 'Triệu Hồi Thường',
    currency: 'tickets',
    cost: 1,
    weights: [0, 56, 30, 11, 2.6, 0.4],
    pity: 60,
  },
  {
    id: 'premium',
    name: 'Triệu Hồi Cao Cấp',
    currency: 'diamonds',
    cost: 280,
    weights: [0, 34, 34, 22, 8, 2],
    pity: 40,
  },
];

export function bannerById(id: string): BannerDef {
  return BANNERS.find((banner) => banner.id === id) ?? BANNERS[0]!;
}

export interface SummonOutcome {
  entry: DexEntry;
  mon: OwnedMon | null;
  /** Shards awarded when the species was already owned. */
  shards: number;
  isNew: boolean;
}

function rollRarity(banner: BannerDef, pityCount: number, rng: Rng): number {
  if (pityCount + 1 >= banner.pity) return 4;

  const rarities = [1, 2, 3, 4, 5];
  return rng.weighted(rarities, (rarity) => banner.weights[rarity] ?? 0);
}

/**
 * A duplicate is never dead weight: it becomes ascension shards for that exact
 * species, so every pull feeds the star track of something the player owns.
 */
function grant(state: PlayerState, entry: DexEntry, rng: Rng): SummonOutcome {
  const existing = state.box.find((mon) => mon.dexId === entry.id);

  if (existing) {
    const shards = shardsPerDuplicate(entry.id);
    addShards(state, entry.id, shards);
    return { entry, mon: existing, shards, isNew: false };
  }

  // New recruits arrive near the player's own power so they are usable at once.
  const level = Math.max(5, Math.floor(averageTeamLevel(state) * 0.85));
  const mon = createMon(entry.id, level, rng);
  state.box.push(mon);
  return { entry, mon, shards: 0, isNew: true };
}

function averageTeamLevel(state: PlayerState): number {
  if (state.box.length === 0) return 5;
  const total = state.box.reduce((sum, mon) => sum + mon.level, 0);
  return total / state.box.length;
}

/**
 * Pulls `count` times, mutating `state` (currency, box, pity, quest counters).
 * Returns one outcome per pull so the reveal can animate them in order.
 */
export function summon(
  state: PlayerState,
  banner: BannerDef,
  count: number,
  seed: number,
): SummonOutcome[] {
  const rng = new Rng(seed);
  const results: SummonOutcome[] = [];

  for (let i = 0; i < count; i += 1) {
    if (!canAfford(state, banner, 1)) break;
    spend(state, banner, 1);

    const rarity = rollRarity(banner, state.summonsSinceEpic, rng);
    const pool = DEX_BY_RARITY.get(rarity) ?? DEX;
    const entry = rng.pick(pool);

    state.summonsSinceEpic = rarity >= 4 ? 0 : state.summonsSinceEpic + 1;
    state.quests.summons += 1;

    results.push(grant(state, entry, rng));
  }

  return results;
}

export function canAfford(state: PlayerState, banner: BannerDef, count: number): boolean {
  return state[banner.currency] >= banner.cost * count;
}

function spend(state: PlayerState, banner: BannerDef, count: number): void {
  state[banner.currency] -= banner.cost * count;
}
