const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin SDK
// You need to download your service account key from Firebase Console
// Project Settings > Service Accounts > Generate New Private Key
let serviceAccount;
let initialized = false;

try {
  serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
} catch (error) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
  } catch (_) {
    serviceAccount = {
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
    };
  }
}

// Only initialize if we have either service-account credentials or default runtime credentials
const hasServiceAccountCredentials = serviceAccount &&
  (serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID) &&
  (serviceAccount.client_email || serviceAccount.private_key);

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
    } else {
      appOptions.credential = admin.credential.applicationDefault();
    }

    admin.initializeApp(appOptions);
    db = admin.firestore();
    auth = admin.auth();
    initialized = true;
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (initError) {
    console.warn('Firebase Admin SDK initialization failed:', initError.message);
    console.warn('The application will run with limited functionality. Add serviceAccountKey.json or deploy with default credentials.');
  }
}

if (!initialized && !admin.apps.length) {
  console.warn('');
  console.warn('⚠️  Firebase Admin SDK not initialized.');
  console.warn('   To enable full functionality, place your serviceAccountKey.json');
  console.warn('   in the project root directory, or deploy with default Firebase credentials.');
  console.warn('');
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
