import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { makePricesHonest, FIX_NAME } from './honest-prices-nov-2026.js';
import { addSamMeats, FIX_NAME as SAM_FIX } from './sam-meats-nov-2026.js';
import { toPublicSku } from '../utils/skuVisibility.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const NAMES = ['Ponchos Tequila Coffee', 'Windhoek Draught', 'Commando Brandy', 'Burger Patties', 'Johnnie Walker Red Label', 'Kwv Test HP', 'Pork'];
const old = new Date('2026-11-20T12:00:00Z');

integrationDescribe('honest prices (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: { in: [FIX_NAME, SAM_FIX] } } });
    await prisma.sku.deleteMany({ where: { name: { in: NAMES } } });
    await prisma.vendor.deleteMany({ where: { name: 'Sam Meat Needs' } });
    const drink = { category: 'SPIRITS', productType: 'ALCOHOL', retailPriceSource: 'VERIFIED', retailPriceCheckedAt: old };
    await prisma.sku.create({ data: { ...drink, name: 'Ponchos Tequila Coffee', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2188.8, retailPriceZAR: 4079.88, retailPriceNote: 'Shoprite R339.99 x 12' } });
    await prisma.sku.create({ data: { ...drink, category: 'BEER', name: 'Windhoek Draught', bottleFormat: 'Can (440ml)', unitsPerCase: 24, casePriceZAR: 341.99, retailPriceZAR: 359.99, retailPriceNote: 'PROMOTIONAL - valid 1-15 Sep 2026 only' } });
    await prisma.sku.create({ data: { ...drink, name: 'Commando Brandy', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2349, retailPriceZAR: 2759.88, retailPriceNote: 'PROMOTIONAL - valid 1-15 Sep 2026 only, not a standing shelf price.' } });
    await prisma.sku.create({ data: { ...drink, name: 'Johnnie Walker Red Label', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2735.88, retailPriceZAR: 2879.88, retailPriceNote: 'Ultra Liquors broadsheets Oct 2026: R239.99' } });
    await prisma.sku.create({ data: { ...drink, name: 'Kwv Test HP', bottleFormat: '750ml Bottle', unitsPerCase: 12, casePriceZAR: 2388, retailPriceZAR: 2999.88, retailPriceNote: 'Lowest offer R199 x 12; regular R249.99 at Shoprite' } });
    await prisma.sku.create({ data: { ...drink, category: 'MEAT', productType: 'FOOD', name: 'Burger Patties', bottleFormat: 'Box of 20 x 90g', unitsPerCase: 1, casePriceZAR: 74.77, retailPriceZAR: 129.99, retailPriceNote: 'Shoprite, Farmer Joe\'s' } });
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { name: { in: NAMES } } });
    await prisma.vendor.deleteMany({ where: { name: 'Sam Meat Needs' } });
    await prisma.dataFix.deleteMany({ where: { name: { in: [FIX_NAME, SAM_FIX] } } });
    await prisma.$disconnect();
  });

  it('fixes the case size, specials and unlike shop prices, and never leaves a group price below a special', async () => {
    const res = await makePricesHonest();
    expect(res.skipped).toBe(false);
    const get = (name) => prisma.sku.findFirst({ where: { name } });

    const ponchos = await get('Ponchos Tequila Coffee');
    expect(ponchos.unitsPerCase).toBe(6);
    expect(Number(ponchos.retailPriceZAR)).toBe(2039.94);
    expect(Number(ponchos.casePriceZAR)).toBeGreaterThanOrEqual(2039.94 * 0.85);
    expect(Number(ponchos.casePriceZAR)).toBeLessThanOrEqual(2039.94 * 0.95);

    const windhoek = await get('Windhoek Draught');
    expect(windhoek.bottleFormat).toBe('NRB (440ml)');
    expect(Number(windhoek.retailPriceZAR)).toBe(434.99);
    expect(Number(windhoek.casePriceZAR)).toBeGreaterThanOrEqual(17.08 * 24);

    const commando = await get('Commando Brandy');
    expect(commando.retailPriceSource).toBe('ESTIMATE');
    expect(Number(commando.casePriceZAR)).toBe(2759.88);

    const jw = await get('Johnnie Walker Red Label');
    expect(jw.retailPriceSource).toBe('ESTIMATE');
    expect(Number(jw.casePriceZAR)).toBeGreaterThanOrEqual(249.99 * 12);

    const kwv = await get('Kwv Test HP');
    expect(kwv.retailPriceSource).toBe('VERIFIED');

    const burger = await get('Burger Patties');
    expect(burger.retailPriceSource).toBe('ESTIMATE');
    expect(Number(burger.casePriceZAR)).toBe(74.77);

    expect(await makePricesHonest()).toEqual({ skipped: true });
  });

  it('never shows a saving above 25%', () => {
    const recent = new Date();
    const base = { retailPriceSource: 'VERIFIED', retailPriceCheckedAt: recent, retailPriceZAR: 100 };
    expect(toPublicSku({ ...base, casePriceZAR: 80 }).retailPriceZAR).toBe(100);
    expect(toPublicSku({ ...base, casePriceZAR: 60 }).retailPriceZAR).toBeNull();
  });

  it('adds Sam Meat Needs and their 5kg pork, once', async () => {
    expect(await addSamMeats()).toMatchObject({ vendors: 1, products: 1 });
    const pork = await prisma.sku.findFirst({ where: { name: 'Pork', bottleFormat: '5kg Bag' } });
    expect(Number(pork.casePriceZAR)).toBe(350);
    expect(pork.retailPriceZAR).toBeNull();
    expect(await addSamMeats()).toEqual({ skipped: true });
  });
});
