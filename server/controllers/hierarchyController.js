import prisma from '../config/db.js';
import { fixedPlace, seatingGroupsFor, suggestedPlace } from '../../shared/seating.js';

// Seating and groups for a ceremony: who sits where (each group in its own
// place, in order of seniority), and who brings what for each group.
// Only the host changes them.

const MAX_LABEL = 60;
const MAX_PLACE = 120;
const clean = (value, max) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

async function ownedCeremony(ceremonyId, userId) {
  if (!ceremonyId) return null;
  const ceremony = await prisma.ceremony.findUnique({ where: { id: ceremonyId } });
  return ceremony && ceremony.hostId === userId ? ceremony : null;
}

async function ownedGroup(groupId, userId) {
  const group = await prisma.ceremonyGroup.findUnique({ where: { id: groupId }, include: { ceremony: true } });
  return group && group.ceremony.hostId === userId ? group : null;
}

const listGroups = (ceremonyId) => prisma.ceremonyGroup.findMany({
  where: { ceremonyId },
  include: { allocations: true },
  orderBy: [{ seatOrder: 'asc' }, { createdAt: 'asc' }],
});

// Numbers the groups 1, 2, 3... in their current order.
async function renumber(ceremonyId) {
  const groups = await listGroups(ceremonyId);
  await Promise.all(groups.map((g, i) => (g.seatOrder === i + 1 ? null : prisma.ceremonyGroup.update({ where: { id: g.id }, data: { seatOrder: i + 1 } }))));
}

// Sets out the ceremony's groups in order of seniority, each with the place
// to start from. Groups already there are kept; a group without a place gets
// the suggested one.
export async function generateDefaultGroups(req, res) {
  const { ceremonyId } = req.body;
  if (!ceremonyId) return res.status(400).json({ error: 'ceremonyId is required' });
  try {
    const ceremony = await ownedCeremony(ceremonyId, req.userId);
    if (!ceremony) return res.status(403).json({ error: 'Not your ceremony' });

    const existing = await listGroups(ceremonyId);
    const byLabel = new Map(existing.map((g) => [g.groupLabel, g]));
    const defaults = seatingGroupsFor(ceremony.type);
    const missing = defaults.filter((g) => !byLabel.has(g.groupLabel));
    if (missing.length) {
      await prisma.ceremonyGroup.createMany({
        data: missing.map((g, i) => ({ ceremonyId, groupLabel: g.groupLabel, place: g.place, seatOrder: existing.length + i + 1 })),
      });
    }
    for (const g of existing) {
      const place = g.place ? null : suggestedPlace(g.groupLabel);
      if (place) await prisma.ceremonyGroup.update({ where: { id: g.id }, data: { place } });
    }
    // First time: in order of seniority. Later: the family's own order.
    if (!existing.length) await renumber(ceremonyId);
    res.status(201).json(await listGroups(ceremonyId));
  } catch (error) {
    console.error('Generate groups error:', error.message);
    res.status(500).json({ error: 'Could not set out the groups' });
  }
}

export async function getCeremonyGroups(req, res) {
  try {
    const ceremony = await ownedCeremony(req.params.ceremonyId, req.userId);
    if (!ceremony) return res.status(403).json({ error: 'Not your ceremony' });
    // Groups set out before places existed get their place to start from,
    // and ootata are always ebuhlanti.
    const groups = await listGroups(ceremony.id);
    const placeFor = (g) => fixedPlace(g.groupLabel) || (!g.place && suggestedPlace(g.groupLabel)) || null;
    const unplaced = groups.filter((g) => placeFor(g) && placeFor(g) !== g.place);
    if (!unplaced.length) return res.json(groups);
    await Promise.all(unplaced.map((g) => prisma.ceremonyGroup.update({ where: { id: g.id }, data: { place: placeFor(g) } })));
    res.json(await listGroups(ceremony.id));
  } catch (error) {
    console.error('Get groups error:', error.message);
    res.status(500).json({ error: 'Could not fetch groups' });
  }
}

// A group the family adds: amakhosikazi, abakhwenyana, the choir...
export async function addGroup(req, res) {
  const groupLabel = clean(req.body.groupLabel, MAX_LABEL);
  const place = fixedPlace(groupLabel) || clean(req.body.place, MAX_PLACE) || null;
  if (!groupLabel) return res.status(400).json({ error: 'Give the group a name' });
  try {
    const ceremony = await ownedCeremony(req.body.ceremonyId, req.userId);
    if (!ceremony) return res.status(403).json({ error: 'Not your ceremony' });
    const count = await prisma.ceremonyGroup.count({ where: { ceremonyId: ceremony.id } });
    await prisma.ceremonyGroup.create({ data: { ceremonyId: ceremony.id, groupLabel, place, seatOrder: count + 1 } });
    res.status(201).json(await listGroups(ceremony.id));
  } catch (error) {
    console.error('Add group error:', error.message);
    res.status(500).json({ error: 'Could not add the group' });
  }
}

