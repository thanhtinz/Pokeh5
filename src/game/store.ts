/**
 * The store: one mutable save, every action that touches it, and the tick that
 * moves time forward.
 *
 * Nothing in here imports the renderer. The whole rule layer under `src/game/`
 * runs in plain node, which is what makes the economy testable without a DOM.
 *
 * ## How money works, because it is the one unusual thing
 *
 * The player starts at minus one million and stays there for a while, so `cash`
 * is a signed balance rather than a wallet. Purchases are not gated on cash —
 * they are gated on a **credit line**, because a balance of -$1,000,000 with a
 * hard "you must have the money" rule is a game with no first move.
 *
 * The line starts small and widens with the progress already made:
 *
 *     line  = CREDIT_BASE + CREDIT_SHARE * (peakNetWorth - STARTING_BALANCE)
 *     floor = STARTING_BALANCE - line
 *
 * Net worth counts cash plus what was paid for the businesses plus the market
 * value of the holdings, so a purchase moves value sideways and leaves net
 * worth untouched. That closes the obvious loop — borrowing to buy assets
 * cannot widen the line that allowed the borrowing — and leaves the line
 * growing only from income actually earned.
 */
import {
  BUSINESSES,
  affordableUnits,
  bulkCost,
  businessById,
  cyclePayout,
  incomePerSecond,
  unitCost,
} from './businesses';
import { CARD_LIFETIME, drawCard, jobById } from './jobs';
import { bonusesFrom, newlyReached, type LifeBonuses, type LifeMilestone } from './life';
import { Rng } from './rng';
import { loadSave, saveNow, wipeSave } from './save';
import {
  STARTING_BALANCE,
  createNewSave,
  holdingOf,
  ownedOf,
  type PlayerState,
} from './state';
import {
  TICK_SECONDS,
  applyBuy,
  applySell,
  changeOver,
  holdingValue,
  pricesAt,
  priceOf,
  stockById,
  STOCKS,
  unrealised,
} from './stocks';

/** Dollars a single unit of ore is worth at refinery level one. */
export const ORE_BASE_VALUE = 8;
/** Ore the refinery can process per second at level one. */
export const REFINERY_BASE_RATE = 3;
/** Value multiplier per refinery level. */
export const REFINERY_GROWTH = 1.25;

/** Credit extended before any progress has been made. */
export const CREDIT_BASE = 2_000;
/** Share of the climb so far that the line grows by. */
export const CREDIT_SHARE = 0.4;

export const TAP_UPGRADE_BASE = 150;
export const TAP_UPGRADE_GROWTH = 1.55;
export const REFINERY_UPGRADE_BASE = 400;
export const REFINERY_UPGRADE_GROWTH = 1.62;

/** Offline pays at this rate, so playing is always worth more than not. */
export const OFFLINE_EFFICIENCY = 0.55;

/** Ore held while the refinery is idle, so a burst of tapping is not wasted. */
export const ORE_CAPACITY_PER_LEVEL = 120;

// ------------------------------------------------------------------ derived --

export interface Derived {
  /** Cash plus what the businesses cost plus what the holdings are worth. */
  netWorth: number;
  /** The asset half of net worth on its own. */
  assets: number;
  /** Business income per second, counting only what runs unattended. */
  income: number;
  /** Everything the refinery would pay per second at full feed. */
  refineryIncome: number;
  /** Dollars per unit of ore, after upgrades and multipliers. */
  oreValue: number;
  /** Ore per second the refinery consumes. */
  oreRate: number;
  /** Ore produced by one tap. */
  tapOre: number;
  /** Dollars one tap is eventually worth, once the ore is refined. */
  tapValue: number;
  oreCapacity: number;
  bonuses: LifeBonuses;
  /** Combined income multiplier from milestones and any live boost. */
  globalMultiplier: number;
  boostMultiplier: number;
  creditLine: number;
  creditFloor: number;
  /** What can actually be spent right now. */
  spendable: number;
}

