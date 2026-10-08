import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

// Public Authentication Endpoints
router.post('/register', register);
router.post('/login', login);

// Protected Profile Endpoint
router.get('/me', authenticate, getMe);

export default router;
