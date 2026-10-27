import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({
  default: {
    preparationPlan: { findUnique: vi.fn() },
    contributionPledge: { findMany: vi.fn() },
  },
}));

import prisma from '../config/db.js';
import { getPublicPlanPledges } from './publicPledgeController.js';

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

describe('getPublicPlanPledges privacy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns pledge amount and receipt status without exposing exact paid amount', async () => {
    prisma.preparationPlan.findUnique.mockResolvedValue({ id: 'plan-1' });
    prisma.contributionPledge.findMany.mockResolvedValue([
      { id: 'pledge-1', pledgerName: 'Family Member', relationship: 'Aunt', pledgedItem: 'Meat', pledgedAmountZAR: '1000.00', paidAmountZAR: '1000.00' },
      { id: 'pledge-2', pledgerName: 'Family Member 2', relationship: null, pledgedItem: 'Groceries', pledgedAmountZAR: '500.00', paidAmountZAR: '100.00' },
    ]);
    const req = { params: { token: 'share-token' } };
    const res = responseRecorder();

    await getPublicPlanPledges(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([
      { id: 'pledge-1', pledgerName: 'Family Member', relationship: 'Aunt', pledgedItem: 'Meat', pledgedAmountZAR: '1000.00', isReceived: true },
      { id: 'pledge-2', pledgerName: 'Family Member 2', relationship: null, pledgedItem: 'Groceries', pledgedAmountZAR: '500.00', isReceived: false },
    ]);
    expect(JSON.stringify(res.body)).not.toContain('paidAmountZAR');
    expect(JSON.stringify(res.body)).not.toContain('100.00');
  });
});
