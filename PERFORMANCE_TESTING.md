# Performance and Load Testing Guide

## Overview
This guide provides instructions for testing the performance and scalability of the HRMS Backend application.

## Performance Testing Tools

### 1. Artillery (Recommended for Load Testing)

Artillery is a modern, powerful load testing toolkit for testing backend services.

#### Installation
```bash
npm install --save-dev artillery
```

#### Basic Load Test Configuration

Create `artillery-config.yml`:
```yaml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  processor: "./artillery-processor.js"

scenarios:
  - name: "User Login Flow"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "Test@123"
          capture:
            - json: "$.accessToken"
              as: "token"
      - get:
          url: "/api/employee"
          headers:
            Authorization: "Bearer {{ token }}"

  - name: "Attendance Check-in"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "employee@example.com"
            password: "Test@123"
          capture:
            - json: "$.accessToken"
              as: "token"
      - post:
          url: "/api/attendance/check-in"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            latitude: 19.1872137
            longitude: 77.3169113
```

#### Run Load Test
```bash
artillery run artillery-config.yml
```

#### Quick Load Test (CLI)
```bash
# Test login endpoint with 100 requests
artillery quick --count 100 --num 10 http://localhost:5000/api/auth/login

# Test with custom duration
artillery quick --duration 60 --rate 20 http://localhost:5000
```

### 2. Apache Bench (ab)

Simple command-line tool for benchmarking HTTP servers.

#### Installation
```bash
# Ubuntu/Debian
sudo apt-get install apache2-utils

# macOS
brew install apache2
```

#### Basic Usage
```bash
# Test with 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:5000/

# POST request with JSON
ab -n 1000 -c 10 -p login.json -T application/json http://localhost:5000/api/auth/login
```

Create `login.json`:
```json
{
  "email": "test@example.com",
  "password": "Test@123"
}
```

### 3. k6 (Grafana Load Testing)

Modern load testing tool with JavaScript scripting.

#### Installation
```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

#### Basic k6 Test Script

Create `k6-test.js`:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
    http_req_failed: ['rate<0.01'],   // Error rate must be below 1%
  },
};

export default function() {
  // Login
  const loginRes = http.post('http://localhost:5000/api/auth/login', 
    JSON.stringify({
      email: 'test@example.com',
      password: 'Test@123'
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login has token': (r) => r.json('accessToken') !== undefined,
  });

  const token = loginRes.json('accessToken');

  // Get employees
  const employeesRes = http.get('http://localhost:5000/api/employee', {
    headers: { 
      'Authorization': `Bearer ${token}`,
    },
  });

  check(employeesRes, {
    'employees status is 200 or 403': (r) => r.status === 200 || r.status === 403,
  });

  sleep(1);
}
```

#### Run k6 Test
```bash
k6 run k6-test.js
```

## Performance Benchmarks

### Target Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Response Time (p50) | < 100ms | 50% of requests |
| Response Time (p95) | < 200ms | 95% of requests |
| Response Time (p99) | < 500ms | 99% of requests |
| Throughput | > 1000 req/s | Requests per second |
| Error Rate | < 0.1% | Failed requests |
| Concurrent Users | > 500 | Simultaneous users |

### Critical Endpoints to Test

1. **Authentication**
   - POST `/api/auth/login` - Most frequent endpoint
   - POST `/api/auth/refreshToken` - Token refresh
   - Target: < 100ms response time

2. **Employee Operations**
   - GET `/api/employee` - List employees
   - GET `/api/employee/:id` - Get employee details
   - Target: < 150ms response time

3. **Attendance**
   - POST `/api/attendance/check-in` - Daily check-in
   - POST `/api/attendance/check-out` - Daily check-out
   - Target: < 200ms response time

4. **Leave Management**
   - GET `/api/leaves` - List leaves
   - POST `/api/leaves` - Apply for leave
   - Target: < 150ms response time

## Database Performance Testing

### MongoDB Performance

#### Enable Profiling
```javascript
// In MongoDB shell
db.setProfilingLevel(2);  // Log all operations
db.system.profile.find().pretty();  // View slow queries
```

#### Create Indexes
```javascript
// User collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ isDeleted: 1 });

// Attendance collection
db.attendances.createIndex({ userId: 1, date: -1 });
db.attendances.createIndex({ date: -1 });

// Leave collection
db.leaves.createIndex({ userId: 1, status: 1 });
db.leaves.createIndex({ fromDate: 1, toDate: 1 });
```

