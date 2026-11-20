import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, NEW_PRODUCTS, applyGrocerySpecials } from './grocery-specials-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

integrationDescribe('grocery specials (real database)', () => {
  const made = [];
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.sku.deleteMany({ where: { OR: NEW_PRODUCTS.map((p) => ({ name: p.name, bottleFormat: p.bottleFormat })) } });
    for (const [name, bottleFormat, price] of [['Samp', '10kg Bag', 116.95], ['Sugar', '10kg Bag', 209.03]]) {
      await prisma.sku.deleteMany({ where: { name, bottleFormat } });
      made.push(await prisma.sku.create({ data: { name, bottleFormat, category: 'GROCERY_BULK', productType: 'FOOD', unitsPerCase: 1, casePriceZAR: price, bulkUnit: 'bag', bulkUnitPlural: 'bags' } }));
    }
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { id: { in: made.map((s) => s.id) } } });
    await prisma.sku.deleteMany({ where: { OR: NEW_PRODUCTS.map((p) => ({ name: p.name, bottleFormat: p.bottleFormat })) } });
    await prisma.$disconnect();
  });

  it('lowers to the special, never raises, adds the new staples, once', async () => {
    const r = await applyGrocerySpecials();
    expect(r).toMatchObject({ lowered: 1, kept: 1, added: NEW_PRODUCTS.length, skipped: false });
    expect(Number((await prisma.sku.findFirst({ where: { name: 'Samp', bottleFormat: '10kg Bag' } })).casePriceZAR)).toBe(89.99);
    expect(Number((await prisma.sku.findFirst({ where: { name: 'Sugar', bottleFormat: '10kg Bag' } })).casePriceZAR)).toBe(209.03);
    expect(await prisma.sku.findFirst({ where: { name: 'Eggs', bottleFormat: 'Tray of 30 Large' } })).toMatchObject({ category: 'FRESH_PRODUCE', bulkUnit: 'tray' });
    expect(await applyGrocerySpecials()).toMatchObject({ skipped: true });
  });
});
