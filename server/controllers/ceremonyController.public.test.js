import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../config/db.js', () => ({
  default: {
    preparationPlan: { findUnique: vi.fn() },
  },
}));

import prisma from '../config/db.js';
import { getPublicPlan } from './ceremonyController.js';
import { createShareToken } from '../utils/shareToken.js';

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

describe('getPublicPlan privacy allowlist', () => {
  beforeEach(() => vi.clearAllMocks());

  it('selects only the shared checklist fields and does not load pledge records', async () => {
    const plan = {
      title: 'Family ceremony',
      checklistItems: [{ id: 'item-1', phase: 'BEFORE', isChecked: false, label: 'Prepare the venue' }],
    };
    prisma.preparationPlan.findUnique.mockResolvedValue(plan);
    const token = createShareToken(Date.now(), 'd'.repeat(32));
    const req = { params: { token } };
    const res = responseRecorder();

    await getPublicPlan(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(plan);
    expect(prisma.preparationPlan.findUnique).toHaveBeenCalledWith({
      where: { shareToken: token },
      select: {
        title: true,
        checklistItems: {
          select: { id: true, phase: true, isChecked: true, label: true },
        },
      },
    });
    expect(prisma.preparationPlan.findUnique.mock.calls[0][0].include).toBeUndefined();
  });

  it('rejects a missing token without querying the database', async () => {
    const req = { params: {} };
    const res = responseRecorder();

    await getPublicPlan(req, res);

    expect(res.statusCode).toBe(400);
    expect(prisma.preparationPlan.findUnique).not.toHaveBeenCalled();
  });
});
