import prisma from '../config/db.js';
import { submitBasketToPool } from '../services/matchmakerService.js';
import { sortByDistance } from '../utils/geo.js';
import { getTierForCases, getNextTier, casesToReachTier, palletsForCases } from '../utils/smartMatchTiers.js';

export async function submitToPool(req, res) {
  const { basketId, partnerId } = req.body;
  if (!basketId || !partnerId) {
    return res.status(400).json({ error: 'basketId and partnerId are required' });
  }

  try {
    const result = await submitBasketToPool(req.userId, basketId, partnerId);
    res.json({
      ...result,
      message: result.matched
        ? `Your order matched! Group code: ${result.groupCode}`
        : `Basket parked. ${result.currentCases}/${result.moqTarget} cases needed to reach the bulk order minimum.`,
    });
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

    const updated = await prisma.basket.update({
      where: { id: basketId },
      data: { status: 'CANCELLED' },
    });

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
      include: { pool: { include: { partner: true } } },
    });
    if (!payment || payment.userId !== req.userId) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'REFUNDED') return res.status(409).json({ error: 'This payment has already been refunded' });
    if (payment.refundRequestedAt) return res.status(409).json({ error: 'A refund has already been requested for this payment' });

    const updated = await prisma.poolPayment.update({
      where: { id: paymentId },
      data: { refundRequestedAt: new Date() },
    });

    if (payment.pool.partner.userId) {
      const { createNotification } = await import('../services/notificationDbService.js');
      await createNotification(
        payment.pool.partner.userId,
        'REFUND_REQUESTED',
        `A member requested a refund of R${parseFloat(payment.amountZAR).toFixed(2)} on a pool order.`,
        'supplier'
      );
    }

    res.json({ payment: updated, message: 'Refund requested — the supplier will process it from their dashboard.' });
  } catch (error) {
    console.error('Request pool payment refund error:', error.message);
    res.status(500).json({ error: 'Could not request refund' });
  }
}

/**
 * The requesting user's most recent parked/matched basket, with live Smart
 * Match progress — how many combined cases the pool has reached toward its
 * bulk-pricing minimum. Baskets in a pool aren't the "current" draft basket
 * anymore (getMyBasket only ever returns the active DRAFT), so this is the
 * only place that surfaces ongoing pool status back to the member.
 */
export async function getMyPoolStatus(req, res) {
  try {
    const basket = await prisma.basket.findFirst({
      where: { userId: req.userId, status: { in: ['PARKED', 'MATCHED'] } },
      orderBy: { updatedAt: 'desc' },
      include: { pool: { include: { partner: true, baskets: { include: { items: true } } } } },
    });
    if (!basket || !basket.pool) return res.json(null);

    const currentCases = basket.pool.baskets
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0);

    // SmartMatch tier standing — real pallet math only (smartMatchTiers.js).
    // tierPricing stays out of the response for any tier with no real quote
    // entered yet, so the app never shows a discount nobody has agreed to.
    const currentTier = getTierForCases(currentCases);
    const nextTier = getNextTier(currentCases);
    const pricing = basket.pool.tierCasePricing || {};
    const withPrice = (tier) => tier && { ...tier, casePriceZAR: pricing[String(tier.id)] ?? null };

    res.json({
      basketId: basket.id,
      basketStatus: basket.status,
      partnerName: basket.pool.partner.name,
      area: basket.pool.area,
      currentCases,
      moqTarget: basket.pool.moqTarget,
      poolStatus: basket.pool.status,
      windowDeadline: basket.pool.deadline,
      capCases: basket.pool.capCases,
      smartMatch: {
        pallets: palletsForCases(currentCases),
        currentTier: withPrice(currentTier),
        nextTier: withPrice(nextTier),
        casesToNextTier: casesToReachTier(currentCases, nextTier),
        // Every tier's real negotiated price, keyed by tier id — null for
        // any tier with no quote entered yet. Lets the app show the whole
        // 4-tier ladder, not just where the pool currently sits.
        tierCasePricing: pricing,
      },
    });
  } catch (error) {
    console.error('Get my pool status error:', error.message);
    res.status(500).json({ error: 'Could not fetch pool status' });
  }
}

export async function getPartners(req, res) {
  try {
    const partners = await prisma.partner.findMany({ orderBy: { name: 'asc' } });
    const lat = req.query.lat ? parseFloat(req.query.lat) : null;
    const lng = req.query.lng ? parseFloat(req.query.lng) : null;
    res.json(sortByDistance(partners, lat, lng));
  } catch (error) {
    console.error('Get partners error:', error.message);
    res.status(500).json({ error: 'Could not fetch partners' });
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