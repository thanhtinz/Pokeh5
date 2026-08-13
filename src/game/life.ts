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
  title: string;
  /** One line, present tense, no exclamation marks. */
  line: string;
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
    at: -950_000,
    title: 'Phone reconnected',
    line: 'The number works again. Nobody has called yet.',
    icon: '📱',
    bonus: { kind: 'cardRate', multiplier: 1.15 },
  },
  {
    id: 'dog',
    at: -880_000,
    title: 'The dog comes home',
    line: 'The shelter held her longer than they had to.',
    icon: '🐕',
    bonus: { kind: 'tap', multiplier: 1.5 },
  },
  {
    id: 'car',
    at: -700_000,
    title: 'Car out of impound',
    line: 'Eleven months of storage fees, paid in cash.',
    icon: '🚗',
    bonus: { kind: 'jobSpeed', multiplier: 1.25 },
  },
  {
    id: 'room',
    at: -400_000,
    title: 'A room with a door',
    line: 'First month, last month, deposit. A key of your own.',
    icon: '🚪',
    bonus: { kind: 'offlineHours', hours: 4 },
  },
  {
    id: 'mother',
    at: -150_000,
    title: 'Your mother calls',
    line: 'She asks how work is going. You tell her the truth.',
    icon: '☎️',
    bonus: { kind: 'income', multiplier: 1.5 },
  },
  {
    id: 'zero',
    at: 0,
    title: 'The debt is gone',
    line: 'Zero. It took everything, and it is only zero.',
    icon: '🧾',
    bonus: { kind: 'income', multiplier: 3 },
  },
  {
    id: 'friends',
    at: 250_000,
    title: 'Friends return calls',
    line: 'Two of them. The ones who mattered.',
    icon: '🍻',
    bonus: { kind: 'cardRate', multiplier: 1.4 },
  },
  {
    id: 'kids',
    at: 5_000_000,
    title: 'Weekends with the kids',
    line: 'Every other Saturday. You are never late.',
    icon: '🧒',
    bonus: { kind: 'income', multiplier: 2.5 },
  },
  {
    id: 'house',
    at: 250_000_000,
    title: 'The house, bought back',
    line: 'The new owners named their price. You paid it.',
    icon: '🏡',
    bonus: { kind: 'offlineHours', hours: 8 },
  },
  {
    id: 'partner',
    at: 10_000_000_000,
    title: 'She moves back in',
    line: 'Slowly. One box at a time. It counts.',
    icon: '💍',
    bonus: { kind: 'income', multiplier: 4 },
  },
  {
    id: 'parents',
    at: 5e12,
    title: "Your parents' care, paid for life",
    line: 'The good place. The one with the garden.',
    icon: '🌷',
    bonus: { kind: 'income', multiplier: 6 },
  },
  {
    id: 'boss',
    at: 1e18,
    title: 'Broke to boss',
    line: 'Nobody who knew you then would recognise this.',
    icon: '👑',
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
      return `Tap earns ×${bonus.multiplier}`;
    case 'income':
      return `All income ×${bonus.multiplier}`;
    case 'jobSpeed':
      return `Jobs finish ${Math.round((bonus.multiplier - 1) * 100)}% faster`;
    case 'cardRate':
      return `Opportunities ${Math.round((bonus.multiplier - 1) * 100)}% more often`;
    case 'offlineHours':
      return `+${bonus.hours}h offline earnings`;
  }
}
