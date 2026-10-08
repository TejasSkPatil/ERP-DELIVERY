import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User } from '../models/User';
import { AuthenticatedRequest, UserRole } from '../types';
import env from '../config/env';

// Registration input validation schema
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters long'),
  email: z.string().trim().email('Invalid email address'),
  phone: z.string().trim().optional().default(''),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['ADMIN', 'DELIVERY_PERSON', 'USER'] as [UserRole, ...UserRole[]]).optional().default('USER'),
});

// Login input validation schema
const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || env.JWT_SECRET || 'secret_key_erp_delivery';
};

/**
 * POST /api/auth/register
 * Registers a new user with hashed password and generates a JWT.
 * Never returns the password.
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

    const { name, email, phone, password, role } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already registered
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered.',
      });
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user in MongoDB
    const newUser = await User.create({
      name,
      email: normalizedEmail,
      phone,
      password: hashedPassword,
      role,
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

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
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
 * Authenticates user credentials, compares bcrypt hash, and issues a JWT.
 * Never returns the password.
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

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Find user with password field explicitly included
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Compare passwords with bcrypt
    const isPasswordMatch = await bcrypt.compare(password, user.password || '');

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
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

    return res.status(200).json({
      success: true,
      message: 'Login successful',
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
 * GET /api/auth/me
 * Protected endpoint returning the profile of the currently authenticated user.
 * Never returns the password.
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
        message: 'User account not found.',
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
      message: 'Internal server error fetching user profile',
      error: error.message,
    });
  }
};

export default { register, login, getMe };
