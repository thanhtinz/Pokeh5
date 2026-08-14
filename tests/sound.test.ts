import { describe, expect, it } from 'vitest';

import { STREAK_CAP, STREAK_WINDOW, buzzFor, nextStreak, notesFor, tapFreq } from '../src/audio/cues';
import type { CueId } from '../src/game/store';

const ALL: CueId[] = ['tap', 'buy', 'deny', 'cash', 'info', 'card', 'milestone'];

describe('chuỗi bấm', () => {
  it('lên một bậc mỗi lần bấm nhanh, và tính lại từ đầu khi nghỉ tay', () => {
    let streak = nextStreak(0, 100);
    streak = nextStreak(streak, 100);
    expect(streak).toBe(2);

    expect(nextStreak(streak, STREAK_WINDOW + 1)).toBe(0);
  });

  it('có trần', () => {
    let streak = 0;
    for (let i = 0; i < 200; i += 1) streak = nextStreak(streak, 50);
    expect(streak).toBe(STREAK_CAP);
  });

  it('lần bấm đầu tiên trong đời không tính là bấm nhanh', () => {
    // `sinceLastMs` lúc đó là `Date.now() - 0`, tức là một con số rất lớn — và
    // nếu nó lọt qua thì tiếng bấm đầu tiên của mỗi ván nhảy lên một bậc.
    expect(nextStreak(0, Date.now())).toBe(0);
    expect(nextStreak(0, Number.NaN)).toBe(0);
  });
});

describe('thang tiếng bấm', () => {
  it('đi lên đều, không bao giờ đi xuống', () => {
    for (let step = 1; step <= STREAK_CAP; step += 1) {
      expect(tapFreq(step)).toBeGreaterThan(tapFreq(step - 1));
    }
  });

  it('nằm gọn trong quãng nghe được dễ chịu', () => {
    // Dưới 100 Hz thì điện thoại không phát ra nổi, trên 4 kHz thì chói.
    for (let step = 0; step <= STREAK_CAP; step += 1) {
      expect(tapFreq(step)).toBeGreaterThan(100);
      expect(tapFreq(step)).toBeLessThan(4000);
    }
  });

  it('bậc thứ năm là đúng một quãng tám so với bậc gốc', () => {
    expect(tapFreq(5)).toBeCloseTo(tapFreq(0) * 2, 6);
  });
});

describe('bộ tiếng', () => {
  it('cue nào cũng có ít nhất một nốt', () => {
    for (const cue of ALL) expect(notesFor(cue).length, cue).toBeGreaterThan(0);
  });

  it('nốt nào cũng nghe được: tần số dương, độ dài dương, biên độ trong khoảng', () => {
    for (const cue of ALL) {
      for (const note of notesFor(cue, 7)) {
        expect(note.freq, cue).toBeGreaterThan(0);
        expect(note.ms, cue).toBeGreaterThan(0);
        expect(note.gain, cue).toBeGreaterThan(0);
        // Trên 1 là vượt biên độ, và cái vượt biên độ nghe ra tiếng rè.
        expect(note.gain, cue).toBeLessThanOrEqual(1);
        expect(note.start, cue).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('không có cue nào dài quá nửa giây, trừ tiếng mốc cuộc đời', () => {
    // Tiếng còn kêu khi cú bấm sau đã tới thì hai tiếng chồng lên nhau, và một
    // game bấm liên tục thì đó là tiếng ù chứ không phải tiếng bấm.
    for (const cue of ALL) {
      if (cue === 'milestone') continue;
      const end = Math.max(...notesFor(cue, 7).map((note) => note.start + note.ms));
      expect(end, cue).toBeLessThanOrEqual(500);
    }
  });

  it('tiếng bấm ngắn hơn khoảng cách hai lần bấm nhanh nhất mà tay làm được', () => {
    const [tap] = notesFor('tap', 3);
    expect(tap!.start + tap!.ms).toBeLessThan(100);
  });

  it('chỉ mấy việc do tay người chơi làm mới rung', () => {
    expect(buzzFor('tap')).toBeGreaterThan(0);
    expect(buzzFor('buy')).toBeGreaterThan(0);
    expect(buzzFor('cash')).toBe(0);
    expect(buzzFor('info')).toBe(0);
    expect(buzzFor('card')).toBe(0);
  });
});
