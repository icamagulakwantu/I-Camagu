import prisma from '../config/db.js';
import { verifyPassword } from '../services/passwordService.js';

export async function exportMyData(req, res) {
  try {
    const userId = req.userId;
    const memberships = await prisma.stokvelMember.findMany({ where: { userId }, select: { id: true } });
    const memberIds = memberships.map(m => m.id);
    const [user, stokvelMemberships, contributions, plans, reciprocityEntries, ukusokaEntries, expenditures] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true, firstName: true, lastName: true, paternalIziduko: true, maternalIziduko: true,
          paternalGrandmotherIziduko: true, maternalGrandmotherIziduko: true,
          address: true, age: true, phoneNumber: true, createdAt: true,
        },
      }),
      prisma.stokvelMember.findMany({ where: { userId }, include: { stokvel: { select: { name: true } } } }),
      prisma.contribution.findMany({ where: { memberId: { in: memberIds } } }),
      prisma.preparationPlan.findMany({ where: { hostId: userId }, include: { checklistItems: true } }),
      prisma.reciprocityEntry.findMany({ where: { userId } }),
      prisma.ukusokaEntry.findMany({ where: { recordedById: userId } }),
      prisma.expenditureEntry.findMany({ where: { userId } }),
    ]);

    res.json({
      exportedAt: new Date().toISOString(),
      profile: user,
      stokvelMemberships, contributions, ceremonyPlans: plans,
      ukugidaEntries: reciprocityEntries, ukusokaEntries, expenditureEntries: expenditures,
    });
  } catch (error) {
    console.error('Export data error:', error.message);
    res.status(500).json({ error: 'Could not export data' });
  }
}

export async function deleteMyAccount(req, res) {
  const { password, confirmText } = req.body;
  if (confirmText !== 'DELETE MY ACCOUNT') {
    return res.status(400).json({ error: 'Please type the confirmation phrase exactly' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: 'Account not found' });

    if (user.passwordHash) {
      if (!password) return res.status(400).json({ error: 'Password is required to confirm deletion' });
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Incorrect password' });
    }

    // Block if the user is an official of a stokvel that still holds funds.
    const officialRoles = await prisma.stokvelOfficial.findMany({ where: { userId: req.userId } });
    for (const role of officialRoles) {
      const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId: role.stokvelId } });
      if (ledger && parseFloat(ledger.totalBalance) > 0) {
        return res.status(400).json({
          error: 'You are an official of a stokvel that still holds funds. Please resolve or transfer that responsibility before deleting your account.',
        });
      }
    }

    const userId = req.userId;

    // ── 1. Remove raw-SQL ancestral rites ────────────────────────────────────
    // These rows use a familyKey, not a userId FK, so we compute the key and
    // wipe only the entries this user added (same ownership rule as deleteRite).
    const { paternalIziduko, lastName } = user;
    if (paternalIziduko && lastName) {
      const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const familyKey = `${norm(paternalIziduko)}|${norm(lastName)}`;
      await prisma.$executeRawUnsafe(
        `DELETE FROM "AncestralRite" WHERE "familyKey" = $1 AND "addedById" = $2`,
        familyKey,
        userId
      ).catch(() => {/* table may not exist yet on a fresh deployment */});
    }

    // ── 2. Prisma-managed personal data ─────────────────────────────────────
    // Delete in dependency order (FK children before parents).
    await prisma.expenditureEntry.deleteMany({ where: { userId } });
    await prisma.reciprocityEntry.deleteMany({ where: { userId } });
    await prisma.ukusokaEntry.deleteMany({ where: { recordedById: userId } });

    // Preparation plans own checklist items and pledges via cascade.
    await prisma.preparationPlan.deleteMany({ where: { hostId: userId } });

    // Ceremonies own their child rows via cascade (checklistItems, costItems,
    // ceremonyGroups, barBookings, tourismPackage, ukusokaEntries).
    // Only delete ceremonies that have no external bookings.
    const myCeremonies = await prisma.ceremony.findMany({
      where: { hostId: userId },
      select: { id: true, barBookings: { select: { id: true } }, tourismPackage: { include: { bookings: { select: { id: true } } } } },
    });
    for (const c of myCeremonies) {
      const hasExternal = c.barBookings.length > 0 || (c.tourismPackage?.bookings?.length || 0) > 0;
      if (!hasExternal) {
        await prisma.ceremony.delete({ where: { id: c.id } });
      }
      // Ceremonies with real bookings are not deleted — they are kept for the
      // vendor/tourism record. The host identity on them is preserved.
    }

    // Messages sent or received — wipe both directions.
    await prisma.message.deleteMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    });

    // Clan connections in either direction.
    await prisma.clanConnection.deleteMany({
      where: { OR: [{ requesterId: userId }, { recipientId: userId }] },
    });

    // Notifications addressed to this user.
    await prisma.notification.deleteMany({ where: { userId } });

    // Baskets (draft orders in the pool buying system).
    await prisma.basket.deleteMany({ where: { userId } });

    // OTP codes and refresh tokens.
    await prisma.otpCode.deleteMany({ where: { userId } });
    await prisma.refreshToken.deleteMany({ where: { userId } });

    // Stokvel membership and official roles (non-blocking — financial records
    // such as contributions and payouts are kept but the memberId FK will
    // point at a deleted member row; this is acceptable for audit purposes).
    await prisma.stokvelOfficial.deleteMany({ where: { userId } });
    await prisma.stokvelMember.deleteMany({ where: { userId } });

    // ── 3. Anonymise the user row ────────────────────────────────────────────
    // Keep the row so FK references from audit records, financial history and
    // vendor-created rows don't break. Strip every piece of personal data.
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@icamagu.deleted`,
        firstName: 'Deleted',
        lastName: 'User',
        username: null,
        paternalIziduko: null,
        maternalIziduko: null,
        paternalGrandmotherIziduko: null,
        maternalGrandmotherIziduko: null,
        nationLabel: null,
        address: null,
        age: null,
        phoneNumber: null,
        location: null,
        latitude: null,
        longitude: null,
        profileImage: null,
        passwordHash: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        googleId: null,
        pinHash: null,
        idNumberEncrypted: null,
        idNumberLast4: null,
        idDocumentUrl: null,
        identityVerificationStatus: 'UNVERIFIED',
        identitySubmittedAt: null,
        identityVerifiedAt: null,
        identityVerifiedById: null,
        identityRejectionReason: null,
      },
    });

    res.clearCookie('jid', { path: '/api/auth' });
    res.json({ message: 'Your account has been deleted.' });
  } catch (error) {
    console.error('Delete account error:', error.message);
    res.status(500).json({ error: 'Could not delete account' });
  }
}
