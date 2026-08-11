import { TEAM_SIZE } from '../config';
import { simulate, type BattleResult } from './battle';
import { DAILY_QUESTS, isQuestClaimed, isQuestComplete, type QuestDef } from './data/quests';
import { bannerById, summon, type SummonOutcome } from './gacha';
import { expPerHour, goldPerHour, offlineReport, OFFLINE_MIN_SECONDS, type OfflineReport } from './idle';
import { randomSeed } from './rng';
import { loadSave, saveNow } from './save';
import { buildStageTeam, stageInfo } from './stages';
import { applyExp, expToNext, MAX_LEVEL, teamPower, trainerExpToNext } from './stats';
import { activeTeam, createNewSave, dayStamp, findMon, type PlayerState } from './state';
import { Emitter } from './emitter';

export type StoreEvents = {
  /** Anything the HUD shows has changed. */
  change: PlayerState;
  toast: { text: string; tone?: 'info' | 'good' | 'bad' };
  stageCleared: { stage: number; gold: number; exp: number };
  battleFinished: BattleResult;
  trainerLevelUp: { level: number };
  monLevelUp: { uid: string; level: number };
};

const AUTOSAVE_INTERVAL_MS = 15_000;

/**
 * Owns the single mutable copy of the save and every rule that touches it.
 * Scenes read from `state` and call these methods; they never mutate directly,
 * so persistence and the change notification can't be forgotten.
 */
class Store {
  readonly events = new Emitter<StoreEvents>();

  state: PlayerState = createNewSave();
  pendingOffline: OfflineReport | null = null;

  private accruedGold = 0;
  private accruedExp = 0;
  private sinceSave = 0;
  private started = false;

  async init(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const { state, isNew } = await loadSave();
    this.state = state;

    if (!isNew) {
      const report = offlineReport(state);
      if (report.cappedSeconds >= OFFLINE_MIN_SECONDS) this.pendingOffline = report;
    }

    this.rolloverDailies();
    saveNow(this.state);
    this.events.emit('change', this.state);
  }

  /** Applies whatever the offline dialog just showed, then clears it. */
  claimOffline(): OfflineReport | null {
    const report = this.pendingOffline;
    if (!report) return null;

    this.state.gold += report.gold;
    this.grantExp(report.exp);
    this.pendingOffline = null;
    this.commit();
    return report;
  }

  /**
   * Idle accrual. Fractions are carried between frames so a 60 fps device and a
   * 30 fps one earn exactly the same amount per second.
   */
  tick(deltaMs: number): void {
    const hours = deltaMs / 3_600_000;
    this.accruedGold += goldPerHour(this.state) * hours;
    this.accruedExp += expPerHour(this.state) * hours;

    const gold = Math.floor(this.accruedGold);
    const exp = Math.floor(this.accruedExp);
    let changed = false;

    if (gold > 0) {
      this.accruedGold -= gold;
      this.state.gold += gold;
      changed = true;
    }
    if (exp > 0) {
      this.accruedExp -= exp;
      this.grantExp(exp);
      changed = true;
    }

    this.sinceSave += deltaMs;
    if (this.sinceSave >= AUTOSAVE_INTERVAL_MS) {
      this.sinceSave = 0;
      saveNow(this.state);
    }

    if (changed) this.events.emit('change', this.state);
  }

  /** EXP is split between the trainer and every Pokemon in the active party. */
  grantExp(amount: number): void {
    if (amount <= 0) return;

    const trainer = applyExp(this.state.level, this.state.exp, amount, 999, trainerExpToNext);
    if (trainer.gained > 0) {
      this.state.level = trainer.level;
      this.events.emit('trainerLevelUp', { level: trainer.level });
    }
    this.state.exp = trainer.exp;

    const party = activeTeam(this.state);
    if (party.length === 0) return;

    const share = Math.floor(amount / party.length);
    if (share <= 0) return;

    for (const mon of party) {
      const result = applyExp(mon.level, mon.exp, share, MAX_LEVEL, expToNext);
      if (result.gained > 0) {
        mon.level = result.level;
        this.events.emit('monLevelUp', { uid: mon.uid, level: mon.level });
      }
      mon.exp = result.exp;
    }
  }

