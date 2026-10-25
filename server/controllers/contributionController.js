import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { ensureLedgerTables, lockStokvelLedger, postEntryTx } from '../services/ledgerService.js';
import { verifyPin, pinFailureResponse } from '../services/pinService.js';
import { toCents, fromCents } from '../utils/money.js';

// Every confirmed money movement is also written to the tamper-evident ledger
// (server/services/ledgerService.js). The older running balance is still updated
// so existing screens keep working while the books are phased in.
// The balance change and the books entry are written in ONE database
// transaction: either both are saved or neither is, so the running balance
// can never move without a matching books entry.
// Group expenses now live in stokvelApprovalsController.js, because they need
// a second official to approve them.

function parseAmount(raw) {
  try {
    const cents = toCents(String(raw));
    return cents > 0 ? cents : null;
  } catch {
    return null;
  }
}

// An official confirms that a member's contribution was really received.
// The person who made the contribution can never be the one who confirms it.
export async function confirmContribution(req, res) {
  const userId = req.userId;
  const { contributionId, pin } = req.body;

  if (!contributionId) return res.status(400).json({ error: 'contributionId is required' });
  if (!pin) return res.status(400).json({ error: 'PIN is required to confirm a contribution' });

  try {
    const pinCheck = await verifyPin(userId, pin);
    if (!pinCheck.valid) {
      const failure = pinFailureResponse(pinCheck);
      return res.status(failure.status).json({ error: failure.error });
    }

    const contribution = await prisma.contribution.findUnique({ where: { id: contributionId } });
    if (!contribution) return res.status(404).json({ error: 'Contribution not found' });
    if (contribution.status === 'CONFIRMED') return res.status(409).json({ error: 'Already confirmed' });

    const official = await prisma.stokvelOfficial.findFirst({
      where: { stokvelId: contribution.stokvelId, userId },
    });
    if (!official) return res.status(403).json({ error: 'Only stokvel officials can confirm contributions' });

    // Separation of duties: nobody confirms their own money.
    const payer = await prisma.stokvelMember.findUnique({ where: { id: contribution.memberId } });
    if (payer?.userId === userId) {
      return res.status(403).json({
        error: 'You cannot confirm your own payment. Ask another official to confirm it. If there is no other official yet, open the Members tab and tap "Make an official" next to another member.',
      });
    }

    const amountCents = parseAmount(contribution.amount.toString());
    if (!amountCents) return res.status(400).json({ error: 'This contribution has an invalid amount' });

    await ensureLedgerTables();
    // The status gate (still PENDING) stops two officials confirming at once
    // from both adding the money. Balance and books entry commit together.
    const updated = await prisma.$transaction(async (tx) => {
      await lockStokvelLedger(tx, contribution.stokvelId);
      const claim = await tx.contribution.updateMany({
        where: { id: contributionId, status: 'PENDING' },
        data: { status: 'CONFIRMED' },
      });
      if (claim.count === 0) return null;
      await tx.stokvelGroupLedger.update({
        where: { stokvelId: contribution.stokvelId },
        data: { totalBalance: { increment: contribution.amount } },
      });
      await postEntryTx(tx, {
        stokvelId: contribution.stokvelId,
        kind: 'CONTRIBUTION',
        memo: contribution.note ? `Contribution: ${contribution.note}` : 'Member contribution',
        lines: [{ account: 'BANK', amountCents }, { account: 'CONTRIBUTIONS', amountCents: -amountCents }],
        idempotencyKey: `contribution:${contributionId}`,
        createdById: payer?.userId || userId,
        approvedById: userId,
      });
      return tx.contribution.findUnique({ where: { id: contributionId } });
    });

    if (!updated) return res.status(409).json({ error: 'Already confirmed' });

    res.json({
      contribution: updated,
      ledgerWarning: null,
      message: 'Contribution confirmed and added to the group ledger.',
    });
  } catch (error) {
    console.error('Confirm contribution error:', error.message);
    res.status(500).json({ error: 'Could not confirm the contribution. Nothing was changed, so it is safe to try again.' });
  }
}

// Member marks a contribution as paid. It is only a claim until an official confirms it.
export async function submitContribution(req, res) {
  const userId = req.userId;
  const { stokvelId, amount, note, proofNote } = req.body;

  if (!stokvelId || !amount) {
    return res.status(400).json({ error: 'stokvelId and amount are required' });
  }
  const amountCents = parseAmount(amount);
  if (!amountCents) {
    return res.status(400).json({ error: 'Amount must be a positive number with at most 2 decimals' });
  }

  try {
    const membership = await prisma.stokvelMember.findFirst({
      where: { stokvelId, userId },
    });
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this stokvel' });
    }

    const contribution = await prisma.contribution.create({
      data: {
        stokvelId,
        memberId: membership.id,
        amount: fromCents(amountCents),
        status: 'PENDING',
        note: note || proofNote || null,
      },
    });

    res.status(201).json({
      contribution,
      message: 'Contribution submitted for confirmation by an official.',
    });
  } catch (error) {
    console.error('Submit contribution error:', error.message);
    res.status(500).json({ error: 'Could not submit contribution' });
  }
}

export async function getPendingContributions(req, res) {
  const { stokvelId } = req.params;
  const userId = req.userId;

  try {
    const official = await prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId } });
    if (!official) return res.status(403).json({ error: 'Only stokvel officials can view the pending queue' });

    const pending = await prisma.contribution.findMany({
      where: { stokvelId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });

    res.json(pending);
  } catch (error) {
    console.error('Get pending contributions error:', error.message);
    res.status(500).json({ error: 'Could not fetch pending contributions' });
  }
}

export async function recordInterest(req, res) {
  const userId = req.userId;
  const { stokvelId, amount, note } = req.body;

  if (!stokvelId || !amount) return res.status(400).json({ error: 'stokvelId and amount are required' });

  const amountCents = parseAmount(amount);
  if (!amountCents) {
    return res.status(400).json({ error: 'Amount must be a positive number with at most 2 decimals' });
  }
  const exactAmount = fromCents(amountCents);

  try {
    const official = await prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId } });
    if (!official) return res.status(403).json({ error: 'Only stokvel officials can record interest' });

    await ensureLedgerTables();
    const ledger = await prisma.$transaction(async (tx) => {
      await lockStokvelLedger(tx, stokvelId);
      const updatedLedger = await tx.stokvelGroupLedger.update({
        where: { stokvelId },
        data: {
          totalBalance: { increment: exactAmount },
          interestEarned: { increment: exactAmount },
        },
      });
      await postEntryTx(tx, {
        stokvelId,
        kind: 'INTEREST',
        memo: note ? `Interest: ${String(note).slice(0, 300)}` : 'Interest recorded',
        lines: [{ account: 'BANK', amountCents }, { account: 'INTEREST_INCOME', amountCents: -amountCents }],
        idempotencyKey: `interest:${randomUUID()}`,
        createdById: userId,
      });
      return updatedLedger;
    });

    res.json({ ledger, ledgerWarning: null, message: 'Interest recorded and added to the group balance.' });
  } catch (error) {
    console.error('Record interest error:', error.message);
    res.status(500).json({ error: 'Could not record interest. Nothing was changed, so it is safe to try again.' });
  }
}
