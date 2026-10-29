import prisma from '../config/db.js';
import { resolveTierLadder, getTierForMetric, palletsForCases } from '../utils/smartMatchTiers.js';
import { notifyAdminOfSmartMatchTier } from './notificationService.js';
import { newPoolWindow, isPoolWindowClosed } from '../utils/poolWindow.js';
import { generateUniqueReference } from '../utils/referenceGenerator.js';

// Legacy label for pools opened before an area was required. Never matched
// into again, so members with a real area stop being routed to it.
export const UNSPECIFIED_AREA = 'Unspecified';

export const AREA_REQUIRED_MESSAGE = 'Please add your area (town or suburb) to your profile before joining a pool, so we can match you with people near you.';

// Default minimum (in cases) before a group order is MATCHED and merchants'
// offers can be accepted. No merchant is chosen up front any more, so there
// is no merchant-specific minimum to use at the time a pool opens.
const DEFAULT_MOQ_CASES = 50;

// Serialize a pool join against matching. The lock is held until the
// caller's transaction commits, so a match cannot close the pool between the
// status check and the new basket being created.
export async function lockOpenPoolForJoin(tx, poolId, incomingCases = 0) {
  const lockedRows = await tx.$queryRaw`SELECT "id" FROM "BulkPool" WHERE "id" = ${poolId} FOR UPDATE`;
  if (!lockedRows.length) throw new Error('Pool not found');
  const pool = await tx.bulkPool.findUnique({
    where: { id: poolId },
    select: { status: true, deadline: true, capCases: true, moqTarget: true },
  });
  if (!pool || pool.status !== 'OPEN') throw new Error('This pool is no longer open');
  if (pool.deadline && new Date(pool.deadline).getTime() <= Date.now()) {
    throw new Error('This pool has passed its joining deadline');
  }
  if (pool.capCases != null) {
    const activeBaskets = await tx.basket.findMany({
      where: { poolId, status: { not: 'CANCELLED' } },
      select: { items: { select: { quantity: true } } },
    });
    const currentCases = activeBaskets.reduce(
      (sum, basket) => sum + basket.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0,
    );
    if (currentCases + incomingCases > pool.capCases) {
      throw new Error(`This pool has reached its case cap of ${pool.capCases}`);
    }
  }
  return pool;
}

// Honest simplification, noted here for future reference: MOQ matching here
// is by TOTAL CASE COUNT in the pool, not per-SKU. A true per-SKU MOQ engine
// (matching Section 4.2 fully) needs Partner-level per-SKU MOQ data, which
// doesn't exist in the schema yet — this is a deliberate v1 simplification.

// One order code per matched pool — identifies the order as a whole (what
// the delivery/collection document is for). Distinct from each member's own
// paymentReference below, which identifies one specific person's payment.
function generateGroupCode(tx) {
  return generateUniqueReference('GRP', async (code) => !!(await tx.orderConfirmationDocument.findUnique({ where: { groupCode: code } })));
}

// One reference per matched basket — the cart's own identity within the
// pool, distinct from the pool-wide groupCode above. Two jobs, same code:
// it's what a member is told to put in their manual EFT (see MyOrders.jsx),
// and it's what a supplier splitting a matched pool's physical stock (e.g.
// 6 pallets) labels that member's portion with — so one glance at a
// reference tells you both "who paid this" and "whose order this is".
function generateOrderReference(tx) {
  return generateUniqueReference('ORD', async (code) => !!(await tx.basket.findUnique({ where: { orderReference: code } })));
}

// Which real-world category a SKU needs — mirrors the departments in
// src/data/storeTaxonomy.js. Matches BulkPool.category / Partner.type
// exactly, so a pool's category IS the kind of merchant that can send an
// offer on it, with no separate mapping to keep in sync.
const TAVERN_CATEGORIES = new Set([
  'BEER', 'CIDER_RTD',
  'BRANDY', 'WHISKY', 'VODKA', 'VODKA_PREMIUM', 'GIN', 'TEQUILA', 'TEQUILA_PREMIUM', 'COGNAC', 'LIQUEUR', 'MIXER',
  'WINE', 'WINE_BOX', 'SPARKLING', 'CHAMPAGNE',
  'SOFT_DRINKS', 'WATER',
]);
const BUTCHERY_CATEGORIES = new Set(['LIVESTOCK_ANIMAL', 'MEAT']);
const PRODUCE_CATEGORIES = new Set(['FRESH_PRODUCE']);
// Everything else — dry goods, tinned goods, ceremony supplies, general
// grocery — falls to GROCERY, matching storeTaxonomy's "staples" catch-all.