  /** Fights the current stage and applies the outcome. */
  fight(): BattleResult {
    const party = activeTeam(this.state);
    const info = stageInfo(this.state.stage);
    const result = simulate(party, buildStageTeam(this.state.stage), randomSeed());

    if (result.winner === 'ally') {
      this.state.gold += info.goldReward;
      this.grantExp(info.expReward);
      this.state.quests.battlesWon += 1;
      this.state.quests.stagesCleared += 1;
      this.state.stageAttempts = 0;

      this.state.stage = info.stage + 1;
      this.state.bestStage = Math.max(this.state.bestStage, this.state.stage);

      this.events.emit('stageCleared', {
        stage: info.stage,
        gold: info.goldReward,
        exp: info.expReward,
      });
    } else {
      this.state.stageAttempts += 1;
      // A loss still pays a consolation share so a wall never zeroes progress.
      const consolation = Math.floor(info.goldReward * 0.25);
      this.state.gold += consolation;
    }

    this.events.emit('battleFinished', result);
    this.commit();
    return result;
  }

  summonAt(bannerId: string, count: number): SummonOutcome[] {
    const banner = bannerById(bannerId);
    const results = summon(this.state, banner, count, randomSeed());

    if (results.length === 0) {
      const need = banner.currency === 'diamonds' ? 'Kim cương' : 'Vé';
      this.events.emit('toast', { text: `${need} không đủ`, tone: 'bad' });
      return results;
    }

    // Star-capped duplicates convert to gold rather than vanishing.
    for (const outcome of results) {
      if (!outcome.isNew && outcome.ascendedTo === null) {
        this.state.gold += 2500 * outcome.entry.rarity;
      }
    }

    this.commit();
    return results;
  }

  setTeamSlot(slot: number, uid: string | null): void {
    if (slot < 0 || slot >= TEAM_SIZE) return;
    if (uid && !findMon(this.state, uid)) return;

    // Moving a Pokemon that is already fielded swaps the two slots rather than
    // duplicating it across both.
    if (uid) {
      const existing = this.state.team.indexOf(uid);
      if (existing >= 0 && existing !== slot) {
        this.state.team[existing] = this.state.team[slot] ?? null;
      }
    }
    this.state.team[slot] = uid;
    this.commit();
  }

  claimQuest(quest: QuestDef): boolean {
    if (!isQuestComplete(this.state, quest) || isQuestClaimed(this.state, quest)) return false;

    this.state.gold += quest.reward.gold ?? 0;
    this.state.diamonds += quest.reward.diamonds ?? 0;
    this.state.tickets += quest.reward.tickets ?? 0;
    this.state.quests.claimed.push(quest.id);

    this.events.emit('toast', { text: `Đã nhận: ${quest.name}`, tone: 'good' });
    this.commit();
    return true;
  }

  /** Retreat one stage; useful when a wall needs farming instead of banging. */
  stepStage(delta: number): void {
    const next = Math.min(this.state.bestStage, Math.max(1, this.state.stage + delta));
    if (next === this.state.stage) return;
    this.state.stage = next;
    this.commit();
  }

  power(): number {
    return teamPower(activeTeam(this.state));
  }

  /** Wipes yesterday's daily counters the first time the app opens on a new day. */
  private rolloverDailies(): void {
    const today = dayStamp();
    if (this.state.quests.day === today) return;

    this.state.quests = {
      day: today,
      battlesWon: 0,
      summons: 0,
      stagesCleared: 0,
      claimed: [],
    };
  }

  commit(): void {
    saveNow(this.state);
    this.sinceSave = 0;
    this.events.emit('change', this.state);
  }

  /** Flush on the way out; `pagehide` is the only reliable hook on mobile. */
  flush(): void {
    saveNow(this.state);
  }
}

export const store = new Store();
export { DAILY_QUESTS };
