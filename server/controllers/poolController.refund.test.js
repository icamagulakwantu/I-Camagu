import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({
  default: {
    poolPayment: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('../services/matchmakerService.js', () => ({ submitBasketToPool: vi.fn() }));
vi.mock('../services/poolDiscoveryService.js', () => ({
  findSuggestedPoolsForItem: vi.fn(),
  joinPoolWithItem: vi.fn(),
  getNearbyDemandSignal: vi.fn(),
  getCommunityFeed: vi.fn(),
}));
vi.mock('../utils/smartMatchTiers.js', () => ({
  PALLET_CASES: 56,
  palletsForCases: vi.fn(),
  resolveTierLadder: vi.fn(),
  getTierForMetric: vi.fn(),
  getNextTierForMetric: vi.fn(),
  amountToReachTier: vi.fn(),
}));

import prisma from '../config/db.js';
import { requestPoolPaymentRefund } from './poolController.js';

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

describe('requestPoolPaymentRefund', () => {
  beforeEach(() => vi.clearAllMocks());

  it('does not route Stokvel-funded shares into supplier or PSP refunds', async () => {
    prisma.poolPayment.findUnique.mockResolvedValue({
      id: 'payment-1',
      userId: 'member-1',
      provider: 'STOKVEL_FUNDS',
      status: 'PENDING_SETTLEMENT',
      refundRequestedAt: null,
    });
    const req = { body: { paymentId: 'payment-1' }, userId: 'member-1' };
    const res = responseRecorder();

    await requestPoolPaymentRefund(req, res);

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toContain('Stokvel-funded pool shares');
    expect(prisma.poolPayment.update).not.toHaveBeenCalled();
  });
});
