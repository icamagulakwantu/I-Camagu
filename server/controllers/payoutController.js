// src/controllers/payoutController.js
import prisma from '../config/db.js';
import { postEntry } from '../services/ledgerService.js';
import { toCents } from '../utils/money.js';

// Suggested contribution rate, shown to a stokvel member when they request
// a payout — never forced. 3% is confirmed as the suggested figure; the
// exact commercial breakdown is still pending (Section 8 open item).
const SUGGESTED_CONTRIBUTION_RATE = 0.03;
const MIN_DONATION_ZAR = 1;

// Real development sectors the fund can commit money to. Labels are shown
// as-is on the public page — no sector appears there until real money has
// actually been allocated to it.
export const ALLOCATION_SECTORS = {
  SANCTUARY_LAND: 'Sacred sanctuary — land',
  SANCTUARY_BUILDING: 'Sacred sanctuary — building',
  AGRI_RND: 'Agricultural research & development',
  FISHERIES: 'Fisheries',
  LIVESTOCK: 'Livestock',
  WINE_ESTATES: 'Xhosa-owned wine estates',
  ADMIN_OPERATIONS: 'Administration & operations',
};

export async function getShrineFundTotal(req, res) {
  try {
    // Money in and money out share one ledger, so every total here is scoped
    // by entryType — otherwise an allocation would inflate "total raised".
    const contributionWhere = { status: 'CONFIRMED', entryType: 'CONTRIBUTION' };
    const allocationWhere = { status: 'CONFIRMED', entryType: 'ALLOCATION' };
    const [aggregate, earliest, payoutCount, donationCount, allocAggregate, allocBySector] =
      await Promise.all([
        prisma.shrineContribution.aggregate({ where: contributionWhere, _sum: { amount: true }, _count: true }),
        prisma.shrineContribution.findFirst({ where: contributionWhere, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
        prisma.shrineContribution.count({ where: { ...contributionWhere, source: 'PAYOUT_CONTRIBUTION' } }),
        prisma.shrineContribution.count({ where: { ...contributionWhere, source: 'PUBLIC_DONATION' } }),
        prisma.shrineContribution.aggregate({ where: allocationWhere, _sum: { amount: true } }),
        prisma.shrineContribution.groupBy({
          by: ['sector'],
          where: allocationWhere,
          _sum: { amount: true },
          _count: true,
        }),
      ]);

    const totalRaised = parseFloat(aggregate._sum.amount || 0);
    const totalAllocated = parseFloat(allocAggregate._sum.amount || 0);

    res.json({
      totalAmount: totalRaised,
      contributionCount: aggregate._count,
      payoutContributionCount: payoutCount,
      donationCount,
      sinceDate: earliest?.createdAt || null,
      suggestedRate: SUGGESTED_CONTRIBUTION_RATE,
      minDonation: MIN_DONATION_ZAR,
      totalAllocated,
      liquidReserve: totalRaised - totalAllocated,
      // Only sectors with real allocations appear — an empty array genuinely
      // means nothing has been committed yet, not that data is missing.
      allocationsBySector: allocBySector
        .filter((row) => row.sector)
        .map((row) => ({
          sector: row.sector,
          label: ALLOCATION_SECTORS[row.sector] || row.sector,
          amount: parseFloat(row._sum.amount || 0),
          count: row._count,
        }))
        .sort((a, b) => b.amount - a.amount),
      note: 'Ubuhlanti bakwa Xhosa — every contribution here is voluntary.',
    });
  } catch (error) {
    console.error('Get shrine fund total error:', error.message);
    res.status(500).json({ error: 'Could not fetch Ubuhlanti bakwa Xhosa fund total' });
  }
}

// Admin-only: records that real money has been committed out of the fund to
// a real project. Nothing here moves money — it's a transparency record of a
// decision already taken, entered by hand with a reference document, the
// same manual-review posture as every other money flow in this app.
export async function recordShrineAllocation(req, res) {
  const { amount, sector, description, referenceUrl } = req.body;
  const numericAmount = parseFloat(amount);

  try {
    const admin = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } });
    const { isAdminEmail } = await import('../config/admin.js');
    if (!admin || !isAdminEmail(admin.email)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'A positive amount is required' });
    }
    if (!sector || !ALLOCATION_SECTORS[sector]) {
      return res.status(400).json({ error: `sector must be one of: ${Object.keys(ALLOCATION_SECTORS).join(', ')}` });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'A description of what this funds is required' });
    }

    // Can't commit more than the fund actually holds.
    const [raised, allocated] = await Promise.all([
      prisma.shrineContribution.aggregate({ where: { status: 'CONFIRMED', entryType: 'CONTRIBUTION' }, _sum: { amount: true } }),
      prisma.shrineContribution.aggregate({ where: { status: 'CONFIRMED', entryType: 'ALLOCATION' }, _sum: { amount: true } }),
    ]);
    const reserve = parseFloat(raised._sum.amount || 0) - parseFloat(allocated._sum.amount || 0);
    if (numericAmount > reserve) {
      return res.status(400).json({
        error: `The fund's uncommitted reserve is R${reserve.toFixed(2)} — cannot allocate R${numericAmount.toFixed(2)}.`,
      });
    }

    const allocation = await prisma.shrineContribution.create({
      data: {
        amount: numericAmount,
        entryType: 'ALLOCATION',
        sector,
        description: description.trim(),
        referenceUrl: referenceUrl?.trim() || null,
        source: 'FUND_ALLOCATION',
        status: 'CONFIRMED',
      },
    });

    res.status(201).json({ allocation, message: 'Allocation recorded on the public fund ledger.' });
  } catch (error) {
    console.error('Record shrine allocation error:', error.message);
    res.status(500).json({ error: 'Could not record allocation' });
  }
}

