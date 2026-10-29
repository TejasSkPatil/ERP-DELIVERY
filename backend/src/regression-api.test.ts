import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import createApp from './app';
import { User } from './models/User';
import { Activity } from './models/Activity';
import env from './config/env';
import { getApiBaseUrl, formatApiErrorMessage } from '../../src/services/api';

vi.mock('./models/User');
vi.mock('./models/Activity');
vi.mock('bcryptjs');

describe('Phase 5 — Fullstack API Regression Tests', () => {
  const app = createApp();
  const secret = process.env.JWT_SECRET || env.JWT_SECRET || 'secret_key_erp_delivery';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Delivery Boy signup with valid input
  it('1. Delivery Boy signup with valid input returns 201 JSON (not HTML)', async () => {
    const mockCreatedUser = {
      _id: 'user_boy_1',
      name: 'Rohan Delivery',
      username: 'rohan_delivery',
      email: 'rohan_delivery@pizzadeliver.com',
      phone: '9876543210',
      role: 'DELIVERY_PERSON',
      toJSON: () => ({
        id: 'user_boy_1',
        name: 'Rohan Delivery',
        username: 'rohan_delivery',
        role: 'DELIVERY_PERSON',
      }),
    };

    (User.findOne as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed_pw');
    (User.create as any).mockResolvedValue(mockCreatedUser);
    (Activity.create as any).mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'rohan_delivery',
        phone: '9876543210',
        password: 'password123',
      });

    expect(res.status).toBe(201);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.text).not.toContain('<!DOCTYPE');
    expect(res.text).not.toContain('<html');
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('DELIVERY_PERSON');
  });

  // 2. Signup with invalid input
  it('2. Signup with invalid input returns 400 validation error JSON (not HTML)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: '',
        phone: '',
        password: '12',
      });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.text).not.toContain('<!DOCTYPE');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  // 3. Login with valid credentials
  it('3. Login with valid credentials returns 200 JSON with token (not HTML)', async () => {
    const mockUser = {
      _id: 'user_123',
      name: 'Rohan Boy',
      username: 'rohan_boy',
      email: 'rohan_boy@pizzadeliver.com',
      password: 'hashed_password',
      role: 'DELIVERY_PERSON',
      toJSON: () => ({
        id: 'user_123',
        name: 'Rohan Boy',
        username: 'rohan_boy',
        role: 'DELIVERY_PERSON',
      }),
    };

    (User.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue(mockUser),
    });
    (bcrypt.compare as any).mockResolvedValue(true);
    (Activity.create as any).mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'rohan_boy',
        password: 'password123',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.text).not.toContain('<!DOCTYPE');
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('DELIVERY_PERSON');
  });

  // 4. Login with invalid credentials
  it('4. Login with invalid credentials returns 401 JSON (not HTML)', async () => {
    (User.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'nonexistent_user',
        password: 'wrong_password',
      });

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.text).not.toContain('<!DOCTYPE');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid username or password/);
  });

  // 5. Protected API request without a token
  it('5. Protected API request without a token returns 401 JSON (not HTML)', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.text).not.toContain('<!DOCTYPE');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/No authentication token provided/);
  });

  // 6. Protected API request with a valid token
  it('6. Protected API request with a valid token returns 200 JSON profile', async () => {
    const validToken = jwt.sign(
      { userId: 'user_123', role: 'DELIVERY_PERSON' },
      secret,
      { expiresIn: '1h' }
    );

    const mockUser = {
      _id: 'user_123',
      name: 'Rohan Staff',
      username: 'rohan_staff',
      role: 'DELIVERY_PERSON',
      toJSON: () => ({
        id: 'user_123',
        name: 'Rohan Staff',
        username: 'rohan_staff',
        role: 'DELIVERY_PERSON',
      }),
    };

    (User.findById as any).mockResolvedValue(mockUser);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('DELIVERY_PERSON');
  });

  // 7. Existing delivery upload endpoint
  it('7. Delivery upload endpoint enforces authentication and delivery person role', async () => {
    // Without token: 401
    const unauthRes = await request(app).post('/api/deliveries');
    expect(unauthRes.status).toBe(401);
    expect(unauthRes.body.success).toBe(false);

    // With invalid role (ADMIN token when DELIVERY_PERSON required): 403
    const adminToken = jwt.sign(
      { userId: 'admin_1', role: 'ADMIN' },
      secret,
      { expiresIn: '1h' }
    );

    const roleRes = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(roleRes.status).toBe(403);
    expect(roleRes.body.success).toBe(false);
  });

  // 8. Unknown API path returns a genuine API 404 response
  it('8. Unknown API path returns a genuine API 404 response (JSON, not HTML)', async () => {
    const res = await request(app).get('/api/unknown-service-endpoint-xyz');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.text).not.toContain('<!DOCTYPE');
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('not found');
  });

  // 9. Health check endpoint responds with 200
  it('9. Direct health check endpoints return 200 OK JSON', async () => {
    const res1 = await request(app).get('/api/health');
    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.message).toContain('running');

    const res2 = await request(app).get('/health');
    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
  });

  // 10. API requests use the correct URL in local and production builds
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('10. API requests use the correct URL in local and production builds', () => {
    // Default fallback when VITE_API_URL is unset
    vi.unstubAllEnvs();
    expect(getApiBaseUrl()).toBe('/api');

    // Custom external backend URL
    vi.stubEnv('VITE_API_URL', 'https://custom-backend.production.com');
    expect(getApiBaseUrl()).toBe('https://custom-backend.production.com/api');

    // External URL already including /api
    vi.stubEnv('VITE_API_URL', 'https://custom-backend.production.com/api');
    expect(getApiBaseUrl()).toBe('https://custom-backend.production.com/api');

    // VITE_BACKEND_URL fallback
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_BACKEND_URL', 'https://render-backend.onrender.com');
    expect(getApiBaseUrl()).toBe('https://render-backend.onrender.com/api');

    // Reset and verify fallback
    vi.unstubAllEnvs();
    expect(getApiBaseUrl()).toBe('/api');
  });

  // 11. Confirm that signup and login do not accidentally return the frontend's HTML page instead of JSON
  it('11. Confirms signup and login strictly return JSON responses, never HTML', async () => {
    const signupRes = await request(app)
      .post('/api/auth/register')
      .send({ invalid: true });
    expect(signupRes.headers['content-type']).toMatch(/application\/json/);
    expect(signupRes.text.startsWith('<!DOCTYPE html>')).toBe(false);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ invalid: true });
    expect(loginRes.headers['content-type']).toMatch(/application\/json/);
    expect(loginRes.text.startsWith('<!DOCTYPE html>')).toBe(false);
  });

  // 12. Distinguishes error categories (Timeout, 502/503, Missing Config, Validation)
  it('12. Distinguishes backend errors into actionable messages', () => {
    // Timeout error
    const timeoutErr = { code: 'ECONNABORTED', message: 'timeout of 60000ms exceeded' };
    expect(formatApiErrorMessage(timeoutErr)).toContain('Backend request timed out');

    // Render gateway 502 / 503
    const gatewayErr = { response: { status: 502 } };
    expect(formatApiErrorMessage(gatewayErr)).toContain('temporarily unavailable (HTTP 502)');

    // Missing API URL
    const missingUrlErr = { code: 'ERR_MISSING_API_URL', message: 'VITE_API_URL not set' };
    expect(formatApiErrorMessage(missingUrlErr)).toBe('VITE_API_URL not set');

    // Server application error
    const appErr = { response: { data: { message: "'COLLECTION' slips :Invalid slip" } } };
    expect(formatApiErrorMessage(appErr)).toBe("'COLLECTION' slips :Invalid slip");
  });
});
