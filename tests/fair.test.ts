/**
 * Phiên chợ.
 *
 * Đây là thứ đầu tiên trong game **tự đóng cửa**, và mọi chỗ dễ sai của nó đều
 * là chỗ không đỏ:
 *
 *  - Lịch phiên suy ra từ đồng hồ chứ không do máy chủ phát. Nếu nó không tất
 *    định thì hai lần mở app cách nhau một phút ra hai món khác nhau, và không
 *    có gì báo.
 *  - Mốc điểm chụp sai thì người vắng hai ngày vào đúng lúc chợ mở là xong sẵn
 *    cả bốn nấc. Cũng không có gì báo — chỉ là cái thang không còn là thang.
 *  - Buff của phiên phải nhân vào đúng đường đã có. Nhân vào một đường riêng
 *    thì con số trên màn hình và con số trả tiền lệch nhau, im lặng.
 *
 * Nên bài kiểm ở đây không kiểm "hàm có chạy không" mà kiểm mấy tính chất ấy.
 * Mọi mốc thời gian đều dựng tay từ `PERIOD_HOURS`: lấy `Date.now()` thật thì
 * một nửa số lần chạy rơi vào quãng chợ nghỉ và bài kiểm đỏ theo giờ trong
 * ngày.
 */
import { describe, expect, it } from 'vitest';

import { BUSINESSES } from '../src/game/businesses';
import {
  FAIRS,
  NO_EFFECTS,
  OPEN_HOURS,
  PERIOD_HOURS,
  effectsOf,
  fairAt,
  fairDef,
  fairReward,
  fairState,
} from '../src/game/fair';
import { createNewSave } from '../src/game/state';
import { Store, derive } from '../src/game/store';

const HOUR = 3_600_000;
const PERIOD = PERIOD_HOURS * HOUR;

/** Một mốc thời gian nằm ở giờ thứ `hour` của chu kỳ thứ `index`. */
function at(index: number, hour = 0): number {
  return index * PERIOD + hour * HOUR;
}

const metrics = (over: Partial<Record<string, number>> = {}) =>
  ({ taps: 0, cards: 0, jobs: 0, trades: 0, units: 0, upgrades: 0, ...over }) as never;

describe('lịch phiên', () => {
  it('mở nửa đầu chu kỳ, nghỉ nửa sau', () => {
    expect(fairAt(at(1000, 0)).open).toBe(true);
    expect(fairAt(at(1000, OPEN_HOURS - 1)).open).toBe(true);
    expect(fairAt(at(1000, OPEN_HOURS)).open).toBe(false);
    expect(fairAt(at(1000, PERIOD_HOURS - 1)).open).toBe(false);
    expect(fairAt(at(1001, 0)).open).toBe(true);
  });

  /*
   * Không có máy chủ nào phát lịch, nên tính tất định **là** cơ chế: mở app hai
   * lần trong cùng một phiên mà ra hai món khác nhau thì cái thang đang leo dở
   * biến mất dưới tay người chơi.
   */
  it('cùng một phiên thì lúc nào hỏi cũng ra cùng một món', () => {
    const first = fairAt(at(77, 0));
    const later = fairAt(at(77, OPEN_HOURS - 2));
    expect(later.index).toBe(first.index);
    expect(later.def.id).toBe(first.def.id);
  });

  it('phiên sau đổi món', () => {
    expect(fairDef(77).id).not.toBe(fairDef(78).id);
  });

  it('đi hết một vòng thì gặp lại đủ cả bốn món', () => {
    const seen = new Set<string>();
    for (let i = 0; i < FAIRS.length; i += 1) seen.add(fairDef(1000 + i).id);
    expect(seen.size).toBe(FAIRS.length);
  });

  /* Test có quyền dựng mốc thời gian trước 1970; `%` của JS trả số âm. */
  it('chu kỳ âm vẫn ra một món có thật', () => {
    expect(FAIRS).toContain(fairDef(-3));
  });

  it('đồng hồ đếm ngược: đang mở thì tới lúc đóng, đang nghỉ thì tới lúc mở', () => {
    expect(fairAt(at(5, OPEN_HOURS - 2)).seconds).toBeCloseTo(2 * 3600, 0);
    expect(fairAt(at(5, PERIOD_HOURS - 3)).seconds).toBeCloseTo(3 * 3600, 0);
  });
});

