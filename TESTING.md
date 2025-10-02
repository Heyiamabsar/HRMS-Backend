# HRMS Backend - Testing Documentation

## Overview
This document provides comprehensive information about the testing infrastructure implemented for the HRMS Backend application.

## Test Structure

```
tests/
├── setup/
│   ├── testDb.js           # Database setup for tests
│   └── testHelpers.js      # Helper functions and utilities
├── unit/
│   ├── models/
│   │   └── user.test.js    # User model tests
│   ├── middleware/
│   │   └── auth.test.js    # Authentication middleware tests
│   └── utils/
│       └── commonUtils.test.js  # Utility function tests
└── integration/
    └── api/
        ├── auth.test.js        # Authentication API tests
        ├── employee.test.js    # Employee API tests
        ├── attendance.test.js  # Attendance API tests
        └── leave.test.js       # Leave API tests
```

## Testing Stack

- **Jest**: Testing framework
- **Supertest**: HTTP assertions for API testing
- **MongoDB Memory Server**: In-memory database for isolated testing
- **@jest/globals**: Global Jest functions and types

## Setup

### Installation
All testing dependencies are already installed. If you need to reinstall:

```bash
npm install --save-dev jest supertest @jest/globals mongodb-memory-server cross-env
```

### Configuration
Testing configuration is defined in `jest.config.js`:

- **Test Environment**: Node.js
- **Test Match Pattern**: `**/tests/**/*.test.js`
- **Coverage Directory**: `coverage/`
- **Test Timeout**: 30 seconds
- **Coverage Collection**: Controllers, models, utils, middleware

## Running Tests

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

## Test Types

### 1. Unit Tests

#### Model Tests
- Test data validation
- Test schema constraints
- Test model methods
- Test virtual properties

**Example:**
```javascript
test('should create a valid user', async () => {
  const user = await userModel.create(validUserData);
  expect(user._id).toBeDefined();
  expect(user.email).toBe('test@example.com');
});
```

#### Middleware Tests
- Test authentication logic
- Test authorization logic
- Test error handling
- Test request validation

**Example:**
```javascript
test('should authenticate valid token', async () => {
  const token = generateTestToken(user);
  const req = mockRequest({ headers: { Authorization: `Bearer ${token}` } });
  await authenticate(req, res, next);
  expect(next).toHaveBeenCalled();
});
```

#### Utility Tests
- Test pure functions
- Test helper methods
- Test business logic utilities

**Example:**
```javascript
test('should add isDeleted filter', () => {
  const result = withoutDeletedUsers({ email: 'test@example.com' });
  expect(result).toEqual({ email: 'test@example.com', isDeleted: false });
});
```

### 2. Integration Tests

#### API Endpoint Tests
- Test complete request/response cycles
- Test authentication flows
- Test authorization rules
- Test data persistence
- Test error responses

**Example:**
```javascript
test('should login with valid credentials', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'user@example.com', password: 'Test@123' });
  
  expect(response.status).toBe(200);
  expect(response.body.accessToken).toBeDefined();
});
```

## Test Helpers

### Database Setup

**connectTestDB()**
- Starts MongoDB Memory Server
- Connects to in-memory database
- Use in `beforeAll` hook

**disconnectTestDB()**
- Drops test database
- Closes database connection
- Stops MongoDB Memory Server
- Use in `afterAll` hook

**clearTestDB()**
- Clears all collections
- Use in `beforeEach` hook for isolated tests

### Test Data Creation

**createTestUser(userData)**
- Creates a test employee user
- Default role: 'employee'
- Returns created user document

**createTestSuperAdmin()**
- Creates a super admin user
- Returns created user document

**createTestAdmin()**
- Creates an admin user
- Returns created user document

**createTestHR()**
- Creates an HR user
- Returns created user document

**createTestDepartment(name)**
- Creates a test department
- Returns created department document

**createTestDesignation(name)**
- Creates a test designation
- Returns created designation document

**createTestBranch(branchData)**
- Creates a test branch
- Returns created branch document

