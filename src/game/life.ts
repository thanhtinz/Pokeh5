import { t as tr } from '../i18n';

/**
 * The life recovery track — what the debt cost, bought back one milestone at a
 * time.
 *
 * This is the game's spine rather than decoration. Each milestone carries a
 * permanent bonus, so the emotional beat and the mechanical one land together
 * and a player never has to choose between the story and the optimal play.
 */

export type LifeBonus =
  | { kind: 'tap'; multiplier: number }
  | { kind: 'income'; multiplier: number }
  | { kind: 'jobSpeed'; multiplier: number }
  | { kind: 'offlineHours'; hours: number }
  | { kind: 'cardRate'; multiplier: number };

export interface LifeMilestone {
  id: string;
  /** Net worth at which it is reclaimed. */
  at: number;
  icon: string;
  bonus: LifeBonus;
}

/**
 * Ordered by net worth. The early ones are deliberately small and close
 * together — the first hour is where a player decides whether the climb is
 * worth it, and it should never feel like nothing is happening.
 */
export const MILESTONES: readonly LifeMilestone[] = [
  {
    id: 'phone',
    at: -950_000_000,
    icon: 'smartphone',
    bonus: { kind: 'cardRate', multiplier: 1.15 },
  },
  {
    id: 'dog',
    at: -880_000_000,
    icon: 'dog',
    bonus: { kind: 'tap', multiplier: 1.5 },
  },
  {
    id: 'car',
    at: -700_000_000,
    icon: 'car',
    bonus: { kind: 'jobSpeed', multiplier: 1.25 },
  },
  {
    id: 'room',
    at: -400_000_000,
    icon: 'door',
    bonus: { kind: 'offlineHours', hours: 4 },
  },
  {
    id: 'mother',
    at: -150_000_000,
    icon: 'call',
    bonus: { kind: 'income', multiplier: 1.5 },
  },
  {
    id: 'zero',
    at: 0,
    icon: 'receipt',
    bonus: { kind: 'income', multiplier: 3 },
  },
  {
    id: 'friends',
    at: 250_000_000,
    icon: 'cheers',
    bonus: { kind: 'cardRate', multiplier: 1.4 },
  },
  {
    id: 'kids',
    at: 5_000_000_000,
    icon: 'child',
    bonus: { kind: 'income', multiplier: 2.5 },
  },
  {
    id: 'house',
    at: 250_000_000_000,
    icon: 'house',
    bonus: { kind: 'offlineHours', hours: 8 },
  },
  {
    id: 'partner',
    at: 10_000_000_000_000,
    icon: 'ring',
    bonus: { kind: 'income', multiplier: 4 },
  },
  {
    id: 'parents',
    at: 5e15,
    icon: 'flower',
    bonus: { kind: 'income', multiplier: 6 },
  },
  {
    id: 'boss',
    at: 1e21,
    icon: 'crown',
    bonus: { kind: 'income', multiplier: 10 },
  },
];

export function milestoneById(id: string): LifeMilestone | null {
  return MILESTONES.find((milestone) => milestone.id === id) ?? null;
}

/** Milestones the player has reached but not yet acknowledged. */
export function newlyReached(netWorth: number, claimed: readonly string[]): LifeMilestone[] {
  const seen = new Set(claimed);
  return MILESTONES.filter((milestone) => netWorth >= milestone.at && !seen.has(milestone.id));
}

/** The next one still ahead, for the progress strip. */
export function nextMilestone(netWorth: number): LifeMilestone | null {
  return MILESTONES.find((milestone) => netWorth < milestone.at) ?? null;
}

export interface LifeBonuses {
  tap: number;
  income: number;
  jobSpeed: number;
  offlineHours: number;
  cardRate: number;
}

/** Everything claimed so far, folded into one set of multipliers. */
export function bonusesFrom(claimed: readonly string[]): LifeBonuses {
  const bonuses: LifeBonuses = {
    tap: 1,
    income: 1,
    jobSpeed: 1,
    offlineHours: 2,
    cardRate: 1,
  };

  for (const id of claimed) {
    const milestone = milestoneById(id);
    if (!milestone) continue;

    switch (milestone.bonus.kind) {
      case 'tap':
        bonuses.tap *= milestone.bonus.multiplier;
        break;
      case 'income':
        bonuses.income *= milestone.bonus.multiplier;
        break;
      case 'jobSpeed':
        bonuses.jobSpeed *= milestone.bonus.multiplier;
        break;
      case 'cardRate':
        bonuses.cardRate *= milestone.bonus.multiplier;
        break;
      case 'offlineHours':
        bonuses.offlineHours += milestone.bonus.hours;
        break;
    }
  }
  return bonuses;
}

export function describeBonus(bonus: LifeBonus): string {
  switch (bonus.kind) {
    case 'tap':
      return tr('bonus.tap', { multiplier: bonus.multiplier });
    case 'income':
      return tr('bonus.income', { multiplier: bonus.multiplier });
    case 'jobSpeed':
      return tr('bonus.jobSpeed', { percent: Math.round((bonus.multiplier - 1) * 100) });
    case 'cardRate':
      return tr('bonus.cardRate', { percent: Math.round((bonus.multiplier - 1) * 100) });
    case 'offlineHours':
      return tr('bonus.offlineHours', { hours: bonus.hours });
  }
}
