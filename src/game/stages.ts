import { toCombatant, type Combatant } from './battle';
import { DEX, type DexEntry } from './data/pokedex';
import { Rng } from './rng';
import { FLAT_IVS } from './stats';
import type { OwnedMon } from './state';

/** Every tenth stage is a boss: bigger team, fatter stats, better payout. */
export const BOSS_INTERVAL = 10;

export interface StageInfo {
  stage: number;
  isBoss: boolean;
  /** Named tier the HUD shows above the stage number. */
  region: string;
  enemyLevel: number;
  teamSize: number;
  scale: number;
  goldReward: number;
  expReward: number;
}

const REGIONS = [
  'Pallet Town',
  'Viridian Forest',
  'Mt. Moon',
  'Vermilion City',
  'Rock Tunnel',
  'Celadon City',
  'Safari Zone',
  'Cinnabar Island',
  'Victory Road',
  'Indigo Plateau',
];

export function isBossStage(stage: number): boolean {
  return stage % BOSS_INTERVAL === 0;
}

/**
 * The single power curve everything economic is scaled against. A polynomial
 * rather than an exponential: it still grows fast enough to feel like progress,
 * but stays inside float precision no matter how deep a player pushes.
 */
export function stageCurve(stage: number): number {
  return Math.pow(Math.max(1, stage), 1.28);
}

export function stageInfo(stage: number): StageInfo {
  const clamped = Math.max(1, Math.floor(stage));
  const boss = isBossStage(clamped);

  // Enemy levels chase the player's own curve, flattening out near the cap so
  // late stages are won by team quality rather than raw level.
  const enemyLevel = Math.min(100, Math.floor(3 + clamped * 1.15));
  const teamSize = Math.min(6, 1 + Math.floor(clamped / 8));
  const scale = (1 + clamped * 0.035) * (boss ? 1.45 : 1);

  // Rewards and the idle rates in `idle.ts` share one curve, so what a clear
  // pays and what an hour afk pays never drift apart.
  const goldReward = Math.floor(14 * stageCurve(clamped) * (boss ? 4 : 1));
  const expReward = Math.floor(11 * stageCurve(clamped) * (boss ? 3.5 : 1));

  return {
    stage: clamped,
    isBoss: boss,
    region: REGIONS[Math.min(REGIONS.length - 1, Math.floor((clamped - 1) / 12))]!,
    enemyLevel,
    teamSize,
    scale,
    goldReward,
    expReward,
  };
}

/**
 * Enemy rosters are generated from the stage number alone, so stage 47 is the
 * same fight for every player and on every device — no roster has to be stored.
 */
export function buildStageTeam(stage: number): Combatant[] {
  const info = stageInfo(stage);
  const rng = new Rng(0x9e3779b9 ^ (info.stage * 2654435761));

  // Deeper stages lean on rarer species; early ones stay on the easy Kanto mobs.
  const rarityBias = Math.min(4, 1 + info.stage / 22);
  const pool: DexEntry[] = DEX.filter((entry) => entry.rarity <= Math.ceil(rarityBias) + 1);

  const team: Combatant[] = [];
  for (let slot = 0; slot < info.teamSize; slot += 1) {
    const entry = rng.weighted(pool, (candidate) =>
      1 / (1 + Math.abs(candidate.rarity - rarityBias) * 1.8),
    );

    // The last slot of a boss stage is the headline Pokemon shown on the card.
    const isLeader = info.isBoss && slot === info.teamSize - 1;
    const mon: OwnedMon = {
      uid: `foe-${info.stage}-${slot}`,
      dexId: entry.id,
      level: Math.max(1, info.enemyLevel + (isLeader ? 3 : 0)),
      exp: 0,
      star: isLeader ? 3 : 1,
      ivs: FLAT_IVS,
      caughtAt: 0,
    };

    team.push(toCombatant(mon, info.scale * (isLeader ? 1.25 : 1)));
  }

  return team;
}

/** The Pokemon whose art represents the stage on the city screen. */
export function stageLeaderDexId(stage: number): number {
  const team = buildStageTeam(stage);
  return team[team.length - 1]?.dexId ?? 1;
}
