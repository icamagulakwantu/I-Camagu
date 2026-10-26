import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    stokvel: { findUnique: vi.fn(), delete: vi.fn() },
    stokvelGroupLedger: { findUnique: vi.fn(), deleteMany: vi.fn() },
    stokvelMember: { count: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn() },
    contribution: { count: vi.fn(), deleteMany: vi.fn() },
    payout: { count: vi.fn(), deleteMany: vi.fn(), findFirst: vi.fn() },
    rawBankLog: { count: vi.fn(), deleteMany: vi.fn() },
    stokvelAnnouncement: { deleteMany: vi.fn() },
    stokvelOfficial: { deleteMany: vi.fn() },
    $queryRaw: vi.fn(),
    $queryRawUnsafe: vi.fn(),
    $executeRawUnsafe: vi.fn(),
    $transaction: vi.fn(async (fn) => fn(prisma)),
  },
}));

vi.mock('../config/db.js', () => ({ default: prisma }));
vi.mock('../utils/memberReference.js', () => ({ generateReferenceCode: vi.fn() }));
vi.mock('./stokvelApprovalsController.js', () => ({ countOpenRequests: vi.fn() }));

const { deleteStokvel, createStokvel, updateStokvel, leaveStokvel } = await import('./stokvelController.js');

function response() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

async function callDelete(userId = 'organiser-1') {
  const res = response();
  await deleteStokvel({ params: { stokvelId: 'group-1' }, userId }, res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.stokvel.findUnique.mockResolvedValue({ id: 'group-1', organiserId: 'organiser-1' });
  prisma.stokvelGroupLedger.findUnique.mockResolvedValue(null);
  prisma.stokvelMember.count.mockResolvedValue(0);
  prisma.contribution.count.mockResolvedValue(0);
  prisma.payout.count.mockResolvedValue(0);
  prisma.rawBankLog.count.mockResolvedValue(0);
  prisma.$queryRaw.mockResolvedValue([{ tableExists: false }]);
  prisma.$queryRawUnsafe.mockResolvedValue([{ hasRows: false }]);
});

describe('deleteStokvel financial-history protection', () => {
  it('refuses deletion when the caller is not the organiser', async () => {
    const res = await callDelete('someone-else');

    expect(res.statusCode).toBe(403);
    expect(prisma.stokvelMember.count).not.toHaveBeenCalled();
    expect(prisma.stokvel.delete).not.toHaveBeenCalled();
  });

  it('refuses deletion whenever a ledger exists, even at zero balance', async () => {
    prisma.stokvelGroupLedger.findUnique.mockResolvedValue({ totalBalance: '0.00' });

    const res = await callDelete();

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('STOKVEL_FINANCIAL_HISTORY_REQUIRES_ARCHIVE');
    expect(prisma.stokvel.delete).not.toHaveBeenCalled();
    expect(prisma.stokvelMember.deleteMany).not.toHaveBeenCalled();
  });

  it('refuses deletion when historical contributions exist despite no current ledger', async () => {
    prisma.contribution.count.mockResolvedValue(1);

    const res = await callDelete();

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('STOKVEL_FINANCIAL_HISTORY_REQUIRES_ARCHIVE');
    expect(prisma.stokvel.delete).not.toHaveBeenCalled();
  });

  it('checks legacy tables only when they exist', async () => {
    prisma.$queryRaw.mockResolvedValue([{ tableExists: false }]);

    const res = await callDelete();

    expect(res.statusCode).toBe(200);
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });
});

describe('stokvel budget amount validation', () => {
  it('rejects fractional-cent amounts when creating a stokvel', async () => {
    const res = response();
    await createStokvel({
      userId: 'organiser-1',
      body: { name: 'Family savings', type: 'CEREMONY_SAVINGS', contributionAmount: '10.005' },
    }, res);

    expect(res.statusCode).toBe(400);
    expect(prisma.stokvel.findUnique).not.toHaveBeenCalled();
    expect(prisma.stokvel.delete).not.toHaveBeenCalled();
  });

  it('rejects fractional-cent amounts when updating a stokvel', async () => {
    const res = response();
    await updateStokvel({
      userId: 'organiser-1',
      params: { stokvelId: 'group-1' },
      body: { targetAmount: '100.005' },
    }, res);

    expect(res.statusCode).toBe(400);
    expect(prisma.stokvel.findUnique).not.toHaveBeenCalled();
    expect(prisma.stokvel.delete).not.toHaveBeenCalled();
  });

  it('rejects invalid target dates before database writes', async () => {
    const res = response();
    await createStokvel({
      userId: 'organiser-1',
      body: { name: 'Family savings', type: 'CEREMONY_SAVINGS', targetDate: 'not-a-date' },
    }, res);

    expect(res.statusCode).toBe(400);
    expect(prisma.stokvel.delete).not.toHaveBeenCalled();
  });
});

describe('leaveStokvel obligation checks', () => {
  it('blocks leaving when an open loan exists', async () => {
    prisma.stokvel.findUnique.mockResolvedValue({ organiserId: 'organiser-1', name: 'Family group' });
    prisma.stokvelMember.findFirst.mockResolvedValue({ id: 'member-row-1' });
    prisma.$queryRaw
      .mockResolvedValueOnce([{ tableExists: true }])
      .mockResolvedValueOnce([{ id: 'loan-1' }]);

    const res = response();
    await leaveStokvel({ params: { stokvelId: 'group-1' }, userId: 'member-1' }, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('open loan');
    expect(prisma.stokvelMember.delete).not.toHaveBeenCalled();
  });

  it('fails closed if the loan check fails', async () => {
    prisma.stokvel.findUnique.mockResolvedValue({ organiserId: 'organiser-1', name: 'Family group' });
    prisma.stokvelMember.findFirst.mockResolvedValue({ id: 'member-row-1' });
    prisma.$queryRaw.mockRejectedValueOnce(new Error('database unavailable'));

    const res = response();
    await leaveStokvel({ params: { stokvelId: 'group-1' }, userId: 'member-1' }, res);

    expect(res.statusCode).toBe(500);
    expect(prisma.stokvelMember.delete).not.toHaveBeenCalled();
  });
});
