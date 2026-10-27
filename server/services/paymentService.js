// server/services/paymentService.js
// iCamagu — Online payment orchestration for PoolPayment (SmartMatch bulk
// order payments). Sits above the PSP adapter (PayFastAdapter today) the
// same way matchmakerService sits above the pool-matching logic: callers
// (paymentController, the webhook route) deal in PoolPayment rows and never
// touch PayFast's field names directly.
//
// 2026 NO-CUSTODY RELEASE GATE: online checkout is deliberately disabled.
// A configured PayFast merchant account would collect money into iCamagu's
// account rather than directly into the supplier's account. Environment vars
// must never be enough to activate a real-money path. Re-enable only in a
// reviewed future change after the founder's 2027+ legal, banking, provider,
// settlement and compliance gates have all been met. Manual/direct payment
// recording remains available and does not move money through iCamagu.
// Culture before capital. 🌾

import prisma from '../config/db.js';
import { PayFastAdapter } from '../adapters/PayFastAdapter.js';

function getAdapter() {
  const { PAYFAST_MERCHANT_ID, PAYFAST_MERCHANT_KEY, PAYFAST_PASSPHRASE, PAYFAST_SANDBOX } = process.env;
  if (!PAYFAST_MERCHANT_ID || !PAYFAST_MERCHANT_KEY) return null;
  return new PayFastAdapter({
    merchantId: PAYFAST_MERCHANT_ID,
    merchantKey: PAYFAST_MERCHANT_KEY,
    passphrase: PAYFAST_PASSPHRASE,
    // Defaults to sandbox unless explicitly turned off — a missing/typo'd
    // env var should never accidentally point at PayFast's live endpoint.
    sandbox: PAYFAST_SANDBOX !== 'false',
  });
}

// This is a policy gate, not a credential check. Keep false until a separately
// reviewed future release explicitly changes the no-custody policy.
export function isOnlinePaymentConfigured() {
  return false;
}

// Alcohol sales carry real liquor-licensing exposure that manual EFT never
// did: a member paying a tavern/liquor supplier directly means iCamagu
// never touches the money, so it's clearly just a matching platform, not a
// party to the sale. PayFast collecting into iCamagu's OWN account instead
// puts iCamagu in the payment chain for the alcohol itself — which a
// regulator could read as iCamagu conducting the sale without holding its
// own liquor license, and could just as easily jeopardize the supplier's
// license too (most have conditions about who the licensee may transact
// through). So: never offered for TAVERN pools, full stop, until that's
// been resolved with real legal advice. Non-alcohol categories carry none
// of that exposure.
const ALCOHOL_CATEGORY = 'TAVERN';

export function isOnlinePaymentEligible(category) {
  return isOnlinePaymentConfigured() && category !== ALCOHOL_CATEGORY;
}

export async function initiatePoolPayment(userId, paymentId, baseUrl) {
  // Enforce the no-custody policy server-side before reading or changing any
  // payment row. Hiding the frontend button is not a security boundary.
  if (!isOnlinePaymentConfigured()) {
    const err = new Error('Online checkout is disabled under iCamagu’s current no-custody policy. Pay the supplier or intended recipient directly and record the reference here.');
    err.status = 503;
    throw err;
  }

  const adapter = getAdapter();
  if (!adapter) {
    const err = new Error('Online payment is not set up yet — pay by manual EFT instead.');
    err.status = 503;
    throw err;
  }

  const payment = await prisma.poolPayment.findUnique({
    where: { id: paymentId },
    include: { pool: { include: { partner: true } }, user: true },
  });
  if (!payment || payment.userId !== userId) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }
  if (payment.pool.category === ALCOHOL_CATEGORY) {
    const err = new Error('Online payment isn\'t available for alcohol orders — please pay the supplier directly via manual EFT.');
    err.status = 403;
    throw err;
  }
  if (payment.status !== 'PENDING') {
    const err = new Error(`Payment is already ${payment.status}`);
    err.status = 409;
    throw err;
  }

  const { redirectUrl } = adapter.createPaymentSession(payment, {
    returnUrl: `${baseUrl}/store/orders?payment=success`,
    cancelUrl: `${baseUrl}/store/orders?payment=cancelled`,
    notifyUrl: `${baseUrl}/api/webhooks/payfast`,
    itemName: `iCamagu bulk order — ${payment.pool.partner?.name || payment.pool.category}`,
    buyerEmail: payment.user.email,
  });

  // Record which PSP this payment is actually going through — was
  // 'MANUAL_EFT' by default; a member choosing to pay online changes it.
  await prisma.poolPayment.update({ where: { id: paymentId }, data: { provider: 'PAYFAST' } });

  return { redirectUrl };
}

