import { initiatePoolPayment, isOnlinePaymentConfigured } from '../services/paymentService.js';

// GET /api/basket/pool-payments/online-status — lets the frontend know
// whether to even show a "Pay online" button, instead of surfacing a 503
// only after the member taps it.
export async function getOnlinePaymentStatus(req, res) {
  res.json({ available: isOnlinePaymentConfigured() });
}

export async function initiatePoolPaymentOnline(req, res) {
  const { paymentId } = req.params;
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const { redirectUrl } = await initiatePoolPayment(req.userId, paymentId, baseUrl);
    res.json({ redirectUrl });
  } catch (error) {
    console.error('Initiate pool payment error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not start online payment' });
  }
}
