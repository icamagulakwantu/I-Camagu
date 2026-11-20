import prisma from '../config/db.js';
import { ceremonyVisibleTo, CEREMONY_HOST_SELECT } from '../services/poolDiscoveryService.js';
import { createNotification } from '../services/notificationDbService.js';

const MAX_GUESTS = 30;
const name = (u) => `${u?.firstName || ''} ${u?.lastName || ''}`.trim() || 'A member';

// POST /api/ceremonies/:id/rsvp { coming, guests }: a member who can see the
// ceremony (their clan's, or a public one) confirms they are coming, with
// how many people, or says they cannot make it.
export async function rsvp(req, res) {
  try {
    const ceremony = await prisma.ceremony.findUnique({ where: { id: req.params.id }, include: { host: { select: CEREMONY_HOST_SELECT } } });
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!ceremony || !ceremonyVisibleTo(user, ceremony)) return res.status(404).json({ error: 'Ceremony not found' });
    if (ceremony.hostId === req.userId) return res.status(400).json({ error: 'This is your own ceremony' });
    const coming = req.body?.coming !== false;
    const guests = Math.min(MAX_GUESTS, Math.max(1, Math.floor(Number(req.body?.guests) || 1)));
    const before = await prisma.ceremonyAttendance.findUnique({ where: { ceremonyId_userId: { ceremonyId: ceremony.id, userId: req.userId } } });
    const row = await prisma.ceremonyAttendance.upsert({
      where: { ceremonyId_userId: { ceremonyId: ceremony.id, userId: req.userId } },
      update: { coming, guests },
      create: { ceremonyId: ceremony.id, userId: req.userId, coming, guests },
    });
    if (coming && !before?.coming) {
      const people = guests > 1 ? ` with ${guests - 1} more` : '';
      await createNotification(ceremony.hostId, 'CEREMONY_RSVP', `${name(user)} is coming to ${ceremony.title}${people}`, 'ceremonyhub').catch(() => {});
    }
    res.json({ coming: row.coming, guests: row.guests });
  } catch (error) {
    console.error('RSVP error:', error.message);
    res.status(500).json({ error: 'Could not save your answer' });
  }
}

// GET /api/ceremonies/:id/attendance: who has confirmed (host only).
export async function attendance(req, res) {
  try {
    const ceremony = await prisma.ceremony.findUnique({ where: { id: req.params.id }, select: { hostId: true } });
    if (!ceremony || ceremony.hostId !== req.userId) return res.status(403).json({ error: 'Not your ceremony' });
    const rows = await prisma.ceremonyAttendance.findMany({ where: { ceremonyId: req.params.id }, orderBy: { updatedAt: 'desc' } });
    const users = await prisma.user.findMany({ where: { id: { in: rows.map((r) => r.userId) } }, select: { id: true, firstName: true, lastName: true, paternalIziduko: true } });
    const byId = new Map(users.map((u) => [u.id, u]));
    const coming = rows.filter((r) => r.coming).map((r) => ({ name: name(byId.get(r.userId)), clan: byId.get(r.userId)?.paternalIziduko || null, guests: r.guests }));
    res.json({
      coming,
      people: coming.reduce((n, r) => n + r.guests, 0),
      notComing: rows.filter((r) => !r.coming).length,
    });
  } catch (error) {
    console.error('Attendance error:', error.message);
    res.status(500).json({ error: 'Could not load who is coming' });
  }
}
