# HRMS Backend API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production: [Your production URL]/api
```

## Authentication
Most endpoints require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <access_token>
```

## Response Format
All API responses follow this structure:
```json
{
  "success": true|false,
  "statusCode": 200,
  "message": "Success message",
  "data": { /* response data */ }
}
```

---

## Authentication APIs

### 1. Login
**Endpoint**: `POST /auth/login`  
**Access**: Public  
**Description**: Authenticate user and get access token

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "60d5ec49f1b2c8b1f8e4e1a1",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "role": "employee",
    "timeZone": "Asia/Kolkata"
  }
}
```

**Note**: Refresh token is set in httpOnly cookie

---

### 2. Register User
**Endpoint**: `POST /auth/register`  
**Access**: SuperAdmin, Admin, HR  
**Description**: Create a new user account

**Request Body**:
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "password": "securePassword123",
  "phone": "+919876543210",
  "userId": "EMP001",
  "department": "Engineering",
  "designation": "Software Engineer",
  "joining_date": "2024-01-15",
  "salary": 50000,
  "role": "employee",
  "branch": "60d5ec49f1b2c8b1f8e4e1a2",
  "address": {
    "country": "India",
    "state": "Maharashtra",
    "city": "Mumbai",
    "address_line": "123 Main Street",
    "pincode": "400001"
  }
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Users Created successfully",
  "user": { /* user object without password */ }
}
```

---

### 3. Refresh Token
**Endpoint**: `POST /auth/refreshToken`  
**Access**: Public (with refresh token)  
**Description**: Get new access token using refresh token

**Request**: Refresh token from cookie

**Response**:
```json
{
  "success": true,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 4. Logout
**Endpoint**: `POST /auth/logout`  
**Access**: Authenticated  
**Description**: Logout user and clear refresh token

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

---

## Employee Management APIs

### 1. Get All Employees
**Endpoint**: `GET /employee`  
**Access**: Admin, HR  
**Description**: Get paginated list of all employees

**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 15)

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": {
    "count": 15,
    "totalRecords": 150,
    "totalPages": 10,
    "currentPage": 1,
    "users": [
      {
        "_id": "60d5ec49f1b2c8b1f8e4e1a1",
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "role": "employee",
        "designation": "Software Engineer",
        "department": "Engineering",
        "salary": 50000,
        "status": "active",
        "branch": {
          "_id": "60d5ec49f1b2c8b1f8e4e1a2",
          "branchName": "Mumbai Office"
        }
      }
    ]
  }
}
```

---

### 2. Get Employee by ID
**Endpoint**: `GET /employee/:id`  
**Access**: Admin, HR, Employee (own data)  
**Description**: Get detailed information of a specific employee

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User fetched successfully",
  "data": {
    "_id": "60d5ec49f1b2c8b1f8e4e1a1",
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com",
    "phone": "+919876543210",
    "userId": "EMP001",
    "department": "Engineering",
    "designation": "Software Engineer",
    "joining_date": "2024-01-15T00:00:00.000Z",
    "salary": 50000,
    "role": "employee",
    "status": "active",
    "sickLeaves": 0,
    "unpaidLeaves": 0,
    "address": {
      "country": "India",
      "state": "Maharashtra",
      "city": "Mumbai"
    },
    "branch": { /* branch details */ }
  }
}
```

---

### 3. Update Employee
**Endpoint**: `PUT /employee/:id`  
**Access**: Admin, HR  
**Description**: Update employee information

**Request Body**: (all fields optional)
```json
{
  "first_name": "John Updated",
  "designation": "Senior Software Engineer",
  "salary": 60000,
  "status": "active"
}
```

---

### 4. Delete Employee (Soft Delete)
**Endpoint**: `PATCH /employee/:id`  
**Access**: Admin, HR  
**Description**: Soft delete an employee (sets isDeleted: true)

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User deleted successfully"
}
```

---

### 5. Update Own Profile
**Endpoint**: `PATCH /employee/update_profile_by_self`  
**Access**: All authenticated users  
**Description**: Update own profile information

**Request Body**:
```json
{
  "phone": "+919876543211",
  "address": {
    "address_line": "456 New Street"
  }
}
```

---

### 6. Search Employees
**Endpoint**: `GET /employee/search`  
**Access**: Authenticated  
**Description**: Search employees by name, email, department, or designation

**Query Parameters**:
- `q`: Search query

**Response**: List of matching employees

---

### 7. Get All Designations
**Endpoint**: `GET /employee/designation`  
**Access**: Authenticated  
**Description**: Get list of all designations

