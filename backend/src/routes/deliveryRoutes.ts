import { Router } from 'express';
import {
  createDeliveryProof,
  getTodayDeliveries,
  streamSlip,
  cleanupRetention,
  getStorageStats,
} from '../controllers/deliveryController';
import { authenticate, requireDeliveryPerson } from '../middleware/authMiddleware';
import { uploadSlipMiddleware } from '../middleware/uploadMiddleware';

const router = Router();

/**
 * POST /api/deliveries (and /api/delivery)
 * Strictly restricted to DELIVERY_PERSON.
 * Accepts multipart/form-data with fields: receiptNo, userId, slip.
 */
router.post(
  '/',
  authenticate,
  requireDeliveryPerson,
  uploadSlipMiddleware(['slip', 'slipImage']),
  createDeliveryProof
);

// Backward-compatible route alias
router.post(
  '/create',
  authenticate,
  requireDeliveryPerson,
  uploadSlipMiddleware(['slip', 'slipImage']),
  createDeliveryProof
);

router.get('/today', getTodayDeliveries);
router.get('/slip/:fileId', streamSlip);
router.get('/storage-stats', getStorageStats);
router.post('/cleanup', cleanupRetention);

export default router;
