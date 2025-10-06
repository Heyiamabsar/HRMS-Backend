import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import app from '../../../server.js';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../../setup/testDb.js';
import { setupTestEnv } from '../../setup/testHelpers.js';

describe('Integration - End-to-End User Journey', () => {
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

  describe('Complete Employee Lifecycle', () => {
    test('should complete full employee workflow: register -> login -> check-in -> apply leave -> check-out', async () => {
      // Step 1: Register a super admin
      const superAdminPassword = 'SuperAdmin@123';
      const superAdminData = {
        first_name: 'Super',
        last_name: 'Admin',
        email: 'superadmin@company.com',
        password: superAdminPassword,
        phone: '+1234567890',
        role: 'superAdmin',
        gender: 'Male',
        address: 'Admin Office',
        department: 'Management',
        designation: 'Super Admin',
        salary: 100000,
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1980-01-01')
      };

      // Login as super admin (first we need to create the super admin directly)
      // Since registration requires authentication, we'll create user directly in DB
      const bcrypt = (await import('bcrypt')).default;
      const userModel = (await import('../../../models/userModel.js')).default;
      
      const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
      const superAdmin = await userModel.create({
        ...superAdminData,
        password: hashedPassword
      });

      // Step 2: Super admin logs in
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'superadmin@company.com',
          password: superAdminPassword
        });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      const superAdminToken = loginResponse.body.accessToken;

      // Step 3: Super admin registers a new employee
      const employeeData = {
        first_name: 'John',
        last_name: 'Employee',
        email: 'john.employee@company.com',
        password: 'Employee@123',
        phone: '+9876543210',
        role: 'employee',
        gender: 'Male',
        address: 'Employee Street',
        department: 'IT',
        designation: 'Developer',
        salary: 60000,
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1995-06-15'),
        timeZone: 'Asia/Kolkata'
      };

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send(employeeData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);

      // Step 4: Employee logs in
      const employeeLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john.employee@company.com',
          password: 'Employee@123'
        });

      expect(employeeLoginResponse.status).toBe(200);
      const employeeToken = employeeLoginResponse.body.accessToken;
      const employeeId = employeeLoginResponse.body.user._id;

      // Step 5: Employee checks in
      const checkInResponse = await request(app)
        .post('/api/attendance/check-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          latitude: 19.1872137,
          longitude: 77.3169113
        });

      expect(checkInResponse.status).toBe(200);
      expect(checkInResponse.body.success).toBe(true);

      // Step 6: Employee views their profile
      const profileResponse = await request(app)
        .get(`/api/employee/${employeeId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.user.email).toBe('john.employee@company.com');

      // Step 7: Employee applies for leave
      const moment = (await import('moment')).default;
      const leaveResponse = await request(app)
        .post('/api/leaves')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          leaveType: 'Sick Leave',
          fromDate: moment().add(5, 'days').format('YYYY-MM-DD'),
          toDate: moment().add(7, 'days').format('YYYY-MM-DD'),
          reason: 'Medical appointment',
          halfDay: false
        });

      expect(leaveResponse.status).toBe(201);
      expect(leaveResponse.body.success).toBe(true);
      const leaveId = leaveResponse.body.leave._id;

      // Step 8: Super admin views and approves the leave
      const leaveListResponse = await request(app)
        .get('/api/leaves')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(leaveListResponse.status).toBe(200);
      expect(leaveListResponse.body.leaves).toBeDefined();

      const approveLeaveResponse = await request(app)
        .patch(`/api/leaves/${leaveId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          status: 'Approved'
        });

      expect(approveLeaveResponse.status).toBe(200);
      expect(approveLeaveResponse.body.leave.status).toBe('Approved');

      // Step 9: Employee checks out
      const checkOutResponse = await request(app)
        .post('/api/attendance/check-out')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          latitude: 19.1872137,
          longitude: 77.3169113
        });

      expect(checkOutResponse.status).toBe(200);
      expect(checkOutResponse.body.success).toBe(true);

      // Step 10: Super admin views employee attendance
      const attendanceResponse = await request(app)
        .get(`/api/attendance/${employeeId}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(attendanceResponse.status).toBe(200);
      expect(attendanceResponse.body.attendances).toBeDefined();
      expect(attendanceResponse.body.attendances.length).toBeGreaterThan(0);

      // Step 11: Employee logs out
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', employeeLoginResponse.headers['set-cookie']);

      expect(logoutResponse.status).toBe(200);
    });

    test('should handle complete admin workflow: create multiple employees -> view reports', async () => {
      const bcrypt = (await import('bcrypt')).default;
      const userModel = (await import('../../../models/userModel.js')).default;
      
      // Create admin
      const adminPassword = 'Admin@123';
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await userModel.create({
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin@company.com',
        password: hashedPassword,
        phone: '+1111111111',
        role: 'admin',
        gender: 'Male',
        address: 'Admin Office',
        department: 'HR',
        designation: 'HR Manager',
        salary: 80000,
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1985-01-01')
      });

      // Admin login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@company.com',
          password: adminPassword
        });

      const adminToken = loginResponse.body.accessToken;

      // Register multiple employees
      const employees = [
        { email: 'emp1@company.com', first_name: 'Employee', last_name: 'One' },
        { email: 'emp2@company.com', first_name: 'Employee', last_name: 'Two' },
        { email: 'emp3@company.com', first_name: 'Employee', last_name: 'Three' }
      ];

      for (const emp of employees) {
        const response = await request(app)
          .post('/api/auth/register')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            first_name: emp.first_name,
            last_name: emp.last_name,
            email: emp.email,
            password: 'Employee@123',
            phone: '+' + Math.floor(1000000000 + Math.random() * 9000000000),
            role: 'employee',
            gender: 'Male',
            address: 'Employee Address',
            department: 'IT',
            designation: 'Developer',
            salary: 50000,
            dateOfJoining: new Date(),
            dateOfBirth: new Date('1990-01-01')
          });

        expect(response.status).toBe(201);
      }

      // Admin views all employees
      const employeesResponse = await request(app)
        .get('/api/employee')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(employeesResponse.status).toBe(200);
      expect(employeesResponse.body.users.length).toBeGreaterThanOrEqual(3);

      // Admin views departments
      const departmentsResponse = await request(app)
        .get('/api/employee/department')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(departmentsResponse.status).toBe(200);
      expect(departmentsResponse.body.departments).toBeDefined();

      // Admin views designations
      const designationsResponse = await request(app)
        .get('/api/employee/designation')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(designationsResponse.status).toBe(200);
      expect(designationsResponse.body.designations).toBeDefined();
    });
  });

  describe('Security and Access Control', () => {
    test('should prevent unauthorized access across all endpoints', async () => {
      // Try to access protected endpoints without authentication
      const endpoints = [
        { method: 'get', path: '/api/employee' },
        { method: 'get', path: '/api/attendance' },
        { method: 'get', path: '/api/leaves' },
        { method: 'post', path: '/api/auth/register' }
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)[endpoint.method](endpoint.path);
        expect(response.status).toBe(401);
      }
    });

    test('should prevent employee from accessing admin-only endpoints', async () => {
      const bcrypt = (await import('bcrypt')).default;
      const userModel = (await import('../../../models/userModel.js')).default;
      
      const employeePassword = 'Employee@123';
      const hashedPassword = await bcrypt.hash(employeePassword, 10);
      await userModel.create({
        first_name: 'Regular',
        last_name: 'Employee',
        email: 'regular@company.com',
        password: hashedPassword,
        phone: '+2222222222',
        role: 'employee',
        gender: 'Male',
        address: 'Employee Address',
        department: 'IT',
        designation: 'Developer',
        salary: 50000,
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1990-01-01')
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'regular@company.com',
          password: employeePassword
        });

      const employeeToken = loginResponse.body.accessToken;

      // Try to access admin-only endpoints
      const adminEndpoints = [
        { method: 'get', path: '/api/employee' },
        { method: 'get', path: '/api/attendance' },
        { method: 'get', path: '/api/leaves' }
      ];

      for (const endpoint of adminEndpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .set('Authorization', `Bearer ${employeeToken}`);
        
        expect(response.status).toBe(403);
      }
    });
  });
});
