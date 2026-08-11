import type { PlayerState } from '../state';

export interface QuestDef {
  id: string;
  name: string;
  target: number;
  progressOf: (state: PlayerState) => number;
  reward: { gold?: number; diamonds?: number; tickets?: number };
}

/** Daily goals; the counters behind them reset with `quests.day`. */
export const DAILY_QUESTS: readonly QuestDef[] = [
  {
    id: 'daily-battles',
    name: 'Thắng 5 trận',
    target: 5,
    progressOf: (state) => state.quests.battlesWon,
    reward: { gold: 4000, tickets: 1 },
  },
  {
    id: 'daily-stages',
    name: 'Vượt 3 ải',
    target: 3,
    progressOf: (state) => state.quests.stagesCleared,
    reward: { diamonds: 60 },
  },
  {
    id: 'daily-summon',
    name: 'Triệu hồi 1 lần',
    target: 1,
    progressOf: (state) => state.quests.summons,
    reward: { gold: 2500 },
  },
];

export function questProgress(state: PlayerState, quest: QuestDef): number {
  return Math.min(quest.target, quest.progressOf(state));
}

export function isQuestComplete(state: PlayerState, quest: QuestDef): boolean {
  return questProgress(state, quest) >= quest.target;
}

export function isQuestClaimed(state: PlayerState, quest: QuestDef): boolean {
  return state.quests.claimed.includes(quest.id);
}

export function claimableCount(state: PlayerState): number {
  return DAILY_QUESTS.filter(
    (quest) => isQuestComplete(state, quest) && !isQuestClaimed(state, quest),
  ).length;
}
