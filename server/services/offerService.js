import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/db.js';
import { createNotification, notifyMany } from './notificationDbService.js';

// Merchant offers on group (SmartMatch) orders. Members never pick a merchant:
// merchants of the right kind quote a total price on a pool, and an admin
// accepts the best offer once the pool has reached its minimum (MATCHED).
// Stored in its own raw-SQL table, created idempotently at boot, because this
// project has no migration history (same posture as ensure-schema.js).

const OFFERABLE_STATUSES = ['OPEN', 'MATCHED'];

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function ensureOfferSchema() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "PoolOffer" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "poolId" TEXT NOT NULL,
      "partnerId" TEXT NOT NULL,
      "totalPriceZAR" DECIMAL(12,2) NOT NULL,
      "note" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "PoolOffer_poolId_partnerId_key" ON "PoolOffer" ("poolId", "partnerId");');
  await prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "PoolOffer_partnerId_idx" ON "PoolOffer" ("partnerId");');
  // Pools used to get a tavern attached automatically when they opened. A
  // merchant is now only attached by accepting an offer on a MATCHED pool,
  // so clear the old automatic attachments on pools that are still filling.
  await prisma.$executeRawUnsafe(`UPDATE "BulkPool" SET "partnerId" = NULL WHERE "status" = 'OPEN' AND "partnerId" IS NOT NULL;`);
}

// Real demand in one pool: cases, catalogue value, members, and what's in it
// (so a merchant knows exactly what they're quoting on).
export function summarisePool(pool) {
  const active = (pool.baskets || []).filter((basket) => basket.status !== 'CANCELLED');
  const items = new Map();
  let cases = 0;
  let valueZAR = 0;
  for (const basket of active) {
    for (const item of basket.items || []) {
      cases += item.quantity;
      valueZAR += item.quantity * Number(item.sku?.casePriceZAR || 0);
      const name = item.sku ? `${item.sku.name}${item.sku.bottleFormat ? ` (${item.sku.bottleFormat})` : ''}` : 'Item';
      items.set(name, (items.get(name) || 0) + item.quantity);
    }
  }
  return {
    id: pool.id,
    category: pool.category,
    area: pool.area,
    status: pool.status,
    moqTarget: pool.moqTarget,
    deadline: pool.deadline,
    createdAt: pool.createdAt,
    cases,
    valueZAR: Math.round(valueZAR * 100) / 100,
    memberCount: new Set(active.map((basket) => basket.userId)).size,
    items: [...items.entries()]
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity),
  };
}

// Every offer on the given pools, cheapest first, grouped by pool id.
export async function listOffersForPools(poolIds) {
  if (!poolIds.length) return {};
  const rows = await prisma.$queryRaw`
    SELECT o."id", o."poolId", o."partnerId", o."totalPriceZAR", o."note", o."status", o."updatedAt",
           p."name" AS "partnerName", p."area" AS "partnerArea",
           (p."verifiedAt" IS NOT NULL) AS "partnerVerified"
    FROM "PoolOffer" o
    JOIN "Partner" p ON p."id" = o."partnerId"
    WHERE o."poolId" IN (${Prisma.join(poolIds)})
    ORDER BY o."totalPriceZAR" ASC`;
  const byPool = {};
  for (const row of rows) {
    if (!byPool[row.poolId]) byPool[row.poolId] = [];
    byPool[row.poolId].push({ ...row, totalPriceZAR: Number(row.totalPriceZAR) });
  }
  return byPool;
}

async function requireMerchant(userId) {
  const partner = await prisma.partner.findUnique({ where: { userId } });
  if (!partner) throw httpError(404, 'No merchant profile found');
  return partner;
}

