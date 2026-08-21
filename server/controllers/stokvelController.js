import prisma from '../config/db.js';

function generateReferenceCode(firstName, sequenceNumber) {
  const initials = (firstName || 'MEM').slice(0, 3).toUpperCase().padEnd(3, 'X');
  const number = String(sequenceNumber).padStart(3, '0');
  return `STK-${initials}-${number}`;
}

export async function createStokvel(req, res) {
  const userId = req.userId;
  const { name, type, contributionAmount, contributionFrequency, targetAmount, targetDate, ceremonyType } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: 'Name and type are required' });
  }

  const validTypes = ['ALCOHOL_BULK_POOL', 'UMGALELO_ROTATING', 'CEREMONY_SAVINGS', 'EXISTING_STOKVEL_UPGRADE', 'RECIPROCAL_GIFTING'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: `Type must be one of: ${validTypes.join(', ')}` });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const stokvel = await prisma.stokvel.create({
      data: {
        name,
        type,
        organiserId: userId,
        bankingTrack: 'AFRICAN_BANK', // placeholder value; not actually used until ManualEFT is swapped for a real adapter
        contributionAmount: contributionAmount ? parseFloat(contributionAmount) : null,
        contributionFrequency: contributionFrequency || null,
        targetAmount: targetAmount ? parseFloat(targetAmount) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
        ceremonyType: ceremonyType || null,
      },
    });

    await prisma.stokvelGroupLedger.create({
      data: { stokvelId: stokvel.id, totalBalance: 0 },
    });

    const referenceCode = generateReferenceCode(user.firstName, 1);
    await prisma.stokvelMember.create({
      data: { stokvelId: stokvel.id, userId, referenceCode },
    });

    await prisma.stokvelOfficial.create({
      data: { stokvelId: stokvel.id, userId, role: 'CHAIRPERSON' },
    });

    res.status(201).json({ stokvel, referenceCode, message: `Stokvel created. You are the Chairperson. Your reference code is ${referenceCode}.` });
  } catch (error) {
    console.error('Create stokvel error:', error.message);
    res.status(500).json({ error: 'Could not create stokvel' });
  }
}

export const recordInterest = async (req, res) => {
  try {
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// src/controllers/stokvelController.js

export async function getPendingApprovalCount(req, res) {
  const userId = req.userId;

    try {
        // Find all stokvels where this user is an official
            const officials = await prisma.stokvelOfficial.findMany({
                  where: { userId },
                        select: { stokvelId: true },
                            });

                                const stokvelIds = officials.map(o => o.stokvelId);

                                    if (stokvelIds.length === 0) {
                                          return res.json({ count: 0 });
                                              }

                                                  // Count pending contributions across all those stokvels
                                                      const count = await prisma.contribution.count({
                                                            where: {
                                                                    stokvelId: { in: stokvelIds },
                                                                            status: 'PENDING',
                                                                                  },
                                                                                      });

                                                                                          res.json({ count });
                                                                                            } catch (error) {
                                                                                                console.error('Get pending approval count error:', error.message);
                                                                                                    res.status(500).json({ error: 'Could not fetch pending approval count'  });                           }                                  }

export async function joinStokvel(req, res) {
  const userId = req.userId;
  const { stokvelId } = req.body;

  if (!stokvelId) return res.status(400).json({ error: 'stokvelId is required' });

  try {
    const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId } });
    if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });

    const existing = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId } });
    if (existing) return res.status(409).json({ error: 'You are already a member of this stokvel' });

    const memberCount = await prisma.stokvelMember.count({ where: { stokvelId } });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const referenceCode = generateReferenceCode(user.firstName, memberCount + 1);

    const membership = await prisma.stokvelMember.create({
      data: { stokvelId, userId, referenceCode },
    });

    res.status(201).json({ membership, message: `Joined ${stokvel.name}. Your reference code is ${referenceCode}.` });
  } catch (error) {
    console.error('Join stokvel error:', error.message);
    res.status(500).json({ error: 'Could not join stokvel' });
  }
}

