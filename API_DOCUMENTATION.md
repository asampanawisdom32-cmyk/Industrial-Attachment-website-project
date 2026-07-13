# Firebase Backend API Documentation

## Project Structure

```text
├── config/
│   └── firebase.js              # Firebase initialization and config
├── models/
│   └── index.js                 # Data models (User, Student, Report, Evaluation)
├── services/
│   ├── firestoreService.js      # Low-level Firestore operations
│   ├── authService.js           # Authentication service
│   ├── studentsService.js       # Student management service
│   ├── reportsService.js        # Report management service
│   └── evaluationsService.js    # Evaluation service
├── controllers/
│   ├── authController.js        # Auth route handlers
│   ├── studentsController.js    # Student route handlers
│   ├── reportsController.js     # Report route handlers
│   └── evaluationsController.js # Evaluation route handlers
├── middleware/
│   └── authMiddleware.js        # Firebase auth & role verification
├── routes/
│   └── api/
│       ├── auth.js              # /api/auth routes
│       ├── students.js          # /api/students routes
│       ├── reports.js           # /api/reports routes
│       └── evaluations.js       # /api/evaluations routes
├── app.js                       # Main Express app
└── package.json
```

## Setup Instructions

### 1. Firebase Project Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable Firestore Database
4. Enable Firebase Authentication
5. Enable Realtime Database (optional)
6. Go to Project Settings > Service Accounts
7. Click "Generate New Private Key"
8. Save the JSON file as `serviceAccountKey.json` in your project root

### 2. Environment Configuration

```bash
# Copy .env.example to .env
cp .env.example .env

# Update with your Firebase credentials
# OR place serviceAccountKey.json in project root
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

```bash
# Development with hot reload
npm run dev

# Production
npm start
```

## API Endpoints

All API endpoints use Bearer token authentication in the `Authorization` header:

```text
Authorization: Bearer <firebase-id-token>
```

### Authentication Routes (`/api/auth`)

#### Register User

- **POST** `/api/auth/register`
- **Public** (no token required)
- **Body:**

  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe",
    "role": "student"
  }
  ```

- **Response:**

  ```json
  {
    "message": "User registered successfully",
    "user": {
      "uid": "firebase-uid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "student"
    }
  }
  ```

#### Login (Email Verification)

- **POST** `/api/auth/login`
- **Public** (no token required)
- **Body:**

  ```json
  {
    "email": "user@example.com"
  }
  ```

- **Note:** Use Firebase Client SDK for actual authentication

#### Get User Profile

- **GET** `/api/auth/profile`
- **Protected** (requires token)
- **Response:**

  ```json
  {
    "user": {
      "uid": "firebase-uid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "student",
      "active": true,
      "phoneNumber": "1234567890"
    }
  }
  ```

#### Update User Profile

- **PUT** `/api/auth/profile`
- **Protected** (requires token)
- **Body:**

  ```json
  {
    "name": "Jane Doe",
    "phoneNumber": "0987654321"
  }
  ```

#### Get All Users (Admin Only)

- **GET** `/api/auth/users`
- **Admin** (requires admin role)
- **Query Parameters:**
  - `role`: Filter by role (optional)

#### Update User Role (Admin Only)

- **PUT** `/api/auth/users/:uid/role`
- **Admin**
- **Body:**

  ```json
  {
    "role": "admin|school_supervisor|workplace_supervisor|student"
  }
  ```

#### Deactivate User (Admin Only)

- **PUT** `/api/auth/users/:uid/deactivate`
- **Admin**

#### Delete User (Admin Only)

- **DELETE** `/api/auth/users/:uid`
- **Admin**

### Students Routes (`/api/students`)

#### Create Student Record

- **POST** `/api/students`
- **Protected**
- **Body:**

  ```json
  {
    "uid": "firebase-uid",
    "studentId": "STU001",
    "name": "Student Name",
    "email": "student@university.edu",
    "department": "Computer Science",
    "yearOfStudy": "3",
    "phone": "1234567890",
    "workplace": "Tech Company",
    "supervisor": "supervisor-uid"
  }
  ```

#### Get Student by UID

- **GET** `/api/students/:uid`
- **Protected**

#### Get All Students

- **GET** `/api/students`
- **Supervisor/Admin Only**
- **Query Parameters:**
  - `status`: Filter by status (active, completed, dropped)

#### Update Student

- **PUT** `/api/students/:docId`
- **Supervisor/Admin Only**
- **Body:** Any updatable fields

#### Get Students by Department

- **GET** `/api/students/department/:department`
- **School Supervisor/Admin**

#### Get Students by Supervisor

- **GET** `/api/students/supervisor/:supervisorId`
- **Protected**

#### Get Student Summary

- **GET** `/api/students/:docId/summary`
- **Protected**
- **Response includes:** Student info + performance summary

#### Delete Student

- **DELETE** `/api/students/:docId`
- **Admin Only**

