import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { sku: { updateMany: vi.fn() } },
}));

vi.mock('../config/db.js', () => ({ default: mockPrisma }));

const { backfillRequestedProductImages } = await import('./backfill-requested-product-images.js');

afterEach(() => vi.clearAllMocks());

describe('backfillRequestedProductImages', () => {
  it('writes only image URLs that differ from the approved target and avoids the obsolete Honor VS local image', async () => {
    mockPrisma.sku.updateMany.mockResolvedValue({ count: 0 });

    await backfillRequestedProductImages();

    const assignments = mockPrisma.sku.updateMany.mock.calls
      .map(([args]) => args)
      .filter((args) => typeof args.data?.imageUrl === 'string');

    expect(assignments.length).toBeGreaterThan(0);
    for (const args of assignments) {
      expect(args.where.OR).toEqual([
        { imageUrl: null },
        { imageUrl: { not: args.data.imageUrl } },
      ]);
    }
    expect(assignments.some((args) =>
      args.where.name === 'Honor VS' && args.data.imageUrl === '/images/brands/honor-vs.png',
    )).toBe(false);
  });
});
