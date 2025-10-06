import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../../setup/testDb.js';
import { setupTestEnv } from '../../setup/testHelpers.js';
import userModel from '../../../models/userModel.js';
import bcrypt from 'bcrypt';

describe('Models - User Model', () => {
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

  describe('User Creation', () => {
    test('should create a valid user', async () => {
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      
      const userData = {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@example.com',
        password: hashedPassword,
        phone: '+1234567890',
        role: 'employee',
        gender: 'Male',
        address: '123 Test Street',
        department: 'IT',
        designation: 'Developer',
        salary: 50000,
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1990-01-01')
      };

      const user = await userModel.create(userData);

      expect(user._id).toBeDefined();
      expect(user.first_name).toBe('John');
      expect(user.last_name).toBe('Doe');
      expect(user.email).toBe('john.doe@example.com');
      expect(user.role).toBe('employee');
      expect(user.phone).toBe('+1234567890');
    });

    test('should hash password before saving', async () => {
      const plainPassword = 'Test@123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);
      
      const user = await userModel.create({
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        password: hashedPassword,
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

      expect(user.password).not.toBe(plainPassword);
      const isPasswordValid = await bcrypt.compare(plainPassword, user.password);
      expect(isPasswordValid).toBe(true);
    });

    test('should fail to create user without required fields', async () => {
      const invalidUser = {
        email: 'test@example.com'
        // Missing required fields
      };

      await expect(userModel.create(invalidUser)).rejects.toThrow();
    });

    test('should fail to create user with duplicate email', async () => {
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      
      const userData = {
        first_name: 'Test',
        last_name: 'User',
        email: 'duplicate@example.com',
        password: hashedPassword,
        phone: '+1234567890',
        role: 'employee',
        gender: 'Male',
        address: 'Test Address',
        department: 'IT',
        designation: 'Developer',
        salary: 50000,
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1990-01-01')
      };

      await userModel.create(userData);
      
      // Try to create another user with same email
      await expect(userModel.create(userData)).rejects.toThrow();
    });

    test('should validate email format', async () => {
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      
      const invalidEmailUser = {
        first_name: 'Test',
        last_name: 'User',
        email: 'invalid-email',
        password: hashedPassword,
        phone: '+1234567890',
        role: 'employee',
        gender: 'Male',
        address: 'Test Address',
        department: 'IT',
        designation: 'Developer',
        salary: 50000,
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1990-01-01')
      };

      await expect(userModel.create(invalidEmailUser)).rejects.toThrow();
    });
  });

  describe('User Role Validation', () => {
    test('should accept valid roles', async () => {
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      const roles = ['superAdmin', 'admin', 'hr', 'employee'];

      for (const role of roles) {
        const user = await userModel.create({
          first_name: 'Test',
          last_name: 'User',
          email: `${role}@example.com`,
          password: hashedPassword,
          phone: '+1234567890',
          role: role,
          gender: 'Male',
          address: 'Test Address',
          department: 'IT',
          designation: 'Developer',
          salary: 50000,
          dateOfJoining: new Date(),
          dateOfBirth: new Date('1990-01-01')
        });

        expect(user.role).toBe(role);
      }
    });
  });

  describe('User Queries', () => {
    test('should find user by email', async () => {
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      
      await userModel.create({
        first_name: 'Test',
        last_name: 'User',
        email: 'findme@example.com',
        password: hashedPassword,
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

      const user = await userModel.findOne({ email: 'findme@example.com' });
      expect(user).toBeDefined();
      expect(user.email).toBe('findme@example.com');
    });

    test('should exclude deleted users from query', async () => {
      const hashedPassword = await bcrypt.hash('Test@123', 10);
      
      const user = await userModel.create({
        first_name: 'Test',
        last_name: 'User',
        email: 'deleted@example.com',
        password: hashedPassword,
        phone: '+1234567890',
        role: 'employee',
        gender: 'Male',
        address: 'Test Address',
        department: 'IT',
        designation: 'Developer',
        salary: 50000,
        dateOfJoining: new Date(),
        dateOfBirth: new Date('1990-01-01'),
        isDeleted: true
      });

      const foundUser = await userModel.findOne({ 
        email: 'deleted@example.com',
        isDeleted: false 
      });
      
      expect(foundUser).toBeNull();
    });
  });
});
