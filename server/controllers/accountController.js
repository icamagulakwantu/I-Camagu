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

    const officialRoles = await prisma.stokvelOfficial.findMany({ where: { userId: req.userId } });
    for (const role of officialRoles) {
      const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId: role.stokvelId } });
      if (ledger && parseFloat(ledger.totalBalance) > 0) {
        return res.status(400).json({
          error: 'You are an official of a stokvel that still holds funds. Please resolve or transfer that responsibility before deleting your account.',
        });
      }
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: {
        email: `deleted-${req.userId}@icamagu.deleted`,
        firstName: 'Deleted', lastName: 'User', username: null,
        paternalIziduko: null, maternalIziduko: null,
        paternalGrandmotherIziduko: null, maternalGrandmotherIziduko: null,
        address: null, age: null, phoneNumber: null, profileImage: null,
        passwordHash: null, googleId: null, pinHash: null,
      },
    });
    await prisma.refreshToken.updateMany({ where: { userId: req.userId }, data: { revokedAt: new Date() } });

    res.clearCookie('jid', { path: '/api/auth' });
    res.json({ message: 'Your account has been deleted.' });
  } catch (error) {
    console.error('Delete account error:', error.message);
    res.status(500).json({ error: 'Could not delete account' });
  }
}
