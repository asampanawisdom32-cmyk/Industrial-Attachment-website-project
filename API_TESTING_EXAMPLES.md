# API Testing Examples

## 🧪 Test the API with These Examples

### Using cURL

#### Register a Student
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student1@uni.edu",
    "password": "Student@123",
    "name": "John Doe",
    "role": "student"
  }'
```

#### Register an Admin
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@uni.edu",
    "password": "Admin@123",
    "name": "Admin User",
    "role": "admin"
  }'
```

#### Get User Profile (with token)
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_ID_TOKEN"
```

### Using Postman

#### 1. Create Collection

1. Open Postman
2. Click "+ New"
3. Select "Collection"
4. Name it "Industrial Attachment API"
5. Click "Create"

#### 2. Set Up Environment Variable

1. Click "Environments" (gear icon)
2. Click "+ Create New"
3. Name: "Firebase Dev"
4. Add variable:
   - Key: `token`
   - Value: (leave empty, will be filled after login)
5. Click "Save"

#### 3. Register Request

**Method:** POST  
**URL:** `http://localhost:3000/api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "student@university.edu",
  "password": "Student@123",
  "name": "Jane Smith",
  "role": "student"
}
```

**Expected Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "uid": "abc123...",
    "email": "student@university.edu",
    "name": "Jane Smith",
    "role": "student"
  }
}
```

#### 4. Create Student Record

**Method:** POST  
**URL:** `http://localhost:3000/api/students`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "uid": "abc123...",
  "studentId": "STU001",
  "name": "Jane Smith",
  "email": "student@university.edu",
  "department": "Computer Science",
  "yearOfStudy": "3",
  "phone": "1234567890",
  "workplace": "Tech Solutions Inc",
  "supervisor": "prof_id_123"
}
```

#### 5. Get Student by UID

**Method:** GET  
**URL:** `http://localhost:3000/api/students/abc123...`

**Headers:**
```
Authorization: Bearer {{token}}
```

#### 6. Get All Students (Admin)

**Method:** GET  
**URL:** `http://localhost:3000/api/students?status=active`

**Headers:**
```
Authorization: Bearer {{token}}
```

#### 7. Create Report

**Method:** POST  
**URL:** `http://localhost:3000/api/reports`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "studentId": "doc123...",
  "title": "Weekly Report - Week 1",
  "content": "This week I worked on project setup and familiarization with the team. I completed the onboarding process and set up my development environment.",
  "week": 1
}
```

#### 8. Submit Report

**Method:** PUT  
**URL:** `http://localhost:3000/api/reports/report_doc_id/submit`

**Headers:**
```
Authorization: Bearer {{token}}
```

#### 9. Create Evaluation (Supervisor)

**Method:** POST  
**URL:** `http://localhost:3000/api/evaluations`

**Headers:**
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "studentId": "doc123...",
  "supervisorId": "supervisor_uid",
  "score": 85,
  "comment": "Excellent work. Very attentive and quick learner.",
  "category": "technical_skills"
}
```

#### 10. Get Performance Summary

**Method:** GET  
**URL:** `http://localhost:3000/api/evaluations/student/doc123.../summary`

**Headers:**
```
Authorization: Bearer {{token}}
```

**Response:**
```json
{
  "studentId": "doc123...",
  "summary": {
    "totalEvaluations": 4,
    "averageScore": 82.5,
    "byCategory": {
      "technical_skills": {
        "scores": [85, 80],
        "average": 82.5
      },
      "soft_skills": {
        "scores": [90],
        "average": 90
      }
    }
  }
}
```

### Using JavaScript Fetch

```javascript
// Helper function with auth
async function apiCall(method, endpoint, body = null) {
  const token = localStorage.getItem('firebaseToken');
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(`http://localhost:3000/api${endpoint}`, options);
  return response.json();
}

// Register
async function register() {
  const result = await apiCall('POST', '/auth/register', {
    email: 'student@uni.edu',
    password: 'Student@123',
    name: 'Student Name',
    role: 'student'
  });
  console.log(result);
}

// Create student
async function createStudent() {
  const result = await apiCall('POST', '/students', {
    uid: 'firebase-uid',
    studentId: 'STU001',
    name: 'Student Name',
    email: 'student@uni.edu',
    department: 'CS',
    yearOfStudy: '3',
    phone: '1234567890'
  });
  console.log(result);
}

