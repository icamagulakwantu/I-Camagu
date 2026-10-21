// Money is handled as whole cents (integers) everywhere in the ledger, so
// R0.10 + R0.20 is always exactly R0.30 and totals never drift by a cent.

const AMOUNT_PATTERN = /^-?\d+(\.\d{1,2})?$/;

// Accepts "350", "100.5", 99.99. Refuses anything with more than 2 decimals
// rather than silently rounding someone's money.
export function toCents(value) {
  if (value === null || value === undefined) throw new Error('Amount is required');
  const text = String(value).trim();
  if (text === '') throw new Error('Amount is required');
  if (!AMOUNT_PATTERN.test(text)) throw new Error('Amount must be a number with at most 2 decimals');
  const negative = text.startsWith('-');
  const [rand, cents = ''] = text.replace('-', '').split('.');
  const total = Number(rand) * 100 + Number(cents.padEnd(2, '0'));
  if (!Number.isSafeInteger(total)) throw new Error('Amount is too large');
  return negative ? -total : total;
}

export function fromCents(cents) {
  if (!Number.isInteger(cents)) throw new Error('Cents must be a whole number');
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`;
}

// Splits a total into n parts that add up exactly; the last part takes the remainder.
export function splitEvenly(totalCents, parts) {
  if (!Number.isInteger(parts) || parts < 1) throw new Error('Parts must be at least 1');
  const base = Math.floor(totalCents / parts);
  const result = Array(parts).fill(base);
  result[parts - 1] += totalCents - base * parts;
  return result;
}
