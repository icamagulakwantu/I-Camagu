import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/db.js', () => ({ default: {} }));
vi.mock('./notificationService.js', () => ({ notifyAdminOfSmartMatchTier: vi.fn() }));

import { lockOpenPoolForJoin } from './matchmakerService.js';

describe('lockOpenPoolForJoin', () => {
  it('locks the pool row before allowing a join to continue', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'pool-1' }]),
      bulkPool: { findUnique: vi.fn().mockResolvedValue({ status: 'OPEN' }) },
    };

    await expect(lockOpenPoolForJoin(tx, 'pool-1')).resolves.toEqual({ status: 'OPEN' });
    expect(tx.$queryRaw).toHaveBeenCalledTimes(1);
    expect(tx.bulkPool.findUnique).toHaveBeenCalledWith({
      where: { id: 'pool-1' },
      select: { status: true, deadline: true, capCases: true, moqTarget: true },
    });
  });

  it('rejects a pool that was matched while the member was submitting', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'pool-1' }]),
      bulkPool: { findUnique: vi.fn().mockResolvedValue({ status: 'MATCHED' }) },
    };

    await expect(lockOpenPoolForJoin(tx, 'pool-1')).rejects.toThrow('This pool is no longer open');
  });

  it('rejects joins after the pool deadline', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'pool-1' }]),
      bulkPool: { findUnique: vi.fn().mockResolvedValue({ status: 'OPEN', deadline: new Date(Date.now() - 1000), capCases: 100, moqTarget: 25 }) },
      basket: { findMany: vi.fn() },
    };

    await expect(lockOpenPoolForJoin(tx, 'pool-1', 1)).rejects.toThrow('joining deadline');
    expect(tx.basket.findMany).not.toHaveBeenCalled();
  });

  it('rejects joins that would exceed the case cap', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'pool-1' }]),
      bulkPool: { findUnique: vi.fn().mockResolvedValue({ status: 'OPEN', deadline: null, capCases: 10, moqTarget: 3 }) },
      basket: { findMany: vi.fn().mockResolvedValue([{ items: [{ quantity: 9 }] }]) },
    };

    await expect(lockOpenPoolForJoin(tx, 'pool-1', 2)).rejects.toThrow('case cap of 10');
  });

  it('rejects a missing pool row', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([]),
      bulkPool: { findUnique: vi.fn() },
    };

    await expect(lockOpenPoolForJoin(tx, 'missing')).rejects.toThrow('Pool not found');
    expect(tx.bulkPool.findUnique).not.toHaveBeenCalled();
  });
});
