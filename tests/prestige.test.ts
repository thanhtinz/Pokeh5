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
import {
  ALWAYS_AVAILABLE,
  QUESTS_PER_DAY,
  QUEST_BONUS_REPUTATION,
  questState,
  questsFor,
} from '../src/game/quests';
import { RIVALS, passedRivals, rankOf, rivalState } from '../src/game/rivals';
import { sanitise } from '../src/game/save';
import {
  ROOT_BONUS,
  ROOT_TIERS,
  districtUnits,
  rootMultiplier,
  rootTier,
  totalRootTiers,
} from '../src/game/roots';
import { STARTING_BALANCE, createNewSave } from '../src/game/state';
import { Store, derive, metricsOf } from '../src/game/store';

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
    expect(canPrestige(store.state.peakNetWorth, store.state.reputationTotal)).toBe(false);
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

describe('cắm rễ', () => {
  it('đếm suất của cả khu, không phải của một cơ sở', () => {
    const skidrow = BUSINESSES.filter((def) => def.district === 'skidrow');
    const spread = Object.fromEntries(skidrow.slice(0, 3).map((def) => [def.id, 20]));
    expect(districtUnits(spread, 'skidrow')).toBe(60);
    expect(rootTier(districtUnits(spread, 'skidrow'))).toBe(1);

    // Cùng sáu chục suất, dồn hết vào một cơ sở thì vẫn đúng một bậc.
    expect(rootTier(districtUnits({ [skidrow[0]!.id]: 60 }, 'skidrow'))).toBe(1);
  });

  it('bậc của khu cũ vẫn cộng vào thu nhập toàn cục', () => {
    const store = ready(0);
    const before = derive(store.state).globalMultiplier;

    // Gom đủ mốc đầu ở đúng cái khu rẻ nhất, nơi thu nhập gần như bằng không.
    store.state.businesses[cans.id] = ROOT_TIERS[0]!;
    const after = derive(store.state);

    expect(after.rootTiers).toBe(1);
    expect(after.globalMultiplier).toBeCloseTo(before * (1 + ROOT_BONUS), 9);
  });

  it('sáu khu kín bậc thì cộng đúng ba mươi sáu lần', () => {
    const full: Record<string, number> = {};
    for (const def of BUSINESSES) full[def.id] = ROOT_TIERS[ROOT_TIERS.length - 1]!;

    expect(totalRootTiers(full)).toBe(6 * ROOT_TIERS.length);
    expect(rootMultiplier(full)).toBeCloseTo(1 + ROOT_BONUS * 6 * ROOT_TIERS.length, 9);
  });

  it('bán sạch cơ ngơi là mất luôn bậc — nó bám vào suất đang có', () => {
    const store = ready(1e13);
    store.state.businesses[cans.id] = ROOT_TIERS[1]!;
    expect(derive(store.state).rootTiers).toBe(2);

    store.prestige();
    expect(derive(store.state).rootTiers).toBe(0);
  });
});

const EVERY_METRIC = ['taps', 'cards', 'jobs', 'trades', 'units', 'upgrades'] as const;

