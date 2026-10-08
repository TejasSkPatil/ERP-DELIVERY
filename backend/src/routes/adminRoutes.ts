import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

/**
 * Protected Admin Route to verify requireAdmin authorization
 */
router.get('/dashboard', authenticate, requireAdmin, (req: AuthenticatedRequest, res: Response) => {
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
