import { TEAM_SIZE } from '../config';
import { ascend, checkAscend } from './ascension';
import {
  ARTIFACT_SLOTS,
  MAX_ARTIFACT_LEVEL,
  enhanceCost,
  type ArtifactLevels,
  type ArtifactSlotId,
} from './artifacts';
import { simulate, type BattleResult } from './battle';
import { DAILY_QUESTS, isQuestClaimed, isQuestComplete, type QuestDef } from './data/quests';
import { ELEMENTS, type ElementId } from './elements';
import { bannerById, summon, type SummonOutcome } from './gacha';
import { NODES_PER_BOARD, nodeCost, signMultipliers } from './signs';
import { expPerHour, goldPerHour, offlineReport, OFFLINE_MIN_SECONDS, type OfflineReport } from './idle';
import { randomSeed } from './rng';
import { loadSave, saveNow } from './save';
import { buildStageTeam, stageInfo } from './stages';
import { applyExp, battlePower, expToNext, MAX_LEVEL, teamPower, trainerExpToNext } from './stats';
import {
  activeTeam,
  artifactsOf,
  createNewSave,
  dayStamp,
  findMon,
  type OwnedMon,
  type PlayerState,
} from './state';
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

  /** Artifact loadout for one owned Pokemon. */
  artifacts(uid: string): ArtifactLevels {
    return artifactsOf(this.state, uid);
  }

  /** Fights the current stage and applies the outcome. */
  fight(): BattleResult {
    const party = activeTeam(this.state);
    const info = stageInfo(this.state.stage);
    const result = simulate(party, buildStageTeam(this.state.stage), randomSeed(), {
      artifactsOf: (uid) => this.artifacts(uid),
      signMultipliers: signMultipliers(this.state.signs),
    });

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

    this.commit();
    return results;
  }

  /** Spends shards and gold to raise one Pokemon's star rating. */
  ascendMon(uid: string): boolean {
    const mon = findMon(this.state, uid);
    if (!mon) return false;

    const check = checkAscend(this.state, mon);
    if (!check.canAscend) {
      this.events.emit('toast', {
        text: check.atMaxStar ? 'Đã đạt sao tối đa' : 'Thiếu mảnh hoặc vàng',
        tone: 'bad',
      });
      return false;
    }

    ascend(this.state, mon);
    const unlocked = check.unlocks;
    this.events.emit('toast', {
      text: unlocked ? `Mở talent: ${unlocked.name}` : `Lên ${mon.star} sao!`,
      tone: 'good',
    });
    this.commit();
    return true;
  }

  /** Raises one artifact slot by a level. */
  enhanceArtifact(uid: string, slot: ArtifactSlotId): boolean {
    const mon = findMon(this.state, uid);
    if (!mon) return false;

    const levels = { ...this.artifacts(uid) };
    const level = levels[slot] ?? 0;
    if (level >= MAX_ARTIFACT_LEVEL) {
      this.events.emit('toast', { text: 'Thần khí đã đạt cấp tối đa', tone: 'bad' });
      return false;
    }

    const cost = enhanceCost(level);
    if (this.state.gold < cost) {
      this.events.emit('toast', { text: 'Không đủ vàng', tone: 'bad' });
      return false;
    }

    this.state.gold -= cost;
    levels[slot] = level + 1;
    this.state.artifacts[uid] = levels;
    this.commit();
    return true;
  }

  /**
   * Levels every slot that is still affordable, cheapest first — so a click
   * spends the gold where it buys the most levels rather than stalling on the
   * one expensive slot.
   */
  enhanceAllArtifacts(uid: string): number {
    const mon = findMon(this.state, uid);
    if (!mon) return 0;

    const levels = { ...this.artifacts(uid) };
    let raised = 0;

    for (;;) {
      const affordable = ARTIFACT_SLOTS.filter(
        (slot) => (levels[slot] ?? 0) < MAX_ARTIFACT_LEVEL,
      ).sort((a, b) => enhanceCost(levels[a] ?? 0) - enhanceCost(levels[b] ?? 0));

      const next = affordable[0];
      if (!next) break;

      const cost = enhanceCost(levels[next] ?? 0);
      if (this.state.gold < cost) break;

      this.state.gold -= cost;
      levels[next] = (levels[next] ?? 0) + 1;
      raised += 1;
    }

    if (raised === 0) {
      this.events.emit('toast', { text: 'Không đủ vàng', tone: 'bad' });
      return 0;
    }

    this.state.artifacts[uid] = levels;
    this.events.emit('toast', { text: `Cường hoá ${raised} cấp`, tone: 'good' });
    this.commit();
    return raised;
  }

  /** Puts a level-1 artifact in every empty slot, if the gold covers it. */
  equipAllArtifacts(uid: string): number {
    const mon = findMon(this.state, uid);
    if (!mon) return 0;

    const levels = { ...this.artifacts(uid) };
    let equipped = 0;

    for (const slot of ARTIFACT_SLOTS) {
      if ((levels[slot] ?? 0) > 0) continue;
      const cost = enhanceCost(0);
      if (this.state.gold < cost) break;

      this.state.gold -= cost;
      levels[slot] = 1;
      equipped += 1;
    }

    if (equipped === 0) {
      this.events.emit('toast', { text: 'Đã trang bị đủ hoặc thiếu vàng', tone: 'bad' });
      return 0;
    }

    this.state.artifacts[uid] = levels;
    this.commit();
    return equipped;
  }

  /** Lights the next star on one Signs board. */
  upgradeSign(element: ElementId): boolean {
    const level = this.state.signs[element] ?? 0;
    if (level >= NODES_PER_BOARD) {
      this.events.emit('toast', { text: 'Chòm sao đã hoàn thành', tone: 'bad' });
      return false;
    }

    const cost = nodeCost(level);
    if (this.state.gold < cost) {
      this.events.emit('toast', { text: 'Không đủ vàng', tone: 'bad' });
      return false;
    }

    this.state.gold -= cost;
    this.state.signs[element] = level + 1;
    this.commit();
    return true;
  }

  /** Total Signs progress, used for the hub badge. */
  signTotal(): number {
    return ELEMENTS.reduce((sum, element) => sum + (this.state.signs[element] ?? 0), 0);
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
    return teamPower(activeTeam(this.state), (uid) => this.artifacts(uid));
  }

  /** Battle power of one Pokemon, artifacts included. */
  monPower(mon: OwnedMon): number {
    return battlePower(mon, this.artifacts(mon.uid));
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
