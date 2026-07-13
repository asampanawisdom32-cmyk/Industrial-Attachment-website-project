/**
 * Firebase Auth REST API (email/password sign-in)
 * Requires FIREBASE_WEB_API_KEY in environment.
 * Requires Node.js 18+ (native fetch) or install 'node-fetch' for older versions.
 */
if (typeof fetch === 'undefined') {
  try {
    global.fetch = require('node-fetch');
  } catch (_) {
    throw new Error(
      'fetch is not available. This application requires Node.js 18+ or the "node-fetch" package. ' +
      'Run: npm install node-fetch@2'
    );
  }
}

class FirebaseAuthRest {
  static getApiKey() {
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      throw new Error(
        'FIREBASE_WEB_API_KEY is not set. Add your Web API key from Firebase Console > Project settings > General.'
      );
    }
    return apiKey;
  }

  static async signInWithPassword(email, password) {
    const apiKey = this.getApiKey();
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || 'Authentication failed';
      const err = new Error(this.mapFirebaseError(message));
      err.code = data?.error?.message;
      throw err;
    }

    return {
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      uid: data.localId,
      email: data.email,
    };
  }

  /**
   * Send password reset email via Firebase Auth REST API
   * POST https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode
   * @param {string} email - User email to send reset link to
   */
  static async sendPasswordResetEmail(email) {
    const apiKey = this.getApiKey();
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          requestType: 'PASSWORD_RESET',
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || 'Failed to send reset email';
      const err = new Error(this.mapFirebaseError(message));
      err.code = data?.error?.message;
      throw err;
    }

    return {
      email: data.email,
    };
  }

  static mapFirebaseError(code) {
    const map = {
      EMAIL_NOT_FOUND: 'No account found with this email.',
      INVALID_PASSWORD: 'Incorrect password.',
      INVALID_LOGIN_CREDENTIALS: 'Invalid email or password.',
      USER_DISABLED: 'This account has been disabled.',
      TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many attempts. Try again later.',
    };
    return map[code] || code.replace(/_/g, ' ').toLowerCase();
  }
}

module.exports = FirebaseAuthRest;
