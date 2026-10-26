import prisma from '../config/db.js';

export async function listPoolFundingRequests(req, res) {
  const { stokvelId } = req.params;
  try {
    const [membership, official] = await Promise.all([
      prisma.stokvelMember.findFirst({ where: { stokvelId, userId: req.userId }, select: { id: true } }),
      prisma.stokvelOfficial.findFirst({ where: { stokvelId, userId: req.userId }, select: { id: true } }),
    ]);
    if (!membership && !official) return res.status(403).json({ error: 'You must belong to this stokvel to view funding requests' });

    const requests = await prisma.stokvelPoolFunding.findMany({
      where: { stokvelId },
      include: {
        pool: { select: { id: true, category: true, area: true, status: true, deadline: true } },
        basket: { include: { items: { include: { sku: { select: { id: true, name: true, bulkUnit: true } } } } } },
        requestedBy: { select: { id: true, firstName: true, lastName: true } },
        approvals: {
          include: {
            official: { select: { id: true, userId: true, role: true } },
            approver: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { decidedAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ requests, canDecide: Boolean(official), currentOfficialId: official?.id || null });
  } catch (error) {
    console.error('List stokvel pool funding requests:', error.message);
    res.status(500).json({ error: 'Could not load funding requests' });
  }
}

export async function decidePoolFundingRequest(req, res) {
  const { stokvelId, fundingId } = req.params;
  const { decision, note } = req.body || {};
  if (!['APPROVE', 'DECLINE'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be APPROVE or DECLINE' });
  }

  try {
    const official = await prisma.stokvelOfficial.findFirst({
      where: { stokvelId, userId: req.userId },
      select: { id: true, userId: true },
    });
    if (!official) return res.status(403).json({ error: 'Only a stokvel official can decide this request' });

    const funding = await prisma.stokvelPoolFunding.findFirst({
      where: { id: fundingId, stokvelId },
      include: { stokvel: true, requestedBy: { select: { id: true } } },
    });
    if (!funding) return res.status(404).json({ error: 'Funding request not found' });
    if (funding.status !== 'PENDING_APPROVAL') return res.status(409).json({ error: 'This funding request has already been decided' });
    if (funding.requestedById === req.userId) return res.status(403).json({ error: 'The person who requested funding cannot approve their own request' });

    const result = await prisma.$transaction(async (tx) => {
      await tx.stokvelPoolFundingApproval.create({
        data: {
          fundingId,
          officialId: official.id,
          approverId: req.userId,
          decision,
          note: typeof note === 'string' ? note.trim().slice(0, 500) || null : null,
        },
      });

      if (decision === 'DECLINE') {
        const declined = await tx.stokvelPoolFunding.update({
          where: { id: fundingId },
          data: { status: 'DECLINED', declinedAt: new Date() },
        });
        await tx.poolPayment.updateMany({
          where: { fundingRequestId: fundingId },
          data: { status: 'DECLINED' },
        });
        await tx.notification.create({
          data: {
            userId: funding.requestedById,
            type: 'STOKVEL_POOL_FUNDING_DECLINED',
            message: 'Your stokvel funding request for a SmartMatch order was declined.',
            linkScreen: 'stokvels',
          },
        });
        return { funding: declined, approvalsNeeded: 0 };
      }

      const approvedCount = await tx.stokvelPoolFundingApproval.count({
        where: { fundingId, decision: 'APPROVE' },
      });
      const needed = Math.max(2, funding.requiredApprovals || 2);
      if (approvedCount < needed) {
        await tx.notification.create({
          data: {
            userId: funding.requestedById,
            type: 'STOKVEL_POOL_FUNDING_APPROVAL_PROGRESS',
            message: `A stokvel official approved your pool funding request. ${approvedCount} of ${needed} approvals received.`,
            linkScreen: 'stokvels',
          },
        });
        return {
          funding: await tx.stokvelPoolFunding.findUnique({ where: { id: fundingId } }),
          approvalsNeeded: needed - approvedCount,
        };
      }

      const approved = await tx.stokvelPoolFunding.update({
        where: { id: fundingId },
        data: { status: 'APPROVED', approvedAt: new Date() },
      });
      // Approval authorizes the spend but does not pretend a bank transfer
      // or supplier settlement has happened. The settlement adapter remains
      // a separate explicit step; no manual EFT is requested from the member.
      await tx.poolPayment.updateMany({
        where: { fundingRequestId: fundingId },
        data: { status: 'PENDING_SETTLEMENT' },
      });
      await tx.notification.create({
        data: {
          userId: funding.requestedById,
          type: 'STOKVEL_POOL_FUNDING_APPROVED',
          message: 'Your stokvel pool funding request has the required approvals and is awaiting settlement.',
          linkScreen: 'stokvels',
        },
      });
      return { funding: approved, approvalsNeeded: 0 };
    });

    res.json({
      ...result,
      message: decision === 'DECLINE'
        ? 'Funding request declined.'
        : result.approvalsNeeded > 0
          ? 'Approval recorded. Another official must approve before settlement.'
          : 'Funding request approved. Settlement is still pending.',
    });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'You have already decided this funding request' });
    console.error('Decide stokvel pool funding request:', error.message);
    res.status(500).json({ error: 'Could not record your decision' });
  }
}
