import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { fixCaseSizes, FIX_NAME } from './case-sizes-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const NAMES = ['Valpre Still Water', 'Tsitsikamma Still Water', 'Monin Test CS'];

integrationDescribe('case sizes as the shops sell them (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.sku.deleteMany({ where: { name: { in: NAMES } } });
    const water = { category: 'WATER', productType: 'BEVERAGE' };
    await prisma.sku.create({ data: { ...water, name: 'Valpre Still Water', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: 338, retailPriceZAR: 527.76, retailPriceSource: 'VERIFIED' } });
    await prisma.sku.create({ data: { ...water, name: 'Tsitsikamma Still Water', bottleFormat: 'Bottle (1.5L)', unitsPerCase: 24, casePriceZAR: 387.37, retailPriceZAR: 407.76, retailPriceSource: 'VERIFIED' } });
    await prisma.sku.create({ data: { category: 'MIXER', productType: 'BEVERAGE', name: 'Monin Test CS', bottleFormat: '700ml Bottle', unitsPerCase: 12, casePriceZAR: 2578, retailPriceZAR: 3348 } });
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { name: { in: NAMES } } });
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.$disconnect();
  });

  it('repacks by the case the shops sell, keeping the price of a bottle, once', async () => {
    expect((await fixCaseSizes()).changed).toBe(3);
    const get = (name) => prisma.sku.findFirst({ where: { name } });
    const valpre = await get('Valpre Still Water');
    expect([valpre.unitsPerCase, Number(valpre.casePriceZAR), Number(valpre.retailPriceZAR)]).toEqual([12, 169, 263.88]);
    const tsitsi = await get('Tsitsikamma Still Water');
    expect([tsitsi.unitsPerCase, Number(tsitsi.casePriceZAR), Number(tsitsi.retailPriceZAR)]).toEqual([6, 96.84, 101.94]);
    const monin = await get('Monin Test CS');
    expect([monin.unitsPerCase, Number(monin.casePriceZAR)]).toEqual([6, 1289]);
    expect(await fixCaseSizes()).toMatchObject({ skipped: true });
  });
});
