// server/services/paymentService.js
// iCamagu — Online payment orchestration for PoolPayment (SmartMatch bulk
// order payments). Sits above the PSP adapter (PayFastAdapter today) the
// same way matchmakerService sits above the pool-matching logic: callers
// (paymentController, the webhook route) deal in PoolPayment rows and never
// touch PayFast's field names directly.
//
// This does NOT replace manual EFT — a member can still pay a supplier
// directly and enter a reference (see poolController.submitPoolPaymentReference).
// This adds a second, faster path: pay online, PayFast confirms instantly via
// webhook. Money still lands in iCamagu's own PayFast merchant account, not
// the supplier's — getting it from there to the supplier is a manual step
// this does not yet automate (same "no live bank API yet" posture as
// ManualEFTAdapter). That's a real business decision to revisit before this
// ever runs with PAYFAST_SANDBOX=false.
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

export function isOnlinePaymentConfigured() {
  return getAdapter() !== null;
}

export async function initiatePoolPayment(userId, paymentId, baseUrl) {
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