**Response**:
```json
{
  "success": true,
  "data": [
    { "_id": "...", "name": "Software Engineer" },
    { "_id": "...", "name": "Senior Software Engineer" },
    { "_id": "...", "name": "Team Lead" }
  ]
}
```

---

### 8. Get All Departments
**Endpoint**: `GET /employee/department`  
**Access**: Authenticated  
**Description**: Get list of all departments

**Response**:
```json
{
  "success": true,
  "data": [
    { "_id": "...", "name": "Engineering" },
    { "_id": "...", "name": "Human Resources" },
    { "_id": "...", "name": "Finance" }
  ]
}
```

---

## Attendance Management APIs

### 1. Check In
**Endpoint**: `POST /attendance/check_in`  
**Access**: All authenticated users  
**Description**: Mark check-in for the day

**Request Body**:
```json
{
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": { /* address object */ },
    "displayName": "Mumbai, Maharashtra",
    "punchedFrom": "Web"
  }
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Checked in successfully",
  "data": {
    "_id": "...",
    "userId": "60d5ec49f1b2c8b1f8e4e1a1",
    "date": "2024-01-15",
    "inTime": "2024-01-15T09:30:00.000Z",
    "status": "Present",
    "location": {
      "checkIn": { /* location details */ }
    }
  }
}
```

---

### 2. Check Out
**Endpoint**: `POST /attendance/check_out`  
**Access**: All authenticated users  
**Description**: Mark check-out for the day

**Request Body**:
```json
{
  "location": {
    "latitude": 19.0760,
    "longitude": 72.8777,
    "address": { /* address object */ },
    "displayName": "Mumbai, Maharashtra",
    "punchedFrom": "Web"
  }
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Checked out successfully",
  "data": {
    "_id": "...",
    "userId": "60d5ec49f1b2c8b1f8e4e1a1",
    "date": "2024-01-15",
    "inTime": "2024-01-15T09:30:00.000Z",
    "outTime": "2024-01-15T18:30:00.000Z",
    "duration": "09:00:00",
    "status": "Present"
  }
}
```

---

### 3. Get Today's Attendance (Own)
**Endpoint**: `GET /attendance/single_user_today_attendance`  
**Access**: All authenticated users  
**Description**: Get logged-in user's attendance for today

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "date": "2024-01-15",
    "inTime": "2024-01-15T09:30:00.000Z",
    "outTime": "2024-01-15T18:30:00.000Z",
    "duration": "09:00:00",
    "status": "Present"
  }
}
```

---

### 4. Get All Users Today's Attendance
**Endpoint**: `GET /attendance/all_users_today_attendance`  
**Access**: Admin, HR  
**Description**: Get attendance of all employees for today

**Response**:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "userId": "60d5ec49f1b2c8b1f8e4e1a1",
      "name": "John Doe",
      "email": "john@example.com",
      "date": "2024-01-15",
      "status": "Present",
      "inTime": "2024-01-15T09:30:00.000Z",
      "outTime": "2024-01-15T18:30:00.000Z",
      "duration": "09:00:00"
    },
    {
      "userId": "60d5ec49f1b2c8b1f8e4e1a2",
      "name": "Jane Smith",
      "email": "jane@example.com",
      "date": "2024-01-15",
      "status": "Absent",
      "inTime": null,
      "outTime": null,
      "duration": null
    }
  ]
}
```

---

### 5. Get Attendance by Date (Own)
**Endpoint**: `GET /attendance/single_user_attendance_by_date`  
**Access**: All authenticated users  
**Description**: Get logged-in user's attendance for a specific date

**Query Parameters**:
- `date`: Date in YYYY-MM-DD format (required)

**Response**: Attendance record for the specified date

---

### 6. Get Attendance History (Own)
**Endpoint**: `GET /attendance/login_user_attendance_history`  
**Access**: All authenticated users  
**Description**: Get full attendance history for logged-in user

**Query Parameters**:
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `page`: Page number
- `limit`: Items per page

**Response**: Paginated attendance records

---

### 7. Get User Attendance History
**Endpoint**: `GET /attendance/single_user_attendance_history/:id`  
**Access**: Admin, HR, Employee (own data)  
**Description**: Get attendance history for a specific user

**Query Parameters**:
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `page`: Page number
- `limit`: Items per page

---

### 8. Get All Users Attendance Report
**Endpoint**: `GET /attendance/all_user_attendance_report`  
**Access**: Admin, HR  
**Description**: Get comprehensive attendance report for all users

**Query Parameters**:
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

---

## Leave Management APIs

### 1. Apply Leave
**Endpoint**: `POST /leaves/apply_leave`  
**Access**: All authenticated users  
**Description**: Apply for leave

