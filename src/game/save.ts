import { Capacitor } from '@capacitor/core';

import { achievementById } from './achievements';
import { businessById } from './businesses';
import { cardTemplate, jobById } from './jobs';
import { milestoneById } from './life';
import { perkById } from './perks';
import { QUEST_POOL, questById } from './quests';
import { TIERS } from './upgrades';
import { randomSeed } from './rng';
import { stockById } from './stocks';
import { SAVE_VERSION, createNewSave, type PlayerState } from './state';

const KEY = 'broketoboss.save.v1';

/** Số đếm mà việc trong ngày có thể bám vào; khoá ngoài danh sách này bị bỏ. */
const QUEST_METRICS = new Set<string>(QUEST_POOL.map((quest) => quest.metric));

/**
 * Saves go to localStorage synchronously — the only storage a mobile WebView
 * reliably flushes during `pagehide` — and are mirrored to native preferences
 * in the background, because Android can evict web storage under pressure.
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
 * it, so nothing here trusts its shape. Unknown business, stock and milestone
 * ids are dropped rather than carried, and a file that cannot be salvaged
 * becomes a fresh start instead of a crash on boot.
 */
export function sanitise(raw: unknown): PlayerState | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const data = raw as Partial<PlayerState>;
  if (Number(data.version) !== SAVE_VERSION) return null;

  const businesses: Record<string, number> = {};
  if (typeof data.businesses === 'object' && data.businesses !== null) {
    for (const [id, owned] of Object.entries(data.businesses)) {
      if (!businessById(id)) continue;
      const units = clampInt(owned, 0, 1_000_000, 0);
      if (units > 0) businesses[id] = units;
    }
  }

  const upgrades: Record<string, number> = {};
  if (typeof data.upgrades === 'object' && data.upgrades !== null) {
    for (const [id, level] of Object.entries(data.upgrades)) {
      if (!businessById(id)) continue;
      const capped = clampInt(level, 0, TIERS.length, 0);
      if (capped > 0) upgrades[id] = capped;
    }
  }

  const perks: Record<string, number> = {};
  if (typeof data.perks === 'object' && data.perks !== null) {
    for (const [id, level] of Object.entries(data.perks)) {
      const def = perkById(id);
      if (!def) continue;
      const capped = clampInt(level, 0, def.max, 0);
      if (capped > 0) perks[id] = capped;
    }
  }

  const achievements = Array.isArray(data.achievements)
    ? [
        ...new Set(
          data.achievements.filter(
            (id): id is string => typeof id === 'string' && achievementById(id) !== null,
          ),
        ),
      ]
    : [];

  const stats = (data.stats ?? {}) as Record<string, unknown>;

  // Mốc số đếm lúc sang ngày. Khoá lạ bị bỏ, và thiếu khoá nào thì `questState`
  // tự coi hôm nay bắt đầu từ không — an toàn hơn là đoán một con số.
  const questBase: Record<string, number> = {};
  if (typeof data.questBase === 'object' && data.questBase !== null) {
    for (const [metric, value] of Object.entries(data.questBase)) {
      if (!QUEST_METRICS.has(metric)) continue;
      questBase[metric] = clampInt(value, 0, Number.MAX_SAFE_INTEGER, 0);
    }
  }

  const knownQuests = (value: unknown): string[] =>
    Array.isArray(value)
      ? [...new Set(value.filter((id): id is string => typeof id === 'string' && questById(id) !== null))]
      : [];

  const questIds = knownQuests(data.questIds);
  const questDone = knownQuests(data.questDone).filter((id) => questIds.includes(id));

  const managers = Array.isArray(data.managers)
    ? [...new Set(data.managers.filter((id): id is string => typeof id === 'string' && businessById(id) !== null))]
    : [];

  const cycles: Record<string, number> = {};
  if (typeof data.cycles === 'object' && data.cycles !== null) {
    for (const [id, progress] of Object.entries(data.cycles)) {
      const def = businessById(id);
      if (!def) continue;
      cycles[id] = clampNum(progress, 0, def.cycleSeconds, 0);
    }
  }

  const holdings: Record<string, { shares: number; avgCost: number }> = {};
  if (typeof data.holdings === 'object' && data.holdings !== null) {
    for (const [id, holding] of Object.entries(data.holdings)) {
      if (!stockById(id) || typeof holding !== 'object' || holding === null) continue;
      const shares = clampNum((holding as { shares?: unknown }).shares, 0, 1e15, 0);
      if (shares <= 0) continue;
      holdings[id] = {
        shares,
        avgCost: clampNum((holding as { avgCost?: unknown }).avgCost, 0, Number.MAX_SAFE_INTEGER, 0),
      };
    }
  }

  const claimed = Array.isArray(data.claimed)
    ? [...new Set(data.claimed.filter((id): id is string => typeof id === 'string' && milestoneById(id) !== null))]
    : [];

  const now = Date.now();
  const job = sanitiseJob(data.job, now);

  return {
    version: SAVE_VERSION,
    createdAt: clampInt(data.createdAt, 0, Number.MAX_SAFE_INTEGER, now),
    lastSeenAt: clampInt(data.lastSeenAt, 0, Number.MAX_SAFE_INTEGER, now),

    // Cash may legitimately be negative; only the magnitude is bounded.
    cash: clampNum(data.cash, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0),
    peakNetWorth: clampNum(data.peakNetWorth, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0),
    // Bản lưu ghi trước khi có "làm lại" không có kỷ lục riêng; đỉnh của lượt
    // đang chơi chính là kỷ lục của nó.
    bestNetWorth: clampNum(
      data.bestNetWorth,
      -Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER,
      clampNum(data.peakNetWorth, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0),
    ),

    reputation: clampInt(data.reputation, 0, 1e12, 0),
    // Bản lưu trước khi có cửa hàng uy tín không tách hai sổ; số dư của nó
    // chính là tổng nó từng kiếm.
    reputationTotal: clampInt(
      data.reputationTotal,
      0,
      1e12,
      clampInt(data.reputation, 0, 1e12, 0),
    ),
    runs: clampInt(data.runs, 0, 1e6, 0),
    perks,

    ore: clampNum(data.ore, 0, Number.MAX_SAFE_INTEGER, 0),
    tapLevel: clampInt(data.tapLevel, 1, 100_000, 1),
    refineryLevel: clampInt(data.refineryLevel, 1, 100_000, 1),

    businesses,
    managers,
    cycles,
    upgrades,

    holdings,
    marketTick: clampInt(data.marketTick, 0, 100_000_000, 0),
    marketSeed: clampInt(data.marketSeed, 0, 0xffffffff, randomSeed()),
    autoTrader: data.autoTrader === true,

    job,
    card: sanitiseCard(data.card, now),
    nextCardAt: clampInt(data.nextCardAt, 0, Number.MAX_SAFE_INTEGER, now + 45_000),
    boost: sanitiseBoost(data.boost, now),

    claimed,
    achievements,

    dailyClaimedAt: clampInt(data.dailyClaimedAt, 0, Number.MAX_SAFE_INTEGER, 0),
    dailyStreak: clampInt(data.dailyStreak, 0, 1e6, 0),

    questDay: clampInt(data.questDay, 0, Number.MAX_SAFE_INTEGER, 0),
    questIds,
    questBase,
    questDone,

    stats: {
      taps: clampInt(stats['taps'], 0, Number.MAX_SAFE_INTEGER, 0),
      cards: clampInt(stats['cards'], 0, Number.MAX_SAFE_INTEGER, 0),
      jobs: clampInt(stats['jobs'], 0, Number.MAX_SAFE_INTEGER, 0),
      trades: clampInt(stats['trades'], 0, Number.MAX_SAFE_INTEGER, 0),
      units: clampInt(stats['units'], 0, Number.MAX_SAFE_INTEGER, 0),
      upgrades: clampInt(stats['upgrades'], 0, Number.MAX_SAFE_INTEGER, 0),
    },

    rngSeed: clampInt(data.rngSeed, 0, 0xffffffff, randomSeed()),
  };
}

