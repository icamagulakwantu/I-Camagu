import { randomUUID } from 'crypto';
import prisma from '../config/db.js';

// Ancestral rites backlog (Imisebenzi yezinyanya). A family shares one list,
// keyed by paternal clan name + surname, so siblings and cousins of the same
// lineage see and update the same rites. Rites are hierarchical: the oldest
// generation must be done first, so the list is ordered by generation and an
// item is "waiting" while an older generation still has outstanding rites.
// No migrations exist in this project, so the table is created lazily.

const RITES = ['UKUKHAPHA', 'UKUBUYISA', 'INKOBE_ZIKA_MAMA', 'OTHER'];
const STATUSES = ['OUTSTANDING', 'PLANNED', 'DONE'];

let ready = null;
function ensureTable() {
  if (!ready) {
    ready = (async () => {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "AncestralRite" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "familyKey" TEXT NOT NULL,
          "ancestorName" TEXT NOT NULL,
          "generation" INTEGER NOT NULL,
          "gender" TEXT NOT NULL,
          "rite" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'OUTSTANDING',
          "notes" TEXT,
          "addedById" TEXT NOT NULL,
          "updatedById" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(
        'CREATE INDEX IF NOT EXISTS "AncestralRite_familyKey_idx" ON "AncestralRite" ("familyKey", "generation");'
      );
    })().catch((err) => { ready = null; throw err; });
  }
  return ready;
}

const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

async function familyFor(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { paternalIziduko: true, lastName: true },
  });
  if (!user?.paternalIziduko || !user?.lastName) return null;
  return {
    key: `${norm(user.paternalIziduko)}|${norm(user.lastName)}`,
    clan: user.paternalIziduko.trim(),
    surname: user.lastName.trim(),
  };
}

function needsClan(res) {
  return res.status(400).json({
    error: 'Add your clan name (isiduko) and surname to your profile first',
    code: 'NEEDS_CLAN',
  });
}

export async function listRites(req, res) {
  try {
    await ensureTable();
    const family = await familyFor(req.userId);
    if (!family) return res.json({ family: null, rites: [] });
    const rows = await prisma.$queryRaw`
      SELECT * FROM "AncestralRite" WHERE "familyKey" = ${family.key}
      ORDER BY "generation" DESC, "createdAt" ASC LIMIT 300`;
    const ids = [...new Set(rows.flatMap((r) => [r.addedById, r.updatedById]).filter(Boolean))];
    const users = ids.length
      ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true } })
      : [];
    const names = Object.fromEntries(users.map((u) => [u.id, u.firstName || 'Family member']));
    // The oldest generation that still has unfinished rites. Anything younger waits.
    const open = rows.filter((r) => r.status !== 'DONE');
    const oldestOpen = open.length ? Math.max(...open.map((r) => r.generation)) : null;
    res.json({
      family: { clan: family.clan, surname: family.surname },
      oldestOpenGeneration: oldestOpen,
      rites: rows.map((r) => ({
        id: r.id, ancestorName: r.ancestorName, generation: r.generation, gender: r.gender,
        rite: r.rite, status: r.status, notes: r.notes, createdAt: r.createdAt, updatedAt: r.updatedAt,
        addedBy: names[r.addedById] || 'Family member',
        updatedBy: r.updatedById ? names[r.updatedById] || 'Family member' : null,
        mine: r.addedById === req.userId,
        waiting: r.status !== 'DONE' && oldestOpen !== null && r.generation < oldestOpen,
      })),
    });
  } catch (error) {
    console.error('List rites error:', error.message);
    res.status(500).json({ error: 'Could not load the family list' });
  }
}

export async function addRite(req, res) {
  try {
    await ensureTable();
    const family = await familyFor(req.userId);
    if (!family) return needsClan(res);
    const ancestorName = String(req.body?.ancestorName || '').trim().slice(0, 200);
    const generation = parseInt(req.body?.generation, 10);
    const gender = req.body?.gender === 'FEMALE' ? 'FEMALE' : 'MALE';
    const rite = req.body?.rite;
    const notes = String(req.body?.notes || '').trim().slice(0, 1000) || null;
    if (!ancestorName) return res.status(400).json({ error: "Enter the ancestor's name" });
    if (!(generation >= 1 && generation <= 8)) return res.status(400).json({ error: 'Choose which generation they belong to' });
    if (!RITES.includes(rite)) return res.status(400).json({ error: 'Choose the ceremony that needs to be done' });
    if (rite === 'INKOBE_ZIKA_MAMA' && gender !== 'FEMALE') {
      return res.status(400).json({ error: 'Inkobe zika Mama is done for female ancestors' });
    }
    const id = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO "AncestralRite" ("id", "familyKey", "ancestorName", "generation", "gender", "rite", "notes", "addedById")
      VALUES (${id}, ${family.key}, ${ancestorName}, ${generation}, ${gender}, ${rite}, ${notes}, ${req.userId})`;
    res.status(201).json({ id });
  } catch (error) {
    console.error('Add rite error:', error.message);
    res.status(500).json({ error: 'Could not add to the list' });
  }
}

export async function updateRite(req, res) {
  try {
    await ensureTable();
    const family = await familyFor(req.userId);
    if (!family) return needsClan(res);
    const status = req.body?.status;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Unknown status' });
    const rows = await prisma.$queryRaw`
      UPDATE "AncestralRite" SET "status" = ${status}, "updatedById" = ${req.userId}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${req.params.id} AND "familyKey" = ${family.key} RETURNING "id"`;
    if (!rows.length) return res.status(404).json({ error: 'Not found in your family list' });
    res.json({ message: 'Updated' });
  } catch (error) {
    console.error('Update rite error:', error.message);
    res.status(500).json({ error: 'Could not update' });
  }
}

export async function deleteRite(req, res) {
  try {
    await ensureTable();
    const family = await familyFor(req.userId);
    if (!family) return needsClan(res);
    // Only the person who added an entry may remove it, so one relative can't wipe the family list.
    const rows = await prisma.$queryRaw`
      DELETE FROM "AncestralRite" WHERE "id" = ${req.params.id} AND "familyKey" = ${family.key}
      AND "addedById" = ${req.userId} RETURNING "id"`;
    if (!rows.length) return res.status(403).json({ error: 'Only the person who added this can remove it' });
    res.json({ message: 'Removed' });
  } catch (error) {
    console.error('Delete rite error:', error.message);
    res.status(500).json({ error: 'Could not remove' });
  }
}
