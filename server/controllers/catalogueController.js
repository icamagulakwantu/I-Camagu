import prisma from '../config/db.js';
import { toPublicSku, PUBLIC_SKU_SELECT } from '../utils/skuVisibility.js';

export async function getCatalogue(req, res) {
  const { category, search } = req.query;

  try {
    const where = {};
    if (category) where.category = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const skus = await prisma.sku.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      // Explicit field list, not the whole row: costPriceZAR is what we pay a
      // supplier and must never reach a member. Selecting everything by
      // default would have shipped it to the browser the moment the column
      // was added. Any new sensitive column is excluded here by default.
      select: PUBLIC_SKU_SELECT,
    });

    // A retail price only ships if somebody checked it. toPublicSku drops an
    // unverified one, which is what stops the Store and the basket total from
    // building a savings claim on an estimate.
    res.json(skus.map(toPublicSku));
  } catch (error) {
    console.error('Get catalogue error:', error.message);
    res.status(500).json({ error: 'Could not fetch catalogue' });
  }
}

export async function getCategories(req, res) {
  try {
    const skus = await prisma.sku.findMany({ select: { category: true }, distinct: ['category'] });
    res.json(skus.map(s => s.category));
  } catch (error) {
    console.error('Get categories error:', error.message);
    res.status(500).json({ error: 'Could not fetch categories' });
  }
}