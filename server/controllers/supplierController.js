import { registerAsSupplier, getSupplierProfile, getSupplierPools, confirmPoolPayment } from '../services/supplierService.js';

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
