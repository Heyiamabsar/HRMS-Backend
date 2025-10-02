import { authenticate, authorizeRoles } from '../../../middleware/auth.js';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../../setup/testDb.js';
import { setupTestEnv, createTestUser, generateTestToken, mockRequest, mockResponse, mockNext } from '../../setup/testHelpers.js';
import jwt from 'jsonwebtoken';

describe('Middleware - Authentication', () => {
  beforeAll(async () => {
    setupTestEnv();
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
  });

  describe('authenticate', () => {
    test('should authenticate valid token', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user);
      
      const req = mockRequest({
        headers: { Authorization: `Bearer ${token}` }
      });
      const res = mockResponse();
      const next = mockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user._id).toBe(user._id.toString());
    });

    test('should reject request without token', async () => {
      const req = mockRequest({});
      const res = mockResponse();
      const next = mockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied. No token provided.'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject invalid token', async () => {
      const req = mockRequest({
        headers: { Authorization: 'Bearer invalid-token' }
      });
      const res = mockResponse();
      const next = mockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('should reject expired token', async () => {
      const user = await createTestUser();
      const expiredToken = jwt.sign(
        { _id: user._id, role: user.role, email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a bit to ensure token is expired
      await new Promise(resolve => setTimeout(resolve, 100));

      const req = mockRequest({
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      const res = mockResponse();
      const next = mockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'TokenExpired'
        })
      );
    });
  });

  describe('authorizeRoles', () => {
    test('should allow user with authorized role', async () => {
      const admin = await createTestUser({ 
        email: 'admin@test.com',
        role: 'admin' 
      });
      
      const req = mockRequest({
        user: {
          _id: admin._id.toString(),
          role: 'admin'
        }
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = authorizeRoles('admin', 'hr');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject user without authorized role', async () => {
      const employee = await createTestUser({
        email: 'employee@test.com',
        role: 'employee'
      });
      
      const req = mockRequest({
        user: {
          _id: employee._id.toString(),
          role: 'employee'
        }
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = authorizeRoles('admin', 'hr');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('should allow superAdmin to bypass role check', async () => {
      const superAdmin = await createTestUser({
        email: 'superadmin@test.com',
        role: 'superAdmin'
      });
      
      const req = mockRequest({
        user: {
          _id: superAdmin._id.toString(),
          role: 'superAdmin'
        }
      });
      const res = mockResponse();
      const next = mockNext();

      const middleware = authorizeRoles('admin');
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should reject unauthenticated user', async () => {
      const req = mockRequest({});
      const res = mockResponse();
      const next = mockNext();

      const middleware = authorizeRoles('admin');
      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Unauthorized: User not authenticated'
        })
      );
    });
  });
});
