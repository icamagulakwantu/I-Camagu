import express from 'express';
import { handlePayFastWebhook } from '../services/paymentService.js';

const router = express.Router();

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
    // A non-200 here is deliberate: PayFast's own retry policy is the
    // recovery path for a transient failure (a DB blip, a brief outage) on
    // an otherwise-genuine notification. A forged or unverifiable one never
    // reaches the point where failing to process it costs anything real.
    res.status(500).send('ERROR');
  }
});

export default router;
