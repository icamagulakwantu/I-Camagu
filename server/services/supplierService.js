import prisma from '../config/db.js';

const VALID_TYPES = ['TAVERN', 'BUTCHERY', 'GROCERY', 'PRODUCE'];

export async function registerAsSupplier(userId, { name, type, area, moq, latitude, longitude }) {
  if (!name || !name.trim()) {
    const err = new Error('Business name is required');
    err.status = 400;
    throw err;
  }
  if (!VALID_TYPES.includes(type)) {
    const err = new Error(`Type must be one of: ${VALID_TYPES.join(', ')}`);
    err.status = 400;
    throw err;
  }
  if (!area || !area.trim()) {
    const err = new Error('Area is required');
    err.status = 400;
    throw err;
  }
  let parsedMoq = null;
  if (moq !== undefined && moq !== null && moq !== '') {
    parsedMoq = parseInt(moq, 10);
    if (isNaN(parsedMoq) || parsedMoq < 0) {
      const err = new Error('Minimum order quantity must be a positive number');
      err.status = 400;
      throw err;
    }
  }

  try {
    return await prisma.partner.create({
      data: {
        userId,
        name: name.trim(),
        type,
        area: area.trim(),
        moq: parsedMoq,
        latitude: latitude != null ? latitude : null,
        longitude: longitude != null ? longitude : null,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      const err = new Error('You already have a supplier profile');
      err.status = 409;
      throw err;
    }
    throw error;
  }
}

export async function getSupplierProfile(userId) {
  return prisma.partner.findUnique({ where: { userId } });
}

export async function confirmPoolPayment(userId, paymentId) {
  const payment = await prisma.poolPayment.findUnique({
    where: { id: paymentId },
    include: { pool: { include: { partner: true } } },
  });
  if (!payment) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }
  if (payment.pool.partner?.userId !== userId) {
    const err = new Error('Not your pool');
    err.status = 403;
    throw err;
  }
  if (payment.status !== 'PENDING') {
    const err = new Error(`Payment is already ${payment.status}`);
    err.status = 409;
    throw err;
  }

  return prisma.poolPayment.update({
    where: { id: paymentId },
    data: { status: 'CLEARED' },
  });
}

/**
 * Supplier processes a member's refund request — money already moved
 * outside the app (manual EFT), so this just records that it's been paid
 * back, optionally minus a processing fee.
 */
export async function processRefund(userId, paymentId, feeZAR) {
  const payment = await prisma.poolPayment.findUnique({
    where: { id: paymentId },
    include: { pool: { include: { partner: true } }, user: true },
  });
  if (!payment) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }
  if (payment.pool.partner?.userId !== userId) {
    const err = new Error('Not your pool');
    err.status = 403;
    throw err;
  }
  if (!payment.refundRequestedAt) {
    const err = new Error('No refund has been requested for this payment');
    err.status = 409;
    throw err;
  }
  if (payment.status === 'REFUNDED') {
    const err = new Error('This payment has already been refunded');
    err.status = 409;
    throw err;
  }

  let parsedFee = 0;
  if (feeZAR !== undefined && feeZAR !== null && feeZAR !== '') {
    parsedFee = parseFloat(feeZAR);
    if (isNaN(parsedFee) || parsedFee < 0) {
      const err = new Error('Refund fee must be a positive number');
      err.status = 400;
      throw err;
    }
  }

  const updated = await prisma.poolPayment.update({
    where: { id: paymentId },
    data: { status: 'REFUNDED', refundFeeZAR: parsedFee },
  });

  const { createNotification } = await import('./notificationDbService.js');
  await createNotification(
    payment.userId,
    'REFUND_PROCESSED',
    `Your refund of R${parseFloat(payment.amountZAR).toFixed(2)} has been processed by ${payment.pool.partner.name}.`,
    'myorders'
  );

  return updated;
}

/**
 * Supplier marks a matched pool's order as fulfilled (collected/delivered).
 * Requires every non-cancelled member basket's payment to be settled first
 * (cleared or refunded) — an order shouldn't close out with money still owed.
 */
