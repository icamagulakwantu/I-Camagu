import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    rawBankLog: { findUnique: vi.fn() },
    stokvelMember: { findFirst: vi.fn() },
    stokvelOfficial: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock('../config/db.js', () => ({ default: prisma }));
vi.mock('./ledgerService.js', () => ({
  ensureLedgerTables: vi.fn(),
  lockStokvelLedger: vi.fn(),
  postEntryWithBalanceTx: vi.fn(),
}));

const { manualAssign } = await import('./reconciliationService.js');

beforeEach(() => {
  vi.clearAllMocks();
  prisma.rawBankLog.findUnique.mockResolvedValue({
    id: 'bank-log-1',
    stokvelId: 'stokvel-A',
    matchedMemberId: null,
    direction: 'CREDIT',
    amount: '100.00',
    rawPayload: { manuallyEntered: true, enteredBy: 'official-A' },
  });
});

describe('manual bank assignment authorization', () => {
  it('rejects a member ID from a different stokvel', async () => {
    prisma.stokvelMember.findFirst.mockResolvedValue(null);

    await expect(manualAssign('bank-log-1', 'member-from-B', 'official-A'))
      .rejects.toThrow('Member not found in this stokvel');

    expect(prisma.stokvelMember.findFirst).toHaveBeenCalledWith({
      where: { id: 'member-from-B', stokvelId: 'stokvel-A' },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects an official assigning a deposit to themselves', async () => {
    prisma.stokvelMember.findFirst.mockResolvedValue({
      id: 'member-A',
      stokvelId: 'stokvel-A',
      userId: 'official-A',
    });
    prisma.stokvelOfficial.findFirst.mockResolvedValue({
      id: 'official-record-A',
      stokvelId: 'stokvel-A',
      userId: 'official-A',
    });

    await expect(manualAssign('bank-log-1', 'member-A', 'official-A'))
      .rejects.toThrow('You cannot assign a deposit to yourself');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuses to assign outgoing bank debits as member contributions', async () => {
    prisma.rawBankLog.findUnique.mockResolvedValue({
      id: 'bank-log-2',
      stokvelId: 'stokvel-A',
      matchedMemberId: null,
      direction: 'DEBIT',
      amount: '25.00',
    });

    await expect(manualAssign('bank-log-2', 'member-A', 'official-A'))
      .rejects.toThrow('Only a CREDIT entry can be assigned');

    expect(prisma.stokvelMember.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
