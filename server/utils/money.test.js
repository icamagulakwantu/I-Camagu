import { describe, it, expect } from 'vitest';
import { toCents, fromCents, splitEvenly } from './money.js';

describe('toCents', () => {
  it('converts whole and decimal amounts exactly', () => {
    expect(toCents('350')).toBe(35000);
    expect(toCents(100.5)).toBe(10050);
    expect(toCents('0.1')).toBe(10);
    expect(toCents('99.99')).toBe(9999);
  });

  it('refuses more than 2 decimals instead of silently rounding money', () => {
    expect(() => toCents('1.005')).toThrow(/2 decimals/);
  });

  it('refuses empty and non-numeric input', () => {
    expect(() => toCents('')).toThrow(/required/);
    expect(() => toCents(null)).toThrow(/required/);
    expect(() => toCents('abc')).toThrow(/number/);
  });
});

describe('fromCents', () => {
  it('formats cents as rand', () => {
    expect(fromCents(35000)).toBe('350.00');
    expect(fromCents(5)).toBe('0.05');
    expect(fromCents(-5)).toBe('-0.05');
  });

  it('refuses fractional cents', () => {
    expect(() => fromCents(1.5)).toThrow();
  });
});

describe('splitEvenly', () => {
  it('always adds back up to the total', () => {
    for (const [total, parts] of [[100000, 3], [1, 3], [99999, 7], [0, 4]]) {
      const split = splitEvenly(total, parts);
      expect(split).toHaveLength(parts);
      expect(split.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });

  it('puts the remainder on the last part', () => {
    expect(splitEvenly(100000, 3)).toEqual([33333, 33333, 33334]);
  });
});
