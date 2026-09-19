import { initiatePoolPayment, isOnlinePaymentConfigured, listPendingSupplierPayouts, markPayoutForwarded, listPendingSupplierRefunds, markRefundProcessed } from '../services/paymentService.js';
import prisma from '../config/db.js';
import { isAdminEmail } from '../config/admin.js';

async function requireAdmin(req, res) {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { email: true } });
  if (!user || !isAdminEmail(user.email)) {
    res.status(403).json({ error: 'Admin access required' });
    return false;
  }
  return true;
}

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

// GET /api/basket/admin/pending-payouts — admin-only. Every PSP-collected
// payment iCamagu is still holding, awaiting a manual transfer to the
// supplier it's actually for.
export async function getPendingSupplierPayouts(req, res) {
  if (!(await requireAdmin(req, res))) return;
  try {
    res.json(await listPendingSupplierPayouts());
  } catch (error) {
    console.error('List pending supplier payouts error:', error.message);
    res.status(500).json({ error: 'Could not fetch pending payouts' });
  }
}

// POST /api/basket/admin/pending-payouts/:paymentId/forward — admin-only.
// Records that the manual bank transfer to the supplier actually happened —
// this endpoint does not move any money itself, it's a paper trail for a
// transfer done by hand outside the app.
export async function forwardSupplierPayout(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const { paymentId } = req.params;
  const { reference, note } = req.body;
  try {
    const payment = await markPayoutForwarded(paymentId, { reference, note });
    res.json({ payment, message: 'Marked as forwarded to the supplier.' });
  } catch (error) {
    console.error('Forward supplier payout error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not mark payout forwarded' });
  }
}

// GET /api/basket/admin/pending-refunds — admin-only. Every refund request
// on a PSP-collected payment — the supplier can't process these themselves
// (see supplierService.processRefund), so without this list they'd have no
// valid path to being resolved at all.
export async function getPendingSupplierRefunds(req, res) {
  if (!(await requireAdmin(req, res))) return;
  try {
    res.json(await listPendingSupplierRefunds());
  } catch (error) {
    console.error('List pending supplier refunds error:', error.message);
    res.status(500).json({ error: 'Could not fetch pending refunds' });
  }
}

// POST /api/basket/admin/pending-refunds/:paymentId/process — admin-only.
// Records that the member was actually refunded (by hand, outside the app —
// same "no live payout API yet" posture as forwardSupplierPayout above).
export async function processSupplierRefund(req, res) {
  if (!(await requireAdmin(req, res))) return;
  const { paymentId } = req.params;
  const { feeZAR, note } = req.body;
  try {
    const payment = await markRefundProcessed(paymentId, { feeZAR, note });
    res.json({ payment, message: 'Refund marked as processed.' });
  } catch (error) {
    console.error('Process supplier refund error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not process refund' });
  }
}
