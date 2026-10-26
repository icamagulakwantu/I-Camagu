import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { decidePoolFundingRequest } from './stokvelPoolFundingController.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

integrationDescribe('PostgreSQL SmartMatch stokvel funding integration', () => {
  let stokvelId;
  let requesterId;
  let officialAId;
  let officialBId;

  beforeAll(async () => {
    const suffix = randomUUID();
    const users = await Promise.all([
      prisma.user.create({ data: { email: `pool-requester-${suffix}@example.invalid`, firstName: 'Pool', lastName: 'Requester' }, select: { id: true } }),
      prisma.user.create({ data: { email: `pool-official-a-${suffix}@example.invalid`, firstName: 'Pool', lastName: 'Official A' }, select: { id: true } }),
      prisma.user.create({ data: { email: `pool-official-b-${suffix}@example.invalid`, firstName: 'Pool', lastName: 'Official B' }, select: { id: true } }),
    ]);
    [requesterId, officialAId, officialBId] = users.map((u) => u.id);
    const stokvel = await prisma.stokvel.create({
      data: {
        name: 'Disposable SmartMatch funding integration test',
        type: 'CEREMONY_SAVINGS',
        bankingTrack: 'AFRICAN_BANK',
        organiserId: requesterId,
        requiredApprovals: 2,
      },
      select: { id: true },
    });
    stokvelId = stokvel.id;
    await prisma.stokvelMember.create({
      data: { stokvelId, userId: requesterId, referenceCode: `POOL-REQUESTER-${suffix}` },
    });
    await Promise.all([
      prisma.stokvelOfficial.create({ data: { stokvelId, userId: officialAId, role: 'CHAIRPERSON' } }),
      prisma.stokvelOfficial.create({ data: { stokvelId, userId: officialBId, role: 'TREASURER' } }),
    ]);
    await prisma.stokvelGroupLedger.create({ data: { stokvelId, totalBalance: 100, groupExpenses: 0 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createFunding(amountZAR = 80) {
    const pool = await prisma.bulkPool.create({
      data: { category: 'GROCERY', area: 'CI test area', moqTarget: 10, status: 'OPEN' },
      select: { id: true },
    });
    return prisma.stokvelPoolFunding.create({
      data: {
        stokvelId,
        poolId: pool.id,
        requestedById: requesterId,
        amountZAR,
        purpose: 'Disposable PostgreSQL integration test',
        requiredApprovals: 2,
        status: 'PENDING_APPROVAL',
      },
      select: { id: true },
    });
  }

  async function decide(fundingId, userId, decision = 'APPROVE') {
    const response = responseRecorder();
    await decidePoolFundingRequest({
      params: { stokvelId, fundingId },
      body: { decision },
      userId,
    }, response);
    return response;
  }

  it('rejects a repeated official vote and persists only one approval', async () => {
    const funding = await createFunding(20);
    const results = await Promise.all([
      decide(funding.id, officialAId),
      decide(funding.id, officialAId),
    ]);
    expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const votes = await prisma.stokvelPoolFundingApproval.count({ where: { fundingId: funding.id } });
    expect(votes).toBe(1);
    expect((await prisma.stokvelPoolFunding.findUnique({ where: { id: funding.id } })).status).toBe('PENDING_APPROVAL');
  });

  it('allows only one of two concurrently approved requests to consume the same available funds', async () => {
    const first = await createFunding(80);
    const second = await createFunding(80);
    const results = await Promise.all([
      decide(first.id, officialAId),
      decide(first.id, officialBId),
      decide(second.id, officialAId),
      decide(second.id, officialBId),
    ]);
    expect(results.every((r) => r.statusCode === 200)).toBe(true);
    const statuses = await prisma.stokvelPoolFunding.findMany({
      where: { id: { in: [first.id, second.id] } },
      select: { id: true, status: true },
    });
    expect(statuses.filter((r) => r.status === 'APPROVED')).toHaveLength(1);
    expect(statuses.filter((r) => r.status === 'DECLINED')).toHaveLength(1);
    const totalCommitted = await prisma.stokvelPoolFunding.aggregate({
      where: { stokvelId, status: { in: ['PENDING_APPROVAL', 'APPROVED'] } },
      _sum: { amountZAR: true },
    });
    expect(Number(totalCommitted._sum.amountZAR || 0)).toBeLessThanOrEqual(100);
  });

  it('declines the final approval when the available balance is insufficient', async () => {
    const funding = await createFunding(500);
    const first = await decide(funding.id, officialAId);
    expect(first.statusCode).toBe(200);
    expect(first.body.approvalsNeeded).toBe(1);
    const second = await decide(funding.id, officialBId);
    expect(second.statusCode).toBe(200);
    expect(second.body.insufficientFunds).toBe(true);
    const saved = await prisma.stokvelPoolFunding.findUnique({ where: { id: funding.id } });
    expect(saved.status).toBe('DECLINED');
    expect(saved.reviewNote).toMatch(/insufficient available funds/i);
    expect(await prisma.stokvelPoolFundingApproval.count({ where: { fundingId: funding.id } })).toBe(2);
  });
});
