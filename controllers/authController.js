const AuthService = require('../services/authService');
const FirebaseAuthRest = require('../services/firebaseAuthRest');
const { mapRoleLabelToKey } = require('../utils/roles');
const { createSessionCookie, SESSION_COOKIE_OPTIONS } = require('../middleware/authMiddleware');
const { sendMail } = require('../services/mailService');
const { auth } = require('../config/firebase');

/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */
class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static async register(req, res) {
    try {
      const {
        email,
        password,
        name,
        role,
        roleLabel,
        phoneNumber,
        studentId,
        department,
        phone,
        workplace,
        location,
        yearOfStudy,
      } = req.body;

      // Support nested studentProfile (admin create form) or top-level fields (auth.js registration)
      const sp = req.body.studentProfile || {};
      const resolvedStudentId = studentId || sp.studentId || '';
      const resolvedDepartment = department || sp.department || '';
      const resolvedPhone = phone || phoneNumber || sp.phone || '';
      const resolvedWorkplace = workplace || sp.workplace || '';
      const resolvedLocation = location || sp.location || '';
      const resolvedYearOfStudy = yearOfStudy || sp.yearOfStudy || '';
      const resolvedDurationWeeks = parseInt(sp.durationWeeks || req.body.durationWeeks, 10) || 12;

      if (!email || !password || !name) {
        return res.status(400).json({ error: 'Email, password, and name are required' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const resolvedRole = role || mapRoleLabelToKey(roleLabel);

      // Single admin enforcement
      if (resolvedRole === 'admin') {
        const adminExists = await AuthService.adminExists();
        if (adminExists) {
          return res.status(403).json({ error: 'An administrator account already exists. Only one admin is allowed.' });
        }
      }
      const userData = {
        name,
        role: resolvedRole || 'student',
        phoneNumber: phoneNumber || phone || '',
      };

      if (userData.role === 'student') {
        userData.studentProfile = {
          studentId: resolvedStudentId,
          department: resolvedDepartment,
          phone: resolvedPhone,
          workplace: resolvedWorkplace,
          location: resolvedLocation,
          yearOfStudy: resolvedYearOfStudy,
          durationWeeks: resolvedDurationWeeks,
        };
      }

      const user = await AuthService.registerUser(email, password, userData);

      let authTokens = null;
      try {
        authTokens = await FirebaseAuthRest.signInWithPassword(email, password);
        // Set session cookie for server-side page protection
        try {
          const sessionCookie = await createSessionCookie(authTokens.idToken);
          res.cookie('__session', sessionCookie, SESSION_COOKIE_OPTIONS);
        } catch (cookieErr) {
          console.warn('Session cookie creation skipped:', cookieErr.message);
        }
      } catch (signInError) {
        console.warn('User created but auto sign-in failed:', signInError.message);
      }

      return res.status(201).json({
        message: 'User registered successfully',
        user,
        ...(authTokens
          ? {
              idToken: authTokens.idToken,
              refreshToken: authTokens.refreshToken,
              expiresIn: authTokens.expiresIn,
            }
          : {}),
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: error.message || 'Registration failed' });
    }
  }

  /**
   * Login user with email/password (Firebase REST + Firestore profile)
   * POST /api/auth/login
   */
  static async login(req, res) {
    try {
      const { email, password, role, roleLabel } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const authResult = await FirebaseAuthRest.signInWithPassword(email, password);
      const user = await AuthService.getUserByUid(authResult.uid);

      if (!user) {
        return res.status(404).json({
          error: 'Account exists in Firebase Auth but has no profile. Contact an administrator.',
        });
      }

      if (!user.active) {
        return res.status(403).json({ error: 'User account is inactive' });
      }

      const expectedRole = role || mapRoleLabelToKey(roleLabel);
      if (expectedRole && user.role !== expectedRole) {
        return res.status(403).json({
          error: `This account is registered as ${user.role.replace(/_/g, ' ')}, not ${expectedRole.replace(/_/g, ' ')}.`,
        });
      }

      // Create and set session cookie for server-side page protection
      try {
        const sessionCookie = await createSessionCookie(authResult.idToken);
        res.cookie('__session', sessionCookie, SESSION_COOKIE_OPTIONS);
      } catch (cookieErr) {
        console.warn('Session cookie creation skipped (login still proceeds):', cookieErr.message);
      }

      return res.json({
        message: 'Login successful',
        idToken: authResult.idToken,
        refreshToken: authResult.refreshToken,
        expiresIn: authResult.expiresIn,
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      const status = error.message?.includes('FIREBASE_WEB_API_KEY') ? 503 : 401;
      return res.status(status).json({ error: error.message || 'Login failed' });
    }
  }

  /**
   * Get current user profile
   * GET /api/auth/profile
   */
  static async getProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await AuthService.getUserByUid(req.user.uid);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.json({ user });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get profile' });
    }
  }

  /**
   * Update user profile
   * PUT /api/auth/profile
   */
  static async updateProfile(req, res) {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { name, phoneNumber } = req.body;
      const updates = {};

      if (name) updates.name = name;
      if (phoneNumber) updates.phoneNumber = phoneNumber;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      await AuthService.updateUserProfile(req.user.uid, updates);

      const updatedUser = await AuthService.getUserByUid(req.user.uid);

      return res.json({
        message: 'Profile updated successfully',
        user: updatedUser,
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
  }

  /**
   * Get all users (admin only)
   * GET /api/auth/users
   */
  static async getAllUsers(req, res) {
    try {
      const { role } = req.query;

      const users = await AuthService.getAllUsers(role || null);

      return res.json({
        users,
        count: users.length,
      });
    } catch (error) {
      console.error('Get users error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get users' });
    }
  }

  /**
   * Update user role (admin only)
   * PUT /api/auth/users/:uid/role
   */
  static async updateUserRole(req, res) {
    try {
      const { uid } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ error: 'Role is required' });
      }

      const validRoles = ['admin', 'school_supervisor', 'workplace_supervisor', 'student'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      // Single admin enforcement for role promotion
      // Note: This uses a check-then-act pattern which has a race condition under concurrent requests.
      // In production, this should be wrapped in a Firestore transaction for atomicity.
      if (role === 'admin') {
        const adminExists = await AuthService.adminExists();
        if (adminExists) {
          const targetUser = await AuthService.getUserByUid(uid);
          if (targetUser && targetUser.role !== 'admin') {
            return res.status(403).json({ error: 'An administrator account already exists. Only one admin is allowed.' });
          }
        }
      }

      await AuthService.updateUserProfile(uid, { role });
      await AuthService.setCustomClaims(uid, { role });

      return res.json({
        message: 'User role updated successfully',
      });
    } catch (error) {
      console.error('Update role error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update role' });
    }
  }

