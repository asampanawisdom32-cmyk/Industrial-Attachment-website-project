const { auth } = require('../config/firebase');
const AuthService = require('../services/authService');

/**
 * Middleware to verify Firebase ID token
 * Expects token in Authorization header: "Bearer <token>"
 */
const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No authentication token provided' });
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to check if user has a specific role
 * @param {string|array} requiredRoles - Role(s) required to access the route
 */
const checkRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const user = await AuthService.getUserByUid(req.user.uid);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const rolesToCheck = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

      if (!rolesToCheck.includes(user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      req.userDocument = user;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Authentication check failed' });
    }
  };
};

/**
 * Middleware to verify user is active
 */
const checkUserActive = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await AuthService.getUserByUid(req.user.uid);
    if (!user || !user.active) {
      return res.status(403).json({ error: 'User account is inactive' });
    }

    req.userDocument = user;
    next();
  } catch (error) {
    console.error('User active check error:', error);
    return res.status(500).json({ error: 'Authentication check failed' });
  }
};

/**
 * Error handler middleware for authentication
 */
const authErrorHandler = (err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next(err);
};

/**
 * Create a Firebase session cookie from an ID token
 * @param {string} idToken - Firebase ID token
 * @returns {string} - Session cookie string
 */
const createSessionCookie = async (idToken) => {
  const expiresIn = 60 * 60 * 24 * 14 * 1000; // 2 weeks
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
  return sessionCookie;
};

/**
 * Session cookie options for res.cookie()
 */
const SESSION_COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 14 * 1000, // 2 weeks
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

/**
 * Middleware to protect server-rendered page routes using a session cookie
 * Redirects to /login if no valid session cookie is present
 */
const requirePageAuth = async (req, res, next) => {
  const sessionCookie = req.cookies && req.cookies.__session;

  if (!sessionCookie) {
    return res.redirect('/login');
  }

  try {
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    req.user = decodedClaims;
    next();
  } catch (error) {
    console.error('Session cookie verification error:', error.message);
    // Clear invalid cookie and redirect to login
    const { path, secure, sameSite } = SESSION_COOKIE_OPTIONS;
    res.clearCookie('__session', { path, secure, sameSite });
    return res.redirect('/login');
  }
};

/**
 * Map of user roles to their correct dashboard paths
 */
const ROLE_DASHBOARD_MAP = {
  admin: '/dashboard/admin',
  school_supervisor: '/dashboard/school-supervisor',
  workplace_supervisor: '/dashboard/workplace-supervisor',
  student: '/dashboard/student',
};

/**
 * Middleware to restrict page routes to specific roles
 * Must be used AFTER requirePageAuth (req.user must be set)
 * Redirects the user to their role-appropriate dashboard if they lack permission
 * @param {string|string[]} allowedRoles - Role(s) permitted to access this route
 */
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.redirect('/login');
      }

      const user = await AuthService.getUserByUid(req.user.uid);
      if (!user) {
        return res.redirect('/login');
      }

      const rolesToCheck = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      if (rolesToCheck.includes(user.role)) {
        req.userDocument = user;
        return next();
      }

      // User's role doesn't match — redirect to their own dashboard
      const redirectPath = ROLE_DASHBOARD_MAP[user.role] || '/dashboard';
      return res.redirect(redirectPath);
    } catch (error) {
      console.error('Role check error:', error);
      return res.redirect('/dashboard');
    }
  };
};

module.exports = {
  verifyFirebaseToken,
  checkRole,
  checkUserActive,
  authErrorHandler,
  createSessionCookie,
  SESSION_COOKIE_OPTIONS,
  requirePageAuth,
  requireRole,
  ROLE_DASHBOARD_MAP,
};
