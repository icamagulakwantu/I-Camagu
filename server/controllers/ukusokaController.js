import prisma from '../config/db.js';

export async function addUkusokaEntry(req, res) {
  const { ceremonyId, initiateName, giverName, relationship, itemDescription, category, dateReceived } = req.body;
  if (!initiateName || !giverName || !itemDescription || !category || !dateReceived) {
    return res.status(400).json({ error: 'initiateName, giverName, itemDescription, category, and dateReceived are required' });
  }
  try {
    const entry = await prisma.ukusokaEntry.create({
      data: {
        recordedById: req.userId,
        ceremonyId: ceremonyId || null,
        initiateName, giverName, relationship: relationship || null,
        itemDescription, category, dateReceived: new Date(dateReceived),
      },
    });
    res.status(201).json(entry);
  } catch (error) {
    console.error('Add Ukusoka entry error:', error.message);
    res.status(500).json({ error: 'Could not add entry' });
  }
}

export async function getMyUkusokaEntries(req, res) {
  const { initiateName } = req.query;
  try {
    const where = { recordedById: req.userId };
    if (initiateName) where.initiateName = { contains: initiateName, mode: 'insensitive' };
    const entries = await prisma.ukusokaEntry.findMany({ where, orderBy: { dateReceived: 'desc' } });
    res.json(entries);
  } catch (error) {
    console.error('Get Ukusoka entries error:', error.message);
    res.status(500).json({ error: 'Could not fetch entries' });
  }
}

export async function deleteUkusokaEntry(req, res) {
  const { entryId } = req.params;
  try {
    const entry = await prisma.ukusokaEntry.findUnique({ where: { id: entryId } });
    if (!entry || entry.recordedById !== req.userId) return res.status(403).json({ error: 'Not your entry' });
    await prisma.ukusokaEntry.delete({ where: { id: entryId } });
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Could not delete entry' });
  }
}