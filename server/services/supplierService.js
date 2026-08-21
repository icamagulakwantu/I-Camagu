import prisma from '../config/db.js';

const VALID_TYPES = ['TAVERN', 'BUTCHERY'];

export async function registerAsSupplier(userId, { name, type, area, moq, latitude, longitude }) {
  if (!name || !name.trim()) {
    const err = new Error('Business name is required');
    err.status = 400;
    throw err;
  }
  if (!VALID_TYPES.includes(type)) {
    const err = new Error('Type must be TAVERN or BUTCHERY');
    err.status = 400;
    throw err;
  }
  if (!area || !area.trim()) {
    const err = new Error('Area is required');
    err.status = 400;
    throw err;
  }

  try {
    return await prisma.partner.create({
      data: {
        userId,
        name: name.trim(),
        type,
        area: area.trim(),
        moq: moq ? parseInt(moq, 10) : null,
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
      payments: true,
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
      moqTarget: pool.moqTarget,
      currentCases,
      participantCount: pool.baskets.length,
      clearedZAR,
      pendingZAR,
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
