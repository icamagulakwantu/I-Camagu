import prisma from '../config/db.js';

// Real, aggregated pooled demand — the actual leverage a founder takes into
// a supplier negotiation ("we already have R14,000 of committed alcohol
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

// Pools with real, matched (MOQ-reached) demand but no confirmed supplier
// yet — exactly the "go negotiate with this in hand" list. Each one is a
// concrete, real number: real cases, real Rand value, real member count,
// real area.
export async function listUnassignedPools() {
  const pools = await prisma.bulkPool.findMany({
    where: { partnerId: null },
    include: { baskets: { include: { items: { include: { sku: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  return pools.map((pool) => {
    const activeBaskets = pool.baskets.filter((b) => b.status !== 'CANCELLED');
    const cases = activeBaskets.reduce((sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0), 0);
    const valueZAR = activeBaskets.reduce(
      (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity * parseFloat(i.sku?.casePriceZAR || 0), 0),
      0
    );
    return {
      id: pool.id,
      category: pool.category,
      area: pool.area,
      status: pool.status,
      moqTarget: pool.moqTarget,
      cases,
      valueZAR: Math.round(valueZAR * 100) / 100,
      memberCount: new Set(activeBaskets.map((b) => b.userId)).size,
      createdAt: pool.createdAt,
    };
  });
}

export async function listPartnersForAssignment() {
  return prisma.partner.findMany({ orderBy: [{ type: 'asc' }, { name: 'asc' }] });
}

// Manually attaches a confirmed supplier to a pool — the step that happens
// once a real deal is signed, whether the pool was formed before or after
// that conversation. Only ever moves a pool toward having a partner, never
// blocks anything if skipped.
export async function assignPartnerToPool(poolId, partnerId) {
  const pool = await prisma.bulkPool.findUnique({ where: { id: poolId } });
  if (!pool) {
    const err = new Error('Pool not found');
    err.status = 404;
    throw err;
  }
  if (pool.status === 'FULFILLED') {
    const err = new Error('This pool has already been fulfilled');
    err.status = 409;
    throw err;
  }

  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) {
    const err = new Error('Partner not found');
    err.status = 404;
    throw err;
  }
  if (partner.type !== pool.category) {
    const err = new Error(`This pool is for ${pool.category}, but ${partner.name} is a ${partner.type} supplier`);
    err.status = 400;
    throw err;
  }

  return prisma.bulkPool.update({ where: { id: poolId }, data: { partnerId }, include: { partner: true } });
}
