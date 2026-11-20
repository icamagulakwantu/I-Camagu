import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, EKOYINI_PRODUCTS, addEkoyiniProducts } from './ekoyini-catalogue-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const where = { OR: EKOYINI_PRODUCTS.map((p) => ({ name: p.name, bottleFormat: p.bottleFormat })) };

integrationDescribe('Ekoyini catalogue import (real database)', () => {
  let kept;
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.sku.deleteMany({ where });
    // An existing product must be left exactly as it is.
    kept = await prisma.sku.create({ data: { name: 'KWV 3 Year Old', bottleFormat: '750ml Bottle', category: 'BRANDY', productType: 'ALCOHOL', unitsPerCase: 12, casePriceZAR: 2000 } });
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where });
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.$disconnect();
  });

  it('adds the missing products once, with verified retail only where read', async () => {
    expect(await addEkoyiniProducts()).toEqual({ added: EKOYINI_PRODUCTS.length - 1, skipped: false });
    expect(Number((await prisma.sku.findUnique({ where: { id: kept.id } })).casePriceZAR)).toBe(2000);
    const guinness = await prisma.sku.findFirst({ where: { name: 'Guinness Draught Stout', bottleFormat: 'Can (440ml)' } });
    expect(guinness).toMatchObject({ unitsPerCase: 24, retailPriceSource: 'VERIFIED', imageUrl: '/images/brands/guinness-draught-can-440ml.webp' });
    const drambuie = await prisma.sku.findFirst({ where: { name: 'Drambuie', bottleFormat: '750ml Bottle' } });
    expect(drambuie).toMatchObject({ retailPriceZAR: null, retailPriceSource: null });
    expect(await addEkoyiniProducts()).toEqual({ added: 0, skipped: true });
  });
});
