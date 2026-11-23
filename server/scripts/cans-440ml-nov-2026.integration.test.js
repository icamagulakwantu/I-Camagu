import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { fixCanSizes } from './cans-440ml-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const FIX = 'cans-440ml-test';
const names = ['Test Cooler A', 'Test Cooler B'];

integrationDescribe('cans the size the shops sell (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX } });
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    for (const name of names) {
      await prisma.sku.create({ data: { name, bottleFormat: 'Can (500ml)', category: 'CIDER_RTD', productType: 'ALCOHOL', unitsPerCase: 24, casePriceZAR: 488.88, retailPriceZAR: 479.99, retailPriceSource: 'ESTIMATE' } });
    }
    // B already has a 440 ml row: it must not get a second one.
    await prisma.sku.create({ data: { name: 'Test Cooler B', bottleFormat: 'Can (440ml)', category: 'CIDER_RTD', productType: 'ALCOHOL', unitsPerCase: 24, casePriceZAR: 500 } });
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await prisma.dataFix.deleteMany({ where: { name: FIX } });
    await prisma.$disconnect();
  });

  it('resizes to 440 ml with a verified shelf price and a cheaper shop case price, once, never duplicating', async () => {
    const list = names.map((name) => ({ name, retail: 719.76, source: 'Shop', bulk: 459, bulkSource: 'Shop case' }));
    expect(await fixCanSizes(list, FIX)).toEqual({ resized: 1, skipped: false });
    const a = await prisma.sku.findFirst({ where: { name: 'Test Cooler A' } });
    expect(a).toMatchObject({ bottleFormat: 'Can (440ml)', retailPriceSource: 'VERIFIED' });
    expect(Number(a.casePriceZAR)).toBe(459);
    expect(await prisma.sku.count({ where: { name: 'Test Cooler B' } })).toBe(2);
    expect(await fixCanSizes(list, FIX)).toMatchObject({ skipped: true });
  });
});
