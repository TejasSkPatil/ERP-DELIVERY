import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  obsoleteCustomerEndpoint,
} from '../controllers/authController';
import { authenticate, requireAdmin } from '../middleware/authMiddleware';

const router = Router();

// Staff Login
router.post('/login', login);

// Staff Logout & Activity Logging
router.post('/logout', logout);

// Delivery Boy Registration (Public)
router.post('/register', register);

// Protected Staff Profile Endpoint
router.get('/me', authenticate, getMe);

// Obsolete Customer Endpoints (Return 410 Gone)
router.post('/customer-login', obsoleteCustomerEndpoint);
router.post('/customer-register', obsoleteCustomerEndpoint);

export default router;
