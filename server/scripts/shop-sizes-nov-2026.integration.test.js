import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { fixShopSizes, FIX_NAME } from './shop-sizes-nov-2026.js';
import { photoUrl } from './product-photos-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const NAMES = ['Kopparberg Pear', 'Breezer Blueberry', 'Butter', 'Maraschino Cherries (Syrup)', 'Rice', 'Tea'];

integrationDescribe('sizes as the shops sell them (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.sku.deleteMany({ where: { name: { in: NAMES } } });
    const drink = { category: 'CIDER_RTD', productType: 'ALCOHOL', unitsPerCase: 24 };
    const food = { category: 'GROCERY', productType: 'FOOD', unitsPerCase: 1 };
    await prisma.sku.create({ data: { ...drink, name: 'Kopparberg Pear', bottleFormat: 'Bottle (500ml)', casePriceZAR: 512.16, retailPriceZAR: 906.03, retailPriceSource: 'ESTIMATE' } });
    await prisma.sku.create({ data: { ...drink, name: 'Breezer Blueberry', bottleFormat: 'Can (500ml)', casePriceZAR: 526, retailPriceZAR: 687, retailPriceSource: 'ESTIMATE' } });
    await prisma.sku.create({ data: { ...food, name: 'Butter', bottleFormat: '1kg', casePriceZAR: 120, retailPriceZAR: 140, retailPriceSource: 'ESTIMATE' } });
    await prisma.sku.create({ data: { ...food, name: 'Tea', bottleFormat: '1kg Box', casePriceZAR: 115, retailPriceZAR: 140, retailPriceSource: 'ESTIMATE' } });
    await prisma.sku.create({ data: { ...food, name: 'Maraschino Cherries (Syrup)', bottleFormat: '350ml Jar', casePriceZAR: 700 } });
    await prisma.sku.create({ data: { ...food, name: 'Rice', bottleFormat: '12.5kg Bag', casePriceZAR: 208 } });
    await prisma.sku.create({ data: { ...food, name: 'Rice', bottleFormat: '10kg Bag', casePriceZAR: 140 } });
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { name: { in: NAMES } } });
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.$disconnect();
  });

  it('relabels to the shop size, retires the rest, and only lowers bulk prices, once', async () => {
    const res = await fixShopSizes();
    expect(res).toMatchObject({ relabelled: 4, skipped: false });
    expect(res.retired).toBe(2);
    const row = (name, f) => prisma.sku.findFirst({ where: { name, bottleFormat: f } });
    const kop = await row('Kopparberg Pear', 'Dumpy (330ml)');
    expect(Number(kop.retailPriceZAR)).toBe(699.99);
    expect(kop.retailPriceSource).toBe('VERIFIED');
    expect(Number(kop.casePriceZAR)).toBe(512.16);
    const bre = await row('Breezer Blueberry', 'Can (440ml)');
    expect(Number(bre.retailPriceZAR)).toBe(604.56);
    expect(bre.retailPriceSource).toBe('ESTIMATE');
    const butter = await row('Butter', '500g Brick');
    expect(Number(butter.casePriceZAR)).toBe(80.99);
    expect(butter.imageUrl).toBe(photoUrl('butter-500g-brick'));
    expect(Number((await row('Tea', '500g Loose Leaf')).casePriceZAR)).toBe(115);
    expect((await row('Maraschino Cherries (Syrup)', '350ml Jar')).retiredAt).not.toBeNull();
    expect((await row('Rice', '12.5kg Bag')).retiredAt).not.toBeNull();
    expect((await row('Rice', '10kg Bag')).retiredAt).toBeNull();
    expect(await fixShopSizes()).toMatchObject({ skipped: true });
  });
});
