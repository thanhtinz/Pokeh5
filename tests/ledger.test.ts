/**
 * Sổ sách.
 *
 * Cả cái bảng này chỉ có một luật, và nó là luật sai lặng lẽ: **dòng nào thuộc
 * cột nào**. Xếp nhầm một con số cả đời sang cột lượt thì sau khi làm lại nó
 * vẫn đứng nguyên, không có gì đỏ, và người chơi đọc ra rằng bán sạch đế chế
 * chẳng mất gì. Xếp nhầm chiều ngược lại thì kỷ lục cả đời tụt về không sau một
 * lần làm lại — mất thật, và cũng không có gì đỏ.
 *
 * Nên bài kiểm ở đây không đếm số dòng mà đo đúng tính chất ấy: chơi một lượt,
 * làm lại, rồi hỏi hai cột xem cột nào tụt.
 */
import { describe, expect, it } from 'vitest';

import { BUSINESSES } from '../src/game/businesses';
import { ledgerOf, type Ledger } from '../src/game/ledger';
import { createNewSave, type PlayerState } from '../src/game/state';
import { Store, derive } from '../src/game/store';

const NOW = 1_700_000_000_000;

function books(state: PlayerState): Ledger {
  const d = derive(state, NOW);
  return ledgerOf(state, {
    income: d.income,
    pendingReputation: d.pendingReputation,
    now: NOW,
  });
}

function value(ledger: Ledger, column: 'run' | 'life', id: string): number {
  const line = ledger[column].find((entry) => entry.id === id);
  expect(line, `thiếu dòng ${column}.${id}`).toBeDefined();
  return line!.value;
}

/** Một ván đã chơi được kha khá: có cơ sở, có quản lý, có số đếm. */
function played(): Store {
  const store = new Store();
  store.state = createNewSave(5);
  store.ready = true;

  const cans = BUSINESSES[0]!;
  store.state.businesses[cans.id] = 120;
  store.state.managers.push(cans.id);
  store.state.upgrades[cans.id] = 2;
  store.state.peakNetWorth = 4e15;
  store.state.bestNetWorth = 4e15;
  store.state.stats.units = 300;
  store.state.stats.taps = 5_000;

  return store;
}

describe('hai cột', () => {
  it('cột lượt về mốc đầu sau khi làm lại', () => {
    const store = played();
    const before = books(store.state);
    expect(value(before, 'run', 'units')).toBe(120);
    expect(value(before, 'run', 'managers')).toBe(1);
    expect(value(before, 'run', 'upgrades')).toBe(2);
    expect(value(before, 'run', 'peak')).toBe(4e15);

    store.prestige();

    const after = books(store.state);
    expect(value(after, 'run', 'units')).toBe(0);
    expect(value(after, 'run', 'managers')).toBe(0);
    expect(value(after, 'run', 'upgrades')).toBe(0);
    expect(value(after, 'run', 'peak')).toBeLessThan(0);
  });

  it('không dòng nào ở cột cả đời tụt xuống sau khi làm lại', () => {
    const store = played();
    const before = books(store.state);

    store.prestige();
    const after = books(store.state);

    for (const line of before.life) {
      expect(value(after, 'life', line.id), line.id).toBeGreaterThanOrEqual(line.value);
    }
  });

  /*
   * Hai con số cùng tên "suất" nằm ở hai cột, và chúng **phải** khác nhau —
   * đó chính là thứ cái bảng này định nói. Bằng nhau thì một trong hai đang đọc
   * nhầm nguồn.
   */
  it('suất đang giữ và suất từng mở là hai con số khác nhau', () => {
    const store = played();
    store.prestige();

    const after = books(store.state);
    expect(value(after, 'run', 'units')).toBe(0);
    expect(value(after, 'life', 'boughtUnits')).toBe(300);
  });

  it('kỷ lục cả đời giữ đúng đỉnh cao nhất từng đạt', () => {
    const store = played();
    store.prestige();
    expect(value(books(store.state), 'life', 'best')).toBe(4e15);
  });
});

describe('số ngày', () => {
  it('đếm từ lúc mở sổ, không phải từ lượt này', () => {
    const store = played();
    store.state.createdAt = NOW - 12.5 * 86_400_000;

    store.prestige();
    expect(value(books(store.state), 'life', 'days')).toBeCloseTo(12.5, 3);
  });

  /* Ván dán từ máy khác có thể mang mốc tạo ở tương lai so với đồng hồ máy này. */
  it('mốc tạo ở tương lai thì ra không, không phải số âm', () => {
    const state = createNewSave(1);
    state.createdAt = NOW + 86_400_000;
    expect(value(books(state), 'life', 'days')).toBe(0);
  });
});

describe('kiểu của từng dòng', () => {
  it('mỗi dòng nói ra kiểu của mình, và nó là một kiểu có thật', () => {
    const kinds = new Set(['money', 'rate', 'count', 'days']);
    const ledger = books(played().state);
    for (const line of [...ledger.run, ...ledger.life]) {
      expect(kinds.has(line.kind), line.id).toBe(true);
      expect(Number.isFinite(line.value), line.id).toBe(true);
    }
  });

  it('không id nào trùng nhau trong cùng một cột', () => {
    const ledger = books(played().state);
    for (const column of [ledger.run, ledger.life]) {
      expect(new Set(column.map((line) => line.id)).size).toBe(column.length);
    }
  });
});
