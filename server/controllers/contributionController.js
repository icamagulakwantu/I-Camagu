import { randomUUID } from 'crypto';
import prisma from '../config/db.js';
import { postEntry } from '../services/ledgerService.js';
import { toCents } from '../utils/money.js';

// Every confirmed money movement is also written to the tamper-evident ledger
// (server/services/ledgerService.js). The older running balance is still updated
// so existing screens keep working while the books are phased in.

// Writes the ledger entry. If it fails the money flow has already succeeded, so
// we do not undo it; we log loudly and tell the caller so it can be fixed.
// Repeating the same call is safe because of the idempotency key.
async function postToLedger(entry) {
  try {
    await postEntry(entry);
    return null;
  } catch (error) {
    console.error('LEDGER POST FAILED', entry.kind, entry.idempotencyKey, error.message);
    return 'The balance was updated but the books entry could not be saved. Tell your treasurer so it can be corrected.';
  }
}

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

  const { verifyPin } = await import('../services/pinService.js');
  const pinCheck = await verifyPin(userId, pin);
  if (!pinCheck.valid) {
    const message = pinCheck.reason === 'NO_PIN_SET'
      ? 'You need to set a security PIN first — go to More → Security PIN.'
      : 'Incorrect PIN';
    return res.status(401).json({ error: message });
  }

  try {
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
      return res.status(403).json({ error: 'You cannot confirm your own contribution. Another official must do it.' });
    }

    const amountCents = parseAmount(contribution.amount.toString());
    if (!amountCents) return res.status(400).json({ error: 'This contribution has an invalid amount' });

    // Gate the update on status still being PENDING so two officials confirming
    // at once cannot both add the same contribution to the balance.
    const updated = await prisma.$transaction(async (tx) => {
      const claim = await tx.contribution.updateMany({
        where: { id: contributionId, status: 'PENDING' },
        data: { status: 'CONFIRMED' },
      });
      if (claim.count === 0) return null;
      await tx.stokvelGroupLedger.update({
        where: { stokvelId: contribution.stokvelId },
        data: { totalBalance: { increment: contribution.amount } },
      });
      return tx.contribution.findUnique({ where: { id: contributionId } });
    });

    if (!updated) return res.status(409).json({ error: 'Already confirmed' });

    const ledgerWarning = await postToLedger({
      stokvelId: contribution.stokvelId,
      kind: 'CONTRIBUTION',
      memo: contribution.note ? `Contribution: ${contribution.note}` : 'Member contribution',
      lines: [{ account: 'BANK', amountCents }, { account: 'CONTRIBUTIONS', amountCents: -amountCents }],
      idempotencyKey: `contribution:${contributionId}`,
      createdById: payer?.userId || userId,
      approvedById: userId,
    });

    res.json({
      contribution: updated,
      ledgerWarning,
      message: 'Contribution confirmed and added to the group ledger.',
    });
  } catch (error) {
    console.error('Confirm contribution error:', error.message);
    res.status(500).json({ error: 'Could not confirm contribution' });
  }
}

// Member marks a contribution as paid. It is only a claim until an official confirms it.
export async function submitContribution(req, res) {
  const userId = req.userId;
  const { stokvelId, amount, note, proofNote } = req.body;

  if (!stokvelId || !amount) {
    return res.status(400).json({ error: 'stokvelId and amount are required' });
  }
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
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
        amount: parseFloat(amount),
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

export async function recordGroupExpense(req, res) {
  const userId = req.userId;
  const { stokvelId, amount, note } = req.body;

  if (!stokvelId || !amount) return res.status(400).json({ error: 'stokvelId and amount are required' });

  const requestedAmount = parseFloat(amount);
  const amountCents = parseAmount(amount);
  if (isNaN(requestedAmount) || requestedAmount <= 0 || !amountCents) {
    return res.status(400).json({ error: 'Amount must be a positive number with at most 2 decimals' });
  }
  // An expense with no reason is how money disappears. Always ask for one.
  if (!String(note || '').trim()) {
    return res.status(400).json({ error: 'Say what the money was spent on' });
  }

  try {
    const official = await prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId } });
    if (!official) return res.status(403).json({ error: 'Only stokvel officials can record a group expense' });

    const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    if (!ledger) return res.status(409).json({ error: 'This stokvel has no group ledger yet — contact support' });
    if (parseFloat(ledger.totalBalance) < requestedAmount) {
      return res.status(400).json({ error: 'Expense amount exceeds the group balance' });
    }

    const updated = await prisma.stokvelGroupLedger.update({
      where: { stokvelId },
      data: {
        totalBalance: { decrement: requestedAmount },
        groupExpenses: { increment: requestedAmount },
      },
    });

    const ledgerWarning = await postToLedger({
      stokvelId,
      kind: 'EXPENSE',
      memo: `Expense: ${String(note).trim().slice(0, 300)}`,
      lines: [{ account: 'EXPENSES', amountCents }, { account: 'BANK', amountCents: -amountCents }],
      idempotencyKey: `expense:${randomUUID()}`,
      createdById: userId,
    });

    const { notifyMany } = await import('../services/notificationDbService.js');
    const members = await prisma.stokvelMember.findMany({ where: { stokvelId }, select: { userId: true } });
    await notifyMany(
      members.map((m) => m.userId),
      'GROUP_EXPENSE_RECORDED',
      `A group expense of R${requestedAmount.toFixed(2)} was recorded: ${String(note).trim()}.`,
      'stokvels'
    );

    res.json({ ledger: updated, ledgerWarning, message: 'Expense recorded and deducted from the group balance.' });
  } catch (error) {
    console.error('Record group expense error:', error.message);
    res.status(500).json({ error: 'Could not record group expense' });
  }
}

export async function recordInterest(req, res) {
  const userId = req.userId;
  const { stokvelId, amount, note } = req.body;

  if (!stokvelId || !amount) return res.status(400).json({ error: 'stokvelId and amount are required' });

  const requestedAmount = parseFloat(amount);
  const amountCents = parseAmount(amount);
  if (isNaN(requestedAmount) || requestedAmount <= 0 || !amountCents) {
    return res.status(400).json({ error: 'Amount must be a positive number with at most 2 decimals' });
  }

  try {
    const official = await prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId } });
    if (!official) return res.status(403).json({ error: 'Only stokvel officials can record interest' });

    const ledger = await prisma.stokvelGroupLedger.update({
      where: { stokvelId },
      data: {
        totalBalance: { increment: requestedAmount },
        interestEarned: { increment: requestedAmount },
      },
    });

    const ledgerWarning = await postToLedger({
      stokvelId,
      kind: 'INTEREST',
      memo: note ? `Interest: ${String(note).slice(0, 300)}` : 'Interest recorded',
      lines: [{ account: 'BANK', amountCents }, { account: 'INTEREST_INCOME', amountCents: -amountCents }],
      idempotencyKey: `interest:${randomUUID()}`,
      createdById: userId,
    });

    res.json({ ledger, ledgerWarning, message: 'Interest recorded and added to the group balance.' });
  } catch (error) {
    console.error('Record interest error:', error.message);
    res.status(500).json({ error: 'Could not record interest' });
  }
}