describe('điểm trong phiên', () => {
  const open = at(500, 1);
  const def = fairAt(open).def;

  it('điểm là hiệu của số đếm bây giờ với mốc lúc phiên mở', () => {
    const state = fairState(open, 500, 40, 0, metrics({ [def.metric]: 100 }));
    expect(state.points).toBe(60);
  });

  /*
   * Đây là cái bẫy chính. Mốc chụp cho phiên trước mà vẫn đem trừ thì hai ngày
   * cày ngoài phiên biến thành điểm của phiên này, và bốn nấc xong trước khi
   * người chơi kịp bấm gì.
   */
  it('mốc của phiên khác thì không tính điểm', () => {
    const state = fairState(open, 499, 0, 0, metrics({ [def.metric]: 99_999 }));
    expect(state.points).toBe(0);
    expect(state.reached).toBe(0);
  });

  it('chợ nghỉ thì không tính điểm dù mốc đúng chu kỳ', () => {
    const shut = at(500, OPEN_HOURS + 1);
    const state = fairState(shut, 500, 0, 0, metrics({ [def.metric]: 99_999 }));
    expect(state.points).toBe(0);
    expect(state.claimable).toBe(false);
  });

  /* Số đếm sống qua làm lại, nhưng một ván dán vào có thể thấp hơn mốc đã lưu. */
  it('số đếm tụt xuống dưới mốc thì điểm là không, không phải số âm', () => {
    expect(fairState(open, 500, 900, 0, metrics({ [def.metric]: 10 })).points).toBe(0);
  });

  it('đủ điểm nấc nào thì mở tới nấc đó, và chỉ nhận được phần chưa nhận', () => {
    const third = def.tiers[2]!.points;
    const state = fairState(open, 500, 0, 1, metrics({ [def.metric]: third }));
    expect(state.reached).toBe(3);
    expect(state.claimed).toBe(1);
    expect(state.claimable).toBe(true);
    expect(state.next).toBe(def.tiers[3]);
  });

  it('nhận hết thang thì không còn nấc nào và không còn gì để bấm', () => {
    const top = def.tiers[def.tiers.length - 1]!.points;
    const state = fairState(open, 500, 0, def.tiers.length, metrics({ [def.metric]: top }));
    expect(state.next).toBeNull();
    expect(state.claimable).toBe(false);
  });
});

describe('buff của phiên', () => {
  it('chợ nghỉ thì mọi hệ số bằng một', () => {
    expect(fairState(at(9, OPEN_HOURS + 2), 9, 0, 0, metrics()).effects).toEqual(NO_EFFECTS);
  });

  /*
   * Đúng một ô được nhân. Nếu một món lỡ nhân hai ô thì nó mạnh gấp đôi ý định
   * mà chẳng có gì trên màn hình nói ra.
   */
  it('mỗi món chỉ đụng vào đúng một hệ số', () => {
    for (const def of FAIRS) {
      const boosted = Object.entries(effectsOf(def)).filter(([, value]) => value !== 1);
      expect(boosted).toEqual([[def.effect, def.multiplier]]);
      expect(def.multiplier).toBeGreaterThan(1);
    }
  });

  it('hệ số của phiên đang mở là hệ số của đúng món đang mở', () => {
    const state = fairState(at(3, 0), 3, 0, 0, metrics());
    expect(state.effects).toEqual(effectsOf(state.window.def));
  });

  /*
   * Buff phải chảy qua `derive` chứ không nằm im trong `FairState`. Chỗ này
   * kiểm đúng cái đó: cùng một ván, một lúc trong phiên "chợ sớm" và một lúc
   * ngoài phiên, và số công mỗi lần chạm phải khác nhau.
   */
  it('phiên chợ sớm làm một lần chạm ra nhiều công hơn thật', () => {
    const dawn = FAIRS.findIndex((fair) => fair.id === 'dawn');
    expect(dawn).toBeGreaterThanOrEqual(0);

    // Chu kỳ chia hết cho số món cộng vị trí của "chợ sớm" là một chu kỳ mở
    // đúng món ấy — cùng phép chia mà `fairDef` dùng.
    const index = FAIRS.length * 100 + dawn;
    const state = createNewSave(1);
    state.fairIndex = index;

    const inside = derive(state, at(index, 1)).tapOre;
    const outside = derive(state, at(index, OPEN_HOURS + 1)).tapOre;
    expect(inside).toBeCloseTo(outside * FAIRS[dawn]!.multiplier, 6);
  });
});