export function creditLine(peakNetWorth: number): number {
  const climbed = Math.max(0, peakNetWorth - STARTING_BALANCE);
  return CREDIT_BASE + CREDIT_SHARE * climbed;
}

/** What was paid for every business owned, which is what it is carried at. */
export function businessAssets(state: PlayerState): number {
  let total = 0;
  for (const def of BUSINESSES) {
    const owned = ownedOf(state, def.id);
    if (owned > 0) total += bulkCost(def, 0, owned);
  }
  return total;
}

export function portfolioValue(state: PlayerState): number {
  let total = 0;
  const prices = pricesAt(state.marketSeed, state.marketTick);
  for (const [id, holding] of Object.entries(state.holdings)) {
    const price = prices.get(id);
    if (price === undefined) continue;
    total += holdingValue(holding, price);
  }
  return total;
}

export function derive(state: PlayerState, now = Date.now()): Derived {
  const bonuses = bonusesFrom(state.claimed);
  const boostMultiplier = state.boost && state.boost.endsAt > now ? state.boost.multiplier : 1;
  const globalMultiplier = bonuses.income * boostMultiplier;

  const assets = businessAssets(state) + portfolioValue(state);
  const netWorth = state.cash + assets;

  const oreValue =
    ORE_BASE_VALUE * Math.pow(REFINERY_GROWTH, state.refineryLevel - 1) * globalMultiplier;
  const oreRate = REFINERY_BASE_RATE * state.refineryLevel;
  const tapOre = state.tapLevel * bonuses.tap;

  let income = 0;
  for (const def of BUSINESSES) {
    if (!state.managers.includes(def.id)) continue;
    income += incomePerSecond(def, ownedOf(state, def.id), globalMultiplier, 1);
  }

  const line = creditLine(state.peakNetWorth);
  const floor = STARTING_BALANCE - line;

  return {
    netWorth,
    assets,
    income,
    refineryIncome: oreRate * oreValue,
    oreValue,
    oreRate,
    tapOre,
    tapValue: tapOre * oreValue,
    oreCapacity: ORE_CAPACITY_PER_LEVEL * state.refineryLevel * state.tapLevel,
    bonuses,
    globalMultiplier,
    boostMultiplier,
    creditLine: line,
    creditFloor: floor,
    spendable: Math.max(0, state.cash - floor),
  };
}

export function tapUpgradeCost(level: number): number {
  return TAP_UPGRADE_BASE * Math.pow(TAP_UPGRADE_GROWTH, level - 1);
}

export function refineryUpgradeCost(level: number): number {
  return REFINERY_UPGRADE_BASE * Math.pow(REFINERY_UPGRADE_GROWTH, level - 1);
}

// ------------------------------------------------------------------- events --

export type Notice =
  | { kind: 'cash'; amount: number; label: string }
  | { kind: 'info'; label: string }
  | { kind: 'milestone'; milestone: LifeMilestone };

export interface OfflineReport {
  seconds: number;
  earned: number;
  jobsFinished: number;
}

type Listener = () => void;

// -------------------------------------------------------------------- store --

export class Store {
  state: PlayerState = createNewSave(0);
  ready = false;
  offline: OfflineReport | null = null;

  /** Drained by the UI each frame; never grows unbounded. */
  private notices: Notice[] = [];
  private listeners = new Set<Listener>();
  private dirty = false;
  private rng = new Rng(0);
  private marketCarry = 0;
  private tradeCooldown = 0;
  private saveCooldown = 0;

  async boot(): Promise<void> {
    const { state, isNew } = await loadSave();
    this.state = state;
    this.rng = new Rng(state.rngSeed);
    if (!isNew) this.offline = this.catchUp();
    this.ready = true;
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    this.dirty = false;
    for (const listener of this.listeners) listener();
  }

