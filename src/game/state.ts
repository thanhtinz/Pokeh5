import { ELEMENTS, type ElementId } from './elements';
import { LOADOUT_SLOTS } from './skills';
import { dayStamp } from './content';
import { emptySpiritRoot, type SpiritRoot } from './stats';
import type { TowerId } from './content';

export const SAVE_VERSION = 1;

export interface DailyCounters {
  day: number;
  /** 快速历练 — banked-income claims used today. */
  quickTraining: number;
  /** 服药 — pill uses, which raise the spirit root. */
  pills: number;
  /** 吐纳 — breathing, a burst of cultivation. */
  breathing: number;
}

export interface PlayerState {
  version: number;
  createdAt: number;
  lastSeenAt: number;

  name: string;
  /** Position on the realm ladder, 0..MAX_STAGE. */
  stage: number;
  /** Cultivation banked toward the next rank. */
  cultivation: number;
  /** Total cultivation ever gained, shown as 总修为. */
  totalCultivation: number;
  /** Completed reincarnations; each one multiplies every stat. */
  cycles: number;

  linhThach: number;
  tienNgoc: number;
  biKip: number;

  spiritRoot: SpiritRoot;
  loadout: (string | null)[];

  /** Furthest story chapter cleared. */
  chapter: number;
  /** Floors cleared per tower. */
  towers: Record<TowerId, number>;

  daily: DailyCounters;
  /** Rails collapse on the main screen, matching the reference's toggle. */
  railsCollapsed: boolean;
}

export function createNewSave(): PlayerState {
  const now = Date.now();

  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastSeenAt: now,

    name: 'Vô Danh',
    stage: 0,
    cultivation: 0,
    totalCultivation: 0,
    cycles: 0,

    linhThach: 1_000,
    tienNgoc: 100,
    biKip: 0,

    spiritRoot: emptySpiritRoot(),
    // The three starting arts are the tier-2 ones every phase opens with, so a
    // new player has a working rotation immediately.
    loadout: ['hoa-1', 'thuy-1', 'tho-1', 'moc-1'],

    chapter: 1,
    towers: { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0, chaos: 0 },

    daily: { day: dayStamp(now), quickTraining: 0, pills: 0, breathing: 0 },
    railsCollapsed: false,
  };
}

export function emptyTowers(): Record<TowerId, number> {
  return { kim: 0, moc: 0, thuy: 0, hoa: 0, tho: 0, chaos: 0 };
}

export function normaliseLoadout(loadout: unknown): (string | null)[] {
  const slots: (string | null)[] = new Array(LOADOUT_SLOTS).fill(null);
  if (!Array.isArray(loadout)) return slots;

  for (let i = 0; i < LOADOUT_SLOTS; i += 1) {
    const value = loadout[i];
    slots[i] = typeof value === 'string' && value.length > 0 ? value : null;
  }
  return slots;
}

export function normaliseSpiritRoot(root: unknown): SpiritRoot {
  const result = emptySpiritRoot();
  if (typeof root !== 'object' || root === null) return result;

  for (const element of ELEMENTS) {
    const value = Number((root as Record<ElementId, unknown>)[element]);
    result[element] = Number.isFinite(value) ? Math.max(0, Math.min(100, Math.floor(value))) : 0;
  }
  return result;
}