function sanitiseJob(raw: unknown, now: number): PlayerState['job'] {
  if (typeof raw !== 'object' || raw === null) return null;
  const job = raw as { jobId?: unknown; endsAt?: unknown };
  if (typeof job.jobId !== 'string' || !jobById(job.jobId)) return null;

  // A job whose clock ran out while the app was closed is not carried; the
  // store credits it during the offline pass instead.
  const endsAt = clampInt(job.endsAt, 0, Number.MAX_SAFE_INTEGER, 0);
  return { jobId: job.jobId, endsAt: Math.max(endsAt, now) };
}

function sanitiseCard(raw: unknown, now: number): PlayerState['card'] {
  if (typeof raw !== 'object' || raw === null) return null;
  const card = raw as Record<string, unknown>;
  // An unknown template has no prose to show, and a card is worth seconds; a
  // stale one is dropped rather than restored blank.
  if (typeof card['key'] !== 'string' || !cardTemplate(card['key'])) return null;

  const expiresAt = clampInt(card['expiresAt'], 0, Number.MAX_SAFE_INTEGER, 0);
  if (expiresAt <= now) return null;

  return {
    key: card['key'],
    kind: typeof card['kind'] === 'string' ? card['kind'] : 'cash',
    value: clampNum(card['value'], 0, Number.MAX_SAFE_INTEGER, 0),
    seconds: clampNum(card['seconds'], 0, 3600, 0),
    icon: typeof card['icon'] === 'string' ? card['icon'] : 'coin',
    expiresAt,
  };
}

function sanitiseBoost(raw: unknown, now: number): PlayerState['boost'] {
  if (typeof raw !== 'object' || raw === null) return null;
  const boost = raw as { multiplier?: unknown; endsAt?: unknown };

  const endsAt = clampInt(boost.endsAt, 0, Number.MAX_SAFE_INTEGER, 0);
  if (endsAt <= now) return null;

  return { multiplier: clampNum(boost.multiplier, 1, 1000, 1), endsAt };
}

function parse(text: string | null): PlayerState | null {
  if (!text) return null;
  try {
    return sanitise(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function loadSave(): Promise<{ state: PlayerState; isNew: boolean }> {
  let local: PlayerState | null = null;
  try {
    local = parse(window.localStorage.getItem(KEY));
  } catch {
    local = null;
  }

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
  if (!best) return { state: createNewSave(randomSeed()), isNew: true };
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
