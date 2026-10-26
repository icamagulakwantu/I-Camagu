import prisma from '../config/db.js';
import { checkAndMatchPool } from './matchmakerService.js';
import { getNextTierForMetric, palletsForCases, resolveTierLadder, amountToReachTier } from '../utils/smartMatchTiers.js';

const TAVERN_CATEGORIES = new Set([
  'BEER', 'CIDER_RTD', 'BRANDY', 'WHISKY', 'VODKA', 'VODKA_PREMIUM',
  'GIN', 'TEQUILA', 'TEQUILA_PREMIUM', 'COGNAC', 'LIQUEUR', 'MIXER',
  'WINE', 'WINE_BOX', 'SPARKLING', 'CHAMPAGNE', 'SOFT_DRINKS', 'WATER',
]);
const BUTCHERY_CATEGORIES = new Set(['LIVESTOCK_ANIMAL', 'MEAT']);
const PRODUCE_CATEGORIES = new Set(['FRESH_PRODUCE']);

export function categoryForSku(sku) {
  if (TAVERN_CATEGORIES.has(sku.category)) return 'TAVERN';
  if (BUTCHERY_CATEGORIES.has(sku.category)) return 'BUTCHERY';
  if (PRODUCE_CATEGORIES.has(sku.category)) return 'PRODUCE';
  return 'GROCERY';
}

function normalise(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/^(?:ama|aba|abe|oo|o|abakwa|akwa)\s*/i, '')
    .replace(/[^a-z0-9]/g, '');
}

