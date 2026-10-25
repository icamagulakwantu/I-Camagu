import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/db.js', () => ({ default: {} }));
vi.mock('../services/ledgerService.js', () => ({}));
vi.mock('./stokvelRecordsController.js', () => ({}));

const { decideLoanStatus, splitRepayment } = await import('./stokvelFinanceController.js');

describe('decideLoanStatus', () => {
  it('stays pending until enough officials agree', () => {
    expect(decideLoanStatus({ yes: 1, no: 0, requiredApprovals: 2 })).toBe('PENDING');
    expect(decideLoanStatus({ yes: 1, no: 1, requiredApprovals: 2 })).toBe('PENDING');
  });

  it('approves or rejects once the required number is reached', () => {
    expect(decideLoanStatus({ yes: 2, no: 0, requiredApprovals: 2 })).toBe('APPROVED');
    expect(decideLoanStatus({ yes: 0, no: 2, requiredApprovals: 2 })).toBe('REJECTED');
  });
});

// Repayments pay off the amount borrowed first, then the interest, so the
// books split each repayment correctly between the two.
describe('splitRepayment', () => {
  it('counts a repayment as principal while principal is still owed', () => {
    expect(splitRepayment({ amountCents: 30000, principalCents: 100000, paidBeforeCents: 0 }))
      .toEqual({ principalPart: 30000, interestPart: 0 });
  });

  it('splits a repayment that crosses from principal into interest', () => {
    expect(splitRepayment({ amountCents: 20000, principalCents: 100000, paidBeforeCents: 90000 }))
      .toEqual({ principalPart: 10000, interestPart: 10000 });
  });

  it('counts everything as interest once principal is paid', () => {
    expect(splitRepayment({ amountCents: 5000, principalCents: 100000, paidBeforeCents: 100000 }))
      .toEqual({ principalPart: 0, interestPart: 5000 });
  });
});
