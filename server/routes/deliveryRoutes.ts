import { Router } from 'express';
import multer from 'multer';
import {
  createDelivery,
  getTodayDeliveries,
  getDeliveriesByDate,
  getMyDeliveries,
  getAllDeliveries,
  getStorageStats,
  cleanupOlderThan32Days,
} from '../controllers/deliveryController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post('/create', authenticateToken, upload.single('slipImage'), createDelivery);
router.get('/today', authenticateToken, getTodayDeliveries);
router.get('/date/:date', authenticateToken, getDeliveriesByDate);
router.get('/my', authenticateToken, getMyDeliveries);
router.get('/all', authenticateToken, getAllDeliveries);
router.get('/storage-stats', authenticateToken, getStorageStats);
router.post('/cleanup', authenticateToken, cleanupOlderThan32Days);

export default router;
