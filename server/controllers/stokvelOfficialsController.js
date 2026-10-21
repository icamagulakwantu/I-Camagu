import prisma from '../config/db.js';
import { createNotification } from '../services/notificationDbService.js';

const ROLES = ['CHAIRPERSON', 'TREASURER', 'SECRETARY'];
const ROLE_LABEL = { CHAIRPERSON: 'Chairperson', TREASURER: 'Treasurer', SECRETARY: 'Secretary' };

// Only the person who created the stokvel (the organiser) decides who its
// officials are. Officials approve money, so this is deliberately narrow.
async function loadAsOrganiser(stokvelId, userId, res) {
  const stokvel = await prisma.stokvel.findUnique({
    where: { id: stokvelId },
    select: { id: true, name: true, organiserId: true },
  });
  if (!stokvel) {
    res.status(404).json({ error: 'Stokvel not found' });
    return null;
  }
  if (stokvel.organiserId !== userId) {
    res.status(403).json({ error: 'Only the person who created this stokvel can choose its officials' });
    return null;
  }
  return stokvel;
}

// Anyone in the stokvel can see who the officials are and who is a member,
// so they know who to ask to confirm their payment.
export async function listOfficials(req, res) {
  const { stokvelId } = req.params;
  const userId = req.userId;
  try {
    const membership = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId } });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this stokvel' });

    const [stokvel, members, officials] = await Promise.all([
      prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { organiserId: true } }),
      prisma.stokvelMember.findMany({
        where: { stokvelId },
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      prisma.stokvelOfficial.findMany({ where: { stokvelId } }),
    ]);
    const roleByUser = Object.fromEntries(officials.map((o) => [o.userId, o.role]));

    res.json({
      isOrganiser: stokvel?.organiserId === userId,
      people: members.map((m) => ({
        userId: m.userId,
        name: `${m.user.firstName} ${m.user.lastName}`.trim(),
        role: roleByUser[m.userId] || null,
        isOrganiser: m.userId === stokvel?.organiserId,
      })),
    });
  } catch (error) {
    console.error('List officials error:', error.message);
    res.status(500).json({ error: 'Could not load the officials' });
  }
}

// Make a member an official (or change their role).
export async function setOfficial(req, res) {
  const { stokvelId } = req.params;
  const { memberUserId, role } = req.body;
  const userId = req.userId;

  if (!memberUserId || !ROLES.includes(role)) {
    return res.status(400).json({ error: 'Choose a member and a role (Chairperson, Treasurer or Secretary)' });
  }

  try {
    const stokvel = await loadAsOrganiser(stokvelId, userId, res);
    if (!stokvel) return;

    const target = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId: memberUserId } });
    if (!target) return res.status(400).json({ error: 'That person is not a member of this stokvel yet' });

    const existing = await prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId: memberUserId } });
    if (existing) {
      await prisma.stokvelOfficial.update({ where: { id: existing.id }, data: { role } });
    } else {
      await prisma.stokvelOfficial.create({ data: { stokvelId, userId: memberUserId, role } });
    }

    if (memberUserId !== userId) {
      await createNotification(
        memberUserId,
        'STOKVEL_OFFICIAL_ADDED',
        `You were made ${ROLE_LABEL[role]} of ${stokvel.name}. You can now confirm members' payments.`,
        'stokvels'
      ).catch((err) => console.error('Official notification failed:', err.message));
    }

    res.json({ message: `${ROLE_LABEL[role]} saved` });
  } catch (error) {
    console.error('Set official error:', error.message);
    res.status(500).json({ error: 'Could not save the official' });
  }
}

// Take the official role away. The creator always keeps theirs, and a
// stokvel always keeps at least two officials once it has more than one
// member, so someone other than the payer can always confirm.
export async function removeOfficial(req, res) {
  const { stokvelId, memberUserId } = req.params;
  const userId = req.userId;
  try {
    const stokvel = await loadAsOrganiser(stokvelId, userId, res);
    if (!stokvel) return;

    if (memberUserId === stokvel.organiserId) {
      return res.status(400).json({ error: 'The person who created the stokvel always stays an official' });
    }

    const existing = await prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId: memberUserId } });
    if (!existing) return res.status(404).json({ error: 'That person is not an official' });

    await prisma.stokvelOfficial.delete({ where: { id: existing.id } });
    res.json({ message: 'Official role removed' });
  } catch (error) {
    console.error('Remove official error:', error.message);
    res.status(500).json({ error: 'Could not remove the official' });
  }
}
