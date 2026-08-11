import { TEAM_SIZE } from '../config';
import { ARTIFACT_SLOTS, MAX_ARTIFACT_LEVEL, type ArtifactLevels } from './artifacts';
import { dexEntryOrNull } from './data/pokedex';
import { ELEMENTS } from './elements';
import { NODES_PER_BOARD, emptySignLevels, type SignLevels } from './signs';
import { MAX_LEVEL, MAX_STAR } from './stats';
import {
  SAVE_VERSION,
  createNewSave,
  dayStamp,
  type OwnedMon,
  type PlayerState,
} from './state';
import { mirrorNative, readLocal, readNative, removeLocal, writeLocal } from './storage';

export const SAVE_KEY = 'pokeh5.save.v1';

/**
 * A save is player property and can be years old by the time a bug is found, so
 * loading never trusts its shape: every field is clamped back into range and a
 * corrupt file degrades to a fresh start rather than a crash on boot.
 */
function sanitiseMon(raw: unknown): OwnedMon | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const mon = raw as Partial<OwnedMon>;

  const dexId = Number(mon.dexId);
  if (!dexEntryOrNull(dexId)) return null;

  const ivs = mon.ivs ?? ({} as OwnedMon['ivs']);
  const iv = (value: unknown) => clampInt(value, 0, 31, 16);

  return {
    uid: typeof mon.uid === 'string' && mon.uid.length > 0 ? mon.uid : `m${dexId}-${Math.random()}`,
    dexId,
    level: clampInt(mon.level, 1, MAX_LEVEL, 1),
    exp: clampInt(mon.exp, 0, Number.MAX_SAFE_INTEGER, 0),
    star: clampInt(mon.star, 1, MAX_STAR, 1),
    ivs: {
      hp: iv(ivs.hp),
      atk: iv(ivs.atk),
      def: iv(ivs.def),
      spa: iv(ivs.spa),
      spd: iv(ivs.spd),
      spe: iv(ivs.spe),
    },
    caughtAt: clampInt(mon.caughtAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function sanitiseShards(raw: unknown): Record<string, number> {
  const shards: Record<string, number> = {};
  if (typeof raw !== 'object' || raw === null) return shards;

  for (const [dexId, count] of Object.entries(raw)) {
    // Drop entries for species that no longer exist in the pokedex.
    if (!dexEntryOrNull(Number(dexId))) continue;
    const amount = clampInt(count, 0, 9_999_999, 0);
    if (amount > 0) shards[String(Number(dexId))] = amount;
  }
  return shards;
}

function sanitiseArtifacts(raw: unknown, owned: ReadonlySet<string>): Record<string, ArtifactLevels> {
  const artifacts: Record<string, ArtifactLevels> = {};
  if (typeof raw !== 'object' || raw === null) return artifacts;

  for (const [uid, levels] of Object.entries(raw)) {
    // A loadout whose Pokemon was released is dead weight in the save.
    if (!owned.has(uid) || typeof levels !== 'object' || levels === null) continue;

    const slots: ArtifactLevels = {};
    let any = false;
    for (const slot of ARTIFACT_SLOTS) {
      const level = clampInt((levels as Record<string, unknown>)[slot], 0, MAX_ARTIFACT_LEVEL, 0);
      if (level > 0) {
        slots[slot] = level;
        any = true;
      }
    }
    if (any) artifacts[uid] = slots;
  }
  return artifacts;
}

function sanitiseSigns(raw: unknown): SignLevels {
  const signs = emptySignLevels();
  if (typeof raw !== 'object' || raw === null) return signs;

  for (const element of ELEMENTS) {
    signs[element] = clampInt((raw as Record<string, unknown>)[element], 0, NODES_PER_BOARD, 0);
  }
  return signs;
}

export function sanitise(raw: unknown): PlayerState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Partial<PlayerState>;

  const version = Number(data.version);
  // Version 1 predates shards, artifacts and Signs. Those fields simply default
  // to empty, so an old save carries forward instead of being thrown away.
  if (version !== SAVE_VERSION && version !== 1) return null;

  const box = Array.isArray(data.box)
    ? data.box.map(sanitiseMon).filter((mon): mon is OwnedMon => mon !== null)
    : [];
  if (box.length === 0) return null;

  const owned = new Set(box.map((mon) => mon.uid));
  const team: (string | null)[] = new Array(TEAM_SIZE).fill(null);
  if (Array.isArray(data.team)) {
    const used = new Set<string>();
    for (let i = 0; i < TEAM_SIZE; i += 1) {
      const uid = data.team[i];
      // A slot pointing at a released or duplicated Pokemon simply empties.
      if (typeof uid === 'string' && owned.has(uid) && !used.has(uid)) {
        team[i] = uid;
        used.add(uid);
      }
    }
  }
  // Written as `!some` on purpose: `every(slot => slot === null)` narrows the
  // array to `null[]` under TypeScript's inferred type predicates.
  if (!team.some((slot) => slot !== null)) team[0] = box[0]!.uid;

  const items: Record<string, number> = {};
  if (typeof data.items === 'object' && data.items !== null) {
    for (const [id, count] of Object.entries(data.items)) {
      const amount = clampInt(count, 0, 9_999_999, 0);
      if (amount > 0) items[id] = amount;
    }
  }

  const bestStage = clampInt(data.bestStage, 1, 100_000, 1);
  const quests = (data.quests ?? {}) as Partial<PlayerState['quests']>;

  return {
    version: SAVE_VERSION,
    createdAt: clampInt(data.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    lastSeenAt: clampInt(data.lastSeenAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),

    name: typeof data.name === 'string' && data.name.trim() ? data.name.slice(0, 20) : 'Trainer',
    level: clampInt(data.level, 1, 999, 1),
    exp: clampNumber(data.exp, 0, Number.MAX_SAFE_INTEGER, 0),
    vip: clampInt(data.vip, 0, 15, 0),

    gold: clampNumber(data.gold, 0, Number.MAX_SAFE_INTEGER, 0),
    diamonds: clampNumber(data.diamonds, 0, Number.MAX_SAFE_INTEGER, 0),
    tickets: clampInt(data.tickets, 0, 9_999_999, 0),

    // The current stage can never sit above the best one ever reached.
    stage: Math.min(bestStage, clampInt(data.stage, 1, 100_000, 1)),
    bestStage,
    stageAttempts: clampInt(data.stageAttempts, 0, 9999, 0),

    team,
    box,
    items,

    shards: sanitiseShards(data.shards),
    artifacts: sanitiseArtifacts(data.artifacts, owned),
    signs: sanitiseSigns(data.signs),

    quests: {
      day: clampInt(quests.day, 0, Number.MAX_SAFE_INTEGER, dayStamp()),
      battlesWon: clampInt(quests.battlesWon, 0, 999_999, 0),
      summons: clampInt(quests.summons, 0, 999_999, 0),
      stagesCleared: clampInt(quests.stagesCleared, 0, 999_999, 0),
      claimed: Array.isArray(quests.claimed)
        ? quests.claimed.filter((id): id is string => typeof id === 'string').slice(0, 64)
        : [],
    },
    summonsSinceEpic: clampInt(data.summonsSinceEpic, 0, 999, 0),
  };
}

function parse(text: string | null): PlayerState | null {
  if (!text) return null;
  try {
    return sanitise(JSON.parse(text));
  } catch {
    return null;
  }
}

/**
 * Loads the newest of the two copies. The native mirror wins ties only when the
 * local copy is missing or older, which is exactly the eviction case.
 */
export async function loadSave(): Promise<{ state: PlayerState; isNew: boolean }> {
  const local = parse(readLocal(SAVE_KEY));
  const native = parse(await readNative(SAVE_KEY));

  let best = local;
  if (native && (!local || native.lastSeenAt > local.lastSeenAt)) best = native;

  if (!best) return { state: createNewSave(), isNew: true };
  return { state: best, isNew: false };
}

/** Synchronous local write plus a background native mirror. */
export function saveNow(state: PlayerState): void {
  state.lastSeenAt = Date.now();
  const text = JSON.stringify(state);
  writeLocal(SAVE_KEY, text);
  void mirrorNative(SAVE_KEY, text);
}

export function wipeSave(): void {
  removeLocal(SAVE_KEY);
  void mirrorNative(SAVE_KEY, '');
}
