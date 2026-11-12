import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import prisma from '../config/db.js';
import { cleanUpCatalogueNov2026 } from './catalogue-cleanup-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

const sku = (name, bottleFormat, extra = {}) => ({
  name, bottleFormat, category: 'SOFT_DRINKS', productType: 'BEVERAGE', unitsPerCase: 24, casePriceZAR: 203, ...extra,
});

integrationDescribe('November 2026 catalogue clean-up (real database)', () => {
  let fantaCanId;

  beforeAll(async () => {
    // Only the products this clean-up touches; other suites' data is left alone.
    const names = ['Coca-Cola', 'Fanta Orange', 'Stoney Ginger Beer', "Hunter's Chilled", 'Extreme Energy', 'Extreme Guarana', 'Kopparberg Pear', 'Breezer Blueberry', 'Bernini Ruby Berry'];
    await prisma.basketItem.deleteMany({ where: { sku: { name: { in: names } } } });
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await prisma.sku.createMany({
      data: [
        sku('Coca-Cola', 'Can (250ml)'),
        sku('Fanta Orange', 'Can (250ml)'),
        sku('Coca-Cola', 'Bottle (300ml)', { casePriceZAR: null }),
        sku('Stoney Ginger Beer', 'Bottle (300ml)', { casePriceZAR: 150 }),
        sku("Hunter's Chilled", 'Can (440ml)', { category: 'CIDER_RTD', productType: 'ALCOHOL' }),
        sku('Extreme Energy', 'Dumpy (500ml)', { category: 'ENERGY_DRINK', productType: 'ALCOHOL' }),
        sku('Kopparberg Pear', 'Dumpy (500ml)', { category: 'CIDER_RTD', productType: 'ALCOHOL' }),
        sku('Breezer Blueberry', 'Can (500ml)', { category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/breezer-blueberry.png' }),
        sku('Breezer Blueberry', 'Dumpy (275ml)', { category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/breezer-blueberry.png' }),
        sku('Bernini Ruby Berry', 'Can (500ml)', { category: 'CIDER_RTD', productType: 'ALCOHOL', imageUrl: '/images/brands/the-right-can.png' }),
      ],
    });
    fantaCanId = (await prisma.sku.findFirst({ where: { name: 'Fanta Orange', bottleFormat: 'Can (250ml)' } })).id;
    const user = await prisma.user.create({ data: { email: `cleanup-${randomUUID()}@example.invalid`, firstName: 'Test', lastName: 'Member' } });
    const basket = await prisma.basket.create({ data: { userId: user.id, status: 'PARKED' } });
    await prisma.basketItem.create({ data: { basketId: basket.id, skuId: fantaCanId, quantity: 2 } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('applies the clean-up and changes nothing on a second run', async () => {
    expect(await cleanUpCatalogueNov2026()).toBeGreaterThan(0);
    expect(await cleanUpCatalogueNov2026()).toBe(0);
  });

  it('deletes products nobody ordered and retires the one in a live order', async () => {
    expect(await prisma.sku.findFirst({ where: { name: 'Coca-Cola', bottleFormat: 'Can (250ml)' } })).toBeNull();
    expect(await prisma.sku.findFirst({ where: { name: "Hunter's Chilled" } })).toBeNull();
    const fanta = await prisma.sku.findUnique({ where: { id: fantaCanId } });
    expect(fanta.retiredAt).toBeInstanceOf(Date);
    expect(await prisma.basketItem.count({ where: { skuId: fantaCanId } })).toBe(1);
  });

  it('moves Extreme to ciders and coolers under its real name and size', async () => {
    const extreme = await prisma.sku.findFirst({ where: { name: 'Extreme Guarana' } });
    expect(extreme).toMatchObject({ category: 'CIDER_RTD', bottleFormat: 'Dumpy (330ml)' });
    expect(await prisma.sku.findFirst({ where: { name: 'Extreme Energy' } })).toBeNull();
    expect(await prisma.sku.findFirst({ where: { name: 'Kopparberg Pear' } })).toMatchObject({ bottleFormat: 'Bottle (500ml)' });
  });

  it('removes only images that show the wrong pack', async () => {
    const can = await prisma.sku.findFirst({ where: { name: 'Breezer Blueberry', bottleFormat: 'Can (500ml)' } });
    const bottle = await prisma.sku.findFirst({ where: { name: 'Breezer Blueberry', bottleFormat: 'Dumpy (275ml)' } });
    const bernini = await prisma.sku.findFirst({ where: { name: 'Bernini Ruby Berry' } });
    expect(can.imageUrl).toBeNull();
    expect(bottle.imageUrl).toBe('/images/brands/breezer-blueberry.png');
    expect(bernini.imageUrl).toBe('/images/brands/the-right-can.png');
  });

  it('prices unpriced rows 5% below retail and never overwrites an existing price', async () => {
    const coke = await prisma.sku.findFirst({ where: { name: 'Coca-Cola', bottleFormat: 'Bottle (300ml)' } });
    expect(Number(coke.casePriceZAR)).toBe(180.45);
    expect(Number(coke.retailPriceZAR)).toBe(189.95);
    expect(coke.retailPriceSource).toBe('VERIFIED');
    const stoney = await prisma.sku.findFirst({ where: { name: 'Stoney Ginger Beer', bottleFormat: 'Bottle (300ml)' } });
    expect(Number(stoney.casePriceZAR)).toBe(150);
  });
});
