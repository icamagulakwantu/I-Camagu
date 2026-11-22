import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, NEW_PRODUCTS, PHOTO_FIX_NAME, applyDrinksPhotosPrices, fixTsitsikammaSparklingPhoto } from './drinks-photos-prices-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const water = (name, bottleFormat, casePriceZAR, extra = {}) => prisma.sku.create({ data: { name, bottleFormat, category: 'WATER', productType: 'BEVERAGE', unitsPerCase: 24, casePriceZAR, ...extra } });
const names = ['Valpre Still Water', 'Tsitsikamma Still Water', 'Tsitsikamma Sparkling Water', ...NEW_PRODUCTS.map((p) => p.name)];

integrationDescribe('drinks photos and prices (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: { in: [FIX_NAME, PHOTO_FIX_NAME] } } });
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await water('Valpre Still Water', 'Bottle (1.5L)', 640, { retailPriceZAR: 998, retailPriceSource: 'ESTIMATE' });
    await water('Tsitsikamma Still Water', 'Bottle (500ml)', 200); // already below the shop: kept
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await prisma.dataFix.deleteMany({ where: { name: { in: [FIX_NAME, PHOTO_FIX_NAME] } } });
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

  it('moves the tall Tsitsikamma Sparkling photo from the 1L to the 1.5L', async () => {
    const oneL = await water('Tsitsikamma Sparkling Water', 'Bottle (1L)', 510, { imageUrl: '/images/brands/drinks/tsitsikamma-sparkling-1l.webp' });
    const big = await water('Tsitsikamma Sparkling Water', 'Bottle (1.5L)', 717);
    expect(await fixTsitsikammaSparklingPhoto()).toEqual({ cleared: 1, set: 1, skipped: false });
    expect((await prisma.sku.findUnique({ where: { id: oneL.id } })).imageUrl).toBeNull();
    expect((await prisma.sku.findUnique({ where: { id: big.id } })).imageUrl).toBe('/images/brands/drinks/tsitsikamma-sparkling-1-5l.webp');
    expect(await fixTsitsikammaSparklingPhoto()).toEqual({ skipped: true });
  });
});
