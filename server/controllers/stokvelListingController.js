import prisma from '../config/db.js';
import { createNotification } from '../services/notificationDbService.js';

// Public listing details live in their own small table, created the first
// time it is needed (same idempotent approach as ensure-schema.js). A stokvel
// without a row here is private, so nothing is shown unless the organiser
// chose to.
let tableReady = null;
function ensureListingTable() {
  if (!tableReady) {
    tableReady = prisma
      .$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StokvelListing" (
          "stokvelId" TEXT NOT NULL PRIMARY KEY,
          "isPublic" BOOLEAN NOT NULL DEFAULT FALSE,
          "purpose" TEXT,
          "area" TEXT,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `)
      .catch((err) => {
        tableReady = null;
        throw err;
      });
  }
  return tableReady;
}

const clean = (value, max) => String(value || '').trim().slice(0, max);

// Words of 3+ letters, so "Mdantsane, East London" matches "East London".
const words = (text) => String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);

export async function getListing(req, res) {
  const { stokvelId } = req.params;
  try {
    await ensureListingTable();
    const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { organiserId: true } });
    if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });
    if (stokvel.organiserId !== req.userId) return res.status(403).json({ error: 'Only the creator can change this' });
    const rows = await prisma.$queryRaw`
      SELECT "isPublic", "purpose", "area" FROM "StokvelListing" WHERE "stokvelId" = ${stokvelId} LIMIT 1`;
    res.json(rows[0] || { isPublic: false, purpose: '', area: '' });
  } catch (error) {
    console.error('Get listing error:', error.message);
    res.status(500).json({ error: 'Could not load the settings' });
  }
}

export async function saveListing(req, res) {
  const { stokvelId } = req.params;
  const isPublic = req.body.isPublic === true;
  const purpose = clean(req.body.purpose, 300);
  const area = clean(req.body.area, 80);
  if (isPublic && (!purpose || !area)) {
    return res.status(400).json({ error: 'Add what the stokvel is for and your area before showing it to others' });
  }
  try {
    await ensureListingTable();
    const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { organiserId: true } });
    if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });
    if (stokvel.organiserId !== req.userId) return res.status(403).json({ error: 'Only the creator can change this' });
    await prisma.$executeRaw`
      INSERT INTO "StokvelListing" ("stokvelId", "isPublic", "purpose", "area", "updatedAt")
      VALUES (${stokvelId}, ${isPublic}, ${purpose}, ${area}, NOW())
      ON CONFLICT ("stokvelId") DO UPDATE
      SET "isPublic" = EXCLUDED."isPublic", "purpose" = EXCLUDED."purpose",
          "area" = EXCLUDED."area", "updatedAt" = NOW()`;
    res.json({ message: isPublic ? 'Your stokvel is now shown to people nearby' : 'Your stokvel is private again' });
  } catch (error) {
    console.error('Save listing error:', error.message);
    res.status(500).json({ error: 'Could not save the settings' });
  }
}

// Public stokvels, with the ones in the person's own area first. Only the
// name, purpose, area and number of members are shown, never member names.
export async function listNearby(req, res) {
  try {
    await ensureListingTable();
    const [me, rows] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.userId }, select: { address: true, location: true } }),
      prisma.$queryRaw`
        SELECT l."stokvelId", l."purpose", l."area", s."name", s."type",
               (SELECT COUNT(*) FROM "StokvelMember" m WHERE m."stokvelId" = s."id")::int AS "memberCount",
               EXISTS (SELECT 1 FROM "StokvelMember" m WHERE m."stokvelId" = s."id" AND m."userId" = ${req.userId}) AS "isMember"
        FROM "StokvelListing" l JOIN "Stokvel" s ON s."id" = l."stokvelId"
        WHERE l."isPublic" = TRUE
        ORDER BY l."updatedAt" DESC LIMIT 100`,
    ]);
    const myWords = new Set([...words(me?.address), ...words(me?.location)]);
    const list = rows
      .filter((r) => !r.isMember)
      .map((r) => ({
        id: r.stokvelId,
        name: r.name,
        type: r.type,
        purpose: r.purpose,
        area: r.area,
        memberCount: r.memberCount,
        isNearYou: words(r.area).some((w) => myWords.has(w)),
      }))
      .sort((a, b) => Number(b.isNearYou) - Number(a.isNearYou))
      .slice(0, 30);
    res.json({ hasAddress: myWords.size > 0, stokvels: list });
  } catch (error) {
    console.error('List nearby error:', error.message);
    res.status(500).json({ error: 'Could not load stokvels near you' });
  }
}

// "Ask to join": tells the creator, who can then invite the person. The
// person is never added without the creator's say.
export async function askToJoin(req, res) {
  const { stokvelId } = req.params;
  try {
    await ensureListingTable();
    const rows = await prisma.$queryRaw`
      SELECT s."name", s."organiserId" FROM "StokvelListing" l JOIN "Stokvel" s ON s."id" = l."stokvelId"
      WHERE l."stokvelId" = ${stokvelId} AND l."isPublic" = TRUE LIMIT 1`;
    const stokvel = rows[0];
    if (!stokvel) return res.status(404).json({ error: 'This stokvel is not open to requests' });
    const already = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId: req.userId } });
    if (already) return res.status(409).json({ error: 'You are already in this stokvel' });

    const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { firstName: true, lastName: true, username: true } });
    const who = `${me?.firstName || ''} ${me?.lastName || ''}`.trim() || 'Someone';
    await createNotification(
      stokvel.organiserId,
      'STOKVEL_JOIN_REQUEST',
      `${who}${me?.username ? ` (@${me.username})` : ''} would like to join "${stokvel.name}". Search their name under Add someone on the Members tab to invite them.`,
      'stokvels'
    );
    res.json({ message: `We told the creator of ${stokvel.name} that you would like to join` });
  } catch (error) {
    console.error('Ask to join error:', error.message);
    res.status(500).json({ error: 'Could not send your request' });
  }
}
