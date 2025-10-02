# HRMS Backend - Quick Reference Guide

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## 🔑 Default SuperAdmin Access

After initial setup, create superAdmin with:
- **Email**: `superadmin@example.com`
- **Password**: `password123`
- **Role**: `superAdmin`

⚠️ **Change these credentials immediately in production!**

## 📁 Key Files & Locations

| Purpose | File Path |
|---------|-----------|
| Main entry point | `server.js` |
| Environment config | `.env` |
| Database config | `config/dbConnection.js` |
| Auth middleware | `middleware/auth.js` |
| User model | `models/userModel.js` |
| API routes | `routes/*.js` |

## 🔐 User Roles & Permissions

| Role | Access Level |
|------|--------------|
| **SuperAdmin** | Full system access, can create other superadmins |
| **Admin** | Manage all employees, attendance, leaves, payroll |
| **HR** | Similar to admin with some restrictions |
| **Employee** | View own data, apply leaves, mark attendance |

## 🌐 API Base URLs

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:5000/api` |
| Production | `https://your-domain.com/api` |

## 📊 Main API Endpoints

### Authentication
```
POST   /auth/login          - Login
POST   /auth/register       - Register user (Admin+)
POST   /auth/refreshToken   - Refresh access token
POST   /auth/logout         - Logout
```

### Employees
```
GET    /employee            - List all employees (Admin/HR)
GET    /employee/:id        - Get employee details
PUT    /employee/:id        - Update employee (Admin/HR)
PATCH  /employee/:id        - Delete employee (Admin/HR)
GET    /employee/search     - Search employees
```

### Attendance
```
POST   /attendance/check_in                     - Check in
POST   /attendance/check_out                    - Check out
GET    /attendance/single_user_today_attendance - My today's attendance
GET    /attendance/all_users_today_attendance   - All users attendance (Admin/HR)
```

### Leaves
```
POST   /leaves/apply_leave              - Apply for leave
GET    /leaves/my_leaves                - My leaves
GET    /leaves                          - All leaves (Admin/HR)
PUT    /leaves/update_leave/:id         - Approve/reject (Admin/HR)
PUT    /leaves/cancel_leave_by_user/:id - Cancel own leave
```

### Payroll
```
POST   /payroll/generate_payroll - Generate payroll (Admin/HR)
GET    /payroll                  - List all payroll (Admin/HR)
GET    /payroll/:id              - Get payroll details
PUT    /payroll/:id              - Update payroll (Admin/HR)
```

## 🔧 Environment Variables

### Required
```env
# Database
MONGO_URI=mongodb://localhost:27017/hrms_db

# JWT Tokens
JWT_SECRET=your-secret-key
ACCESS_TOKEN_SECRET=your-access-secret
REFRESH_TOKEN_SECRET=your-refresh-secret
ACCESS_TOKEN_EXPIRY=9h
REFRESH_TOKEN_EXPIRY=15d

# Server
PORT=5000
NODE_ENV=development
```

### Optional (but recommended)
```env
# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Email (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

## 📝 Common HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET/PUT/PATCH |
| 201 | Created | Successful POST |
| 400 | Bad Request | Validation error |
| 401 | Unauthorized | Invalid/missing token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal server error |

## 🗄️ Database Collections

| Collection | Purpose |
|------------|---------|
| `users` | User accounts |
| `attendances` | Daily attendance records |
| `leaves` | Leave applications |
| `payrolls` | Monthly payroll records |
| `branches` | Organization branches |
| `holidays` | Holiday calendar |
| `departments` | Department list |
| `designations` | Job designations |
| `notifications` | System notifications |
| `refreshtokens` | JWT refresh tokens |

## 🔍 Leave Types

| Type | Description |
|------|-------------|
| `vacation` | Vacation leave |
| `sick` | Sick leave |
| `casual` | Casual leave |
| `LOP` | Loss of Pay |
| `unpaid` | Unpaid leave |
| `firstHalf` | First half of day |
| `secondHalf` | Second half of day |

## 📅 Attendance Status

| Status | Description |
|--------|-------------|
| `Present` | Employee checked in |
| `Absent` | No check-in |
| `Leave` | On approved leave |
| `Half Day` | Half day attendance |
| `Weekend` | Weekend/off day |
| `Over Time` | Overtime work |
| `Holiday` | Public holiday |

## 💰 Payroll Status

| Status | Description |
|--------|-------------|
| `pending` | Awaiting processing |
| `processed` | Calculated, awaiting approval |
| `paid` | Payment completed |
| `onHold` | Temporarily held |

## 🧪 Testing with Postman

### 1. Login Request
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "superadmin@example.com",
  "password": "password123"
}
```

