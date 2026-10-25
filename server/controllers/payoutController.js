// src/controllers/payoutController.js
import prisma from '../config/db.js';
import { ensureLedgerTables, lockStokvelLedger, postEntryTx } from '../services/ledgerService.js';
import { verifyPin, pinFailureResponse } from '../services/pinService.js';
import { toCents, fromCents } from '../utils/money.js';

// Suggested contribution rate, shown to a stokvel member when they request
// a payout — never forced. 3% is confirmed as the suggested figure; the
// exact commercial breakdown is still pending (Section 8 open item).
const SUGGESTED_CONTRIBUTION_RATE = 0.03;
const SUGGESTED_CONTRIBUTION_BASIS_POINTS = 300; // 3.00%, in whole numbers for exact cents
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

function parsePositiveCents(raw) {
  try {
    const cents = toCents(String(raw));
    return cents > 0 ? cents : null;
  } catch {
    return null;
  }
}

// 3% of a payout in exact cents, rounded half-up to the nearest cent.
export function suggestedContributionCents(payoutCents) {
  return Math.floor((payoutCents * SUGGESTED_CONTRIBUTION_BASIS_POINTS + 5000) / 10000);
}

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

  const requestedCents = parsePositiveCents(amount);
  if (!requestedCents) {
    return res.status(400).json({ error: 'Amount must be a positive number with at most 2 decimals' });
  }
  const exactAmount = fromCents(requestedCents);

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
    if (toCents(ledger.totalBalance.toFixed(2)) < requestedCents) {
      return res.status(400).json({ error: 'Requested amount exceeds the group balance' });
    }

    // Create ONE payout
    const payout = await prisma.payout.create({
      data: {
        stokvelId,
        recipientId: finalRecipientId,
        amount: exactAmount,
        status: 'PENDING_APPROVAL',
        contributionOptIn: contributeOptIn === true,
      },
    });

    // Notify officials. A failed notification must not hide a saved request.
    try {
      const { notifyMany } = await import('../services/notificationDbService.js');
      const officials = await prisma.stokvelOfficial.findMany({ where: { stokvelId } });
      await notifyMany(
        officials.map(o => o.userId),
        'PAYOUT_APPROVAL_NEEDED',
        `A payout of R${exactAmount} needs your approval.`,
        'stokvels'
      );
    } catch (notifyError) {
      console.error('Payout request notification failed:', notifyError.message);
    }

    res.status(201).json({ payout, message: 'Payout requested. Awaiting official approval.' });
  } catch (error) {
    console.error('Request payout error:', error.message);
    res.status(500).json({ error: 'Could not request payout' });
  }
}

class PayoutBlocked extends Error {}

// Clears a payout. The status change, balance debit, optional fund
// contribution, rotation advance and books entry are ONE transaction:
// either all of them are saved or none of them are.
async function clearPayout(payout, approverId) {
  const payoutCents = toCents(payout.amount.toFixed(2));
  const contributionCents = payout.contributionOptIn ? suggestedContributionCents(payoutCents) : 0;

  await ensureLedgerTables();
  return prisma.$transaction(async (tx) => {
    await lockStokvelLedger(tx, payout.stokvelId);

    // Only one concurrent approval can win the PENDING_APPROVAL -> CLEARED change.
    const claim = await tx.payout.updateMany({
      where: { id: payout.id, status: 'PENDING_APPROVAL' },
      data: { status: 'CLEARED', clearedAt: new Date() },
    });
    if (claim.count === 0) return { alreadyCleared: true };

    // Take the money only if the balance still covers it, in the same
    // statement, so the balance can never go below zero.
    const debit = await tx.stokvelGroupLedger.updateMany({
      where: { stokvelId: payout.stokvelId, totalBalance: { gte: payout.amount } },
      data: { totalBalance: { decrement: payout.amount } },
    });
    if (debit.count === 0) throw new PayoutBlocked('The group balance is now too low for this payout');

    if (contributionCents > 0) {
      await tx.shrineContribution.create({
        data: {
          payoutId: payout.id,
          amount: fromCents(contributionCents),
          source: 'PAYOUT_CONTRIBUTION',
          status: 'CONFIRMED',
        },
      });
    }

    // Advance the umgalelo rotation from the CURRENT stored index, so a
    // stale copy read before the lock can never skip or repeat a turn.
    if (payout.stokvel.type === 'UMGALELO_ROTATING') {
      const current = await tx.stokvel.findUnique({
        where: { id: payout.stokvelId },
        select: { rotationOrder: true, currentRotationIndex: true },
      });
      const order = Array.isArray(current?.rotationOrder) ? current.rotationOrder : [];
      if (order.length > 0) {
        await tx.stokvel.update({
          where: { id: payout.stokvelId },
          data: { currentRotationIndex: (current.currentRotationIndex + 1) % order.length },
        });
      }
    }

    await postEntryTx(tx, {
      stokvelId: payout.stokvelId,
      kind: 'PAYOUT',
      memo: 'Stokvel payout',
      lines: [
        { account: 'PAYOUTS', amountCents: payoutCents },
        { account: 'BANK', amountCents: -payoutCents },
      ],
      idempotencyKey: `payout:${payout.id}`,
      createdById: approverId,
    });

    return { alreadyCleared: false, contributionAmount: contributionCents > 0 ? contributionCents / 100 : null };
  });
}