function haversineKm(aLat, aLon, bLat, bLon) {
  const toRad = (value) => value * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const value = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function ancestralLines(user) {
  return [
    { key: 'paternalIziduko', weight: 4 },
    { key: 'maternalIziduko', weight: 3 },
    { key: 'paternalGrandmotherIziduko', weight: 2 },
    { key: 'maternalGrandmotherIziduko', weight: 1 },
  ].filter((line) => normalise(user[line.key])).map((line) => ({
    ...line,
    value: normalise(user[line.key]),
  }));
}

function clanScore(user, pool) {
  const lines = ancestralLines(user);
  if (!lines.length) return { score: 0, sharedLines: [] };
  const sharedLines = new Set();
  for (const basket of pool.baskets || []) {
    const participant = basket.user;
    if (!participant) continue;
    const otherValues = ancestralLines(participant).map((line) => line.value);
    for (const line of lines) {
      if (otherValues.includes(line.value)) sharedLines.add(line.key);
    }
  }
  const weights = { paternalIziduko: 4, maternalIziduko: 3, paternalGrandmotherIziduko: 2, maternalGrandmotherIziduko: 1 };
  return {
    score: [...sharedLines].reduce((sum, key) => sum + weights[key], 0),
    sharedLines: [...sharedLines],
  };
}

function locationDistance(user, pool) {
  if (Number.isFinite(user.latitude) && Number.isFinite(user.longitude)
    && Number.isFinite(pool.latitude) && Number.isFinite(pool.longitude)) {
    return haversineKm(user.latitude, user.longitude, pool.latitude, pool.longitude);
  }
  return normalise(user.location) && normalise(user.location) === normalise(pool.area) ? 0 : null;
}

function poolMetrics(pool) {
  const baskets = (pool.baskets || []).filter((basket) => basket.status !== 'CANCELLED');
  const cases = baskets.reduce((sum, basket) => sum + (basket.items || []).reduce((n, item) => n + item.quantity, 0), 0);
  const amountZAR = baskets.reduce((sum, basket) => sum + (basket.items || []).reduce(
    (n, item) => n + item.quantity * Number(item.sku?.casePriceZAR || 0), 0), 0);
  const metric = pool.tierBasis === 'AMOUNT' ? amountZAR : palletsForCases(cases);
  const ladder = resolveTierLadder(pool);
  const nextTier = getNextTierForMetric(metric, ladder);
  return {
    currentCases: cases,
    currentAmountZAR: amountZAR,
    metric,
    tierBasis: pool.tierBasis || 'PALLETS',
    nextTier: nextTier ? {
      id: nextTier.id,
      name: nextTier.name,
      minimum: nextTier.min,
      remaining: amountToReachTier(metric, nextTier),
      unit: (pool.tierBasis || 'PALLETS') === 'AMOUNT' ? 'ZAR' : 'pallets',
    } : null,
    tierProgress: nextTier ? Math.max(0, Math.min(100, (metric / nextTier.min) * 100)) : (ladder ? 100 : null),
  };
}

export async function findSuggestedPoolsForItem(userId, { skuId, ceremonyId, limit = 10 }) {
  if (!skuId) throw new Error('skuId is required');
  const [user, sku] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.sku.findUnique({ where: { id: skuId } }),
  ]);
  if (!user) throw new Error('User not found');
  if (!sku) throw new Error('Catalogue item not found');

  let ceremony = null;
  if (ceremonyId) {
    ceremony = await prisma.ceremony.findFirst({
      where: { id: ceremonyId, hostId: userId },
      select: { id: true, eventDate: true, title: true },
    });
    if (!ceremony) throw new Error('Ceremony not found');
  }

  const pools = await prisma.bulkPool.findMany({
    where: { category: categoryForSku(sku), status: 'OPEN' },
    include: {
      partner: true,
      baskets: {
        where: { status: { not: 'CANCELLED' } },
        include: {
          user: { select: { id: true, location: true, latitude: true, longitude: true, paternalIziduko: true, maternalIziduko: true, paternalGrandmotherIziduko: true, maternalGrandmotherIziduko: true } },
          items: { include: { sku: { select: { casePriceZAR: true } } } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const ranked = pools.map((pool) => {
    const distanceKm = locationDistance(user, pool);
    const clan = clanScore(user, pool);
    const metrics = poolMetrics(pool);
    const closesInTime = !ceremony?.eventDate || !pool.deadline || pool.deadline <= ceremony.eventDate;
    const distanceAllowed = distanceKm === null || distanceKm <= (pool.radiusKm || 20);
    return {
      id: pool.id,
      category: pool.category,
      area: pool.area,
      latitude: pool.latitude,
      longitude: pool.longitude,
      radiusKm: pool.radiusKm || 20,
      deadline: pool.deadline,
      status: pool.status,
      moqTarget: pool.moqTarget,
      partnerName: pool.partner?.name || null,
      distanceKm: distanceKm === null ? null : Math.round(distanceKm * 10) / 10,
      distanceKnown: distanceKm !== null,
      clanScore: clan.score,
      sharedClanLines: clan.sharedLines,
      participantCount: new Set(pool.baskets.map((basket) => basket.userId)).size,
      closesInTime,
      ...metrics,
    };
  }).filter((pool) => pool.closesInTime && pool.distanceAllowed)
    .sort((a, b) => b.clanScore - a.clanScore
      || (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER)
      || (a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER)
        - (b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER)
      || (b.tierProgress ?? 0) - (a.tierProgress ?? 0))
    .slice(0, Math.max(1, Math.min(Number(limit) || 10, 25)));

  return {
    sku: { id: sku.id, name: sku.name, category: sku.category, casePriceZAR: sku.casePriceZAR },
    ceremony: ceremony ? { id: ceremony.id, title: ceremony.title, eventDate: ceremony.eventDate } : null,
    pools: ranked,
  };
}

export async function joinPoolWithItem(userId, input) {
  const { poolId, skuId, quantity = 1, ceremonyId = null, checklistItemId = null, fundingSource = 'PERSONAL', stokvelId = null } = input || {};
  const amount = Number.parseInt(quantity, 10);
  if (!poolId || !skuId || !Number.isInteger(amount) || amount < 1) {
    throw new Error('poolId, skuId and a quantity of at least 1 are required');
  }
  if (!['PERSONAL', 'STOKVEL'].includes(fundingSource)) throw new Error('Invalid funding source');
  const [user, pool, sku] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, location: true, latitude: true, longitude: true } }),
    prisma.bulkPool.findUnique({ where: { id: poolId }, include: { partner: true } }),
    prisma.sku.findUnique({ where: { id: skuId } }),
  ]);
  if (!user) throw new Error('User not found');
  if (!pool || pool.status !== 'OPEN') throw new Error('This pool is no longer open');
  if (!sku || !sku.casePriceZAR) throw new Error('This catalogue item is not yet priced and cannot be ordered');
  if (categoryForSku(sku) !== pool.category) throw new Error('This pool is for a different item category');
  if (fundingSource === 'STOKVEL') {
    if (!stokvelId) throw new Error('Choose a stokvel to fund this order');
    const member = await prisma.stokvelMember.findFirst({ where: { userId, stokvelId } });
    if (!member) throw new Error('You must be a member of this stokvel');
    const ledger = await prisma.stokvelGroupLedger.findUnique({ where: { stokvelId } });
    if (!ledger || Number(ledger.totalBalance) - Number(ledger.groupExpenses) < Number(sku.casePriceZAR) * amount) {
      throw new Error('This stokvel does not have enough available funds for this item');
    }
  } else if (stokvelId) {
    throw new Error('A stokvel can only be selected when using stokvel funding');
  }
  if (ceremonyId) {
    const ceremony = await prisma.ceremony.findFirst({ where: { id: ceremonyId, hostId: userId }, select: { id: true } });
    if (!ceremony) throw new Error('Ceremony not found');
  }
  if (checklistItemId && ceremonyId) {
    const checklistItem = await prisma.ceremonyChecklistItem.findFirst({ where: { id: checklistItemId, ceremonyId }, select: { id: true } });
    if (!checklistItem) throw new Error('Checklist item does not belong to this ceremony');
  } else if (checklistItemId) {
    throw new Error('ceremonyId is required when linking a checklist item');
  }

  const basket = await prisma.basket.create({
    data: {
      userId,
      status: 'PARKED',
      poolId,
      ceremonyId,
      checklistItemId,
      fundingSource,
      fundingStokvelId: fundingSource === 'STOKVEL' ? stokvelId : null,
      stokvelId: fundingSource === 'STOKVEL' ? stokvelId : null,
      items: { create: { skuId, quantity: amount } },
    },
    include: { items: { include: { sku: true } } },
  });
  try {
    const match = await checkAndMatchPool(poolId);
    return { basket, poolId, match };
  } catch (error) {
    // Preserve the parked pledge if a later match side effect fails. The
    // existing pool-matcher transaction protects the MATCHED transition.
    throw error;
  }
}

export async function getNearbyDemandSignal(userId, skuId, radiusKm = 20) {
  if (!skuId) throw new Error('skuId is required');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { latitude: true, longitude: true, location: true } });
  if (!user) throw new Error('User not found');
  const now = new Date();
  const ceremonies = await prisma.ceremony.findMany({
    where: {
      eventDate: { gte: now },
      costItems: { some: { skuId } },
    },
    select: {
      id: true,
      eventDate: true,
      host: { select: { latitude: true, longitude: true, location: true } },
    },
    take: 250,
  });
  const nearby = ceremonies.filter((ceremony) => {
    const host = ceremony.host;
    if (Number.isFinite(user.latitude) && Number.isFinite(user.longitude)
      && Number.isFinite(host.latitude) && Number.isFinite(host.longitude)) {
      return haversineKm(user.latitude, user.longitude, host.latitude, host.longitude) <= radiusKm;
    }
    return normalise(user.location) && normalise(user.location) === normalise(host.location);
  });
  return { skuId, nearbyUpcomingCeremonies: nearby.length, radiusKm };
}
