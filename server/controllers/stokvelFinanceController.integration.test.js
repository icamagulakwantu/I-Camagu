import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { ensureLedgerTables, postEntryWithBalanceTx, verifyLedger, checkStokvelBalance } from '../services/ledgerService.js';
import { voteLoan, repayLoan } from './stokvelFinanceController.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

integrationDescribe('PostgreSQL loan controller integration (real database)', () => {
  let stokvelId;
  let borrowerId;
  let officialAId;
  let officialBId;
  let officialAUserId;
  let officialBUserId;

  beforeAll(async () => {
    await ensureLedgerTables();
    const suffix = randomUUID();
    const users = await Promise.all([
      prisma.user.create({ data: { email: `loan-borrower-${suffix}@example.invalid`, firstName: 'Loan', lastName: 'Borrower' }, select: { id: true } }),
      prisma.user.create({ data: { email: `loan-official-a-${suffix}@example.invalid`, firstName: 'Loan', lastName: 'Official A' }, select: { id: true } }),
      prisma.user.create({ data: { email: `loan-official-b-${suffix}@example.invalid`, firstName: 'Loan', lastName: 'Official B' }, select: { id: true } }),
    ]);
    [borrowerId, officialAUserId, officialBUserId] = users.map((u) => u.id);
    const stokvel = await prisma.stokvel.create({
      data: {
        name: 'Disposable loan controller integration test',
        type: 'CEREMONY_SAVINGS',
        bankingTrack: 'AFRICAN_BANK',
        organiserId: borrowerId,
        requiredApprovals: 2,
      },
      select: { id: true },
    });
    stokvelId = stokvel.id;
    await prisma.stokvelMember.create({
      data: { stokvelId, userId: borrowerId, referenceCode: `BORROWER-${suffix}` },
    });
    const officials = await Promise.all([
      prisma.stokvelOfficial.create({ data: { stokvelId, userId: officialAUserId, role: 'CHAIRPERSON' }, select: { id: true } }),
      prisma.stokvelOfficial.create({ data: { stokvelId, userId: officialBUserId, role: 'TREASURER' }, select: { id: true } }),
    ]);
    [officialAId, officialBId] = officials.map((o) => o.id);
    await prisma.stokvelGroupLedger.create({ data: { stokvelId, totalBalance: 0 } });

    await prisma.$transaction((tx) => postEntryWithBalanceTx(tx, {
      stokvelId,
      kind: 'OPENING_BALANCE',
      memo: 'Loan controller integration opening balance',
      idempotencyKey: `loan-opening:${stokvelId}`,
      createdById: borrowerId,
      lines: [
        { account: 'BANK', amountCents: 50_000 },
        { account: 'OPENING_BALANCE', amountCents: -50_000 },
      ],
    }));

    // Trigger the controller's lazy table creation, then all tests use those real tables.
    const response = responseRecorder();
    await voteLoan({ params: { stokvelId, loanId: 'not-a-real-loan' }, body: { approve: true }, userId: officialAUserId }, response);
    expect(response.statusCode).toBe(404);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createLoan({ amount = '100.00', totalDueCents = 11_000, status = 'APPROVED' } = {}) {
    const id = randomUUID();
    const terms = JSON.stringify({
      principalCents: Math.round(Number(amount) * 100),
      totalInterestCents: totalDueCents - Math.round(Number(amount) * 100),
      totalDueCents,
      interestPercent: 10,
      rateBasis: 'FLAT',
      months: 1,
    });
    await prisma.$executeRaw`
      INSERT INTO "StokvelLoan"
        ("id", "stokvelId", "borrowerId", "amount", "interestPercent", "repayMonths", "status", "termsSnapshot")
      VALUES (${id}, ${stokvelId}, ${borrowerId}, ${amount}::numeric, 10, 1, ${status}, ${terms}::jsonb)
    `;
    return id;
  }

  it('locks repayment decisions so concurrent repayments cannot exceed the remaining amount', async () => {
    const loanId = await createLoan();
    const callRepayment = async (userId, amount) => {
      const response = responseRecorder();
      await repayLoan({ params: { stokvelId, loanId }, body: { amount }, userId }, response);
      return response;
    };

    const results = await Promise.all([
      callRepayment(officialAUserId, '60.00'),
      callRepayment(officialBUserId, '60.00'),
    ]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 400]);

    const repayments = await prisma.$queryRaw`
      SELECT COALESCE(SUM("amount"), 0)::text AS total, COUNT(*)::int AS count
      FROM "StokvelLoanRepayment" WHERE "loanId" = ${loanId}
    `;
    expect(Number(repayments[0].total)).toBe(60);
    expect(repayments[0].count).toBe(1);
    expect((await prisma.$queryRaw`SELECT "status" FROM "StokvelLoan" WHERE "id" = ${loanId}`)[0].status).toBe('APPROVED');
    expect((await verifyLedger(stokvelId)).ok).toBe(true);
    expect((await checkStokvelBalance(stokvelId)).agrees).toBe(true);
  });

  it('rolls back an approval vote and loan status when the group cannot fund the loan', async () => {
    const loanId = await createLoan({ amount: '900.00', totalDueCents: 99_000, status: 'PENDING' });
    const firstVote = responseRecorder();
    await voteLoan({ params: { stokvelId, loanId }, body: { approve: true }, userId: officialAUserId }, firstVote);
    expect(firstVote.statusCode).toBe(200);
    expect(firstVote.body.status).toBe('PENDING');

    const secondVote = responseRecorder();
    await voteLoan({ params: { stokvelId, loanId }, body: { approve: true }, userId: officialBUserId }, secondVote);
    expect(secondVote.statusCode).toBe(409);
    expect(secondVote.body.error).toMatch(/balance is too low/i);

    const loan = await prisma.$queryRaw`SELECT "status" FROM "StokvelLoan" WHERE "id" = ${loanId}`;
    const votes = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "StokvelLoanVote" WHERE "loanId" = ${loanId}`;
    expect(loan[0].status).toBe('PENDING');
    expect(votes[0].count).toBe(1);
    expect((await verifyLedger(stokvelId)).ok).toBe(true);
  });

  it('rejects a repayment above the exact remaining amount without changing the books', async () => {
    const loanId = await createLoan();
    const response = responseRecorder();
    await repayLoan({ params: { stokvelId, loanId }, body: { amount: '110.01' }, userId: officialAUserId }, response);
    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/more than is still owed/i);
    const repayments = await prisma.$queryRaw`SELECT COUNT(*)::int AS count FROM "StokvelLoanRepayment" WHERE "loanId" = ${loanId}`;
    expect(repayments[0].count).toBe(0);
    expect((await verifyLedger(stokvelId)).ok).toBe(true);
  });
});
