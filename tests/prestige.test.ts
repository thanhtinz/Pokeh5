import { describe, expect, it } from 'vitest';

import { achievementMultiplier } from '../src/game/achievements';
import { BUSINESSES } from '../src/game/businesses';
import { CYCLE, DAY, dailyReward, dailyState } from '../src/game/daily';
import { TIERS, upgradeMultiplier } from '../src/game/upgrades';
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

describe('điểm danh', () => {
  it('ngày đầu tiên là có thưởng ngay', () => {
    const state = dailyState(0, 0, Date.now());
    expect(state.available).toBe(true);
    expect(state.day).toBe(0);
  });

  it('nhận rồi thì hôm nay hết, mai mới có lại', () => {
    const now = new Date('2026-08-13T20:00:00').getTime();
    expect(dailyState(now - 3_600_000, 3, now).available).toBe(false);

    const tomorrow = new Date('2026-08-14T08:00:00').getTime();
    expect(dailyState(now, 3, tomorrow).available).toBe(true);
    expect(dailyState(now, 3, tomorrow).streak).toBe(3);
  });

  // So theo ngày lịch, không phải "đủ 24 tiếng": mở lúc 23h rồi mở lại 8h sáng
  // hôm sau là hai ngày, dù cách nhau có chín tiếng.
  it('tính theo ngày lịch chứ không phải đủ 24 tiếng', () => {
    const late = new Date('2026-08-13T23:30:00').getTime();
    const early = new Date('2026-08-14T08:00:00').getTime();
    expect(dailyState(late, 1, early).available).toBe(true);
  });

  it('nghỉ quá hai ngày là chuỗi về đầu', () => {
    const now = Date.now();
    expect(dailyState(now - 3 * DAY, 6, now).streak).toBe(0);
    expect(dailyState(now - 1.5 * DAY, 6, now).streak).toBe(6);
  });

  it('thưởng lớn dần và luôn có sàn', () => {
    let previous = 0;
    for (let day = 0; day < CYCLE; day += 1) {
      const reward = dailyReward(day, 1_000_000, 0);
      expect(reward).toBeGreaterThan(previous);
      previous = reward;
    }
    expect(dailyReward(0, 0, 0)).toBeGreaterThan(0);
  });
});

describe('nâng cấp cơ sở', () => {
  it('chỉ mở khi đủ số lượng, và mua xong thì nhân đúng', () => {
    const store = ready(0);
    store.state.cash = 1e15;
    store.state.businesses[cans.id] = 10;

    // Bậc đầu cần 25 đơn vị.
    expect(store.buyUpgrade(cans.id)).toBe(false);

    store.state.businesses[cans.id] = 25;
    expect(store.buyUpgrade(cans.id)).toBe(true);
    expect(store.state.upgrades[cans.id]).toBe(1);
    expect(upgradeMultiplier(1)).toBe(2);
  });

  it('không mua quá năm bậc', () => {
    const store = ready(0);
    store.state.cash = 1e18;
    store.state.businesses[cans.id] = 1000;

    for (let i = 0; i < TIERS.length; i += 1) expect(store.buyUpgrade(cans.id)).toBe(true);
    expect(store.buyUpgrade(cans.id)).toBe(false);
    expect(store.state.upgrades[cans.id]).toBe(TIERS.length);
  });
});

describe('đổi uy tín', () => {
  it('tiêu uy tín không làm tụt hệ số thu nhập', () => {
    const store = ready(0);
    store.state.reputation = 100;
    store.state.reputationTotal = 100;

    const before = derive(store.state).reputationMultiplier;
    expect(store.buyPerk('tap')).toBe(true);

    expect(store.state.reputation).toBeLessThan(100);
    expect(store.state.reputationTotal).toBe(100);
    expect(derive(store.state).reputationMultiplier).toBe(before);
  });

  it('không mua nổi thì không mua', () => {
    const store = ready(0);
    store.state.reputation = 0;
    expect(store.buyPerk('tap')).toBe(false);
    expect(store.state.perks['tap']).toBeUndefined();
  });

  it('đặc quyền sống qua lần làm lại', () => {
    const store = ready(1e13);
    store.state.reputation = 50;
    store.state.reputationTotal = 50;
    store.buyPerk('seed');
    const perks = { ...store.state.perks };

    store.prestige();
    expect(store.state.perks).toEqual(perks);
    // Vốn mồi làm lượt sau không bắt đầu đúng ở vạch âm một tỷ.
    expect(store.state.cash).toBeGreaterThan(STARTING_BALANCE);
  });
});

describe('thành tựu', () => {
  it('bám theo số đếm cộng dồn nên sống qua làm lại', () => {
    const store = ready(1e13);
    store.state.stats.taps = 5_000;
    store.state.achievements.push('tap1', 'tap2', 'tap3');

    store.prestige();
    expect(store.state.stats.taps).toBe(5_000);
    expect(store.state.achievements).toContain('tap3');
  });

  it('bỏ qua id lạ, bản lưu cũ không thổi phồng được hệ số', () => {
    expect(achievementMultiplier(['tap1'])).toBeGreaterThan(1);
    expect(achievementMultiplier(['khong-co-that'])).toBe(1);
  });
});
