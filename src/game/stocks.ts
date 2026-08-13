import { Rng } from './rng';

/**
 * The market — twelve parody tickers on a random walk.
 *
 * Prices are recomputed from a seed and a tick counter rather than stored as a
 * series, so a save holds one integer instead of a price history, and the walk
 * resumes identically after a reload. Offline time advances the same walk, so
 * coming back to a moved market costs nothing to simulate.
 */

export interface StockDef {
  id: string;
  ticker: string;
  /** Opening price the walk starts from. */
  basePrice: number;
  /** Standard deviation of a single tick's return. */
  volatility: number;
  /** Gentle per-tick drift; positive names trend up over a long horizon. */
  drift: number;
  sector: string;
}

export const STOCKS: readonly StockDef[] = [
  s('grnd', 'XOM', 42_000, 0.018, 0.0006, 'transport'),
  s('bzzt', 'BIA', 18_000, 0.032, 0.0009, 'consumer'),
  s('cldy', 'MAY', 130_000, 0.024, 0.0011, 'tech'),
  s('mnch', 'PHO', 27_000, 0.014, 0.0004, 'consumer'),
  s('drll', 'DAU', 88_000, 0.028, 0.0002, 'energy'),
  s('bnkr', 'HEO', 64_000, 0.010, 0.0003, 'finance'),
  s('hype', 'HOT', 9_000, 0.055, 0.0012, 'media'),
  s('rustc', 'SAT', 51_000, 0.020, -0.0001, 'industrial'),
  s('zoom2', 'ZOM', 210_000, 0.026, 0.0008, 'health'),
  s('gigl', 'TIM', 340_000, 0.019, 0.0010, 'tech'),
  s('moon', 'MTR', 3_000, 0.075, 0.0015, 'speculative'),
  s('slug', 'OSN', 76_000, 0.012, 0.0001, 'transport'),
];

function s(
  id: string,
  ticker: string,
  basePrice: number,
  volatility: number,
  drift: number,
  sector: string,
): StockDef {
  return { id, ticker, basePrice, volatility, drift, sector };
}

export function stockById(id: string): StockDef | null {
  return STOCKS.find((stock) => stock.id === id) ?? null;
}

/** Seconds of real time per market tick. */
export const TICK_SECONDS = 5;

const INDEX_OF = new Map(STOCKS.map((stock, index) => [stock.id, index]));

/** Ticks of recent prices kept for sparklines and the movement column. */
const HISTORY = 72;

/**
 * The walk is recomputed rather than stored, so this caches the last run along
 * with a short tail of it. The tail matters: a sparkline asking for the last
 * two dozen ticks would otherwise have to replay the entire walk from a bounded
 * start on every render, twelve times over.
 */
interface PriceCache {
  seed: number;
  tick: number;
  prices: Map<string, number>;
  /** Oldest first, one row per tick, prices in `STOCKS` order. */
  history: number[][];
}

let cache: PriceCache | null = null;

function snapshot(prices: Map<string, number>): number[] {
  return STOCKS.map((stock) => prices.get(stock.id) ?? stock.basePrice);
}

/**
 * Price of every stock at `tick`, walked from `seed`.
 *
 * Recomputing from zero every call would be O(tick) and grow without bound, so
 * the last result is kept and only the delta is walked. A save that jumps
 * forward — offline, or a different device — falls back to a bounded replay.
 */
export function pricesAt(seed: number, tick: number): Map<string, number> {
  const target = Math.max(0, Math.floor(tick));

  if (cache && cache.seed === seed && cache.tick <= target) {
    walk(cache.prices, seed, cache.tick, target, cache.history);
    cache.tick = target;
    return cache.prices;
  }

  const prices = new Map<string, number>();
  for (const stock of STOCKS) prices.set(stock.id, stock.basePrice);

  const history: number[][] = [snapshot(prices)];

  // Replaying from zero is capped: past the cap the walk is statistically
  // indistinguishable anyway, and an unbounded loop would stall a cold start.
  const from = Math.max(0, target - 20_000);
  walk(prices, seed, from, target, history);

  cache = { seed, tick: target, prices, history };
  return prices;
}

function walk(
  prices: Map<string, number>,
  seed: number,
  from: number,
  to: number,
  history: number[][],
): void {
  for (let tick = from; tick < to; tick += 1) {
    // Each tick gets its own stream, so the walk is reproducible from any
    // starting point rather than depending on how it was reached.
    const rng = new Rng((seed ^ (tick * 2654435761)) >>> 0);

    for (const stock of STOCKS) {
      const current = prices.get(stock.id) ?? stock.basePrice;
      const move = stock.drift + rng.normal() * stock.volatility;
      // Multiplicative walk with a floor: a price may crater but never dies,
      // because a dead ticker is just a dead row in the list.
      const next = Math.max(stock.basePrice * 0.05, current * (1 + move));
      prices.set(stock.id, next);
    }

    history.push(snapshot(prices));
    if (history.length > HISTORY) history.shift();
  }
}

/** Price now, given the save's seed and the elapsed market ticks. */
export function priceOf(seed: number, tick: number, id: string): number {
  return pricesAt(seed, tick).get(id) ?? stockById(id)?.basePrice ?? 1;
}

/**
 * The last `points` prices for one stock, oldest first. Shorter than requested
 * early on, when the walk has not run that long yet.
 */
export function seriesFor(seed: number, tick: number, id: string, points = 24): number[] {
  pricesAt(seed, tick);
  const index = INDEX_OF.get(id);
  if (!cache || index === undefined) return [];

  const rows = cache.history.slice(Math.max(0, cache.history.length - points));
  return rows.map((row) => row[index] ?? 0);
}

/** Fractional change over the last `window` ticks, for the movement column. */
export function changeOver(seed: number, tick: number, id: string, window = 12): number {
  const series = seriesFor(seed, tick, id, window + 1);
  const then = series[0];
  const now = series[series.length - 1];

  if (then === undefined || now === undefined || then === 0) return 0;
  return (now - then) / then;
}

export interface Holding {
  shares: number;
  /** Average price paid, for the profit-and-loss column. */
  avgCost: number;
}

/** Value of a holding at the current price. */
export function holdingValue(holding: Holding, price: number): number {
  return holding.shares * price;
}

/** Unrealised gain as a fraction of what was paid. */
export function unrealised(holding: Holding, price: number): number {
  if (holding.shares <= 0 || holding.avgCost <= 0) return 0;
  return (price - holding.avgCost) / holding.avgCost;
}

/** Records a buy, folding it into the running average cost. */
export function applyBuy(holding: Holding, shares: number, price: number): Holding {
  const total = holding.shares + shares;
  if (total <= 0) return { shares: 0, avgCost: 0 };

  const cost = holding.shares * holding.avgCost + shares * price;
  return { shares: total, avgCost: cost / total };
}

/** Records a sell. Average cost is unchanged by selling. */
export function applySell(holding: Holding, shares: number): Holding {
  const left = Math.max(0, holding.shares - shares);
  return left === 0 ? { shares: 0, avgCost: 0 } : { shares: left, avgCost: holding.avgCost };
}