// A stokvel payout contributing its opt-in share, OR a direct public
// donation of any amount from R1 up — both land in the same voluntary
// ledger. Public donations start PENDING: there's no live payment gateway
// or bank details on file yet, so a real person follows up to confirm the
// actual transfer rather than the app claiming money it hasn't received.
export async function donateToShrineFund(req, res) {
  const { amount, donorName, donorEmail } = req.body;
  const numericAmount = parseFloat(amount);

  if (!numericAmount || isNaN(numericAmount) || numericAmount < MIN_DONATION_ZAR) {
    return res.status(400).json({ error: `Donations start from R${MIN_DONATION_ZAR}` });
  }

  try {
    const donation = await prisma.shrineContribution.create({
      data: {
        amount: numericAmount,
        source: 'PUBLIC_DONATION',
        status: 'PENDING',
        donorName: donorName || null,
        donorEmail: donorEmail || null,
      },
    });

    // Anyone may donate, signed in or not — only look up an account when
    // there actually is one, so an anonymous public donation doesn't fail.
    const donor = req.userId
      ? await prisma.user.findUnique({
          where: { id: req.userId },
          select: { firstName: true, lastName: true, email: true },
        })
      : null;
    const { notifyAdminOfShrineDonationPledge } = await import('../services/notificationService.js');
    await notifyAdminOfShrineDonationPledge(donation, donor);

    res.status(201).json({
      donation,
      message: "Thank you — we've recorded your pledge. Someone from iCamagu will follow up with you directly to complete the transfer.",
    });
  } catch (error) {
    console.error('Donate to shrine fund error:', error.message);
    res.status(500).json({ error: 'Could not record donation' });
  }
}

