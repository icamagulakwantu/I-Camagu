import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, RELABELS, RETIRE, correctQuartSizes } from './quart-sizes-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const names = [...new Set([...RELABELS.map((r) => r[0]), ...RETIRE.map((r) => r[0])])];
const make = (name, bottleFormat, casePriceZAR, extra = {}) => prisma.sku.create({ data: { name, bottleFormat, category: 'BEER', productType: 'ALCOHOL', unitsPerCase: 12, casePriceZAR, ...extra } });

integrationDescribe('quart sizes (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await make('Amstel Lager', 'Quart (750ml)', 291);
    await make('Windhoek Lager', 'Quart (750ml)', 302.64);
    await make("Hunter's Dry", 'Quart (750ml)', 419.04);
    await make('Brutal Fruit Ruby Apple', 'Quart (750ml)', 407.4);
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.$disconnect();
  });

  it('relabels to 660ml, lowers prices only, retires the made-up quart, once', async () => {
    expect(await correctQuartSizes()).toEqual({ relabelled: 3, retired: 1, skipped: false });
    const amstel = await prisma.sku.findFirst({ where: { name: 'Amstel Lager', bottleFormat: 'Quart (660ml)' } });
    expect(Number(amstel.casePriceZAR)).toBe(247.99);
    expect(Number(amstel.retailPriceZAR)).toBe(299.88);
    const windhoek = await prisma.sku.findFirst({ where: { name: 'Windhoek Lager', bottleFormat: 'Quart (660ml)' } });
    expect(Number(windhoek.casePriceZAR)).toBe(302.64);
    const hunters = await prisma.sku.findFirst({ where: { name: "Hunter's Dry", bottleFormat: 'Quart (660ml)' } });
    expect(hunters.imageUrl).toBe('/images/brands/hunters-dry.png');
    expect((await prisma.sku.findFirst({ where: { name: 'Brutal Fruit Ruby Apple' } })).retiredAt).not.toBeNull();
    expect(await correctQuartSizes()).toMatchObject({ skipped: true });
  });
});
