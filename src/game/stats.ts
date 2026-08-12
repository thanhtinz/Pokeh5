import { ELEMENTS, type ElementId } from './elements';
import { stageAt, reincarnationMultiplier } from './realms';

/**
 * The stat block the breakthrough screen shows: three body attributes and one
 * damage figure per phase.
 */
export interface Stats {
  /** 真气 — scales every skill's output. */
  chanKhi: number;
  /** 根骨 — reduces incoming damage. */
  canCot: number;
  /** 体魄 — maximum health. */
  thePhach: number;
  /** 五系伤害 — offence, one figure per phase. */
  damage: Record<ElementId, number>;
}

/** 灵根 — spirit root. Per-phase affinity, 0..100, raised with pills. */
export type SpiritRoot = Record<ElementId, number>;

export function emptySpiritRoot(): SpiritRoot {
  return { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0 };
}

export interface StatSource {
  stage: number;
  spiritRoot: SpiritRoot;
  cycles: number;
  /** Flat bonuses from equipment and pills. */
  bonusChanKhi?: number;
  bonusCanCot?: number;
  bonusThePhach?: number;
}

/**
 * Derives the whole stat block from the ladder position. Everything scales off
 * the realm multiplier, so a breakthrough visibly moves every number — which
 * is the moment the genre is built around.
 */
export function computeStats(source: StatSource): Stats {
  const stage = stageAt(source.stage);
  const cycle = reincarnationMultiplier(source.cycles);
  const tier = stage.index + 1;
  const scale = stage.realm.power * cycle;

  const chanKhi = Math.floor((40 + tier * 34) * scale) + (source.bonusChanKhi ?? 0);
  const canCot = Math.floor((110 + tier * 96) * scale) + (source.bonusCanCot ?? 0);
  const thePhach = Math.floor((180 + tier * 152) * scale) + (source.bonusThePhach ?? 0);

  const damage = {} as Record<ElementId, number>;
  for (const element of ELEMENTS) {
    // Spirit root is a percentage bonus on top of the base figure, so investing
    // in one phase shapes a build without making the others useless.
    const affinity = 1 + (source.spiritRoot[element] ?? 0) / 100;
    damage[element] = Math.floor((40 + tier * 34) * scale * affinity);
  }

  return { chanKhi, canCot, thePhach, damage };
}

/**
 * 战力 — the single number the header shows. Offence is taken from the
 * strongest phase plus a share of the rest, so a focused build and a spread
 * one land close together at equal investment.
 */
export function combatPower(stats: Stats): number {
  const damages = ELEMENTS.map((element) => stats.damage[element]);
  const best = Math.max(...damages);
  const rest = damages.reduce((sum, value) => sum + value, 0) - best;

  const offence = best + rest * 0.28;
  const bulk = stats.thePhach * 0.5 + stats.canCot * 1.15;
  return Math.floor((offence * 3.2 + bulk + stats.chanKhi * 1.4) * 1.6);
}

/** Damage of the phase a build leans on hardest. */
export function primaryElement(stats: Stats): ElementId {
  return ELEMENTS.reduce((best, element) =>
    stats.damage[element] > stats.damage[best] ? element : best,
  );
}

/** Difference between two stat blocks, for the breakthrough preview. */
export function statDelta(before: Stats, after: Stats): Stats {
  const damage = {} as Record<ElementId, number>;
  for (const element of ELEMENTS) {
    damage[element] = after.damage[element] - before.damage[element];
  }
  return {
    chanKhi: after.chanKhi - before.chanKhi,
    canCot: after.canCot - before.canCot,
    thePhach: after.thePhach - before.thePhach,
    damage,
  };
}