export async function handlePayFastWebhook(rawBody) {
  const adapter = getAdapter();
  if (!adapter) throw new Error('PayFast is not configured');

  // Throws (and the caller returns a 500, prompting PayFast's own retry) if
  // this isn't genuinely from PayFast — nothing below this line ever runs
  // on an unverified payload.
  await adapter.verifyWebhook(rawBody);
  const event = adapter.parseWebhookPayload(rawBody);

  if (!event.paymentId) throw new Error('PayFast ITN missing m_payment_id');

  const payment = await prisma.poolPayment.findUnique({ where: { id: event.paymentId } });
  if (!payment) throw new Error(`PayFast ITN for unknown payment ${event.paymentId}`);

  // PayFast retries ITN delivery until it gets a 200 — a payment already
  // cleared (by an earlier delivery of this same event) must not be
  // reprocessed.
  if (payment.status !== 'PENDING') return { alreadyProcessed: true };

  if (event.status === 'COMPLETE') {
    // Signature + server validation already confirm this came from PayFast;
    // this checks PayFast is reporting the amount we actually asked for —
    // a mismatch here points at a bug (or a PSP-side fee/rounding surprise)
    // worth investigating, not something to silently clear.
    const expected = parseFloat(payment.amountZAR);
    const reported = parseFloat(event.amountZAR);
    if (!isNaN(reported) && Math.abs(reported - expected) > 0.05) {
      throw new Error(
        `PayFast ITN amount mismatch for payment ${payment.id}: expected R${expected.toFixed(2)}, got R${reported.toFixed(2)}`
      );
    }

    await prisma.poolPayment.update({
      where: { id: payment.id },
      data: {
        status: 'CLEARED',
        providerReference: event.providerReference,
        rawPayload: event.raw,
        settledAt: new Date(),
      },
    });

    const { createNotification } = await import('./notificationDbService.js');
    await createNotification(
      payment.userId,
      'CONTRIBUTION_CONFIRMED',
      `Your online payment of R${expected.toFixed(2)} has been confirmed.`,
      'myorders'
    );
  } else {
    // FAILED / CANCELLED — leave PENDING so the member can retry (online or
    // by manual EFT); keep the raw payload for support/debugging either way.
    await prisma.poolPayment.update({
      where: { id: payment.id },
      data: { rawPayload: event.raw },
    });
  }

  return { status: event.status };
}

