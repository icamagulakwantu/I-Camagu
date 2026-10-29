import prisma from '../config/db.js';
import { listOffersForPools, summarisePool } from './offerService.js';

// Real, aggregated pooled demand — the actual leverage a founder takes into
// a merchant conversation ("we already have R14,000 of committed drinks
// orders in Motherwell"). Every number here comes straight off real
// baskets and real SKU prices; nothing estimated or projected. Pools that
// have already been FULFILLED are excluded — that demand has already been
// served, it isn't still "pending" leverage.
export async function getDemandOverview() {
  const pools = await prisma.bulkPool.findMany({
    where: { status: { in: ['OPEN', 'MATCHED'] } },
    include: {
      partner: true,
      baskets: { include: { items: { include: { sku: true } } } },
    },
  });

  const byCategory = {};
  const memberIdsOverall = new Set();

  for (const pool of pools) {
    const activeBaskets = pool.baskets.filter((b) => b.status !== 'CANCELLED');
    const cases = activeBaskets.reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0);
    const valueZAR = activeBaskets.reduce(
      (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity * parseFloat(i.sku?.casePriceZAR || 0), 0),
      0
    );
    const memberIds = new Set(activeBaskets.map((b) => b.userId));
    memberIds.forEach((id) => memberIdsOverall.add(id));

    if (!byCategory[pool.category]) {
      byCategory[pool.category] = {
        category: pool.category,
        poolCount: 0,
        assignedPoolCount: 0,
        cases: 0,
        valueZAR: 0,
        memberIds: new Set(),
      };
    }
    const bucket = byCategory[pool.category];
    bucket.poolCount += 1;
    if (pool.partnerId) bucket.assignedPoolCount += 1;
    bucket.cases += cases;
    bucket.valueZAR += valueZAR;
    memberIds.forEach((id) => bucket.memberIds.add(id));
  }

  const categories = Object.values(byCategory).map((b) => ({
    category: b.category,
    poolCount: b.poolCount,
    unassignedPoolCount: b.poolCount - b.assignedPoolCount,
    cases: b.cases,
    valueZAR: Math.round(b.valueZAR * 100) / 100,
    memberCount: b.memberIds.size,
  }));

  return {
    totalValueZAR: Math.round(categories.reduce((sum, c) => sum + c.valueZAR, 0) * 100) / 100,
    totalMemberCount: memberIdsOverall.size,
    totalPoolCount: pools.length,
    categories,
  };
}

// Group orders with no merchant confirmed yet, each with the offers
// merchants have sent (cheapest first). The admin accepts the best one once
// the order has reached its minimum.
export async function listUnassignedPools() {
  const pools = await prisma.bulkPool.findMany({
    where: { partnerId: null, status: { in: ['OPEN', 'MATCHED'] } },
    include: { baskets: { include: { items: { include: { sku: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const offers = await listOffersForPools(pools.map((pool) => pool.id));

  return pools.map((pool) => ({
    ...summarisePool(pool),
    offers: (offers[pool.id] || []).map((offer) => ({
      id: offer.id,
      partnerName: offer.partnerName,
      partnerArea: offer.partnerArea,
      totalPriceZAR: offer.totalPriceZAR,
      note: offer.note,
      status: offer.status,
    })),
  }));
}
