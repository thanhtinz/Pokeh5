import { simulate, type BattleResult, type Duelist } from './battle';
import {
  QUICK_TRAINING_HOURS,
  QUICK_TRAINING_PER_DAY,
  chapterAt,
  chapterOpponent,
  dayStamp,
  isTowerOpen,
  towerById,
  towerOpponent,
  type TowerId,
} from './content';
import { ELEMENTS, type ElementId } from './elements';
import {
  MAX_STAGE,
  baseCultivationRate,
  breakthroughCost,
  canReincarnate,
  reincarnationMultiplier,
  stageAt,
} from './realms';
import { randomSeed } from './rng';
import { loadSave, saveNow } from './save';
import { LOADOUT_SLOTS, skillById } from './skills';
import { combatPower, computeStats, type Stats } from './stats';
import { createNewSave, type PlayerState } from './state';

/**
 * The single mutable copy of the save, plus every rule that touches it.
 *
 * Screens read `store.state` and call these methods; nothing mutates the save
 * directly, so persistence and the change notification can never be forgotten.
 */

export interface OfflineReport {
  seconds: number;
  cultivation: number;
  linhThach: number;
  capped: boolean;
}

export const OFFLINE_CAP_HOURS = 12;
const AUTOSAVE_MS = 12_000;
const PILLS_PER_DAY = 10;
const BREATHING_PER_DAY = 10;

type Listener = () => void;

class Store {
  state: PlayerState = createNewSave();
  pendingOffline: OfflineReport | null = null;
  ready = false;

  private listeners = new Set<Listener>();
  private carryCultivation = 0;
  private carryStones = 0;
  private sinceSave = 0;
  private started = false;
  private timer: number | null = null;

  // ------------------------------------------------------------ lifecycle

  async init(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const { state, isNew } = await loadSave();
    this.state = state;

    if (!isNew) {
      const elapsed = Math.max(0, (Date.now() - state.lastSeenAt) / 1000);
      const capped = Math.min(elapsed, OFFLINE_CAP_HOURS * 3600);
      if (capped >= 60) {
        this.pendingOffline = {
          seconds: elapsed,
          cultivation: Math.floor(this.cultivationRate() * capped),
          linhThach: Math.floor(this.stoneRate() * capped),
          capped: elapsed > OFFLINE_CAP_HOURS * 3600,
        };
      }
    }

    this.rolloverDaily();
    this.ready = true;
    saveNow(this.state);
    this.notify();

    // A one-second heartbeat is plenty: the display shows per-second figures,
    // and a faster loop would only spend battery.
    this.timer = window.setInterval(() => this.tick(1000), 1000);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener();
  }

  private commit(): void {
    saveNow(this.state);
    this.sinceSave = 0;
    this.notify();
  }

  flush(): void {
    saveNow(this.state);
  }