  /**
   * The tick marks the world dirty rather than notifying, and the render loop
   * flushes at a fixed low rate. Sixty state-driven re-renders a second across
   * thirty-six businesses buys nothing a CSS transition cannot fake, and costs
   * a phone its battery.
   */
  flush(): void {
    if (this.dirty) this.emit();
  }

  /** Takes the queued notices and clears them. */
  drainNotices(): Notice[] {
    if (this.notices.length === 0) return [];
    const out = this.notices;
    this.notices = [];
    return out;
  }

  private notice(notice: Notice): void {
    // A backlog nobody has read is just memory; keep the tail.
    if (this.notices.length > 24) this.notices.shift();
    this.notices.push(notice);
  }

  private earn(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.state.cash += amount;
    if (this.state.cash + businessAssets(this.state) > this.state.peakNetWorth) {
      this.state.peakNetWorth = this.state.cash + businessAssets(this.state);
    }
  }

  /** True when the purchase went through. */
  private spend(cost: number): boolean {
    if (!Number.isFinite(cost) || cost < 0) return false;
    const floor = STARTING_BALANCE - creditLine(this.state.peakNetWorth);
    if (this.state.cash - cost < floor) return false;
    this.state.cash -= cost;
    return true;
  }

  canAfford(cost: number): boolean {
    const floor = STARTING_BALANCE - creditLine(this.state.peakNetWorth);
    return this.state.cash - cost >= floor;
  }

  // ------------------------------------------------------------------ tick --

  /**
   * Advances the world by `dt` seconds. Called from a rAF loop with the real
   * frame delta, and from the offline pass with a single large delta, so it has
   * to behave identically for a 16ms step and a four-hour one.
   */
  tick(dt: number, now = Date.now()): void {
    if (!this.ready || dt <= 0) return;
    const step = Math.min(dt, 6 * 3600);
    const d = derive(this.state, now);

    this.runRefinery(step, d);
    this.runBusinesses(step, d);
    this.runJob(now, d);
    this.runCards(now, d);
    this.runMarket(step, now);
    this.checkMilestones(d);

    if (this.state.boost && this.state.boost.endsAt <= now) this.state.boost = null;

    this.saveCooldown -= step;
    if (this.saveCooldown <= 0) {
      this.saveCooldown = 10;
      this.persist();
    }
    this.dirty = true;
  }

  private runRefinery(dt: number, d: Derived): void {
    if (this.state.ore <= 0) return;
    const refined = Math.min(this.state.ore, d.oreRate * dt);
    this.state.ore -= refined;
    this.earn(refined * d.oreValue);
  }

  private runBusinesses(dt: number, d: Derived): void {
    for (const def of BUSINESSES) {
      const owned = ownedOf(this.state, def.id);
      if (owned <= 0) continue;

      const managed = this.state.managers.includes(def.id);
      const progress = this.state.cycles[def.id] ?? 0;
      if (!managed && progress <= 0) continue;

      const advanced = progress + dt;
      if (advanced < def.cycleSeconds) {
        this.state.cycles[def.id] = advanced;
        continue;
      }

      const completed = Math.floor(advanced / def.cycleSeconds);
      const payout = cyclePayout(def, owned, d.globalMultiplier);

      if (managed) {
        this.earn(payout * completed);
        this.state.cycles[def.id] = advanced % def.cycleSeconds;
      } else {
        // A hand-run business does exactly one cycle and then waits.
        this.earn(payout);
        this.state.cycles[def.id] = 0;
      }
    }
  }

  private runJob(now: number, d: Derived): void {
    const active = this.state.job;
    if (!active || active.endsAt > now) return;

    const def = jobById(active.jobId);
    this.state.job = null;
    if (!def) return;

    const payout = def.payout * d.globalMultiplier;
    this.earn(payout);
    this.notice({ kind: 'cash', amount: payout, label: def.name });
  }

