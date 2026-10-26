import prisma from '../config/db.js';
import { generateReferenceCode } from '../utils/memberReference.js';
import { countOpenRequests } from './stokvelApprovalsController.js';

// Joining a stokvel now lives in stokvelApprovalsController.joinOrRequest,
// because an official has to accept new people.

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

  for (const [field, value] of [['contributionAmount', contributionAmount], ['targetAmount', targetAmount]]) {
    if (value !== undefined && value !== null && value !== '') {
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < 0) {
        return res.status(400).json({ error: `${field} must be a positive number` });
      }
    }
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const stokvel = await prisma.stokvel.create({
      data: {
        name,
        type,
        organiserId: userId,
        bankingTrack: 'AFRICAN_BANK',
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

    const referenceCode = await generateReferenceCode(user.firstName, 1);
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

// Badge count: payments to confirm, people asking to join, and expenses
// another official asked for that still need approval.
export async function getPendingApprovalCount(req, res) {
  const userId = req.userId;
  try {
    const officials = await prisma.stokvelOfficial.findMany({
      where: { userId },
      select: { stokvelId: true },
    });
    const stokvelIds = [...new Set(officials.map(o => o.stokvelId))];
    if (stokvelIds.length === 0) return res.json({ count: 0 });
    const [contributions, requests] = await Promise.all([
      prisma.contribution.count({ where: { stokvelId: { in: stokvelIds }, status: 'PENDING' } }),
      countOpenRequests(stokvelIds, userId),
    ]);
    res.json({ count: contributions + requests });
  } catch (error) {
    console.error('Get pending approval count error:', error.message);
    res.status(500).json({ error: 'Could not fetch pending approval count' });
  }
}

/**
 * Leave a stokvel — for non-organiser members only.
 * Blocks if there is an open loan or pending payout tied to this member.
 */
export async function leaveStokvel(req, res) {
  const { stokvelId } = req.params;
  const userId = req.userId;
  try {
    const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId }, select: { organiserId: true, name: true } });
    if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });
    if (stokvel.organiserId === userId) {
      return res.status(400).json({ error: 'The organiser cannot leave — transfer ownership or delete the stokvel instead' });
    }
    const membership = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId } });
    if (!membership) return res.status(400).json({ error: 'You are not a member of this stokvel' });

    // Block if the member has an open loan in this stokvel.
    const openLoans = await prisma.$queryRaw`
      SELECT 1 FROM "StokvelLoan"
      WHERE "stokvelId" = ${stokvelId} AND "borrowerId" = ${userId}
        AND "status" IN ('PENDING','APPROVED') LIMIT 1`.catch(() => []);
    if (openLoans.length) {
      return res.status(400).json({ error: 'You have an open loan in this stokvel. Repay it before leaving.' });
    }

    // Block if there is a pending payout for this member.
    const openPayout = await prisma.payout.findFirst({
      where: { stokvelId, recipientId: userId, status: 'PENDING_APPROVAL' },
    });
    if (openPayout) {
      return res.status(400).json({ error: 'You have a pending payout in this stokvel. Wait for it to clear before leaving.' });
    }

    await prisma.stokvelMember.delete({ where: { id: membership.id } });
    await prisma.stokvelOfficial.deleteMany({ where: { stokvelId, userId } });

    res.json({ message: `You have left ${stokvel.name}` });
  } catch (error) {
    console.error('Leave stokvel error:', error.message);
    res.status(500).json({ error: 'Could not leave stokvel' });
  }
}

