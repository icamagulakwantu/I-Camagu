// src/controllers/payoutController.js
import prisma from '../config/db.js';

// Placeholder tithe rate — 3% is confirmed, but the exact commercial breakdown
// of the full 13% qualifying spread is still pending (Section 8 open item).
const SHRINE_TITHE_RATE = 0.03;

export async function requestPayout(req, res) {
      const userId = req.userId;
        const { stokvelId, amount, recipientId } = req.body;

          if (!stokvelId || !amount) {
                  return res.status(400).json({ error: 'stokvelId and amount are required' });
          }

            try {
                    // Check membership
                        const membership = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId } });
                            if (!membership) return res.status(403).json({ error: 'You are not a member of this stokvel' });

                                const requestedAmount = parseFloat(amount);

                                    // Check balance
                                        const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
                                            if (ledger && parseFloat(ledger.totalBalance) < requestedAmount) {
                                                      return res.status(400).json({ error: 'Requested amount exceeds the group balance' });
                                            }

                                                // Create ONE payout
                                                    const payout = await prisma.payout.create({
                                                              data: {
                                                                          stokvelId,
                                                                                  recipientId: recipientId || userId,
                                                                                          amount: requestedAmount,
                                                                                                  status: 'PENDING_APPROVAL',
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

                                        const alreadyApproved = await prisma.payoutApproval.findFirst({
                                                  where: { payoutId, officialId: official.id },
                                        });
                                            if (alreadyApproved) return res.status(409).json({ error: 'You have already approved this payout' });

                                                await prisma.payoutApproval.create({
                                                          data: { payoutId, officialId: official.id },
                                                });

                                                    const approvalCount = await prisma.payoutApproval.count({ where: { payoutId } });
                                                        const requiredApprovals = payout.stokvel.requiredApprovals;

                                                            if (approvalCount >= requiredApprovals) {
                                                                      const titheAmount = parseFloat(payout.amount) * SHRINE_TITHE_RATE;

                                                                            await prisma.$transaction(async (tx) => {
                                                                                        await tx.payout.update({
                                                                                                      where: { id: payoutId },
                                                                                                                data: { status: 'CLEARED', clearedAt: new Date() },
                                                                                        });

                                                                                                await tx.stokvelGroupLedger.update({
                                                                                                              where: { stokvelId: payout.stokvelId },
                                                                                                                        data: { totalBalance: { decrement: payout.amount } },
                                                                                                });

                                                                                                        await tx.shrineTithe.create({
                                                                                                                      data: { payoutId, amount: titheAmount },
                                                                                                        });
                                                                            });

                                                                                  const recipient = await prisma.user.findUnique({ where: { id: payout.recipientId } });
                                                                                  const { notifyPayoutCleared } = await import('../services/notificationService.js');
                                                                                  if (recipient?.email) {
                                                                                        await notifyPayoutCleared(
                                                                                                  recipient.email,
                                                                                                  recipient.firstName,
                                                                                                  parseFloat(payout.amount),
                                                                                                  payout.stokvel.name,
                                                                                                  titheAmount
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
                                                                                                              titheAmount,
                                                                                                                      titheNote: 'Ubuhlanti bakwa Xhosa Shrine Fund contribution (rate pending final confirmation)',
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