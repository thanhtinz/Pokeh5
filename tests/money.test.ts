import { describe, expect, it } from 'vitest';

import { clock, count, duration, money, signedPercent } from '../src/game/money';

describe('money', () => {
  it('keeps the minus sign outside the currency symbol', () => {
    expect(money(-1_000_000)).toBe('-$1M');
    expect(money(-999_999)).toBe('-$1000K');
  });

  it('formats the opening balance the way the game says it', () => {
    expect(money(-1e6)).toBe('-$1M');
    expect(money(0)).toBe('$0');
  });

  it('counts cents only while they still matter', () => {
    expect(money(4.5)).toBe('$4.5');
    expect(money(45)).toBe('$45');
    expect(money(4500)).toBe('$4.5K');
  });

  it('runs past the short scale without losing precision', () => {
    expect(money(1e15)).toBe('$1aa');
    expect(money(1.234e18)).toBe('$1.234ab');
    expect(money(9.87e22)).toBe('$98.7ac');
  });

  it('survives infinities rather than printing NaN', () => {
    expect(money(Infinity)).toBe('$∞');
    expect(money(-Infinity)).toBe('-$∞');
  });

  it('drops the currency symbol for plain counts', () => {
    expect(count(1_500)).toBe('1.5K');
  });
});

describe('clocks', () => {
  it('reads as a stopwatch under a minute and a clock over it', () => {
    expect(clock(12)).toBe('12s');
    expect(clock(64)).toBe('1:04');
    expect(clock(7530)).toBe('2:05:30');
  });

  it('reads as prose for the offline dialog', () => {
    expect(duration(11_520)).toBe('3h 12m');
    expect(duration(90)).toBe('1m');
  });
});

describe('percentages', () => {
  it('always signs a market move', () => {
    expect(signedPercent(0.024)).toBe('+2.40%');
    expect(signedPercent(-0.008)).toBe('-0.80%');
  });
});