function categoryForSku(sku) {
  if (TAVERN_CATEGORIES.has(sku.category)) return 'TAVERN';
  if (BUTCHERY_CATEGORIES.has(sku.category)) return 'BUTCHERY';
  if (PRODUCE_CATEGORIES.has(sku.category)) return 'PRODUCE';
  return 'GROCERY';
}

// Alcohol comes in pallets (a fixed founder policy, see smartMatchTiers.js);
// everything else is priced and discounted off total Rand spent instead —
// there's no universal "pallet" unit for meat, groceries or produce.
function tierBasisForCategory(category) {
  return category === 'TAVERN' ? 'PALLETS' : 'AMOUNT';
}

function normaliseArea(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim().toLocaleLowerCase().replace(/\s+/g, ' ');
}

function distanceKm(aLat, aLon, bLat, bLon) {
  const radians = (value) => value * Math.PI / 180;
  const dLat = radians(bLat - aLat);
  const dLon = radians(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

const activeCases = (pool) => pool.baskets
  .filter((basket) => basket.status !== 'CANCELLED')
  .reduce((sum, basket) => sum + basket.items.reduce((n, item) => n + item.quantity, 0), 0);

// True when a pool can still take `incomingCases` more without closing or
// hitting its cap — checked up front so a full pool is skipped instead of
// failing the whole checkout inside lockOpenPoolForJoin.
function poolCanTake(pool, incomingCases) {
  const currentCases = activeCases(pool);
  if (isPoolWindowClosed(pool, currentCases)) return false;
  if (pool.capCases != null && currentCases + incomingCases > pool.capCases) return false;
  return true;
}

// The open pool this member is ALREADY in for this category, if any. Shopping
// again must add to that pool, not open (or land in) a different one — this
// was the "every time I shop it creates a new pool" flaw.
async function findMyOpenPool(userId, category, incomingCases) {
  const parked = await prisma.basket.findMany({
    where: {
      userId,
      status: 'PARKED',
      pool: { category, status: 'OPEN', area: { not: UNSPECIFIED_AREA } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
    include: { pool: { include: { partner: true, baskets: { include: { items: true } } } } },
  });
  for (const basket of parked) {
    if (basket.pool && poolCanTake(basket.pool, incomingCases)) return basket.pool;
  }
  return null;
}

// Finds (or opens) the pool for this category+area. No merchant is chosen
// or attached here: members form and join pools freely, merchants of the
// matching kind send offers on them (see offerService.js), and the best
// offer is accepted once the pool reaches its minimum.
//
// targetDate only matters when a *new* pool is being opened — joining an
// already-open pool inherits whatever deadline that pool already has.
async function findOrCreateOpenPool(category, area, targetDate, user, incomingCases = 0) {
  const candidates = await prisma.bulkPool.findMany({
    where: { category, status: 'OPEN', area: { not: UNSPECIFIED_AREA } },
    include: { partner: true, baskets: { include: { items: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const hasUserCoordinates = Number.isFinite(user?.latitude) && Number.isFinite(user?.longitude);
  let pool = candidates.find((candidate) => {
    if (!poolCanTake(candidate, incomingCases)) return false;
    const hasPoolCoordinates = Number.isFinite(candidate.latitude) && Number.isFinite(candidate.longitude);
    if (hasUserCoordinates && hasPoolCoordinates) {
      return distanceKm(user.latitude, user.longitude, candidate.latitude, candidate.longitude) <= (candidate.radiusKm || 20);
    }
    // Pools without coordinates remain discoverable by normalized town names.
    return normaliseArea(area) && normaliseArea(area) === normaliseArea(candidate.area);
  }) || null;
  if (!pool) {
    const moqTarget = DEFAULT_MOQ_CASES;
    pool = await prisma.bulkPool.create({
      data: {
        category,
        area,
        latitude: hasUserCoordinates ? user.latitude : null,
        longitude: hasUserCoordinates ? user.longitude : null,
        createdById: user?.id || null,
        radiusKm: 20,
        moqTarget,
        status: 'OPEN',
        tierBasis: tierBasisForCategory(category),
        partnerId: null,
        ...newPoolWindow(moqTarget, targetDate),
      },
      include: { partner: true, baskets: { include: { items: true } } },
    });
  }
  if (!pool.partner) pool.partner = pool.partnerId ? await prisma.partner.findUnique({ where: { id: pool.partnerId } }) : null;
  return pool;
}

// Emails the admin the first time a pool reaches a new SmartMatch tier, so
// the founder knows when there's genuinely enough volume to go negotiate.
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

// A pool the member chose explicitly — via an invite link OR the "Add to this
// pool" button on a pool they're already in. Returned even if no longer OPEN
// (its category is still needed); callers check `.status === 'OPEN'`.
async function getInvitedPool(joinPoolId) {
  if (!joinPoolId) return null;
  return prisma.bulkPool.findUnique({
    where: { id: joinPoolId },
    include: { partner: true, baskets: { include: { items: true } } },
  });
}

// One parking primitive for both full-basket checkout and the ceremony
// planner's item-level pool join. Existing draft items are moved atomically;
// planner items are created directly in the parked basket, never as a second
// draft cart (the user has at most one DRAFT basket).
//
// mergeIntoExisting: for plain checkout, if the member already has a plain
// personal PARKED basket in this pool, the items join THAT basket — one spot
// per member per pool, instead of a new card every time they shop.
export async function parkItemsIntoPool({
  userId,
  poolId,
  sourceBasketId = null,
  itemIds = [],
  itemSpecs = [],
  ceremonyId = null,
  checklistItemId = null,
  ceremonyCostItemId = null,
  fundingSource = 'PERSONAL',
  fundingStokvelId = null,
  mergeIntoExisting = false,
}) {
  if (!userId || !poolId) throw new Error('userId and poolId are required');
  if (!itemIds.length && !itemSpecs.length) throw new Error('At least one item is required');
  return prisma.$transaction(async (tx) => {
    // Calculate the exact incoming case count while holding the pool lock.
    const movedItems = itemIds.length
      ? await tx.basketItem.findMany({ where: { id: { in: itemIds } }, select: { quantity: true } })
      : [];
    const incomingCases = itemSpecs.reduce((sum, item) => sum + item.quantity, 0)
      + movedItems.reduce((sum, item) => sum + item.quantity, 0);
    await lockOpenPoolForJoin(tx, poolId, incomingCases);

    const canMerge = mergeIntoExisting && !itemSpecs.length && !ceremonyId && !checklistItemId
      && !ceremonyCostItemId && fundingSource === 'PERSONAL';
    const existing = canMerge
      ? await tx.basket.findFirst({
          where: {
            userId, poolId, status: 'PARKED', fundingSource: 'PERSONAL',
            ceremonyId: null, checklistItemId: null, ceremonyCostItemId: null,
          },
          orderBy: { updatedAt: 'desc' },
        })
      : null;

    const basket = existing || await tx.basket.create({
      data: {
        userId,
        status: 'PARKED',
        poolId,
        ceremonyId,
        checklistItemId,
        ceremonyCostItemId,
        fundingSource,
        fundingStokvelId: fundingSource === 'STOKVEL' ? fundingStokvelId : null,
        stokvelId: fundingSource === 'STOKVEL' ? fundingStokvelId : null,
        ...(itemSpecs.length ? { items: { create: itemSpecs.map((item) => ({ skuId: item.skuId, quantity: item.quantity })) } } : {}),
      },
    });
    if (itemIds.length) {
      const moved = await tx.basketItem.updateMany({
        where: {
          id: { in: itemIds },
          ...(sourceBasketId ? { basketId: sourceBasketId } : {}),
        },
        data: { basketId: basket.id },
      });
      if (moved.count !== itemIds.length) throw new Error('One or more basket items changed before they could be parked');
    }
    // Bump updatedAt so a merged basket sorts as the member's latest activity.
    if (existing) await tx.basket.update({ where: { id: basket.id }, data: { status: 'PARKED' } });
    const full = await tx.basket.findUnique({ where: { id: basket.id }, include: { items: { include: { sku: true } } } });
    return { ...full, merged: Boolean(existing) };
  });
}

export async function submitBasketToPool(userId, basketId, targetDate, joinPoolId) {
  const [basket, user] = await Promise.all([
    prisma.basket.findFirst({
      where: { id: basketId, userId, status: 'DRAFT' },
      include: { items: { include: { sku: true } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, location: true, latitude: true, longitude: true } }),
  ]);
  if (!basket) throw new Error('Basket not found or already submitted');
  if (basket.items.length === 0) throw new Error('Basket is empty');

  let parsedTargetDate = null;
  if (targetDate) {
    const d = new Date(targetDate);
    if (isNaN(d.getTime())) throw new Error('Target date is not a valid date');
    if (d.getTime() <= Date.now()) throw new Error('Target date must be in the future');
    parsedTargetDate = d;
  }

  // A pool is scoped by the member's own declared area. Without one we used
  // to file people under "Unspecified", splitting neighbours into separate
  // pools — so an area is now required before pooling.
  const area = user?.location?.trim();
  if (!area) throw new Error(AREA_REQUIRED_MESSAGE);

  // A basket can hold items from several categories, but a pool is always one
  // category — split by what each item needs and submit each group to its own pool.
  const groups = new Map();
  for (const item of basket.items) {
    const category = categoryForSku(item.sku);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }

  const invitedPool = await getInvitedPool(joinPoolId);
  const joinPoolCategory = invitedPool?.category ?? null;

  const submissions = [];

  for (const [category, items] of groups) {
    const incomingCases = items.reduce((sum, item) => sum + item.quantity, 0);
    const isInvitedCategory = Boolean(joinPoolId) && category === joinPoolCategory;
    const invitedPoolStillJoinable = isInvitedCategory && invitedPool.status === 'OPEN'
      && poolCanTake(invitedPool, incomingCases);

    // Order of preference: the pool they explicitly chose, then the pool they
    // are already in for this category, and only then the nearest open pool
    // (or a brand-new one).
    let pool = invitedPoolStillJoinable ? invitedPool : null;
    let joinedOwnPool = false;
    if (!pool) {
      pool = await findMyOpenPool(userId, category, incomingCases);
      joinedOwnPool = Boolean(pool);
    }
    if (!pool) pool = await findOrCreateOpenPool(category, area, parsedTargetDate, user, incomingCases);

    const parked = await parkItemsIntoPool({
      userId,
      poolId: pool.id,
      sourceBasketId: basket.id,
      itemIds: items.map((item) => item.id),
      mergeIntoExisting: true,
    });

    const result = await checkAndMatchPool(pool.id);
    submissions.push({
      category,
      partnerName: pool.partner?.name || null,
      area: pool.area,
      windowDeadline: pool.deadline,
      matched: result.matched,
      currentCases: result.currentCases,
      moqTarget: pool.moqTarget,
      groupCode: result.groupCode,
      // true when the items went into a pool this member was already in
      // (either chosen, or picked automatically) rather than a new one.
      addedToExistingPool: joinedOwnPool || parked.merged,
      // Only defined for the category an invite link targeted: false means
      // that pool had closed, so they were matched elsewhere — said honestly.
      joinedInvitedPool: isInvitedCategory ? invitedPoolStillJoinable : undefined,
    });
  }

  // Every item has now moved into a parked basket, so the open cart is empty.
  await prisma.basket.deleteMany({ where: { id: basket.id, status: 'DRAFT', items: { none: {} } } });

  return { submissions };
}

export async function checkAndMatchPool(poolId) {
  const pool = await prisma.bulkPool.findUnique({
    where: { id: poolId },
    include: { baskets: { include: { items: { include: { sku: true } } } }, partner: true },
  });
  if (!pool) throw new Error('Pool not found');

  const activeBaskets = pool.baskets.filter((b) => b.status !== 'CANCELLED');
  const currentCases = activeBaskets.reduce(
    (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0),
    0
  );
  // Real Rand pooled so far — only used by AMOUNT-basis pools.
  const currentAmountZAR = activeBaskets.reduce(
    (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity * parseFloat(i.sku?.casePriceZAR || 0), 0),
    0
  );

  await notifySmartMatchTierIfCrossed(pool, currentCases, currentAmountZAR);

  if (currentCases < pool.moqTarget) {
    return { matched: false, currentCases };
  }

  // MOQ reached. The whole claim-through-payments sequence runs in one
  // transaction: the OPEN -> MATCHED update only succeeds for one concurrent
  // caller, and if anything after that fails the status flip rolls back too.
  const matchResult = await prisma.$transaction(async (tx) => {
    const claim = await tx.bulkPool.updateMany({
      where: { id: pool.id, status: 'OPEN' },
      data: { status: 'MATCHED' },
    });
    if (claim.count === 0) {
      const existing = await tx.bulkPool.findUnique({
        where: { id: pool.id },
        include: { orderDocument: true },
      });
      if (!existing) throw new Error('Pool not found');
      return {
        matched: existing.status === 'MATCHED',
        currentCases,
        documentId: existing.orderDocument?.id,
        groupCode: existing.orderDocument?.groupCode,
      };
    }

    // Re-read baskets inside this transaction so a just-committed member is
    // not omitted from the order document.
    const currentPool = await tx.bulkPool.findUnique({
      where: { id: pool.id },
      include: { baskets: { include: { items: { include: { sku: true } } } }, partner: true },
    });
    if (!currentPool) throw new Error('Pool not found while matching');
    const currentActiveBaskets = currentPool.baskets.filter((b) => b.status !== 'CANCELLED');
    const lockedCurrentCases = currentActiveBaskets.reduce(
      (sum, basket) => sum + basket.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
      0
    );
    if (lockedCurrentCases < currentPool.moqTarget) {
      await tx.bulkPool.update({ where: { id: pool.id }, data: { status: 'OPEN' } });
      return { matched: false, currentCases: lockedCurrentCases };
    }

    const lineItemsBySku = {};
    for (const basket of currentActiveBaskets) {
      for (const item of basket.items) {
        const key = item.skuId;
        if (!lineItemsBySku[key]) lineItemsBySku[key] = { quantity: 0, memberContributions: [] };
        lineItemsBySku[key].quantity += item.quantity;
        lineItemsBySku[key].memberContributions.push({ userId: basket.userId, quantity: item.quantity });
      }
    }

    const skus = await tx.sku.findMany({ where: { id: { in: Object.keys(lineItemsBySku) } } });
    const skuMap = Object.fromEntries(skus.map(s => [s.id, s]));

    const totalAmountZAR = Object.entries(lineItemsBySku).reduce(
      (sum, [skuId, data]) => sum + (data.quantity * parseFloat(skuMap[skuId].casePriceZAR || 0)),
      0
    );

    const document = await tx.orderConfirmationDocument.create({
      data: {
        poolId: pool.id,
        groupCode: await generateGroupCode(tx),
        totalAmountZAR,
        // Collection points default to a location near a police station.
        deliveryLocation: `Near the police station closest to ${currentPool.area} — exact location to be confirmed`,
        status: 'PENDING_MEMBER_CONFIRMATION',
      },
    });

    for (const basket of currentActiveBaskets) {
      const orderReference = await generateOrderReference(tx);
      let memberAmountZAR = 0;
      for (const item of basket.items) {
        const sku = skuMap[item.skuId];
        memberAmountZAR += item.quantity * parseFloat(sku.casePriceZAR || 0);
        await tx.orderLineConfirmation.create({
          data: {
            documentId: document.id,
            memberId: basket.userId,
            orderReference,
            itemDescription: `${sku.name} (${sku.bottleFormat})`,
            quantity: item.quantity,
            unitType: 'CASE',
          },
        });
      }
      await tx.basket.update({ where: { id: basket.id }, data: { status: 'MATCHED', orderReference } });

      // A stokvel-funded basket becomes an approval request, not a manual
      // bank-transfer instruction to the member.
      if (basket.fundingSource === 'STOKVEL') {
        if (!basket.fundingStokvelId) throw new Error('Stokvel-funded basket has no selected stokvel');
        const stokvel = await tx.stokvel.findUnique({
          where: { id: basket.fundingStokvelId },
          include: { officials: { select: { userId: true } } },
        });
        if (!stokvel) throw new Error('Stokvel funding source no longer exists');
        const fundingRequest = await tx.stokvelPoolFunding.create({
          data: {
            stokvelId: stokvel.id,
            poolId: pool.id,
            basketId: basket.id,
            requestedById: basket.userId,
            amountZAR: memberAmountZAR,
            purpose: `SmartMatch order for pool ${pool.id}`,
            requiredApprovals: Math.max(2, stokvel.requiredApprovals || 2),
            status: 'PENDING_APPROVAL',
          },
        });
        await tx.poolPayment.create({
          data: {
            poolId: pool.id,
            userId: basket.userId,
            provider: 'STOKVEL_FUNDS',
            stokvelId: stokvel.id,
            fundingRequestId: fundingRequest.id,
            amountZAR: memberAmountZAR,
            status: 'PENDING_APPROVAL',
            paymentReference: orderReference,
          },
        });
        const officialsToNotify = stokvel.officials.map((official) => ({
          userId: official.userId,
          type: 'STOKVEL_POOL_FUNDING_APPROVAL_NEEDED',
          message: `A SmartMatch pool order needs your approval from stokvel ${stokvel.name}.`,
          linkScreen: 'stokvels',
        }));
        if (officialsToNotify.length) await tx.notification.createMany({ data: officialsToNotify });
      } else {
        // Personal funding retains the established manual-EFT workflow.
        await tx.poolPayment.create({
          data: {
            poolId: pool.id,
            userId: basket.userId,
            provider: 'MANUAL_EFT',
            amountZAR: memberAmountZAR,
            status: 'PENDING',
            paymentReference: orderReference,
          },
        });
      }
    }

    return { matched: true, currentCases: lockedCurrentCases, documentId: document.id, groupCode: document.groupCode };
  });

  return matchResult;
}
