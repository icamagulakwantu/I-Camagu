import { describe, it, expect } from 'vitest';
import { parseTerms, buildSchedule, totalDueFor } from './loanTerms.js';

describe('parseTerms: no silent default rate', () => {
  it('rejects a missing, blank or null interest rate', () => {
    expect(parseTerms({ months: 3 }).ok).toBe(false);
    expect(parseTerms({ interestPercent: '', rateBasis: 'ONE_TIME_FLAT', months: 3 }).ok).toBe(false);
    expect(parseTerms({ interestPercent: null, rateBasis: 'ONE_TIME_FLAT', months: 3 }).ok).toBe(false);
  });

  it('accepts an explicit 0% without a basis', () => {
    const result = parseTerms({ interestPercent: 0, months: 3 });
    expect(result.ok).toBe(true);
    expect(result.terms.interestPercent).toBe(0);
  });

  it('requires a basis once there is interest', () => {
    expect(parseTerms({ interestPercent: 30, months: 3 }).ok).toBe(false);
    expect(parseTerms({ interestPercent: 30, rateBasis: 'WHATEVER', months: 3 }).ok).toBe(false);
    expect(parseTerms({ interestPercent: 30, rateBasis: 'ONE_TIME_FLAT', months: 3 }).ok).toBe(true);
  });

  it('enforces rate and period limits', () => {
    expect(parseTerms({ interestPercent: 101, rateBasis: 'ONE_TIME_FLAT', months: 3 }).ok).toBe(false);
    expect(parseTerms({ interestPercent: -1, rateBasis: 'ONE_TIME_FLAT', months: 3 }).ok).toBe(false);
    expect(parseTerms({ interestPercent: 10, rateBasis: 'ONE_TIME_FLAT', months: 0 }).ok).toBe(false);
    expect(parseTerms({ interestPercent: 10, rateBasis: 'ONE_TIME_FLAT', months: 37 }).ok).toBe(false);
  });
});

describe('buildSchedule', () => {
  it('one-time flat: R1000 at 30% over 3 months is R1300 with exact instalments', () => {
    const s = buildSchedule({ principalCents: 100000, ratePercent: 30, rateBasis: 'ONE_TIME_FLAT', months: 3 });
    expect(s.totalInterestCents).toBe(30000);
    expect(s.totalDueCents).toBe(130000);
    expect(s.instalments.map((i) => i.totalCents)).toEqual([43333, 43333, 43334]);
  });

  it('monthly flat: 10% a month for 3 months on R1000 is R300 interest', () => {
    const s = buildSchedule({ principalCents: 100000, ratePercent: 10, rateBasis: 'MONTHLY_FLAT', months: 3 });
    expect(s.totalInterestCents).toBe(30000);
    expect(s.totalDueCents).toBe(130000);
  });

  it('zero interest repays exactly the amount borrowed', () => {
    const s = buildSchedule({ principalCents: 100000, ratePercent: 0, rateBasis: 'ONE_TIME_FLAT', months: 3 });
    expect(s.totalInterestCents).toBe(0);
    expect(s.totalDueCents).toBe(100000);
  });

  it('reducing balance costs less than the same rate charged flat, and clears to zero', () => {
    const reducing = buildSchedule({ principalCents: 100000, ratePercent: 12, rateBasis: 'MONTHLY_REDUCING', months: 3 });
    const flatEquivalent = buildSchedule({ principalCents: 100000, ratePercent: 12, rateBasis: 'MONTHLY_FLAT', months: 3 });
    expect(reducing.totalInterestCents).toBeGreaterThan(0);
    expect(reducing.totalInterestCents).toBeLessThan(flatEquivalent.totalInterestCents);
    expect(reducing.instalments.reduce((s, i) => s + i.principalCents, 0)).toBe(100000);
  });

  it('instalments always add up exactly to the totals, whatever the inputs', () => {
    const cases = [
      { principalCents: 99999, ratePercent: 7.5, rateBasis: 'ONE_TIME_FLAT', months: 7 },
      { principalCents: 1, ratePercent: 30, rateBasis: 'ONE_TIME_FLAT', months: 3 },
      { principalCents: 123457, ratePercent: 2.5, rateBasis: 'MONTHLY_FLAT', months: 11 },
      { principalCents: 250000, ratePercent: 5, rateBasis: 'MONTHLY_REDUCING', months: 11 },
      { principalCents: 35000, ratePercent: 0, rateBasis: 'MONTHLY_REDUCING', months: 6 },
    ];
    for (const c of cases) {
      const s = buildSchedule(c);
      expect(s.instalments).toHaveLength(c.months);
      expect(s.instalments.reduce((a, i) => a + i.principalCents, 0)).toBe(c.principalCents);
      expect(s.instalments.reduce((a, i) => a + i.interestCents, 0)).toBe(s.totalInterestCents);
      expect(s.instalments.reduce((a, i) => a + i.totalCents, 0)).toBe(s.totalDueCents);
    }
  });

  it('rejects nonsense input', () => {
    expect(() => buildSchedule({ principalCents: 0, ratePercent: 5, rateBasis: 'ONE_TIME_FLAT', months: 3 })).toThrow();
    expect(() => buildSchedule({ principalCents: 1000, ratePercent: 5, rateBasis: 'NOPE', months: 3 })).toThrow();
  });
});

describe('totalDueFor', () => {
  it('uses the stored terms when a loan has them, so later settings changes cannot rewrite it', () => {
    expect(totalDueFor({ amount: '1000', interestPercent: '30', termsSnapshot: { totalDueCents: 110000 } })).toBe(1100);
  });

  it('keeps the original flat calculation for loans made before terms were stored', () => {
    expect(totalDueFor({ amount: '1000', interestPercent: '30', termsSnapshot: null })).toBe(1300);
  });
});
