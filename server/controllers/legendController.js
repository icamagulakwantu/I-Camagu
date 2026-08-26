import prisma from '../config/db.js';
import { isAdminEmail } from '../config/admin.js';

export async function getFeaturedLegend(req, res) {
      try {
              const where = { isFeatured: true, verificationStatus: { in: ['VERIFIED', 'TRADITIONAL_ATTRIBUTION'] } };
                  const entries = await prisma.legendEntry.findMany({ where });
                  for (let i = entries.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [entries[i], entries[j]] = [entries[j], entries[i]];
                  }
                  res.json(entries);
      } catch (error) {
              console.error('Get featured legend error:', error.message);
                  res.status(500).json({ error: 'Could not fetch legend' });
      }
}

export async function getAllLegends(req, res) {
      try {
              const entries = await prisma.legendEntry.findMany({ orderBy: { category: 'asc' } });
                  res.json(entries);
      } catch (error) {
              console.error('Get legends error:', error.message);
                  res.status(500).json({ error: 'Could not fetch legends' });
      }
}

export async function verifyLegendEntry(req, res) {
      const { legendId, verificationStatus, sourceNote } = req.body;
      const allowed = ['VERIFIED', 'TRADITIONAL_ATTRIBUTION', 'DISPUTED', 'PENDING_REVIEW'];
      if (!legendId || !allowed.includes(verificationStatus)) {
            return res.status(400).json({ error: 'legendId and a valid verificationStatus are required' });
      }

      try {
            const user = await prisma.user.findUnique({ where: { id: req.userId } });
            if (!user || !isAdminEmail(user.email)) {
                  return res.status(403).json({ error: 'Admin access required' });
            }

            const entry = await prisma.legendEntry.update({
                  where: { id: legendId },
                  data: {
                        verificationStatus,
                        sourceNote: sourceNote || null,
                        reviewedAt: verificationStatus === 'PENDING_REVIEW' ? null : new Date(),
                  },
            });
            res.json(entry);
      } catch (error) {
            console.error('Verify legend error:', error.message);
            res.status(500).json({ error: 'Could not update legend verification' });
      }
}
