import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getCatalogue, getCategories } from '../controllers/catalogueController.js';
import { submitToPool, getPartners, getMyOrderDocuments, confirmOrderLine, getMyPoolPayments, submitPoolPaymentReference, getMyPoolStatus, cancelParkedBasket, requestPoolPaymentRefund } from '../controllers/poolController.js';
import { getMyBasket, addItem, updateItem, removeItem } from '../controllers/basketController.js';
import { getCatalogueMargins, setSkuCostPrice, setSkuRetailPrice } from '../controllers/marginController.js';

const router = express.Router();

router.get('/catalogue', getCatalogue);
router.get('/catalogue/categories', getCategories);

router.get('/', requireAuth, getMyBasket);
router.post('/items', requireAuth, addItem);
router.patch('/items/:itemId', requireAuth, updateItem);
router.post('/order-documents/confirm-line', requireAuth, confirmOrderLine);
router.delete('/items/:itemId', requireAuth, removeItem);

router.get('/partners', getPartners);
router.post('/submit-to-pool', requireAuth, submitToPool);
router.get('/pool-status/my', requireAuth, getMyPoolStatus);
router.post('/pool/cancel-basket', requireAuth, cancelParkedBasket);
router.post('/pool-payments/refund-request', requireAuth, requestPoolPaymentRefund);
router.get('/order-documents/my', requireAuth, getMyOrderDocuments);
router.get('/pool-payments/my', requireAuth, getMyPoolPayments);
router.post('/pool-payments/reference', requireAuth, submitPoolPaymentReference);

// Admin-only margin view. Cost price never appears on /catalogue — it leaves
// the server only through these two routes, both of which check admin.
router.get('/margins', requireAuth, getCatalogueMargins);
router.patch('/margins/:skuId/cost', requireAuth, setSkuCostPrice);
router.patch('/margins/:skuId/retail', requireAuth, setSkuRetailPrice);

export default router;
