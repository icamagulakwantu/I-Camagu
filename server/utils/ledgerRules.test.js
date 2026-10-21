import { describe, it, expect } from 'vitest';
import {
  validateLines, assertDistinctDuties, negateLines, computeEntryHash, verifyEntries, GENESIS_HASH,
} from './ledgerRules.js';

const contribution = [
  { account: 'BANK', amountCents: 35000 },
  { account: 'CONTRIBUTIONS', amountCents: -35000 },
];

function buildChain(count) {
  const entries = [];
  let prevHash = GENESIS_HASH;
  for (let seq = 1; seq <= count; seq += 1) {
    const entry = {
      stokvelId: 's1', seq, kind: 'CONTRIBUTION', memo: `Entry ${seq}`, createdById: 'u1', approvedById: 'u2',
      reversesEntryId: null, createdAt: `2026-10-0${seq}T08:00:00.000Z`, prevHash,
      lines: [{ account: 'BANK', amountCents: 1000 * seq }, { account: 'CONTRIBUTIONS', amountCents: -1000 * seq }],
    };
    entry.hash = computeEntryHash(entry);
    prevHash = entry.hash;
    entries.push(entry);
  }
  return entries;
}

describe('validateLines', () => {
  it('accepts a balanced entry', () => {
    expect(() => validateLines(contribution)).not.toThrow();
  });

  it('rejects an entry that does not balance', () => {
    expect(() => validateLines([{ account: 'BANK', amountCents: 100 }, { account: 'CONTRIBUTIONS', amountCents: -99 }])).toThrow(/balance/);
  });

  it('rejects a single line, unknown accounts, zero and fractional amounts', () => {
    expect(() => validateLines([{ account: 'BANK', amountCents: 0 }])).toThrow();
    expect(() => validateLines([{ account: 'NOPE', amountCents: 5 }, { account: 'BANK', amountCents: -5 }])).toThrow(/Unknown account/);
    expect(() => validateLines([{ account: 'BANK', amountCents: 0 }, { account: 'EXPENSES', amountCents: 0 }])).toThrow(/zero/);
    expect(() => validateLines([{ account: 'BANK', amountCents: 1.5 }, { account: 'EXPENSES', amountCents: -1.5 }])).toThrow(/whole cents/);
  });
});

describe('assertDistinctDuties', () => {
  it('refuses the same person recording and approving', () => {
    expect(() => assertDistinctDuties({ createdById: 'u1', approvedById: 'u1' })).toThrow(/cannot also approve/);
  });

  it('allows different people, and entries not yet approved', () => {
    expect(() => assertDistinctDuties({ createdById: 'u1', approvedById: 'u2' })).not.toThrow();
    expect(() => assertDistinctDuties({ createdById: 'u1', approvedById: null })).not.toThrow();
  });
});

describe('negateLines', () => {
  it('makes a reversal that cancels the original exactly', () => {
    const reversal = negateLines(contribution);
    const combined = [...contribution, ...reversal];
    const byAccount = {};
    for (const l of combined) byAccount[l.account] = (byAccount[l.account] || 0) + l.amountCents;
    expect(Object.values(byAccount).every((v) => v === 0)).toBe(true);
    expect(() => validateLines(reversal)).not.toThrow();
  });
});

describe('computeEntryHash', () => {
  const base = {
    stokvelId: 's1', seq: 1, kind: 'CONTRIBUTION', memo: 'x', createdById: 'u1', approvedById: null,
    reversesEntryId: null, createdAt: '2026-10-01T08:00:00.000Z', prevHash: GENESIS_HASH, lines: contribution,
  };

  it('is the same whatever order the lines are in', () => {
    expect(computeEntryHash(base)).toBe(computeEntryHash({ ...base, lines: [...contribution].reverse() }));
  });

  it('changes if any amount, person or memo changes', () => {
    const original = computeEntryHash(base);
    expect(computeEntryHash({ ...base, lines: [{ account: 'BANK', amountCents: 35100 }, { account: 'CONTRIBUTIONS', amountCents: -35100 }] })).not.toBe(original);
    expect(computeEntryHash({ ...base, createdById: 'u9' })).not.toBe(original);
    expect(computeEntryHash({ ...base, memo: 'y' })).not.toBe(original);
  });
});

describe('verifyEntries (tamper evidence)', () => {
  it('passes an untouched chain', () => {
    const result = verifyEntries(buildChain(3));
    expect(result.ok).toBe(true);
    expect(result.nextSeq).toBe(4);
  });

  it('catches an amount quietly changed after the fact', () => {
    const chain = buildChain(3);
    chain[1].lines = [{ account: 'BANK', amountCents: 9999 }, { account: 'CONTRIBUTIONS', amountCents: -9999 }];
    expect(verifyEntries(chain)).toEqual({ ok: false, brokenAtSeq: 2 });
  });

  it('catches an entry that was deleted from the middle', () => {
    const chain = buildChain(3);
    expect(verifyEntries([chain[0], chain[2]])).toEqual({ ok: false, brokenAtSeq: 2 });
  });

  it('catches an entry removed from the start', () => {
    const chain = buildChain(3);
    expect(verifyEntries(chain.slice(1)).ok).toBe(false);
  });

  it('can verify in batches by carrying the state forward', () => {
    const chain = buildChain(4);
    const first = verifyEntries(chain.slice(0, 2));
    expect(first.ok).toBe(true);
    const second = verifyEntries(chain.slice(2), { prevHash: first.prevHash, nextSeq: first.nextSeq });
    expect(second.ok).toBe(true);
    expect(second.nextSeq).toBe(5);
  });
});
