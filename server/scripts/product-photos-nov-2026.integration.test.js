import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { addProductPhotos, fixChillersCans, photoUrl } from './product-photos-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;
const FIX = 'product-photos-test';
const CFIX = 'chillers-test';
const names = ['Test Samp PP', 'Test Bread PP', 'Test Cooler PP'];

integrationDescribe('product photos (real database)', () => {
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: { in: [FIX, CFIX] } } });
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    const base = { category: 'GROCERY_BULK', productType: 'FOOD', unitsPerCase: 1, casePriceZAR: 90 };
    await prisma.sku.create({ data: { ...base, name: 'Test Samp PP', bottleFormat: '10kg Bag' } });
    await prisma.sku.create({ data: { ...base, name: 'Test Samp PP', bottleFormat: '12.5kg Bag', imageUrl: '/own.png' } });
    await prisma.sku.create({ data: { ...base, name: 'Test Bread PP', bottleFormat: null } });
    await prisma.sku.create({ data: { ...base, name: 'Test Cooler PP', bottleFormat: 'Can (500ml)', category: 'CIDER_RTD', productType: 'ALCOHOL', unitsPerCase: 24 } });
  });
  afterAll(async () => {
    await prisma.sku.deleteMany({ where: { name: { in: names } } });
    await prisma.dataFix.deleteMany({ where: { name: { in: [FIX, CFIX] } } });
    await prisma.$disconnect();
  });

  it('gives a photo only to the matching row without one, once', async () => {
    const list = [['Test Samp PP', '10kg Bag', 'samp'], ['Test Samp PP', '12.5kg Bag', 'samp-big'], ['Test Bread PP', null, 'bread']];
    expect(await addProductPhotos(list, FIX)).toEqual({ added: 2, skipped: false });
    const rows = await prisma.sku.findMany({ where: { name: { in: ['Test Samp PP', 'Test Bread PP'] } } });
    const img = (n, f) => rows.find((r) => r.name === n && r.bottleFormat === f).imageUrl;
    expect(img('Test Samp PP', '10kg Bag')).toBe(photoUrl('samp'));
    expect(img('Test Samp PP', '12.5kg Bag')).toBe('/own.png');
    expect(img('Test Bread PP', null)).toBe(photoUrl('bread'));
    expect(photoUrl('x')).toMatch(/^https:\/\/res\.cloudinary\.com\/.+\/e_trim\/.+\/icamagu\/products\/x$/);
    expect(await addProductPhotos(list, FIX)).toMatchObject({ skipped: true });
  });

  it('resizes the cans to 440 ml, once', async () => {
    expect(await fixChillersCans(['Test Cooler PP'], CFIX)).toEqual({ resized: 1, skipped: false });
    expect((await prisma.sku.findFirst({ where: { name: 'Test Cooler PP' } })).bottleFormat).toBe('Can (440ml)');
    expect(await fixChillersCans(['Test Cooler PP'], CFIX)).toMatchObject({ skipped: true });
  });
});
