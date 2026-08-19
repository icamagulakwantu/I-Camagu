import prisma from '../config/db.js';

// Honest simplification, noted here for future reference: MOQ matching here
// is by TOTAL CASE COUNT in the pool, not per-SKU. A true per-SKU MOQ engine
// (matching Section 4.2 fully) needs Partner-level per-SKU MOQ data, which
// doesn't exist in the schema yet — this is a deliberate v1 simplification.

function generateGroupCode() {
  return 'GRP-' + Math.random().toString(36).slice(2, 8).toUpperCase();
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
  });
  if (!pool) {
    pool = await prisma.bulkPool.create({
      data: { partnerId, area: partner.area, moqTarget: partner.moq || 50, status: 'OPEN' },
    });
  }

  await prisma.basket.update({
    where: { id: basketId },
    data: { status: 'PARKED', poolId: pool.id },
  });

  const result = await checkAndMatchPool(pool.id);
  return { pool, matched: result.matched, currentCases: result.currentCases, moqTarget: pool.moqTarget };
}

export async function checkAndMatchPool(poolId) {
  const pool = await prisma.bulkPool.findUnique({
    where: { id: poolId },
    include: { baskets: { include: { items: true } }, partner: true },
  });

  const currentCases = pool.baskets.reduce(
    (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  if (currentCases < pool.moqTarget) {
    return { matched: false, currentCases };
  }

  // MOQ reached — generate the Order Confirmation Document
  const lineItemsBySku = {};
  for (const basket of pool.baskets) {
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
    (sum, [skuId, data]) => sum + (data.quantity * parseFloat(skuMap[skuId].casePriceZAR)),
    0
  );

  const document = await prisma.orderConfirmationDocument.create({
    data: {
      poolId: pool.id,
      groupCode: generateGroupCode(),
      totalAmountZAR,
      // Default safety measure per Section 4.2: collection points default to
      // a location near a police station, mirroring real-world SAB delivery practice.
      deliveryLocation: `Near [police station closest to] ${pool.area} — to be confirmed`,
      status: 'PENDING_MEMBER_CONFIRMATION',
    },
  });

  for (const basket of pool.baskets) {
    for (const item of basket.items) {
      const sku = skuMap[item.skuId];
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
  }

  await prisma.bulkPool.update({ where: { id: pool.id }, data: { status: 'MATCHED' } });

  return { matched: true, currentCases, documentId: document.id, groupCode: document.groupCode };
}
