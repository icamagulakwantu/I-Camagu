import prisma from '../config/db.js';

export async function addExpenditureEntry(req, res) {
      const { itemName, price, category, purchasedAt } = req.body;
        if (!itemName || !price || !purchasedAt) {
                return res.status(400).json({ error: 'itemName, price, and purchasedAt are required' });
        }

          try {
                  const entry = await prisma.expenditureEntry.create({
                            data: {
                                        userId: req.userId,
                                                itemName,
                                                        price: parseFloat(price),
                                                                category: category || null,
                                                                        source: 'MANUAL',
                                                                                purchasedAt: new Date(purchasedAt),
                            },
                  });
                      res.status(201).json(entry);
          } catch (error) {
                  console.error('Add expenditure error:', error.message);
                      res.status(500).json({ error: 'Could not add entry' });
          }
}

export async function getMyExpenditures(req, res) {
      try {
              const entries = await prisma.expenditureEntry.findMany({
                        where: { userId: req.userId },
                              orderBy: { purchasedAt: 'desc' },
              });
                  const total = entries.reduce((sum, e) => sum + parseFloat(e.price), 0);
                      res.json({ entries, total });
      } catch (error) {
              console.error('Get expenditures error:', error.message);
                  res.status(500).json({ error: 'Could not fetch entries' });
      }
}