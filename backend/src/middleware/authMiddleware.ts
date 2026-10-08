import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, TokenPayload, UserRole } from '../types';
import env from '../config/env';

/**
 * Express middleware to authenticate incoming requests via JWT Bearer token.
 * Payload contains: userId, role.
 */
export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token missing.',
    });
  }

  try {
    const secret = process.env.JWT_SECRET || env.JWT_SECRET || 'secret_key';
    const decoded = jwt.verify(token, secret) as TokenPayload;

    if (!decoded.userId || !decoded.role) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token payload.',
      });
    }

    req.user = decoded;
    return next();
  } catch (error: any) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
      error: error.message,
    });
  }
};

/**
 * Role-based authorization middleware requiring ADMIN role.
 */
export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Requires ADMIN role.',
    });
  }

  return next();
};

/**
 * Role-based authorization middleware requiring DELIVERY_PERSON role.
 */
export const requireDeliveryPerson = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'DELIVERY_PERSON') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Requires DELIVERY_PERSON role.',
    });
  }

  return next();
};

/**
 * Role-based authorization middleware requiring USER role.
 */
export const requireUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required.',
    });
  }

  if (req.user.role !== 'USER') {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Requires USER role.',
    });
  }

  return next();
};

/**
 * Generic middleware to enforce role-based access control across multiple roles.
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient privileges.',
      });
    }

    return next();
  };
};

export default {
  authenticate,
  requireAdmin,
  requireDeliveryPerson,
  requireUser,
  requireRole,
};
