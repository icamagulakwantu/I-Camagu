// src/controllers/payoutController.js
import prisma from '../config/db.js';

// Suggested contribution rate, shown to a stokvel member when they request
// a payout — never forced. 3% is confirmed as the suggested figure; the
// exact commercial breakdown is still pending (Section 8 open item).
const SUGGESTED_CONTRIBUTION_RATE = 0.03;
const MIN_DONATION_ZAR = 1;

export async function getShrineFundTotal(req, res) {
  try {
    const confirmedWhere = { status: 'CONFIRMED' };
    const [aggregate, earliest, payoutCount, donationCount] = await Promise.all([
      prisma.shrineContribution.aggregate({ where: confirmedWhere, _sum: { amount: true }, _count: true }),
      prisma.shrineContribution.findFirst({ where: confirmedWhere, orderBy: { createdAt: 'asc' }, select: { createdAt: true } }),
      prisma.shrineContribution.count({ where: { ...confirmedWhere, source: 'PAYOUT_CONTRIBUTION' } }),
      prisma.shrineContribution.count({ where: { ...confirmedWhere, source: 'PUBLIC_DONATION' } }),
    ]);
    res.json({
      totalAmount: aggregate._sum.amount || 0,
      contributionCount: aggregate._count,
      payoutContributionCount: payoutCount,
      donationCount,
      sinceDate: earliest?.createdAt || null,
      suggestedRate: SUGGESTED_CONTRIBUTION_RATE,
      minDonation: MIN_DONATION_ZAR,
      note: 'Ubuhlanti bakwa Xhosa — every contribution here is voluntary.',
    });
  } catch (error) {
    console.error('Get shrine fund total error:', error.message);
    res.status(500).json({ error: 'Could not fetch Ubuhlanti bakwa Xhosa fund total' });
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

    const donor = await prisma.user.findUnique({ where: { id: req.userId }, select: { firstName: true, lastName: true, email: true } });
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

            try {
                    // Check membership
                        const membership = await prisma.stokvelMember.findFirst({ where: { stokvelId, userId } });
                            if (!membership) return res.status(403).json({ error: 'You are not a member of this stokvel' });

                                const stokvel = await prisma.stokvel.findUnique({ where: { id: stokvelId } });
                                if (!stokvel) return res.status(404).json({ error: 'Stokvel not found' });

                                const requestedAmount = parseFloat(amount);

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
                                                }

                                                // Check balance
                                                const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
                                                if (ledger && parseFloat(ledger.totalBalance) < requestedAmount) {
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
                                                                      // Only ever computed/recorded if the recipient opted in when they
                                                                      // requested this payout — never a forced deduction.
                                                                      const contributionAmount = payout.contributionOptIn
                                                                        ? parseFloat(payout.amount) * SUGGESTED_CONTRIBUTION_RATE
                                                                        : null;

                                                                            await prisma.$transaction(async (tx) => {
                                                                                        await tx.payout.update({
                                                                                                      where: { id: payoutId },
                                                                                                                data: { status: 'CLEARED', clearedAt: new Date() },
                                                                                        });

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