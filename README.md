# HRMS Backend

**Human Resource Management System Backend**

A comprehensive HRMS backend built with Node.js, Express, and MongoDB that provides complete HR management functionality including employee management, attendance tracking, leave management, payroll processing, and reporting.

[![Node.js](https://img.shields.io/badge/Node.js-16.x%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Documentation](#-documentation)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### Core Modules
- **👥 User Management**: Multi-role support (SuperAdmin, Admin, HR, Employee)
- **⏰ Attendance Tracking**: Check-in/out with geolocation and timezone support
- **🏖️ Leave Management**: Multiple leave types with approval workflow
- **💰 Payroll Processing**: Automated salary calculation with allowances and deductions
- **📊 Reporting**: Comprehensive reports and analytics
- **🏢 Branch Management**: Multi-branch organization support
- **📅 Holiday Management**: Branch-specific holiday calendars
- **📁 Document Management**: File uploads with Cloudinary integration
- **🔔 Notifications**: Role-based notification system
- **📝 Daily Reports**: Employee work tracking

### Key Features
- ✅ JWT-based authentication with refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ Multi-timezone support
- ✅ Geolocation tracking for attendance
- ✅ Soft delete functionality
- ✅ Excel report generation
- ✅ Email notifications
- ✅ Text search across entities
- ✅ RESTful API design
- ✅ CORS protection
- ✅ **Comprehensive test coverage (60+ tests)**

## 🧪 Testing

This project includes a complete testing infrastructure covering all types of testing:

### Test Coverage
- ✅ **Unit Tests** (20 tests) - Utilities, middleware, and models
- ✅ **Integration Tests** (36 tests) - API endpoints
- ✅ **E2E Tests** (4 tests) - Complete user workflows
- ✅ **Security Tests** - Authentication and authorization
- ✅ **Performance Tests** - Load testing guides

### Running Tests
```bash
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:watch         # Watch mode for development
npm run test:coverage      # Generate coverage report
```

### Testing Documentation
- 📖 [TESTING.md](TESTING.md) - Comprehensive testing guide
- 📖 [TEST_GUIDE.md](TEST_GUIDE.md) - Quick start guide
- 📖 [PERFORMANCE_TESTING.md](PERFORMANCE_TESTING.md) - Load testing guide
- 📖 [TESTING_SUMMARY.md](TESTING_SUMMARY.md) - Complete implementation summary

## 🛠️ Tech Stack

**Backend Framework:**
- Node.js (Runtime)
- Express.js (Web Framework)

**Database:**
- MongoDB (NoSQL Database)
- Mongoose (ODM)

**Authentication & Security:**
- JWT (jsonwebtoken)
- bcrypt (Password Hashing)
- CORS

**File Storage:**
- Cloudinary (Cloud Storage)
- Multer (File Upload)

**Utilities:**
- Moment.js (Date/Time)
- ExcelJS (Excel Reports)
- Nodemailer (Email)
- GeoIP-lite (Geolocation)

## 🚀 Quick Start

### Prerequisites
- Node.js v16.x or higher
- MongoDB v4.4 or higher
- npm v8.x or higher

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Heyiamabsar/HRMS-Backend.git
   cd HRMS-Backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start the server**
   ```bash
   # Development mode (with auto-reload)
   npm run dev

   # Production mode
   npm start
   ```

5. **Verify installation**
   - Open browser: `http://localhost:5000`
   - You should see: "HRMS Backend is running"

For detailed setup instructions, see [SETUP_GUIDE.md](SETUP_GUIDE.md)

## 📚 Documentation

Comprehensive documentation is available in the following files:

- **[REPOSITORY_ANALYSIS.md](REPOSITORY_ANALYSIS.md)** - Complete code analysis, architecture, and recommendations
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Detailed API endpoints and usage
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Database schema and relationships
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Installation, configuration, and deployment guide

## 🔌 API Endpoints

Base URL: `http://localhost:5000/api`

### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - Register new user (Admin/HR only)
- `POST /auth/refreshToken` - Refresh access token
- `POST /auth/logout` - User logout

### Employee Management
- `GET /employee` - Get all employees (paginated)
- `GET /employee/:id` - Get employee by ID
- `PUT /employee/:id` - Update employee
- `PATCH /employee/:id` - Delete employee (soft delete)
- `GET /employee/search` - Search employees

### Attendance
- `POST /attendance/check_in` - Check in
- `POST /attendance/check_out` - Check out
- `GET /attendance/single_user_today_attendance` - Get today's attendance
- `GET /attendance/all_users_today_attendance` - Get all users attendance (Admin/HR)
- `GET /attendance/all_user_attendance_report` - Attendance report (Admin/HR)

### Leave Management
- `POST /leaves/apply_leave` - Apply for leave
- `GET /leaves/my_leaves` - Get my leaves
- `GET /leaves` - Get all leave requests (Admin/HR)
- `PUT /leaves/update_leave/:id` - Approve/reject leave (Admin/HR)
- `PUT /leaves/cancel_leave_by_user/:leaveId` - Cancel own leave

### Payroll
- `POST /payroll/generate_payroll` - Generate payroll (Admin/HR)
- `GET /payroll` - Get all payroll records (Admin/HR)
- `GET /payroll/:id` - Get payroll by ID
- `PUT /payroll/:id` - Update payroll (Admin/HR)

### Other Modules
- Holidays: `/api/holidays/*`
- Branches: `/api/branch/*`
- Reports: `/api/report/*`
- Notifications: `/api/notifications/*`

For complete API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

## 📁 Project Structure

```
HRMS-Backend/
├── config/              # Configuration files
│   ├── cloudinary.config.js
│   └── dbConnection.js
├── controllers/         # Request handlers
│   ├── attendanceController.js
│   ├── authController.js
│   ├── leaveController.js
│   ├── payrollController.js
│   ├── userController.js
│   └── ...
├── middleware/          # Custom middleware
│   ├── auth.js          # Authentication & authorization
│   └── payroll.js
├── models/              # Mongoose models
│   ├── userModel.js
│   ├── attendanceModule.js
│   ├── leaveModel.js
│   ├── payrollModel.js
│   └── ...
├── routes/              # API routes
│   ├── authRoutes.js
│   ├── employeeRoutes.js
│   ├── attendanceRoutes.js
│   └── ...
├── utils/               # Utility functions
│   ├── commonUtils.js
│   ├── emailTransporter.js
│   └── ...
├── .env.example         # Environment variables template
├── .gitignore
├── package.json
├── server.js            # Application entry point
└── README.md
```

## 👥 User Roles

The system supports four user roles with different access levels:

1. **SuperAdmin** - Full system access, can create other superadmins
2. **Admin** - Manages employees, attendance, leaves, payroll
3. **HR** - Similar to admin with some restrictions
4. **Employee** - Can view own data, apply leaves, mark attendance

## 🔒 Security Features

- JWT-based authentication
- Bcrypt password hashing
- Role-based access control (RBAC)
- CORS protection
- Refresh token rotation
- Soft delete for data preservation
- Environment variable configuration
- HttpOnly cookies for refresh tokens

## 📊 Database Schema

The system uses MongoDB with the following main collections:
- Users
- Attendance
- Leaves
- Payroll
- Branches
- Holidays
- Departments
- Designations
- Notifications

For detailed schema information, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🐛 Issues & Support

If you encounter any issues or have questions:
- Open an issue on [GitHub Issues](https://github.com/Heyiamabsar/HRMS-Backend/issues)
- Check existing documentation files
- Review the troubleshooting section in [SETUP_GUIDE.md](SETUP_GUIDE.md)

## 🙏 Acknowledgments

- Built with [Express.js](https://expressjs.com/)
- Database powered by [MongoDB](https://www.mongodb.com/)
- File storage by [Cloudinary](https://cloudinary.com/)

---

**Author:** Faisal  
**Version:** 1.0.0  
**Last Updated:** 2024
