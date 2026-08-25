import prisma from '../config/db.js';
import { submitBasketToPool } from '../services/matchmakerService.js';
import { sortByDistance } from '../utils/geo.js';

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

    const currentCases = basket.pool.baskets.reduce(
      (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0),
      0
    );

    res.json({
      basketStatus: basket.status,
      partnerName: basket.pool.partner.name,
      area: basket.pool.area,
      currentCases,
      moqTarget: basket.pool.moqTarget,
      poolStatus: basket.pool.status,
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