### Token Generation

**generateTestToken(user)**
- Generates a valid JWT token for testing
- Uses test environment secrets
- Returns signed token string

### Mock Objects

**mockRequest(data)**
- Creates a mock Express request object
- Accepts custom body, params, query, headers, user, cookies
- Returns mock request

**mockResponse()**
- Creates a mock Express response object
- Includes jest mocks for status, json, send, cookie, clearCookie
- Returns mock response

**mockNext()**
- Creates a mock next function
- Returns jest mock function

## Test Coverage Goals

### Current Coverage
Run `npm run test:coverage` to see current coverage.

### Target Coverage
- **Overall**: 70%+
- **Controllers**: 70%+
- **Models**: 80%+
- **Middleware**: 80%+
- **Utils**: 75%+

## Writing New Tests

### Best Practices

1. **Isolation**: Each test should be independent
2. **Setup/Teardown**: Use beforeAll, afterAll, beforeEach, afterEach appropriately
3. **Descriptive Names**: Test names should clearly describe what they test
4. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification
5. **Mock External Dependencies**: Use mocks for external services
6. **Test Edge Cases**: Include tests for error conditions and boundary cases

### Example Test Template

```javascript
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { connectTestDB, disconnectTestDB, clearTestDB } from '../../setup/testDb.js';
import { setupTestEnv } from '../../setup/testHelpers.js';

describe('Feature Name', () => {
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

  describe('Specific Functionality', () => {
    test('should do something specific', async () => {
      // Arrange
      const testData = { /* ... */ };
      
      // Act
      const result = await functionUnderTest(testData);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.property).toBe(expectedValue);
    });
  });
});
```

## Common Test Scenarios

### Testing Authentication
```javascript
const token = generateTestToken(user);
const response = await request(app)
  .get('/api/protected-route')
  .set('Authorization', `Bearer ${token}`);
```

### Testing Authorization
```javascript
const employeeToken = generateTestToken(employeeUser);
const response = await request(app)
  .get('/api/admin-only-route')
  .set('Authorization', `Bearer ${employeeToken}`);

expect(response.status).toBe(403);
```

### Testing CRUD Operations
```javascript
// Create
const createResponse = await request(app)
  .post('/api/resource')
  .set('Authorization', `Bearer ${token}`)
  .send(resourceData);

// Read
const getResponse = await request(app)
  .get(`/api/resource/${createResponse.body.resource._id}`)
  .set('Authorization', `Bearer ${token}`);

// Update
const updateResponse = await request(app)
  .put(`/api/resource/${resourceId}`)
  .set('Authorization', `Bearer ${token}`)
  .send(updatedData);

// Delete
const deleteResponse = await request(app)
  .delete(`/api/resource/${resourceId}`)
  .set('Authorization', `Bearer ${token}`);
```

## Continuous Integration

Tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: npm test
  
- name: Generate Coverage
  run: npm run test:coverage
  
- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

## Troubleshooting

### Common Issues

**MongoDB Memory Server Timeout**
- Increase timeout in jest.config.js
- Check system resources

**Port Already in Use**
- Tests use in-memory database (no port conflicts)
- Ensure NODE_ENV=test is set

**Token Verification Failures**
- Ensure setupTestEnv() is called in beforeAll
- Check that test environment variables are set

**Test Hanging**
- Ensure all database connections are closed
- Use forceExit option in jest.config.js

## Future Enhancements

### Planned Test Additions
- [ ] Payroll API tests
- [ ] Holiday API tests
- [ ] Report generation tests
- [ ] File upload tests
- [ ] Email notification tests (with mocks)
- [ ] Performance tests
- [ ] Security tests
- [ ] Load tests

### Testing Tools to Consider
- **Faker.js**: Generate realistic test data
- **Nock**: HTTP mocking for external APIs
- **Artillery**: Load testing
- **OWASP ZAP**: Security testing

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure tests pass before committing
3. Maintain or improve code coverage
4. Update this documentation if needed

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Testing Best Practices](https://testingjavascript.com/)