describe('việc trong ngày', () => {
  it('cùng một ngày, cùng phạm vi thì ra cùng một bộ; ngày khác thì khác', () => {
    const ids = (day: number) => questsFor(day, EVERY_METRIC).map((quest) => quest.id);
    expect(ids(19_000)).toEqual(ids(19_000));

    const days = new Set(
      Array.from({ length: 30 }, (_, index) => ids(19_000 + index).join(',')),
    );
    expect(days.size).toBeGreaterThan(1);
  });

  it('ba việc, và không việc nào trùng số đếm với việc nào', () => {
    for (let day = 19_000; day < 19_100; day += 1) {
      const quests = questsFor(day, EVERY_METRIC);
      expect(quests).toHaveLength(QUESTS_PER_DAY);
      expect(new Set(quests.map((quest) => quest.metric)).size).toBe(QUESTS_PER_DAY);
    }
  });

  // Ván mới còn âm một tỷ: chưa có tiền mặt để đặt lệnh, chưa cơ sở nào đủ suất
  // để nâng cấp. Giao hai đề đó vào ngày đầu là giao việc không làm được.
  it('không giao đề mà ván mới chưa với tới', () => {
    for (let day = 19_000; day < 19_100; day += 1) {
      const metrics = questsFor(day, ALWAYS_AVAILABLE).map((quest) => quest.metric);
      expect(metrics).not.toContain('trades');
      expect(metrics).not.toContain('upgrades');
    }
  });

  it('bộ của ván mới không dính đề sàn hay đề nâng cấp', () => {
    const store = ready(0);
    store.tick(0.1);

    for (const quest of derive(store.state).quests.quests) {
      expect(['trades', 'upgrades']).not.toContain(quest.def.metric);
    }
  });

  it('đề đã rút thì giữ nguyên, kể cả khi giữa ngày mở thêm được sàn', () => {
    const store = ready(0);
    store.tick(0.1);
    const rolled = [...store.state.questIds];

    store.state.cash = 1e12;
    store.tick(0.1);
    expect(store.state.questIds).toEqual(rolled);
  });

  it('tiến độ tính từ mốc lúc sang ngày, không phải từ đầu ván', () => {
    const store = ready(0);
    store.state.stats.taps = 10_000;
    store.tick(0.1);

    // Mốc vừa chụp bằng số đếm hiện tại, nên hôm nay vẫn bắt đầu từ con số không.
    for (const quest of derive(store.state).quests.quests) expect(quest.done).toBe(0);
    expect(store.state.questBase['taps']).toBe(10_000);
  });

  it('thiếu mốc thì coi như bắt đầu từ không, chứ không xong sẵn', () => {
    const metrics = metricsOf(createNewSave(1));
    metrics.taps = 9_999;
    const ids = questsFor(19_000, EVERY_METRIC).map((quest) => quest.id);
    const state = questState(ids, {}, [], metrics);

    expect(state.quests).toHaveLength(QUESTS_PER_DAY);
    for (const quest of state.quests) expect(quest.complete).toBe(false);
  });

  it('nhận việc cuối thì được thêm uy tín, và chỉ một lần', () => {
    const store = ready(0);
    store.tick(0.1);

    // Ép cả ba việc xong bằng cách kéo số đếm vượt mọi mục tiêu.
    for (const quest of derive(store.state).quests.quests) {
      store.state.stats[quest.def.metric] = (store.state.questBase[quest.def.metric] ?? 0) +
        quest.def.target;
    }

    const before = store.state.reputationTotal;
    const quests = derive(store.state).quests.quests;
    for (const quest of quests) expect(store.claimQuest(quest.def.id)).toBeGreaterThan(0);

    expect(store.state.reputationTotal).toBe(before + QUEST_BONUS_REPUTATION);
    // Bấm lại không ra thêm gì.
    expect(store.claimQuest(quests[0]!.def.id)).toBe(0);
    expect(store.state.reputationTotal).toBe(before + QUEST_BONUS_REPUTATION);
  });

  it('bán sạch đế chế giữa ngày không xoá việc đang làm dở', () => {
    const store = ready(1e13);
    store.tick(0.1);
    const base = { ...store.state.questBase };
    const day = store.state.questDay;

    store.prestige();
    expect(store.state.questDay).toBe(day);
    expect(store.state.questBase).toEqual(base);
  });
});

describe('uy tín không đúc lại được', () => {
  it('tiêu hết rồi làm lại ở đúng đỉnh cũ thì không ra thêm', () => {
    const store = ready(1e13);
    const gain = store.prestige();
    expect(gain).toBeGreaterThan(0);

    // Tiêu sạch số dư, rồi leo lại đúng cái đỉnh vừa rồi.
    store.state.reputation = 0;
    store.state.peakNetWorth = 1e13;
    expect(derive(store.state).pendingReputation).toBe(0);
    expect(store.prestige()).toBe(0);
    expect(store.state.reputationTotal).toBe(gain);
  });
});

