import { TEAM_SIZE } from '../config';
import type { ArtifactLevels } from './artifacts';
import { BASE_FORMS } from './data/pokedex';
import { Rng, randomSeed } from './rng';
import { emptySignLevels, type SignLevels } from './signs';

export const SAVE_VERSION = 2;

export interface Ivs {
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
}

export interface OwnedMon {
  uid: string;
  dexId: number;
  level: number;
  exp: number;
  /** Ascension rank, 1..6, raised by feeding duplicates. */
  star: number;
  ivs: Ivs;
  caughtAt: number;
}

export interface QuestProgress {
  /** Local day-of-year stamp, so dailies reset without a server. */
  day: number;
  battlesWon: number;
  summons: number;
  stagesCleared: number;
  claimed: string[];
}

export interface PlayerState {
  version: number;
  createdAt: number;
  lastSeenAt: number;

  name: string;
  level: number;
  exp: number;
  vip: number;

  gold: number;
  diamonds: number;
  tickets: number;

  /** Boss number currently being fought; `bestStage` is the high-water mark. */
  stage: number;
  bestStage: number;
  /** Consecutive losses on the current stage, used to offer a power hint. */
  stageAttempts: number;

  team: (string | null)[];
  box: OwnedMon[];
  items: Record<string, number>;

  /** Ascension shards, keyed by dex id as a string so the save stays JSON. */
  shards: Record<string, number>;
  /** Artifact levels per owned Pokemon, keyed by its uid. */
  artifacts: Record<string, ArtifactLevels>;
  /** Lit stars on each Signs board. */
  signs: SignLevels;

  quests: QuestProgress;
  /** Pity counter for the summon pool. */
  summonsSinceEpic: number;
}

export function dayStamp(at: number = Date.now()): number {
  return Math.floor(at / 86_400_000);
}

let uidCounter = 0;
export function newUid(): string {
  uidCounter += 1;
  return `m${Date.now().toString(36)}${uidCounter.toString(36)}`;
}

export function rollIvs(rng: Rng): Ivs {
  return {
    hp: rng.int(0, 31),
    atk: rng.int(0, 31),
    def: rng.int(0, 31),
    spa: rng.int(0, 31),
    spd: rng.int(0, 31),
    spe: rng.int(0, 31),
  };
}

export function createMon(dexId: number, level: number, rng: Rng): OwnedMon {
  return {
    uid: newUid(),
    dexId,
    level,
    exp: 0,
    star: 1,
    ivs: rollIvs(rng),
    caughtAt: Date.now(),
  };
}

/** The three Kanto starters, so a new player always opens on a familiar face. */
const STARTER_IDS = [1, 4, 7];

export function createNewSave(): PlayerState {
  const rng = new Rng(randomSeed());
  const now = Date.now();

  const starters = STARTER_IDS.map((id) => createMon(id, 5, rng));
  // One extra body so the formation screen is not a single lonely slot.
  const extraPool = BASE_FORMS.filter((entry) => entry.rarity <= 2 && !STARTER_IDS.includes(entry.id));
  const extra = createMon(rng.pick(extraPool).id, 4, rng);

  const box = [...starters, extra];
  const team: (string | null)[] = new Array(TEAM_SIZE).fill(null);
  box.forEach((mon, index) => {
    if (index < TEAM_SIZE) team[index] = mon.uid;
  });

  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastSeenAt: now,

    name: 'Trainer',
    level: 1,
    exp: 0,
    vip: 0,

    gold: 5_000,
    diamonds: 600,
    tickets: 5,

    stage: 1,
    bestStage: 1,
    stageAttempts: 0,

    team,
    box,
    items: { 'poke-ball': 10, potion: 5, 'rare-candy': 3 },

    shards: {},
    artifacts: {},
    signs: emptySignLevels(),

    quests: { day: dayStamp(now), battlesWon: 0, summons: 0, stagesCleared: 0, claimed: [] },
    summonsSinceEpic: 0,
  };
}

export function artifactsOf(state: PlayerState, uid: string): ArtifactLevels {
  return state.artifacts[uid] ?? {};
}

export function findMon(state: PlayerState, uid: string | null): OwnedMon | null {
  if (!uid) return null;
  return state.box.find((mon) => mon.uid === uid) ?? null;
}

/** The active party in slot order, skipping empty slots. */
export function activeTeam(state: PlayerState): OwnedMon[] {
  const team: OwnedMon[] = [];
  for (const uid of state.team) {
    const mon = findMon(state, uid);
    if (mon) team.push(mon);
  }
  return team;
}

export function itemCount(state: PlayerState, id: string): number {
  return state.items[id] ?? 0;
}

export function addItem(state: PlayerState, id: string, amount: number): void {
  state.items[id] = Math.max(0, itemCount(state, id) + amount);
}
