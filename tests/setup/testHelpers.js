import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import userModel from '../../models/userModel.js';
import departmentModel from '../../models/departmentModel.js';
import designationModel from '../../models/designationModel.js';
import branchModel from '../../models/branchModel.js';

// Default test environment variables
export const testEnv = {
  JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
  ACCESS_TOKEN_SECRET: 'test-access-token-secret',
  REFRESH_TOKEN_SECRET: 'test-refresh-token-secret',
  ACCESS_TOKEN_EXPIRY: '9h',
  REFRESH_TOKEN_EXPIRY: '15d',
  NODE_ENV: 'test'
};

// Set test environment variables
export const setupTestEnv = () => {
  Object.keys(testEnv).forEach(key => {
    process.env[key] = testEnv[key];
  });
};

// Generate test tokens
export const generateTestToken = (user) => {
  return jwt.sign(
    { _id: user._id, role: user.role, email: user.email, isDeleted: user.isDeleted || false },
    process.env.ACCESS_TOKEN_SECRET || testEnv.ACCESS_TOKEN_SECRET,
    { expiresIn: '9h' }
  );
};

// Create test user
export const createTestUser = async (userData = {}) => {
  const hashedPassword = await bcrypt.hash(userData.password || 'Test@123', 10);
  
  const defaultUser = {
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
    dateOfBirth: new Date('1990-01-01'),
    ...userData
  };

  const user = await userModel.create(defaultUser);
  return user;
};

// Create test super admin
export const createTestSuperAdmin = async () => {
  return createTestUser({
    email: 'superadmin@example.com',
    role: 'superAdmin',
    first_name: 'Super',
    last_name: 'Admin'
  });
};

// Create test admin
export const createTestAdmin = async () => {
  return createTestUser({
    email: 'admin@example.com',
    role: 'admin',
    first_name: 'Test',
    last_name: 'Admin'
  });
};

// Create test HR
export const createTestHR = async () => {
  return createTestUser({
    email: 'hr@example.com',
    role: 'hr',
    first_name: 'Test',
    last_name: 'HR'
  });
};

// Create test department
export const createTestDepartment = async (name = 'IT') => {
  const department = await departmentModel.create({ name });
  return department;
};

// Create test designation
export const createTestDesignation = async (name = 'Developer') => {
  const designation = await designationModel.create({ name });
  return designation;
};

// Create test branch
export const createTestBranch = async (branchData = {}) => {
  const defaultBranch = {
    branchName: 'Test Branch',
    address: 'Test Address',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    zipCode: '12345',
    phone: '+1234567890',
    email: 'branch@example.com',
    ...branchData
  };

  const branch = await branchModel.create(defaultBranch);
  return branch;
};

// Mock request and response objects for testing controllers
export const mockRequest = (data = {}) => {
  return {
    body: data.body || {},
    params: data.params || {},
    query: data.query || {},
    headers: data.headers || {},
    user: data.user || null,
    cookies: data.cookies || {},
    header: (name) => data.headers?.[name] || null,
    ...data
  };
};

export const mockResponse = () => {
  const res = {
    statusCode: 200,
    data: null,
    cookies: {},
  };
  
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockImplementation((data) => {
    res.data = data;
    return res;
  });
  res.send = jest.fn().mockImplementation((data) => {
    res.data = data;
    return res;
  });
  res.cookie = jest.fn().mockImplementation((name, value, options) => {
    res.cookies[name] = { value, options };
    return res;
  });
  res.clearCookie = jest.fn().mockImplementation((name) => {
    delete res.cookies[name];
    return res;
  });
  
  return res;
};

export const mockNext = () => jest.fn();
