/**
 * Tấm hình của màn Cày, và bảng ghép hình nói chung.
 *
 * Mọi lỗi ở lớp này đều là lỗi **im lặng**: thiếu một hình thì chỗ đó rỗng và
 * hàng vẫn xếp, ghép nhầm id thì hiện ra một cái hình khác mà vẫn là một cái
 * hình. Không có gì ném ra, không có gì đỏ trên màn hình — nên phải đếm.
 */
import { describe, expect, it } from 'vitest';

import { BUSINESSES, DISTRICTS } from '../src/game/businesses';
import { JOBS } from '../src/game/jobs';
import { ICONS, ICON_COLS, ICON_ROWS } from '../src/ui/icons';
import { YARD_ITEMS, YARD_SCENES, yardScene } from '../src/ui/yards';

describe('bảng ghép hình', () => {
  it('cơ sở nào cũng có hình', () => {
    const without = BUSINESSES.filter((def) => ICONS[def.id] === undefined).map((def) => def.id);
    expect(without).toEqual([]);
  });

  it('việc làm nào cũng có hình', () => {
    const without = JOBS.filter((job) => ICONS[job.id] === undefined).map((job) => job.id);
    expect(without).toEqual([]);
  });

  /*
   * Hai id trỏ chung một ô thì hai dòng trong danh sách hiện ra hình giống hệt
   * nhau — và với một danh sách bốn mươi dòng, hai dòng trùng hình đọc ra là
   * "chắc mình cuộn nhầm chỗ". Đây là lỗi dễ mắc nhất khi sửa bảng ghép, vì
   * `icon-map.json` cho phép hai id cùng chọn một tên hình mà không kêu gì.
   */
  it('không hai mục nào dùng chung một ô', () => {
    const cells = Object.values(ICONS);
    const twice = cells.filter((cell, i) => cells.indexOf(cell) !== i);
    expect(twice).toEqual([]);
  });

  it('mọi ô nằm trong lưới của tấm sprite', () => {
    const out = Object.entries(ICONS).filter(
      ([, cell]) => cell < 0 || cell >= ICON_COLS * ICON_ROWS,
    );
    expect(out).toEqual([]);
  });
});

describe('tấm hình màn Cày', () => {
  it('mỗi khu một tấm', () => {
    expect(YARD_SCENES).toHaveLength(DISTRICTS.length);
  });

  it('tấm nào cũng đủ ba hình', () => {
    YARD_SCENES.forEach((ids, tier) => {
      expect({ tier, count: ids.length }).toEqual({ tier, count: YARD_ITEMS });
    });
  });

  it('hình trong một tấm đều thuộc đúng khu của tấm đó', () => {
    YARD_SCENES.forEach((ids, tier) => {
      const wrong = ids.filter((id) => {
        const def = BUSINESSES.find((entry) => entry.id === id);
        return !def || def.district !== DISTRICTS[tier];
      });
      expect({ tier, wrong }).toEqual({ tier, wrong: [] });
    });
  });

  it('sáu tấm khác hẳn nhau, không hình nào lặp lại giữa hai tấm', () => {
    const all = YARD_SCENES.flat();
    expect(new Set(all).size).toBe(all.length);
  });

  it('bậc ngoài khoảng thì kẹp về hai đầu chứ không vỡ', () => {
    expect(yardScene(-5)).toBe(YARD_SCENES[0]);
    expect(yardScene(999)).toBe(YARD_SCENES[YARD_SCENES.length - 1]);
  });
});
