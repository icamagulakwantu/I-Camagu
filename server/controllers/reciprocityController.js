import prisma from '../config/db.js';

export async function addReciprocityEntry(req, res) {
      const { direction, counterpartyName, itemDescription, quantity, unitType, ceremonyType, ceremonyLabel, location, eventDate } = req.body;

        if (!direction || !counterpartyName || !itemDescription || !eventDate) {
                return res.status(400).json({ error: 'direction, counterpartyName, itemDescription, and eventDate are required' });
        }
          if (!['GIVEN', 'RECEIVED'].includes(direction)) {
                  return res.status(400).json({ error: "direction must be 'GIVEN' or 'RECEIVED'" });
          }

            // A non-numeric quantity (e.g. "abc") is a truthy string, so a bare
          // `quantity ? parseInt(quantity) : null` still calls parseInt and
          // stores NaN — which Prisma then rejects for this Int? column with an
          // unhandled 500 instead of a clean validation error.
          let numericQuantity = null;
          if (quantity !== undefined && quantity !== null && quantity !== '') {
            numericQuantity = parseInt(quantity, 10);
            if (isNaN(numericQuantity)) {
              return res.status(400).json({ error: 'quantity must be a number' });
            }
          }

          try {
                    const entry = await prisma.reciprocityEntry.create({
                              data: {
                                          userId: req.userId,
                                                  direction,
                                                          counterpartyName,
                                                                  itemDescription,
                                                                          quantity: numericQuantity,
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

// One gift often includes several items at once (e.g. 3 bottles of brandy
// and a case of beer from the same person, on the same day) — this saves
// them as multiple ReciprocityEntry rows sharing the same counterparty/
// occasion/date/direction, in one request, instead of forcing one row per
// item description.
export async function addReciprocityEntriesBatch(req, res) {
  const { direction, counterpartyName, ceremonyType, ceremonyLabel, location, eventDate, items } = req.body;

  if (!direction || !counterpartyName || !eventDate) {
    return res.status(400).json({ error: 'direction, counterpartyName, and eventDate are required' });
  }
  if (!['GIVEN', 'RECEIVED'].includes(direction)) {
    return res.status(400).json({ error: "direction must be 'GIVEN' or 'RECEIVED'" });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one item is required' });
  }
  // Same NaN-bypass gap as addReciprocityEntry, but per item here — a bad
  // quantity on any one item would otherwise reach Prisma as NaN and fail
  // the whole batch with an unhandled 500.
  for (const i of items) {
    if (i?.quantity !== undefined && i.quantity !== null && i.quantity !== '' && isNaN(parseInt(i.quantity, 10))) {
      return res.status(400).json({ error: `quantity for "${i.itemDescription || 'an item'}" must be a number` });
    }
  }
  const cleanItems = items
    .filter((i) => i && i.itemDescription && i.itemDescription.trim())
    .map((i) => ({
      userId: req.userId,
      direction,
      counterpartyName,
      itemDescription: i.itemDescription.trim(),
      quantity: (i.quantity !== undefined && i.quantity !== null && i.quantity !== '') ? parseInt(i.quantity, 10) : null,
      unitType: i.unitType || null,
      ceremonyType: ceremonyType || null,
      ceremonyLabel: ceremonyLabel || null,
      location: location || null,
      eventDate: new Date(eventDate),
    }));
  if (cleanItems.length === 0) {
    return res.status(400).json({ error: 'At least one item with a description is required' });
  }

  try {
    const result = await prisma.reciprocityEntry.createMany({ data: cleanItems });
    res.status(201).json({ count: result.count });
  } catch (error) {
    console.error('Add reciprocity entries batch error:', error.message);
    res.status(500).json({ error: 'Could not add entries' });
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