### 2. Save Access Token
From response, copy `accessToken` value

### 3. Use Token in Requests
```
GET http://localhost:5000/api/employee
Authorization: Bearer <paste-access-token-here>
```

## 🐛 Common Issues & Solutions

### Issue: Cannot connect to MongoDB
```bash
# Check if MongoDB is running
systemctl status mongod

# Start MongoDB
sudo systemctl start mongod
```

### Issue: JWT token invalid
```bash
# Ensure secrets are set in .env
# Get new token using /auth/login
# Use /auth/refreshToken for expired tokens
```

### Issue: Port already in use
```bash
# Change PORT in .env
# Or kill process using port 5000
lsof -i :5000  # Find PID
kill -9 <PID>  # Kill process
```

### Issue: CORS error
```bash
# Add frontend URL to ALLOWED_ORIGINS in .env
# Or update CORS config in server.js
```

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `mongoose` | MongoDB ODM |
| `jsonwebtoken` | JWT authentication |
| `bcrypt` | Password hashing |
| `moment-timezone` | Date/time handling |
| `cloudinary` | File storage |
| `exceljs` | Excel generation |
| `nodemailer` | Email sending |
| `cors` | CORS handling |

## 📞 Support & Resources

| Resource | Link |
|----------|------|
| Full Documentation | [REPOSITORY_ANALYSIS.md](REPOSITORY_ANALYSIS.md) |
| API Docs | [API_DOCUMENTATION.md](API_DOCUMENTATION.md) |
| Database Schema | [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) |
| Setup Guide | [SETUP_GUIDE.md](SETUP_GUIDE.md) |
| GitHub Issues | [Repository Issues](https://github.com/Heyiamabsar/HRMS-Backend/issues) |

## 🔒 Security Best Practices

1. ✅ Never commit `.env` file
2. ✅ Use strong, random JWT secrets
3. ✅ Enable HTTPS in production
4. ✅ Restrict CORS to specific origins
5. ✅ Implement rate limiting
6. ✅ Keep dependencies updated
7. ✅ Use environment variables for secrets
8. ✅ Enable MongoDB authentication
9. ✅ Regular security audits: `npm audit`
10. ✅ Change default passwords

## 🚀 Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use MongoDB Atlas or secure MongoDB instance
- [ ] Generate new, strong JWT secrets
- [ ] Configure CORS for production domain
- [ ] Set up SSL/HTTPS
- [ ] Enable rate limiting
- [ ] Configure error logging
- [ ] Set up monitoring
- [ ] Configure automated backups
- [ ] Test all critical endpoints
- [ ] Update documentation

## 📊 Database Backup Commands

```bash
# Backup MongoDB database
mongodump --db hrms_db --out ./backup

# Restore MongoDB database
mongorestore --db hrms_db ./backup/hrms_db

# Backup specific collection
mongodump --db hrms_db --collection users --out ./backup
```

## 🔄 Update Commands

```bash
# Check for outdated packages
npm outdated

# Update packages
npm update

# Security audit
npm audit

# Fix security issues
npm audit fix
```

## 🎯 Performance Tips

1. **Use Indexes**: Ensure database indexes are created
2. **Pagination**: Always paginate large result sets
3. **Caching**: Implement Redis for frequently accessed data
4. **Query Optimization**: Use `.lean()` for read-only queries
5. **Connection Pooling**: Configure MongoDB connection pool
6. **Compression**: Enable gzip compression
7. **CDN**: Use CDN for static files
8. **Monitoring**: Monitor response times and slow queries

## 📈 Monitoring Endpoints

Add these for health monitoring:

```javascript
// Health check
GET /health

// Database status
GET /health/db

// Metrics
GET /metrics
```

---

**Quick Reference Version**: 1.0  
**Last Updated**: 2024  
**For detailed information, see comprehensive documentation files**
