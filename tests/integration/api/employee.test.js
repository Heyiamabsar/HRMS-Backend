import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../../server.js';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../../setup/testDb.js';
import { setupTestEnv, createTestUser, createTestAdmin, generateTestToken } from '../../setup/testHelpers.js';

describe('Integration - Employee API', () => {
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

  describe('GET /api/employee', () => {
    test('should get all employees as admin', async () => {
      const admin = await createTestAdmin();
      const token = generateTestToken(admin);

      // Create some test employees
      await createTestUser({ email: 'emp1@example.com' });
      await createTestUser({ email: 'emp2@example.com' });

      const response = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.users).toBeDefined();
      expect(Array.isArray(response.body.users)).toBe(true);
    });

    test('should reject access without authentication', async () => {
      const response = await request(app)
        .get('/api/employee');

      expect(response.status).toBe(401);
    });

    test('should reject access for non-admin/hr users', async () => {
      const employee = await createTestUser({ 
        email: 'employee@example.com',
        role: 'employee' 
      });
      const token = generateTestToken(employee);

      const response = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/employee/:id', () => {
    test('should get employee by id as admin', async () => {
      const admin = await createTestAdmin();
      const employee = await createTestUser({ email: 'emp@example.com' });
      const token = generateTestToken(admin);

      const response = await request(app)
        .get(`/api/employee/${employee._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('emp@example.com');
    });

    test('should allow employee to get their own data', async () => {
      const employee = await createTestUser({ email: 'emp@example.com' });
      const token = generateTestToken(employee);

      const response = await request(app)
        .get(`/api/employee/${employee._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('emp@example.com');
    });

    test('should return 404 for non-existent employee', async () => {
      const admin = await createTestAdmin();
      const token = generateTestToken(admin);
      const fakeId = '507f1f77bcf86cd799439011';

      const response = await request(app)
        .get(`/api/employee/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/employee/:id', () => {
    test('should update employee as admin', async () => {
      const admin = await createTestAdmin();
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        first_name: 'Old'
      });
      const token = generateTestToken(admin);

      const response = await request(app)
        .put(`/api/employee/${employee._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Updated',
          last_name: 'Name',
          phone: '+1234567890'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user.first_name).toBe('Updated');
    });

    test('should reject update for non-admin/hr users', async () => {
      const employee = await createTestUser({ email: 'emp@example.com' });
      const otherEmployee = await createTestUser({ email: 'other@example.com' });
      const token = generateTestToken(employee);

      const response = await request(app)
        .put(`/api/employee/${otherEmployee._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Hacked'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/employee/update_profile_by_self', () => {
    test('should allow employee to update their own profile', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        first_name: 'Old'
      });
      const token = generateTestToken(employee);

      const response = await request(app)
        .patch('/api/employee/update_profile_by_self')
        .set('Authorization', `Bearer ${token}`)
        .send({
          first_name: 'Updated',
          phone: '+9876543210'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/employee/designation', () => {
    test('should get all designations', async () => {
      const employee = await createTestUser();
      const token = generateTestToken(employee);

      const response = await request(app)
        .get('/api/employee/designation')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.designations)).toBe(true);
    });
  });

  describe('GET /api/employee/department', () => {
    test('should get all departments', async () => {
      const employee = await createTestUser();
      const token = generateTestToken(employee);

      const response = await request(app)
        .get('/api/employee/department')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.departments)).toBe(true);
    });
  });

  describe('PATCH /api/employee/:id (soft delete)', () => {
    test('should soft delete employee as admin', async () => {
      const admin = await createTestAdmin();
      const employee = await createTestUser({ email: 'emp@example.com' });
      const token = generateTestToken(admin);

      const response = await request(app)
        .patch(`/api/employee/${employee._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject soft delete for non-admin/hr users', async () => {
      const employee = await createTestUser({ email: 'emp@example.com' });
      const otherEmployee = await createTestUser({ email: 'other@example.com' });
      const token = generateTestToken(employee);

      const response = await request(app)
        .patch(`/api/employee/${otherEmployee._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });
});
