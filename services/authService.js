const { auth } = require('../config/firebase');
const { User } = require('../models');
const FirestoreService = require('./firestoreService');
const StudentsService = require('./studentsService');

/**
 * Authentication Service
 * Handles user authentication with Firebase Auth and Firestore
 */
class AuthService {
  /**
   * Check if an admin account already exists
   * @returns {boolean} - True if an admin exists
   */
  static async adminExists() {
    try {
      // Use limit(1) for efficiency — we don't need to fetch ALL admins
      const admins = await FirestoreService.getByField('users', 'role', 'admin', 1);
      return admins.length > 0;
    } catch (error) {
      console.error('Error checking admin existence:', error);
      throw new Error('Failed to check admin existence');
    }
  }

  /**
   * Get all supervisors (school and workplace)
   * @returns {object} - { schoolSupervisors: [], workplaceSupervisors: [] }
   */
  static async getAllSupervisors() {
    try {
      const schoolSup = await FirestoreService.getByField('users', 'role', 'school_supervisor');
      const workplaceSup = await FirestoreService.getByField('users', 'role', 'workplace_supervisor');
      return {
        schoolSupervisors: schoolSup,
        workplaceSupervisors: workplaceSup,
      };
    } catch (error) {
      console.error('Error getting supervisors:', error);
      throw new Error(`Failed to get supervisors: ${error.message}`);
    }
  }

  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {object} userData - Additional user data {name, role, etc}
   */
  static async registerUser(email, password, userData = {}) {
    try {
      const normalizedEmail = String(email).trim().toLowerCase();

      const userRecord = await auth.createUser({
        email: normalizedEmail,
        password,
        displayName: userData.name || '',
      });

      const role = userData.role || 'student';
      const user = new User({
        uid: userRecord.uid,
        email: normalizedEmail,
        name: userData.name || '',
        role,
        phoneNumber: userData.phoneNumber || '',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await FirestoreService.createDocument('users', user.toObject(), userRecord.uid);
      await auth.setCustomUserClaims(userRecord.uid, { role });

      if (role === 'student' && userData.studentProfile) {
        await StudentsService.createStudent(userRecord.uid, {
          studentId: userData.studentProfile.studentId || userRecord.uid.slice(0, 8),
          name: userData.name || '',
          email: normalizedEmail,
          department: userData.studentProfile.department || '',
          phone: userData.studentProfile.phone || userData.phoneNumber || '',
          workplace: userData.studentProfile.workplace || '',
          location: userData.studentProfile.location || '',
          yearOfStudy: userData.studentProfile.yearOfStudy || '',
          durationWeeks: userData.studentProfile.durationWeeks || 12,
        });
      }

      return {
        uid: userRecord.uid,
        email: user.email,
        name: user.name,
        role: user.role,
      };
    } catch (error) {
      console.error('Error registering user:', error);
      const message = error.code === 'auth/email-already-exists'
        ? 'An account with this email already exists.'
        : error.message;
      throw new Error(`Registration failed: ${message}`);
    }
  }

  /**
   * Get user by email
   * @param {string} email - User email
   */
  static async getUserByEmail(email) {
    try {
      const users = await FirestoreService.getByField('users', 'email', String(email).trim().toLowerCase());
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Get user by UID
   * @param {string} uid - Firebase UID
   */
  static async getUserByUid(uid) {
    try {
      return await FirestoreService.getDocument('users', uid);
    } catch (error) {
      console.error('Error getting user by UID:', error);
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Update user profile
   * @param {string} uid - Firebase UID
   * @param {object} updates - Fields to update
   */
  static async updateUserProfile(uid, updates) {
    try {
      const updateData = {
        ...updates,
        updatedAt: new Date(),
      };

      // Update in Firestore
      await FirestoreService.updateDocument('users', uid, updateData);

      // Update in Firebase Auth if email or name changed
      const authUpdate = {};
      if (updates.email) authUpdate.email = updates.email;
      if (updates.name) authUpdate.displayName = updates.name;

      if (Object.keys(authUpdate).length > 0) {
        await auth.updateUser(uid, authUpdate);
      }

      return true;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  /**
   * Delete user
   * @param {string} uid - Firebase UID
   */
  static async deleteUser(uid) {
    try {
      // Delete from Firebase Auth
      await auth.deleteUser(uid);

      // Delete from Firestore
      await FirestoreService.deleteDocument('users', uid);

      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Get all users with optional role filter
   * @param {string} role - Optional role filter
   */
  static async getAllUsers(role = null) {
    try {
      if (role) {
        return await FirestoreService.getByField('users', 'role', role);
      }
      return await FirestoreService.getDocuments('users');
    } catch (error) {
      console.error('Error getting all users:', error);
      throw new Error(`Failed to get users: ${error.message}`);
    }
  }

  /**
   * Verify Firebase ID token
   * @param {string} token - Firebase ID token
   */
  static async verifyIdToken(token) {
    try {
      const decodedToken = await auth.verifyIdToken(token);
      return decodedToken;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new Error(`Token verification failed: ${error.message}`);
    }
  }

  /**
   * Create custom token for testing
   * @param {string} uid - Firebase UID
   */
  static async createCustomToken(uid) {
    try {
      const customToken = await auth.createCustomToken(uid);
      return customToken;
    } catch (error) {
      console.error('Error creating custom token:', error);
      throw new Error(`Failed to create token: ${error.message}`);
    }
  }

  /**
   * Set custom claims for user (e.g., admin roles)
   * @param {string} uid - Firebase UID
   * @param {object} claims - Custom claims object
   */
  static async setCustomClaims(uid, claims) {
    try {
      await auth.setCustomUserClaims(uid, claims);
      return true;
    } catch (error) {
      console.error('Error setting custom claims:', error);
      throw new Error(`Failed to set custom claims: ${error.message}`);
    }
  }
}

module.exports = AuthService;
