/**
 * Bảng báo "lúc bạn đi vắng".
 *
 * Thứ đáng kiểm ở đây không phải số tiền — cái đó chỉ là một phép nhân. Đáng
 * kiểm là **bảng báo có nói thật không**: trước đây nó chỉ mang đúng một con
 * số thời gian, và con số ấy là con số đã bị kẹp theo trần offline. Vắng hai
 * mươi tiếng với trần tám tiếng thì màn hình ghi "Vắng 8 tiếng".
 *
 * Hai cái sai cùng lúc, và cái thứ hai nặng hơn: người chơi bị nói sai mặt
 * thời gian, *và* cả cơ chế trần biến mất khỏi trò chơi — không ai biết có
 * trần, không ai biết mình vừa mất gì, không ai biết có một đặc quyền nới nó
 * ra. Đây là loại lỗi không bao giờ ném ra exception, nên phải có bài kiểm
 * đứng canh.
 */
import { describe, expect, it } from 'vitest';

import { OFFLINE_EFFICIENCY, Store, derive } from '../src/game/store';
import { BUSINESSES } from '../src/game/businesses';
import { createNewSave } from '../src/game/state';

const HOUR = 3600_000;

/** Một ván có thu nhập tự động thật, và vừa mới vắng mặt `hours` tiếng. */
function away(hours: number): Store {
  const store = new Store();
  store.state = createNewSave(1);

  // Phải có cơ sở *và* quản lý: thu nhập offline chỉ đếm phần chạy không cần
  // người bấm, nên thiếu quản lý thì mọi con số đều bằng không và bài kiểm
  // xanh vì lý do sai.
  const cans = BUSINESSES[0]!;
  store.state.businesses[cans.id] = 25;
  store.state.managers.push(cans.id);

  store.state.lastSeenAt = Date.now() - hours * HOUR;
  return store;
}

/** `catchUp` là hàm riêng của Store; gọi thẳng nó thay vì dựng lại cả vòng nạp. */
function report(store: Store) {
  const out = (store as unknown as { catchUp: (now?: number) => unknown }).catchUp();
  return out as {
    seconds: number;
    awaySeconds: number;
    capHours: number;
    earned: number;
    jobsFinished: number;
  } | null;
}

describe('bảng báo offline', () => {
  it('vắng dưới một phút thì không báo gì', () => {
    const store = away(0);
    store.state.lastSeenAt = Date.now() - 30_000;
    expect(report(store)).toBeNull();
  });

  it('chưa chạm trần thì giờ được tính bằng đúng giờ đã vắng', () => {
    const store = away(1);
    const out = report(store)!;

    expect(out.awaySeconds).toBeCloseTo(3600, -1);
    expect(out.seconds).toBeCloseTo(out.awaySeconds, -1);
  });

  /*
   * Đây là bài kiểm bắt được cái lỗi cũ. Trước khi tách hai trường ra, `seconds`
   * là con số đã kẹp và không có gì để đối chiếu, nên không cách nào viết được
   * một dòng `expect` phân biệt "vắng 20 tiếng" với "vắng 8 tiếng".
   */
  it('quá trần thì giờ được tính bị kẹp, còn giờ đã vắng vẫn là con số thật', () => {
    const store = away(20);
    const cap = derive(store.state).bonuses.offlineHours + derive(store.state).perks.offlineHours;
    const out = report(store)!;

    expect(out.capHours).toBe(cap);
    expect(out.seconds).toBeCloseTo(cap * 3600, -1);
    expect(out.awaySeconds).toBeCloseTo(20 * 3600, -1);
    expect(out.awaySeconds).toBeGreaterThan(out.seconds);
  });

  it('tiền trả theo giờ **được tính**, không theo giờ đã vắng', () => {
    const store = away(20);
    const d = derive(store.state);
    const out = report(store)!;

    // Đúng bằng phần thu nhập tự động trong quãng đã kẹp. Nếu có ngày ai đó
    // trả theo `awaySeconds` thì dòng này đỏ ngay, và đó là cả lý do nó ở đây.
    expect(out.earned).toBeCloseTo(d.income * out.seconds * OFFLINE_EFFICIENCY, -1);
    expect(out.earned).toBeLessThan(d.income * out.awaySeconds * OFFLINE_EFFICIENCY);
  });

  it('trần nới ra thì giờ được tính nới theo', () => {
    const short = away(20);
    const long = away(20);
    long.state.perks['offline'] = 3;

    const a = report(short)!;
    const b = report(long)!;

    expect(b.capHours).toBeGreaterThan(a.capHours);
    expect(b.seconds).toBeGreaterThan(a.seconds);
    expect(b.earned).toBeGreaterThan(a.earned);
  });
});
