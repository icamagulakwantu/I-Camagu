import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/db.js', () => ({ default: {} }));

const { postEntryWithBalanceTx } = await import('./ledgerService.js');

// A stand-in transaction: enough to see what the helper writes.
function fakeTx({ balanceCents = 0, hasRow = true, existingEntry = false } = {}) {
  const state = { balanceCents, hasRow, entries: 0 };
  const cents = (v) => Math.round(Number(v) * 100);
  return {
    state,
    $executeRaw: vi.fn(async (strings) => {
      if (strings.join('?').includes('INSERT INTO "LedgerEntry"')) state.entries += 1;
      return 1;
    }),
    $queryRaw: vi.fn(async (strings) => {
      const sql = strings.join('?');
      if (sql.includes('"idempotencyKey" =')) {
        return existingEntry ? [{ id: 'old', seq: 1, hash: 'h' }] : [];
      }
      return [];
    }),
    stokvelGroupLedger: {
      updateMany: vi.fn(async ({ where, data }) => {
        if (!state.hasRow) return { count: 0 };
        if (where.totalBalance?.gte !== undefined && state.balanceCents < cents(where.totalBalance.gte)) return { count: 0 };
        if (data.totalBalance.increment !== undefined) state.balanceCents += cents(data.totalBalance.increment);
        if (data.totalBalance.decrement !== undefined) state.balanceCents -= cents(data.totalBalance.decrement);
        return { count: 1 };
      }),
      create: vi.fn(async ({ data }) => { state.hasRow = true; state.balanceCents = cents(data.totalBalance); }),
    },
  };
}

const entry = (lines) => ({ stokvelId: 's1', kind: 'TEST', lines, idempotencyKey: 'k1', createdById: 'u1', approvedById: 'u2' });
const IN = [{ account: 'BANK', amountCents: 5050 }, { account: 'FINES_INCOME', amountCents: -5050 }];
const OUT = [{ account: 'LOANS_RECEIVABLE', amountCents: 100000 }, { account: 'BANK', amountCents: -100000 }];

describe('postEntryWithBalanceTx (FIN-03)', () => {
  let tx;
  beforeEach(() => { tx = fakeTx({ balanceCents: 150000 }); });

  it('adds money coming in to the stored balance, exactly', async () => {
    await postEntryWithBalanceTx(tx, entry(IN));
    expect(tx.state.balanceCents).toBe(155050);
    expect(tx.state.entries).toBe(1);
  });

  it('takes money going out off the stored balance', async () => {
    await postEntryWithBalanceTx(tx, entry(OUT), { requireFunds: true });
    expect(tx.state.balanceCents).toBe(50000);
  });

  it('refuses to take the balance below zero and leaves it unchanged', async () => {
    tx = fakeTx({ balanceCents: 99999 });
    const out = await postEntryWithBalanceTx(tx, entry(OUT), { requireFunds: true });
    expect(out.fundsShort).toBe(true);
    expect(tx.state.balanceCents).toBe(99999);
  });

  it('does not count the money twice for a repeated entry', async () => {
    tx = fakeTx({ balanceCents: 150000, existingEntry: true });
    const out = await postEntryWithBalanceTx(tx, entry(IN));
    expect(out.duplicate).toBe(true);
    expect(tx.state.balanceCents).toBe(150000);
    expect(tx.stokvelGroupLedger.updateMany).not.toHaveBeenCalled();
  });

  it('creates the stored balance if a stokvel has none yet', async () => {
    tx = fakeTx({ hasRow: false });
    await postEntryWithBalanceTx(tx, entry(IN));
    expect(tx.state.balanceCents).toBe(5050);
  });

  it('fails (so everything rolls back) if money leaves a stokvel with no stored balance', async () => {
    tx = fakeTx({ hasRow: false });
    await expect(postEntryWithBalanceTx(tx, entry(OUT))).rejects.toThrow('no stored group balance');
  });
});
