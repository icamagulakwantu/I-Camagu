import prisma from '../config/db.js';
import { submitBasketToPool } from '../services/matchmakerService.js';
import { PALLET_CASES, palletsForCases, resolveTierLadder, getTierForMetric, getNextTierForMetric, amountToReachTier } from '../utils/smartMatchTiers.js';

export const CATEGORY_LABEL = { TAVERN: 'Drinks', BUTCHERY: 'Meat & livestock', GROCERY: 'Groceries & other items', PRODUCE: 'Fresh produce' };

export async function submitToPool(req, res) {
  const { basketId } = req.body;
  if (!basketId) {
    return res.status(400).json({ error: 'basketId is required' });
  }

  try {
    const result = await submitBasketToPool(req.userId, basketId);
    const lines = result.submissions.map((s) =>
      s.matched
        ? `${CATEGORY_LABEL[s.category]} matched${s.partnerName ? ` with ${s.partnerName}` : ''}! Group code: ${s.groupCode}`
        : `${CATEGORY_LABEL[s.category]} pooling${s.partnerName ? ` with ${s.partnerName}` : ''} — ${s.currentCases}/${s.moqTarget} cases needed.`
    );

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
      const payment = await prisma.poolPayment.findFirst({
        where: { poolId: basket.pool.id, userId: req.userId },
        orderBy: { createdAt: 'desc' },
        select: { status: true, providerReference: true, amountZAR: true },
      });

      statuses.push({
        basketId: basket.id,
        basketStatus: basket.status,
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