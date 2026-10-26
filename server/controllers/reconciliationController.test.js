import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, runReconciliation } = vi.hoisted(() => ({
  prisma: {
    stokvelOfficial: { findFirst: vi.fn() },
    rawBankLog: { create: vi.fn() },
    stokvelMember: { findFirst: vi.fn() },
  },
  runReconciliation: vi.fn(),
}));

vi.mock('../config/db.js', () => ({ default: prisma }));
vi.mock('../services/reconciliationService.js', () => ({
  runReconciliation,
  manualAssign: vi.fn(),
  getUnmatchedQueue: vi.fn(),
  getGroupLedger: vi.fn(),
}));

const { createRawLog } = await import('./reconciliationController.js');

function response() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

async function call(amount) {
  const res = response();
  await createRawLog({
    body: { stokvelId: 'group-1', narration: 'EFT', amount, direction: 'CREDIT' },
    userId: 'official-1',
  }, res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.stokvelOfficial.findFirst.mockResolvedValue({ id: 'official-record-1' });
  prisma.rawBankLog.create.mockImplementation(async ({ data }) => ({ id: 'bank-1', ...data }));
  runReconciliation.mockResolvedValue({ needsReview: 0 });
});

describe('manual bank entry amount validation', () => {
  it('rejects fractional cents instead of silently rounding or truncating', async () => {
    const res = await call('10.005');

    expect(res.statusCode).toBe(400);
    expect(prisma.stokvelOfficial.findFirst).not.toHaveBeenCalled();
    expect(prisma.rawBankLog.create).not.toHaveBeenCalled();
  });

  it('rejects non-positive amounts', async () => {
    const res = await call('0');

    expect(res.statusCode).toBe(400);
    expect(prisma.rawBankLog.create).not.toHaveBeenCalled();
  });

  it('stores a valid amount exactly to cents', async () => {
    const res = await call('10.50');

    expect(res.statusCode).toBe(201);
    expect(prisma.rawBankLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 10.5, direction: 'CREDIT', stokvelId: 'group-1' }),
    });
    expect(runReconciliation).toHaveBeenCalledWith('group-1');
  });
});
