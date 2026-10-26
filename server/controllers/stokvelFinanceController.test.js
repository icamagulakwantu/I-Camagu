import { describe, it, expect, vi } from 'vitest';

vi.mock('../config/db.js', () => ({ default: {} }));
vi.mock('../services/ledgerService.js', () => ({}));
vi.mock('./stokvelRecordsController.js', () => ({}));

const {
  decideLoanStatus, splitRepayment, parseTradeCredit, tradeCreditSavingCents, canChangeCreditStatus, voteLoan, parseStatementDateRange,
} = await import('./stokvelFinanceController.js');


describe('parseStatementDateRange', () => {
  const now = new Date('2026-10-26T12:00:00.000Z');

  it('accepts valid UTC calendar days and includes the full end date', () => {
    const result = parseStatementDateRange({ from: '2026-02-01', to: '2026-02-28' }, now);
    expect(result.ok).toBe(true);
    expect(result.from.toISOString()).toBe('2026-02-01T00:00:00.000Z');
    expect(result.to.toISOString()).toBe('2026-02-28T23:59:59.999Z');
  });

  it('rejects impossible dates and non-calendar input', () => {
    expect(parseStatementDateRange({ from: '2026-02-31', to: '2026-03-01' }, now).ok).toBe(false);
    expect(parseStatementDateRange({ from: '01/02/2026', to: '2026-03-01' }, now).ok).toBe(false);
    expect(parseStatementDateRange({ from: '2026-01-01T00:00:00Z', to: '2026-03-01' }, now).ok).toBe(false);
  });

  it('rejects a start date after the end date', () => {
    expect(parseStatementDateRange({ from: '2026-10-27', to: '2026-10-26' }, now).ok).toBe(false);
  });

  it('defaults to the current UTC year and current instant', () => {
    const result = parseStatementDateRange({}, now);
    expect(result.ok).toBe(true);
    expect(result.from.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(result.to.toISOString()).toBe(now.toISOString());
  });
});

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

// FIN-04: trade credit amounts are exact cents and never silently rounded.
describe('parseTradeCredit', () => {
  const base = { retailer: 'Mthatha Cash and Carry', amount: '1000.50', discountPercent: '10', months: '12' };

  it('accepts a normal deal and keeps the amount exact', () => {
    const out = parseTradeCredit(base);
    expect(out.ok).toBe(true);
    expect(out.value).toMatchObject({ retailer: 'Mthatha Cash and Carry', amountCents: 100050, discountPercent: '10', months: 12 });
  });

  it('refuses amounts with more than 2 decimals instead of rounding', () => {
    expect(parseTradeCredit({ ...base, amount: '10.005' }).ok).toBe(false);
  });

  it('refuses zero, negative, empty and huge amounts', () => {
    for (const amount of ['0', '-5', '', 'abc', '20000000']) {
      expect(parseTradeCredit({ ...base, amount }).ok).toBe(false);
    }
  });

  it('checks the discount range and decimals', () => {
    expect(parseTradeCredit({ ...base, discountPercent: '12.5' }).ok).toBe(true);
    expect(parseTradeCredit({ ...base, discountPercent: '' }).value.discountPercent).toBe('0');
    expect(parseTradeCredit({ ...base, discountPercent: '91' }).ok).toBe(false);
    expect(parseTradeCredit({ ...base, discountPercent: '-1' }).ok).toBe(false);
    expect(parseTradeCredit({ ...base, discountPercent: '1.234' }).ok).toBe(false);
  });

  it('refuses months outside 1 to 60 instead of quietly using 12', () => {
    expect(parseTradeCredit({ ...base, months: undefined }).value.months).toBe(12);
    expect(parseTradeCredit({ ...base, months: '0' }).ok).toBe(false);
    expect(parseTradeCredit({ ...base, months: '61' }).ok).toBe(false);
    expect(parseTradeCredit({ ...base, months: '2.5' }).ok).toBe(false);
  });

  it('requires a retailer name', () => {
    expect(parseTradeCredit({ ...base, retailer: '   ' }).ok).toBe(false);
  });
});

describe('tradeCreditSavingCents', () => {
  it('works out the saving in whole cents', () => {
    expect(tradeCreditSavingCents(100000, '10')).toBe(10000);
    expect(tradeCreditSavingCents(33333, '12.5')).toBe(4167); // 4166.625 rounds half up
    expect(tradeCreditSavingCents(100000, '0')).toBe(0);
  });
});

describe('canChangeCreditStatus', () => {
  it('only lets an active deal be marked used or cancelled', () => {
    expect(canChangeCreditStatus('ACTIVE', 'USED')).toBe(true);
    expect(canChangeCreditStatus('ACTIVE', 'CANCELLED')).toBe(true);
    expect(canChangeCreditStatus('ACTIVE', 'ACTIVE')).toBe(false);
    expect(canChangeCreditStatus('USED', 'ACTIVE')).toBe(false);
    expect(canChangeCreditStatus('CANCELLED', 'USED')).toBe(false);
  });
});

describe('voteLoan input validation', () => {
  it('rejects string booleans instead of treating "false" as an approval', async () => {
    const res = {
      statusCode: 200,
      body: undefined,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };

    await voteLoan({
      body: { approve: 'false' },
      params: { stokvelId: 'group-1', loanId: 'loan-1' },
      userId: 'official-1',
    }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('boolean');
  });
});
