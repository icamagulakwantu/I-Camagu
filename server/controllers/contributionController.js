// src/controllers/contributionController.js (or wherever you keep it)
import prisma from '../config/db.js';

// Member marks a contribution as paid — this does NOT touch the ledger yet.
// It's a claim, pending an official's confirmation.
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

                                                                                                                                                                                                                                                                                                                                                    const updated = await prisma.$transaction(async (tx) => {
                                                                                                                                                                                                                                                                                                                                                                                                                  const confirmed = await tx.contribution.update({
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            where: { id: contributionId },
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          data: { status: 'CONFIRMED' },
                                                                                                                                                                                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  await tx.stokvelGroupLedger.update({
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  where: { stokvelId: contribution.stokvelId },
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      data: { totalBalance: { increment: contribution.amount } },
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        return confirmed;
                                                                                                                                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                                                                                                                                                                                        res.json({ contribution: updated, message: 'Contribution confirmed and added to the group ledger.' });
                                                                                                            } catch (error) {
                                                                                                                                            console.error('Confirm contribution error:', error.message);
                                                                                                                                                                            res.status(500).json({ error: 'Could not confirm contribution' });
                                                                                                            }
}

// src/controllers/contributionController.js

export async function submitContribution(req, res) {
  const userId = req.userId;
  const { stokvelId, amount, note, proofNote } = req.body;

  // Validate input
  if (!stokvelId || !amount) {
    return res.status(400).json({ error: 'stokvelId and amount are required' });
  }
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  try {
    // Verify the user is a member of this stokvel
    const membership = await prisma.stokvelMember.findFirst({
      where: { stokvelId, userId },
    });
    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this stokvel' });
    }

    // Create a pending contribution (official must confirm it later)
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
  if (isNaN(requestedAmount) || requestedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
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

    const { notifyMany } = await import('../services/notificationDbService.js');
    const members = await prisma.stokvelMember.findMany({ where: { stokvelId }, select: { userId: true } });
    await notifyMany(
      members.map((m) => m.userId),
      'GROUP_EXPENSE_RECORDED',
      `A group expense of R${requestedAmount.toFixed(2)} was recorded${note ? `: ${note}` : ''}.`,
      'stokvels'
    );

    res.json({ ledger: updated, message: 'Expense recorded and deducted from the group balance.' });
  } catch (error) {
    console.error('Record group expense error:', error.message);
    res.status(500).json({ error: 'Could not record group expense' });
  }
}

export async function recordInterest(req, res) {
  const userId = req.userId;
  const { stokvelId, amount, note, proofNote } = req.body;

  if (!stokvelId || !amount) return res.status(400).json({ error: 'stokvelId and amount are required' });

  const requestedAmount = parseFloat(amount);
  if (isNaN(requestedAmount) || requestedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
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

    res.json({ ledger, message: 'Interest recorded and added to the group balance.' });
  } catch (error) {
    console.error('Record interest error:', error.message);
    res.status(500).json({ error: 'Could not record interest' });
  }
}
                                                                                    
