import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPrisma = {
  poolPayment: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};
vi.mock('../config/db.js', () => ({ default: mockPrisma }));
vi.mock('./notificationDbService.js', () => ({ createNotification: vi.fn() }));

const { isOnlinePaymentConfigured, isOnlinePaymentEligible, initiatePoolPayment, markRefundProcessed, listPendingSupplierRefunds, listPendingSupplierPayouts, markPayoutForwarded } = await import('./paymentService.js');

const ORIGINAL_ENV = { ...process.env };

function setPayfastEnv(vars) {
  delete process.env.PAYFAST_MERCHANT_ID;
  delete process.env.PAYFAST_MERCHANT_KEY;
  delete process.env.PAYFAST_SANDBOX;
  Object.assign(process.env, vars);
}

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
});

describe('isOnlinePaymentConfigured / isOnlinePaymentEligible', () => {
  it('is unconfigured when PayFast credentials are missing — degrades to manual EFT only, never crashes', () => {
    setPayfastEnv({});
    expect(isOnlinePaymentConfigured()).toBe(false);
    expect(isOnlinePaymentEligible('GROCERY')).toBe(false);
  });

  it('keeps online checkout disabled even when merchant credentials are configured', () => {
    setPayfastEnv({ PAYFAST_MERCHANT_ID: '10000100', PAYFAST_MERCHANT_KEY: '46f0cd694581a' });
    expect(isOnlinePaymentConfigured()).toBe(false);
    expect(isOnlinePaymentEligible('GROCERY')).toBe(false);
    expect(isOnlinePaymentEligible('BUTCHERY')).toBe(false);
    expect(isOnlinePaymentEligible('PRODUCE')).toBe(false);
    expect(isOnlinePaymentEligible('TAVERN')).toBe(false);
  });

  it('blocks direct checkout API calls before accessing payment records', async () => {
    setPayfastEnv({ PAYFAST_MERCHANT_ID: '10000100', PAYFAST_MERCHANT_KEY: '46f0cd694581a', PAYFAST_SANDBOX: 'false' });
    await expect(initiatePoolPayment('user_1', 'pay_1', 'https://example.test'))
      .rejects.toMatchObject({ status: 503 });
    expect(mockPrisma.poolPayment.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.poolPayment.update).not.toHaveBeenCalled();
  });
});

