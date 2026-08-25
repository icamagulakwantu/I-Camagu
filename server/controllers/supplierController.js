import { registerAsSupplier, getSupplierProfile, getSupplierPools, confirmPoolPayment, processRefund, markPoolFulfilled } from '../services/supplierService.js';

export async function becomeSupplier(req, res) {
  try {
    const partner = await registerAsSupplier(req.userId, req.body);
    res.json({ partner });
  } catch (error) {
    console.error('Register supplier error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not register as supplier' });
  }
}

export async function getMySupplierProfile(req, res) {
  try {
    const partner = await getSupplierProfile(req.userId);
    if (!partner) return res.status(404).json({ error: 'No supplier profile found' });
    res.json({ partner });
  } catch (error) {
    console.error('Get supplier profile error:', error.message);
    res.status(500).json({ error: 'Could not fetch supplier profile' });
  }
}

export async function getMySupplierPools(req, res) {
  try {
    const pools = await getSupplierPools(req.userId);
    res.json({ pools });
  } catch (error) {
    console.error('Get supplier pools error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not fetch pools' });
  }
}

export async function confirmSupplierPoolPayment(req, res) {
  const { paymentId } = req.params;
  try {
    const payment = await confirmPoolPayment(req.userId, paymentId);
    res.json({ payment, message: 'Payment marked as received' });
  } catch (error) {
    console.error('Confirm pool payment error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not confirm payment' });
  }
}

export async function processSupplierRefund(req, res) {
  const { paymentId } = req.params;
  const { feeZAR } = req.body;
  try {
    const payment = await processRefund(req.userId, paymentId, feeZAR);
    res.json({ payment, message: 'Refund marked as processed' });
  } catch (error) {
    console.error('Process refund error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not process refund' });
  }
}

export async function fulfillSupplierPool(req, res) {
  const { poolId } = req.params;
  try {
    const result = await markPoolFulfilled(req.userId, poolId);
    res.json({ ...result, message: `Order marked fulfilled for ${result.memberCount} member(s).` });
  } catch (error) {
    console.error('Fulfill pool error:', error.message);
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Could not mark order fulfilled' });
  }
}
