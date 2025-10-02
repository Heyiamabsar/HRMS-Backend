# HRMS Backend - Quick Test Guide

## Testing Infrastructure Setup Complete! ✅

This project now has a comprehensive testing infrastructure with:
- ✅ Jest testing framework configured
- ✅ Unit tests for utilities
- ✅ Unit tests for middleware
- ✅ Unit tests for models
- ✅ Integration tests for API endpoints
- ✅ Test helpers and utilities
- ✅ MongoDB Memory Server for isolated testing

## Quick Start

### 1. Install Dependencies (Already Done)
```bash
npm install
```

### 2. Run Tests

**All Tests:**
```bash
npm test
```

**Unit Tests Only:**
```bash
npm run test:unit
```

**Integration Tests Only:**
```bash
npm run test:integration
```

**Watch Mode (for development):**
```bash
npm run test:watch
```

**Coverage Report:**
```bash
npm run test:coverage
```

## Test Structure

```
tests/
├── setup/
│   ├── testDb.js              # Database setup utilities
│   └── testHelpers.js         # Helper functions & fixtures
├── unit/
│   ├── models/
│   │   └── user.test.js       # User model tests
│   ├── middleware/
│   │   └── auth.test.js       # Auth middleware tests
│   └── utils/
│       └── commonUtils.test.js # Utility tests (No DB required!)
└── integration/
    └── api/
        ├── auth.test.js       # Authentication API tests
        ├── employee.test.js   # Employee API tests
        ├── attendance.test.js # Attendance API tests
        └── leave.test.js      # Leave API tests
```

## Current Test Coverage

### Unit Tests
- ✅ **commonUtils** (4 tests) - Testing utility functions
- ✅ **auth middleware** (8 tests) - Testing authentication & authorization
- ✅ **user model** (8 tests) - Testing user data validation

### Integration Tests
- ✅ **auth API** (10 tests) - Login, register, logout, refresh token
- ✅ **employee API** (10 tests) - CRUD operations with role-based access
- ✅ **attendance API** (8 tests) - Check-in, check-out, attendance records
- ✅ **leave API** (8 tests) - Leave application, approval, rejection

**Total: 56 tests covering critical functionality**

## MongoDB Memory Server Setup

The tests use MongoDB Memory Server for isolated database testing. On first run, it needs to download MongoDB binaries.

### If Download Fails (Network Restrictions)

If you see errors like "Download failed for url fastdl.mongodb.org", you can:

**Option 1: Pre-download MongoDB Binary**
```bash
# Download MongoDB manually and set path
export MONGOMS_DOWNLOAD_DIR=~/.cache/mongodb-binaries
export MONGOMS_VERSION=7.0.14
export MONGOMS_DOWNLOAD_URL=https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-ubuntu2204-7.0.14.tgz

# Then run tests
npm test
```

**Option 2: Use System MongoDB**
If you have MongoDB installed locally, you can modify the test setup to use it instead of in-memory database.

**Option 3: Skip Database Tests**
Run only tests that don't require database:
```bash
npm run test:unit -- tests/unit/utils
```

## Test Examples

### 1. Simple Unit Test (No Database)
```javascript
// tests/unit/utils/commonUtils.test.js
test('should add isDeleted filter', () => {
  const result = withoutDeletedUsers({ email: 'test@example.com' });
  expect(result).toEqual({ 
    email: 'test@example.com',
    isDeleted: false 
  });
});
```

### 2. Model Test (With Database)
```javascript
// tests/unit/models/user.test.js
test('should create a valid user', async () => {
  const user = await userModel.create(validUserData);
  expect(user._id).toBeDefined();
  expect(user.email).toBe('test@example.com');
});
```

### 3. API Integration Test
```javascript
// tests/integration/api/auth.test.js
test('should login with valid credentials', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@example.com', password: 'Test@123' });
  
  expect(response.status).toBe(200);
  expect(response.body.accessToken).toBeDefined();
});
```

## Test Scripts Explained

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests (unit + integration) |
| `npm run test:unit` | Run only unit tests |
| `npm run test:integration` | Run only integration tests |
| `npm run test:watch` | Run tests in watch mode (auto-rerun on changes) |
| `npm run test:coverage` | Generate coverage report |

## Coverage Goals

- Overall: 70%+
- Controllers: 70%+
- Models: 80%+
- Middleware: 80%+
- Utils: 75%+

## Adding New Tests

1. Create a new file in the appropriate directory:
   - Unit tests: `tests/unit/{category}/{name}.test.js`
   - Integration tests: `tests/integration/api/{name}.test.js`

2. Use the test template:
```javascript
import { describe, test, expect } from '@jest/globals';

describe('Feature Name', () => {
  test('should do something', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = someFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## Troubleshooting

### Tests Timeout
- Increase timeout in jest.config.js
- Check for hanging database connections

### MongoDB Connection Issues
- Ensure MongoDB Memory Server can download binaries
- Or use local MongoDB installation
- Or run tests that don't require DB

### Import Errors
- All files use ES modules (import/export)
- Jest is configured with NODE_OPTIONS=--experimental-vm-modules
- Ensure all imports include .js extension

## CI/CD Integration

Tests are ready for CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run Tests
  run: npm test
  
- name: Upload Coverage
  run: npm run test:coverage
```

## What's Tested

### Authentication & Authorization ✅
- Login with valid/invalid credentials
- Token generation and validation
- Role-based access control
- Refresh token flow
- User registration

### Employee Management ✅
- Get all employees (admin/HR only)
- Get employee by ID
- Update employee data
- Soft delete employees
- Employee self-profile update

### Attendance System ✅
- Check-in with location
- Check-out with location
- Attendance record retrieval
- Duplicate check-in prevention

### Leave Management ✅
- Leave application
- Leave approval/rejection
- Leave record retrieval
- Leave deletion

### Data Models ✅
- User model validation
- Email uniqueness
- Password hashing
- Role validation

### Utilities ✅
- Common utility functions
- Filter helpers
- Data transformations

## Next Steps

1. ✅ Test infrastructure is complete
2. ✅ Core functionality is tested
3. 📋 Additional tests can be added for:
   - Payroll generation
   - Holiday management
   - Report generation
   - File uploads
   - Email notifications (with mocks)

## Documentation

For detailed testing documentation, see [TESTING.md](./TESTING.md)

## Summary

🎉 **56 comprehensive tests** are now in place covering:
- Authentication & Authorization
- Employee CRUD operations
- Attendance tracking
- Leave management
- Data validation
- Role-based access control

Run `npm test` to execute all tests!