**Request Body**:
```json
{
  "reason": "Medical appointment",
  "fromDate": "2024-01-20",
  "toDate": "2024-01-21",
  "leaveType": "sick"
}
```

**Leave Types**:
- `vacation`: Vacation leave
- `sick`: Sick leave
- `casual`: Casual leave
- `LOP`: Loss of Pay
- `unpaid`: Unpaid leave
- `firstHalf`: First half of the day
- `secondHalf`: Second half of the day

**Response**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Leave applied successfully",
  "data": {
    "_id": "...",
    "employee": "60d5ec49f1b2c8b1f8e4e1a1",
    "reason": "Medical appointment",
    "fromDate": "2024-01-20T00:00:00.000Z",
    "toDate": "2024-01-21T00:00:00.000Z",
    "leaveType": "sick",
    "status": "pending",
    "leaveTaken": 2,
    "leaveBalance": 12
  }
}
```

---

### 2. Get My Leaves
**Endpoint**: `GET /leaves/my_leaves`  
**Access**: All authenticated users  
**Description**: Get all leave applications of logged-in user

**Query Parameters**:
- `status`: Filter by status (pending, approved, rejected)
- `page`: Page number
- `limit`: Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "leaves": [
      {
        "_id": "...",
        "reason": "Medical appointment",
        "fromDate": "2024-01-20T00:00:00.000Z",
        "toDate": "2024-01-21T00:00:00.000Z",
        "leaveType": "sick",
        "status": "approved",
        "leaveTaken": 2,
        "leaveBalance": 12,
        "appliedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "totalPages": 1,
    "currentPage": 1
  }
}
```

---

### 3. Get All Leave Requests
**Endpoint**: `GET /leaves`  
**Access**: Admin, HR  
**Description**: Get all leave requests from all employees

**Query Parameters**:
- `status`: Filter by status
- `leaveType`: Filter by leave type
- `page`: Page number
- `limit`: Items per page

---

### 4. Update Leave Status
**Endpoint**: `PUT /leaves/update_leave/:id`  
**Access**: Admin, HR  
**Description**: Approve or reject leave request

**Request Body**:
```json
{
  "status": "approved"
}
```

**Status Options**: `approved`, `rejected`

---

### 5. Cancel Leave (by User)
**Endpoint**: `PUT /leaves/cancel_leave_by_user/:leaveId`  
**Access**: All authenticated users (own leaves only)  
**Description**: Cancel own pending leave request

**Response**:
```json
{
  "success": true,
  "message": "Leave cancelled successfully"
}
```

---

### 6. Get Leaves by User ID
**Endpoint**: `GET /leaves/leaves_byId/:id`  
**Access**: Admin, HR  
**Description**: Get all leaves for a specific user

---

### 7. Search Leaves
**Endpoint**: `GET /leaves/search`  
**Access**: Admin, HR, Employee  
**Description**: Search leave requests

**Query Parameters**:
- `q`: Search query

---

## Payroll Management APIs

### 1. Generate Payroll
**Endpoint**: `POST /payroll/generate_payroll`  
**Access**: Admin, HR  
**Description**: Generate monthly payroll for an employee

**Request Body**:
```json
{
  "userId": "60d5ec49f1b2c8b1f8e4e1a1",
  "month": "January",
  "year": 2024,
  "basicSalary": 50000,
  "medicalAllowance": 2000,
  "conveyanceAllowance": 1500,
  "hra": 10000,
  "pfDeduction": 1800,
  "tds": 2000,
  "paymentMethod": "Bank Transfer"
}
```

