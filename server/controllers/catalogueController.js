import prisma from '../config/db.js';

export async function getCatalogue(req, res) {
  const { category, search } = req.query;

  try {
    const where = {};
    if (category) where.category = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const skus = await prisma.sku.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });

    res.json(skus);
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
