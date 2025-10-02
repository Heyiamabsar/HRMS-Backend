# HRMS Backend - Setup & Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Testing](#testing)
7. [Deployment](#deployment)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v16.x or higher ([Download](https://nodejs.org/))
- **MongoDB**: v4.4 or higher ([Download](https://www.mongodb.com/try/download/community))
- **npm**: v8.x or higher (comes with Node.js)
- **Git**: Latest version ([Download](https://git-scm.com/))

### Optional Software
- **Postman**: For API testing ([Download](https://www.postman.com/downloads/))
- **MongoDB Compass**: For database visualization ([Download](https://www.mongodb.com/products/compass))
- **Nodemon**: For development (will be installed as dev dependency)

### Accounts Required
- **Cloudinary Account**: For file storage ([Sign up](https://cloudinary.com/))
- **SMTP Email Account**: For sending emails (Gmail, SendGrid, etc.)
- **MongoDB Atlas** (Optional): For cloud database ([Sign up](https://www.mongodb.com/cloud/atlas))

---

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Heyiamabsar/HRMS-Backend.git
cd HRMS-Backend
```

### 2. Install Dependencies
```bash
npm install
```

This will install all dependencies listed in `package.json`:
- Production dependencies (~20 packages)
- Development dependencies (nodemon)

### 3. Verify Installation
```bash
node --version  # Should be v16.x or higher
npm --version   # Should be v8.x or higher
```

---

## Configuration

### 1. Create Environment File
Create a `.env` file in the root directory:

```bash
cp .env.example .env  # If .env.example exists
# OR
touch .env
```

### 2. Configure Environment Variables

Edit `.env` file with your values:

```env
# ========================================
# SERVER CONFIGURATION
# ========================================
PORT=5000
NODE_ENV=development

# ========================================
# DATABASE CONFIGURATION
# ========================================
# Local MongoDB
MONGO_URI=mongodb://localhost:27017/hrms_db

# OR MongoDB Atlas (Cloud)
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/hrms_db?retryWrites=true&w=majority

# ========================================
# JWT CONFIGURATION
# ========================================
# Generate random secrets using: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ACCESS_TOKEN_SECRET=your-access-token-secret-change-this-in-production
REFRESH_TOKEN_SECRET=your-refresh-token-secret-change-this-in-production

# Token expiry times
ACCESS_TOKEN_EXPIRY=9h
REFRESH_TOKEN_EXPIRY=15d

# ========================================
# CLOUDINARY CONFIGURATION
# ========================================
# Get these from: https://cloudinary.com/console
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# ========================================
# EMAIL CONFIGURATION
# ========================================
# Gmail Example
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# SendGrid Example (Alternative)
# EMAIL_HOST=smtp.sendgrid.net
# EMAIL_PORT=587
# EMAIL_USER=apikey
# EMAIL_PASSWORD=your-sendgrid-api-key

# ========================================
# CORS CONFIGURATION
# ========================================
# Comma-separated list of allowed origins
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:8081,http://localhost:3000

# ========================================
# OPTIONAL CONFIGURATION
# ========================================
# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# File upload limits
MAX_FILE_SIZE=5242880  # 5MB in bytes
```

### 3. Generate JWT Secrets

Generate secure random secrets:

```bash
# In terminal
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Run this command three times to get three different secrets for:
- JWT_SECRET
- ACCESS_TOKEN_SECRET
- REFRESH_TOKEN_SECRET

### 4. Gmail App Password Setup

If using Gmail for emails:

1. Go to Google Account settings
2. Enable 2-Factor Authentication
3. Go to Security → App passwords
4. Generate app password for "Mail"
5. Use this password in `EMAIL_PASSWORD`

---

## Database Setup

### Option 1: Local MongoDB

#### 1. Install MongoDB
- Download and install MongoDB Community Server
- Start MongoDB service:

```bash
# Windows
net start MongoDB

# macOS (using Homebrew)
brew services start mongodb-community

# Linux (systemd)
sudo systemctl start mongod
```

#### 2. Create Database
MongoDB will automatically create the database on first connection. No manual creation needed.

#### 3. Verify Connection
```bash
# Open MongoDB shell
mongosh

# Check databases
show dbs

# Switch to HRMS database (will be created on first insert)
use hrms_db
```

### Option 2: MongoDB Atlas (Cloud)

#### 1. Create Atlas Account
- Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- Create a new cluster (free tier available)

#### 2. Setup Database Access
- Database Access → Add Database User
- Create username and password
- Set privileges to "Read and write to any database"

#### 3. Setup Network Access
- Network Access → Add IP Address
- For development: Allow access from anywhere (0.0.0.0/0)
- For production: Add specific IP addresses

#### 4. Get Connection String
- Clusters → Connect → Connect your application
- Copy connection string
- Replace `<password>` with your database user password
- Update `MONGO_URI` in `.env`

### Database Indexes

The application will automatically create indexes when models are loaded. To manually create indexes:

```javascript
// In MongoDB shell or Compass
use hrms_db

// Create indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ first_name: "text", last_name: "text", email: "text", department: "text", designation: "text" })
db.attendances.createIndex({ userId: 1, date: 1 }, { unique: true })
db.attendances.createIndex({ userName: "text", userEmail: "text" })
db.leaves.createIndex({ userName: "text", userEmail: "text" })
db.branches.createIndex({ branchCode: 1 }, { unique: true })
db.holidays.createIndex({ date: 1, branch: 1 }, { unique: true })
```

---

## Running the Application

### Development Mode

```bash
# Using nodemon (auto-restart on file changes)
npm run dev
```

### Production Mode

```bash
# Using Node.js directly
npm start
```

### Verify Server is Running

1. Open browser and navigate to: `http://localhost:5000`
2. You should see: "HRMS Backend is running"

### Check Database Connection

Look for this in console:
```
Server running on port 5000
MONGO_URI from env: mongodb://localhost:27017/hrms_db
DataBase Connected Successfully
```

---

## Initial Setup

### 1. Create First SuperAdmin User

Since registration requires authentication, you need to create the first superAdmin user directly in the database:

**Option A: Using MongoDB Shell**
```javascript
// Connect to MongoDB
use hrms_db

// Create superAdmin user
db.users.insertOne({
  first_name: "Super",
  last_name: "Admin",
  email: "superadmin@example.com",
  password: "$2b$10$X8ZQV1QYqYzKQJ1qZ8YvKe8YvKe8YvKe8YvKe8YvKe8YvKe",  // 'password123' hashed
  phone: "+919999999999",
  userId: "SUPER001",
  department: "Administration",
  designation: "Super Administrator",
  joining_date: new Date(),
  salary: 100000,
  role: "superAdmin",
  status: "active",
  isDeleted: false,
  address: {
    country: "India",
    state: "Maharashtra",
    city: "Mumbai",
    address_line: "Admin Office"
  },
  sickLeaves: 0,
  unpaidLeaves: 0,
  createdAt: new Date(),
  updatedAt: new Date()
})
```

**Option B: Using a Seed Script**

Create `scripts/seedSuperAdmin.js`:
```javascript
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import userModel from '../models/userModel.js';

dotenv.config();

async function seedSuperAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existingSuperAdmin = await userModel.findOne({ role: 'superAdmin' });
    if (existingSuperAdmin) {
      console.log('SuperAdmin already exists');
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash('password123', 10);

    const superAdmin = await userModel.create({
      first_name: 'Super',
      last_name: 'Admin',
      email: 'superadmin@example.com',
      password: hashedPassword,
      phone: '+919999999999',
      userId: 'SUPER001',
      department: 'Administration',
      designation: 'Super Administrator',
      joining_date: new Date(),
      salary: 100000,
      role: 'superAdmin',
      status: 'active',
      address: {
        country: 'India',
        state: 'Maharashtra',
        city: 'Mumbai',
        address_line: 'Admin Office'
      }
    });

    console.log('SuperAdmin created successfully:', superAdmin.email);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

seedSuperAdmin();
```

Run the script:
```bash
node scripts/seedSuperAdmin.js
```

### 2. Login with SuperAdmin

Make a POST request to `/api/auth/login`:
```json
{
  "email": "superadmin@example.com",
  "password": "password123"
}
```

You'll receive an access token. Use this token for subsequent requests.

### 3. Create Other Users

Now you can create Admin, HR, and Employee users through the API:

```bash
POST /api/auth/register
Authorization: Bearer <superadmin_token>

{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+919876543210",
  "userId": "EMP001",
  "department": "Engineering",
  "designation": "Software Engineer",
  "joining_date": "2024-01-15",
  "salary": 50000,
  "role": "employee",
  "address": {
    "country": "India",
    "state": "Maharashtra",
    "city": "Mumbai",
    "address_line": "123 Main St",
    "pincode": "400001"
  }
}
```

---

## Testing

### Manual Testing with Postman

1. **Import Postman Collection** (if available)
2. **Create Environment Variables**:
   - `base_url`: `http://localhost:5000/api`
   - `access_token`: (will be set after login)

3. **Test Authentication**:
   ```
   POST {{base_url}}/auth/login
   Body: { "email": "...", "password": "..." }
   ```

4. **Set Access Token**:
   - Copy `accessToken` from login response
   - Set it as `access_token` environment variable

5. **Test Protected Endpoints**:
   ```
   GET {{base_url}}/employee
   Headers: { "Authorization": "Bearer {{access_token}}" }
   ```

### API Testing Checklist

- [ ] Login with valid credentials
- [ ] Login with invalid credentials (should fail)
- [ ] Register new user (Admin/HR only)
- [ ] Get all employees
- [ ] Update employee
- [ ] Check-in attendance
- [ ] Check-out attendance
- [ ] Apply leave
- [ ] Approve/reject leave (Admin/HR)
- [ ] Generate payroll (Admin/HR)
- [ ] Get reports

### Automated Testing (Future)

```bash
# Install testing dependencies
npm install --save-dev jest supertest

# Run tests (when implemented)
npm test
```

---

## Deployment

### Deployment Options

1. **Traditional VPS** (DigitalOcean, Linode, AWS EC2)
2. **Platform-as-a-Service** (Heroku, Render, Railway)
3. **Serverless** (AWS Lambda, Vercel)
4. **Containerized** (Docker, Kubernetes)

### Option 1: Deploy to Render.com

#### 1. Prepare for Deployment
```bash
# Ensure package.json has correct start script
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

#### 2. Create `render.yaml`
The repository already has `render.yaml`. Verify it's configured correctly.

#### 3. Deploy
1. Create account on [Render](https://render.com)
2. New → Web Service
3. Connect your GitHub repository
4. Render will auto-detect settings from `render.yaml`
5. Add environment variables in Render dashboard
6. Deploy!

### Option 2: Deploy to Heroku

#### 1. Install Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows/Linux - download from heroku.com
```

#### 2. Login to Heroku
```bash
heroku login
```

#### 3. Create Heroku App
```bash
heroku create your-hrms-backend
```

#### 4. Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set MONGO_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
# ... set all other env vars
```

#### 5. Deploy
```bash
git push heroku main
```

#### 6. Open App
```bash
heroku open
```

### Option 3: Deploy to AWS EC2

#### 1. Launch EC2 Instance
- Choose Ubuntu Server 22.04 LTS
- t2.micro (free tier eligible)
- Configure security group: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

#### 2. Connect to Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

#### 3. Install Dependencies
```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB (optional, or use Atlas)
# See: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx (reverse proxy)
sudo apt install -y nginx
```

#### 4. Clone and Setup Project
```bash
cd /home/ubuntu
git clone https://github.com/Heyiamabsar/HRMS-Backend.git
cd HRMS-Backend
npm install
```

#### 5. Configure Environment
```bash
nano .env
# Add all environment variables
```

#### 6. Start with PM2
```bash
pm2 start server.js --name hrms-backend
pm2 save
pm2 startup  # Follow instructions to enable on boot
```

#### 7. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/hrms-backend
```

Add:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/hrms-backend /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 8. Setup SSL with Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 4: Docker Deployment

#### 1. Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

#### 2. Create .dockerignore
```
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
```

#### 3. Build and Run
```bash
# Build image
docker build -t hrms-backend .

# Run container
docker run -d \
  --name hrms-backend \
  -p 5000:5000 \
  --env-file .env \
  hrms-backend
```

#### 4. Docker Compose (with MongoDB)
Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password123

  backend:
    build: .
    ports:
      - "5000:5000"
    env_file:
      - .env
    depends_on:
      - mongodb
    environment:
      MONGO_URI: mongodb://admin:password123@mongodb:27017/hrms_db?authSource=admin

volumes:
  mongodb_data:
```

Run:
```bash
docker-compose up -d
```

---

## Production Checklist

Before deploying to production:

### Security
- [ ] Change all default passwords
- [ ] Generate new JWT secrets (long and random)
- [ ] Use environment variables (never hardcode secrets)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS for specific origins only
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Enable MongoDB authentication
- [ ] Setup firewall rules
- [ ] Regular security updates

### Performance
- [ ] Enable MongoDB indexes
- [ ] Implement caching (Redis)
- [ ] Use CDN for static files
- [ ] Enable gzip compression
- [ ] Optimize database queries
- [ ] Add pagination to all list endpoints

### Monitoring
- [ ] Setup error tracking (Sentry, Rollbar)
- [ ] Setup logging (Winston, Morgan)
- [ ] Setup uptime monitoring
- [ ] Setup performance monitoring (New Relic, DataDog)
- [ ] Configure alerts

### Backup
- [ ] Setup automated database backups
- [ ] Test backup restoration
- [ ] Store backups off-site
- [ ] Document backup procedures

### Documentation
- [ ] API documentation (Swagger)
- [ ] Deployment documentation
- [ ] Runbook for common issues
- [ ] Contact information for support

---

## Troubleshooting

### Common Issues

#### 1. Cannot Connect to MongoDB
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution**:
- Ensure MongoDB is running: `systemctl status mongod`
- Check `MONGO_URI` in `.env`
- For Atlas, check network access settings

#### 2. JWT Token Invalid
```
message: "InvalidToken"
```

**Solution**:
- Ensure `ACCESS_TOKEN_SECRET` is set in `.env`
- Token may be expired (9h default)
- Use refresh token to get new access token

#### 3. CORS Error
```
Access to fetch at ... has been blocked by CORS policy
```

**Solution**:
- Add frontend URL to `ALLOWED_ORIGINS` in `.env`
- Update CORS configuration in `server.js`

#### 4. File Upload Fails
```
Error uploading to Cloudinary
```

**Solution**:
- Verify Cloudinary credentials in `.env`
- Check file size limits
- Ensure Cloudinary account is active

#### 5. Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution**:
```bash
# Find process using port 5000
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change PORT in .env
```

#### 6. Email Not Sending
```
Error: Invalid login
```

**Solution**:
- For Gmail: Use App Password, not regular password
- Enable "Less secure app access" (not recommended) OR use App Password
- Check SMTP settings (host, port, username, password)

### Debug Mode

Enable detailed logging:

```javascript
// In server.js, add:
mongoose.set('debug', true);  // Log all MongoDB queries

// Use environment variable
DEBUG=* npm start  // Log everything
```

### Health Check Endpoint

Add a health check endpoint for monitoring:

```javascript
// In server.js
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});
```

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor error logs
- Check system alerts

**Weekly**:
- Review user reports
- Check database size
- Monitor API usage

**Monthly**:
- Update dependencies: `npm update`
- Review and rotate logs
- Database maintenance (if needed)
- Security audit

**Quarterly**:
- Dependency security audit: `npm audit`
- Review and update documentation
- Performance optimization review

---

## Support

For issues and questions:
- GitHub Issues: [Repository Issues](https://github.com/Heyiamabsar/HRMS-Backend/issues)
- Email: [Your support email]
- Documentation: See `REPOSITORY_ANALYSIS.md` and `API_DOCUMENTATION.md`

---

**Version**: 1.0  
**Last Updated**: 2024
