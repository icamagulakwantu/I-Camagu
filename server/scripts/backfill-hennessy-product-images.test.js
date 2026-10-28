import { afterEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: { sku: { updateMany: vi.fn() } },
}));

vi.mock('../config/db.js', () => ({ default: mockPrisma }));

const { backfillHennessyProductImages } = await import('./backfill-hennessy-product-images.js');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('backfillHennessyProductImages', () => {
  it('does not rewrite already-correct verified cognac packshots at every startup', async () => {
    vi.stubEnv('RUN_BOOT_STORE_CATALOGUE_REPAIR', 'false');
    mockPrisma.sku.updateMany.mockResolvedValue({ count: 0 });

    await backfillHennessyProductImages();

    const assignments = mockPrisma.sku.updateMany.mock.calls
      .map(([args]) => args)
      .filter((args) => typeof args.data?.imageUrl === 'string');

    expect(assignments).toHaveLength(7);
    for (const args of assignments) {
      expect(args.where.OR).toEqual([
        { imageUrl: null },
        { imageUrl: { not: args.data.imageUrl } },
      ]);
    }
  });
});
