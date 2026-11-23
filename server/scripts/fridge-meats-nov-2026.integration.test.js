import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, FRIDGE_PRODUCTS, addFridgeMeats } from './fridge-meats-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const keys = FRIDGE_PRODUCTS.map((p) => ({ name: p.name, bottleFormat: p.bottleFormat }));

integrationDescribe('fridge meats (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.sku.deleteMany({ where: { OR: keys } });
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { OR: keys } });
    await prisma.$disconnect();
  });

  it('adds the six fridge products to Meat with photos and sourced prices, once', async () => {
    expect(await addFridgeMeats()).toMatchObject({ added: FRIDGE_PRODUCTS.length, skipped: false });
    const polony = await prisma.sku.findFirst({ where: { name: 'French Polony', bottleFormat: '3kg Loaf' } });
    expect(polony).toMatchObject({ category: 'MEAT', productType: 'FOOD', bulkUnit: 'loaf', retailPriceSource: 'VERIFIED' });
    expect(polony.imageUrl).toContain('/icamagu/products/french-polony-3kg-loaf');
    expect(await addFridgeMeats()).toMatchObject({ skipped: true });
  });
});
