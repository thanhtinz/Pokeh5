import { dexEntry } from './data/pokedex';
import { TALENTS, talentAt, type Talent } from './data/talents';
import { MAX_STAR } from './stats';
import type { OwnedMon, PlayerState } from './state';

export { TALENTS, talentAt, type Talent };

/**
 * Star ascension. Duplicates from the gacha arrive as shards, and shards buy
 * stars — so a pull of something already owned is always progress rather than
 * a dead result.
 */

/** Shards needed to go from `star` to `star + 1`. */
export function shardCost(star: number): number {
  return [0, 20, 40, 80, 160, 320][star] ?? Infinity;
}

/** Gold charged alongside the shards. */
export function ascendGoldCost(star: number): number {
  return Math.floor(18_000 * Math.pow(2.1, star - 1));
}

export function shardsOf(state: PlayerState, dexId: number): number {
  return state.shards[String(dexId)] ?? 0;
}

export function addShards(state: PlayerState, dexId: number, amount: number): void {
  const key = String(dexId);
  state.shards[key] = Math.max(0, (state.shards[key] ?? 0) + amount);
}

export interface AscendCheck {
  canAscend: boolean;
  atMaxStar: boolean;
  shardsHeld: number;
  shardsNeeded: number;
  goldNeeded: number;
  /** The talent this ascension would unlock, if any. */
  unlocks: Talent | null;
}

export function checkAscend(state: PlayerState, mon: OwnedMon): AscendCheck {
  const atMaxStar = mon.star >= MAX_STAR;
  const shardsNeeded = atMaxStar ? 0 : shardCost(mon.star);
  const goldNeeded = atMaxStar ? 0 : ascendGoldCost(mon.star);
  const shardsHeld = shardsOf(state, mon.dexId);

  return {
    atMaxStar,
    shardsHeld,
    shardsNeeded,
    goldNeeded,
    unlocks: atMaxStar ? null : talentAt(mon.star + 1),
    canAscend: !atMaxStar && shardsHeld >= shardsNeeded && state.gold >= goldNeeded,
  };
}

/** Spends the shards and gold. Returns false and changes nothing if short. */
export function ascend(state: PlayerState, mon: OwnedMon): boolean {
  const check = checkAscend(state, mon);
  if (!check.canAscend) return false;

  addShards(state, mon.dexId, -check.shardsNeeded);
  state.gold -= check.goldNeeded;
  mon.star += 1;
  return true;
}

/** Shards a duplicate summon is worth, scaled by how rare the species is. */
export function shardsPerDuplicate(dexId: number): number {
  return [0, 6, 8, 12, 20, 30][dexEntry(dexId).rarity] ?? 6;
}
