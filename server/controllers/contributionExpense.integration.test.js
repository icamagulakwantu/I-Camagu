import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { ensureLedgerTables, postEntryWithBalanceTx, verifyLedger, checkStokvelBalance } from '../services/ledgerService.js';

vi.mock('../services/pinService.js', () => ({
  verifyPin: async () => ({ valid: true }),
  pinFailureResponse: () => ({ status: 400, error: 'Invalid PIN' }),
}));

import { confirmContribution } from './contributionController.js';
import { approveExpense, requestExpense } from './stokvelApprovalsController.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

integrationDescribe('PostgreSQL contribution and group-expense controller integration', () => {
  let stokvelId;
  let payerId;
  let officialAId;
  let officialBId;
  let payerMemberId;

  beforeAll(async () => {
    await ensureLedgerTables();
    const suffix = randomUUID();
    const users = await Promise.all([
      prisma.user.create({ data: { email: `contribution-payer-${suffix}@example.invalid`, firstName: 'Contribution', lastName: 'Payer' }, select: { id: true } }),
      prisma.user.create({ data: { email: `expense-official-a-${suffix}@example.invalid`, firstName: 'Expense', lastName: 'Official A' }, select: { id: true } }),
      prisma.user.create({ data: { email: `expense-official-b-${suffix}@example.invalid`, firstName: 'Expense', lastName: 'Official B' }, select: { id: true } }),
    ]);
    [payerId, officialAId, officialBId] = users.map((u) => u.id);
    const stokvel = await prisma.stokvel.create({
      data: {
        name: 'Disposable contribution and expense integration test',
        type: 'CEREMONY_SAVINGS',
        bankingTrack: 'AFRICAN_BANK',
        organiserId: payerId,
        requiredApprovals: 2,
      },
      select: { id: true },
    });
    stokvelId = stokvel.id;
    const members = await Promise.all([
      prisma.stokvelMember.create({ data: { stokvelId, userId: payerId, referenceCode: `PAYER-${suffix}` }, select: { id: true } }),
      prisma.stokvelMember.create({ data: { stokvelId, userId: officialAId, referenceCode: `OFFICIAL-A-${suffix}` }, select: { id: true } }),
      prisma.stokvelMember.create({ data: { stokvelId, userId: officialBId, referenceCode: `OFFICIAL-B-${suffix}` }, select: { id: true } }),
    ]);
    payerMemberId = members[0].id;
    await Promise.all([
      prisma.stokvelOfficial.create({ data: { stokvelId, userId: officialAId, role: 'CHAIRPERSON' } }),
      prisma.stokvelOfficial.create({ data: { stokvelId, userId: officialBId, role: 'TREASURER' } }),
    ]);
    await prisma.stokvelGroupLedger.create({ data: { stokvelId, totalBalance: 0, groupExpenses: 0 } });
    await prisma.$transaction((tx) => postEntryWithBalanceTx(tx, {
      stokvelId,
      kind: 'OPENING_BALANCE',
      memo: 'Contribution/expense integration opening balance',
      idempotencyKey: `contribution-expense-opening:${stokvelId}`,
      createdById: payerId,
      lines: [
        { account: 'BANK', amountCents: 10_000 },
        { account: 'OPENING_BALANCE', amountCents: -10_000 },
      ],
    }));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('confirms a contribution exactly once when two officials race', async () => {
    const contribution = await prisma.contribution.create({
      data: { stokvelId, memberId: payerMemberId, amount: 25, status: 'PENDING', note: 'concurrency test' },
      select: { id: true },
    });
    const confirm = async (userId) => {
      const response = responseRecorder();
      await confirmContribution({ userId, body: { contributionId: contribution.id, pin: '1234' } }, response);
      return response;
    };
    const results = await Promise.all([confirm(officialAId), confirm(officialBId)]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    expect((await prisma.contribution.findUnique({ where: { id: contribution.id } })).status).toBe('CONFIRMED');
    const entries = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count FROM "LedgerEntry"
      WHERE "stokvelId" = ${stokvelId} AND "kind" = 'CONTRIBUTION' AND "memo" = 'Contribution: concurrency test'
    `;
    expect(entries[0].count).toBe(1);
    const balance = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    expect(Number(balance.totalBalance)).toBe(125);
    expect((await checkStokvelBalance(stokvelId)).agrees).toBe(true);
  });

  it('allows only one concurrent group-expense approval to spend the remaining funds', async () => {
    const requestA = responseRecorder();
    const requestB = responseRecorder();
    await requestExpense({ userId: officialAId, body: { stokvelId, amount: '70.00', note: 'Concurrent expense A' } }, requestA);
    await requestExpense({ userId: officialBId, body: { stokvelId, amount: '70.00', note: 'Concurrent expense B' } }, requestB);
    expect(requestA.statusCode).toBe(201);
    expect(requestB.statusCode).toBe(201);
    const requestIds = [requestA.body.requestId, requestB.body.requestId];
    const approve = async (requestId, userId) => {
      const response = responseRecorder();
      await approveExpense({ params: { stokvelId, requestId }, body: { pin: '1234' }, userId }, response);
      return response;
    };
    const results = await Promise.all([
      approve(requestIds[0], officialBId),
      approve(requestIds[1], officialAId),
    ]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 400]);
    const saved = await prisma.$queryRaw`
      SELECT "status" FROM "StokvelExpenseRequest" WHERE "id" = ANY(${requestIds})
    `;
    expect(saved.filter((r) => r.status === 'APPROVED')).toHaveLength(1);
    expect(saved.filter((r) => r.status === 'PENDING')).toHaveLength(1);
    const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    expect(Number(ledger.totalBalance)).toBe(55);
    expect(Number(ledger.groupExpenses)).toBe(70);
    expect((await verifyLedger(stokvelId)).ok).toBe(true);
    expect((await checkStokvelBalance(stokvelId)).agrees).toBe(true);
  });
});
