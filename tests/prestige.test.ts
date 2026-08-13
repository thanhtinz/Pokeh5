import { describe, expect, it } from 'vitest';

import { BUSINESSES } from '../src/game/businesses';
import {
  PRESTIGE_UNLOCK,
  canPrestige,
  pendingReputation,
  reputationFrom,
  reputationMultiplier,
} from '../src/game/prestige';
import { STARTING_BALANCE, createNewSave } from '../src/game/state';
import { Store, derive } from '../src/game/store';

const cans = BUSINESSES[0]!;

function ready(peak = 0): Store {
  const store = new Store();
  store.state = createNewSave(1);
  store.ready = true;
  store.state.peakNetWorth = peak;
  store.state.bestNetWorth = peak;
  return store;
}

describe('uy tín', () => {
  it('chưa qua ngưỡng thì không có gì', () => {
    expect(reputationFrom(STARTING_BALANCE)).toBe(0);
    expect(reputationFrom(0)).toBe(0);
    expect(reputationFrom(PRESTIGE_UNLOCK - 1)).toBe(0);
    expect(reputationFrom(PRESTIGE_UNLOCK)).toBeGreaterThan(0);
  });

  it('leo càng cao càng nhiều, và không bao giờ tụt', () => {
    let previous = 0;
    for (const peak of [1e11, 1e12, 1e13, 1e15, 1e18]) {
      const rep = reputationFrom(peak);
      expect(rep).toBeGreaterThanOrEqual(previous);
      previous = rep;
    }
  });

  it('chỉ trả phần chênh, nên làm lại liên tục ở mức thấp không ra thêm', () => {
    const total = reputationFrom(1e12);
    expect(pendingReputation(1e12, 0)).toBe(total);
    expect(pendingReputation(1e12, total)).toBe(0);
    expect(pendingReputation(1e11, total)).toBe(0);
  });

  it('mỗi điểm cộng đúng 2% vào thu nhập', () => {
    expect(reputationMultiplier(0)).toBe(1);
    expect(reputationMultiplier(50)).toBeCloseTo(2, 9);
  });
});

describe('làm lại', () => {
  it('không cho bấm khi chưa đủ', () => {
    const store = ready(1e10);
    expect(canPrestige(store.state.peakNetWorth, store.state.reputation)).toBe(false);
    expect(store.prestige()).toBe(0);
    expect(store.state.runs).toBe(0);
  });

  it('bán sạch thứ mua được và giữ lại thứ đã chuộc', () => {
    const store = ready(1e13);
    store.state.businesses[cans.id] = 40;
    store.state.managers.push(cans.id);
    store.state.holdings['grnd'] = { shares: 10, avgCost: 42_000 };
    store.state.tapLevel = 9;
    store.state.refineryLevel = 7;
    store.state.claimed.push('phone', 'dog', 'zero');
    store.state.cash = 5e12;

    const gain = store.prestige();
    expect(gain).toBe(reputationFrom(1e13));

    // Mất: mọi thứ mua được bằng tiền.
    expect(store.state.businesses).toEqual({});
    expect(store.state.managers).toEqual([]);
    expect(store.state.holdings).toEqual({});
    expect(store.state.tapLevel).toBe(1);
    expect(store.state.refineryLevel).toBe(1);
    expect(store.state.cash).toBe(STARTING_BALANCE);
    expect(store.state.peakNetWorth).toBe(STARTING_BALANCE);

    // Ở lại: uy tín, số lần, kỷ lục, và những gì đã chuộc.
    expect(store.state.reputation).toBe(gain);
    expect(store.state.runs).toBe(1);
    expect(store.state.bestNetWorth).toBe(1e13);
    expect(store.state.claimed).toEqual(['phone', 'dog', 'zero']);
  });

  it('uy tín nhân vào thu nhập của lượt sau', () => {
    const store = ready(1e13);
    store.prestige();

    const derived = derive(store.state);
    expect(derived.reputationMultiplier).toBeCloseTo(
      reputationMultiplier(store.state.reputation),
      9,
    );
    expect(derived.globalMultiplier).toBeGreaterThan(1);
  });

  it('lần làm lại thứ hai chỉ ăn phần leo thêm được', () => {
    const store = ready(1e13);
    const first = store.prestige();

    store.state.peakNetWorth = 4e13;
    const second = store.prestige();

    expect(second).toBe(reputationFrom(4e13) - first);
    expect(store.state.reputation).toBe(reputationFrom(4e13));
    expect(store.state.runs).toBe(2);
  });
});
