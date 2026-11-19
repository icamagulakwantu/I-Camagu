import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import prisma from '../config/db.js';
import { FIX_NAME, LOCAL_VENDORS, SAMPLE_PRACTITIONERS, updateDirectoryListings } from './directory-listings-nov-2026.js';

const integrationDescribe = process.env.RUN_POSTGRES_INTEGRATION === 'true' ? describe : describe.skip;

integrationDescribe('directory clean-up and local listings (real database)', () => {
  let real;
  beforeAll(async () => {
    await prisma.dataFix.deleteMany({ where: { name: FIX_NAME } });
    await prisma.vendor.deleteMany({ where: { name: { in: LOCAL_VENDORS.map((v) => v.name) } } });
    await prisma.practitioner.deleteMany({ where: { name: { in: [...SAMPLE_PRACTITIONERS.map((p) => p.name), 'A real ingcibi'] } } });
    for (const sample of SAMPLE_PRACTITIONERS) await prisma.practitioner.create({ data: { ...sample, role: 'INGCIBI', area: 'Somewhere' } });
    // Same name as a sample but a real number: must be kept.
    real = await prisma.practitioner.create({ data: { name: 'Nkosi Ingcibi Practice', contactInfo: '082 000 1111', role: 'INGCIBI', area: 'Mdantsane' } });
  });
  afterAll(async () => {
    await prisma.practitioner.deleteMany({ where: { id: real.id } });
    await prisma.$disconnect();
  });

  it('removes only the samples, adds the businesses, and runs once', async () => {
    const first = await updateDirectoryListings();
    expect(first).toMatchObject({ removed: 4, added: 2, skipped: false });
    expect(await prisma.practitioner.count({ where: { contactInfo: { contains: '555' } } })).toBe(0);
    expect(await prisma.practitioner.findUnique({ where: { id: real.id } })).not.toBeNull();
    const shwabz = await prisma.vendor.findFirst({ where: { name: 'Shwabz KwaSintu' } });
    expect(shwabz).toMatchObject({ category: 'TRADITIONAL_GOODS', area: 'KwaDwesi, Gqeberha' });
    expect(await updateDirectoryListings()).toMatchObject({ skipped: true });
  });
});
