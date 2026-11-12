import { beforeEach, describe, expect, it, vi } from 'vitest';

const tx = {
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  bulkPool: { findUnique: vi.fn(), update: vi.fn() },
  partner: { findUnique: vi.fn() },
};
const prisma = {
  partner: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
  bulkPool: { findUnique: vi.fn() },
  $queryRaw: vi.fn(),
  $transaction: vi.fn(async (fn) => fn(tx)),
};
const createNotification = vi.fn(async () => {});

vi.mock('../config/db.js', () => ({ default: prisma }));
vi.mock('./notificationDbService.js', () => ({ createNotification, notifyMany: vi.fn(async () => {}) }));

const { submitOffer, acceptOffer, setMerchantVerification, listMerchantsForAdmin, NOT_VERIFIED_MESSAGE } = await import('./offerService.js');

const MERCHANT = { id: 'partner-1', userId: 'merchant-user', name: 'Ilanga Liquors', type: 'ALCOHOL', area: 'Mthatha' };

describe('only verified merchants can send offers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses an offer from a merchant that is not verified', async () => {
    prisma.partner.findUnique.mockResolvedValue({ ...MERCHANT, verifiedAt: null });
    await expect(submitOffer('merchant-user', 'pool-1', { totalPriceZAR: 5000 })).rejects.toMatchObject({ status: 403, message: NOT_VERIFIED_MESSAGE });
    expect(prisma.bulkPool.findUnique).not.toHaveBeenCalled();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('lets a verified merchant through to the usual offer checks', async () => {
    prisma.partner.findUnique.mockResolvedValue({ ...MERCHANT, verifiedAt: new Date() });
    prisma.bulkPool.findUnique.mockResolvedValue(null);
    await expect(submitOffer('merchant-user', 'pool-1', { totalPriceZAR: 5000 })).rejects.toMatchObject({ status: 404 });
    expect(prisma.bulkPool.findUnique).toHaveBeenCalled();
  });
});

describe('admins cannot accept offers from unverified merchants', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses to accept, and changes nothing', async () => {
    tx.$queryRaw.mockResolvedValueOnce([{ id: 'offer-1', poolId: 'pool-1', partnerId: 'partner-1', status: 'PENDING' }]).mockResolvedValueOnce([]);
    tx.bulkPool.findUnique.mockResolvedValue({ id: 'pool-1', status: 'MATCHED', partnerId: null, baskets: [] });
    tx.partner.findUnique.mockResolvedValue({ ...MERCHANT, verifiedAt: null });
    await expect(acceptOffer('offer-1')).rejects.toMatchObject({ status: 409 });
    expect(tx.bulkPool.update).not.toHaveBeenCalled();
    expect(tx.$executeRaw).not.toHaveBeenCalled();
  });
});

describe('verifying a merchant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.partner.findUnique.mockResolvedValue({ ...MERCHANT, verifiedAt: null });
    prisma.partner.update.mockImplementation(async ({ data }) => ({ id: 'partner-1', ...data }));
  });

  it('needs a note of what was checked', async () => {
    await expect(setMerchantVerification('partner-1', 'admin-1', { verified: true, note: '  ' })).rejects.toMatchObject({ status: 400 });
    expect(prisma.partner.update).not.toHaveBeenCalled();
  });

  it('records who verified it, when and why, and tells the merchant', async () => {
    const result = await setMerchantVerification('partner-1', 'admin-1', { verified: true, note: 'CIPC registration and bank letter checked' });
    expect(prisma.partner.update).toHaveBeenCalledWith({
      where: { id: 'partner-1' },
      data: expect.objectContaining({ verifiedById: 'admin-1', verificationNote: 'CIPC registration and bank letter checked', verifiedAt: expect.any(Date) }),
    });
    expect(result.verifiedAt).toBeInstanceOf(Date);
    expect(createNotification).toHaveBeenCalledWith('merchant-user', 'MERCHANT_VERIFIED', expect.stringContaining('verified'), 'supplier');
  });

  it('can be revoked', async () => {
    await setMerchantVerification('partner-1', 'admin-1', { verified: false });
    expect(prisma.partner.update).toHaveBeenCalledWith({ where: { id: 'partner-1' }, data: expect.objectContaining({ verifiedAt: null }) });
  });

  it('lists merchants waiting for verification first, without bank details', async () => {
    prisma.partner.findMany.mockResolvedValue([
      { ...MERCHANT, id: 'a', verifiedAt: new Date(), createdAt: new Date(), bankName: 'FNB', bankAccountNumber: '123', user: { firstName: 'Ayanda', lastName: 'M', email: 'a@example.invalid' } },
      { ...MERCHANT, id: 'b', verifiedAt: null, createdAt: new Date(), user: null },
    ]);
    const rows = await listMerchantsForAdmin();
    expect(rows.map((r) => r.id)).toEqual(['b', 'a']);
    expect(rows[1].hasBankDetails).toBe(true);
    expect(JSON.stringify(rows)).not.toContain('123');
  });
});
