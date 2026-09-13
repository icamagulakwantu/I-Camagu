import prisma from '../config/db.js';
import { resolveTierLadder, getTierForMetric, palletsForCases } from '../utils/smartMatchTiers.js';
import { notifyAdminOfSmartMatchTier } from './notificationService.js';
import { newPoolWindow, isPoolWindowClosed } from '../utils/poolWindow.js';

// Honest simplification, noted here for future reference: MOQ matching here
// is by TOTAL CASE COUNT in the pool, not per-SKU. A true per-SKU MOQ engine
// (matching Section 4.2 fully) needs Partner-level per-SKU MOQ data, which
// doesn't exist in the schema yet — this is a deliberate v1 simplification.

function generateGroupCode() {
  return 'GRP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Real tier milestones — pallets for an alcohol pool, Rand pooled for a
// groceries/livestock one (see smartMatchTiers.js) — applied to the pool's
// real numbers. Emails the admin (never an external supplier or
// manufacturer) the first time a pool reaches a new tier, so the founder
// knows when there's genuinely enough volume to go negotiate.
async function notifySmartMatchTierIfCrossed(pool, currentCases, currentAmountZAR) {
  const ladder = resolveTierLadder(pool);
  const metric = (pool.tierBasis || 'PALLETS') === 'AMOUNT' ? currentAmountZAR : palletsForCases(currentCases);
  const tier = getTierForMetric(metric, ladder);
  if (!tier || tier.id <= pool.lastTierNotified) return;

  await prisma.bulkPool.update({
    where: { id: pool.id },
    data: { lastTierNotified: tier.id },
  });
  await notifyAdminOfSmartMatchTier(pool, tier, currentCases, currentAmountZAR);
}

export async function submitBasketToPool(userId, basketId, partnerId) {
  const basket = await prisma.basket.findFirst({
    where: { id: basketId, userId, status: 'DRAFT' },
    include: { items: true },
  });
  if (!basket) throw new Error('Basket not found or already submitted');
  if (basket.items.length === 0) throw new Error('Basket is empty');

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) throw new Error('Partner not found');

  let pool = await prisma.bulkPool.findFirst({
    where: { partnerId, area: partner.area, status: 'OPEN' },
    include: { baskets: { include: { items: true } } },
    orderBy: { createdAt: 'desc' },
  });
  if (pool) {
    const currentCases = pool.baskets
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0);
    // This window is full or has run its 72-hour course — don't pile a new
    // basket onto it, open a fresh pool instead so the batch stays a
    // predictable size for the supplier to actually fulfil.
    if (isPoolWindowClosed(pool, currentCases)) pool = null;
  }
  if (!pool) {
    const moqTarget = partner.moq || 50;
    pool = await prisma.bulkPool.create({
      data: { partnerId, area: partner.area, moqTarget, status: 'OPEN', ...newPoolWindow(moqTarget) },
    });
  }

  await prisma.basket.update({
    where: { id: basketId },
    data: { status: 'PARKED', poolId: pool.id },
  });

  const result = await checkAndMatchPool(pool.id);
  return { pool, matched: result.matched, currentCases: result.currentCases, moqTarget: pool.moqTarget, groupCode: result.groupCode };
}

export async function checkAndMatchPool(poolId) {
  const pool = await prisma.bulkPool.findUnique({
    where: { id: poolId },
    include: { baskets: { include: { items: { include: { sku: true } } } }, partner: true },
  });

  const activeBaskets = pool.baskets.filter((b) => b.status !== 'CANCELLED');
  const currentCases = activeBaskets.reduce(
    (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  // Real Rand pooled so far — only used by AMOUNT-basis pools (groceries,
  // livestock), computed off each item's real casePriceZAR, never guessed.
  const currentAmountZAR = activeBaskets.reduce(
    (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity * parseFloat(i.sku?.casePriceZAR || 0), 0),
    0
  );

  await notifySmartMatchTierIfCrossed(pool, currentCases, currentAmountZAR);

  if (currentCases < pool.moqTarget) {
    return { matched: false, currentCases };
  }

  // MOQ reached — generate the Order Confirmation Document
  const lineItemsBySku = {};
  for (const basket of activeBaskets) {
    for (const item of basket.items) {
      const key = item.skuId;
      if (!lineItemsBySku[key]) lineItemsBySku[key] = { quantity: 0, memberContributions: [] };
      lineItemsBySku[key].quantity += item.quantity;
      lineItemsBySku[key].memberContributions.push({ userId: basket.userId, quantity: item.quantity });
    }
  }

  const skus = await prisma.sku.findMany({ where: { id: { in: Object.keys(lineItemsBySku) } } });
  const skuMap = Object.fromEntries(skus.map(s => [s.id, s]));

  const totalAmountZAR = Object.entries(lineItemsBySku).reduce(
    (sum, [skuId, data]) => sum + (data.quantity * parseFloat(skuMap[skuId].casePriceZAR || 0)),
    0
  );

  const document = await prisma.orderConfirmationDocument.create({
    data: {
      poolId: pool.id,
      groupCode: generateGroupCode(),
      totalAmountZAR,
      // Default safety measure per Section 4.2: collection points default to
      // a location near a police station, mirroring real-world SAB delivery practice.
      deliveryLocation: `Near the police station closest to ${pool.area} — exact location to be confirmed`,
      status: 'PENDING_MEMBER_CONFIRMATION',
    },
  });

  for (const basket of activeBaskets) {
    let memberAmountZAR = 0;
    for (const item of basket.items) {
      const sku = skuMap[item.skuId];
      memberAmountZAR += item.quantity * parseFloat(sku.casePriceZAR || 0);
      await prisma.orderLineConfirmation.create({
        data: {
          documentId: document.id,
          memberId: basket.userId,
          itemDescription: `${sku.name} (${sku.bottleFormat})`,
          quantity: item.quantity,
          unitType: 'CASE',
        },
      });
    }
    await prisma.basket.update({ where: { id: basket.id }, data: { status: 'MATCHED' } });

    // One PENDING PoolPayment per member for their share — manual EFT to the
    // supplier for now (no PSP yet); the supplier confirms receipt from their
    // own dashboard, mirroring how stokvel contributions get confirmed.
    await prisma.poolPayment.create({
      data: {
        poolId: pool.id,
        userId: basket.userId,
        provider: 'MANUAL_EFT',
        amountZAR: memberAmountZAR,
        status: 'PENDING',
      },
    });
  }

  await prisma.bulkPool.update({ where: { id: pool.id }, data: { status: 'MATCHED' } });

  return { matched: true, currentCases, documentId: document.id, groupCode: document.groupCode };
}