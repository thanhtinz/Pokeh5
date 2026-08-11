import { dexEntry, type BaseStats } from './data/pokedex';
import type { OwnedMon } from './state';

export const MAX_LEVEL = 100;
export const MAX_STAR = 6;

export interface CombatStats {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

/**
 * Each ascension star is a flat multiplier on every stat, which is what makes
 * duplicate summons worth keeping.
 */
export function starMultiplier(star: number): number {
  return 1 + 0.18 * (Math.min(star, MAX_STAR) - 1);
}

/**
 * The mainline stat formula, with IVs kept and EVs dropped — the extra knob
 * would not survive an idle game's pace, but IVs give duplicates some spread.
 */
export function combatStats(mon: OwnedMon): CombatStats {
  const { base } = dexEntry(mon.dexId);
  const level = Math.min(mon.level, MAX_LEVEL);
  const mult = starMultiplier(mon.star);

  const other = (baseValue: number, iv: number) =>
    Math.floor((Math.floor(((2 * baseValue + iv) * level) / 100) + 5) * mult);

  return {
    hp: Math.floor((Math.floor(((2 * base.hp + mon.ivs.hp) * level) / 100) + level + 10) * mult),
    atk: other(base.atk, mon.ivs.atk),
    def: other(base.def, mon.ivs.def),
    spa: other(base.spa, mon.ivs.spa),
    spd: other(base.spd, mon.ivs.spd),
    spe: other(base.spe, mon.ivs.spe),
  };
}

/**
 * Battle Power — the single number the HUD shows. Offence and bulk are weighted
 * so that a glass cannon and a wall of the same level land close together.
 */
export function battlePower(mon: OwnedMon): number {
  const s = combatStats(mon);
  const offence = Math.max(s.atk, s.spa) + 0.35 * Math.min(s.atk, s.spa);
  const bulk = s.hp * 0.55 + (s.def + s.spd) * 1.1;
  const tempo = s.spe * 0.8;
  return Math.floor((offence * 2.4 + bulk + tempo) * 1.6);
}

export function teamPower(team: readonly OwnedMon[]): number {
  return team.reduce((total, mon) => total + battlePower(mon), 0);
}

/** EXP needed to go from `level` to `level + 1`. */
export function expToNext(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return Math.floor(48 * Math.pow(level, 1.62) + 42 * level + 60);
}

/** Trainer levels climb far more slowly than their Pokemon. */
export function trainerExpToNext(level: number): number {
  return Math.floor(1200 * Math.pow(level, 1.78) + 5000);
}

export interface LevelUpResult {
  level: number;
  exp: number;
  gained: number;
}

/** Pour EXP into a level/exp pair, rolling over as many levels as it covers. */
export function applyExp(
  level: number,
  exp: number,
  amount: number,
  maxLevel: number,
  costOf: (level: number) => number,
): LevelUpResult {
  let nextLevel = level;
  let pool = exp + Math.max(0, Math.floor(amount));

  while (nextLevel < maxLevel) {
    const cost = costOf(nextLevel);
    if (pool < cost) break;
    pool -= cost;
    nextLevel += 1;
  }

  if (nextLevel >= maxLevel) pool = 0;
  return { level: nextLevel, exp: pool, gained: nextLevel - level };
}

/** A neutral IV spread, used for enemies which should not feel random. */
export const FLAT_IVS: BaseStats = { hp: 16, atk: 16, def: 16, spa: 16, spd: 16, spe: 16 };
