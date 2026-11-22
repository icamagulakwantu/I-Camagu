import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { applyCheck } from './apply-price-checks.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const FIX = 'price-check-test-2026-11-30';
const names = ['Test Vodka PC', 'Test Gin PC'];

integrationDescribe('weekly price check (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX } });
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    for (const [name, casePriceZAR] of [['Test Vodka PC', 2000], ['Test Gin PC', 1500]]) {
      await prisma.sku.create({ data: { name, bottleFormat: '750ml Bottle', category: 'VODKA', productType: 'ALCOHOL', unitsPerCase: 12, casePriceZAR } });
    }
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await prisma.dataFix.deleteMany({ where: { name: FIX } });
    await prisma.$disconnect();
  });

  it('lowers, never raises, reports rises and unknowns, once', async () => {
    const json = { checkedOn: '2026-11-30', checks: [
      { name: 'Test Vodka PC', bottleFormat: '750ml Bottle', bulk: 1899, retail: 2159.88, source: 'Shop A case of 12' },
      { name: 'Test Gin PC', bottleFormat: '750ml Bottle', bulk: 1600, retail: null, source: 'Shop B case of 12' },
      { name: 'Not Sold Here', bottleFormat: '750ml Bottle', bulk: 100, retail: null, source: 'Shop C single' },
    ] };
    const r = await applyCheck(json, FIX);
    expect(r).toMatchObject({ lowered: 1, unchanged: 1, skipped: false });
    expect(r.higherFound).toHaveLength(1);
    expect(r.missing).toEqual(['Not Sold Here (750ml Bottle)']);
    const vodka = await prisma.sku.findFirst({ where: { name: 'Test Vodka PC' } });
    expect(Number(vodka.casePriceZAR)).toBe(1899);
    expect(vodka.retailPriceSource).toBe('VERIFIED');
    expect(Number((await prisma.sku.findFirst({ where: { name: 'Test Gin PC' } })).casePriceZAR)).toBe(1500);
    expect(await applyCheck(json, FIX)).toEqual({ skipped: true });
  });
});
