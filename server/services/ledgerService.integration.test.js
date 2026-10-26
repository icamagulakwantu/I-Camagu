import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import {
  ensureLedgerTables,
  postEntryWithBalanceTx,
  verifyLedger,
  checkStokvelBalance,
} from './ledgerService.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

integrationDescribe('PostgreSQL ledger integration (real database)', () => {
  let stokvelId;
  let userId;

  beforeAll(async () => {
    await ensureLedgerTables();
    const user = await prisma.user.create({
      data: {
        email: `ledger-integration-${randomUUID()}@example.invalid`,
        firstName: 'Integration',
        lastName: 'Test',
      },
      select: { id: true },
    });
    userId = user.id;
    const stokvel = await prisma.stokvel.create({
      data: {
        name: 'Disposable ledger integration test',
        type: 'CEREMONY_SAVINGS',
        bankingTrack: 'AFRICAN_BANK',
        organiserId: userId,
      },
      select: { id: true },
    });
    stokvelId = stokvel.id;
    await prisma.stokvelGroupLedger.create({
      data: { stokvelId, totalBalance: 0 },
    });

    // Establish the opening balance in the books and stored balance together.
    await prisma.$transaction((tx) => postEntryWithBalanceTx(tx, {
      stokvelId,
      kind: 'OPENING_BALANCE',
      memo: 'Integration-test opening balance',
      idempotencyKey: `opening:${stokvelId}`,
      createdById: userId,
      lines: [
        { account: 'BANK', amountCents: 10_000 },
        { account: 'OPENING_BALANCE', amountCents: -10_000 },
      ],
    }));
  });

  afterAll(async () => {
    // This job uses a fresh, disposable PostgreSQL service for each workflow run.
    await prisma.$disconnect();
  });

  it('serializes concurrent spending so the balance cannot go below zero', async () => {
    const spend = (idempotencyKey) => prisma.$transaction(async (tx) => {
      const result = await postEntryWithBalanceTx(tx, {
        stokvelId,
        kind: 'POOL_PAYMENT',
        memo: 'Concurrent spend race test',
        idempotencyKey,
        createdById: userId,
        lines: [
          { account: 'BANK', amountCents: -7_000 },
          { account: 'PAYOUTS', amountCents: 7_000 },
        ],
      }, { requireFunds: true });

      if (result.fundsShort) {
        // Throwing is essential: it rolls the just-written books entry back.
        throw new Error('INSUFFICIENT_TEST_FUNDS');
      }
      return result;
    });

    const results = await Promise.allSettled([
      spend(`race-a:${stokvelId}`),
      spend(`race-b:${stokvelId}`),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const balance = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    expect(Number(balance.totalBalance)).toBe(30);

    const check = await checkStokvelBalance(stokvelId);
    expect(check.agrees).toBe(true);
    expect(check.storedCents).toBe(3_000);
    expect(check.bookBankCents).toBe(3_000);

    const verification = await verifyLedger(stokvelId);
    expect(verification).toMatchObject({ ok: true, complete: true, checked: 2 });
  });

  it('is idempotent: retrying the same entry does not double-count money', async () => {
    const entry = {
      stokvelId,
      kind: 'CONTRIBUTION',
      memo: 'Idempotency integration test',
      idempotencyKey: `retry:${stokvelId}`,
      createdById: userId,
      lines: [
        { account: 'BANK', amountCents: 500 },
        { account: 'CONTRIBUTIONS', amountCents: -500 },
      ],
    };

    const first = await prisma.$transaction((tx) => postEntryWithBalanceTx(tx, entry));
    const second = await prisma.$transaction((tx) => postEntryWithBalanceTx(tx, entry));

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
    const balance = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    expect(Number(balance.totalBalance)).toBe(35);
    expect((await verifyLedger(stokvelId)).ok).toBe(true);
  });

  it('rolls back both ledger entry and balance when a transaction fails', async () => {
    const before = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    const entriesBefore = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM "LedgerEntry" WHERE "stokvelId" = ${stokvelId}
    `;

    await expect(prisma.$transaction(async (tx) => {
      await postEntryWithBalanceTx(tx, {
        stokvelId,
        kind: 'CONTRIBUTION',
        memo: 'Must roll back with transaction',
        idempotencyKey: `rollback:${stokvelId}`,
        createdById: userId,
        lines: [
          { account: 'BANK', amountCents: 1_000 },
          { account: 'CONTRIBUTIONS', amountCents: -1_000 },
        ],
      });
      throw new Error('FORCE_ROLLBACK');
    })).rejects.toThrow('FORCE_ROLLBACK');

    const after = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    const entriesAfter = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM "LedgerEntry" WHERE "stokvelId" = ${stokvelId}
    `;
    expect(Number(after.totalBalance)).toBe(Number(before.totalBalance));
    expect(entriesAfter[0].count).toBe(entriesBefore[0].count);
    expect((await verifyLedger(stokvelId)).ok).toBe(true);
  });

  it('rejects two concurrent final spends when only one can be funded', async () => {
    // Both attempts use distinct idempotency keys; the ledger's advisory lock
    // must serialize them, and the failed transaction must leave no entry.
    const spend = (key) => prisma.$transaction(async (tx) => {
      const posted = await postEntryWithBalanceTx(tx, {
        stokvelId,
        kind: 'POOL_PAYMENT',
        memo: 'Final-spend race',
        idempotencyKey: key,
        createdById: userId,
        lines: [
          { account: 'BANK', amountCents: -2_000 },
          { account: 'POOL_PAYMENTS', amountCents: 2_000 },
        ],
      }, { requireFunds: true });
      if (posted.fundsShort) throw new Error('INSUFFICIENT_TEST_FUNDS');
      return posted;
    });

    const results = await Promise.allSettled([
      spend(`final-spend-a:${stokvelId}`),
      spend(`final-spend-b:${stokvelId}`),
    ]);
    expect(results.filter(x => x.status === 'fulfilled')).toHaveLength(2);
    const balance = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    // Current balance after earlier test cases is R35; both R20 spends fit.
    expect(Number(balance.totalBalance)).toBe( -5 );
  });

  it('rejects database-level edits to immutable ledger history', async () => {
    const rows = await prisma.$queryRaw`
      SELECT "id" FROM "LedgerEntry" WHERE "stokvelId" = ${stokvelId} ORDER BY "seq" ASC LIMIT 1
    `;
    await expect(
      prisma.$executeRaw`UPDATE "LedgerEntry" SET "memo" = 'tampered' WHERE "id" = ${rows[0].id}`,
    ).rejects.toThrow(/cannot be changed or deleted/i);
  });
});
