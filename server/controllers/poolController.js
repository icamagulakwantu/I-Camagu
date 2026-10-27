import prisma from '../config/db.js';
import { submitBasketToPool } from '../services/matchmakerService.js';
import { findSuggestedPoolsForItem, joinPoolWithItem, getNearbyDemandSignal, getCommunityFeed } from '../services/poolDiscoveryService.js';
import { PALLET_CASES, palletsForCases, resolveTierLadder, getTierForMetric, getNextTierForMetric, amountToReachTier } from '../utils/smartMatchTiers.js';

export const CATEGORY_LABEL = { TAVERN: 'Drinks', BUTCHERY: 'Meat & livestock', GROCERY: 'Groceries & other items', PRODUCE: 'Fresh produce' };

export async function getSmartMatchCommunityFeed(req, res) {
  try {
    const feed = await getCommunityFeed(req.userId);
    res.json(feed);
  } catch (error) {
    console.error('Community feed error:', error?.stack || error);
    res.status(500).json({ error: 'Could not load the community feed' });
  }
}

export async function suggestPoolsForItem(req, res) {
  try {
    const result = await findSuggestedPoolsForItem(req.userId, {
      skuId: req.query.skuId,
      ceremonyId: req.query.ceremonyId || undefined,
      limit: req.query.limit,
    });
    const demand = await getNearbyDemandSignal(req.userId, req.query.skuId, Number(req.query.radiusKm) || 20);
    res.json({ ...result, demand });
  } catch (error) {
    const status = /not found|not yet priced|required|must be in the future/i.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
}

export async function joinPoolWithChecklistItem(req, res) {
  try {
    const result = await joinPoolWithItem(req.userId, req.body);
    res.status(201).json({
      ...result,
      message: result.match?.matched
        ? 'Your item joined the pool and the pool has matched.'
        : 'Your item has been added to the pool.',
    });
  } catch (error) {
    const status = /not found|not open|different item category|not yet priced|must be a member|does not have enough|choose a stokvel|invalid funding source|required|does not belong/i.test(error.message) ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
}

export async function getPoolDemandSignal(req, res) {
  try {
    const result = await getNearbyDemandSignal(req.userId, req.query.skuId, Number(req.query.radiusKm) || 20);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

export async function submitToPool(req, res) {
  const { basketId, targetDate, joinPoolId } = req.body;
  if (!basketId) {
    return res.status(400).json({ error: 'basketId is required' });
  }

  try {
    const result = await submitBasketToPool(req.userId, basketId, targetDate, joinPoolId);
    const lines = result.submissions.map((s) => {
      const base = s.matched
        ? `${CATEGORY_LABEL[s.category]} matched${s.partnerName ? ` with ${s.partnerName}` : ''}! Group code: ${s.groupCode}`
        : `${CATEGORY_LABEL[s.category]} pooling${s.partnerName ? ` with ${s.partnerName}` : ''} — ${s.currentCases}/${s.moqTarget} cases needed.`;
      // Tells the truth when the pool they were invited to had already
      // closed by the time they submitted — never silently substitutes a
      // different pool without saying so.
      if (s.joinedInvitedPool === false) {
        return `${base} (The pool you were invited to had already closed, so you joined a new one in your own area instead.)`;
      }
      return base;
    });

    res.json({ ...result, message: lines.join(' ') || 'Nothing could be submitted.' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}

/**
 * A member withdraws a basket that's parked in a pool but hasn't matched
 * yet — no money has moved at this point, so this is a plain cancellation.
 * Matched baskets can't be withdrawn this way; use a refund request instead.
 */
export async function cancelParkedBasket(req, res) {
  const { basketId } = req.body;
  if (!basketId) return res.status(400).json({ error: 'basketId is required' });

  try {
    const basket = await prisma.basket.findUnique({ where: { id: basketId } });
    if (!basket || basket.userId !== req.userId) {
      return res.status(404).json({ error: 'Basket not found' });
    }
    if (basket.status !== 'PARKED') {
      return res.status(409).json({ error: `Only a parked basket can be withdrawn this way (this one is ${basket.status})` });
    }

    // Make the status transition conditional in the database. A separate
    // read followed by update() lets a matcher mark the basket MATCHED between
    // those operations, leaving an order that contains a cancelled basket.
    const transition = await prisma.basket.updateMany({
      where: { id: basketId, userId: req.userId, status: 'PARKED' },
      data: { status: 'CANCELLED' },
    });
    if (transition.count !== 1) {
      return res.status(409).json({ error: 'This basket changed state while you were withdrawing it. Refresh your pool and order status.' });
    }
    const updated = await prisma.basket.findUnique({ where: { id: basketId } });

    res.json({ basket: updated, message: 'Basket withdrawn from the pool.' });
  } catch (error) {
    console.error('Cancel parked basket error:', error.message);
    res.status(500).json({ error: 'Could not withdraw basket' });
  }
}

/**
 * A member asks for their pool payment back — e.g. the order fell through
 * after they already paid, or they want out before the supplier confirms
 * receipt. The supplier reviews and processes it from their dashboard,
 * mirroring the existing manual-EFT confirmation flow.
 */
export async function requestPoolPaymentRefund(req, res) {
  const { paymentId } = req.body;
  if (!paymentId) return res.status(400).json({ error: 'paymentId is required' });

  try {
    const payment = await prisma.poolPayment.findUnique({
      where: { id: paymentId },
      include: { pool: { include: { partner: true } }, user: { select: { firstName: true, lastName: true } } },
    });
    if (!payment || payment.userId !== req.userId) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'REFUNDED') return res.status(409).json({ error: 'This payment has already been refunded' });
    if (payment.provider === 'STOKVEL_FUNDS') {
      return res.status(409).json({
        error: 'Stokvel-funded pool shares must be handled by the Stokvel officials. No refund request was recorded by this supplier/online refund route.',
      });
    }
    if (payment.status !== 'CLEARED') {
      return res.status(409).json({ error: 'A refund can only be requested for a payment confirmed as received. This payment is not marked as received.' });
    }
    if (payment.refundRequestedAt) return res.status(409).json({ error: 'A refund has already been requested for this payment' });

    // Compare-and-set prevents two simultaneous requests from both being
    // accepted and ensures a payment cannot become refund-eligible between a
    // stale read and the write.
    const request = await prisma.poolPayment.updateMany({
      where: { id: paymentId, userId: req.userId, status: 'CLEARED', refundRequestedAt: null, provider: { not: 'STOKVEL_FUNDS' } },
      data: { refundRequestedAt: new Date() },
    });
    if (request.count !== 1) {
      return res.status(409).json({ error: 'This payment changed while the refund was being requested. Refresh and check its current status.' });
    }
    const updated = await prisma.poolPayment.findUnique({ where: { id: paymentId } });

    // Manual EFT: the supplier holds the money, so they're the one who can
    // actually process this — notify them in-app, same as before. PayFast:
    // iCamagu holds the money instead, so the supplier has nothing to
    // process — email the admin, the only party who can (see
    // notifyAdminOfPspRefundRequest / DemandDashboard's Refunds section).
    if (payment.provider === 'MANUAL_EFT') {
      if (payment.pool.partner?.userId) {
        const { createNotification } = await import('../services/notificationDbService.js');
        await createNotification(
          payment.pool.partner.userId,
          'REFUND_REQUESTED',
          `A member requested a refund of R${parseFloat(payment.amountZAR).toFixed(2)} on a pool order.`,
          'supplier'
        );
      }
      res.json({ payment: updated, message: 'Refund requested — the supplier will process it from their dashboard.' });
    } else {
      const { notifyAdminOfPspRefundRequest } = await import('../services/notificationService.js');
      await notifyAdminOfPspRefundRequest(payment, `${payment.user.firstName} ${payment.user.lastName}`);
      res.json({ payment: updated, message: 'Refund requested — this was paid online, so iCamagu will process the refund directly.' });
    }
  } catch (error) {
    console.error('Request pool payment refund error:', error.message);
    res.status(500).json({ error: 'Could not request refund' });
  }
}

/**
 * Every parked/matched basket the requesting member currently has, each
 * with its own live Smart Match progress. A member can have more than one
 * at once now that a single cart submission splits by category (drinks vs.
 * everything else) into separate pools — this used to assume just one.
 * Baskets in a pool aren't the "current" draft basket anymore (getMyBasket
 * only ever returns the active DRAFT), so this is the only place that
 * surfaces ongoing pool status back to the member.
 */
export async function getMyPoolStatus(req, res) {
  try {
    const baskets = await prisma.basket.findMany({
      where: { userId: req.userId, status: { in: ['PARKED', 'MATCHED'] } },
      orderBy: { updatedAt: 'desc' },
      include: { pool: { include: { partner: true, baskets: { include: { items: { include: { sku: true } } } } } } },
    });

    const statuses = [];
    for (const basket of baskets) {
      if (!basket.pool) continue;

      const activeBaskets = basket.pool.baskets.filter((b) => b.status !== 'CANCELLED');
      const currentCases = activeBaskets.reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0);
      // Real Rand pooled so far — only meaningful for an AMOUNT-basis pool,
      // computed off each item's real casePriceZAR, never guessed.
      const currentAmountZAR = activeBaskets.reduce(
        (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity * parseFloat(i.sku?.casePriceZAR || 0), 0),
        0
      );

      // SmartMatch tier standing — pallets for an alcohol pool, Rand pooled
      // for a groceries/livestock one (see smartMatchTiers.js). The ladder
      // itself carries each tier's real value (or null, "TBC") — nothing
      // here is fabricated.
      const basis = basket.pool.tierBasis || 'PALLETS';
      const isAmount = basis === 'AMOUNT';
      const metric = isAmount ? currentAmountZAR : palletsForCases(currentCases);
      const ladder = resolveTierLadder(basket.pool);
      const currentTier = getTierForMetric(metric, ladder);
      const nextTier = getNextTierForMetric(metric, ladder);
      const remaining = amountToReachTier(metric, nextTier);

      // The member's own payment on this pool, once one exists (created the
      // moment the pool matches — see matchmakerService). Surfaced here too,
      // not just on My Orders, so the Basket screen can show real end-to-end
      // progress (Collecting → MOQ reached → Payment submitted → Payment
      // confirmed → Ready for delivery) instead of stopping at "Matched!".
      // Match the payment to this exact basket/order reference. A member can
      // have multiple baskets in one pool; selecting the latest pool payment
      // for every basket incorrectly duplicates one payment across all of them.
      const sameMemberBaskets = activeBaskets.filter((candidate) => candidate.userId === req.userId);
      const payment = basket.orderReference
        ? await prisma.poolPayment.findFirst({
            where: { poolId: basket.pool.id, userId: req.userId, paymentReference: basket.orderReference },
            orderBy: { createdAt: 'desc' },
            select: { status: true, providerReference: true, amountZAR: true, paymentReference: true },
          })
        : sameMemberBaskets.length === 1
          ? await prisma.poolPayment.findFirst({
              where: { poolId: basket.pool.id, userId: req.userId },
              orderBy: { createdAt: 'desc' },
              select: { status: true, providerReference: true, amountZAR: true, paymentReference: true },
            })
          : null;

      statuses.push({
        basketId: basket.id,
        basketStatus: basket.status,
        poolId: basket.pool.id,
        category: basket.pool.category,
        // A pool works fully with or without a confirmed supplier attached
        // — this is null until one matches automatically or gets attached
        // once a real deal is signed.
        partnerName: basket.pool.partner?.name || null,
        area: basket.pool.area,
        currentCases,
        moqTarget: basket.pool.moqTarget,
        poolStatus: basket.pool.status,
        windowDeadline: basket.pool.deadline,
        capCases: basket.pool.capCases,
        payment: payment
          ? { status: payment.status, hasReference: !!payment.providerReference, amountZAR: payment.amountZAR }
          : null,
        smartMatch: {
          basis,
          pallets: palletsForCases(currentCases),
          currentAmountZAR,
          ladder,
          currentTier,
          nextTier,
          // Still needed to reach nextTier, in whatever unit members act on:
          // whole cases for a pallet pool, Rand for an amount pool.
          toNextTier: isAmount ? Math.ceil(remaining) : Math.ceil(remaining * PALLET_CASES),
        },
      });
    }

    res.json(statuses);
  } catch (error) {
    console.error('Get my pool status error:', error.message);
    res.status(500).json({ error: 'Could not fetch pool status' });
  }
}

/**
 * Minimal, authenticated preview of a specific pool, for a member who
 * followed a real "join this pool" invite link (see Basket.jsx /
 * inviteToSmartMatch and /pool/:id in App.jsx) before they've added
 * anything to their own basket yet. Real numbers only — same tier maths
 * as getMyPoolStatus — never fabricated for a pool the member hasn't
 * joined.
 */
export async function getPoolSummary(req, res) {
  const { id } = req.params;
  try {
    const pool = await prisma.bulkPool.findUnique({
      where: { id },
      include: { partner: true, baskets: { include: { items: { include: { sku: true } } } } },
    });
    if (!pool) return res.status(404).json({ error: 'Pool not found' });

    const activeBaskets = pool.baskets.filter((b) => b.status !== 'CANCELLED');
    const currentCases = activeBaskets.reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0);
    const basis = pool.tierBasis || 'PALLETS';
    const isAmount = basis === 'AMOUNT';
    const currentAmountZAR = isAmount
      ? activeBaskets.reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity * parseFloat(i.sku?.casePriceZAR || 0), 0), 0)
      : 0;
    const metric = isAmount ? currentAmountZAR : palletsForCases(currentCases);
    const ladder = resolveTierLadder(pool);

    res.json({
      id: pool.id,
      category: pool.category,
      area: pool.area,
      partnerName: pool.partner?.name || null,
      status: pool.status,
      smartMatch: {
        basis,
        pallets: palletsForCases(currentCases),
        currentAmountZAR,
        currentTier: getTierForMetric(metric, ladder),
        nextTier: getNextTierForMetric(metric, ladder),
      },
    });
  } catch (error) {
    console.error('Get pool summary error:', error.message);
    res.status(500).json({ error: 'Could not fetch pool summary' });
  }
}

export async function getMyOrderDocuments(req, res) {
  try {
    const lines = await prisma.orderLineConfirmation.findMany({
      where: { memberId: req.userId },
      include: { document: true },
    });
    const documentIds = [...new Set(lines.map(l => l.documentId))];
    const documents = await prisma.orderConfirmationDocument.findMany({
      where: { id: { in: documentIds } },
      include: { lineItems: { where: { memberId: req.userId } } },
    });
    res.json(documents);
  } catch (error) {
    console.error('Get order documents error:', error.message);
    res.status(500).json({ error: 'Could not fetch order documents' });
  }
}
export async function getMyPoolPayments(req, res) {
  try {
    const payments = await prisma.poolPayment.findMany({
      where: { userId: req.userId },
      include: { pool: { include: { partner: true, orderDocument: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(payments);
  } catch (error) {
    console.error('Get my pool payments error:', error.message);
    res.status(500).json({ error: 'Could not fetch payments' });
  }
}

export async function submitPoolPaymentReference(req, res) {
  const { paymentId, providerReference } = req.body;
  if (!paymentId || !providerReference) {
    return res.status(400).json({ error: 'paymentId and providerReference are required' });
  }

  try {
    const payment = await prisma.poolPayment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.userId !== req.userId) return res.status(403).json({ error: 'Not your payment' });
    if (payment.status !== 'PENDING') return res.status(409).json({ error: `Payment is already ${payment.status}` });

    const updated = await prisma.poolPayment.update({
      where: { id: paymentId },
      data: { providerReference },
    });
    res.json({ payment: updated, message: 'Reference saved — the supplier will confirm once they see your EFT.' });
  } catch (error) {
    console.error('Submit pool payment reference error:', error.message);
    res.status(500).json({ error: 'Could not save reference' });
  }
}

export async function confirmOrderLine(req, res) {
  const { lineItemId } = req.body;
  if (!lineItemId) return res.status(400).json({ error: 'lineItemId is required' });

  try {
    const line = await prisma.orderLineConfirmation.findUnique({ where: { id: lineItemId } });
    if (!line || line.memberId !== req.userId) {
      return res.status(403).json({ error: 'Not your order line' });
    }

    const updated = await prisma.orderLineConfirmation.update({
      where: { id: lineItemId },
      data: { confirmedAt: new Date() },
    });

    res.json({ line: updated, message: 'Confirmed.' });
  } catch (error) {
    console.error('Confirm order line error:', error.message);
    res.status(500).json({ error: 'Could not confirm order line' });
  }
}