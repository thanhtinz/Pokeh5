import { describe, expect, it } from 'vitest';

import {
  BUSINESSES,
  affordableUnits,
  bulkCost,
  cyclePayout,
  milestoneMultiplier,
  unitCost,
} from '../src/game/businesses';
import { ACHIEVEMENTS } from '../src/game/achievements';
import { bonusesFrom, newlyReached } from '../src/game/life';
import { RIVALS } from '../src/game/rivals';
import { STARTING_BALANCE, createNewSave } from '../src/game/state';
import { Store, businessAssets, creditLine, derive } from '../src/game/store';

const cans = BUSINESSES[0]!;

describe('cost curve', () => {
  it('matches a loop, which is what the closed form replaces', () => {
    let looped = 0;
    for (let i = 0; i < 40; i += 1) looped += unitCost(cans, 7 + i);

    expect(bulkCost(cans, 7, 40)).toBeCloseTo(looped, 4);
  });

  it('never sells more than the budget covers', () => {
    for (const budget of [0, 3, 4, 100, 5_000, 1e9, 1e30]) {
      const units = affordableUnits(cans, 0, budget);
      expect(bulkCost(cans, 0, units)).toBeLessThanOrEqual(budget + 1e-6);
      expect(bulkCost(cans, 0, units + 1)).toBeGreaterThan(budget);
    }
  });

  it('doubles the payout at every milestone', () => {
    expect(milestoneMultiplier(9)).toBe(1);
    expect(milestoneMultiplier(10)).toBe(2);
    expect(milestoneMultiplier(25)).toBe(4);
    expect(milestoneMultiplier(1000)).toBe(1024);
  });
});

describe('the credit line', () => {
  it('opens small and widens only with progress actually made', () => {
    expect(creditLine(STARTING_BALANCE)).toBe(2_000_000);
    expect(creditLine(0)).toBeGreaterThan(creditLine(STARTING_BALANCE));
  });

  it('leaves net worth untouched by a purchase, so borrowing cannot spiral', () => {
    const store = new Store();
    store.state = createNewSave(1);
    store.ready = true;

    const before = derive(store.state).netWorth;
    expect(before).toBe(STARTING_BALANCE);

    const bought = store.buyBusiness(cans.id, 10);
    expect(bought).toBe(10);

    const after = derive(store.state).netWorth;
    expect(after).toBeCloseTo(before, 6);
    expect(store.state.cash).toBeLessThan(STARTING_BALANCE);
    expect(businessAssets(store.state)).toBeCloseTo(STARTING_BALANCE - store.state.cash, 6);
  });

  it('refuses a purchase past the floor', () => {
    const store = new Store();
    store.state = createNewSave(1);
    store.ready = true;

    // Hạn mức mở màn là hai triệu; một tỷ tiền lon thì không có cửa.
    expect(store.buyBusiness(cans.id, 'max')).toBeGreaterThan(0);
    expect(store.canAfford(1_000_000_000)).toBe(false);
  });
});

describe('the tick', () => {
  it('pays a managed business the same over one step as over many', () => {
    function run(steps: number): { cash: number; cycle: number } {
      const store = new Store();
      store.state = createNewSave(1);
      store.ready = true;
      store.state.businesses[cans.id] = 5;
      store.state.managers.push(cans.id);
      store.state.cash = 0;
      // Thành tựu mở khoá giữa chừng sẽ đổi hệ số nhân ngay trong cửa sổ đang
      // đo, mà cái cần đo ở đây là phép tính trả tiền có phụ thuộc độ dài bước
      // hay không. Ghi nhận sẵn hết để hệ số đứng yên.
      store.state.achievements = ACHIEVEMENTS.map((achievement) => achievement.id);

      const cycle = cyclePayout(cans, 5, derive(store.state).globalMultiplier);
      const now = Date.now();
      for (let i = 0; i < steps; i += 1) store.tick(60 / steps, now);
      return { cash: store.state.cash, cycle };
    }

    const once = run(1);
    const many = run(600);

    // A cycle boundary can land inside the last step either way, so this is
    // "within one cycle's payout", not "identical" — and the cycle has to be
    // priced with the same multiplier the run itself used.
    expect(Math.abs(once.cash - many.cash)).toBeLessThanOrEqual(once.cycle);
    expect(once.cash).toBeGreaterThan(0);
  });

  it('runs a hand-started business exactly once', () => {
    const store = new Store();
    store.state = createNewSave(1);
    store.ready = true;
    store.state.businesses[cans.id] = 1;
    store.state.cash = 0;
    // Số dư bằng không là đã trên đầu sáu người đầu bảng, và tiền vượt mặt sẽ
    // rơi vào đúng cái tick đang đo. Bài này không nói về bảng xếp hạng.
    store.state.beaten = RIVALS.map((rival) => rival.id);

    store.tick(10, Date.now());
    expect(store.state.cash).toBe(0);

    store.runBusiness(cans.id);
    store.tick(10, Date.now());
    const paid = store.state.cash;
    expect(paid).toBeGreaterThan(0);

    store.tick(10, Date.now());
    expect(store.state.cash).toBe(paid);
  });

  it('mines ore on a tap and refines it on the next tick', () => {
    const store = new Store();
    store.state = createNewSave(1);
    store.ready = true;

    const mined = store.tap();
    expect(mined).toBeGreaterThan(0);
    expect(store.state.ore).toBe(mined);

    store.tick(5, Date.now());
    expect(store.state.ore).toBe(0);
    expect(store.state.cash).toBeGreaterThan(STARTING_BALANCE);
  });
});

describe('life milestones', () => {
  it('only offers what the peak has actually reached', () => {
    expect(newlyReached(STARTING_BALANCE, [])).toHaveLength(0);
    expect(newlyReached(-900_000_000, []).map((m) => m.id)).toEqual(['phone']);
    expect(newlyReached(-850_000_000, []).map((m) => m.id)).toEqual(['phone', 'dog']);
    expect(newlyReached(-850_000_000, ['phone']).map((m) => m.id)).toEqual(['dog']);
  });

  it('folds claimed bonuses into one set of multipliers', () => {
    const none = bonusesFrom([]);
    expect(none.income).toBe(1);
    expect(none.offlineHours).toBe(2);

    const some = bonusesFrom(['dog', 'room', 'mother']);
    expect(some.tap).toBe(1.5);
    expect(some.income).toBe(1.5);
    expect(some.offlineHours).toBe(6);
  });

  it('ignores an id that no longer exists', () => {
    expect(bonusesFrom(['nonsense']).income).toBe(1);
  });
});
