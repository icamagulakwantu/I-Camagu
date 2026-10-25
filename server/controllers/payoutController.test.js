import { describe, it, expect, vi, beforeEach } from 'vitest';

// FIN-04: donation and allocation amounts must be exact cents, and the fund
// reserve check must happen inside the same transaction as the new record.
const tx = {
  $executeRaw: vi.fn(),
  shrineContribution: { aggregate: vi.fn(), create: vi.fn() },
};
const prisma = {
  user: { findUnique: vi.fn() },
  shrineContribution: { create: vi.fn() },
  $transaction: vi.fn((fn) => fn(tx)),
};
const notifyAdmin = vi.fn();

vi.mock('../config/db.js', () => ({ default: prisma }));
vi.mock('../services/ledgerService.js', () => ({}));
vi.mock('../services/pinService.js', () => ({}));
vi.mock('../config/admin.js', () => ({ isAdminEmail: () => true }));
vi.mock('../services/notificationService.js', () => ({ notifyAdminOfShrineDonationPledge: notifyAdmin }));

const payouts = await import('./payoutController.js');

function fakeRes() {
  const res = { statusCode: 200, body: undefined };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

async function call(handler, body) {
  const res = fakeRes();
  await handler({ body, userId: 'admin-1' }, res);
  return { status: res.statusCode, body: res.body };
}

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue({ email: 'admin@example.com' });
  prisma.shrineContribution.create.mockImplementation(async ({ data }) => ({ id: 'd1', ...data }));
  tx.shrineContribution.create.mockImplementation(async ({ data }) => ({ id: 'a1', ...data }));
});

// The voluntary 3% fund contribution used to be worked out with floating
// point (amount * 0.03), which can produce fractions of a cent.
describe('suggestedContributionCents', () => {
  it('is exactly 3% for round amounts', () => {
    expect(payouts.suggestedContributionCents(100000)).toBe(3000); // R1000 -> R30
  });

  it('rounds half-up to a whole cent', () => {
    expect(payouts.suggestedContributionCents(1050)).toBe(32); // R10.50 * 3% = 31.5c -> 32c
    expect(payouts.suggestedContributionCents(1049)).toBe(31); // 31.47c -> 31c
  });

  it('always returns whole cents', () => {
    for (const cents of [1, 99, 12345, 3333333]) {
      expect(Number.isInteger(payouts.suggestedContributionCents(cents))).toBe(true);
    }
  });
});

describe('decimalToCents', () => {
  it('turns database sums into exact cents', () => {
    expect(payouts.decimalToCents(null)).toBe(0);
    expect(payouts.decimalToCents('0.30')).toBe(30);
    expect(payouts.decimalToCents(0.1 + 0.2)).toBe(30);
  });
});

describe('donations', () => {
  it('stores the amount as exact cents', async () => {
    const result = await call(payouts.donateToShrineFund, { amount: '10.50' });
    expect(result.status).toBe(201);
    expect(prisma.shrineContribution.create.mock.calls[0][0].data.amount).toBe('10.50');
  });

  it('refuses more than 2 decimals and amounts below R1', async () => {
    expect((await call(payouts.donateToShrineFund, { amount: '10.005' })).status).toBe(400);
    expect((await call(payouts.donateToShrineFund, { amount: '0.99' })).status).toBe(400);
    expect(prisma.shrineContribution.create).not.toHaveBeenCalled();
  });

  it('still confirms a saved pledge when the admin notification fails', async () => {
    notifyAdmin.mockRejectedValueOnce(new Error('mail down'));
    const result = await call(payouts.donateToShrineFund, { amount: '5' });
    expect(result.status).toBe(201);
  });
});

describe('fund allocations', () => {
  const reserve = (raised, allocated) => {
    tx.shrineContribution.aggregate
      .mockResolvedValueOnce({ _sum: { amount: raised } })
      .mockResolvedValueOnce({ _sum: { amount: allocated } });
  };
  const body = (amount) => ({ amount, sector: 'LIVESTOCK', description: 'Cattle for the sanctuary' });

  it('allows allocating exactly the whole reserve, to the cent', async () => {
    reserve('100.30', '0.20');
    const result = await call(payouts.recordShrineAllocation, body('100.10'));
    expect(result.status).toBe(201);
    expect(tx.shrineContribution.create.mock.calls[0][0].data.amount).toBe('100.10');
  });

  it('refuses one cent more than the reserve', async () => {
    reserve('100.30', '0.20');
    const result = await call(payouts.recordShrineAllocation, body('100.11'));
    expect(result.status).toBe(400);
    expect(tx.shrineContribution.create).not.toHaveBeenCalled();
  });

  it('checks the reserve under the fund lock, inside the transaction', async () => {
    reserve('50', '0');
    await call(payouts.recordShrineAllocation, body('10'));
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.$executeRaw.mock.invocationCallOrder[0])
      .toBeLessThan(tx.shrineContribution.aggregate.mock.invocationCallOrder[0]);
  });

  it('refuses more than 2 decimals', async () => {
    const result = await call(payouts.recordShrineAllocation, body('10.001'));
    expect(result.status).toBe(400);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
