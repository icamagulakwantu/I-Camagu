import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockPrisma = {
  poolPayment: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};
vi.mock('../config/db.js', () => ({ default: mockPrisma }));
vi.mock('./notificationDbService.js', () => ({ createNotification: vi.fn() }));

const { isOnlinePaymentConfigured, isOnlinePaymentEligible, markRefundProcessed } = await import('./paymentService.js');

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

  it('is configured once both merchant credentials are set', () => {
    setPayfastEnv({ PAYFAST_MERCHANT_ID: '10000100', PAYFAST_MERCHANT_KEY: '46f0cd694581a' });
    expect(isOnlinePaymentConfigured()).toBe(true);
  });

  it('never offers online payment for alcohol (TAVERN) pools, even when configured — liquor-licensing exposure', () => {
    setPayfastEnv({ PAYFAST_MERCHANT_ID: '10000100', PAYFAST_MERCHANT_KEY: '46f0cd694581a' });
    expect(isOnlinePaymentEligible('TAVERN')).toBe(false);
    expect(isOnlinePaymentEligible('GROCERY')).toBe(true);
    expect(isOnlinePaymentEligible('BUTCHERY')).toBe(true);
    expect(isOnlinePaymentEligible('PRODUCE')).toBe(true);
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
    await expect(markRefundProcessed('pay_4', { feeZAR: '-5' })).rejects.toThrow(/positive number/);
    await expect(markRefundProcessed('pay_4', { feeZAR: 'not-a-number' })).rejects.toThrow(/positive number/);
  });

  it('processes a valid PSP refund and records the fee and note', async () => {
    mockPrisma.poolPayment.findUnique.mockResolvedValue({
      id: 'pay_5', provider: 'PAYFAST', status: 'CLEARED', refundRequestedAt: new Date(),
      userId: 'user_1', amountZAR: '100.00',
    });
    mockPrisma.poolPayment.update.mockResolvedValue({ id: 'pay_5', status: 'REFUNDED' });

    await markRefundProcessed('pay_5', { feeZAR: '10', note: 'Refunded via EFT' });

    expect(mockPrisma.poolPayment.update).toHaveBeenCalledWith({
      where: { id: 'pay_5' },
      data: { status: 'REFUNDED', refundFeeZAR: 10, refundNote: 'Refunded via EFT' },
    });
  });
});
