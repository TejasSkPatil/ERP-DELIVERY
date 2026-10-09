import { Router } from 'express';
import {
  getDeliveryPersonsList,
  getAllRetainedDeliveries,
  getAdminMetrics,
  getActivities,
} from '../controllers/adminController';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Enforce server-side ADMIN authentication across all admin routes
router.use(authenticate, requireAdmin);

/**
 * GET /api/admin/metrics
 * Overview counters: Total deliveries, slips, today's metrics, and active agents.
 */
router.get('/metrics', getAdminMetrics);

/**
 * GET /api/admin/activities
 * Real-time audit & activity log: Logins, logouts, signups.
 */
router.get('/activities', getActivities);

/**
 * GET /api/admin/delivery-persons
 * Lists all active delivery personnel accounts with performance metrics.
 */
router.get('/delivery-persons', getDeliveryPersonsList);

/**
 * GET /api/admin/deliveries
 * Lists all retained delivery records with recipient info, agents, and GridFS slip references.
 */
router.get('/deliveries', getAllRetainedDeliveries);

/**
 * GET /api/admin/dashboard
 * Ping / status verification route.
 */
router.get('/dashboard', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Welcome to the Admin Dashboard',
    user: {
      userId: req.user?.userId,
      role: req.user?.role,
    },
  });
});

export default router;
