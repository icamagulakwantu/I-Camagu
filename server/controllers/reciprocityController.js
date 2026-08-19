import prisma from '../config/db.js';

export async function addReciprocityEntry(req, res) {
      const { direction, counterpartyName, itemDescription, quantity, unitType, ceremonyType, ceremonyLabel, location, eventDate } = req.body;

        if (!direction || !counterpartyName || !itemDescription || !eventDate) {
                return res.status(400).json({ error: 'direction, counterpartyName, itemDescription, and eventDate are required' });
        }
          if (!['GIVEN', 'RECEIVED'].includes(direction)) {
                  return res.status(400).json({ error: "direction must be 'GIVEN' or 'RECEIVED'" });
          }

            try {
                    const entry = await prisma.reciprocityEntry.create({
                              data: {
                                          userId: req.userId,
                                                  direction,
                                                          counterpartyName,
                                                                  itemDescription,
                                                                          quantity: quantity ? parseInt(quantity) : null,
                                                                                  unitType: unitType || null,
                                                                                          ceremonyType: ceremonyType || null,
                                                                                                  ceremonyLabel: ceremonyLabel || null,
                                                                                                          location: location || null,
                                                                                                                  eventDate: new Date(eventDate),
                              },
                    });
                        res.status(201).json(entry);
            } catch (error) {
                    console.error('Add reciprocity entry error:', error.message);
                        res.status(500).json({ error: 'Could not add entry' });
            }
}

export async function getMyReciprocityEntries(req, res) {
      const { direction, counterpartyName } = req.query;

        try {
                const where = { userId: req.userId };
                    if (direction) where.direction = direction;
                        if (counterpartyName) where.counterpartyName = { contains: counterpartyName, mode: 'insensitive' };

                            const entries = await prisma.reciprocityEntry.findMany({
                                      where,
                                            orderBy: { eventDate: 'desc' },
                            });
                                res.json(entries);
        } catch (error) {
                console.error('Get reciprocity entries error:', error.message);
                    res.status(500).json({ error: 'Could not fetch entries' });
        }
}

export async function deleteReciprocityEntry(req, res) {
      const { entryId } = req.params;

        try {
                const entry = await prisma.reciprocityEntry.findUnique({ where: { id: entryId } });
                    if (!entry || entry.userId !== req.userId) return res.status(403).json({ error: 'Not your entry' });

                        await prisma.reciprocityEntry.delete({ where: { id: entryId } });
                            res.json({ message: 'Entry deleted' });
        } catch (error) {
                console.error('Delete reciprocity entry error:', error.message);
                    res.status(500).json({ error: 'Could not delete entry' });
        }
}