  private runCards(now: number, d: Derived): void {
    if (this.state.card) {
      if (this.state.card.expiresAt > now) return;
      this.state.card = null;
      this.scheduleCard(now, d);
      return;
    }
    if (now < this.state.nextCardAt) return;

    const card = drawCard(this.rng, d.income + d.refineryIncome * 0.25, d.tapValue);
    this.state.rngSeed = this.rng.seed;
    this.state.card = { ...card, expiresAt: now + CARD_LIFETIME * 1000 };
  }

  private scheduleCard(now: number, d: Derived): void {
    const interval = (90 / d.bonuses.cardRate) * 1000;
    this.state.nextCardAt = now + interval;
  }

  private runMarket(dt: number, now: number): void {
    this.marketCarry += dt;
    const ticks = Math.floor(this.marketCarry / TICK_SECONDS);
    if (ticks <= 0) return;

    this.marketCarry -= ticks * TICK_SECONDS;
    this.state.marketTick += ticks;

    if (!this.state.autoTrader) return;
    this.tradeCooldown -= ticks;
    if (this.tradeCooldown > 0) return;
    this.tradeCooldown = 6;
    this.autoTrade(now);
  }

  /**
   * The trading manager: takes profit on anything up a quarter, then puts a
   * small slice of spare cash into whatever fell hardest. Deliberately timid —
   * it exists so the market keeps moving while the player is elsewhere, not to
   * out-earn the businesses.
   */
  private autoTrade(now: number): void {
    const prices = pricesAt(this.state.marketSeed, this.state.marketTick);

    for (const [id, holding] of Object.entries(this.state.holdings)) {
      const price = prices.get(id);
      if (price === undefined || holding.shares <= 0) continue;
      if (unrealised(holding, price) < 0.25) continue;

      this.earn(holding.shares * price);
      delete this.state.holdings[id];
      this.notice({ kind: 'info', label: `Manager sold ${stockById(id)?.ticker ?? id}` });
    }

    if (this.state.cash <= 0) return;

    let worst: { id: string; change: number } | null = null;
    for (const stock of STOCKS) {
      const change = changeOver(this.state.marketSeed, this.state.marketTick, stock.id);
      if (!worst || change < worst.change) worst = { id: stock.id, change };
    }
    if (!worst || worst.change > -0.04) return;

    const budget = this.state.cash * 0.05;
    const price = prices.get(worst.id) ?? 0;
    if (price <= 0 || budget < price) return;

    const shares = Math.floor(budget / price);
    if (shares <= 0) return;

    this.state.cash -= shares * price;
    this.state.holdings[worst.id] = applyBuy(holdingOf(this.state, worst.id), shares, price);
    void now;
  }

  private checkMilestones(d: Derived): void {
    if (d.netWorth > this.state.peakNetWorth) this.state.peakNetWorth = d.netWorth;
  }

  /** Milestones reached but not yet acknowledged. */
  pendingMilestones(): LifeMilestone[] {
    return newlyReached(this.state.peakNetWorth, this.state.claimed);
  }

  // --------------------------------------------------------------- actions --

  /** One tap on the refinery. Returns the ore mined, for the floating number. */
  tap(): number {
    const d = derive(this.state);
    const mined = d.tapOre;
    this.state.ore = Math.min(d.oreCapacity, this.state.ore + mined);

    // With the buffer full the tap still pays, just straight through — nothing
    // a player does by hand should ever be worth literally nothing.
    if (this.state.ore >= d.oreCapacity) this.earn(mined * d.oreValue * 0.5);

    this.emit();
    return mined;
  }

  upgradeTap(): boolean {
    const cost = tapUpgradeCost(this.state.tapLevel);
    if (!this.spend(cost)) return false;
    this.state.tapLevel += 1;
    this.persist();
    this.emit();
    return true;
  }

  upgradeRefinery(): boolean {
    const cost = refineryUpgradeCost(this.state.refineryLevel);
    if (!this.spend(cost)) return false;
    this.state.refineryLevel += 1;
    this.persist();
    this.emit();
    return true;
  }

