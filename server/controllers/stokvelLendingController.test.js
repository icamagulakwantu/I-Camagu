import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/db.js', () => ({ default: {} }));
vi.mock('./stokvelRecordsController.js', () => ({}));

const { parseAmountCents, dbCents, lendingProgress } = await import('./stokvelLendingController.js');

// FIN-04: lending round and target amounts are exact cents.
describe('parseAmountCents', () => {
  it('converts amounts exactly', () => {
    expect(parseAmountCents('0.10')).toBe(10);
    expect(parseAmountCents('1500')).toBe(150000);
    expect(parseAmountCents(99.99)).toBe(9999);
  });

  it('refuses more than 2 decimals instead of rounding', () => {
    expect(parseAmountCents('10.005')).toBeNull();
  });

  it('refuses empty, non-numeric, negative and huge amounts', () => {
    for (const raw of [undefined, null, '', 'abc', '-1', '10000000.01']) {
      expect(parseAmountCents(raw)).toBeNull();
    }
  });

  it('refuses zero unless zero is allowed (nothing came back)', () => {
    expect(parseAmountCents('0')).toBeNull();
    expect(parseAmountCents('0', { minCents: 0 })).toBe(0);
  });
});

describe('dbCents', () => {
  it('reads database totals exactly', () => {
    expect(dbCents('0.30')).toBe(30);
    expect(dbCents('123456.78')).toBe(12345678);
    expect(dbCents(null)).toBe(0);
  });
});

describe('lendingProgress', () => {
  it('counts only the profit and never goes below zero', () => {
    expect(lendingProgress({ lentCents: 100000, returnedCents: 110000, targetCents: 50000 }))
      .toEqual({ raisedCents: 10000, percent: 20 });
    expect(lendingProgress({ lentCents: 100000, returnedCents: 90000, targetCents: 50000 }))
      .toEqual({ raisedCents: 0, percent: 0 });
  });

  it('caps at 100% and handles no target', () => {
    expect(lendingProgress({ lentCents: 0, returnedCents: 999999, targetCents: 1000 }).percent).toBe(100);
    expect(lendingProgress({ lentCents: 0, returnedCents: 5000, targetCents: 0 }).percent).toBe(0);
  });

  it('does not show 100% until the target is fully reached', () => {
    // 99.99% must not round up to "Target reached"
    expect(lendingProgress({ lentCents: 0, returnedCents: 1999899, targetCents: 2000000 }).percent).toBe(99);
  });

  it('adds up small amounts without drifting by a cent', () => {
    // 0.10 + 0.20 as floats is 0.30000000000000004; in cents it is exact.
    expect(lendingProgress({ lentCents: 0, returnedCents: dbCents('0.10') + dbCents('0.20'), targetCents: 30 }))
      .toEqual({ raisedCents: 30, percent: 100 });
  });
});
