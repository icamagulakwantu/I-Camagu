import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { applyVerifiedShelfPrices } from './verified-shelf-prices-nov-2026.js';
import { keepBulkBelowShelf } from './bulk-below-shelf.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const FIX = 'verified-shelf-prices-test';
const names = ['Test Liqueur VS', 'Test Cognac VS'];

integrationDescribe('verified shelf prices (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX } });
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await prisma.sku.create({ data: { name: 'Test Liqueur VS', bottleFormat: '750ml Bottle', category: 'LIQUEUR', productType: 'ALCOHOL', unitsPerCase: 12, casePriceZAR: 2534.4, retailPriceZAR: 2284.71, retailPriceSource: 'ESTIMATE' } });
    await prisma.sku.create({ data: { name: 'Test Cognac VS', bottleFormat: '750ml Bottle', category: 'COGNAC', productType: 'ALCOHOL', unitsPerCase: 12, casePriceZAR: 10800, retailPriceZAR: 9893.4, retailPriceSource: 'ESTIMATE' } });
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await prisma.dataFix.deleteMany({ where: { name: FIX } });
    await prisma.$disconnect();
  });

  it('verifies the shelf price, takes a cheaper shop case price, then holds bulk 5% under the shelf', async () => {
    const list = [
      { name: 'Test Liqueur VS', bottleFormat: '750ml Bottle', retail: 2628, source: 'Shop A' },
      { name: 'Test Cognac VS', bottleFormat: '750ml Bottle', retail: 11999.88, source: 'Shop B', bulk: 10188, bulkSource: 'Shop C' },
      { name: 'Not In Catalogue', bottleFormat: '750ml Bottle', retail: 100, source: 'Shop D' },
    ];
    expect(await applyVerifiedShelfPrices(list, FIX)).toEqual({ verified: 2, lowered: 1, skipped: false });
    await keepBulkBelowShelf();
    const liqueur = await prisma.sku.findFirst({ where: { name: 'Test Liqueur VS' } });
    expect(liqueur.retailPriceSource).toBe('VERIFIED');
    expect(Number(liqueur.casePriceZAR)).toBe(2496.6);
    const cognac = await prisma.sku.findFirst({ where: { name: 'Test Cognac VS' } });
    expect(Number(cognac.casePriceZAR)).toBe(10188);
    expect(cognac.retailPriceNote).toContain('Bulk: Shop C');
    expect(await applyVerifiedShelfPrices(list, FIX)).toMatchObject({ skipped: true });
  });
});