export async function deleteStokvel(req, res) {
  const { stokvelId } = req.params;
  try {
    const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId } });
    if (!stokvel || stokvel.organiserId !== req.userId) {
      return res.status(403).json({ error: 'Only the organiser can delete this stokvel' });
    }

    const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    if (ledger && parseFloat(ledger.totalBalance) > 0) {
      return res.status(400).json({ error: 'Cannot delete a stokvel with real funds in its ledger — this protects real money. Contact support if this stokvel genuinely needs to close.' });
    }

    // Financial history is an audit record, not disposable group metadata.
    // A zero balance can coexist with historical contributions, cleared payouts,
    // bank imports, repaid loans, fines, trade credit, or lending entries.
    // Refuse deletion when a ledger exists or any known history remains. Some
    // legacy finance tables are created lazily, so check table existence before
    // querying them; otherwise a brand-new empty group could fail with 500.
    const [memberCount, contributionCount, payoutCount, bankLogCount] = await Promise.all([
      prisma.stokvelMember.count({ where: { stokvelId } }),
      prisma.contribution.count({ where: { stokvelId } }),
      prisma.payout.count({ where: { stokvelId } }),
      prisma.rawBankLog.count({ where: { stokvelId } }),
    ]);

    const legacyHistoryTables = [
      'StokvelLoan',
      'StokvelFine',
      'StokvelTradeCredit',
      'StokvelLendingEntry',
      'StokvelLendingTarget',
      'StokvelLoanRepayment',
      'StokvelLoanVote',
    ];

    let legacyHistoryExists = false;
    for (const table of legacyHistoryTables) {
      const [tableInfo] = await prisma.$queryRaw`SELECT to_regclass(${`"${table}"`}) IS NOT NULL AS "tableExists"`;
      if (!tableInfo?.tableExists) continue;
      const [row] = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (SELECT 1 FROM "${table}" WHERE "stokvelId" = $1) AS "hasRows"`,
        stokvelId
      );
      if (row?.hasRows) {
        legacyHistoryExists = true;
        break;
      }
    }

    const hasFinancialHistory =
      Boolean(ledger) ||
      memberCount > 0 ||
      contributionCount > 0 ||
      payoutCount > 0 ||
      bankLogCount > 0 ||
      legacyHistoryExists;

    if (hasFinancialHistory) {
      return res.status(409).json({
        error: 'This stokvel has a ledger, membership, or financial history. Deletion is disabled to protect records. Use a supported closure/archive process or contact support.',
        code: 'STOKVEL_FINANCIAL_HISTORY_REQUIRES_ARCHIVE',
      });
    }

    // ── Raw-SQL tables (no Prisma cascade) ─────────────────────────────────
    // Delete child tables before parent tables to avoid FK violations.
    // Use $executeRawUnsafe so the table name is literal (not a param),
    // but the stokvelId value is still a bound parameter via interpolation.
    const wipeRaw = async (table) => {
      await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "stokvelId" = $1`,
        stokvelId
      );
    };

    // Loan repayments reference loans — delete them first.
    await prisma.$executeRawUnsafe(
      `DELETE FROM "StokvelLoanRepayment" WHERE "loanId" IN (
         SELECT "id" FROM "StokvelLoan" WHERE "stokvelId" = $1
       )`,
      stokvelId
    );
    await prisma.$executeRawUnsafe(
      `DELETE FROM "StokvelLoanVote" WHERE "loanId" IN (
         SELECT "id" FROM "StokvelLoan" WHERE "stokvelId" = $1
       )`,
      stokvelId
    );
    await wipeRaw('StokvelLoan');
    await wipeRaw('StokvelTradeCredit');
    await wipeRaw('StokvelMinutes');
    await wipeRaw('StokvelFine');
    await wipeRaw('StokvelConstitution');
    await wipeRaw('StokvelAuditLog');
    await wipeRaw('StokvelLendingEntry');
    await wipeRaw('StokvelLendingTarget');

    // ── Prisma-managed tables ───────────────────────────────────────────────
    // Payout -> PayoutApproval/ShrineContribution cascade in schema; delete
    // Payout/Contribution before RawBankLog since they hold an optional FK to it.
    await prisma.stokvelAnnouncement.deleteMany({ where: { stokvelId } });
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

    const memberIds = memberships.map((m) => m.id);
    const sums = memberIds.length
      ? await prisma.contribution.groupBy({
          by: ['memberId'],
          where: { memberId: { in: memberIds }, status: 'CONFIRMED' },
          _sum: { amount: true },
        })
      : [];
    const byMember = Object.fromEntries(
      sums.map((s) => [s.memberId, parseFloat(s._sum.amount || 0)])
    );

    res.json(
      memberships.map((m) => ({ ...m, myBalance: byMember[m.id] || 0 }))
    );
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

export async function setRotationOrder(req, res) {
  const { stokvelId } = req.params;
  const { order } = req.body;
  const userId = req.userId;

  if (!Array.isArray(order) || order.length === 0) {
    return res.status(400).json({ error: 'order must be a non-empty list of member user IDs' });
  }

  try {
    const official = await prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId } });
    if (!official) return res.status(403).json({ error: 'Only stokvel officials can set the rotation order' });

    const members = await prisma.stokvelMember.findMany({ where: { stokvelId } });
    const memberIds = new Set(members.map((m) => m.userId));
    const uniqueOrder = new Set(order);

    if (order.length !== memberIds.size || uniqueOrder.size !== order.length || !order.every((id) => memberIds.has(id))) {
      return res.status(400).json({ error: 'The rotation order must include every current member exactly once' });
    }

    const stokvel = await prisma.stokvel.update({
      where: { id: stokvelId },
      data: { rotationOrder: order, currentRotationIndex: 0 },
    });

    res.json({ stokvel, message: 'Rotation order saved' });
  } catch (error) {
    console.error('Set rotation order error:', error.message);
    res.status(500).json({ error: 'Could not save rotation order' });
  }
}

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

    if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });

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

const UPDATABLE_STOKVEL_FIELDS = ['name', 'contributionAmount', 'contributionFrequency', 'targetAmount', 'targetDate', 'ceremonyType'];

export async function updateStokvel(req, res) {
  const { stokvelId } = req.params;
  const userId = req.userId;

  const updateData = {};
  for (const field of UPDATABLE_STOKVEL_FIELDS) {
    if (req.body[field] === undefined) continue;
    if (field === 'contributionAmount' || field === 'targetAmount') {
      if (req.body[field] === null || req.body[field] === '') {
        updateData[field] = null;
      } else {
        const parsed = parseFloat(req.body[field]);
        if (isNaN(parsed) || parsed < 0) {
          return res.status(400).json({ error: `${field} must be a positive number, or null to clear it` });
        }
        updateData[field] = parsed;
      }
    } else if (field === 'targetDate') {
      updateData[field] = req.body[field] ? new Date(req.body[field]) : null;
    } else {
      updateData[field] = req.body[field] || null;
    }
  }

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
