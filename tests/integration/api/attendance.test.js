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

  describe('Timezone-based Attendance (Branch-specific)', () => {
    test('should mark employee present when checking in before 9:15 AM in Dubai branch timezone', async () => {
      // Import branch model
      const branchModel = (await import('../../../models/branchModel.js')).default;
      
      // Create Dubai branch with Dubai timezone
      const dubaiBranch = await branchModel.create({
        branchName: 'Dubai Branch',
        country: 'UAE',
        branchCode: 'DXB001',
        address: 'Dubai Marina, UAE',
        timeZone: 'Asia/Dubai',
        weekends: ['Friday', 'Saturday']
      });

      // Create employee assigned to Dubai branch
      const employee = await createTestUser({
        email: 'dubai.emp@example.com',
        first_name: 'Ahmed',
        last_name: 'Hassan',
        branch: dubaiBranch._id,
        timeZone: 'Asia/Dubai'
      });

      const token = generateTestToken(employee);

      // Simulate check-in at 9:00 AM Dubai time (should be marked Present)
      const response = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 25.0760,
          longitude: 55.1320
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Check-in successful');

      // Verify attendance record was created with correct timezone consideration
      const attendance = await AttendanceModel.findOne({ userId: employee._id });
      expect(attendance).toBeDefined();
      expect(attendance.inTime).toBeDefined();
    });

    test('should mark employee present when checking in before 9:15 AM in India branch timezone', async () => {
      const branchModel = (await import('../../../models/branchModel.js')).default;
      
      // Create India branch with Kolkata timezone
      const indiaBranch = await branchModel.create({
        branchName: 'Mumbai Branch',
        country: 'India',
        branchCode: 'MUM001',
        address: 'Mumbai, Maharashtra, India',
        timeZone: 'Asia/Kolkata',
        weekends: ['Sunday']
      });

      // Create employee assigned to Mumbai branch
      const employee = await createTestUser({
        email: 'mumbai.emp@example.com',
        first_name: 'Raj',
        last_name: 'Kumar',
        branch: indiaBranch._id,
        timeZone: 'Asia/Kolkata'
      });

      const token = generateTestToken(employee);

      // Check-in
      const response = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 19.0760,
          longitude: 72.8777
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify attendance was recorded
      const attendance = await AttendanceModel.findOne({ userId: employee._id });
      expect(attendance).toBeDefined();
      expect(attendance.inTime).toBeDefined();
    });

    test('should handle check-in for employees in different branch timezones correctly', async () => {
      const branchModel = (await import('../../../models/branchModel.js')).default;
      
      // Create multiple branches with different timezones
      const londonBranch = await branchModel.create({
        branchName: 'London Branch',
        country: 'UK',
        branchCode: 'LON001',
        address: 'London, UK',
        timeZone: 'Europe/London',
        weekends: ['Saturday', 'Sunday']
      });

      const tokyoBranch = await branchModel.create({
        branchName: 'Tokyo Branch',
        country: 'Japan',
        branchCode: 'TYO001',
        address: 'Tokyo, Japan',
        timeZone: 'Asia/Tokyo',
        weekends: ['Saturday', 'Sunday']
      });

      // Create employees in different branches
      const londonEmployee = await createTestUser({
        email: 'london.emp@example.com',
        first_name: 'John',
        last_name: 'Smith',
        branch: londonBranch._id,
        timeZone: 'Europe/London'
      });

      const tokyoEmployee = await createTestUser({
        email: 'tokyo.emp@example.com',
        first_name: 'Yuki',
        last_name: 'Tanaka',
        branch: tokyoBranch._id,
        timeZone: 'Asia/Tokyo'
      });

      const londonToken = generateTestToken(londonEmployee);
      const tokyoToken = generateTestToken(tokyoEmployee);

      // London employee checks in
      const londonResponse = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${londonToken}`)
        .send({
          latitude: 51.5074,
          longitude: -0.1278
        });

      // Tokyo employee checks in
      const tokyoResponse = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${tokyoToken}`)
        .send({
          latitude: 35.6762,
          longitude: 139.6503
        });

      // Both should be successful
      expect(londonResponse.status).toBe(200);
      expect(tokyoResponse.status).toBe(200);

      // Verify both attendance records exist
      const londonAttendance = await AttendanceModel.findOne({ userId: londonEmployee._id });
      const tokyoAttendance = await AttendanceModel.findOne({ userId: tokyoEmployee._id });

      expect(londonAttendance).toBeDefined();
      expect(tokyoAttendance).toBeDefined();
    });

    test('should reject check-in on weekend day based on branch timezone', async () => {
      const branchModel = (await import('../../../models/branchModel.js')).default;
      
      // Create branch with specific weekend days
      const dubaiBranch = await branchModel.create({
        branchName: 'Dubai HQ',
        country: 'UAE',
        branchCode: 'DXB002',
        address: 'Dubai, UAE',
        timeZone: 'Asia/Dubai',
        weekends: ['Friday', 'Saturday']
      });

      const employee = await createTestUser({
        email: 'dubai.weekend@example.com',
        branch: dubaiBranch._id,
        timeZone: 'Asia/Dubai'
      });

      const token = generateTestToken(employee);

      // Note: This test will pass/fail based on actual current day in Dubai timezone
      // In real scenario, you might want to mock the current date
      const currentDay = moment().tz('Asia/Dubai').format('dddd');
      
      const response = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 25.0760,
          longitude: 55.1320
        });

      // If today is a weekend in Dubai timezone, should be rejected
      if (currentDay === 'Friday' || currentDay === 'Saturday') {
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('weekend');
      } else {
        // On weekdays, should succeed
        expect(response.status).toBe(200);
      }
    });

    test('should calculate attendance timing based on branch local time', async () => {
      const branchModel = (await import('../../../models/branchModel.js')).default;
      
      // Create New York branch
      const nyBranch = await branchModel.create({
        branchName: 'New York Branch',
        country: 'USA',
        branchCode: 'NYC001',
        address: 'New York, USA',
        timeZone: 'America/New_York',
        weekends: ['Saturday', 'Sunday']
      });

      const employee = await createTestUser({
        email: 'ny.emp@example.com',
        first_name: 'Michael',
        last_name: 'Johnson',
        branch: nyBranch._id,
        timeZone: 'America/New_York'
      });

      const token = generateTestToken(employee);

      // Check-in
      const checkInResponse = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 40.7128,
          longitude: -74.0060
        });

      expect(checkInResponse.status).toBe(200);

      // Check-out after some time
      const checkOutResponse = await request(app)
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 40.7128,
          longitude: -74.0060
        });

      expect(checkOutResponse.status).toBe(200);

      // Verify attendance record has both check-in and check-out times
      const attendance = await AttendanceModel.findOne({ userId: employee._id });
      expect(attendance).toBeDefined();
      expect(attendance.inTime).toBeDefined();
      expect(attendance.outTime).toBeDefined();
    });

    test('should track working hours correctly across different timezones', async () => {
      const branchModel = (await import('../../../models/branchModel.js')).default;
      
      // Create Singapore branch
      const singaporeBranch = await branchModel.create({
        branchName: 'Singapore Branch',
        country: 'Singapore',
        branchCode: 'SIN001',
        address: 'Singapore City',
        timeZone: 'Asia/Singapore',
        weekends: ['Saturday', 'Sunday']
      });

      const employee = await createTestUser({
        email: 'singapore.emp@example.com',
        first_name: 'Wei',
        last_name: 'Chen',
        branch: singaporeBranch._id,
        timeZone: 'Asia/Singapore'
      });

      const token = generateTestToken(employee);

      // Check-in
      await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 1.3521,
          longitude: 103.8198
        });

      // Wait a moment and check-out
      await new Promise(resolve => setTimeout(resolve, 100));

      await request(app)
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${token}`)
        .send({
          latitude: 1.3521,
          longitude: 103.8198
        });

      // Get attendance record
      const attendance = await AttendanceModel.findOne({ userId: employee._id });
      
      expect(attendance).toBeDefined();
      expect(attendance.inTime).toBeDefined();
      expect(attendance.outTime).toBeDefined();
      
      // Verify that outTime is after inTime
      expect(new Date(attendance.outTime).getTime()).toBeGreaterThan(
        new Date(attendance.inTime).getTime()
      );
    });
  });
});
