import { describe, expect, it } from 'vitest';

import { Rng } from '../src/game/rng';
import { sanitise } from '../src/game/save';
import { SAVE_VERSION, createNewSave } from '../src/game/state';
import {
  STOCKS,
  applyBuy,
  applySell,
  changeOver,
  priceOf,
  seriesFor,
  unrealised,
} from '../src/game/stocks';

const first = STOCKS[0]!;

describe('the walk', () => {
  it('gives the same price for the same seed and tick', () => {
    const a = priceOf(7, 500, first.id);
    const b = priceOf(7, 500, first.id);
    expect(a).toBe(b);
  });

  it('reaches the same price whether walked in one jump or many', () => {
    const direct = priceOf(11, 800, first.id);

    // Force a cold cache, then walk there in steps.
    priceOf(99, 0, first.id);
    let stepped = 0;
    for (let tick = 0; tick <= 800; tick += 50) stepped = priceOf(11, tick, first.id);

    expect(stepped).toBeCloseTo(direct, 6);
  });

  it('never lets a price reach zero', () => {
    for (const stock of STOCKS) {
      const price = priceOf(3, 6_000, stock.id);
      expect(price).toBeGreaterThanOrEqual(stock.basePrice * 0.05 - 1e-9);
      expect(Number.isFinite(price)).toBe(true);
    }
  });

  it('returns a series that ends at the current price', () => {
    const series = seriesFor(5, 300, first.id, 24);
    expect(series.length).toBeGreaterThan(1);
    expect(series[series.length - 1]).toBeCloseTo(priceOf(5, 300, first.id), 6);
  });

  it('reports a change consistent with its own series', () => {
    const series = seriesFor(5, 300, first.id, 13);
    const change = changeOver(5, 300, first.id, 12);
    const expected = ((series[series.length - 1] ?? 0) - (series[0] ?? 1)) / (series[0] ?? 1);
    expect(change).toBeCloseTo(expected, 9);
  });
});

describe('holdings', () => {
  it('averages the cost across buys', () => {
    let holding = applyBuy({ shares: 0, avgCost: 0 }, 10, 100);
    holding = applyBuy(holding, 10, 200);
    expect(holding.shares).toBe(20);
    expect(holding.avgCost).toBe(150);
  });

  it('leaves the average alone when selling', () => {
    const holding = applySell({ shares: 20, avgCost: 150 }, 5);
    expect(holding).toEqual({ shares: 15, avgCost: 150 });
    expect(applySell(holding, 99)).toEqual({ shares: 0, avgCost: 0 });
  });

  it('reports gain against what was paid', () => {
    expect(unrealised({ shares: 4, avgCost: 50 }, 75)).toBeCloseTo(0.5, 9);
    expect(unrealised({ shares: 0, avgCost: 0 }, 75)).toBe(0);
  });
});

describe('the random source', () => {
  it('repeats exactly from a seed', () => {
    const a = new Rng(1234);
    const b = new Rng(1234);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });

  it('produces a distribution with roughly the right shape', () => {
    const rng = new Rng(99);
    let sum = 0;
    let squares = 0;
    const n = 20_000;

    for (let i = 0; i < n; i += 1) {
      const value = rng.normal();
      sum += value;
      squares += value * value;
    }

    expect(Math.abs(sum / n)).toBeLessThan(0.05);
    expect(Math.abs(Math.sqrt(squares / n) - 1)).toBeLessThan(0.05);
  });
});

describe('save sanitising', () => {
  it('accepts what it just wrote', () => {
    const save = createNewSave(42);
    const restored = sanitise(JSON.parse(JSON.stringify(save)));
    expect(restored?.cash).toBe(save.cash);
    expect(restored?.marketSeed).toBe(42);
  });

  it('rejects anything that is not a save of this version', () => {
    expect(sanitise(null)).toBeNull();
    expect(sanitise('nope')).toBeNull();
    expect(sanitise({ version: SAVE_VERSION + 1 })).toBeNull();
  });

  it('drops ids the game no longer knows', () => {
    const save = createNewSave(1) as unknown as Record<string, unknown>;
    save['businesses'] = { cans: 5, ghost: 99 };
    save['managers'] = ['cans', 'ghost'];
    save['claimed'] = ['dog', 'ghost'];
    save['holdings'] = { [first.id]: { shares: 3, avgCost: 10 }, ghost: { shares: 1, avgCost: 1 } };

    const restored = sanitise(save);
    expect(restored?.businesses).toEqual({ cans: 5 });
    expect(restored?.managers).toEqual(['cans']);
    expect(restored?.claimed).toEqual(['dog']);
    expect(Object.keys(restored?.holdings ?? {})).toEqual([first.id]);
  });

  it('clamps a tampered save instead of trusting it', () => {
    const save = createNewSave(1) as unknown as Record<string, unknown>;
    save['ore'] = -50;
    save['tapLevel'] = 0;
    save['cash'] = Number.NaN;
    save['businesses'] = { cans: -3 };

    const restored = sanitise(save);
    expect(restored?.ore).toBe(0);
    expect(restored?.tapLevel).toBe(1);
    expect(restored?.cash).toBe(0);
    expect(restored?.businesses).toEqual({});
  });

  it('keeps a negative balance, because that is the whole first act', () => {
    const save = createNewSave(1) as unknown as Record<string, unknown>;
    save['cash'] = -1_000_000;
    expect(sanitise(save)?.cash).toBe(-1_000_000);
  });
});