export async function requestPayout(req, res) {
  const userId = req.userId;
  const { stokvelId, amount, recipientId, contributeOptIn } = req.body;

  if (!stokvelId || !amount) {
    return res.status(400).json({ error: 'stokvelId and amount are required' });
  }

  const requestedAmount = parseFloat(amount);
  if (isNaN(requestedAmount) || requestedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  try {
    // Check membership
    const membership = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId } });
    if (!membership) return res.status(403).json({ error: 'You are not a member of this stokvel' });

    const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId } });
    if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });

    let finalRecipientId = recipientId || userId;

    // Rotating stokvels (umgalelo) must pay out strictly in turn — the
    // recipient is always whoever is next in rotationOrder, regardless
    // of who submits the request. Checked before the balance so a
    // misconfigured rotation surfaces before an amount complaint.
    if (stokvel.type === 'UMGALELO_ROTATING') {
      const order = Array.isArray(stokvel.rotationOrder) ? stokvel.rotationOrder : null;
      if (!order || order.length === 0) {
        return res.status(400).json({ error: 'This rotating stokvel has no rotation order set yet — ask an official to set one first.' });
      }
      const currentTurnUserId = order[stokvel.currentRotationIndex % order.length];
      if (recipientId && recipientId !== currentTurnUserId) {
        return res.status(400).json({ error: "It's not this member's turn in the rotation yet" });
      }
      finalRecipientId = currentTurnUserId;
    } else if (recipientId) {
      // A non-rotating payout can still be requested on someone else's
      // behalf (e.g. a household head), but only for a real member of
      // this stokvel — not an arbitrary user id.
      const recipientMembership = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId: recipientId } });
      if (!recipientMembership) return res.status(400).json({ error: 'recipientId must be a member of this stokvel' });
    }

    // Check balance — a stokvel always gets a ledger row at creation
    // (see createStokvel), so a missing one here is unexpected; treat it
    // as blocking rather than silently skipping the balance check.
    const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    if (!ledger) return res.status(409).json({ error: 'This stokvel has no group ledger yet — contact support' });
    if (parseFloat(ledger.totalBalance) < requestedAmount) {
      return res.status(400).json({ error: 'Requested amount exceeds the group balance' });
    }

    // Create ONE payout
    const payout = await prisma.payout.create({
      data: {
        stokvelId,
        recipientId: finalRecipientId,
        amount: requestedAmount,
        status: 'PENDING_APPROVAL',
        contributionOptIn: contributeOptIn === true,
      },
    });

    // Notify officials
    const { notifyMany } = await import('../services/notificationDbService.js');
    const officials = await prisma.stokvelOfficial.findMany({ where: { stokvelId } });
    await notifyMany(
      officials.map(o => o.userId),
      'PAYOUT_APPROVAL_NEEDED',
      `A payout of R${requestedAmount.toFixed(2)} needs your approval.`,
      'stokvels'
    );

    res.status(201).json({ payout, message: 'Payout requested. Awaiting official approval.' });
  } catch (error) {
    console.error('Request payout error:', error.message);
    res.status(500).json({ error: 'Could not request payout' });
  }
}

// The books entry is written after the payout has cleared. If it fails the
// payout itself still succeeded, so we log loudly and warn the caller.
// Re-running is safe: the same idempotency key never counts the money twice.
async function postPayoutToLedger(payout, approverId) {
  try {
    const cents = toCents(String(payout.amount));
    await postEntry({
      stokvelId: payout.stokvelId,
      kind: 'PAYOUT',
      memo: 'Stokvel payout',
      lines: [
        { account: 'PAYOUTS', amountCents: cents },
        { account: 'BANK', amountCents: -cents },
      ],
      idempotencyKey: `payout:${payout.id}`,
      createdById: approverId,
    });
    return null;
  } catch (error) {
    console.error('LEDGER POST FAILED', 'PAYOUT', payout.id, error.message);
    return 'The payout cleared but the books entry could not be saved. Tell your treasurer so it can be corrected.';
  }
}

