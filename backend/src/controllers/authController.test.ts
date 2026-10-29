import { describe, expect, it, vi, beforeEach } from 'vitest';
import { register, login, getMe, logout } from './authController';
import { User } from '../models/User';
import { Activity } from '../models/Activity';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

vi.mock('../models/User');
vi.mock('../models/Activity');
vi.mock('bcryptjs');
vi.mock('jsonwebtoken');

describe('Auth Controller - Admin & User Authentication States', () => {
  let mockReq: any;
  let mockRes: any;
  let statusMock: any;
  let jsonMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('Admin Login', () => {
    it('authenticates admin successfully and returns admin user with role ADMIN', async () => {
      mockReq = {
        body: {
          username: 'admin@26',
          password: 'admin_05',
          role: 'ADMIN',
        },
        headers: {},
        ip: '127.0.0.1',
      };

      const mockAdminUser = {
        _id: 'admin-id-123',
        name: 'System Admin',
        username: 'admin@26',
        email: 'admin@26@pizzadeliver.com',
        role: 'ADMIN',
        password: 'hashed-admin-password',
        toJSON: () => ({
          id: 'admin-id-123',
          name: 'System Admin',
          username: 'admin@26',
          email: 'admin@26@pizzadeliver.com',
          role: 'ADMIN',
        }),
      };

      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockAdminUser),
      });
      (bcrypt.compare as any).mockResolvedValue(true);
      (jwt.sign as any).mockReturnValue('mock-admin-token');
      (Activity.create as any).mockResolvedValue({});

      await login(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'mock-admin-token',
          user: expect.objectContaining({
            username: 'admin@26',
            role: 'ADMIN',
          }),
        })
      );
    });

    it('rejects normal user when attempting to authenticate as ADMIN', async () => {
      mockReq = {
        body: {
          username: 'bhushan26',
          password: 'password123',
          role: 'ADMIN',
        },
        headers: {},
        ip: '127.0.0.1',
      };

      const mockNormalUser = {
        _id: 'user-id-456',
        name: 'Bhushan Lokhande',
        username: 'bhushan26',
        role: 'DELIVERY_PERSON',
        password: 'hashed-password',
      };

      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockNormalUser),
      });
      (bcrypt.compare as any).mockResolvedValue(true);

      await login(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Access Denied: You do not have Administrator permissions'),
        })
      );
    });
  });

  describe('Normal User (Delivery Boy) Login & Signup', () => {
    it('authenticates normal user successfully and returns role DELIVERY_PERSON', async () => {
      mockReq = {
        body: {
          username: 'bhushan26',
          password: 'password123',
          role: 'DELIVERY_PERSON',
        },
        headers: {},
        ip: '127.0.0.1',
      };

      const mockNormalUser = {
        _id: 'user-id-456',
        name: 'Bhushan Lokhande',
        username: 'bhushan26',
        role: 'DELIVERY_PERSON',
        password: 'hashed-password',
        toJSON: () => ({
          id: 'user-id-456',
          name: 'Bhushan Lokhande',
          username: 'bhushan26',
          role: 'DELIVERY_PERSON',
        }),
      };

      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockNormalUser),
      });
      (bcrypt.compare as any).mockResolvedValue(true);
      (jwt.sign as any).mockReturnValue('mock-user-token');
      (Activity.create as any).mockResolvedValue({});

      await login(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'mock-user-token',
          user: expect.objectContaining({
            username: 'bhushan26',
            role: 'DELIVERY_PERSON',
          }),
        })
      );
    });

    it('registers new user and logs them in with token', async () => {
      mockReq = {
        body: {
          username: 'newrider26',
          phone: '+91 9820011223',
          password: 'securePassword123',
        },
        headers: {},
        ip: '127.0.0.1',
      };

      (User.findOne as any).mockResolvedValue(null);
      (bcrypt.hash as any).mockResolvedValue('hashed-new-password');

      const createdUser = {
        _id: { toString: () => 'new-user-789' },
        name: 'newrider26',
        username: 'newrider26',
        email: 'newrider26@pizzadeliver.com',
        role: 'DELIVERY_PERSON',
        toJSON: () => ({
          id: 'new-user-789',
          name: 'newrider26',
          username: 'newrider26',
          role: 'DELIVERY_PERSON',
        }),
      };

      (User.create as any).mockResolvedValue(createdUser);
      (jwt.sign as any).mockReturnValue('new-registered-token');
      (Activity.create as any).mockResolvedValue({});

      await register(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          token: 'new-registered-token',
          user: expect.objectContaining({
            username: 'newrider26',
            role: 'DELIVERY_PERSON',
          }),
        })
      );
    });
  });

  describe('Session Verification (getMe)', () => {
    it('restores authenticated user profile from valid token', async () => {
      mockReq = {
        user: { userId: 'admin-id-123', role: 'ADMIN' },
      };

      const mockAdminUser = {
        _id: 'admin-id-123',
        name: 'System Admin',
        username: 'admin@26',
        role: 'ADMIN',
        toJSON: () => ({
          id: 'admin-id-123',
          name: 'System Admin',
          username: 'admin@26',
          role: 'ADMIN',
        }),
      };

      (User.findById as any).mockResolvedValue(mockAdminUser);

      await getMe(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          user: expect.objectContaining({
            username: 'admin@26',
            role: 'ADMIN',
          }),
        })
      );
    });

    it('returns 401 when request is not authenticated', async () => {
      mockReq = { user: null };

      await getMe(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required.',
        })
      );
    });
  });

  describe('Logout', () => {
    it('records logout activity and clears session', async () => {
      mockReq = {
        body: { userName: 'admin@26', userRole: 'ADMIN' },
        user: { userId: 'admin-id-123', role: 'ADMIN' },
      };

      (Activity.create as any).mockResolvedValue({});

      await logout(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully',
        })
      );
    });
  });

  describe('Role Restriction & Privilege Security', () => {
    it('prevents public self-assignment of ADMIN role during registration with 403', async () => {
      mockReq = {
        body: {
          username: 'hacker_admin',
          phone: '+91 9999999999',
          password: 'password123',
          role: 'ADMIN',
        },
        headers: {},
        ip: '127.0.0.1',
      };

      await register(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Self-assignment of ADMIN role during public registration is strictly prohibited'),
        })
      );
    });

    it('rejects login attempts from legacy customer accounts with 403', async () => {
      mockReq = {
        body: {
          username: 'old_customer',
          password: 'password123',
        },
        headers: {},
        ip: '127.0.0.1',
      };

      const mockCustomerUser = {
        _id: 'cust-123',
        name: 'Old Customer',
        username: 'old_customer',
        role: 'USER',
        password: 'hashed-password',
      };

      (User.findOne as any).mockReturnValue({
        select: vi.fn().mockResolvedValue(mockCustomerUser),
      });

      await login(mockReq, mockRes);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Customer accounts have been retired'),
        })
      );
    });
  });
});

