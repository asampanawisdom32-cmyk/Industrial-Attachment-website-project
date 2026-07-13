const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin SDK
let serviceAccount;
let initialized = false;

// Helper: try to load service account from env or file
function loadServiceAccount() {
  // 1. Try FIREBASE_SERVICE_ACCOUNT env var (JSON string)
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw);
      console.log('Firebase service account loaded from FIREBASE_SERVICE_ACCOUNT env var.');
      return parsed;
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT env var is set but invalid JSON:', e.message);
      console.error('First 100 chars:', raw.substring(0, 100));
    }
  }

  // 2. Try serviceAccountKey.json file (local dev)
  try {
    const sa = require(path.join(__dirname, '../serviceAccountKey.json'));
    console.log('Firebase service account loaded from serviceAccountKey.json file.');
    return sa;
  } catch (_) {}

  // 3. Not found
  console.error('No Firebase service account found.');
  console.error('Set FIREBASE_SERVICE_ACCOUNT env var or place serviceAccountKey.json in project root.');
  return null;
}

serviceAccount = loadServiceAccount();

// Only initialize if we have credentials
const hasServiceAccountCredentials = serviceAccount &&
  serviceAccount.project_id &&
  serviceAccount.client_email &&
  serviceAccount.private_key;

let db = null;
let auth = null;

if (!admin.apps.length) {
  try {
    const projectId = serviceAccount?.project_id || process.env.FIREBASE_PROJECT_ID;
    const appOptions = {};

    if (projectId) {
      appOptions.projectId = projectId;
    }

    if (hasServiceAccountCredentials) {
      appOptions.credential = admin.credential.cert(serviceAccount);
      console.log('Firebase Admin SDK initialized with service account credentials.');
    } else {
      console.warn('No service account credentials found. Firebase will have limited functionality.');
      appOptions.projectId = projectId || 'industrial-attachment-website';
    }

    admin.initializeApp(appOptions);
    db = admin.firestore();
    auth = admin.auth();
    initialized = true;
  } catch (initError) {
    console.error('Firebase Admin SDK initialization failed:', initError.message);
  }
}

function getDb() {
  if (!db) throw new Error('Firestore not initialized. Check Firebase service account credentials.');
  return db;
}

function getAuth() {
  if (!auth) throw new Error('Firebase Auth not initialized. Check Firebase service account credentials.');
  return auth;
}

module.exports = {
  admin,
  db,
  auth,
  getDb,
  getAuth,
  initialized,
};
