import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../../server.js';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../../setup/testDb.js';
import { setupTestEnv, createTestUser, createTestAdmin, generateTestToken } from '../../setup/testHelpers.js';
import AttendanceModel from '../../../models/attendanceModule.js';
import moment from 'moment-timezone';

describe('Integration - Attendance API', () => {
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

  describe('POST /api/attendance/check-in', () => {
    test('should check-in employee successfully', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        timeZone: 'Asia/Kolkata'
      });
      const token = generateTestToken(employee);

      const response = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 19.1872137,
          longitude: 77.3169113
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Check-in successful');
    });

    test('should reject check-in without location', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        timeZone: 'Asia/Kolkata'
      });
      const token = generateTestToken(employee);

      const response = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject duplicate check-in on same day', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        timeZone: 'Asia/Kolkata'
      });
      const token = generateTestToken(employee);

      // First check-in
      await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 19.1872137,
          longitude: 77.3169113
        });

      // Try to check-in again
      const response = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 19.1872137,
          longitude: 77.3169113
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already checked in');
    });
  });

  describe('POST /api/attendance/check-out', () => {
    test('should check-out employee successfully', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        timeZone: 'Asia/Kolkata'
      });
      const token = generateTestToken(employee);

      // First check-in
      await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 19.1872137,
          longitude: 77.3169113
        });

      // Then check-out
      const response = await request(app)
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 19.1872137,
          longitude: 77.3169113
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Check-out successful');
    });

    test('should reject check-out without check-in', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        timeZone: 'Asia/Kolkata'
      });
      const token = generateTestToken(employee);

      const response = await request(app)
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 19.1872137,
          longitude: 77.3169113
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('check-in record');
    });
  });

  describe('GET /api/attendance/:userId', () => {
    test('should get attendance records for user', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        timeZone: 'Asia/Kolkata'
      });
      const admin = await createTestAdmin();
      const adminToken = generateTestToken(admin);

      // Create attendance record
      await AttendanceModel.create({
        userId: employee._id,
        date: moment().format('YYYY-MM-DD'),
        inTime: new Date(),
        todayStatus: 'Present'
      });

      const response = await request(app)
        .get(`/api/attendance/${employee._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.attendances)).toBe(true);
    });

    test('should allow employee to get their own attendance', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        timeZone: 'Asia/Kolkata'
      });
      const token = generateTestToken(employee);

      const response = await request(app)
        .get(`/api/attendance/${employee._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/attendance', () => {
    test('should get all attendance records as admin', async () => {
      const admin = await createTestAdmin();
      const token = generateTestToken(admin);

      const response = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    test('should reject access for non-admin/hr users', async () => {
      const employee = await createTestUser({ 
        email: 'emp@example.com',
        role: 'employee' 
      });
      const token = generateTestToken(employee);

      const response = await request(app)
        .get('/api/attendance')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
    });
  });
});
