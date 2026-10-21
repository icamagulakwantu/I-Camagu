import { splitEvenly } from './money.js';

// Loan terms must be agreed and stated, never assumed. There is deliberately
// no default interest rate in this file: a missing rate is an error.

export const RATE_BASES = ['ONE_TIME_FLAT', 'MONTHLY_FLAT', 'MONTHLY_REDUCING'];

export const RATE_BASIS_LABEL = {
  ONE_TIME_FLAT: 'one-time, on the amount borrowed',
  MONTHLY_FLAT: 'per month, on the amount borrowed',
  MONTHLY_REDUCING: 'per month, on the balance still owed',
};

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// Returns { ok: true, terms } or { ok: false, error }.
export function parseTerms({ interestPercent, rateBasis, months }) {
  if (isBlank(interestPercent)) {
    return { ok: false, error: 'Enter the interest rate your group agreed (use 0 for no interest)' };
  }
  const rate = Number(interestPercent);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
    return { ok: false, error: 'Interest must be between 0 and 100%' };
  }
  const monthCount = Number(months);
  if (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 36) {
    return { ok: false, error: 'Repayment period must be 1 to 36 months' };
  }
  // With no interest the basis changes nothing, so it need not be chosen.
  const basis = rate === 0 && isBlank(rateBasis) ? 'ONE_TIME_FLAT' : rateBasis;
  if (!RATE_BASES.includes(basis)) {
    return { ok: false, error: 'Say how the interest is charged (one-time, per month, or on the balance)' };
  }
  return { ok: true, terms: { interestPercent: rate, rateBasis: basis, months: monthCount } };
}

// Dated instalments are added by the caller; this returns amounts only, in cents,
// and every column adds up exactly to the totals.
export function buildSchedule({ principalCents, ratePercent, rateBasis, months }) {
  if (!Number.isInteger(principalCents) || principalCents <= 0) throw new Error('Principal must be above zero');
  if (!RATE_BASES.includes(rateBasis)) throw new Error('Unknown rate basis');
  if (!Number.isInteger(months) || months < 1) throw new Error('Months must be at least 1');

  const instalments = rateBasis === 'MONTHLY_REDUCING' && ratePercent > 0
    ? reducingBalance(principalCents, ratePercent, months)
    : flat(principalCents, ratePercent, rateBasis, months);

  const totalInterestCents = instalments.reduce((s, i) => s + i.interestCents, 0);
  return {
    totalInterestCents,
    totalDueCents: principalCents + totalInterestCents,
    instalments: instalments.map((i, index) => ({ n: index + 1, ...i, totalCents: i.principalCents + i.interestCents })),
  };
}

function flat(principalCents, ratePercent, rateBasis, months) {
  const periods = rateBasis === 'MONTHLY_FLAT' ? months : 1;
  const interestCents = Math.round((principalCents * ratePercent * periods) / 100);
  const principalParts = splitEvenly(principalCents, months);
  const interestParts = splitEvenly(interestCents, months);
  return principalParts.map((principal, i) => ({ principalCents: principal, interestCents: interestParts[i] }));
}

function reducingBalance(principalCents, ratePercent, months) {
  const r = ratePercent / 100;
  const payment = Math.round((principalCents * r) / (1 - Math.pow(1 + r, -months)));
  const rows = [];
  let balance = principalCents;
  for (let m = 1; m <= months; m += 1) {
    const interestCents = Math.round(balance * r);
    // The final instalment clears whatever is left, so rounding never strands a few cents.
    const principal = m === months ? balance : Math.min(balance, payment - interestCents);
    rows.push({ principalCents: principal, interestCents });
    balance -= principal;
  }
  return rows;
}

// Loans made before agreed terms were stored have no snapshot; they keep the
// one-time flat calculation they were originally created under.
export function totalDueFor(row) {
  const snapshot = row.termsSnapshot;
  if (snapshot && Number.isInteger(snapshot.totalDueCents)) return snapshot.totalDueCents / 100;
  return Number(row.amount) * (1 + Number(row.interestPercent) / 100);
}
