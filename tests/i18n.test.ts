import { describe, expect, it } from 'vitest';

import { BUSINESSES, DISTRICTS } from '../src/game/businesses';
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
    ];

    expect(keys.filter((key) => !(key in vi))).toEqual([]);
    expect(keys.filter((key) => !(key in en))).toEqual([]);
  });
});

describe('lookup', () => {
  it('fills placeholders and leaves unknown ones alone', () => {
    expect(t('grind.locked', { amount: '-$990K' })).toContain('-$990K');
    expect(t('empire.milestone', {})).toContain('{count}');
  });

  it('returns the key itself when there is no string, so the gap is visible', () => {
    expect(t('nope.not.a.key')).toBe('nope.not.a.key');
  });
});
