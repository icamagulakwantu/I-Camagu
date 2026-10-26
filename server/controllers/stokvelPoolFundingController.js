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
    const priorVote = await prisma.stokvelPoolFundingApproval.findFirst({
      where: { fundingId, approverId: req.userId },
      select: { id: true },
    });
    if (priorVote) return res.status(409).json({ error: 'Each official account can vote only once on a funding request' });

    const result = await prisma.$transaction(async (tx) => {
      // Serialize every spend decision for this stokvel against the same
      // advisory lock used by the ledger. A preflight balance read alone is
      // not safe when two different requests receive their final approval
      // concurrently.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${stokvelId}))`;

      // Re-read mutable state after taking the lock: the preflight reads
      // above may have become stale while another official was deciding.
      const currentFunding = await tx.stokvelPoolFunding.findFirst({
        where: { id: fundingId, stokvelId },
        select: { id: true, status: true, requestedById: true, amountZAR: true, requiredApprovals: true },
      });
      if (!currentFunding) {
        throw Object.assign(new Error('Funding request not found'), { httpStatus: 404 });
      }
      if (currentFunding.status !== 'PENDING_APPROVAL') {
        throw Object.assign(new Error('This funding request has already been decided'), { httpStatus: 409 });
      }
      if (currentFunding.requestedById === req.userId) {
        throw Object.assign(new Error('The person who requested funding cannot approve their own request'), { httpStatus: 403 });
      }
      const existingVote = await tx.stokvelPoolFundingApproval.findFirst({
        where: { fundingId, approverId: req.userId },
        select: { id: true },
      });
      if (existingVote) {
        throw Object.assign(new Error('Each official account can vote only once on a funding request'), { httpStatus: 409 });
      }

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
      const needed = Math.max(2, currentFunding.requiredApprovals || 2);
      if (approvedCount >= needed) {
        const [ledger, otherCommitments] = await Promise.all([
          tx.stokvelGroupLedger.findUnique({ where: { stokvelId } }),
          tx.stokvelPoolFunding.aggregate({
            where: { stokvelId, id: { not: fundingId }, status: { in: ['PENDING_APPROVAL', 'APPROVED'] } },
            _sum: { amountZAR: true },
          }),
        ]);
        const available = ledger
          ? Number(ledger.totalBalance) - Number(ledger.groupExpenses) - Number(otherCommitments._sum.amountZAR || 0)
          : 0;
        if (available < Number(currentFunding.amountZAR)) {
          const declined = await tx.stokvelPoolFunding.update({
            where: { id: fundingId },
            data: { status: 'DECLINED', declinedAt: new Date(), reviewNote: 'Insufficient available funds after other pool commitments.' },
          });
          await tx.poolPayment.updateMany({ where: { fundingRequestId: fundingId }, data: { status: 'DECLINED' } });
          await tx.notification.create({
            data: { userId: funding.requestedById, type: 'STOKVEL_POOL_FUNDING_DECLINED', message: 'The request could not be approved because available funds changed.', linkScreen: 'stokvels' },
          });
          return { funding: declined, approvalsNeeded: 0, insufficientFunds: true };
        }
      }
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
        : result.insufficientFunds
          ? 'The request could not be approved because available funds changed.'
          : result.approvalsNeeded > 0
            ? 'Approval recorded. Another official must approve before settlement.'
            : 'Funding request approved. Settlement is still pending.',
    });
  } catch (error) {
    if (error.httpStatus) return res.status(error.httpStatus).json({ error: error.message });
    if (error.code === 'P2002') return res.status(409).json({ error: 'You have already decided this funding request' });
    console.error('Decide stokvel pool funding request:', error.message);
    res.status(500).json({ error: 'Could not record your decision' });
  }
}
