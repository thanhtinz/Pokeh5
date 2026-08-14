import { describe, expect, it } from 'vitest';

import { BUSINESSES, DISTRICTS } from '../src/game/businesses';
import { YARDS, YARD_AT, nextYardAt, yardOf } from '../src/game/yard';

describe('sân đổi theo đỉnh tài sản', () => {
  it('bắt đầu ở sân đầu ngay cả khi đang âm', () => {
    expect(yardOf(-1e9)).toBe(0);
    expect(yardOf(0)).toBe(0);
  });

  it('mỗi khu một sân, đúng thứ tự', () => {
    expect(YARDS).toEqual(DISTRICTS);
    expect(YARD_AT).toHaveLength(DISTRICTS.length);
  });

  it('đúng ngưỡng thì đổi sân, dưới một đồng thì chưa', () => {
    for (let tier = 1; tier < YARD_AT.length; tier += 1) {
      const at = YARD_AT[tier]!;
      expect(yardOf(at)).toBe(tier);
      // Cận dưới phải trừ đủ lớn: mấy ngưỡng cuối lớn tới 1e36, mà ở cỡ đó
      // `at - 1` bằng đúng `at` trong dấu phẩy động — một phép thử trừ một là
      // một phép thử luôn luôn đúng, tức là không thử gì cả.
      expect(yardOf(at * 0.999)).toBe(tier - 1);
    }
  });

  it('ngưỡng đi lên đều, không có bậc nào tụt', () => {
    for (let tier = 1; tier < YARD_AT.length; tier += 1) {
      expect(YARD_AT[tier]!).toBeGreaterThan(YARD_AT[tier - 1]!);
    }
  });

  it('ngưỡng đúng bằng giá cơ sở đầu tiên của khu', () => {
    DISTRICTS.forEach((district, tier) => {
      const first = BUSINESSES.find((def) => def.district === district)!;
      expect(YARD_AT[tier]).toBe(first.baseCost);
    });
  });

  it('sân cuối thì không còn mốc nào phía trước', () => {
    const last = YARD_AT[YARD_AT.length - 1]!;
    expect(nextYardAt(last)).toBeNull();
    expect(nextYardAt(0)).toBe(YARD_AT[1]);
  });

  it('không tụt sân khi đỉnh giữ nguyên', () => {
    const peak = YARD_AT[3]!;
    expect(yardOf(peak)).toBe(3);
    expect(yardOf(peak)).toBe(yardOf(peak));
  });
});