describe('bảng người ta', () => {
  it('xếp theo tài sản tăng dần, không có hai người cùng một mốc', () => {
    const rungs = RIVALS.map((rival) => rival.at);
    for (let i = 1; i < rungs.length; i += 1) expect(rungs[i]!).toBeGreaterThan(rungs[i - 1]!);
  });

  // Ông cà phê cóc đứng đúng vạch không: qua được ông ấy là hết nợ, và đó là
  // cột mốc duy nhất trong game đáng có một cái tên đứng cạnh.
  it('có đúng một người đứng ở mốc sạch nợ', () => {
    expect(RIVALS.filter((rival) => rival.at === 0)).toHaveLength(1);
    expect(rankOf(-1)).toBe(rankOf(0) - 1);
  });

  it('vượt ai thì trả tiền ngay, và không bao giờ trả người đó lần nữa', () => {
    const store = ready(0);
    store.state.cash = 0;
    store.state.peakNetWorth = 0;

    const before = store.state.cash;
    store.tick(0.1);

    // Số dư bằng không là trên đầu sáu người đầu bảng.
    expect(store.state.beaten).toHaveLength(6);
    expect(store.state.cash).toBeGreaterThan(before);

    const paid = store.state.cash;
    store.tick(0.1);
    expect(store.state.cash).toBe(paid);
  });

  it('làm lại thì tụt về chót bảng nhưng không trả tiền vượt mặt lần nữa', () => {
    const store = ready(1e13);
    store.tick(0.1);
    const beaten = [...store.state.beaten];
    expect(beaten.length).toBeGreaterThan(6);

    store.prestige();
    // Bảng đọc đỉnh của lượt đang chơi, nên hạng về không.
    expect(derive(store.state).rivals.rank).toBe(0);
    // Nhưng sổ nợ ân tình thì không xoá.
    expect(store.state.beaten).toEqual(beaten);

    store.state.peakNetWorth = 1e13;
    const cash = store.state.cash;
    store.tick(0.1);
    expect(store.state.cash).toBe(cash);
  });

  it('thanh tiến độ chạy trên thang nhân, không đứng im rồi nhảy', () => {
    // Giữa hai mốc cách nhau gấp mười, đi hết một nửa quãng *nhân* là quá nửa
    // thanh; đo tuyến tính thì chỗ đó mới được 3%.
    const middle = rivalState(Math.sqrt(2e12 * 2e13));
    expect(middle.progress).toBeGreaterThan(0.4);
    expect(middle.progress).toBeLessThan(0.6);
  });

  it('hết bảng thì thanh đầy và không còn ai ở trên', () => {
    const top = rivalState(1e43);
    expect(top.rank).toBe(RIVALS.length);
    expect(top.next).toBeNull();
    expect(top.progress).toBe(1);
  });

  it('bản lưu cũ được điền sẵn sổ chứ không lĩnh một cục', () => {
    const old = { ...createNewSave(1), peakNetWorth: 1e13 } as Record<string, unknown>;
    delete old['beaten'];

    const loaded = sanitise(old)!;
    expect(loaded.beaten).toEqual(passedRivals(1e13));
    expect(loaded.beaten.length).toBeGreaterThan(6);
  });
});

describe('ván thuộc về ai', () => {
  it('bản lưu mang dấu chủ khác thì không nhận', () => {
    const saved = sanitise({ ...createNewSave(1), ownerId: 7, cash: 5e12 })!;
    expect(saved.ownerId).toBe(7);

    // Người số 9 mở game trên cùng cái máy: không được thấy tiền của người số 7.
    const reloaded = sanitise({ ...saved, ownerId: 9 })!;
    expect(reloaded.ownerId).toBe(9);
  });

  it('bản lưu chưa có chủ thì `null`, không đoán bừa một id', () => {
    const old = { ...createNewSave(1) } as Record<string, unknown>;
    delete old['ownerId'];
    expect(sanitise(old)!.ownerId).toBeNull();

    // Và id vớ vẩn cũng thành `null` chứ không lọt qua thành một chủ có thật.
    for (const junk of [0, -3, 1.5, '7', {}, null]) {
      expect(sanitise({ ...createNewSave(1), ownerId: junk })!.ownerId).toBeNull();
    }
  });

  it('xoá tiến độ không phải là đổi chủ', () => {
    const store = ready(1e13);
    store.state.ownerId = 42;
    store.reset();
    expect(store.state.ownerId).toBe(42);
  });
});
