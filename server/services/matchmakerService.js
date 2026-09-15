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

// Which real-world category a SKU needs — mirrors the departments in
// src/data/storeTaxonomy.js. Matches BulkPool.category / Partner.type
// exactly, so a pool's category IS the kind of partner that could
// eventually be attached to it, with no separate mapping to keep in sync.
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

// Finds (or opens) the pool for this category+area — no Partner required.
// Pool formation must never depend on a confirmed supplier existing yet
// (the founder's explicit call): members can always form and join a pool;
// which real distributor eventually fulfils it is a separate, later step.
//
// targetDate only matters when a *new* pool is being opened — it's the
// date whoever starts the pool chose (e.g. "this is for December"), not a
// fixed universal timer. Joining an already-open pool inherits whatever
// deadline (or lack of one) that pool already has; one later member can't
// silently shorten or remove the date everyone already in it is relying on.
async function findOrCreateOpenPool(category, area, targetDate) {
  let pool = await prisma.bulkPool.findFirst({
    where: { category, area, status: 'OPEN' },
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
    // Same baseline default a pool has always used when no partner-specific
    // MOQ is on file yet (see the old partner.moq || 50 fallback) — refined
    // once a real supplier quote exists for this category/area.
    const moqTarget = 50;
    pool = await prisma.bulkPool.create({
      data: {
        category,
        area,
        moqTarget,
        status: 'OPEN',
        tierBasis: tierBasisForCategory(category),
        ...newPoolWindow(moqTarget, targetDate),
      },
    });
  }

  // Best-effort: if a real, confirmed supplier for this category already
  // exists, attach it automatically — this is what shows the pool's
  // "partner store" badge and lets that supplier manage it from their own
  // dashboard. If none exists (or none yet), the pool still works fully;
  // nothing here blocks it.
  if (!pool.partnerId) {
    const partner = await pickBestPartnerForCategory(pool.area, category);
    if (partner) {
      pool = await prisma.bulkPool.update({ where: { id: pool.id }, data: { partnerId: partner.id }, include: { partner: true } });
    }
  }
  if (!pool.partner) pool.partner = pool.partnerId ? await prisma.partner.findUnique({ where: { id: pool.partnerId } }) : null;

  return pool;
}

// Picks the best-fit confirmed partner of a category for a pool in a given
// area, if one exists — used only to auto-attach a "partner store" badge to
// a pool that already exists on its own; never a gate on whether the pool
// itself can form. No manual choice for members either way: which outlet
// is right depends on facts the app has (area, who's already close to
// their bulk-pricing minimum), not something a member has a real basis to
// pick between.
//
// Real distance would be the sharper signal, but today's real partners
// carry no lat/lng at all (none has been entered yet) — scoring on it would
// just be fabricated precision. So: same declared area first, then "order
// volume" (prefer whichever partner's open pool is already furthest toward
// its MOQ, so a pool helps an existing one clear instead of starting a
// fresh wait from zero), then partner name for a stable result.
export async function pickBestPartnerForCategory(area, category) {
  const partners = await prisma.partner.findMany({
    where: { type: category },
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
    const openPool = partner.pools[0] || null;
    const currentCases = openPool
      ? openPool.baskets.filter((b) => b.status !== 'CANCELLED').reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0)
      : 0;
    const progress = openPool ? Math.min(1, currentCases / openPool.moqTarget) : 0;
    const sameArea = area && partner.area === area ? 1 : 0;

    return { partner, progress, sameArea };
  });

  scored.sort((a, b) => {
    if (b.sameArea !== a.sameArea) return b.sameArea - a.sameArea;
    if (b.progress !== a.progress) return b.progress - a.progress;
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

// A member tapped a real "join this pool" invite link (see Basket.jsx /
// inviteToSmartMatch) rather than arriving through normal category+area
// auto-matching. The pool is still returned even if it's no longer OPEN
// (its category is needed either way, to know which basket group the
// invite was for) — callers check `.status === 'OPEN'` themselves before
// treating it as joinable, so a closed/matched target degrades to "this
// category falls back to normal auto-matching" instead of silently
// losing track of what the invite was even for.
async function getInvitedPool(joinPoolId) {
  if (!joinPoolId) return null;
  return prisma.bulkPool.findUnique({ where: { id: joinPoolId }, include: { partner: true } });
}

export async function submitBasketToPool(userId, basketId, targetDate, joinPoolId) {
  const [basket, user] = await Promise.all([
    prisma.basket.findFirst({
      where: { id: basketId, userId, status: 'DRAFT' },
      include: { items: { include: { sku: true } } },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { location: true } }),
  ]);
  if (!basket) throw new Error('Basket not found or already submitted');
  if (basket.items.length === 0) throw new Error('Basket is empty');

  // Optional — "this cart is for December" instead of a fixed 72-hour
  // window. Only matters if a brand-new pool ends up getting opened; an
  // existing open pool keeps whatever deadline it already has.
  let parsedTargetDate = null;
  if (targetDate) {
    const d = new Date(targetDate);
    if (isNaN(d.getTime())) throw new Error('Target date is not a valid date');
    if (d.getTime() <= Date.now()) throw new Error('Target date must be in the future');
    parsedTargetDate = d;
  }

  // A member's own declared area is what a pool is scoped by — a partner,
  // if and when one gets attached, doesn't need to be in the same area
  // (a national wholesaler like Makro isn't "local" the way a single
  // tavern is); it's just the best-effort match for that category.
  const area = user?.location?.trim() || 'Unspecified';

  // A basket can hold both alcohol and non-alcohol items, but a pool is
  // always one category — split by what each item actually needs, and
  // submit each group to its own pool. Every group gets a pool: forming
  // and joining a pool must never depend on whether a confirmed supplier
  // exists yet for that category (the founder's explicit call) — a real
  // partner attaches automatically when one matches, or later once a deal
  // is signed, but the pool itself always works.
  const groups = new Map();
  for (const item of basket.items) {
    const category = categoryForSku(item.sku);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  }

  // Resolved once, up front, so a multi-category basket can tell "this is
  // the category the invite link was actually for" apart from "this
  // category has nothing to do with the invite" when building submissions
  // below — a joinPoolId only ever targets one category.
  const invitedPool = await getInvitedPool(joinPoolId);
  const joinPoolCategory = invitedPool?.category ?? null;

  const submissions = [];

  for (const [category, items] of groups) {
    // Each group gets its own basket row so it can be parked against its
    // own pool independently of the others.
    const groupBasket = await prisma.basket.create({ data: { userId, status: 'DRAFT' } });
    await prisma.basketItem.updateMany({
      where: { id: { in: items.map((it) => it.id) } },
      data: { basketId: groupBasket.id },
    });

    const isInvitedCategory = Boolean(joinPoolId) && category === joinPoolCategory;
    const invitedPoolStillJoinable = isInvitedCategory && invitedPool.status === 'OPEN';
    const pool = invitedPoolStillJoinable ? invitedPool : (await findOrCreateOpenPool(category, area, parsedTargetDate));
    await prisma.basket.update({ where: { id: groupBasket.id }, data: { status: 'PARKED', poolId: pool.id } });
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
      // Only defined for the category an invite link actually targeted:
      // true means they landed in the exact pool they were invited to;
      // false means that pool had already closed or matched by the time
      // they submitted, so they were matched into a fresh one in their
      // own area instead — surfaced honestly rather than silently
      // substituted. undefined for every other category in the basket,
      // since the invite never applied to those.
      joinedInvitedPool: isInvitedCategory ? invitedPoolStillJoinable : undefined,
    });
  }

  return { submissions };
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