const sameArea = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// Group orders this merchant can quote on: same kind of stock, no merchant
// confirmed yet. Other merchants' prices are never shown, only a count.
export async function listOrderRequestsForMerchant(userId) {
  const partner = await requireMerchant(userId);
  const pools = await prisma.bulkPool.findMany({
    where: { category: partner.type, partnerId: null, status: { in: OFFERABLE_STATUSES } },
    include: { baskets: { include: { items: { include: { sku: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const offers = await listOffersForPools(pools.map((pool) => pool.id));

  return pools
    .map((pool) => {
      const poolOffers = offers[pool.id] || [];
      const mine = poolOffers.find((offer) => offer.partnerId === partner.id) || null;
      return {
        ...summarisePool(pool),
        nearYou: sameArea(pool.area, partner.area),
        offerCount: poolOffers.filter((offer) => offer.status === 'PENDING').length,
        myOffer: mine ? { totalPriceZAR: mine.totalPriceZAR, note: mine.note, status: mine.status } : null,
      };
    })
    .filter((pool) => pool.cases > 0)
    .sort((a, b) => Number(b.nearYou) - Number(a.nearYou)
      || Number(b.status === 'MATCHED') - Number(a.status === 'MATCHED')
      || b.cases - a.cases);
}

// One offer per merchant per pool; sending again updates it (until accepted).
export const NOT_VERIFIED_MESSAGE = 'Your merchant profile is waiting for iCamagu to verify it. You can send offers once it is verified.';

export async function submitOffer(userId, poolId, { totalPriceZAR, note } = {}) {
  const partner = await requireMerchant(userId);
  if (!partner.verifiedAt) throw httpError(403, NOT_VERIFIED_MESSAGE);
  const price = Number(totalPriceZAR);
  if (!Number.isFinite(price) || price <= 0) throw httpError(400, 'Enter your total price for the whole order (more than R0)');

  const pool = await prisma.bulkPool.findUnique({ where: { id: poolId } });
  if (!pool) throw httpError(404, 'Group order not found');
  if (pool.category !== partner.type) throw httpError(400, 'This group order is for a different kind of merchant');
  if (pool.partnerId || !OFFERABLE_STATUSES.includes(pool.status)) throw httpError(409, 'This group order is no longer taking offers');

  const cleanNote = note ? String(note).trim().slice(0, 500) || null : null;
  const rows = await prisma.$queryRaw`
    INSERT INTO "PoolOffer" ("id", "poolId", "partnerId", "totalPriceZAR", "note", "status", "createdAt", "updatedAt")
    VALUES (${randomUUID()}, ${poolId}, ${partner.id}, ${price}::numeric(12,2), ${cleanNote}, 'PENDING', NOW(), NOW())
    ON CONFLICT ("poolId", "partnerId") DO UPDATE
      SET "totalPriceZAR" = EXCLUDED."totalPriceZAR", "note" = EXCLUDED."note", "status" = 'PENDING', "updatedAt" = NOW()
      WHERE "PoolOffer"."status" <> 'ACCEPTED'
    RETURNING "id"`;
  if (!rows.length) throw httpError(409, 'Your offer was already accepted and can no longer be changed');
  return { id: rows[0].id, totalPriceZAR: price, note: cleanNote, status: 'PENDING' };
}

// Admin accepts one offer: that merchant is attached to the pool, every other
// pending offer on it is declined, and members are told to pay their share.
export async function acceptOffer(offerId) {
  const result = await prisma.$transaction(async (tx) => {
    const [offer] = await tx.$queryRaw`
      SELECT "id", "poolId", "partnerId", "status" FROM "PoolOffer" WHERE "id" = ${offerId} FOR UPDATE`;
    if (!offer) throw httpError(404, 'Offer not found');
    if (offer.status !== 'PENDING') throw httpError(409, `This offer is already ${String(offer.status).toLowerCase()}`);

    await tx.$queryRaw`SELECT "id" FROM "BulkPool" WHERE "id" = ${offer.poolId} FOR UPDATE`;
    const pool = await tx.bulkPool.findUnique({
      where: { id: offer.poolId },
      include: { baskets: { select: { userId: true, status: true } } },
    });
    if (!pool) throw httpError(404, 'Group order not found');
    if (pool.partnerId) throw httpError(409, 'A merchant has already been confirmed for this group order');
    if (pool.status !== 'MATCHED') throw httpError(409, 'Offers can only be accepted once the group order has reached its minimum');

    const partner = await tx.partner.findUnique({ where: { id: offer.partnerId } });
    if (!partner) throw httpError(404, 'Merchant not found');
    if (!partner.verifiedAt) throw httpError(409, 'Verify this merchant before accepting their offer');

    await tx.bulkPool.update({ where: { id: pool.id }, data: { partnerId: partner.id } });
    await tx.$executeRaw`
      UPDATE "PoolOffer"
      SET "status" = CASE WHEN "id" = ${offerId} THEN 'ACCEPTED' ELSE 'DECLINED' END, "updatedAt" = NOW()
      WHERE "poolId" = ${pool.id} AND "status" = 'PENDING'`;

    const memberIds = [...new Set(pool.baskets.filter((b) => b.status !== 'CANCELLED').map((b) => b.userId))];
    return { pool, partner, memberIds };
  });

  // Notifications are best-effort: the acceptance itself has already committed.
  try {
    if (result.partner.userId) {
      await createNotification(result.partner.userId, 'POOL_OFFER_ACCEPTED', `Your offer for the group order near ${result.pool.area} was accepted.`, 'supplier');
    }
    if (result.memberIds.length) {
      await notifyMany(result.memberIds, 'ORDER_MATCHED', `${result.partner.name} has been confirmed for your group order near ${result.pool.area}. Pay your share from My Orders.`, 'myorders');
    }
  } catch (error) {
    console.error('Offer accepted, but notifications failed:', error?.message);
  }

  return { poolId: result.pool.id, partnerName: result.partner.name };
}

// ---------- Merchant verification (admin) ----------

// Every merchant, those waiting for verification first. Bank details are
// reported as present or missing, never their values.
export async function listMerchantsForAdmin() {
  const partners = await prisma.partner.findMany({
    include: { user: { select: { firstName: true, lastName: true, email: true, phoneNumber: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return partners
    .map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      area: p.area,
      createdAt: p.createdAt,
      contactName: p.user ? `${p.user.firstName || ''} ${p.user.lastName || ''}`.trim() : null,
      contactEmail: p.user?.email || null,
      contactPhone: p.user?.phoneNumber || null,
      hasBankDetails: Boolean(p.bankName && p.bankAccountNumber),
      verifiedAt: p.verifiedAt,
      verificationNote: p.verificationNote,
    }))
    .sort((a, b) => Number(Boolean(a.verifiedAt)) - Number(Boolean(b.verifiedAt)));
}

// Verifying needs a note of what was checked; revoking clears it and stops
// new offers. Offers already accepted are not undone.
export async function setMerchantVerification(partnerId, adminId, { verified, note } = {}) {
  const partner = await prisma.partner.findUnique({ where: { id: partnerId } });
  if (!partner) throw httpError(404, 'Merchant not found');
  const cleanNote = String(note || '').trim().slice(0, 500);
  if (verified && !cleanNote) throw httpError(400, 'Write down what you checked, e.g. company registration, bank letter, phone call');
  const updated = await prisma.partner.update({
    where: { id: partnerId },
    data: verified
      ? { verifiedAt: new Date(), verifiedById: adminId, verificationNote: cleanNote }
      : { verifiedAt: null, verifiedById: adminId, verificationNote: cleanNote || null },
  });
  if (partner.userId) {
    try {
      await createNotification(
        partner.userId,
        verified ? 'MERCHANT_VERIFIED' : 'MERCHANT_UNVERIFIED',
        verified
          ? `${partner.name} is verified. You can now send offers on group orders.`
          : `${partner.name} is no longer verified, so you cannot send new offers. Contact iCamagu for help.`,
        'supplier',
      );
    } catch (error) {
      console.error('Merchant verification saved, but the notification failed:', error?.message);
    }
  }
  return { id: updated.id, verifiedAt: updated.verifiedAt, verificationNote: updated.verificationNote };
}