### Reports Routes (`/api/reports`)

#### Create Report

- **POST** `/api/reports`
- **Protected**
- **Body:**

  ```json
  {
    "studentId": "student-doc-id",
    "title": "Weekly Report - Week 1",
    "content": "Lorem ipsum...",
    "week": 1
  }
  ```

#### Get Report by ID

- **GET** `/api/reports/:reportId`
- **Protected**

#### Get Student Reports

- **GET** `/api/reports/student/:studentId`
- **Protected**

#### Get Weekly Report

- **GET** `/api/reports/student/:studentId/week/:week`
- **Protected**

#### Get Reports by Status

- **GET** `/api/reports?status=submitted`
- **Supervisor/Admin Only**
- **Query Parameters:**
  - `status`: draft, submitted, reviewed

#### Update Report

- **PUT** `/api/reports/:reportId`
- **Protected**
- **Body:** Any updatable fields

#### Submit Report

- **PUT** `/api/reports/:reportId/submit`
- **Protected**
- Changes status to "submitted"

#### Add Feedback to Report

- **PUT** `/api/reports/:reportId/feedback`
- **Supervisor/Admin Only**
- **Body:**

  ```json
  {
    "feedback": "Great work! Keep it up.",
    "status": "reviewed"
  }
  ```

#### Delete Report

- **DELETE** `/api/reports/:reportId`
- **Protected**

### Evaluations Routes (`/api/evaluations`)

#### Create Evaluation

- **POST** `/api/evaluations`
- **Supervisor/Admin Only**
- **Body:**

  ```json
  {
    "studentId": "student-doc-id",
    "supervisorId": "supervisor-uid",
    "score": 85,
    "comment": "Excellent performance",
    "category": "technical_skills"
  }
  ```

#### Get Evaluation by ID

- **GET** `/api/evaluations/:evaluationId`
- **Protected**

#### Get Student Evaluations

- **GET** `/api/evaluations/student/:studentId`
- **Protected**

#### Get Average Score

- **GET** `/api/evaluations/student/:studentId/average`
- **Protected**

#### Get Performance Summary

- **GET** `/api/evaluations/student/:studentId/summary`
- **Protected**
- **Response includes:**
  - Total evaluations
  - Average score
  - Breakdown by category

#### Get Evaluations by Supervisor

- **GET** `/api/evaluations/supervisor/:supervisorId`
- **Protected**

#### Get Evaluations by Category

- **GET** `/api/evaluations/student/:studentId/category/:category`
- **Protected**

#### Update Evaluation

- **PUT** `/api/evaluations/:evaluationId`
- **Supervisor/Admin Only**
- **Body:** Any updatable fields

#### Delete Evaluation

- **DELETE** `/api/evaluations/:evaluationId`
- **Admin Only**

## Authentication Flow

### Client-Side Authentication (Using Firebase SDK)

#### 1. Register / Sign Up

```javascript
const firebase = require('firebase/app');
const { createUserWithEmailAndPassword } = require('firebase/auth');

const auth = firebase.auth();
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// Send to backend to create user record
fetch('/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${idToken}`
  },
  body: JSON.stringify({ name, email, role })
});
```

#### 2. Login

```javascript
const { signInWithEmailAndPassword } = require('firebase/auth');

const userCredential = await signInWithEmailAndPassword(auth, email, password);
const idToken = await userCredential.user.getIdToken();

// Use idToken for API requests
```

#### 3. Use Token for API Requests

```javascript
const response = await fetch('/api/students', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${idToken}`
  }
});
```

## Error Handling

All API endpoints return errors in this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

Common HTTP Status Codes:

- `200`: Success
- `201`: Created
- `400`: Bad request (validation error)
- `401`: Unauthorized (missing/invalid token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not found
- `500`: Server error

## Firestore Collections

The app automatically uses these Firestore collections:

- **users** - User accounts and profiles
- **students** - Student enrollment records
- **reports** - Weekly/periodic reports
- **evaluations** - Performance evaluations
- (Future: attendance, workflows)

## Migration from MongoDB

If you were using MongoDB before:

1. Data models are similar but now use Firestore documents
2. No need for manual schemas - Firestore is flexible
3. Queries use Firestore's `.where()` method
4. Batch operations use Firestore's batch API
5. All business logic is now in service layer

## Best Practices

1. **Always use services** - Don't call Firestore directly from controllers
2. **Validate input** - Controllers should validate request data
3. **Use proper middleware** - Check auth and roles before business logic
4. **Error handling** - Use try/catch and return proper error messages
5. **Async/await** - All database operations are async
6. **Environment variables** - Keep secrets in .env, never commit them

## Next Steps

1. Set up Firebase project and download service account key
2. Create `.env` file with Firebase credentials
3. Run `npm install`
4. Test API endpoints using Postman or similar tool
5. Integrate Firebase Auth SDK in frontend
6. Update frontend views to use new API endpoints