// Change a group's name, where it sits, or how many people are in it.
export async function updateGroup(req, res) {
  const data = {};
  if (req.body.groupLabel !== undefined) {
    data.groupLabel = clean(req.body.groupLabel, MAX_LABEL);
    if (!data.groupLabel) return res.status(400).json({ error: 'Give the group a name' });
  }
  if (req.body.place !== undefined) data.place = clean(req.body.place, MAX_PLACE) || null;
  if (req.body.estimatedSize !== undefined) {
    const size = req.body.estimatedSize === null || req.body.estimatedSize === '' ? null : Number.parseInt(req.body.estimatedSize, 10);
    if (size !== null && !(size >= 0 && size <= 5000)) return res.status(400).json({ error: 'How many people: a number from 0 to 5000' });
    data.estimatedSize = size;
  }
  try {
    const group = await ownedGroup(req.params.groupId, req.userId);
    if (!group) return res.status(403).json({ error: 'Not your ceremony' });
    // Ootata are always ebuhlanti: their place cannot be changed.
    const fixed = fixedPlace(data.groupLabel ?? group.groupLabel);
    if (fixed) data.place = fixed;
    await prisma.ceremonyGroup.update({ where: { id: group.id }, data });
    res.json(await listGroups(group.ceremonyId));
  } catch (error) {
    console.error('Update group error:', error.message);
    res.status(500).json({ error: 'Could not save the group' });
  }
}

// Move a group up or down the order of seniority.
export async function moveGroup(req, res) {
  const step = req.body.direction === 'up' ? -1 : req.body.direction === 'down' ? 1 : 0;
  if (!step) return res.status(400).json({ error: 'direction must be up or down' });
  try {
    const group = await ownedGroup(req.params.groupId, req.userId);
    if (!group) return res.status(403).json({ error: 'Not your ceremony' });
    const groups = await listGroups(group.ceremonyId);
    const from = groups.findIndex((g) => g.id === group.id);
    const to = from + step;
    if (to >= 0 && to < groups.length) {
      [groups[from], groups[to]] = [groups[to], groups[from]];
      await prisma.$transaction(groups.map((g, i) => prisma.ceremonyGroup.update({ where: { id: g.id }, data: { seatOrder: i + 1 } })));
    }
    res.json(await listGroups(group.ceremonyId));
  } catch (error) {
    console.error('Move group error:', error.message);
    res.status(500).json({ error: 'Could not move the group' });
  }
}

export async function removeGroup(req, res) {
  try {
    const group = await ownedGroup(req.params.groupId, req.userId);
    if (!group) return res.status(403).json({ error: 'Not your ceremony' });
    await prisma.ceremonyGroup.delete({ where: { id: group.id } });
    await renumber(group.ceremonyId);
    res.json(await listGroups(group.ceremonyId));
  } catch (error) {
    console.error('Remove group error:', error.message);
    res.status(500).json({ error: 'Could not remove the group' });
  }
}

export async function setGroupAllocation(req, res) {
  const { ceremonyGroupId, itemDescription, quantity, unitType } = req.body;
  if (!ceremonyGroupId || !itemDescription || !quantity || !unitType) {
    return res.status(400).json({ error: 'ceremonyGroupId, itemDescription, quantity, and unitType are required' });
  }
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) return res.status(400).json({ error: 'quantity must be a positive number' });
  try {
    const group = await ownedGroup(ceremonyGroupId, req.userId);
    if (!group) return res.status(403).json({ error: 'Not your ceremony' });
    const allocation = await prisma.groupAllocation.create({
      data: { ceremonyGroupId, itemDescription, quantity: qty, unitType },
    });
    res.status(201).json(allocation);
  } catch (error) {
    console.error('Set allocation error:', error.message);
    res.status(500).json({ error: 'Could not set allocation' });
  }
}

export async function getAlcoholSummary(req, res) {
  try {
    const ceremony = await ownedCeremony(req.params.ceremonyId, req.userId);
    if (!ceremony) return res.status(403).json({ error: 'Not your ceremony' });
    const groups = await listGroups(ceremony.id);
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
