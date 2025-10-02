import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../../server.js';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../../setup/testDb.js';
import { setupTestEnv, createTestUser, createTestSuperAdmin } from '../../setup/testHelpers.js';

describe('Integration - Authentication API', () => {
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

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const password = 'Test@123';
      await createTestUser({ 
        email: 'user@example.com',
        password 
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('user@example.com');
    });

    test('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test@123'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    test('should reject login with invalid password', async () => {
      const password = 'Test@123';
      await createTestUser({ 
        email: 'user@example.com',
        password 
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    test('should set refresh token cookie on successful login', async () => {
      const password = 'Test@123';
      await createTestUser({ 
        email: 'user@example.com',
        password 
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: password
        });

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      const cookie = response.headers['set-cookie'].find(c => c.startsWith('refreshToken='));
      expect(cookie).toBeDefined();
    });
  });

  describe('POST /api/auth/register', () => {
    test('should register new user as superAdmin', async () => {
      const superAdmin = await createTestSuperAdmin();
      const token = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'superadmin@example.com',
          password: 'Test@123'
        })
        .then(res => res.body.accessToken);

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'New',
          last_name: 'User',
          email: 'newuser@example.com',
          password: 'NewUser@123',
          phone: '+1234567890',
          role: 'employee',
          gender: 'Male',
          address: 'Test Address',
          department: 'IT',
          designation: 'Developer',
          salary: 50000,
          dateOfJoining: new Date(),
          dateOfBirth: new Date('1990-01-01')
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('newuser@example.com');
    });

    test('should reject duplicate email registration', async () => {
      const superAdmin = await createTestSuperAdmin();
      await createTestUser({ email: 'existing@example.com' });
      
      const token = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'superadmin@example.com',
          password: 'Test@123'
        })
        .then(res => res.body.accessToken);

      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: 'existing@example.com',
          password: 'Test@123',
          phone: '+1234567890',
          role: 'employee',
          gender: 'Male',
          address: 'Test Address',
          department: 'IT',
          designation: 'Developer',
          salary: 50000,
          dateOfJoining: new Date(),
          dateOfBirth: new Date('1990-01-01')
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Email already exists');
    });

    test('should reject registration without authentication', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          password: 'Test@123',
          phone: '+1234567890',
          role: 'employee'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      const password = 'Test@123';
      await createTestUser({ 
        email: 'user@example.com',
        password 
      });

      // First login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: password
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Then logout
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('POST /api/auth/refreshToken', () => {
    test('should refresh access token with valid refresh token', async () => {
      const password = 'Test@123';
      await createTestUser({ 
        email: 'user@example.com',
        password 
      });

      // First login to get refresh token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@example.com',
          password: password
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Then refresh token
      const response = await request(app)
        .post('/api/auth/refreshToken')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.accessToken).toBeDefined();
    });

    test('should reject refresh without token', async () => {
      const response = await request(app)
        .post('/api/auth/refreshToken');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Refresh token is required');
    });
  });
});