// Admin-only bookkeeping for the manual step described at the top of this
// file: a PSP-collected payment sits in iCamagu's own account until someone
// actually wires it to the supplier. Without this, that money has no
// tracked owner — an admin would have no way to tell what's already been
// forwarded from what's still sitting there.
export async function listPendingSupplierPayouts() {
  const payments = await prisma.poolPayment.findMany({
    where: { provider: { notIn: ['MANUAL_EFT', 'STOKVEL_FUNDS'] }, status: 'CLEARED', payoutForwardedAt: null },
    include: {
      pool: { include: { partner: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { settledAt: 'asc' },
  });
  return payments;
}

export async function markPayoutForwarded(paymentId, { reference, note }) {
  const payment = await prisma.poolPayment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }
  if (payment.provider === 'MANUAL_EFT') {
    const err = new Error('Manual EFT payments go straight to the supplier — there is nothing to forward');
    err.status = 400;
    throw err;
  }
  if (payment.provider === 'STOKVEL_FUNDS') {
    const err = new Error('Stokvel-funded payments are tracked in the Stokvel ledger and must never enter the PSP payout workflow');
    err.status = 400;
    throw err;
  }
  if (payment.status !== 'CLEARED') {
    const err = new Error(`Payment is ${payment.status} — only a CLEARED payment can be marked forwarded`);
    err.status = 409;
    throw err;
  }
  if (payment.payoutForwardedAt) {
    const err = new Error('This payment has already been marked forwarded');
    err.status = 409;
    throw err;
  }

  return prisma.poolPayment.update({
    where: { id: paymentId },
    data: {
      payoutForwardedAt: new Date(),
      payoutReference: reference || null,
      payoutNote: note || null,
    },
  });
}

// The refund-side mirror of the payout tracking above. A member's refund
// request on a MANUAL_EFT payment is the supplier's to process directly
// (see supplierService.processRefund) — they hold that money. A refund
// request on a PAYFAST payment is different: iCamagu holds that money, so
// the supplier has nothing to refund and nothing to click. Without this,
// a PSP refund request had no valid path to actually being resolved.
export async function listPendingSupplierRefunds() {
  return prisma.poolPayment.findMany({
    where: { provider: { notIn: ['MANUAL_EFT', 'STOKVEL_FUNDS'] }, refundRequestedAt: { not: null }, status: { not: 'REFUNDED' } },
    include: {
      pool: { include: { partner: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { refundRequestedAt: 'asc' },
  });
}

export async function markRefundProcessed(paymentId, { feeZAR, note }) {
  const payment = await prisma.poolPayment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    const err = new Error('Payment not found');
    err.status = 404;
    throw err;
  }
  if (payment.provider === 'STOKVEL_FUNDS') {
    const err = new Error('Stokvel-funded pool shares must be handled by the Stokvel officials, not the PSP refund workflow');
    err.status = 400;
    throw err;
  }
  if (payment.provider === 'MANUAL_EFT') {
    const err = new Error('Manual EFT refunds are the supplier\'s to process — see their dashboard');
    err.status = 400;
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
  if (payment.status !== 'CLEARED') {
    const err = new Error('Only a payment confirmed as received can be marked refunded');
    err.status = 409;
    throw err;
  }

  let parsedFee = 0;
  if (feeZAR !== undefined && feeZAR !== null && feeZAR !== '') {
    parsedFee = Number(feeZAR);
    if (!Number.isFinite(parsedFee) || parsedFee < 0) {
      const err = new Error('Refund fee must be a non-negative amount');
      err.status = 400;
      throw err;
    }
  }
  const paidAmount = Number(payment.amountZAR);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0 || parsedFee > paidAmount) {
    const err = new Error('Refund fee cannot exceed the amount received');
    err.status = 400;
    throw err;
  }

  // Compare-and-set prevents concurrent administrators from recording the
  // same refund twice. This records a refund only after the external refund
  // has actually been executed and the operator has its evidence/reference.
  const transition = await prisma.poolPayment.updateMany({
    where: { id: paymentId, status: 'CLEARED', refundRequestedAt: { not: null }, provider: { notIn: ['MANUAL_EFT', 'STOKVEL_FUNDS'] } },
    data: { status: 'REFUNDED', refundFeeZAR: parsedFee, refundNote: note || null },
  });
  if (transition.count !== 1) {
    const err = new Error('Payment changed while the refund was being recorded. Refresh and verify its current state.');
    err.status = 409;
    throw err;
  }
  const updated = await prisma.poolPayment.findUnique({ where: { id: paymentId } });

  const { createNotification } = await import('./notificationDbService.js');
  await createNotification(
    payment.userId,
    'REFUND_PROCESSED',
    `Your refund of R${parseFloat(payment.amountZAR).toFixed(2)} has been processed.`,
    'myorders'
  );

  return updated;
}
