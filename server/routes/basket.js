import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getCatalogue, getCategories } from '../controllers/catalogueController.js';
import { submitToPool, getMyOrderDocuments, confirmOrderLine, getMyPoolPayments, submitPoolPaymentReference, getMyPoolStatus, getPoolSummary, cancelParkedBasket, requestPoolPaymentRefund, suggestPoolsForItem, joinPoolWithChecklistItem, getPoolDemandSignal, getSmartMatchCommunityFeed, searchDeliveryAddress, reverseDeliveryAddress, getPoolsNearAddress } from '../controllers/poolController.js';
import { getMyBasket, addItem, updateItem, removeItem } from '../controllers/basketController.js';
import { getCatalogueMargins, setSkuCostPrice, setSkuRetailPrice } from '../controllers/marginController.js';
import { getOnlinePaymentStatus, initiatePoolPaymentOnline, getPendingSupplierPayouts, forwardSupplierPayout, getPendingSupplierRefunds, processSupplierRefund } from '../controllers/paymentController.js';

const router = express.Router();

router.get('/catalogue', getCatalogue);
router.get('/catalogue/categories', getCategories);

router.get('/', requireAuth, getMyBasket);
router.post('/items', requireAuth, addItem);
router.patch('/items/:itemId', requireAuth, updateItem);
router.post('/order-documents/confirm-line', requireAuth, confirmOrderLine);
router.delete('/items/:itemId', requireAuth, removeItem);

router.post('/submit-to-pool', requireAuth, submitToPool);
router.get('/address/search', requireAuth, searchDeliveryAddress);
router.get('/address/reverse', requireAuth, reverseDeliveryAddress);
router.get('/pools/near', requireAuth, getPoolsNearAddress);
router.get('/feed', requireAuth, getSmartMatchCommunityFeed);
router.get('/pool/suggestions', requireAuth, suggestPoolsForItem);
router.post('/pool/join-item', requireAuth, joinPoolWithChecklistItem);
router.get('/pool/demand', requireAuth, getPoolDemandSignal);
router.get('/pool-status/my', requireAuth, getMyPoolStatus);
router.get('/pool/:id/summary', requireAuth, getPoolSummary);
router.post('/pool/cancel-basket', requireAuth, cancelParkedBasket);
router.post('/pool-payments/refund-request', requireAuth, requestPoolPaymentRefund);
router.get('/order-documents/my', requireAuth, getMyOrderDocuments);
router.get('/pool-payments/my', requireAuth, getMyPoolPayments);
router.post('/pool-payments/reference', requireAuth, submitPoolPaymentReference);
router.get('/pool-payments/online-status', requireAuth, getOnlinePaymentStatus);
router.post('/pool-payments/:paymentId/pay-online', requireAuth, initiatePoolPaymentOnline);

// Admin-only margin view. Cost price never appears on /catalogue — it leaves
// the server only through these two routes, both of which check admin.
router.get('/margins', requireAuth, getCatalogueMargins);
router.patch('/margins/:skuId/cost', requireAuth, setSkuCostPrice);
router.patch('/margins/:skuId/retail', requireAuth, setSkuRetailPrice);

// Admin-only: PSP-collected payments iCamagu is still holding, awaiting a
// manual transfer to the supplier. Each handler checks admin itself.
router.get('/admin/pending-payouts', requireAuth, getPendingSupplierPayouts);
router.post('/admin/pending-payouts/:paymentId/forward', requireAuth, forwardSupplierPayout);
router.get('/admin/pending-refunds', requireAuth, getPendingSupplierRefunds);
router.post('/admin/pending-refunds/:paymentId/process', requireAuth, processSupplierRefund);

export default router;
