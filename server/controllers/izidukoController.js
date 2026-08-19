import { findClanMatches } from '../services/izidukoService.js';
import prisma from '../config/db.js';

export async function getMyClanMatches(req, res) {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const profileComplete = !!(
      me.paternalIziduko &&
      me.maternalIziduko &&
      me.paternalGrandmotherIziduko &&
      me.maternalGrandmotherIziduko &&
      me.profileImage
    );

    if (!profileComplete) {
      return res.json({
        profileComplete: false,
        matches: [],
        message: 'Complete your four ancestral Isiduko fields and add a profile photo before viewing clan member profiles.',
      });
    }

    const rawMatches = await findClanMatches(req.userId);

    const ranked = rawMatches.map((other) => {
      const matchedCount = other.matchedLines.length;
      let tier = 5;
      let label = 'Potential ancestral connection';
      if (other.sameSurname && matchedCount >= 4) {
        tier = 1;
        label = 'Strong ancestral connection — shared four Isiduko lines & surname';
      } else if (other.sameSurname && matchedCount >= 2) {
        tier = 2;
        label = 'Strong ancestral connection — shared Isiduko lines & surname';
      } else if (matchedCount >= 3) {
        tier = 2;
        label = 'Multiple ancestral Isiduko connections';
      } else if (matchedCount === 2) {
        tier = 3;
        label = 'Shares two ancestral Isiduko lines';
      } else if (other.sameSurname) {
        tier = 4;
        label = 'Same surname — potential connection';
      } else {
        tier = 5;
        label = 'Shares an Isiduko line';
      }

      return { ...other, tier, label };
    }).sort((a, b) => a.tier - b.tier);

    res.json({ profileComplete: true, matches: ranked });
  } catch (error) {
    console.error('Get clan matches error:', error.message);
    res.status(500).json({ error: 'Could not fetch clan matches' });
  }
}
