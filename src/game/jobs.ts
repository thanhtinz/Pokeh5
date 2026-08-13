/**
 * Timed jobs and opportunity cards — the two active loops that carry the game
 * before businesses can.
 *
 * Jobs are the reliable floor: pick one, wait, collect. Cards are the spikes:
 * they arrive on a timer, expire if ignored, and can be worth many minutes of
 * income at once. Together they give a player something to do in the stretch
 * where passive income is still measured in cents.
 */
import type { Rng } from './rng';

export interface JobDef {
  id: string;
  seconds: number;
  /** Payout at the base tap level, before any multipliers. */
  payout: number;
  /** Net worth at which the job becomes available. */
  unlockAt: number;
  icon: string;
}

/**
 * Payouts per second of waiting climb with the tier, so a longer job is always
 * the better rate — the trade is attention, not efficiency.
 */
export const JOBS: readonly JobDef[] = [
  {
    id: 'flyers',
    seconds: 15,
    payout: 45,
    unlockAt: -Infinity,
    icon: 'flyer',
  },
  {
    id: 'dishes',
    seconds: 60,
    payout: 260,
    unlockAt: -990_000,
    icon: 'plate',
  },
  {
    id: 'moving',
    seconds: 300,
    payout: 1_800,
    unlockAt: -950_000,
    icon: 'boxes',
  },
  {
    id: 'night',
    seconds: 900,
    payout: 7_200,
    unlockAt: -800_000,
    icon: 'camera',
  },
  {
    id: 'rig',
    seconds: 1_800,
    payout: 21_000,
    unlockAt: -400_000,
    icon: 'derrick',
  },
];

export function jobById(id: string): JobDef | null {
  return JOBS.find((job) => job.id === id) ?? null;
}

/** Card template by id, for validating a save. */
export function cardTemplate(key: string): { key: string } | null {
  return TEMPLATES.find((template) => template.key === key) ?? null;
}

export function unlockedJobs(netWorth: number): JobDef[] {
  return JOBS.filter((job) => netWorth >= job.unlockAt);
}

// ------------------------------------------------------------ opportunity ---

export type CardKind = 'cash' | 'multiplier' | 'ore' | 'gamble';

export interface OpportunityCard {
  /** Template id; the title and flavour are looked up from it. */
  key: string;
  kind: CardKind;
  /** Cash payout, or the multiplier factor, depending on `kind`. */
  value: number;
  /** Seconds a multiplier card lasts. */
  seconds: number;
  icon: string;
}

interface CardTemplate {
  key: string;
  kind: CardKind;
  icon: string;
  /** Weight in the draw. */
  weight: number;
  /** Payout as a multiple of the player's income per second, for cash cards. */
  incomeSeconds?: number;
  value?: number;
  seconds?: number;
}

/**
 * Cash cards are priced in seconds of the player's own income rather than flat
 * amounts, so a card drawn at hour one and hour fifty are both worth taking.
 */
const TEMPLATES: readonly CardTemplate[] = [
  {
    key: 'wallet',
    kind: 'cash',
    icon: 'wallet',
    weight: 24,
    incomeSeconds: 60,
  },
  {
    key: 'debt',
    kind: 'cash',
    icon: 'coins',
    weight: 16,
    incomeSeconds: 240,
  },
  {
    key: 'scrap',
    kind: 'cash',
    icon: 'coin',
    weight: 14,
    incomeSeconds: 420,
  },
  {
    key: 'streak',
    kind: 'multiplier',
    icon: 'flame',
    weight: 12,
    value: 2,
    seconds: 60,
  },
  {
    key: 'investor',
    kind: 'multiplier',
    icon: 'call',
    weight: 8,
    value: 3,
    seconds: 45,
  },
  {
    key: 'seam',
    kind: 'ore',
    icon: 'ore',
    weight: 14,
    value: 250,
  },
  {
    key: 'sure',
    kind: 'gamble',
    icon: 'dice',
    weight: 12,
    incomeSeconds: 300,
  },
];

/** Seconds between card offers. */
export const CARD_INTERVAL = 90;
/** How long an offered card stays on the table. */
export const CARD_LIFETIME = 25;

/**
 * Draws a card, scaling cash values off the player's current income so the
 * offer stays meaningful at any point on the curve.
 */
export function drawCard(rng: Rng, incomePerSecond: number, tapValue: number): OpportunityCard {
  const total = TEMPLATES.reduce((sum, template) => sum + template.weight, 0);
  let roll = rng.next() * total;

  let chosen = TEMPLATES[TEMPLATES.length - 1]!;
  for (const template of TEMPLATES) {
    roll -= template.weight;
    if (roll <= 0) {
      chosen = template;
      break;
    }
  }

  // A floor tied to the tap value keeps early cards from rounding to nothing
  // while passive income is still zero.
  const baseline = Math.max(incomePerSecond, tapValue * 0.5);
  const value =
    chosen.incomeSeconds !== undefined
      ? Math.max(25, baseline * chosen.incomeSeconds)
      : (chosen.value ?? 0);

  return {
    key: chosen.key,
    kind: chosen.kind,
    value,
    seconds: chosen.seconds ?? 0,
    icon: chosen.icon,
  };
}
