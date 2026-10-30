import prisma from '../config/db.js';
import { submitBasketToPool, AREA_REQUIRED_MESSAGE, UNSPECIFIED_AREA } from '../services/matchmakerService.js';
import { searchAddresses, reverseLookup } from '../services/geocodeService.js';
import { POOL_FINDER_RADIUS_KM, PRIVATE_ORDER_RADIUS_KM, hasCoordinates, isPrivateOrderPool, poolDistanceKm } from '../utils/deliveryArea.js';
import { isPoolWindowClosed } from '../utils/poolWindow.js';
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
  const { basketId, targetDate, joinPoolId, joinPoolIds, mode, delivery } = req.body;
  if (!basketId) {
    return res.status(400).json({ error: 'basketId is required' });
  }
  // joinPoolId is the older single-pool field; still accepted.
  const chosenPools = [...(Array.isArray(joinPoolIds) ? joinPoolIds : []), ...(joinPoolId ? [joinPoolId] : [])];

  try {
    const result = await submitBasketToPool(req.userId, basketId, targetDate, chosenPools, {
      mode,
      delivery: delivery && typeof delivery === 'object' ? delivery : null,
    });
    const lines = result.submissions.map((s) => {
      const label = CATEGORY_LABEL[s.category];
      if (s.mode === 'SOLO') {
        return `${label} order placed${s.groupCode ? ` (order ${s.groupCode})` : ''} — merchants can now send offers. We'll notify you when one is confirmed.`;
      }
      const progress = `${s.currentCases}/${s.moqTarget} needed`;
      let base;
      if (s.matched) base = `${label} pool near ${s.area} reached its minimum order! Group code: ${s.groupCode}`;
      else if (s.addedToExistingPool) base = `${label} added to your pool near ${s.area} — ${progress}.`;
      else base = `${label} pooling near ${s.area} — ${progress}.`;
      // Tells the truth when the pool they picked had already closed.
      if (s.joinedInvitedPool === false) {
        return `${base} (The pool you chose had already closed or was full, so your items went to another open pool near your address.)`;
      }
      return base;
    });

    res.json({ ...result, message: lines.join(' ') || 'Nothing could be submitted.' });
  } catch (error) {
    res.status(400).json({
      error: error.message,
      // Lets the cart screen focus the address box instead of just showing text.
      code: error.message === AREA_REQUIRED_MESSAGE ? 'AREA_REQUIRED' : undefined,
    });
  }
}

// Address suggestions while typing at checkout (South Africa only).
export async function searchDeliveryAddress(req, res) {
  try {
    res.json({ suggestions: await searchAddresses(req.query.q) });
  } catch (error) {
    console.error('Address search error:', error.message);
    // Typing still works without suggestions, so never block checkout.
    res.json({ suggestions: [], unavailable: true });
  }
}

// "Use my current location" -> a readable address.
export async function reverseDeliveryAddress(req, res) {
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lon);
  if (!hasCoordinates({ latitude, longitude })) return res.status(400).json({ error: 'A valid location is required' });
  try {
    const place = await reverseLookup(latitude, longitude);
    res.json({ place: place || { label: '', address: '', area: '', latitude, longitude } });
  } catch (error) {
    console.error('Reverse address error:', error.message);
    res.json({ place: { label: '', address: '', area: '', latitude, longitude }, unavailable: true });
  }
}

/**
 * The pool finder: open group orders near ANY address the member types —
 * not just their profile area — for the kinds of items in their cart.
 * Query: lat, lon (optional), area (optional), categories=TAVERN,GROCERY
 */
