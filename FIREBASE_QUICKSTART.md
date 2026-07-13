# Firebase Backend - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Set Up Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click "Create a new project"
3. Enter project name (e.g., "industrial-attachment")
4. Accept defaults and create
5. Wait for project to be created (2-3 minutes)

### Step 2: Enable Services

In Firebase Console:

1. **Firestore Database:**
   - Click "Build" → "Firestore Database"
   - Click "Create database"
   - Choose "Start in production mode"
   - Select region (pick closest to you)
   - Click "Enable"

2. **Authentication:**
   - Click "Build" → "Authentication"
   - Click "Get started"
   - Enable "Email/Password" provider
   - Click "Save"

3. **Realtime Database** (Optional)
   - Click "Build" → "Realtime Database"
   - Click "Create database"
   - Choose "United States" region
   - Click "Enable"

### Step 3: Get Credentials

1. Click ⚙️ (Settings icon) → "Project settings"
2. Go to "Service Accounts" tab
3. Click "Generate New Private Key"
4. Save the JSON file as `serviceAccountKey.json` in your project root

### Step 4: Install Dependencies

```bash
cd "c:\Users\user\Documents\Industrial Attachment website project"
npm install
```

### Step 5: Configure Environment

Create `.env` file in your project root:

```
NODE_ENV=development
PORT=3000
```

If you can't use `serviceAccountKey.json`, add to .env:
```
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-email
```

### Step 6: Start Server

```bash
npm start
```

Server running at: `http://localhost:3000`

## 📝 Test the API

### Using Curl or Postman

#### 1. Register a User
```bash
POST http://localhost:3000/api/auth/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "password123",
  "name": "Test User",
  "role": "student"
}
```

**Expected Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "uid": "firebase-uid...",
    "email": "test@example.com",
    "name": "Test User",
    "role": "student"
  }
}
```

#### 2. Check Health
```bash
GET http://localhost:3000/api/health
```

#### 3. View API Documentation
Open your browser: `http://localhost:3000/api`

## 🔑 Get Firebase ID Token

To test protected endpoints, you need a token. Use Firebase SDK:

### In Node.js/Backend Testing:
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Get token (for testing)
firebase --project your-project-id functions:shell
```

### In Frontend (React/Vue):
```javascript
import { signInWithEmailAndPassword } from "firebase/auth";

const credential = await signInWithEmailAndPassword(auth, "test@example.com", "password123");
const token = await credential.user.getIdToken();

// Use token in API requests
fetch('http://localhost:3000/api/students', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## 📚 Available Endpoints

### Public (No Auth)
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Verify user email
- `GET /api/health` - Check server status

### Protected (Requires Token)
- `GET /api/auth/profile` - Get your profile
- `PUT /api/auth/profile` - Update your profile
- `POST /api/students` - Create student record
- `GET /api/students/:uid` - Get student
- `POST /api/reports` - Create report
- `GET /api/reports/:reportId` - Get report
- `POST /api/evaluations` - Create evaluation (admin/supervisor)
- `GET /api/evaluations/student/:studentId` - Get evaluations

See `API_DOCUMENTATION.md` for complete list.

## 🛠️ Common Issues

### Issue: "Cannot find Firebase credentials"
**Solution:**
- Ensure `serviceAccountKey.json` is in project root, OR
- Add Firebase credentials to `.env` file
- Restart server

### Issue: "CORS Error"
**Solution:**
```javascript
// Frontend - add to your fetch request
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Issue: "Permission denied" on Firestore
**Solution:**
1. Go to Firestore in Firebase Console
2. Click "Rules" tab
3. Update rules to:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```
4. Click "Publish"

### Issue: "serviceAccountKey.json not found"
**Solution:**
1. Check file is in project root (not in subdirectory)
2. Verify filename spelling exactly
3. Or use environment variables instead

## 📖 Documentation

- **API_DOCUMENTATION.md** - Complete API reference
- **BACKEND_RESTRUCTURING_SUMMARY.md** - Architecture overview
- **API_DOCUMENTATION.md** - Full endpoint specifications

## 🚢 Next Steps

1. ✅ Firebase project created
2. ✅ Backend running
3. → Create frontend with Firebase SDK
4. → Integrate with your UI
5. → Deploy to production

## 📱 Frontend Integration Example

```html
<!-- Include Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth.js"></script>

<script>
  // Initialize Firebase (get config from Firebase Console)
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
  };

  const app = firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth(app);

  // Register
  async function register(email, password, name) {
    const credential = await auth.createUserWithEmailAndPassword(email, password);
    const token = await credential.user.getIdToken();
    
    // Create user in backend
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password, name, role: 'student' })
    });
    return res.json();
  }

  // Login
  async function login(email, password) {
    const credential = await auth.signInWithEmailAndPassword(email, password);
    return await credential.user.getIdToken();
  }
</script>
```

## 🆘 Need Help?

1. Check `API_DOCUMENTATION.md` for endpoint details
2. Review `BACKEND_RESTRUCTURING_SUMMARY.md` for architecture
3. Check Firestore Rules in Firebase Console
4. Verify environment variables in `.env`
5. Look at console logs for error messages

## 🎉 You're Ready!

Your backend is now:
- ✅ Professionally structured
- ✅ Firebase-powered
- ✅ Secure with authentication
- ✅ Scalable for growth
- ✅ Ready for production

Start building! 🚀