  /**
   * Deactivate user (admin only)
   * PUT /api/auth/users/:uid/deactivate
   */
  static async deactivateUser(req, res) {
    try {
      const { uid } = req.params;

      await AuthService.updateUserProfile(uid, { active: false });

      return res.json({
        message: 'User deactivated successfully',
      });
    } catch (error) {
      console.error('Deactivate user error:', error);
      return res.status(500).json({ error: error.message || 'Failed to deactivate user' });
    }
  }

  /**
   * Delete user (admin only)
   * DELETE /api/auth/users/:uid
   */
  static async deleteUser(req, res) {
    try {
      const { uid } = req.params;

      await AuthService.deleteUser(uid);

      return res.json({
        message: 'User deleted successfully',
      });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete user' });
    }
  }

  /**
   * Send password reset email
   * POST /api/auth/forgot-password
   * Uses Firebase Admin SDK to generate the reset link, then sends via nodemailer.
   */
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
      }

      // Generate reset link using Admin SDK (more reliable than REST API)
      let resetLink;
      try {
        resetLink = await auth.generatePasswordResetLink(email);
      } catch (adminError) {
        // Don't reveal whether the email exists — return success regardless
        console.warn('Password reset link generation failed:', adminError.message);
        return res.json({
          message: 'If an account exists with this email, a password reset link has been sent.',
        });
      }

      // Send the email via nodemailer
      const appName = 'Industrial Attachment Platform';
      const html = `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:32px">
          <h2 style="color:#1a1a2e;margin-bottom:8px">Reset your password</h2>
          <p style="color:#555;line-height:1.6">You requested a password reset for your <strong>${appName}</strong> account.</p>
          <div style="margin:24px 0">
            <a href="${resetLink}" style="display:inline-block;padding:12px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reset Password</a>
          </div>
          <p style="color:#888;font-size:0.85rem;line-height:1.5">This link will expire in 1 hour. If you didn't request this, you can safely ignore this email.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="color:#aaa;font-size:0.75rem">${appName}</p>
        </div>
      `;

      const mailResult = await sendMail({
        to: email,
        subject: `Reset your ${appName} password`,
        html,
      });

      // In development without SMTP, log the link so dev can still use it
      if (!mailResult.sent) {
        console.warn('');
        console.warn('╔══════════════════════════════════════════════════════╗');
        console.warn('║  PASSWORD RESET LINK (SMTP not configured)          ║');
        console.warn('╠══════════════════════════════════════════════════════╣');
        console.warn('║  Email:', email);
        console.warn('║  Link:', resetLink);
        console.warn('╚══════════════════════════════════════════════════════╝');
        console.warn('');
      }

      return res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
        ...(process.env.NODE_ENV === 'development' && !mailResult.sent ? { _devResetLink: resetLink } : {}),
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      return res.json({
        message: 'If an account exists with this email, a password reset link has been sent.',
      });
    }
  }

  /**
   * Public endpoint to check if admin exists (used by signup page to hide admin option)
   * GET /api/auth/admin-exists
   */
  static async checkAdminExistsPublic(req, res) {
    try {
      const exists = await AuthService.adminExists();
      return res.json({ exists, count: exists ? 1 : 0 });
    } catch (error) {
      console.error('Check admin exists error:', error);
      return res.status(503).json({ error: 'Failed to check admin existence', exists: false, count: 0 });
    }
  }

  /**
   * Create/renew a session cookie from an existing ID token
   * Used by auth-guard.js when the session cookie has expired but localStorage token is still valid
   * POST /api/auth/session
   */
  static async createSession(req, res) {
    try {
      // Expect token in Authorization header or request body
      const token = req.headers.authorization?.split('Bearer ')[1] || req.body?.idToken;

      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      // Verify the token first
      const decoded = await AuthService.verifyIdToken(token);

      // Create and set session cookie
      const sessionCookie = await createSessionCookie(token);
      res.cookie('__session', sessionCookie, SESSION_COOKIE_OPTIONS);

      return res.json({
        message: 'Session created successfully',
        uid: decoded.uid,
      });
    } catch (error) {
      console.error('Session creation error:', error);
      return res.status(401).json({ error: error.message || 'Failed to create session' });
    }
  }
}

module.exports = AuthController;
