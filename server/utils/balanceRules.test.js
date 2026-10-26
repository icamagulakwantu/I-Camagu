import { describe, it, expect } from 'vitest';
import { bankDeltaCents, decimalTextToCents, summariseBalanceCheck } from './balanceRules.js';

// FIN-03: the stored group balance must always move by exactly the books'
// BANK amount, and the check must report any difference, never round it away.
describe('bankDeltaCents', () => {
  it('adds money coming in and takes off money going out', () => {
    expect(bankDeltaCents([{ account: 'BANK', amountCents: 5000 }, { account: 'FINES_INCOME', amountCents: -5000 }])).toBe(5000);
    expect(bankDeltaCents([{ account: 'LOANS_RECEIVABLE', amountCents: 100000 }, { account: 'BANK', amountCents: -100000 }])).toBe(-100000);
  });

  it('is zero for an entry that does not touch the bank', () => {
    expect(bankDeltaCents([{ account: 'EXPENSES', amountCents: 10 }, { account: 'BANK_FEES', amountCents: -10 }])).toBe(0);
    expect(bankDeltaCents([])).toBe(0);
  });

  it('counts a repayment split into principal and interest as one bank amount', () => {
    expect(bankDeltaCents([
      { account: 'BANK', amountCents: 20000 },
      { account: 'LOANS_RECEIVABLE', amountCents: -10000 },
      { account: 'INTEREST_INCOME', amountCents: -10000 },
    ])).toBe(20000);
  });
});

describe('decimalTextToCents', () => {
  it('reads database amounts exactly', () => {
    expect(decimalTextToCents('350.50')).toEqual({ cents: 35050, belowCent: false });
    expect(decimalTextToCents('12')).toEqual({ cents: 1200, belowCent: false });
    expect(decimalTextToCents('-0.10')).toEqual({ cents: -10, belowCent: false });
    expect(decimalTextToCents('0.000')).toEqual({ cents: 0, belowCent: false });
  });

  it('flags a fraction of a cent instead of rounding it', () => {
    expect(decimalTextToCents('10.005')).toEqual({ cents: 1000, belowCent: true });
  });

  it('refuses text that is not an amount', () => {
    expect(() => decimalTextToCents('abc')).toThrow();
    expect(() => decimalTextToCents('')).toThrow();
  });
});

describe('summariseBalanceCheck', () => {
  it('agrees when the stored balance equals the books', () => {
    const out = summariseBalanceCheck({ storedText: '1500.25', bookBankCents: 150025 });
    expect(out.agrees).toBe(true);
    expect(out.differenceCents).toBe(0);
  });

  it('reports a loan paid out on the books but not taken off the stored balance', () => {
    const out = summariseBalanceCheck({ storedText: '2000.00', bookBankCents: 100000 });
    expect(out.agrees).toBe(false);
    expect(out.differenceCents).toBe(100000);
    expect(out.message).toBe('The stored balance is R1000.00 more than the books show.');
  });

  it('reports a stored balance lower than the books', () => {
    const out = summariseBalanceCheck({ storedText: '0.00', bookBankCents: 5050 });
    expect(out.message).toBe('The stored balance is R50.50 less than the books show.');
  });

  it('does not hide a fraction of a cent', () => {
    const out = summariseBalanceCheck({ storedText: '10.005', bookBankCents: 1000 });
    expect(out.agrees).toBe(false);
    expect(out.storedHasFractionOfCent).toBe(true);
  });

  it('treats a missing stored balance as zero and says so', () => {
    const out = summariseBalanceCheck({ storedText: null, bookBankCents: 0 });
    expect(out).toMatchObject({ agrees: true, storedMissing: true });
  });
});