// Get student
async function getStudent() {
  const result = await apiCall('GET', '/students/firebase-uid');
  console.log(result);
}

// Create report
async function createReport() {
  const result = await apiCall('POST', '/reports', {
    studentId: 'doc-id',
    title: 'Weekly Report Week 1',
    content: 'Report content here...',
    week: 1
  });
  console.log(result);
}

// Submit report
async function submitReport() {
  const result = await apiCall('PUT', '/reports/report-doc-id/submit');
  console.log(result);
}

// Add feedback (supervisor)
async function addFeedback() {
  const result = await apiCall('PUT', '/reports/report-doc-id/feedback', {
    feedback: 'Great work! Keep improving.',
    status: 'reviewed'
  });
  console.log(result);
}

// Create evaluation (supervisor)
async function createEvaluation() {
  const result = await apiCall('POST', '/evaluations', {
    studentId: 'student-doc-id',
    supervisorId: 'supervisor-uid',
    score: 88,
    comment: 'Excellent performance',
    category: 'technical_skills'
  });
  console.log(result);
}

// Get performance summary
async function getPerformanceSummary() {
  const result = await apiCall('GET', '/evaluations/student/student-doc-id/summary');
  console.log(result);
}
```

### Using Python Requests

```python
import requests
import json

BASE_URL = 'http://localhost:3000/api'
TOKEN = 'your-firebase-id-token'

headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {TOKEN}'
}

# Register user
def register_user():
    response = requests.post(f'{BASE_URL}/auth/register', 
        headers={'Content-Type': 'application/json'},
        json={
            'email': 'student@uni.edu',
            'password': 'Student@123',
            'name': 'Student Name',
            'role': 'student'
        }
    )
    print(response.json())

# Get user profile
def get_profile():
    response = requests.get(f'{BASE_URL}/auth/profile', headers=headers)
    print(response.json())

# Create student
def create_student():
    data = {
        'uid': 'firebase-uid',
        'studentId': 'STU001',
        'name': 'Student Name',
        'email': 'student@uni.edu',
        'department': 'CS',
        'yearOfStudy': '3'
    }
    response = requests.post(f'{BASE_URL}/students', headers=headers, json=data)
    print(response.json())

# Get all students
def get_all_students():
    response = requests.get(f'{BASE_URL}/students?status=active', headers=headers)
    print(response.json())

# Create report
def create_report():
    data = {
        'studentId': 'student-doc-id',
        'title': 'Weekly Report',
        'content': 'Report content...',
        'week': 1
    }
    response = requests.post(f'{BASE_URL}/reports', headers=headers, json=data)
    print(response.json())

if __name__ == '__main__':
    register_user()
    # get_profile()
    # create_student()
    # get_all_students()
    # create_report()
```

## 📊 Data Relationships

```
User (Firebase Auth + Firestore)
├── Student Record (one-to-one)
│   ├── Reports (one-to-many)
│   │   ├── Feedback (one-to-many)
│   └── Evaluations (one-to-many)
├── as Supervisor
│   ├── Students supervised (many-to-many)
│   ├── Reports reviewed
│   └── Evaluations created
```

## ✅ Test Checklist

- [ ] Server starts without errors
- [ ] Register new user successfully
- [ ] Register another user with different role (admin, supervisor)
- [ ] Get user profile with token
- [ ] Create student record
- [ ] List all students
- [ ] Create report
- [ ] Submit report
- [ ] Create evaluation
- [ ] Get performance summary
- [ ] Error handling (bad token, wrong role, missing fields)

## 🐛 Debugging

### Enable detailed logging
```javascript
// In app.js, add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});
```

### Check token validity
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Firestore data
1. Go to Firebase Console
2. Click Firestore Database
3. Browse collections to see created data

## 🚀 Performance Testing

```bash
# Install ApacheBench
# Ubuntu/Debian: sudo apt-get install apache2-utils
# macOS: brew install ab

# Test with 100 requests, 10 concurrent
ab -n 100 -c 10 http://localhost:3000/api/health
```

---

Happy testing! 🎉
