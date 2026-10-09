import { Router, Request, Response } from 'express';
import {
  createDeliveryProof,
  getTodayDeliveries,
  streamSlip,
  cleanupRetention,
  getStorageStats,
} from '../controllers/deliveryController';
import {
  authenticate,
  requireDeliveryPerson,
  requireAdmin,
  requireStaff,
} from '../middleware/authMiddleware';
import { uploadSlipMiddleware } from '../middleware/uploadMiddleware';

const router = Router();

/**
 * POST /api/deliveries (and /api/delivery)
 * Strictly restricted to DELIVERY_PERSON with ownership enforcement.
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

// Operational shift deliveries (accessible by staff)
router.get('/today', getTodayDeliveries);

// GridFS slip image streaming (accessible by authenticated staff or valid slip requests)
router.get('/slip/:fileId', streamSlip);

// Admin-only storage & retention APIs (Server-side ADMIN authorization enforced)
router.get('/storage-stats', authenticate, requireAdmin, getStorageStats);
router.post('/cleanup', authenticate, requireAdmin, cleanupRetention);

// Retired customer delivery endpoint (Returns 410 Gone)
router.get('/my-deliveries', (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message: 'Customer delivery history has been retired. Delivery records are managed internally by staff.',
  });
});

export default router;
