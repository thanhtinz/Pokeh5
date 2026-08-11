import type { CombatStats } from './stats';

/**
 * Four artifact slots per Pokemon. Each slot has a fixed role so the loadout is
 * a levelling decision rather than an inventory puzzle: the interesting choice
 * is which Pokemon to pour gold into, not which trinket goes where.
 */

export type ArtifactSlotId = 'orb' | 'crown' | 'fang' | 'band';

export interface ArtifactDef {
  id: ArtifactSlotId;
  name: string;
  /** Atlas frame in the `items` texture. */
  icon: string;
  color: number;
  /** Stat gained per level, before the Pokemon's own scaling. */
  perLevel: Partial<CombatStats>;
  description: string;
}

export const ARTIFACTS: readonly ArtifactDef[] = [
  {
    id: 'orb',
    name: 'Ngọc Sinh Mệnh',
    icon: 'life-orb',
    color: 0xff6b6b,
    perLevel: { atk: 14, spa: 14 },
    description: 'Tăng Công và Đặc Công.',
  },
  {
    id: 'crown',
    name: 'Vương Miện',
    icon: 'moon-stone',
    color: 0xffd44d,
    perLevel: { hp: 62 },
    description: 'Tăng HP tối đa.',
  },
  {
    id: 'fang',
    name: 'Nanh Cổ Đại',
    icon: 'focus-sash',
    color: 0xc084fc,
    perLevel: { def: 11, spd: 11 },
    description: 'Tăng Thủ và Đặc Thủ.',
  },
  {
    id: 'band',
    name: 'Vòng Tốc Hành',
    icon: 'choice-band',
    color: 0x4fc3f7,
    perLevel: { spe: 9, atk: 6 },
    description: 'Tăng Tốc độ và Công.',
  },
];

export const ARTIFACT_SLOTS: readonly ArtifactSlotId[] = ARTIFACTS.map((item) => item.id);

const BY_ID = new Map(ARTIFACTS.map((item) => [item.id, item]));

export function artifactDef(id: ArtifactSlotId): ArtifactDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown artifact ${id}`);
  return def;
}

/** A Pokemon's artifact levels; an absent or zero entry means "not equipped". */
export type ArtifactLevels = Partial<Record<ArtifactSlotId, number>>;

export const MAX_ARTIFACT_LEVEL = 60;

/** Gold to take one slot from `level` to `level + 1`. */
export function enhanceCost(level: number): number {
  return Math.floor(2_400 * Math.pow(1.16, level));
}

export function totalEnhanceCost(levels: ArtifactLevels): number {
  let total = 0;
  for (const slot of ARTIFACT_SLOTS) {
    const level = levels[slot] ?? 0;
    if (level < MAX_ARTIFACT_LEVEL) total += enhanceCost(level);
  }
  return total;
}

/** Flat stat bonus the whole loadout contributes. */
export function artifactBonus(levels: ArtifactLevels): CombatStats {
  const bonus: CombatStats = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

  for (const def of ARTIFACTS) {
    const level = levels[def.id] ?? 0;
    if (level <= 0) continue;

    for (const [key, perLevel] of Object.entries(def.perLevel) as [keyof CombatStats, number][]) {
      bonus[key] += perLevel * level;
    }
  }
  return bonus;
}

/** Combined level across all four slots, shown as the loadout's headline. */
export function loadoutLevel(levels: ArtifactLevels): number {
  return ARTIFACT_SLOTS.reduce((sum, slot) => sum + (levels[slot] ?? 0), 0);
}

export function isFullyEquipped(levels: ArtifactLevels): boolean {
  return ARTIFACT_SLOTS.every((slot) => (levels[slot] ?? 0) > 0);
}