export async function approvePayout(req, res) {
  const userId = req.userId;
  const { payoutId, pin } = req.body;

  if (!payoutId) return res.status(400).json({ error: 'payoutId is required' });
  if (!pin) return res.status(400).json({ error: 'PIN is required to approve a payout' });

  const { verifyPin } = await import('../services/pinService.js');
  const pinCheck = await verifyPin(userId, pin);
  if (!pinCheck.valid) {
    const message = pinCheck.reason === 'NO_PIN_SET'
      ? 'You need to set a security PIN first — go to More → Security PIN.'
      : 'Incorrect PIN';
    return res.status(401).json({ error: message });
  }

  try {
    const payout = await prisma.payout.findUnique({
      where: { id: payoutId },
      include: { approvals: true, stokvel: true },
    });
    if (!payout) return res.status(404).json({ error: 'Payout not found' });
    if (payout.status !== 'PENDING_APPROVAL') return res.status(409).json({ error: `Payout is already ${payout.status}` });

    const official = await prisma.stokvelOfficial.findFirst({
      where: { stokvelId: payout.stokvelId, userId },
    });
    if (!official) return res.status(403).json({ error: 'Only stokvel officials can approve payouts' });

    // Nobody approves money going to themselves.
    if (payout.recipientId === userId) {
      return res.status(403).json({ error: 'You cannot approve your own payout. Another official must do it.' });
    }

    try {
      await prisma.payoutApproval.create({
        data: { payoutId, officialId: official.id },
      });
    } catch (createError) {
      // Two rapid taps from the same official both pass a plain findFirst
      // check before either row commits — the unique constraint on
      // [payoutId, officialId] is the real guard against a double approval.
      if (createError.code === 'P2002') {
        return res.status(409).json({ error: 'You have already approved this payout' });
      }
      throw createError;
    }

    const approvalCount = await prisma.payoutApproval.count({ where: { payoutId } });
    const requiredApprovals = payout.stokvel.requiredApprovals;

    if (approvalCount >= requiredApprovals) {
      // Two officials approving within the same window can both reach this
      // branch — both see the threshold met before either has cleared the
      // payout, since nothing before this point locks the payout row. Without
      // a guard, both would run the block below and double-decrement the
      // group ledger, double-create a shrine contribution, and double-advance
      // the rotation for one real payout. Claim the PENDING_APPROVAL ->
      // CLEARED transition atomically first — only one concurrent request
      // can win it (Postgres row-locks the update).
      const claim = await prisma.payout.updateMany({
        where: { id: payoutId, status: 'PENDING_APPROVAL' },
        data: { status: 'CLEARED', clearedAt: new Date() },
      });

      if (claim.count === 0) {
        // Someone else's concurrent approval already cleared it — this
        // request's own approval row is still recorded, just don't redo
        // the money-moving side effects.
        return res.json({
          status: 'CLEARED',
          message: 'Payout approved and cleared.',
        });
      }

      // Only ever computed/recorded if the recipient opted in when they
      // requested this payout — never a forced deduction.
      const contributionAmount = payout.contributionOptIn
        ? parseFloat(payout.amount) * SUGGESTED_CONTRIBUTION_RATE
        : null;

      await prisma.$transaction(async (tx) => {
        await tx.stokvelGroupLedger.update({
          where: { stokvelId: payout.stokvelId },
          data: { totalBalance: { decrement: payout.amount } },
        });

        if (contributionAmount) {
          await tx.shrineContribution.create({
            data: { payoutId, amount: contributionAmount, source: 'PAYOUT_CONTRIBUTION', status: 'CONFIRMED' },
          });
        }

        // Advance the umgalelo rotation once this recipient's payout has
        // actually cleared, so the next request defaults to the next person.
        if (
          payout.stokvel.type === 'UMGALELO_ROTATING' &&
          Array.isArray(payout.stokvel.rotationOrder) &&
          payout.stokvel.rotationOrder.length > 0
        ) {
          const order = payout.stokvel.rotationOrder;
          const nextIndex = (payout.stokvel.currentRotationIndex + 1) % order.length;
          await tx.stokvel.update({
            where: { id: payout.stokvelId },
            data: { currentRotationIndex: nextIndex },
          });
        }
      });

      const ledgerWarning = await postPayoutToLedger(payout, userId);

      const recipient = await prisma.user.findUnique({ where: { id: payout.recipientId } });
      const { notifyPayoutCleared } = await import('../services/notificationService.js');
      if (recipient?.email) {
        await notifyPayoutCleared(
          recipient.email,
          recipient.firstName,
          parseFloat(payout.amount),
          payout.stokvel.name,
          contributionAmount
        );
      }

      const { createNotification } = await import('../services/notificationDbService.js');
      await createNotification(
        payout.recipientId,
        'PAYOUT_CLEARED',
        `Your payout of R${parseFloat(payout.amount).toFixed(2)} from ${payout.stokvel.name} has cleared.`,
        'stokvels'
      );

      return res.json({
        status: 'CLEARED',
        message: 'Payout approved and cleared.',
        contributionAmount,
        contributionNote: contributionAmount
          ? 'Includes a voluntary Ubuhlanti bakwa Xhosa contribution, as chosen when this payout was requested.'
          : null,
        ledgerWarning,
      });
    }

    res.json({
      status: 'PENDING_APPROVAL',
      message: `Approval recorded. ${requiredApprovals - approvalCount} more approval(s) needed.`,
      approvalsSoFar: approvalCount,
      requiredApprovals,
    });
  } catch (error) {
    console.error('Approve payout error:', error.message);
    res.status(500).json({ error: 'Could not approve payout' });
  }
}
