import { createHash } from 'crypto';

// Pure rules for the stokvel ledger. No database in here, so every rule can be
// unit tested. Convention: each line is a signed amount in cents; positive is a
// debit, negative a credit, and every entry must add up to exactly zero.

export const ACCOUNTS = [
  'BANK',
  'CONTRIBUTIONS',
  'LOANS_RECEIVABLE',
  'INTEREST_INCOME',
  'FINES_INCOME',
  'EXPENSES',
  'PAYOUTS',
  'BANK_FEES',
  'BANK_INTEREST',
  'OPENING_BALANCE',
];

export const GENESIS_HASH = '0'.repeat(64);

export class LedgerError extends Error {}

export function validateLines(lines) {
  if (!Array.isArray(lines) || lines.length < 2) throw new LedgerError('An entry needs at least two lines');
  let sum = 0;
  for (const line of lines) {
    if (!ACCOUNTS.includes(line.account)) throw new LedgerError(`Unknown account: ${line.account}`);
    if (!Number.isSafeInteger(line.amountCents)) throw new LedgerError('Line amounts must be whole cents');
    if (line.amountCents === 0) throw new LedgerError('A line cannot be zero');
    sum += line.amountCents;
  }
  if (sum !== 0) throw new LedgerError('Entry does not balance: debits and credits must be equal');
}

// The person who records a movement cannot also be the one who approves it.
export function assertDistinctDuties({ createdById, approvedById }) {
  if (approvedById && createdById === approvedById) {
    throw new LedgerError('The person who recorded this cannot also approve it');
  }
}

// Reversal lines: same accounts, opposite signs.
export function negateLines(lines) {
  return lines.map((l) => ({ account: l.account, amountCents: -l.amountCents }));
}

export function computeEntryHash(entry) {
  const lines = [...entry.lines]
    .map((l) => [l.account, l.amountCents])
    .sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] < b[0] ? -1 : 1));
  const canonical = JSON.stringify([
    entry.prevHash, entry.stokvelId, entry.seq, entry.kind, entry.memo ?? '',
    entry.createdById, entry.approvedById ?? '', entry.reversesEntryId ?? '',
    entry.createdAt, lines,
  ]);
  return createHash('sha256').update(canonical).digest('hex');
}

// Checks a run of entries in order. `state` is where the previous batch ended.
// A change, a deleted entry, or a gap in the sequence all break the chain.
export function verifyEntries(entries, state = { prevHash: GENESIS_HASH, nextSeq: 1 }) {
  let { prevHash, nextSeq } = state;
  for (const entry of entries) {
    if (entry.seq !== nextSeq) return { ok: false, brokenAtSeq: nextSeq };
    if (entry.prevHash !== prevHash) return { ok: false, brokenAtSeq: entry.seq };
    try {
      validateLines(entry.lines);
    } catch {
      return { ok: false, brokenAtSeq: entry.seq };
    }
    if (computeEntryHash(entry) !== entry.hash) return { ok: false, brokenAtSeq: entry.seq };
    prevHash = entry.hash;
    nextSeq += 1;
  }
  return { ok: true, prevHash, nextSeq };
}
