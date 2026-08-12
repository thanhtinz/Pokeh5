import { Capacitor } from '@capacitor/core';

import { dayStamp, MAX_CHAPTER } from './content';
import { MAX_STAGE } from './realms';
import { skillById } from './skills';
import {
  SAVE_VERSION,
  createNewSave,
  emptyTowers,
  normaliseLoadout,
  normaliseSpiritRoot,
  type PlayerState,
} from './state';

const KEY = 'vandao.save.v1';

/**
 * Saves are written synchronously to localStorage — the only storage a mobile
 * WebView can be relied on to flush during `pagehide` — and mirrored to native
 * preferences in the background, because Android can evict web storage when
 * the device runs low on space.
 */
const isNative = Capacitor.isNativePlatform();
let nativeApi: typeof import('@capacitor/preferences').Preferences | null = null;
let nativeReady: Promise<void> | null = null;

async function loadNative(): Promise<void> {
  if (!isNative) return;
  try {
    nativeApi = (await import('@capacitor/preferences')).Preferences;
  } catch {
    nativeApi = null;
  }
}

function ensureNative(): Promise<void> {
  nativeReady ??= loadNative();
  return nativeReady;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function clampNum(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/**
 * A save is the player's property and can be far older than the code reading
 * it, so nothing here trusts its shape. Every field is clamped back into
 * range, and a file that cannot be salvaged becomes a fresh start rather than
 * a crash on boot.
 */
export function sanitise(raw: unknown): PlayerState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Partial<PlayerState>;
  if (Number(data.version) !== SAVE_VERSION) return null;

  const towers = emptyTowers();
  if (typeof data.towers === 'object' && data.towers !== null) {
    for (const id of Object.keys(towers) as (keyof typeof towers)[]) {
      towers[id] = clampInt((data.towers as Record<string, unknown>)[id], 0, 9_999, 0);
    }
  }

  const daily = (data.daily ?? {}) as Partial<PlayerState['daily']>;
  const loadout = normaliseLoadout(data.loadout).map((id) => (id && skillById(id) ? id : null));

  return {
    version: SAVE_VERSION,
    createdAt: clampInt(data.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    lastSeenAt: clampInt(data.lastSeenAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),

    name: typeof data.name === 'string' && data.name.trim() ? data.name.slice(0, 16) : 'Vô Danh',
    stage: clampInt(data.stage, 0, MAX_STAGE, 0),
    cultivation: clampNum(data.cultivation, 0, Number.MAX_SAFE_INTEGER, 0),
    totalCultivation: clampNum(data.totalCultivation, 0, Number.MAX_SAFE_INTEGER, 0),
    cycles: clampInt(data.cycles, 0, 999, 0),

    linhThach: clampNum(data.linhThach, 0, Number.MAX_SAFE_INTEGER, 0),
    tienNgoc: clampNum(data.tienNgoc, 0, Number.MAX_SAFE_INTEGER, 0),
    biKip: clampNum(data.biKip, 0, Number.MAX_SAFE_INTEGER, 0),

    spiritRoot: normaliseSpiritRoot(data.spiritRoot),
    loadout,

    chapter: clampInt(data.chapter, 1, MAX_CHAPTER, 1),
    towers,

    daily: {
      day: clampInt(daily.day, 0, Number.MAX_SAFE_INTEGER, dayStamp()),
      quickTraining: clampInt(daily.quickTraining, 0, 999, 0),
      pills: clampInt(daily.pills, 0, 999, 0),
      breathing: clampInt(daily.breathing, 0, 999, 0),
    },
    railsCollapsed: data.railsCollapsed === true,
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

function readLocal(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export async function loadSave(): Promise<{ state: PlayerState; isNew: boolean }> {
  const local = parse(readLocal());

  let native: PlayerState | null = null;
  if (isNative) {
    await ensureNative();
    try {
      native = parse((await nativeApi?.get({ key: KEY }))?.value ?? null);
    } catch {
      native = null;
    }
  }

  // The mirror only wins when it is genuinely newer, which is exactly the
  // eviction case it exists for.
  const best = native && (!local || native.lastSeenAt > local.lastSeenAt) ? native : local;
  if (!best) return { state: createNewSave(), isNew: true };
  return { state: best, isNew: false };
}

export function saveNow(state: PlayerState): void {
  state.lastSeenAt = Date.now();
  const text = JSON.stringify(state);

  try {
    window.localStorage.setItem(KEY, text);
  } catch {
    // A blocked storage API is not worth crashing the game over.
  }

  if (isNative) {
    void ensureNative().then(() => nativeApi?.set({ key: KEY, value: text }).catch(() => {}));
  }
}

export function wipeSave(): void {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // Ignored.
  }
  if (isNative) void ensureNative().then(() => nativeApi?.remove({ key: KEY }).catch(() => {}));
}