  startJob(jobId: string): boolean {
    if (this.state.job) return false;
    const def = jobById(jobId);
    if (!def) return false;

    const d = derive(this.state);
    const seconds = def.seconds / d.bonuses.jobSpeed;
    this.state.job = { jobId, endsAt: Date.now() + seconds * 1000 };
    this.emit();
    return true;
  }

  /** Buys `amount` units, or as many as the credit line allows for 'max'. */
  buyBusiness(id: string, amount: number | 'max'): number {
    const def = businessById(id);
    if (!def) return 0;

    const owned = ownedOf(this.state, id);
    const d = derive(this.state);
    const units =
      amount === 'max' ? affordableUnits(def, owned, d.spendable) : Math.max(0, Math.floor(amount));
    if (units <= 0) return 0;

    const cost = bulkCost(def, owned, units);
    if (!this.spend(cost)) return 0;

    this.state.businesses[id] = owned + units;
    this.persist();
    this.emit();
    return units;
  }

  hireManager(id: string): boolean {
    const def = businessById(id);
    if (!def || this.state.managers.includes(id)) return false;
    if (ownedOf(this.state, id) <= 0) return false;
    if (!this.spend(def.managerCost)) return false;

    this.state.managers.push(id);
    this.notice({ kind: 'info', label: `${def.name} runs itself now` });
    this.persist();
    this.emit();
    return true;
  }

  /** Starts one cycle by hand on a business without a manager. */
  runBusiness(id: string): boolean {
    const def = businessById(id);
    if (!def || ownedOf(this.state, id) <= 0) return false;
    if (this.state.managers.includes(id)) return false;
    if ((this.state.cycles[id] ?? 0) > 0) return false;

    this.state.cycles[id] = 0.0001;
    this.emit();
    return true;
  }

  takeCard(): void {
    const card = this.state.card;
    if (!card) return;

    const now = Date.now();
    const d = derive(this.state, now);
    this.state.card = null;
    this.scheduleCard(now, d);

    switch (card.kind) {
      case 'cash':
        this.earn(card.value);
        this.notice({ kind: 'cash', amount: card.value, label: card.title });
        break;

      case 'multiplier':
        this.state.boost = { multiplier: card.value, endsAt: now + card.seconds * 1000 };
        this.notice({ kind: 'info', label: `${card.title}: ×${card.value} for ${card.seconds}s` });
        break;

      case 'ore':
        this.state.ore = Math.min(d.oreCapacity * 4, this.state.ore + card.value * d.tapOre);
        this.notice({ kind: 'info', label: `${card.title}: the refinery is full` });
        break;

      case 'gamble': {
        const won = this.rng.chance(0.5);
        this.state.rngSeed = this.rng.seed;
        const amount = won ? card.value * 2 : 0;
        if (won) this.earn(amount);
        this.notice(
          won
            ? { kind: 'cash', amount, label: 'It paid off' }
            : { kind: 'info', label: 'It did not pay off' },
        );
        break;
      }

      default:
        this.earn(card.value);
    }

    this.persist();
    this.emit();
  }

  dismissCard(): void {
    if (!this.state.card) return;
    const now = Date.now();
    this.state.card = null;
    this.scheduleCard(now, derive(this.state, now));
    this.emit();
  }

  buyStock(id: string, shares: number): boolean {
    const def = stockById(id);
    if (!def || shares <= 0) return false;

    const price = priceOf(this.state.marketSeed, this.state.marketTick, id);
    const cost = price * shares;

    // Shares are bought with money, not credit — a broker does not lend.
    if (this.state.cash < cost) return false;

    this.state.cash -= cost;
    this.state.holdings[id] = applyBuy(holdingOf(this.state, id), shares, price);
    this.persist();
    this.emit();
    return true;
  }

