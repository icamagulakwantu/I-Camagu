import prisma from '../config/db.js';
import { resolveTierLadder, getTierForMetric, palletsForCases } from '../utils/smartMatchTiers.js';
import { notifyAdminOfSmartMatchTier } from './notificationService.js';
import { newPoolWindow, isPoolWindowClosed } from '../utils/poolWindow.js';
import { haversineKm } from '../utils/geo.js';

// Honest simplification, noted here for future reference: MOQ matching here
// is by TOTAL CASE COUNT in the pool, not per-SKU. A true per-SKU MOQ engine
// (matching Section 4.2 fully) needs Partner-level per-SKU MOQ data, which
// doesn't exist in the schema yet — this is a deliberate v1 simplification.

function generateGroupCode() {
  return 'GRP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

// Which kind of partner a SKU's category needs — mirrors the "Drinks"
// department in src/data/storeTaxonomy.js exactly. There are only two
// Partner types today (TAVERN, BUTCHERY), so this is a binary split:
// anything sold at a bottle store/tavern (including soft drinks and water,
// which the Store groups under "Drinks" too) goes to a TAVERN; everything
// else — meat, livestock, dry goods, produce, ceremony supplies — goes to
// a BUTCHERY, the app's only non-alcohol wholesale partner type so far.
const TAVERN_CATEGORIES = new Set([
  'BEER', 'CIDER_RTD',
  'BRANDY', 'WHISKY', 'VODKA', 'VODKA_PREMIUM', 'GIN', 'TEQUILA', 'TEQUILA_PREMIUM', 'COGNAC', 'LIQUEUR', 'MIXER',
  'WINE', 'WINE_BOX', 'SPARKLING', 'CHAMPAGNE',
  'SOFT_DRINKS', 'WATER',
]);

function partnerTypeForSku(sku) {
  return TAVERN_CATEGORIES.has(sku.category) ? 'TAVERN' : 'BUTCHERY';
}

// Finds (or opens) the right pool for a partner — same "reuse unless the
// window's full or expired" rule as before, just pulled out so it can be
// called once per category instead of once per whole basket.
async function findOrCreateOpenPool(partner) {
  let pool = await prisma.bulkPool.findFirst({
    where: { partnerId: partner.id, area: partner.area, status: 'OPEN' },
    include: { baskets: { include: { items: true } } },
    orderBy: { createdAt: 'desc' },
  });
  if (pool) {
    const currentCases = pool.baskets
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0);
    if (isPoolWindowClosed(pool, currentCases)) pool = null;
  }
  if (!pool) {
    const moqTarget = partner.moq || 50;
    pool = await prisma.bulkPool.create({
      data: { partnerId: partner.id, area: partner.area, moqTarget, status: 'OPEN', ...newPoolWindow(moqTarget) },
    });
  }
  return pool;
}

// Picks the best-fit partner of a given type for this member — no manual
// choice, per the founder's call: a member (or a stokvel) has no real basis
// to pick between outlets, since the right one depends on facts the app
// already has and the member doesn't (who's nearby, who's already close to
// their bulk-pricing minimum).
//
// Real distance wins when both the member and the partner have coordinates
// on file. Today's real partners don't yet (no lat/lng entered), so the
// practical tiebreak is "order volume" — prefer whichever partner's open
// pool is already furthest toward its MOQ, so a member's order helps an
// existing pool clear instead of always starting a fresh wait from zero —
// then the member's own area string, then partner name for a stable result.
export async function pickBestPartnerForCategory(userId, partnerType) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { latitude: true, longitude: true, location: true },
  });

  const partners = await prisma.partner.findMany({
    where: { type: partnerType },
    include: {
      pools: {
        where: { status: 'OPEN' },
        include: { baskets: { include: { items: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  if (partners.length === 0) return null;

  const scored = partners.map((partner) => {
    const distanceKm =
      user?.latitude != null && user?.longitude != null && partner.latitude != null && partner.longitude != null
        ? haversineKm(user.latitude, user.longitude, partner.latitude, partner.longitude)
        : null;

    const openPool = partner.pools[0] || null;
    const currentCases = openPool
      ? openPool.baskets.filter((b) => b.status !== 'CANCELLED').reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0)
      : 0;
    const progress = openPool ? Math.min(1, currentCases / openPool.moqTarget) : 0;
    const sameArea = user?.location && partner.area === user.location ? 1 : 0;

    return { partner, distanceKm, progress, sameArea };
  });

  scored.sort((a, b) => {
    if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
    if (a.distanceKm != null) return -1;
    if (b.distanceKm != null) return 1;
    if (b.progress !== a.progress) return b.progress - a.progress;
    if (b.sameArea !== a.sameArea) return b.sameArea - a.sameArea;
    return a.partner.name.localeCompare(b.partner.name);
  });

  return scored[0].partner;
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

export async function submitBasketToPool(userId, basketId) {
  const basket = await prisma.basket.findFirst({
    where: { id: basketId, userId, status: 'DRAFT' },
    include: { items: { include: { sku: true } } },
  });
  if (!basket) throw new Error('Basket not found or already submitted');
  if (basket.items.length === 0) throw new Error('Basket is empty');

  // A basket can hold both alcohol and non-alcohol items, but a partner is
  // only ever a tavern or a butchery — never both. Split by the partner
  // type each item actually needs, and submit each group to its own pool.
  const groups = new Map();
  for (const item of basket.items) {
    const type = partnerTypeForSku(item.sku);
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type).push(item);
  }

  const submissions = [];
  const unmatchedTypes = [];

  for (const [partnerType, items] of groups) {
    const partner = await pickBestPartnerForCategory(userId, partnerType);
    if (!partner) {
      // No partner of this type exists anywhere yet — those items simply
      // can't be pooled. Leave them where they are (still on the original
      // DRAFT basket) rather than losing them or forcing a mismatched
      // partner on them.
      unmatchedTypes.push(partnerType);
      continue;
    }

    // Each matched group gets its own basket row so it can be parked
    // against its own pool independently of the others.
    const groupBasket = await prisma.basket.create({ data: { userId, status: 'DRAFT' } });
    await prisma.basketItem.updateMany({
      where: { id: { in: items.map((it) => it.id) } },
      data: { basketId: groupBasket.id },
    });

    const pool = await findOrCreateOpenPool(partner);
    await prisma.basket.update({ where: { id: groupBasket.id }, data: { status: 'PARKED', poolId: pool.id } });
    const result = await checkAndMatchPool(pool.id);
    submissions.push({
      partnerType,
      partnerName: partner.name,
      partnerArea: partner.area,
      matched: result.matched,
      currentCases: result.currentCases,
      moqTarget: pool.moqTarget,
      groupCode: result.groupCode,
    });
  }

  return { submissions, unmatchedTypes };
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