#### Analyze Query Performance
```javascript
// Explain query execution
db.users.find({ email: "test@example.com" }).explain("executionStats");
```

## Stress Testing Scenarios

### Scenario 1: Login Storm
Test system behavior during peak login hours (e.g., 9 AM).

```bash
# 1000 users logging in within 1 minute
artillery quick --count 1000 --duration 60 http://localhost:5000/api/auth/login
```

### Scenario 2: Attendance Rush
Test check-in system during morning rush hour.

```bash
# 500 concurrent check-ins
ab -n 500 -c 50 -p checkin.json -T application/json http://localhost:5000/api/attendance/check-in
```

### Scenario 3: Report Generation
Test system under heavy data processing load.

```bash
# Multiple concurrent report requests
artillery quick --count 100 --num 20 http://localhost:5000/api/report
```

## Monitoring During Tests

### 1. Server Metrics
```bash
# Monitor CPU and Memory
htop

# Monitor network
iftop

# Monitor disk I/O
iotop
```

### 2. Application Logs
```bash
# Follow application logs
tail -f combined.log

# Monitor errors
tail -f error.log
```

### 3. Database Metrics
```bash
# MongoDB stats
mongotop
mongostat

# Connection pool
db.serverStatus().connections
```

## Performance Optimization Tips

### 1. Database Optimization
- ✅ Add indexes on frequently queried fields
- ✅ Use lean() for read-only queries
- ✅ Implement pagination for large datasets
- ✅ Use select() to limit returned fields
- ✅ Enable MongoDB query caching

### 2. Application Optimization
- ✅ Implement response caching (Redis)
- ✅ Use connection pooling
- ✅ Enable compression (gzip)
- ✅ Optimize middleware stack
- ✅ Use clustering for multi-core CPUs

### 3. Network Optimization
- ✅ Enable HTTP/2
- ✅ Use CDN for static assets
- ✅ Implement rate limiting
- ✅ Enable CORS preflight caching

### 4. Code Optimization
```javascript
// Bad: N+1 query problem
const users = await User.find();
for (const user of users) {
  const attendance = await Attendance.find({ userId: user._id });
}

// Good: Use populate or aggregation
const users = await User.find().populate('attendance');

// Better: Use aggregation pipeline
const result = await User.aggregate([
  {
    $lookup: {
      from: 'attendances',
      localField: '_id',
      foreignField: 'userId',
      as: 'attendance'
    }
  }
]);
```

## Continuous Performance Testing

### GitHub Actions Example

Create `.github/workflows/performance.yml`:
```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start server
        run: npm start &
        
      - name: Wait for server
        run: npx wait-on http://localhost:5000
      
      - name: Run Artillery tests
        run: artillery run artillery-config.yml
      
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: performance-results
          path: artillery-report.json
```

## Reporting

### Generate HTML Reports

```bash
# Artillery report
artillery run --output report.json artillery-config.yml
artillery report report.json

# k6 results
k6 run --out json=results.json k6-test.js
```

### Metrics to Track

1. **Response Time Percentiles**
   - p50, p95, p99
   
2. **Throughput**
   - Requests per second
   - Transactions per second

3. **Error Rates**
   - 4xx errors
   - 5xx errors
   - Timeouts

4. **Resource Utilization**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network bandwidth

5. **Database Performance**
   - Query execution time
   - Connection pool usage
   - Index effectiveness

## Troubleshooting Performance Issues

### Common Issues and Solutions

1. **Slow Database Queries**
   - Solution: Add indexes, use explain()
   
2. **Memory Leaks**
   - Solution: Use heap snapshots, monitor with clinic.js
   
3. **High CPU Usage**
   - Solution: Profile with 0x, optimize algorithms
   
4. **Connection Pool Exhaustion**
   - Solution: Increase pool size, fix connection leaks

## Tools Summary

| Tool | Purpose | Best For |
|------|---------|----------|
| Artillery | Load testing | Complex scenarios |
| ab | Simple benchmarking | Quick tests |
| k6 | Modern load testing | CI/CD integration |
| clinic.js | Node.js profiling | Performance diagnosis |
| 0x | Flamegraphs | CPU profiling |

## Next Steps

1. Set baseline performance metrics
2. Run regular performance tests
3. Monitor production performance
4. Set up alerts for performance degradation
5. Continuous optimization based on metrics
