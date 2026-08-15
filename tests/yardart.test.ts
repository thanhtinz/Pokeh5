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
import { YARD_ICONS, yardIcon } from '../src/ui/yards';

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

describe('khung giữa màn Cày', () => {
  it('mỗi khu một hình', () => {
    expect(YARD_ICONS).toHaveLength(DISTRICTS.length);
  });

  it('hình của một khu đúng là cơ sở thuộc khu đó', () => {
    YARD_ICONS.forEach((id, tier) => {
      const def = BUSINESSES.find((entry) => entry.id === id);
      expect({ tier, district: def?.district }).toEqual({ tier, district: DISTRICTS[tier] });
    });
  });

  it('sáu khu sáu hình khác nhau', () => {
    expect(new Set(YARD_ICONS).size).toBe(YARD_ICONS.length);
  });

  it('bậc ngoài khoảng thì kẹp về hai đầu chứ không vỡ', () => {
    expect(yardIcon(-5)).toBe(YARD_ICONS[0]);
    expect(yardIcon(999)).toBe(YARD_ICONS[YARD_ICONS.length - 1]);
  });

  /*
   * Luật của khung này: *đang làm gì* gấp hơn *đang giàu tới đâu*. Bấm "Làm"
   * xong mà khung vẫn hiện cái khu thì người chơi không có cách nào biết cú
   * bấm đã ăn — danh sách việc ở dưới thường đã cuộn khuất.
   */
  it('đang làm việc thì việc thắng, ở bất kỳ khu nào', () => {
    for (const job of JOBS) {
      for (let tier = 0; tier < YARD_ICONS.length; tier += 1) {
        expect(yardIcon(tier, job.id)).toBe(job.id);
      }
    }
  });

  it('làm xong thì hình quay về cơ sở của khu', () => {
    expect(yardIcon(3, null)).toBe(YARD_ICONS[3]);
  });

  /*
   * `working` đi ra từ bản lưu, và một bản lưu cũ có thể còn giữ tên một việc
   * đã bị xoá khỏi game. Rơi về hình của khu thì màn hình vẫn đủ nghĩa; để nó
   * trỏ vào một ô không tồn tại thì khung giữa trống trơn.
   */
  it('id việc lạ thì rơi về cơ sở của khu chứ không để trống', () => {
    expect(yardIcon(2, 'khong-co-viec-nay')).toBe(YARD_ICONS[2]);
  });
});