export async function getPoolsNearAddress(req, res) {
  const point = req.query.lat && req.query.lon
    ? { latitude: Number(req.query.lat), longitude: Number(req.query.lon) }
    : null;
  const area = String(req.query.area || '').trim().slice(0, 80);
  const usePoint = point && hasCoordinates(point) ? point : null;
  if (!usePoint && !area) return res.json({ pools: [] });
  const categories = String(req.query.categories || '').split(',').filter((c) => CATEGORY_LABEL[c]);

  try {
    const pools = await prisma.bulkPool.findMany({
      where: {
        status: 'OPEN',
        area: { not: UNSPECIFIED_AREA },
        radiusKm: { gt: PRIVATE_ORDER_RADIUS_KM },
        ...(categories.length ? { category: { in: categories } } : {}),
      },
      include: {
        baskets: {
          where: { status: { not: 'CANCELLED' } },
          select: { userId: true, items: { select: { quantity: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const results = pools.map((pool) => {
      const currentCases = pool.baskets.reduce((sum, b) => sum + b.items.reduce((n, i) => n + i.quantity, 0), 0);
      const distance = poolDistanceKm(pool, usePoint, area);
      return {
        id: pool.id,
        category: pool.category,
        area: pool.area,
        distanceKm: distance == null ? null : Math.round(distance * 10) / 10,
        currentCases,
        moqTarget: pool.moqTarget,
        members: new Set(pool.baskets.map((b) => b.userId)).size,
        isMine: pool.baskets.some((b) => b.userId === req.userId),
        deadline: pool.deadline,
        progress: pool.moqTarget ? Math.min(1, currentCases / pool.moqTarget) : 0,
        closed: isPoolWindowClosed(pool, currentCases),
      };
    })
      .filter((pool) => !pool.closed && pool.distanceKm != null && pool.distanceKm <= POOL_FINDER_RADIUS_KM)
      // Your own pool first, then the closest, then the fullest (closest to ordering).
      .sort((a, b) => (b.isMine - a.isMine) || (a.distanceKm - b.distanceKm) || (b.progress - a.progress))
      .slice(0, 12)
      .map(({ closed, ...pool }) => pool);

    res.json({ pools: results, radiusKm: POOL_FINDER_RADIUS_KM });
  } catch (error) {
    console.error('Pools near address error:', error.message);
    res.status(500).json({ error: 'Could not find pools near that address' });
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

    // Use the same pool-row lock as matching.
    const updated = await prisma.$transaction(async (tx) => {
      if (basket.poolId) {
        await tx.$queryRaw`SELECT "id" FROM "BulkPool" WHERE "id" = ${basket.poolId} FOR UPDATE`;
      }
      const current = await tx.basket.findUnique({ where: { id: basketId } });
      if (!current || current.userId !== req.userId) {
        throw Object.assign(new Error('Basket not found'), { httpStatus: 404 });
      }
      if (current.status !== 'PARKED') {
        throw Object.assign(new Error('This basket has already started matching or ordering and can no longer be withdrawn.'), { httpStatus: 409 });
      }
      const transition = await tx.basket.updateMany({
        where: { id: basketId, userId: req.userId, status: 'PARKED' },
        data: { status: 'CANCELLED' },
      });
      if (transition.count !== 1) {
        throw Object.assign(new Error('This basket changed state while you were withdrawing it. Refresh your pool and order status.'), { httpStatus: 409 });
      }
      return tx.basket.findUnique({ where: { id: basketId } });
    });

    res.json({ basket: updated, message: 'Basket withdrawn from the pool.' });
  } catch (error) {
    if (error.httpStatus) return res.status(error.httpStatus).json({ error: error.message });
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

    // Compare-and-set prevents two simultaneous requests from both being accepted.
    const request = await prisma.poolPayment.updateMany({
      where: { id: paymentId, userId: req.userId, status: 'CLEARED', refundRequestedAt: null, provider: { not: 'STOKVEL_FUNDS' } },
      data: { refundRequestedAt: new Date() },
    });
    if (request.count !== 1) {
      return res.status(409).json({ error: 'This payment changed while the refund was being requested. Refresh and check its current status.' });
    }
    const updated = await prisma.poolPayment.findUnique({ where: { id: paymentId } });

    // Manual EFT: the supplier holds the money, so notify them in-app.
    // PayFast: iCamagu holds the money, so email the admin instead.
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
 * with its own live Smart Match progress. Baskets in the same pool are
 * grouped into ONE entry, so a member sees one card per pool (not one per
 * checkout) — older data can still hold several baskets in one pool.
 */
export async function getMyPoolStatus(req, res) {
  try {
    const baskets = await prisma.basket.findMany({
      where: { userId: req.userId, status: { in: ['PARKED', 'MATCHED'] } },
      orderBy: { updatedAt: 'desc' },
      include: { pool: { include: { partner: true, baskets: { include: { items: { include: { sku: true } } } } } } },
    });

    const statuses = [];
    const seenPools = new Map();
    for (const basket of baskets) {
      if (!basket.pool) continue;

      // Same pool, same status: fold into the card already built for it.
      const groupKey = `${basket.pool.id}:${basket.status}`;
      if (seenPools.has(groupKey)) {
        seenPools.get(groupKey).basketIds.push(basket.id);
        continue;
      }

      const activeBaskets = basket.pool.baskets.filter((b) => b.status !== 'CANCELLED');
      const currentCases = activeBaskets.reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0);
      const currentAmountZAR = activeBaskets.reduce(
        (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity * parseFloat(i.sku?.casePriceZAR || 0), 0),
        0
      );
      const myCases = activeBaskets
        .filter((b) => b.userId === req.userId)
        .reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0);

      const basis = basket.pool.tierBasis || 'PALLETS';
      const isAmount = basis === 'AMOUNT';
      const metric = isAmount ? currentAmountZAR : palletsForCases(currentCases);
      const ladder = resolveTierLadder(basket.pool);
      const currentTier = getTierForMetric(metric, ladder);
      const nextTier = getNextTierForMetric(metric, ladder);
      const remaining = amountToReachTier(metric, nextTier);

      // The member's own payment on this pool, matched to this exact basket's
      // order reference when there is one.
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

      const status = {
        basketId: basket.id,
        // Every one of this member's parked baskets in this pool, so
        // "Withdraw" can withdraw all of them at once.
        basketIds: [basket.id],
        basketStatus: basket.status,
        poolId: basket.pool.id,
        category: basket.pool.category,
        // A "buy on my own" order: shown as an order, not a pool to grow.
        isPrivate: isPrivateOrderPool(basket.pool),
        partnerName: basket.pool.partner?.name || null,
        area: basket.pool.area,
        currentCases,
        myCases,
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
          toNextTier: isAmount ? Math.ceil(remaining) : Math.ceil(remaining * PALLET_CASES),
        },
      };
      seenPools.set(groupKey, status);
      statuses.push(status);
    }

    res.json(statuses);
  } catch (error) {
    console.error('Get my pool status error:', error.message);
    res.status(500).json({ error: 'Could not fetch pool status' });
  }
}

/**
 * Minimal, authenticated preview of a specific pool, for a member who
 * followed a real "join this pool" invite link before they've added
 * anything to their own basket yet. Real numbers only.
 */
export async function getPoolSummary(req, res) {
  const { id } = req.params;
  try {
    const pool = await prisma.bulkPool.findUnique({
      where: { id },
      include: { partner: true, baskets: { include: { items: { include: { sku: true } } } } },
    });
    // Private orders are only visible to the member who placed them.
    if (!pool || (isPrivateOrderPool(pool) && !pool.baskets.some((b) => b.userId === req.userId))) {
      return res.status(404).json({ error: 'Pool not found' });
    }

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
      currentCases,
      moqTarget: pool.moqTarget,
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
