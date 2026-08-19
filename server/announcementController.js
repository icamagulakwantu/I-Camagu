import prisma from '../config/db.js';

export async function postAnnouncement(req, res) {
  const { stokvelId, message } = req.body;
  if (!stokvelId || !message) return res.status(400).json({ error: 'stokvelId and message are required' });

  try {
    const official = await prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId: req.userId } });
    if (!official) return res.status(403).json({ error: 'Only officials can post announcements' });

    const announcement = await prisma.stokvelAnnouncement.create({
      data: { stokvelId, postedById: req.userId, message: message.trim() },
    });

    const members = await prisma.stokvelMember.findMany({ where: { stokvelId } });
    const { notifyMany } = await import('../services/notificationDbService.js');
    await notifyMany(
      members.map(m => m.userId).filter(id => id !== req.userId),
      'ANNOUNCEMENT',
      `New announcement in your stokvel: "${message.slice(0, 60)}${message.length > 60 ? '...' : ''}"`,
      'stokvels'
    );

    res.status(201).json(announcement);
  } catch (error) {
    console.error('Post announcement error:', error.message);
    res.status(500).json({ error: 'Could not post announcement' });
  }
}

export async function getAnnouncements(req, res) {
  const { stokvelId } = req.params;
  try {
    const member = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId: req.userId } });
    if (!member) return res.status(403).json({ error: 'Not a member of this stokvel' });

    const announcements = await prisma.stokvelAnnouncement.findMany({
      where: { stokvelId },
      include: { postedBy: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(announcements);
  } catch (error) {
    console.error('Get announcements error:', error.message);
    res.status(500).json({ error: 'Could not fetch announcements' });
  }
}