**Response**:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Payroll generated successfully",
  "data": {
    "_id": "...",
    "userId": "60d5ec49f1b2c8b1f8e4e1a1",
    "month": "January",
    "year": 2024,
    "basicSalary": 50000,
    "grossSalary": 63500,
    "netSalary": 59700,
    "present": 22,
    "absent": 2,
    "workedDays": 22,
    "totalDays": 24,
    "totalAllowances": 13500,
    "totalDeductions": 3800,
    "status": "pending"
  }
}
```

---

### 2. Get All Payroll Records
**Endpoint**: `GET /payroll`  
**Access**: Admin, HR  
**Description**: Get all payroll records

**Query Parameters**:
- `month`: Filter by month
- `year`: Filter by year
- `status`: Filter by status
- `page`: Page number
- `limit`: Items per page

---

### 3. Get Payroll by ID
**Endpoint**: `GET /payroll/:id`  
**Access**: Admin, HR  
**Description**: Get specific payroll record

---

### 4. Update Payroll
**Endpoint**: `PUT /payroll/:id`  
**Access**: Admin, HR  
**Description**: Update payroll record

---

### 5. Delete Payroll
**Endpoint**: `DELETE /payroll/:id`  
**Access**: Admin, HR  
**Description**: Delete payroll record

---

## Holiday Management APIs

### 1. Get Monthly Holidays
**Endpoint**: `GET /holidays/monthly_holidays`  
**Access**: All authenticated users  
**Description**: Get holidays for a specific month

**Query Parameters**:
- `month`: Month number (1-12)
- `year`: Year

---

### 2. Get All Holidays
**Endpoint**: `GET /holidays/all_holidays`  
**Access**: All authenticated users  
**Description**: Get all holidays

---

### 3. Get Branch Holidays
**Endpoint**: `GET /holidays/holidays_by_branch/:branchId`  
**Access**: All authenticated users  
**Description**: Get holidays for a specific branch

---

### 4. Get User's Branch Holidays
**Endpoint**: `GET /holidays/holidays_by_user`  
**Access**: All authenticated users  
**Description**: Get holidays for logged-in user's branch

---

### 5. Add Custom Holiday
**Endpoint**: `POST /holidays/add_custom_holiday`  
**Access**: Admin, HR  
**Description**: Add a custom holiday

**Request Body**:
```json
{
  "date": "2024-03-21",
  "reason": "Company Anniversary",
  "branch": "60d5ec49f1b2c8b1f8e4e1a2",
  "isOptional": false
}
```

---

### 6. Update Holiday
**Endpoint**: `PUT /holidays/edit_holiday/:id`  
**Access**: Admin, HR  
**Description**: Update holiday details

---

### 7. Delete Holiday
**Endpoint**: `DELETE /holidays/delete_holiday/:id`  
**Access**: Admin, HR  
**Description**: Delete a holiday

---

## Branch Management APIs

### 1. Get All Branches
**Endpoint**: `GET /branch`  
**Access**: All authenticated users  
**Description**: Get all branches

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "branchName": "Mumbai Office",
      "country": "India",
      "branchCode": "MUM001",
      "address": "123 Main Street, Mumbai",
      "weekends": ["Sunday"],
      "timeZone": "Asia/Kolkata",
      "associatedUsers": 45
    }
  ]
}
```

---

### 2. Create Branch
**Endpoint**: `POST /branch`  
**Access**: Admin, HR  
**Description**: Create a new branch

**Request Body**:
```json
{
  "branchName": "Delhi Office",
  "country": "India",
  "branchCode": "DEL001",
  "address": "456 Delhi Street",
  "weekends": ["Sunday"],
  "timeZone": "Asia/Kolkata"
}
```

---

### 3. Update Branch
**Endpoint**: `PUT /branch/:id`  
**Access**: Admin, HR  
**Description**: Update branch details

---

### 4. Delete Branch
**Endpoint**: `DELETE /branch/:id`  
**Access**: Admin, HR  
**Description**: Delete a branch

---

## Report APIs

### 1. Overall Employee Report
**Endpoint**: `GET /report/overall_employee_report`  
**Access**: Admin, HR  
**Description**: Generate comprehensive employee report with Excel export

**Query Parameters**:
- `startDate`: Start date (YYYY-MM-DD) - required
- `endDate`: End date (YYYY-MM-DD) - required

**Response**: Excel file download with employee attendance, leave, and salary data

---

## Notification APIs

### 1. Get Notifications
**Endpoint**: `GET /notifications`  
**Access**: All authenticated users  
**Description**: Get notifications for logged-in user

**Query Parameters**:
- `unread`: Get only unread notifications (true/false)

---

### 2. Mark Notification as Read
**Endpoint**: `PUT /notifications/:id/read`  
**Access**: All authenticated users  
**Description**: Mark a notification as read

---

## Utility Endpoints

### 1. Save Timezone
**Endpoint**: `POST /employee/timezone`  
**Access**: All authenticated users  
**Description**: Save user's timezone preference

**Request Body**:
```json
{
  "timeZone": "Asia/Kolkata"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "statusCode": 401,
  "message": "Access denied. No token provided."
}
```

### 403 Forbidden
```json
{
  "success": false,
  "statusCode": 403,
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "success": false,
  "statusCode": 404,
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "statusCode": 500,
  "message": "Internal server error",
  "error": "Error details"
}
```

---

## Rate Limiting
(To be implemented)
- 100 requests per 15 minutes per IP
- Login endpoint: 5 attempts per 15 minutes

---

## Notes
1. All dates should be in ISO 8601 format (YYYY-MM-DD or full ISO string)
2. Pagination defaults: page=1, limit=15
3. Refresh tokens are stored in httpOnly cookies
4. All endpoints return JSON responses
5. File uploads use multipart/form-data

---

**Version**: 1.0  
**Last Updated**: 2024
