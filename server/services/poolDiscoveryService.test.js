import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  user: { findUnique: vi.fn() },
  bulkPool: { findMany: vi.fn() },
  ceremony: { findMany: vi.fn() },
  legendEntry: { findMany: vi.fn() },
};
vi.mock('../config/db.js', () => ({ default: prisma }));
vi.mock('./matchmakerService.js', () => ({ checkAndMatchPool: vi.fn(), parkItemsIntoPool: vi.fn() }));

const { getCommunityFeed } = await import('./poolDiscoveryService.js');

describe('getCommunityFeed partial availability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    prisma.user.findUnique.mockResolvedValue({
      id: 'member-1', location: null, latitude: null, longitude: null,
      clanGroupId: null, paternalIziduko: null, maternalIziduko: null,
      paternalGrandmotherIziduko: null, maternalGrandmotherIziduko: null,
    });
    prisma.bulkPool.findMany.mockResolvedValue([]);
    prisma.ceremony.findMany.mockResolvedValue([]);
    prisma.legendEntry.findMany.mockResolvedValue([]);
  });

  it('returns the working sections when an optional pool query fails', async () => {
    prisma.bulkPool.findMany.mockRejectedValue(new Error('pool table temporarily unavailable'));
    await expect(getCommunityFeed('member-1')).resolves.toEqual({
      pools: [],
      upcomingClanCeremonies: [],
      featuredLegends: [],
    });
    expect(console.error).toHaveBeenCalledWith(
      'Community feed pools query failed:',
      expect.stringContaining('pool table temporarily unavailable'),
    );
  });

  it('returns pool and legend data when the ceremony section fails', async () => {
    prisma.ceremony.findMany.mockRejectedValue(new Error('ceremony query failed'));
    prisma.bulkPool.findMany.mockResolvedValue([{ id: 'pool-1', status: 'OPEN', area: 'Gqeberha', baskets: [], tierBasis: 'PALLETS', moqTarget: 56 }]);
    prisma.legendEntry.findMany.mockResolvedValue([{ id: 'legend-1', title: 'Test', bodyText: 'Text', category: 'HISTORY', updatedAt: new Date() }]);

    const result = await getCommunityFeed('member-1');
    expect(result.pools).toHaveLength(0); // No user location means the pool is not nearby.
    expect(result.upcomingClanCeremonies).toEqual([]);
    expect(result.featuredLegends).toHaveLength(1);
  });
});
