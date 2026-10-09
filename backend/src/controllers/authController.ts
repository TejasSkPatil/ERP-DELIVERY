import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { Activity } from '../models/Activity';
import { AuthenticatedRequest, UserRole } from '../types';
import env from '../config/env';

// Public Delivery Boy registration validation schema
const registerSchema = z.object({
  username: z.string().trim().min(2, 'Username must be at least 2 characters long'),
  phone: z.string().trim().min(5, 'Phone number is required'),
  password: z.string().min(4, 'Password must be at least 4 characters long'),
  role: z.enum(['ADMIN', 'DELIVERY_PERSON'] as [UserRole, ...UserRole[]]).optional().default('DELIVERY_PERSON'),
});

// Flexible Login input validation schema (supports username, email, and optional role)
const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required').optional(),
  email: z.string().trim().min(1, 'Email or username is required').optional(),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['ADMIN', 'DELIVERY_PERSON'] as [UserRole, ...UserRole[]]).optional(),
});

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || env.JWT_SECRET || 'secret_key_erp_delivery';
};

/**
 * POST /api/auth/register
 * Public registration for new Delivery Boy accounts.
 * Fields: username, phone, password.
 */
export const register = async (req: Request, res: Response) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { username, phone, password } = parseResult.data;
    const normalizedUsername = username.toLowerCase().trim();
    const emailToUse = normalizedUsername.includes('@')
      ? normalizedUsername
      : `${normalizedUsername}@pizzadeliver.com`;

    // Check if username or email already registered
    const existingUser = await User.findOne({
      $or: [
        { username: normalizedUsername },
        { email: normalizedUsername },
        { email: emailToUse },
      ],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Username is already registered. Please log in.',
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create delivery person account in MongoDB
    const newUser = await User.create({
      name: username.trim(),
      username: normalizedUsername,
      email: emailToUse,
      phone: phone.trim(),
      password: hashedPassword,
      role: 'DELIVERY_PERSON',
      status: 'ACTIVE',
    });

    // Generate JWT token with userId and role
    const token = jwt.sign(
      {
        userId: newUser._id.toString(),
        role: newUser.role,
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    // Record activity: SIGNUP
    try {
      await Activity.create({
        action: 'SIGNUP',
        userId: newUser._id,
        userName: newUser.name || newUser.username || 'Delivery Boy',
        userRole: 'DELIVERY_PERSON',
        description: `Signed up successfully as Delivery Boy (Phone: ${newUser.phone || 'N/A'})`,
        ip: (req.headers['x-forwarded-for'] as string) || req.ip || '',
        timestamp: new Date(),
      });
    } catch (actErr) {
      console.warn('[Activity] Failed to log signup activity:', actErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully! Welcome Delivery Boy.',
      token,
      user: newUser.toJSON(),
    });
  } catch (error: any) {
    console.error('[Auth] Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/login
 * Authenticates users with username/email and password, with role validation.
 * Supports Admin (admin@26 / admin_05) and Delivery Boys.
 */
export const login = async (req: Request, res: Response) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: parseResult.error.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { username, email, password, role } = parseResult.data;
    const loginIdentifier = (username || email || '').toLowerCase().trim();

    if (!loginIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Username is required.',
      });
    }

    // Find user by username, email, or exact name
    const user = await User.findOne({
      $or: [
        { username: loginIdentifier },
        { email: loginIdentifier },
        { email: `${loginIdentifier}@pizzadeliver.com` },
        { name: new RegExp(`^${loginIdentifier}$`, 'i') },
      ],
    }).select('+password +passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    // Check if user is a legacy customer account
    if ((user.role as string) === 'USER') {
      return res.status(403).json({
        success: false,
        message: 'Customer accounts have been retired from this application. Access is restricted to staff (ADMIN, DELIVERY_PERSON).',
      });
    }

    // Compare passwords with bcrypt (supporting both password and legacy passwordHash)
    const storedHash = user.password || (user as any).passwordHash || '';
    const isPasswordMatch = await bcrypt.compare(password, storedHash);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.',
      });
    }

    // Role verification: If user selected a role, verify that their account has permission
    if (role) {
      if (role === 'ADMIN' && user.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Access Denied: You do not have Administrator permissions. Admin credentials required.',
        });
      }
    }

    // Generate JWT token with userId and role
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    // Record activity: LOGIN
    try {
      await Activity.create({
        action: 'LOGIN',
        userId: user._id,
        userName: user.name || user.username || user.email,
        userRole: user.role,
        description: `Logged in successfully as ${user.role === 'ADMIN' ? 'Admin' : 'Delivery Boy'}`,
        ip: (req.headers['x-forwarded-for'] as string) || req.ip || '',
        timestamp: new Date(),
      });
    } catch (actErr) {
      console.warn('[Activity] Failed to log login activity:', actErr);
    }

    return res.status(200).json({
      success: true,
      message: `Login successful as ${user.role === 'ADMIN' ? 'Admin' : 'Delivery Boy'}`,
      token,
      user: user.toJSON(),
    });
  } catch (error: any) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: error.message,
    });
  }
};

/**
 * POST /api/auth/logout
 * Records LOGOUT activity and responds with success.
 */
export const logout = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userName = req.body?.userName || (req.user ? (req.user as any).name : 'Staff Member');
    const userRole = req.body?.userRole || (req.user ? req.user.role : 'DELIVERY_PERSON');
    const userId = req.user?.userId || req.body?.userId;

    await Activity.create({
      action: 'LOGOUT',
      userId,
      userName: userName || 'Staff Member',
      userRole: userRole || 'DELIVERY_PERSON',
      description: `Logged out successfully`,
      ip: (req.headers['x-forwarded-for'] as string) || req.ip || '',
      timestamp: new Date(),
    });
  } catch (actErr) {
    console.warn('[Activity] Failed to log logout activity:', actErr);
  }
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * GET /api/auth/me
 * Protected endpoint returning the profile of the currently authenticated staff member.
 */
export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Staff account not found.',
      });
    }

    if ((user.role as string) === 'USER') {
      return res.status(403).json({
        success: false,
        message: 'Customer accounts have been retired.',
      });
    }

    return res.status(200).json({
      success: true,
      user: user.toJSON(),
    });
  } catch (error: any) {
    console.error('[Auth] getMe error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error fetching profile',
      error: error.message,
    });
  }
};

/**
 * Handlers for retired customer endpoints
 */
export const obsoleteCustomerEndpoint = (_req: Request, res: Response) => {
  return res.status(410).json({
    success: false,
    message: 'This customer endpoint has been retired. The application supports only ADMIN and DELIVERY_PERSON operations.',
  });
};

export default { register, login, getMe, obsoleteCustomerEndpoint };