describe('markRefundProcessed', () => {
  beforeEach(() => vi.clearAllMocks());

  it('refuses a manual-EFT payment — that refund is the supplier\'s to process, not the admin\'s', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({
      id: 'pay_1', provider: 'MANUAL_EFT', status: 'CLEARED', refundRequestedAt: new Date(),
    });
    await expect(markRefundProcessed('pay_1', {})).rejects.toThrow(/supplier's to process/);
    expect(mockPrisma.poolPayment.update).not.toHaveBeenCalled();
  });

  it('refuses Stokvel-funded payments instead of treating them as PSP refunds', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({
      id: 'pay_stokvel', provider: 'STOKVEL_FUNDS', status: 'PENDING_SETTLEMENT', refundRequestedAt: new Date(),
    });
    await expect(markRefundProcessed('pay_stokvel', {})).rejects.toThrow(/Stokvel-funded pool shares/);
    expect(mockPrisma.poolPayment.update).not.toHaveBeenCalled();
  });

  it('excludes Stokvel-funded requests from the PSP refund queue', async () => {
    mockPrisma.poolPayment.findMany.mockResolvedValue([]);
    await listPendingSupplierRefunds();
    expect(mockPrisma.poolPayment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ provider: { notIn: ['MANUAL_EFT', 'STOKVEL_FUNDS'] } }),
    }));
  });

  it('refuses when no refund was ever requested', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({
      id: 'pay_2', provider: 'PAYFAST', status: 'CLEARED', refundRequestedAt: null,
    });
    await expect(markRefundProcessed('pay_2', {})).rejects.toThrow(/No refund has been requested/);
  });

  it('refuses a payment that was already refunded — no double-processing', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({
      id: 'pay_3', provider: 'PAYFAST', status: 'REFUNDED', refundRequestedAt: new Date(),
    });
    await expect(markRefundProcessed('pay_3', {})).rejects.toThrow(/already been refunded/);
  });

  it('rejects a negative or non-numeric fee instead of silently coercing it', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({
      id: 'pay_4', provider: 'PAYFAST', status: 'CLEARED', refundRequestedAt: new Date(),
    });
    await expect(markRefundProcessed('pay_4', { feeZAR: '-5' })).rejects.toThrow(/non-negative amount/);
    await expect(markRefundProcessed('pay_4', { feeZAR: 'not-a-number' })).rejects.toThrow(/non-negative amount/);
  });

  it('requires external refund evidence before marking a payment refunded', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({
      id: 'pay-evidence', provider: 'PAYFAST', status: 'CLEARED', refundRequestedAt: new Date(), amountZAR: '100.00',
    });
    await expect(markRefundProcessed('pay-evidence', { feeZAR: '0' })).rejects.toThrow(/external refund confirmation or bank reference/);
    expect(mockPrisma.poolPayment.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a refund fee greater than the amount received', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({
      id: 'pay_fee', provider: 'PAYFAST', status: 'CLEARED', refundRequestedAt: new Date(), amountZAR: '20.00',
    });
    await expect(markRefundProcessed('pay_fee', { feeZAR: '20.01' })).rejects.toThrow(/cannot exceed/);
    expect(mockPrisma.poolPayment.updateMany).not.toHaveBeenCalled();
  });

  it('processes a valid PSP refund and records the fee and note', async () => {
    mockPrisma.poolPayment.findUnique
      .mockResolvedValueOnce({
        id: 'pay_5', provider: 'PAYFAST', status: 'CLEARED', refundRequestedAt: new Date(),
        userId: 'user_1', amountZAR: '100.00',
      })
      .mockResolvedValueOnce({ id: 'pay_5', status: 'REFUNDED' });
    mockPrisma.poolPayment.updateMany.mockResolvedValue({ count: 1 });

    await markRefundProcessed('pay_5', { feeZAR: '10', note: 'Refunded via EFT' });

    expect(mockPrisma.poolPayment.updateMany).toHaveBeenCalledWith({
      where: { id: 'pay_5', status: 'CLEARED', refundRequestedAt: { not: null }, provider: { notIn: ['MANUAL_EFT', 'STOKVEL_FUNDS'] } },
      data: { status: 'REFUNDED', refundFeeZAR: 10, refundNote: 'Refunded via EFT' },
    });
    expect(mockPrisma.poolPayment.findUnique).toHaveBeenCalledTimes(2);
  });
});

describe('PSP supplier payout routing', () => {
  it('excludes both manual EFT and Stokvel-funded payments from the PSP payout queue', async () => {
    mockPrisma.poolPayment.findMany.mockResolvedValue([]);
    await listPendingSupplierPayouts();
    expect(mockPrisma.poolPayment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        provider: { notIn: ['MANUAL_EFT', 'STOKVEL_FUNDS'] },
        status: 'CLEARED',
        payoutForwardedAt: null,
      }),
    }));
  });

  it('refuses to mark a Stokvel-funded payment as forwarded and does not write a payout update', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({
      id: 'pay_stokvel', provider: 'STOKVEL_FUNDS', status: 'CLEARED', payoutForwardedAt: null,
    });
    await expect(markPayoutForwarded('pay_stokvel', { reference: 'abc', note: 'test' }))
      .rejects.toMatchObject({ status: 400 });
    expect(mockPrisma.poolPayment.update).not.toHaveBeenCalled();
  });

  it('still rejects manual EFT payments from the PSP payout workflow', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({
      id: 'pay_eft', provider: 'MANUAL_EFT', status: 'CLEARED', payoutForwardedAt: null,
    });
    await expect(markPayoutForwarded('pay_eft', {})).rejects.toThrow(/go straight to the supplier/);
    expect(mockPrisma.poolPayment.update).not.toHaveBeenCalled();
  });
});

