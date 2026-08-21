import prisma from '../config/db.js';

const DEFAULT_GROUPS = [
      'Ootata', 'Isekela lika Tata', 'OoMama', 'Isekela lika Mama', 'Abayeni', 'Abafazi',
        'Abafana belali', 'Iintombi zelali', 'Abafana bekhaya', 'Iintombi zekhaya',
          'Indlu yeSbane', 'Young boys and girls', 'Personal friends', 'VIP guests',
];

export async function generateDefaultGroups(req, res) {
      const { ceremonyId } = req.body;
        if (!ceremonyId) return res.status(400).json({ error: 'ceremonyId is required' });

          try {
                  const ceremony = await prisma.ceremony.findUnique({ where: { id: ceremonyId } });
                      if (!ceremony || ceremony.hostId !== req.userId) return res.status(403).json({ error: 'Not your ceremony' });

                          const existingGroups = await prisma.ceremonyGroup.findMany({ where: { ceremonyId } });
                          const existingLabels = new Set(existingGroups.map(group => group.groupLabel));
                          const missingGroups = DEFAULT_GROUPS.filter(label => !existingLabels.has(label));
                          if (missingGroups.length > 0) {
                                await prisma.ceremonyGroup.createMany({
                                      data: missingGroups.map((groupLabel, index) => ({ ceremonyId, groupLabel, seatOrder: existingGroups.length + index + 1 })),
                                });
                          }
                          const groups = await prisma.ceremonyGroup.findMany({
                                where: { ceremonyId },
                                include: { allocations: true },
                          });
                              res.status(201).json(groups);
          } catch (error) {
                  console.error('Generate groups error:', error.message);
                      res.status(500).json({ error: 'Could not generate groups' });
          }
}

export async function setGroupAllocation(req, res) {
      const { ceremonyGroupId, itemDescription, quantity, unitType } = req.body;
        if (!ceremonyGroupId || !itemDescription || !quantity || !unitType) {
                return res.status(400).json({ error: 'ceremonyGroupId, itemDescription, quantity, and unitType are required' });
        }

          const qty = parseInt(quantity, 10);
          if (isNaN(qty)) return res.status(400).json({ error: 'quantity must be a number' });

          try {
                  const group = await prisma.ceremonyGroup.findUnique({
                            where: { id: ceremonyGroupId },
                                  include: { ceremony: true },
                  });
                      if (!group || group.ceremony.hostId !== req.userId) return res.status(403).json({ error: 'Not your ceremony' });

                  const allocation = await prisma.groupAllocation.create({
                            data: { ceremonyGroupId, itemDescription, quantity: qty, unitType },
                  });
                      res.status(201).json(allocation);
          } catch (error) {
                  console.error('Set allocation error:', error.message);
                      res.status(500).json({ error: 'Could not set allocation' });
          }
}

export async function getCeremonyGroups(req, res) {
      const { ceremonyId } = req.params;
        try {
                const ceremony = await prisma.ceremony.findUnique({ where: { id: ceremonyId } });
                    if (!ceremony || ceremony.hostId !== req.userId) return res.status(403).json({ error: 'Not your ceremony' });

                const groups = await prisma.ceremonyGroup.findMany({
                          where: { ceremonyId },
                                include: { allocations: true },
                });
                    res.json(groups);
        } catch (error) {
                console.error('Get groups error:', error.message);
                    res.status(500).json({ error: 'Could not fetch groups' });
        }
}
export async function getAlcoholSummary(req, res) {
  const { ceremonyId } = req.params;
  try {
    const ceremony = await prisma.ceremony.findUnique({ where: { id: ceremonyId } });
    if (!ceremony || ceremony.hostId !== req.userId) return res.status(403).json({ error: 'Not your ceremony' });

    const groups = await prisma.ceremonyGroup.findMany({
      where: { ceremonyId },
      include: { allocations: true },
    });

    const totals = {};
    for (const group of groups) {
      for (const alloc of group.allocations) {
        const key = `${alloc.itemDescription}|${alloc.unitType}`;
        totals[key] = (totals[key] || 0) + alloc.quantity;
      }
    }

    const summary = Object.entries(totals).map(([key, quantity]) => {
      const [itemDescription, unitType] = key.split('|');
      return { itemDescription, unitType, totalQuantity: quantity };
    });

    res.json({ groupCount: groups.length, summary });
  } catch (error) {
    console.error('Get alcohol summary error:', error.message);
    res.status(500).json({ error: 'Could not compute summary' });
  }
}