# Quick Start Guide - Industrial Attachment Platform

## ✅ All Issues Fixed

All critical errors related to authentication and database operations have been corrected. The application is now ready to run.

## What Was Fixed

### Critical Issues (9 Total)
1. ✅ **Async/Await in Routes** - All db function calls now properly await results
2. ✅ **Password Verification** - verifyPassword() is now properly async
3. ✅ **Session Security** - Secret moved to environment variable
4. ✅ **Error Handling** - Comprehensive try-catch blocks throughout
5. ✅ **MongoDB Configuration** - Proper connection setup verified
6. ✅ **Input Validation** - All routes validate user input
7. ✅ **Password Hashing** - Consistent salt rounds applied
8. ✅ **User ID Consistency** - Proper ID generation strategy
9. ✅ **Environment Configuration** - .env file properly configured

## Getting Started

### 1. Install Dependencies

```bash
cd "c:\Users\user\Documents\Industrial Attachment website project"
npm install
```

### 2. Ensure MongoDB is Running

MongoDB must be running on `mongodb://localhost:27017` (default)

- If using MongoDB locally: Start MongoDB service
- If using MongoDB Atlas: Update MONGO_URI in .env

### 3. Start the Application

```bash
npm start              # Production mode
# OR
npm run dev           # Development mode (requires nodemon)
```

### 4. Access the Application

Open browser and go to: `http://localhost:3000`

## Default Test Accounts

All accounts are pre-populated on first run:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@btu.edu.gh | Admin@123 |
| School Supervisor | school.sup@btu.edu.gh | School@123 |
| Workplace Supervisor | work.sup@btu.edu.gh | Work@123 |
| Student | student@btu.edu.gh | Student@123 |

## Key Features

- **User Authentication**: Secure login/signup with bcrypt hashing
- **Role-Based Access**: Admin, School Supervisor, Workplace Supervisor, Student
- **Student Management**: Track students, attendance, and progress
- **Report Submissions**: Students can submit reports
- **Analytics Dashboard**: Admin-only analytics view
- **Session Management**: 4-hour session timeout

## File Structure

```text
project/
├── app.js                  # Main Express app
├── db.js                   # MongoDB operations
├── .env                    # Environment variables
├── package.json           # Dependencies
├── routes/
│   ├── auth.js           # Authentication routes
│   └── dashboard.js       # Dashboard/main routes
├── views/                 # EJS templates
├── public/                # Static files
├── sessions/              # Session files
└── data/                  # Data directory
```

## Environment Variables

Located in `.env`:
- `MONGO_URI` - MongoDB connection string
- `PORT` - Server port (default: 3000)
- `SESSION_SECRET` - Session signing key
- `NODE_ENV` - Environment (development/production)

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check MONGO_URI in .env matches your setup
- Run: `node test-db-connection.js` to test

### Module Not Found
- Run: `npm install` to install dependencies
- Delete node_modules and package-lock.json, then reinstall

### Session Errors
- Delete the `sessions/` directory
- Restart the application

### Port Already in Use
- Change PORT in .env
- Or stop the process using port 3000

## Security Notes

- **Session Secret**: Change SESSION_SECRET in .env for production
- **MongoDB URI**: Use authenticated connection for production
- **NODE_ENV**: Set to "production" for production deployment
- **Passwords**: All passwords are hashed with bcrypt (10 salt rounds)

## Testing Database Connection

```bash
node test-db-connection.js
```

Expected output:

```text
🔄 Testing MongoDB connection...
✅ MongoDB connection successful!
📍 Connection URI: mongodb://localhost:27017
📦 Collections initialized: users, students, reports, evaluations, attendance_logs, workflows
```

---

**Last Updated**: May 2026
**Status**: All issues resolved ✅
