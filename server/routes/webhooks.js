import express from 'express';
import { handlePayFastWebhook } from '../services/paymentService.js';
import { notifyAdminOfPaymentWebhookFailure } from '../services/notificationService.js';

const router = express.Router();

// These are the exact messages PayFastAdapter.verifyWebhook / paymentService
// throw for a request that never passed verification — a forged payload, a
// stray bot hit, or PayFast's own harmless retry of an event already
// processed. This public endpoint gets hit by all three constantly, so
// alerting on every one would bury the failures that actually matter: a
// genuinely-from-PayFast notification that still failed to process.
const UNVERIFIED_WEBHOOK_PATTERNS = [
  /missing signature/,
  /signature mismatch/,
  /failed server-side validation/,
  /is not configured/,
];

// PayFast POSTs application/x-www-form-urlencoded — captured as raw text
// (not run through the app's global express.json(), which only parses
// application/json and leaves this body untouched) so signature
// verification operates on the exact bytes PayFast signed, not a
// re-encoded reconstruction that could disagree with theirs.
router.post('/payfast', express.text({ type: '*/*' }), async (req, res) => {
  try {
    await handlePayFastWebhook(req.body);
    // PayFast requires a 200 response or it keeps retrying this same ITN.
    res.status(200).send('OK');
  } catch (error) {
    console.error('PayFast webhook error:', error.message);
    // A verified-but-failed-to-process notification means PayFast may
    // believe this payment settled while our own records don't show it —
    // that's worth an email, not just a log line someone has to go looking
    // for. Not awaited: a slow or broken email send must never delay the
    // response PayFast is waiting on for its own retry timing.
    if (!UNVERIFIED_WEBHOOK_PATTERNS.some((pattern) => pattern.test(error.message))) {
      const paymentId = new URLSearchParams(req.body).get('m_payment_id');
      notifyAdminOfPaymentWebhookFailure(paymentId, error.message);
    }
    // A non-200 here is deliberate: PayFast's own retry policy is the
    // recovery path for a transient failure (a DB blip, a brief outage) on
    // an otherwise-genuine notification. A forged or unverifiable one never
    // reaches the point where failing to process it costs anything real.
    res.status(500).send('ERROR');
  }
});

export default router;
