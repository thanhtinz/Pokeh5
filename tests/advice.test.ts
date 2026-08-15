/**
 * Lời khuyên "giờ bấm cái gì".
 *
 * Một lời khuyên sai không làm gì đỏ cả — nó chỉ lặng lẽ dắt người chơi đi sai
 * đường, và nếu nó sai vài lần thì người chơi thôi không đọc cái thanh ấy nữa,
 * tức là cả tính năng chết mà không ai báo. Nên thứ phải khoá lại ở đây là
 * **thứ tự ưu tiên**, không phải từng câu chữ.
 */
import { describe, expect, it } from 'vitest';

import { BUSINESSES } from '../src/game/businesses';
import { MILESTONES } from '../src/game/life';
import { PRESTIGE_WORTH_IT, adviceShortfall, nextStep } from '../src/game/advice';
import { createNewSave, type PlayerState } from '../src/game/state';

const cans = BUSINESSES[0]!;
const cart = BUSINESSES[1]!;

/** Một ván trắng, không có gì đang chờ nhặt. */
function save(): PlayerState {
  const state = createNewSave(1);
  // Mọi mốc coi như đã chuộc: chỉ cần một mốc chưa nhặt là nó chen lên đầu và
  // che mất mọi thứ khác đang được kiểm.
  state.claimed = MILESTONES.map((milestone) => milestone.id);
  return state;
}

const idle = {
  netWorth: 0,
  spendable: 0,
  pendingReputation: 0,
  reputationTotal: 0,
  dailyAvailable: false,
  questClaimable: false,
};

describe('thứ tự ưu tiên', () => {
  it('mốc cuộc đời đã tới thì đứng trên tất cả', () => {
    const state = save();
    state.claimed = [];

    // Cố tình bày ra thật nhiều thứ hấp dẫn khác cùng lúc.
    const out = nextStep(state, {
      ...idle,
      netWorth: 1e12,
      spendable: 1e12,
      dailyAvailable: true,
      questClaimable: true,
      pendingReputation: 999,
    });

    expect(out.kind).toBe('milestone');
    expect(out.tab).toBe('life');
  });

  it('điểm danh đứng trên nhiệm vụ, và cả hai đứng trên việc mua bán', () => {
    const state = save();
    const both = nextStep(state, {
      ...idle,
      spendable: 1e12,
      dailyAvailable: true,
      questClaimable: true,
    });
    expect(both.kind).toBe('daily');

    const questOnly = nextStep(state, { ...idle, spendable: 1e12, questClaimable: true });
    expect(questOnly.kind).toBe('quest');
  });
});

describe('làm lại', () => {
  it('lời to thì giục làm lại', () => {
    const out = nextStep(save(), {
      ...idle,
      spendable: 1e12,
      reputationTotal: 100,
      pendingReputation: 100,
    });
    expect(out.kind).toBe('prestige');
    expect(out.tab).toBe('life');
  });

  /*
   * Đây là bài kiểm giữ cho cái thanh này còn đáng tin. Không có nó thì mỗi lần
   * dư một điểm uy tín, màn hình lại giục xoá sạch cơ ngơi — và một cái thanh
   * gợi ý nói sai vài lần là một cái thanh không ai đọc nữa.
   */
  it('lời lắt nhắt thì im, để người chơi mua tiếp', () => {
    const state = save();
    state.businesses[cans.id] = 1;

    const out = nextStep(state, {
      ...idle,
      spendable: cans.managerCost,
      reputationTotal: 100,
      pendingReputation: 100 * PRESTIGE_WORTH_IT - 1,
    });
    expect(out.kind).not.toBe('prestige');
  });

  it('ván đầu chưa có uy tín nào thì một điểm cũng là bước nhảy', () => {
    const out = nextStep(save(), { ...idle, reputationTotal: 0, pendingReputation: 1 });
    expect(out.kind).toBe('prestige');
  });
});