  sellStock(id: string, shares: number): boolean {
    const holding = holdingOf(this.state, id);
    if (holding.shares <= 0) return false;

    const sold = Math.min(holding.shares, shares);
    const price = priceOf(this.state.marketSeed, this.state.marketTick, id);
    this.earn(sold * price);

    const left = applySell(holding, sold);
    if (left.shares <= 0) delete this.state.holdings[id];
    else this.state.holdings[id] = left;

    this.persist();
    this.emit();
    return true;
  }

  /** Shares of `id` buyable with a given share of cash on hand. */
  affordableShares(id: string, fraction = 1): number {
    const price = priceOf(this.state.marketSeed, this.state.marketTick, id);
    if (price <= 0 || this.state.cash <= 0) return 0;
    return Math.floor((this.state.cash * fraction) / price);
  }

  toggleAutoTrader(): void {
    this.state.autoTrader = !this.state.autoTrader;
    this.persist();
    this.emit();
  }

  claimMilestone(id: string): boolean {
    if (this.state.claimed.includes(id)) return false;
    const reached = newlyReached(this.state.peakNetWorth, this.state.claimed);
    const milestone = reached.find((m) => m.id === id);
    if (!milestone) return false;

    this.state.claimed.push(id);
    this.notice({ kind: 'milestone', milestone });
    this.persist();
    this.emit();
    return true;
  }

  /** The app is going away: flush the save so `lastSeenAt` is honest. */
  suspend(): void {
    this.persist();
  }

  /**
   * The app is back. A backgrounded tab stops receiving frames, so returning
   * from one is the same problem as returning from a cold start, and gets the
   * same answer.
   */
  resume(): void {
    if (!this.ready) return;
    const report = this.catchUp();
    if (report) this.offline = report;
    this.emit();
  }

  dismissOffline(): void {
    this.offline = null;
    this.emit();
  }

  reset(): void {
    wipeSave();
    this.state = createNewSave(this.state.marketSeed);
    this.rng = new Rng(this.state.rngSeed);
    this.offline = null;
    this.notices = [];
    this.persist();
    this.emit();
  }

  persist(): void {
    if (!this.ready) return;
    saveNow(this.state);
  }

  // --------------------------------------------------------------- offline --

  /**
   * Credits time spent away. Managed businesses pay at a reduced rate, an
   * in-flight job finishes, and the market walks the full distance — the market
   * is derived from a tick counter, so catching it up is free.
   */
  private catchUp(now = Date.now()): OfflineReport | null {
    const elapsed = Math.max(0, (now - this.state.lastSeenAt) / 1000);
    if (elapsed < 60) {
      this.state.marketTick += Math.floor(elapsed / TICK_SECONDS);
      return null;
    }

    const d = derive(this.state, now);
    const capped = Math.min(elapsed, d.bonuses.offlineHours * 3600);
    const before = this.state.cash;

    this.earn(d.income * capped * OFFLINE_EFFICIENCY);

    const pendingOre = Math.min(this.state.ore, d.oreRate * capped);
    this.state.ore -= pendingOre;
    this.earn(pendingOre * d.oreValue);

    let jobsFinished = 0;
    if (this.state.job && this.state.job.endsAt <= now) {
      const def = jobById(this.state.job.jobId);
      if (def) {
        this.earn(def.payout * d.globalMultiplier);
        jobsFinished = 1;
      }
      this.state.job = null;
    }

    this.state.marketTick += Math.floor(elapsed / TICK_SECONDS);
    // A card offered before the app closed is long gone.
    this.state.card = null;
    this.state.nextCardAt = now + 15_000;
    this.state.boost = null;

    return { seconds: capped, earned: this.state.cash - before, jobsFinished };
  }
}

export const store = new Store();

/** Cost of the next unit, exported for the UI so it does not reach into rules. */
export function nextUnitCost(id: string, owned: number): number {
  const def = businessById(id);
  return def ? unitCost(def, owned) : 0;
}
