const AuthController = require('../../controllers/authController');
const AuthService = require('../../services/authService');
const FirebaseAuthRest = require('../../services/firebaseAuthRest');

jest.mock('../../services/authService');
jest.mock('../../services/firebaseAuthRest');
jest.mock('../../middleware/authMiddleware', () => ({
  createSessionCookie: jest.fn(() => Promise.resolve('session-cookie-value')),
  SESSION_COOKIE_OPTIONS: { maxAge: 999, httpOnly: true, secure: false, sameSite: 'lax', path: '/' },
}));

// Mock utils/roles inline - keep it simple
jest.mock('../../utils/roles', () => ({
  mapRoleLabelToKey: jest.fn((label) => {
    const map = { Admin: 'admin', 'School Supervisor': 'school_supervisor', 'Workplace Supervisor': 'workplace_supervisor', Student: 'student' };
    return map[label] || 'student';
  }),
}));

describe('AuthController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };
  });

  // ─── register ──────────────────────────────────────────────────
  describe('register', () => {
    const validBody = {
      email: 'new@test.com',
      password: 'password123',
      name: 'New User',
    };

    it('registers a user and returns 201 with tokens', async () => {
      req.body = validBody;
      AuthService.registerUser.mockResolvedValue({ uid: 'u1', email: 'new@test.com', name: 'New User', role: 'student' });
      FirebaseAuthRest.signInWithPassword.mockResolvedValue({
        idToken: 'id-token', refreshToken: 'refresh', expiresIn: '3600',
      });

      await AuthController.register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'User registered successfully',
          idToken: 'id-token',
          refreshToken: 'refresh',
        })
      );
      expect(res.cookie).toHaveBeenCalledWith('__session', 'session-cookie-value', expect.any(Object));
    });

    it('returns 400 when email, password, or name is missing', async () => {
      req.body = { email: 'test@test.com' }; // missing password and name
      await AuthController.register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Email, password, and name are required' });
    });

    it('returns 400 for short password', async () => {
      req.body = { email: 'a@b.com', password: '12345', name: 'Test' };
      await AuthController.register(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Password must be at least 6 characters' });
    });

    it('returns 403 when trying to register second admin', async () => {
      req.body = { ...validBody, role: 'admin' };
      AuthService.adminExists.mockResolvedValue(true);
      await AuthController.register(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'An administrator account already exists. Only one admin is allowed.' });
    });

    it('handles registration failure gracefully', async () => {
      req.body = validBody;
      AuthService.registerUser.mockRejectedValue(new Error('Email exists'));
      await AuthController.register(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ─── login ─────────────────────────────────────────────────────
  describe('login', () => {
    it('logs in and returns tokens with user profile', async () => {
      req.body = { email: 'test@test.com', password: 'password123' };
      FirebaseAuthRest.signInWithPassword.mockResolvedValue({
        idToken: 'id-token', refreshToken: 'refresh', expiresIn: '3600', uid: 'u1',
      });
      AuthService.getUserByUid.mockResolvedValue({
        uid: 'u1', email: 'test@test.com', name: 'Test', role: 'student', active: true,
      });

      await AuthController.login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Login successful',
          idToken: 'id-token',
          user: expect.objectContaining({ uid: 'u1', role: 'student' }),
        })
      );
    });

    it('returns 400 for missing email or password', async () => {
      req.body = { email: 'test@test.com' };
      await AuthController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 404 when user has no profile', async () => {
      req.body = { email: 'orphan@test.com', password: 'password123' };
      FirebaseAuthRest.signInWithPassword.mockResolvedValue({ uid: 'orphan', idToken: 't' });
      AuthService.getUserByUid.mockResolvedValue(null);

      await AuthController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when user is inactive', async () => {
      req.body = { email: 'inactive@test.com', password: 'password123' };
      FirebaseAuthRest.signInWithPassword.mockResolvedValue({ uid: 'inactive', idToken: 't' });
      AuthService.getUserByUid.mockResolvedValue({ uid: 'inactive', active: false });

      await AuthController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'User account is inactive' });
    });

    it('returns 403 on role mismatch', async () => {
      req.body = { email: 'a@b.com', password: 'p', role: 'admin' };
      FirebaseAuthRest.signInWithPassword.mockResolvedValue({ uid: 'u1', idToken: 't' });
      AuthService.getUserByUid.mockResolvedValue({ uid: 'u1', active: true, role: 'student' });

      await AuthController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 401 on invalid credentials', async () => {
      req.body = { email: 'bad@test.com', password: 'wrong' };
      FirebaseAuthRest.signInWithPassword.mockRejectedValue(new Error('INVALID_LOGIN_CREDENTIALS'));

      await AuthController.login(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── getProfile ───────────────────────────────────────────────
  describe('getProfile', () => {
    it('returns user profile when authenticated', async () => {
      req.user = { uid: 'u1' };
      AuthService.getUserByUid.mockResolvedValue({ uid: 'u1', name: 'Test', role: 'student' });
      await AuthController.getProfile(req, res);
      expect(res.json).toHaveBeenCalledWith({ user: { uid: 'u1', name: 'Test', role: 'student' } });
    });

    it('returns 401 when not authenticated', async () => {
      req.user = null;
      await AuthController.getProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 404 when user not found', async () => {
      req.user = { uid: 'nonexistent' };
      AuthService.getUserByUid.mockResolvedValue(null);
      await AuthController.getProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── updateProfile ────────────────────────────────────────────
  describe('updateProfile', () => {
    it('updates profile and returns updated user', async () => {
      req.user = { uid: 'u1' };
      req.body = { name: 'New Name', phoneNumber: '123' };
      AuthService.updateUserProfile.mockResolvedValue(true);
      AuthService.getUserByUid.mockResolvedValue({ uid: 'u1', name: 'New Name', phoneNumber: '123' });

      await AuthController.updateProfile(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Profile updated successfully' })
      );
    });

    it('returns 400 when no fields provided', async () => {
      req.user = { uid: 'u1' };
      req.body = {};
      await AuthController.updateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'No fields to update' });
    });

    it('returns 401 when not authenticated', async () => {
      req.user = null;
      await AuthController.updateProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── getAllUsers ──────────────────────────────────────────────
  describe('getAllUsers', () => {
    it('returns all users with count', async () => {
      AuthService.getAllUsers.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      await AuthController.getAllUsers(req, res);
      expect(res.json).toHaveBeenCalledWith({ users: [{ id: 'u1' }, { id: 'u2' }], count: 2 });
    });

    it('passes role query filter', async () => {
      req.query = { role: 'admin' };
      AuthService.getAllUsers.mockResolvedValue([{ id: 'a1', role: 'admin' }]);
      await AuthController.getAllUsers(req, res);
      expect(AuthService.getAllUsers).toHaveBeenCalledWith('admin');
    });
  });

  // ─── updateUserRole ───────────────────────────────────────────
  describe('updateUserRole', () => {
    it('updates user role successfully', async () => {
      req.params = { uid: 'u1' };
      req.body = { role: 'school_supervisor' };
      AuthService.updateUserProfile.mockResolvedValue(true);
      AuthService.setCustomClaims.mockResolvedValue(true);

      await AuthController.updateUserRole(req, res);
      expect(res.json).toHaveBeenCalledWith({ message: 'User role updated successfully' });
    });

    it('returns 400 when role is missing', async () => {
      req.params = { uid: 'u1' };
      req.body = {};
      await AuthController.updateUserRole(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for invalid role', async () => {
      req.params = { uid: 'u1' };
      req.body = { role: 'superadmin' };
      await AuthController.updateUserRole(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 403 when promoting to admin and one already exists', async () => {
      req.params = { uid: 'u1' };
      req.body = { role: 'admin' };
      AuthService.adminExists.mockResolvedValue(true);
      AuthService.getUserByUid.mockResolvedValue({ uid: 'u1', role: 'student' });
      await AuthController.updateUserRole(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── deactivateUser ───────────────────────────────────────────
  describe('deactivateUser', () => {
    it('deactivates a user', async () => {
      req.params = { uid: 'u1' };
      AuthService.updateUserProfile.mockResolvedValue(true);
      await AuthController.deactivateUser(req, res);
      expect(AuthService.updateUserProfile).toHaveBeenCalledWith('u1', { active: false });
      expect(res.json).toHaveBeenCalledWith({ message: 'User deactivated successfully' });
    });
  });

  // ─── deleteUser ───────────────────────────────────────────────
  describe('deleteUser', () => {
    it('deletes a user', async () => {
      req.params = { uid: 'u1' };
      AuthService.deleteUser.mockResolvedValue(true);
      await AuthController.deleteUser(req, res);
      expect(AuthService.deleteUser).toHaveBeenCalledWith('u1');
      expect(res.json).toHaveBeenCalledWith({ message: 'User deleted successfully' });
    });
  });

  // ─── createSession ────────────────────────────────────────────
  describe('createSession', () => {
    it('creates session from Authorization header', async () => {
      req.headers = { authorization: 'Bearer valid-token' };
      AuthService.verifyIdToken.mockResolvedValue({ uid: 'u1' });
      await AuthController.createSession(req, res);
      expect(AuthService.verifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(res.cookie).toHaveBeenCalledWith('__session', 'session-cookie-value', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ uid: 'u1' }));
    });

    it('creates session from request body', async () => {
      req.body = { idToken: 'body-token' };
      AuthService.verifyIdToken.mockResolvedValue({ uid: 'u2' });
      await AuthController.createSession(req, res);
      expect(AuthService.verifyIdToken).toHaveBeenCalledWith('body-token');
    });

    it('returns 401 when no token provided', async () => {
      await AuthController.createSession(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('returns 401 when token is invalid', async () => {
      req.headers = { authorization: 'Bearer bad-token' };
      AuthService.verifyIdToken.mockRejectedValue(new Error('Invalid token'));
      await AuthController.createSession(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
