import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, NEW_PRODUCTS, applyDrinksPhotosPrices } from './drinks-photos-prices-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const water = (name, bottleFormat, casePriceZAR, extra = {}) => prisma.sku.create({ data: { name, bottleFormat, category: 'WATER', productType: 'BEVERAGE', unitsPerCase: 24, casePriceZAR, ...extra } });
const names = ['Valpre Still Water', 'Tsitsikamma Still Water', ...NEW_PRODUCTS.map((p) => p.name)];

integrationDescribe('drinks photos and prices (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await water('Valpre Still Water', 'Bottle (1.5L)', 640, { retailPriceZAR: 998, retailPriceSource: 'ESTIMATE' });
    await water('Tsitsikamma Still Water', 'Bottle (500ml)', 200); // already below the shop: kept
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.$disconnect();
  });

  it('lowers estimates, keeps lower prices, adds the new drinks with photos, once', async () => {
    const r = await applyDrinksPhotosPrices();
    expect(r).toMatchObject({ lowered: 1, added: NEW_PRODUCTS.length, skipped: false });
    const valpre = await prisma.sku.findFirst({ where: { name: 'Valpre Still Water', bottleFormat: 'Bottle (1.5L)' } });
    expect(Number(valpre.casePriceZAR)).toBe(338);
    expect(valpre).toMatchObject({ retailPriceSource: 'VERIFIED', imageUrl: '/images/brands/drinks/valpre-still-1-5l.webp' });
    const tsitsi = await prisma.sku.findFirst({ where: { name: 'Tsitsikamma Still Water', bottleFormat: 'Bottle (500ml)' } });
    expect(Number(tsitsi.casePriceZAR)).toBe(200);
    expect(await prisma.sku.findFirst({ where: { name: "M'hudi Pinotage" } })).toMatchObject({ unitsPerCase: 6, category: 'WINE' });
    expect(await applyDrinksPhotosPrices()).toMatchObject({ skipped: true });
  });
});