export async function deleteStokvel(req, res) {
  const { stokvelId } = req.params;
  try {
    const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId } });
    if (!stokvel || stokvel.organiserId !== req.userId) return res.status(403).json({ error: 'Only the organiser can delete this stokvel' });

    const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    if (ledger && parseFloat(ledger.totalBalance) > 0) {
      return res.status(400).json({ error: 'Cannot delete a stokvel with real funds in its ledger — this protects real money. Contact support if this stokvel genuinely needs to close.' });
    }

    // Payout -> PayoutApproval/ShrineTithe cascade in schema; delete Payout/Contribution
    // before RawBankLog since they hold an optional FK to it.
    await prisma.payout.deleteMany({ where: { stokvelId } });
    await prisma.contribution.deleteMany({ where: { stokvelId } });
    await prisma.rawBankLog.deleteMany({ where: { stokvelId } });
    await prisma.stokvelMember.deleteMany({ where: { stokvelId } });
    await prisma.stokvelOfficial.deleteMany({ where: { stokvelId } });
    await prisma.stokvelGroupLedger.deleteMany({ where: { stokvelId } });
    await prisma.stokvel.delete({ where: { id: stokvelId } });
    res.json({ message: 'Stokvel deleted' });
  } catch (error) {
    console.error('Delete stokvel error:', error.message);
    res.status(500).json({ error: 'Could not delete stokvel' });
  }
}

export async function toggleBereavementProtocol(req, res) {
  const { stokvelId, active } = req.body;
  try {
    const official = await prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId: req.userId } });
    if (!official) return res.status(403).json({ error: 'Only officials can activate this' });

    const stokvel = await prisma.stokvel.update({
      where: { id: stokvelId },
      data: { bereavementActive: !!active },
    });
    res.json({
      stokvel,
      message: active
        ? 'Bereavement protocol active. All automated reminders are suspended for this group.'
        : 'Bereavement protocol lifted.',
    });
  } catch (error) {
    console.error('Toggle bereavement error:', error.message);
    res.status(500).json({ error: 'Could not update bereavement status' });
  }
}

export async function getMyStokvels(req, res) {
  try {
    const memberships = await prisma.stokvelMember.findMany({
      where: { userId: req.userId },
      include: {
        stokvel: {
          include: { groupLedger: true, _count: { select: { members: true } } },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
    res.json(memberships);
  } catch (error) {
    console.error('Get my stokvels error:', error.message);
    res.status(500).json({ error: 'Could not fetch stokvels' });
  }
}

export async function getStokvel(req, res) {
  const { stokvelId } = req.params;
  const userId = req.userId;

  try {
    const membership = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId } });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this stokvel' });

    const stokvel = await prisma.stokvel.findUnique({
      where: { id: stokvelId },
      include: {
        groupLedger: true,
        members: { include: { user: { select: { firstName: true, lastName: true, username: true } } } },
        officials: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
    });

    const contributions = await prisma.contribution.findMany({
      where: { stokvelId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const payouts = await prisma.payout.findMany({
      where: { stokvelId },
      include: { approvals: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      stokvel,
      myReferenceCode: membership.referenceCode,
      isOfficial: stokvel.officials.some(o => o.userId === userId),
      contributions,
      payouts,
    });
  } catch (error) {
    console.error('Get stokvel error:', error.message);
    res.status(500).json({ error: 'Could not fetch stokvel' });
  }
}

// Additional handlers required for complete route balance

export async function getStokvelsById(req, res) {
  const { stokvelId } = req.params;
  const userId = req.userId;
  try {
    const membership = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId } });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this stokvel' });

    const stokvel = await prisma.stokvel.findUnique({
      where: { id: stokvelId },
      include: {
        groupLedger: true,
        _count: { select: { members: true } },
      },
    });

    if (!stokvel) {
      return res.status(404).json({ error: 'Stokvel not found' });
    }

    res.json(stokvel);
  } catch (error) {
    console.error('Get stokvel by ID error:', error.message);
    res.status(500).json({ error: 'Could not fetch stokvel' });
  }
}

export async function getStokvels(req, res) {
  try {
    const stokvels = await prisma.stokvel.findMany({
      include: {
        groupLedger: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(stokvels);
  } catch (error) {
    console.error('Get stokvels error:', error.message);
    res.status(500).json({ error: 'Could not fetch stokvels' });
  }
}

export async function updateStokvel(req, res) {
  const { stokvelId } = req.params;
  const userId = req.userId;
  const updateData = req.body;

  try {
    const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId } });
    if (!stokvel || stokvel.organiserId !== userId) {
      return res.status(403).json({ error: 'Only the organiser can update this stokvel' });
    }

    const updated = await prisma.stokvel.update({
      where: { id: stokvelId },
      data: updateData,
    });

    res.json({ stokvel: updated, message: 'Stokvel updated successfully' });
  } catch (error) {
    console.error('Update stokvel error:', error.message);
    res.status(500).json({ error: 'Could not update stokvel' });
  }
}
