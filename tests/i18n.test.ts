import { describe, expect, it } from 'vitest';

import { BUSINESSES, DISTRICTS } from '../src/game/businesses';
import { FAIRS } from '../src/game/fair';
import { ledgerOf } from '../src/game/ledger';
import { createNewSave } from '../src/game/state';
import { JOBS } from '../src/game/jobs';
import { MILESTONES } from '../src/game/life';
import { STOCKS } from '../src/game/stocks';
import { t } from '../src/i18n';
import { en } from '../src/i18n/en';
import { vi } from '../src/i18n/vi';

describe('the dictionaries', () => {
  it('carry exactly the same keys', () => {
    const inVi = Object.keys(vi).sort();
    const inEn = Object.keys(en).sort();

    // Listed rather than counted: a mismatch should say which key.
    expect(inEn.filter((key) => !(key in vi))).toEqual([]);
    expect(inVi.filter((key) => !(key in en))).toEqual([]);
  });

  it('never leaves a string empty', () => {
    for (const [key, text] of Object.entries(vi)) expect(text.trim(), key).not.toBe('');
    for (const [key, text] of Object.entries(en)) expect(text.trim(), key).not.toBe('');
  });

  it('uses the same placeholders on both sides', () => {
    const slots = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

    for (const key of Object.keys(vi)) {
      expect(slots(en[key] ?? ''), key).toEqual(slots(vi[key] ?? ''));
    }
  });
});

describe('every id the game can show', () => {
  it('has a name in both languages', () => {
    const keys = [
      ...DISTRICTS.map((id) => `district.${id}`),
      ...BUSINESSES.map((def) => `biz.${def.id}`),
      ...JOBS.flatMap((job) => [`job.${job.id}`, `job.${job.id}.desc`]),
      ...MILESTONES.flatMap((m) => [`life.${m.id}`, `life.${m.id}.line`]),
      ...STOCKS.map((stock) => `stock.${stock.id}`),
      ...new Set(STOCKS.map((stock) => `sector.${stock.sector}`)),
      ...FAIRS.flatMap((fair) => [`fair.${fair.id}`, `fair.buff.${fair.id}`, `fair.goal.${fair.id}`]),
      ...ledgerLines(),
    ];

    expect(keys.filter((key) => !(key in vi))).toEqual([]);
    expect(keys.filter((key) => !(key in en))).toEqual([]);
  });
});

/**
 * Dòng sổ sách lấy từ chính hàm dựng sổ, không chép tay lại.
 *
 * Thêm một dòng vào `ledger.ts` mà quên chữ cho nó thì màn hình hiện ra đúng
 * cái id — `ledger.trades` nằm giữa hai con số. Chép tay danh sách ở đây thì
 * bài kiểm chỉ canh được những dòng đã có hôm nay.
 */
function ledgerLines(): string[] {
  const books = ledgerOf(createNewSave(1), {
    income: 0,
    pendingReputation: 0,
    now: Date.now(),
  });
  return [...books.run, ...books.life].map((line) => `ledger.${line.id}`);
}

describe('lookup', () => {
  it('fills placeholders and leaves unknown ones alone', () => {
    expect(t('grind.locked', { amount: '-$990K' })).toContain('-$990K');
    expect(t('empire.milestone', {})).toContain('{count}');
  });

  it('returns the key itself when there is no string, so the gap is visible', () => {
    expect(t('nope.not.a.key')).toBe('nope.not.a.key');
  });
});
