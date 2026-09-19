import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  poolPayment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};
vi.mock('../config/db.js', () => ({ default: mockPrisma }));
vi.mock('./notificationDbService.js', () => ({ createNotification: vi.fn() }));

const { processRefund } = await import('./supplierService.js');

describe('processRefund (supplier-side)', () => {
  beforeEach(() => vi.clearAllMocks());

  const basePayment = {
    id: 'pay_1',
    userId: 'member_1',
    amountZAR: '100.00',
    refundRequestedAt: new Date(),
    status: 'CLEARED',
    pool: { partner: { userId: 'supplier_1', name: 'Test Tavern' } },
  };

  it('refuses a PayFast-collected payment — the supplier never held that money', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({ ...basePayment, provider: 'PAYFAST' });
    await expect(processRefund('supplier_1', 'pay_1')).rejects.toThrow(/iCamagu holds that money/);
    expect(mockPrisma.poolPayment.update).not.toHaveBeenCalled();
  });

  it('still allows a manual-EFT refund — the supplier genuinely holds that money', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({ ...basePayment, provider: 'MANUAL_EFT' });
    mockPrisma.poolPayment.update.mockResolvedValue({ ...basePayment, status: 'REFUNDED' });

    await processRefund('supplier_1', 'pay_1', '5');

    expect(mockPrisma.poolPayment.update).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: { status: 'REFUNDED', refundFeeZAR: 5 },
    });
  });

  it('refuses a supplier acting on a pool that isn\'t theirs', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({ ...basePayment, provider: 'MANUAL_EFT' });
    await expect(processRefund('someone_else', 'pay_1')).rejects.toThrow(/Not your pool/);
  });
});