// Runs after the payout has been saved. A failure here is logged, never
// allowed to undo or hide a payout that already cleared.
async function notifyRecipientOfClearedPayout(payout, contributionAmount) {
  try {
    const amount = parseFloat(payout.amount);
    const recipient = await prisma.user.findUnique({ where: { id: payout.recipientId } });
    if (recipient?.email) {
      const { notifyPayoutCleared } = await import('../services/notificationService.js');
      await notifyPayoutCleared(recipient.email, recipient.firstName, amount, payout.stokvel.name, contributionAmount);
    }
    const { createNotification } = await import('../services/notificationDbService.js');
    await createNotification(
      payout.recipientId,
      'PAYOUT_CLEARED',
      `Your payout of R${amount.toFixed(2)} from ${payout.stokvel.name} has cleared.`,
      'stokvels'
    );
  } catch (error) {
    console.error('Payout cleared notification failed:', payout.id, error.message);
  }
}

export async function approvePayout(req, res) {
  const userId = req.userId;
  const { payoutId, pin } = req.body;

  if (!payoutId) return res.status(400).json({ error: 'payoutId is required' });
  if (!pin) return res.status(400).json({ error: 'PIN is required to approve a payout' });

  try {
    const pinCheck = await verifyPin(userId, pin);
    if (!pinCheck.valid) {
      const failure = pinFailureResponse(pinCheck);
      return res.status(failure.status).json({ error: failure.error });
    }

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

    if (approvalCount < requiredApprovals) {
      return res.json({
        status: 'PENDING_APPROVAL',
        message: `Approval recorded. ${requiredApprovals - approvalCount} more approval(s) needed.`,
        approvalsSoFar: approvalCount,
        requiredApprovals,
      });
    }

    let result;
    try {
      result = await clearPayout(payout, userId);
    } catch (clearError) {
      if (clearError instanceof PayoutBlocked) {
        return res.status(400).json({ error: `${clearError.message}. Your approval was saved; the payout has not been paid.` });
      }
      throw clearError;
    }

    if (result.alreadyCleared) {
      // Another official's approval cleared it at the same moment. This
      // approval row is still recorded; the money moved exactly once.
      return res.json({ status: 'CLEARED', message: 'Payout approved and cleared.' });
    }

    await notifyRecipientOfClearedPayout(payout, result.contributionAmount);

    return res.json({
      status: 'CLEARED',
      message: 'Payout approved and cleared.',
      contributionAmount: result.contributionAmount,
      contributionNote: result.contributionAmount
        ? 'Includes a voluntary Ubuhlanti bakwa Xhosa contribution, as chosen when this payout was requested.'
        : null,
      ledgerWarning: null,
    });
  } catch (error) {
    console.error('Approve payout error:', error.message);
    res.status(500).json({ error: 'Could not approve the payout. Nothing was paid, so it is safe to try again.' });
  }
}
