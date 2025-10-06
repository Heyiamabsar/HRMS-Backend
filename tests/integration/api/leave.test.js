import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../../server.js';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../../setup/testDb.js';
import { setupTestEnv, createTestUser, createTestAdmin, generateTestToken } from '../../setup/testHelpers.js';
import LeaveModel from '../../../models/leaveModel.js';
import moment from 'moment';

describe('Integration - Leave API', () => {
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

  describe('POST /api/leaves', () => {
    test('should apply for leave successfully', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com'
      });
      const token = generateTestToken(employee);

      const fromDate = moment().add(1, 'days').format('YYYY-MM-DD');
      const toDate = moment().add(3, 'days').format('YYYY-MM-DD');

      const response = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${token}`)
        .send({
          leaveType: 'Sick Leave',
          fromDate,
          toDate,
          reason: 'Not feeling well',
          halfDay: false
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.leave).toBeDefined();
    });

    test('should reject leave application without required fields', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com'
      });
      const token = generateTestToken(employee);

      const response = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${token}`)
        .send({
          leaveType: 'Sick Leave'
          // Missing fromDate, toDate, reason
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/leaves', () => {
    test('should get all leaves as admin', async () => {
      const admin = await createTestAdmin();
      const token = generateTestToken(admin);

      const response = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.leaves)).toBe(true);
    });

    test('should reject access for non-admin/hr users', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        role: 'employee' 
      });
      const token = generateTestToken(employee);

      const response = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/leaves/:id', () => {
    test('should get leave by id', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com'
      });
      const token = generateTestToken(employee);

      const leave = await LeaveModel.create({
        userId: employee._id,
        leaveType: 'Sick Leave',
        fromDate: moment().add(1, 'days').toDate(),
        toDate: moment().add(3, 'days').toDate(),
        reason: 'Not feeling well',
        status: 'Pending'
      });

      const response = await request(app)
        .get(`/api/leaves/${leave._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leave).toBeDefined();
    });
  });

  describe('PATCH /api/leaves/:id', () => {
    test('should approve leave as admin', async () => {
      const admin = await createTestAdmin();
      const employee = await createTestUser({ 
        email: 'emp@example.com'
      });
      const adminToken = generateTestToken(admin);

      const leave = await LeaveModel.create({
        userId: employee._id,
        leaveType: 'Sick Leave',
        fromDate: moment().add(1, 'days').toDate(),
        toDate: moment().add(3, 'days').toDate(),
        reason: 'Not feeling well',
        status: 'Pending'
      });

      const response = await request(app)
        .patch(`/api/leaves/${leave._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Approved'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leave.status).toBe('Approved');
    });

    test('should reject leave as admin', async () => {
      const admin = await createTestAdmin();
      const employee = await createTestUser({ 
        email: 'emp@example.com'
      });
      const adminToken = generateTestToken(admin);

      const leave = await LeaveModel.create({
        userId: employee._id,
        leaveType: 'Sick Leave',
        fromDate: moment().add(1, 'days').toDate(),
        toDate: moment().add(3, 'days').toDate(),
        reason: 'Not feeling well',
        status: 'Pending'
      });

      const response = await request(app)
        .patch(`/api/leaves/${leave._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'Rejected'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.leave.status).toBe('Rejected');
    });

    test('should reject approval for non-admin/hr users', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        role: 'employee' 
      });
      const token = generateTestToken(employee);

      const leave = await LeaveModel.create({
        userId: employee._id,
        leaveType: 'Sick Leave',
        fromDate: moment().add(1, 'days').toDate(),
        toDate: moment().add(3, 'days').toDate(),
        reason: 'Not feeling well',
        status: 'Pending'
      });

      const response = await request(app)
        .patch(`/api/leaves/${leave._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          status: 'Approved'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/leaves/:id', () => {
    test('should delete leave as employee', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com'
      });
      const token = generateTestToken(employee);

      const leave = await LeaveModel.create({
        userId: employee._id,
        leaveType: 'Sick Leave',
        fromDate: moment().add(1, 'days').toDate(),
        toDate: moment().add(3, 'days').toDate(),
        reason: 'Not feeling well',
        status: 'Pending'
      });

      const response = await request(app)
        .delete(`/api/leaves/${leave._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
