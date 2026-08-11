import { OFFLINE_CAP_HOURS } from '../config';
import { stageCurve } from './stages';
import type { PlayerState } from './state';

/** Base hourly yields, keyed off the deepest stage the player has cleared. */
export function goldPerHour(state: PlayerState): number {
  return Math.floor(550 * stageCurve(state.bestStage) * vipMultiplier(state.vip));
}

export function expPerHour(state: PlayerState): number {
  return Math.floor(440 * stageCurve(state.bestStage) * vipMultiplier(state.vip));
}

export function vipMultiplier(vip: number): number {
  return 1 + 0.08 * Math.max(0, vip);
}

export interface OfflineReport {
  seconds: number;
  cappedSeconds: number;
  gold: number;
  exp: number;
  wasCapped: boolean;
}

/**
 * Works out what accrued while the app was closed. Capping at half a day keeps
 * the game worth opening daily without punishing a night's sleep.
 */
export function offlineReport(state: PlayerState, now: number = Date.now()): OfflineReport {
  const seconds = Math.max(0, (now - state.lastSeenAt) / 1000);
  const capSeconds = OFFLINE_CAP_HOURS * 3600;
  const cappedSeconds = Math.min(seconds, capSeconds);
  const hours = cappedSeconds / 3600;

  return {
    seconds,
    cappedSeconds,
    gold: Math.floor(goldPerHour(state) * hours),
    exp: Math.floor(expPerHour(state) * hours),
    wasCapped: seconds > capSeconds,
  };
}

/** Below this the offline dialog is noise, so it is skipped. */
export const OFFLINE_MIN_SECONDS = 60;
