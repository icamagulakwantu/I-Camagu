import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({
  default: {
    stokvelOfficial: { findFirst: vi.fn() },
    stokvelPoolFunding: { findFirst: vi.fn() },
    stokvelPoolFundingApproval: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import prisma from '../config/db.js';
import { decidePoolFundingRequest } from './stokvelPoolFundingController.js';

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

const funding = {
  id: 'funding-1',
  stokvelId: 'stokvel-1',
  requestedById: 'requester-1',
  amountZAR: 100,
  requiredApprovals: 2,
  status: 'PENDING_APPROVAL',
  requestedBy: { id: 'requester-1' },
  stokvel: { id: 'stokvel-1' },
};

describe('stokvel pool funding approval rules', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not let a non-official decide a request', async () => {
    prisma.stokvelOfficial.findFirst.mockResolvedValue(null);
    const res = response();
    await decidePoolFundingRequest({ params: { stokvelId: 'stokvel-1', fundingId: 'funding-1' }, body: { decision: 'APPROVE' }, userId: 'member-1' }, res);
    expect(res.statusCode).toBe(403);
  });

  it('does not let the requester approve their own request', async () => {
    prisma.stokvelOfficial.findFirst.mockResolvedValue({ id: 'official-1', userId: 'requester-1' });
    prisma.stokvelPoolFunding.findFirst.mockResolvedValue(funding);
    const res = response();
    await decidePoolFundingRequest({ params: { stokvelId: 'stokvel-1', fundingId: 'funding-1' }, body: { decision: 'APPROVE' }, userId: 'requester-1' }, res);
    expect(res.statusCode).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('prevents the same user voting twice even if they hold multiple official roles', async () => {
    prisma.stokvelOfficial.findFirst.mockResolvedValue({ id: 'official-2', userId: 'official-user' });
    prisma.stokvelPoolFunding.findFirst.mockResolvedValue(funding);
    prisma.stokvelPoolFundingApproval.findFirst.mockResolvedValue({ id: 'prior-vote' });
    const res = response();
    await decidePoolFundingRequest({ params: { stokvelId: 'stokvel-1', fundingId: 'funding-1' }, body: { decision: 'APPROVE' }, userId: 'official-user' }, res);
    expect(res.statusCode).toBe(409);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires two approvals and only then marks settlement pending', async () => {
    prisma.stokvelOfficial.findFirst.mockResolvedValue({ id: 'official-2', userId: 'official-user-2' });
    prisma.stokvelPoolFunding.findFirst.mockResolvedValue(funding);
    prisma.stokvelPoolFundingApproval.findFirst.mockResolvedValue(null);
    const tx = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      stokvelPoolFundingApproval: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        count: vi.fn().mockResolvedValue(2),
      },
      stokvelGroupLedger: { findUnique: vi.fn().mockResolvedValue({ totalBalance: 500, groupExpenses: 0 }) },
      stokvelPoolFunding: {
        findFirst: vi.fn().mockResolvedValue(funding),
        aggregate: vi.fn().mockResolvedValue({ _sum: { amountZAR: 0 } }),
        update: vi.fn().mockResolvedValue({ ...funding, status: 'APPROVED' }),
      },
      poolPayment: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      notification: { create: vi.fn().mockResolvedValue({}) },
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    const res = response();
    await decidePoolFundingRequest({ params: { stokvelId: 'stokvel-1', fundingId: 'funding-1' }, body: { decision: 'APPROVE' }, userId: 'official-user-2' }, res);
    expect(res.statusCode).toBe(200);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.stokvelPoolFunding.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'funding-1', stokvelId: 'stokvel-1' } }));
    expect(tx.stokvelPoolFunding.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'APPROVED' }) }));
    expect(tx.poolPayment.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'PENDING_SETTLEMENT' } }));
  });
});