export async function markPoolFulfilled(userId, poolId) {
  const pool = await prisma.bulkPool.findUnique({
    where: { id: poolId },
    include: { partner: true, payments: true, baskets: true, orderDocument: true },
  });
  if (!pool) {
    const err = new Error('Pool not found');
    err.status = 404;
    throw err;
  }
  if (pool.partner?.userId !== userId) {
    const err = new Error('Not your pool');
    err.status = 403;
    throw err;
  }
  if (pool.status !== 'MATCHED') {
    const err = new Error(`Only a matched pool can be marked fulfilled (this one is ${pool.status})`);
    err.status = 409;
    throw err;
  }
  const unsettled = pool.payments.some((p) => p.status !== 'CLEARED' && p.status !== 'REFUNDED');
  if (unsettled) {
    const err = new Error('All member payments must be cleared or refunded before marking the order fulfilled');
    err.status = 409;
    throw err;
  }

  // A refunded member isn't taking their portion of the order — exclude
  // their basket from "fulfilled" the same as a cancelled one.
  const refundedUserIds = new Set(pool.payments.filter((p) => p.status === 'REFUNDED').map((p) => p.userId));
  const activeBaskets = pool.baskets.filter((b) => b.status !== 'CANCELLED' && !refundedUserIds.has(b.userId));

  await prisma.$transaction([
    prisma.bulkPool.update({ where: { id: pool.id }, data: { status: 'FULFILLED' } }),
    ...(pool.orderDocument
      ? [prisma.orderConfirmationDocument.update({ where: { id: pool.orderDocument.id }, data: { status: 'FULFILLED' } })]
      : []),
    prisma.basket.updateMany({
      where: { id: { in: activeBaskets.map((b) => b.id) } },
      data: { status: 'FULFILLED' },
    }),
  ]);

  const { createNotification } = await import('./notificationDbService.js');
  for (const basket of activeBaskets) {
    await createNotification(
      basket.userId,
      'ORDER_FULFILLED',
      `Your bulk order from ${pool.partner.name} has been marked as fulfilled.`,
      'myorders'
    );
  }

  return { fulfilled: true, memberCount: activeBaskets.length };
}

export async function getSupplierPools(userId) {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner) {
    const err = new Error('No supplier profile found');
    err.status = 404;
    throw err;
  }

  const pools = await prisma.bulkPool.findMany({
    where: { partnerId: partner.id },
    include: {
      baskets: { include: { items: true } },
      payments: { include: { user: { select: { firstName: true, lastName: true } } } },
      orderDocument: { include: { lineItems: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return pools.map((pool) => {
    const currentCases = pool.baskets.reduce(
      (sum, b) => sum + b.items.reduce((s, i) => s + i.quantity, 0),
      0
    );
    const clearedZAR = pool.payments
      .filter((p) => p.status === 'CLEARED')
      .reduce((sum, p) => sum + parseFloat(p.amountZAR), 0);
    const pendingZAR = pool.payments
      .filter((p) => p.status === 'PENDING')
      .reduce((sum, p) => sum + parseFloat(p.amountZAR), 0);

    const confirmed = pool.orderDocument?.lineItems.filter((l) => l.confirmedAt).length || 0;
    const totalLines = pool.orderDocument?.lineItems.length || 0;

    return {
      id: pool.id,
      area: pool.area,
      status: pool.status,
      deadline: pool.deadline,
      capCases: pool.capCases,
      moqTarget: pool.moqTarget,
      currentCases,
      participantCount: pool.baskets.length,
      clearedZAR,
      pendingZAR,
      payments: pool.payments.map((p) => ({
        id: p.id,
        memberName: `${p.user.firstName} ${p.user.lastName}`,
        amountZAR: p.amountZAR,
        status: p.status,
        providerReference: p.providerReference,
        refundRequestedAt: p.refundRequestedAt,
      })),
      canFulfill: pool.status === 'MATCHED' && pool.payments.every((p) => p.status === 'CLEARED' || p.status === 'REFUNDED'),
      orderDocument: pool.orderDocument
        ? {
            groupCode: pool.orderDocument.groupCode,
            totalAmountZAR: pool.orderDocument.totalAmountZAR,
            deliveryLocation: pool.orderDocument.deliveryLocation,
            deliveryDate: pool.orderDocument.deliveryDate,
            status: pool.orderDocument.status,
            confirmed,
            totalLines,
          }
        : null,
    };
  });
}