  dispose(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  // ----------------------------------------------------------------- rates

  /** Cultivation per second, before the display's ±10% flutter. */
  cultivationRate(): number {
    const base = baseCultivationRate(this.state.stage);
    const cycle = reincarnationMultiplier(this.state.cycles);
    // Spirit root feeds the rate as well as damage, so pills are never a
    // purely combat investment.
    const root = ELEMENTS.reduce((sum, element) => sum + this.state.spiritRoot[element], 0);
    return base * cycle * (1 + root / 260);
  }

  /** Spirit stones per second, from the furthest chapter cleared. */
  stoneRate(): number {
    return chapterAt(this.state.chapter).income * reincarnationMultiplier(this.state.cycles);
  }

  /** The reference shows a range rather than a single figure. */
  rateRange(): [number, number] {
    const rate = this.cultivationRate();
    return [Math.floor(rate * 0.9), Math.ceil(rate * 1.1)];
  }

  // ------------------------------------------------------------------ tick

  private tick(deltaMs: number): void {
    const seconds = deltaMs / 1000;

    // Fractions carry between ticks, so a device that throttles timers still
    // earns exactly the same amount per second of wall clock.
    this.carryCultivation += this.cultivationRate() * seconds;
    this.carryStones += this.stoneRate() * seconds;

    const cultivation = Math.floor(this.carryCultivation);
    const stones = Math.floor(this.carryStones);
    let changed = false;

    if (cultivation > 0) {
      this.carryCultivation -= cultivation;
      this.addCultivation(cultivation);
      changed = true;
    }
    if (stones > 0) {
      this.carryStones -= stones;
      this.state.linhThach += stones;
      changed = true;
    }

    this.sinceSave += deltaMs;
    if (this.sinceSave >= AUTOSAVE_MS) {
      this.sinceSave = 0;
      saveNow(this.state);
    }

    if (this.rolloverDaily()) changed = true;
    if (changed) this.notify();
  }

  private addCultivation(amount: number): void {
    this.state.cultivation += amount;
    this.state.totalCultivation += amount;
  }

  /** Wipes yesterday's counters the first time the app runs on a new day. */
  private rolloverDaily(): boolean {
    const today = dayStamp();
    if (this.state.daily.day === today) return false;
    this.state.daily = { day: today, quickTraining: 0, pills: 0, breathing: 0 };
    return true;
  }

  // ----------------------------------------------------------------- stats

  stats(stage: number = this.state.stage): Stats {
    return computeStats({
      stage,
      spiritRoot: this.state.spiritRoot,
      cycles: this.state.cycles,
    });
  }

  power(): number {
    return combatPower(this.stats());
  }

  selfDuelist(): Duelist {
    return {
      name: this.state.name,
      realmLabel: stageAt(this.state.stage).label,
      stats: this.stats(),
      loadout: this.state.loadout,
    };
  }

  // ------------------------------------------------------------ progression

  breakthroughProgress(): { have: number; need: number; ready: boolean } {
    const need = breakthroughCost(this.state.stage);
    const have = this.state.cultivation;
    return { have, need, ready: have >= need && this.state.stage < MAX_STAGE };
  }

  /** Crosses one rank. Returns the stats before and after, for the preview. */
  breakthrough(): { before: Stats; after: Stats } | null {
    const { need, ready } = this.breakthroughProgress();
    if (!ready) return null;

    const before = this.stats();
    this.state.cultivation -= need;
    this.state.stage += 1;
    const after = this.stats();

    this.commit();
    return { before, after };
  }

  canReincarnate(): boolean {
    return canReincarnate(this.state.stage);
  }

  /** Luân hồi — resets the ladder for a permanent multiplier on everything. */
  reincarnate(): boolean {
    if (!this.canReincarnate()) return false;

    this.state.cycles += 1;
    this.state.stage = 0;
    this.state.cultivation = 0;
    this.commit();
    return true;
  }

  // -------------------------------------------------------------- dailies

  quickTrainingLeft(): number {
    return Math.max(0, QUICK_TRAINING_PER_DAY - this.state.daily.quickTraining);
  }

  /** Grants a block of banked income without waiting for it. */
  claimQuickTraining(): OfflineReport | null {
    if (this.quickTrainingLeft() <= 0) return null;

    const seconds = QUICK_TRAINING_HOURS * 3600;
    const report: OfflineReport = {
      seconds,
      cultivation: Math.floor(this.cultivationRate() * seconds),
      linhThach: Math.floor(this.stoneRate() * seconds),
      capped: false,
    };

    this.addCultivation(report.cultivation);
    this.state.linhThach += report.linhThach;
    this.state.daily.quickTraining += 1;
    this.commit();
    return report;
  }

  pillsLeft(): number {
    return Math.max(0, PILLS_PER_DAY - this.state.daily.pills);
  }

  /** 服药 — raises the spirit root of the phase the build already leans on. */
  takePill(element: ElementId): boolean {
    if (this.pillsLeft() <= 0) return false;
    if (this.state.linhThach < this.pillCost()) return false;

    this.state.linhThach -= this.pillCost();
    this.state.spiritRoot[element] = Math.min(100, this.state.spiritRoot[element] + 1);
    this.state.daily.pills += 1;
    this.commit();
    return true;
  }

  pillCost(): number {
    const total = ELEMENTS.reduce((sum, element) => sum + this.state.spiritRoot[element], 0);
    return Math.floor(600 * Math.pow(1.09, total));
  }

  breathingLeft(): number {
    return Math.max(0, BREATHING_PER_DAY - this.state.daily.breathing);
  }

  /** 吐纳 — a burst worth ten minutes of cultivation. */
  breathe(): number | null {
    if (this.breathingLeft() <= 0) return null;

    const gained = Math.floor(this.cultivationRate() * 600);
    this.addCultivation(gained);
    this.state.daily.breathing += 1;
    this.commit();
    return gained;
  }

  claimOffline(): OfflineReport | null {
    const report = this.pendingOffline;
    if (!report) return null;

    this.addCultivation(report.cultivation);
    this.state.linhThach += report.linhThach;
    this.pendingOffline = null;
    this.commit();
    return report;
  }

  // -------------------------------------------------------------- loadout

  setSlot(slot: number, skillId: string | null): void {
    if (slot < 0 || slot >= LOADOUT_SLOTS) return;
    if (skillId !== null && !skillById(skillId)) return;

    // Fielding an art already in another slot swaps the two rather than
    // duplicating it.
    if (skillId) {
      const existing = this.state.loadout.indexOf(skillId);
      if (existing >= 0 && existing !== slot) {
        this.state.loadout[existing] = this.state.loadout[slot] ?? null;
      }
    }
    this.state.loadout[slot] = skillId;
    this.commit();
  }

  // ---------------------------------------------------------------- duels

  /** Fights the next story chapter. A win advances the chapter. */
  fightChapter(): { result: BattleResult; opponent: Duelist; reward: number } {
    const chapter = chapterAt(this.state.chapter);
    const opponent = chapterOpponent(chapter);
    const result = simulate(this.selfDuelist(), opponent, randomSeed());
    const reward = Math.floor(chapter.income * 900);

    if (result.winner === 'self') {
      this.state.chapter = Math.min(this.state.chapter + 1, 120);
      this.state.linhThach += reward;
      this.state.biKip += 1;
    }
    this.commit();
    return { result, opponent, reward };
  }

  /** Fights the next floor of a tower. Closed towers refuse. */
  fightTower(id: TowerId): { result: BattleResult; opponent: Duelist; reward: number } | null {
    const tower = towerById(id);
    if (!isTowerOpen(tower)) return null;

    const floor = this.state.towers[id] + 1;
    const opponent = towerOpponent(tower, floor);
    const result = simulate(this.selfDuelist(), opponent, randomSeed());
    const reward = Math.floor(400 * Math.pow(floor, 1.35));

    if (result.winner === 'self') {
      this.state.towers[id] = floor;
      this.state.tienNgoc += Math.max(1, Math.floor(floor / 3));
      this.state.linhThach += reward;
    }
    this.commit();
    return { result, opponent, reward };
  }
}

export const store = new Store();