describe('mua gì trước', () => {
  it('quản lý đứng trên cơ sở mới và trên nâng cấp', () => {
    const state = save();
    state.businesses[cans.id] = 30;

    const out = nextStep(state, { ...idle, spendable: 1e12 });
    expect(out.kind).toBe('manager');
    expect(out.businessId).toBe(cans.id);
    expect(out.tab).toBe('empire');
  });

  it('quản lý rẻ nhất trước — mua được hôm nay hơn hoàn hảo tuần sau', () => {
    const state = save();
    state.businesses[cans.id] = 1;
    state.businesses[cart.id] = 1;

    const out = nextStep(state, { ...idle, spendable: 1e12 });
    expect(out.businessId).toBe(cans.managerCost < cart.managerCost ? cans.id : cart.id);
  });

  it('hết quản lý thì mở cơ sở mới, và mở cái đắt nhất mua nổi', () => {
    const state = save();
    state.businesses[cans.id] = 1;
    state.managers.push(cans.id);

    const out = nextStep(state, { ...idle, spendable: cart.baseCost * 1.5 });
    expect(out.kind).toBe('business');
    expect(out.businessId).toBe(cart.id);
  });

  /*
   * Nâng cấp xếp **sau** cơ sở mới, và đó không phải chuyện tuỳ ý: bậc nâng cấp
   * đầu tiên giá bằng bốn mươi lần giá gốc của chính cơ sở đó, trong khi cơ sở
   * kế tiếp chỉ đắt hơn cơ sở hiện tại chừng chục lần. Còn cơ sở chưa mở thì mở
   * cơ sở vẫn lời hơn, nên nâng cấp chỉ tới lượt khi đã mở hết.
   */
  it('mở hết cơ sở rồi thì quay sang nâng cấp, rẻ nhất trước', () => {
    const state = save();
    for (const def of BUSINESSES) {
      state.businesses[def.id] = 30;
      state.managers.push(def.id);
    }

    const out = nextStep(state, { ...idle, spendable: cans.baseCost * 40 });
    expect(out.kind).toBe('upgrade');
    expect(out.businessId).toBe(cans.id);
  });

  it('chưa mở hết cơ sở thì mở cơ sở vẫn hơn nâng cấp', () => {
    const state = save();
    state.businesses[cans.id] = 30;
    state.managers.push(cans.id);

    // Thừa sức cho cả hai; lời khuyên phải chọn cái lời hơn.
    const out = nextStep(state, { ...idle, spendable: cans.baseCost * 40 });
    expect(out.kind).toBe('business');
  });

  it('nghèo quá thì bảo đi cày, kèm cái đích cụ thể', () => {
    const state = save();
    const out = nextStep(state, { ...idle, spendable: 0 });

    expect(out.kind).toBe('grind');
    expect(out.tab).toBe('grind');
    expect(out.businessId).toBe(cans.id);
    expect(adviceShortfall(out, state, 0)).toBeCloseTo(cans.baseCost, 4);
  });

  it('còn thiếu bao nhiêu thì trừ đúng số tiền đang có', () => {
    const state = save();
    const out = nextStep(state, { ...idle, spendable: 0 });
    expect(adviceShortfall(out, state, cans.baseCost * 0.25)).toBeCloseTo(cans.baseCost * 0.75, 4);
  });

  it('việc mua được rồi thì không còn thiếu gì', () => {
    const state = save();
    state.businesses[cans.id] = 30;
    const out = nextStep(state, { ...idle, spendable: 1e12 });
    expect(adviceShortfall(out, state, 1e12)).toBe(0);
  });
});

describe('không bao giờ im lặng', () => {
  /*
   * Cái thanh này chỉ có nghĩa nếu **lúc nào cũng có gì đó để nói**. Một hàm
   * trả về `null` ở một trạng thái hiếm nào đó là một khoảng trống hiện ra
   * giữa màn hình mà không ai dựng lại được.
   */
  it('trạng thái nào cũng ra một lời khuyên', () => {
    const spends = [0, 1, 1e6, 1e12, 1e30, Number.MAX_SAFE_INTEGER];
    for (const spendable of spends) {
      for (const owned of [0, 1, 30, 1000]) {
        const state = save();
        for (const def of BUSINESSES) state.businesses[def.id] = owned;

        const out = nextStep(state, { ...idle, spendable, netWorth: spendable });
        expect(out.kind, `spendable=${spendable} owned=${owned}`).toBeTruthy();
        expect(out.tab, `spendable=${spendable} owned=${owned}`).toBeTruthy();
      }
    }
  });

  it('mua hết sạch mọi thứ rồi thì vẫn còn một câu để nói', () => {
    const state = save();
    for (const def of BUSINESSES) {
      state.businesses[def.id] = 1000;
      state.managers.push(def.id);
      state.upgrades[def.id] = 5;
    }

    const out = nextStep(state, { ...idle, spendable: 1e40 });
    expect(out.kind).toBe('grind');
    expect(out.businessId).toBeUndefined();
  });
});