describe('nhận thưởng', () => {
  /** Một ván đang giữa phiên `index`, đã đủ điểm tới nấc `tier`. */
  function playing(index: number, tier: number) {
    const store = new Store();
    store.state = createNewSave(2);
    store.ready = true;

    const def = fairDef(index);
    store.state.fairIndex = index;
    store.state.fairBase = 0;
    store.state.stats[def.metric as 'taps'] = def.tiers[tier - 1]!.points;

    // Có thu nhập thật, nếu không thì mọi phần thưởng rơi về đúng cái sàn và
    // bài kiểm xanh mà không kiểm được gì.
    const cans = BUSINESSES[0]!;
    store.state.businesses[cans.id] = 40;
    store.state.managers.push(cans.id);

    return { store, def };
  }

  it('nhận từng nấc một, theo thứ tự', () => {
    const { store, def } = playing(600, 3);
    const now = at(600, 2);

    expect(store.claimFair(now)).toBeGreaterThan(0);
    expect(store.state.fairClaimed).toBe(1);
    store.claimFair(now);
    store.claimFair(now);
    expect(store.state.fairClaimed).toBe(3);

    // Nấc bốn chưa đủ điểm — bấm nữa là không được gì.
    expect(store.claimFair(now)).toBe(0);
    expect(store.state.fairClaimed).toBe(3);
    expect(def.tiers.length).toBe(4);
  });

  it('nấc sau trả nhiều hơn nấc trước', () => {
    const { store } = playing(600, 2);
    const now = at(600, 2);
    const first = store.claimFair(now);
    const second = store.claimFair(now);
    expect(second).toBeGreaterThan(first);
  });

  it('chợ nghỉ thì không nhận được gì', () => {
    const { store } = playing(600, 3);
    expect(store.claimFair(at(600, OPEN_HOURS + 1))).toBe(0);
    expect(store.state.fairClaimed).toBe(0);
  });

  it('leo hết thang thì được thêm một cữ buff', () => {
    const { store, def } = playing(600, 4);
    const now = at(600, 2);
    for (let i = 0; i < def.tiers.length; i += 1) store.claimFair(now);

    expect(store.state.fairClaimed).toBe(def.tiers.length);
    expect(store.state.boost).not.toBeNull();
    expect(store.state.boost!.multiplier).toBeGreaterThan(1);
    expect(store.state.boost!.endsAt).toBeGreaterThan(now);
  });

  it('thưởng đi theo thu nhập, và có sàn cho ván còn nghèo', () => {
    const tier = FAIRS[0]!.tiers[0]!;
    expect(fairReward(tier, 0, 0)).toBeGreaterThan(0);
    expect(fairReward(tier, 1_000_000, 0)).toBeGreaterThan(fairReward(tier, 1_000, 0));
  });
});

describe('mở sổ', () => {
  /*
   * Mốc chỉ được chụp trong lúc chợ mở. Chụp lúc chợ nghỉ thì tất cả những gì
   * người chơi làm từ đó tới lúc mở cửa đều chảy vào phiên.
   */
  it('chợ nghỉ thì không mở sổ', () => {
    const store = new Store();
    store.state = createNewSave(3);
    store.ready = true;

    store.tick(1, at(700, OPEN_HOURS + 3));
    expect(store.state.fairIndex).toBe(-1);
  });

  it('chợ mở thì chụp mốc bằng số đếm lúc đó', () => {
    const store = new Store();
    store.state = createNewSave(3);
    store.ready = true;
    store.state.stats.taps = 4_321;
    store.state.stats.units = 4_321;
    store.state.stats.jobs = 4_321;
    store.state.stats.cards = 4_321;

    const now = at(701, 1);
    store.tick(1, now);
    expect(store.state.fairIndex).toBe(701);
    expect(store.state.fairBase).toBe(4_321);
    expect(derive(store.state, now).fair.points).toBe(0);
  });

  it('sang phiên mới thì mở lại thang từ nấc một', () => {
    const store = new Store();
    store.state = createNewSave(3);
    store.ready = true;
    store.state.fairIndex = 701;
    store.state.fairClaimed = 3;

    store.tick(1, at(702, 1));
    expect(store.state.fairIndex).toBe(702);
    expect(store.state.fairClaimed).toBe(0);
  });

  /*
   * Điểm đếm bằng số đếm cộng dồn, mà số đếm thì sống qua làm lại. Nên mốc cũng
   * phải sống theo — bỏ nó lại là bán sạch đế chế giữa phiên xong thang tự đầy.
   */
  it('làm lại giữa phiên không xoá mất thang đang leo', () => {
    const store = new Store();
    store.state = createNewSave(4);
    store.ready = true;
    store.state.fairIndex = 703;
    store.state.fairBase = 111;
    store.state.fairClaimed = 2;
    store.state.peakNetWorth = 1e15;

    store.prestige();

    expect(store.state.fairIndex).toBe(703);
    expect(store.state.fairBase).toBe(111);
    expect(store.state.fairClaimed).toBe(2);
  });
});
