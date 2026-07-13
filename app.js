require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Firebase initialization
const { db } = require('./config/firebase');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public', 'uploads', 'reports');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Import API routes
const apiAuthRoutes = require('./routes/api/auth');
const apiStudentsRoutes = require('./routes/api/students');
const apiReportsRoutes = require('./routes/api/reports');
const apiEvaluationsRoutes = require('./routes/api/evaluations');
const apiFirebaseTestRoutes = require('./routes/api/firebaseTest');
const apiDashboardRoutes = require('./routes/api/dashboard');
const apiAdminRoutes = require('./routes/api/admin');

// Import middleware
const { authErrorHandler, requirePageAuth, requireRole, SESSION_COOKIE_OPTIONS, ROLE_DASHBOARD_MAP } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware (allow Firebase Auth REST + inline auth scripts)
const projectId = process.env.FIREBASE_PROJECT_ID || 'industrial-attachment-website';
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: [
          "'self'",
          'https://identitytoolkit.googleapis.com',
          'https://securetoken.googleapis.com',
          `https://${projectId}.firebaseapp.com`,
        ],
      },
    },
  })
);

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Serve the Crowz React dashboard (built output)
app.use('/crowz/assets', express.static(path.join(__dirname, 'client', 'dist', 'assets')));

// Body parser middleware (increase limit for large payloads)
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Compression middleware — reduce response size
app.use(compression());

// Rate limiting — protect API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '200', 10), // 200 requests/min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Stricter rate limit for auth endpoints (prevent brute force)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20, // 20 login/register attempts per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

/**
 * API Routes (Firebase-based)
 * All API routes are prefixed with /api
 */
app.use('/api/auth', apiAuthRoutes);
app.use('/api/students', apiStudentsRoutes);
app.use('/api/reports', apiReportsRoutes);
app.use('/api/evaluations', apiEvaluationsRoutes);
app.use('/api/firebase-test', apiFirebaseTestRoutes);
app.use('/api/dashboard', apiDashboardRoutes);
app.use('/api/admin', apiAdminRoutes);

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.get('/', (req, res) => {
  // If user is already logged in, redirect to their dashboard
  if (req.cookies && req.cookies.__session) {
    return res.redirect('/dashboard');
  }
  res.render('home');
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

/**
 * Protected Page Routes (require valid session cookie + role check)
 * Users who don't have the required role are redirected to their own dashboard.
 */
app.get('/dashboard', requirePageAuth, (req, res) => {
  const dashboardPath = ROLE_DASHBOARD_MAP[req.user?.role] || '/dashboard/student';
  res.redirect(dashboardPath);
});

app.get('/dashboard/admin', requirePageAuth, requireRole('admin'), (req, res) => {
  res.render('dashboards/admin', { user: req.user || null });
});

app.get('/dashboard/school-supervisor', requirePageAuth, requireRole('school_supervisor'), (req, res) => {
  res.render('dashboards/school-supervisor', { user: req.user || null });
});

app.get('/dashboard/workplace-supervisor', requirePageAuth, requireRole('workplace_supervisor'), (req, res) => {
  res.render('dashboards/workplace-supervisor', { user: req.user || null });
});

app.get('/dashboard/student', requirePageAuth, requireRole('student'), (req, res) => {
  res.render('dashboards/student', { user: req.user || null });
});

app.get('/students', requirePageAuth, requireRole(['admin', 'school_supervisor', 'workplace_supervisor']), (req, res) => {
  res.render('students', { students: [], user: req.user || null });
});

app.get('/reports', requirePageAuth, requireRole(['admin', 'school_supervisor', 'workplace_supervisor', 'student']), (req, res) => {
  res.render('reports', { reports: [], user: req.user || null });
});

app.get('/analytics', requirePageAuth, requireRole('admin'), (req, res) => {
  res.render('analytics', { analytics: {}, user: req.user || null });
});

app.get('/admin', requirePageAuth, requireRole('admin'), (req, res) => {
  res.render('admin', { user: req.user || null });
});

app.get('/supervisors', requirePageAuth, requireRole('admin'), (req, res) => {
  res.render('supervisors', { user: req.user || null });
});

app.get('/evaluations', requirePageAuth, requireRole(['admin', 'school_supervisor', 'workplace_supervisor', 'student']), (req, res) => {
  res.render('evaluations', { evaluations: [], user: req.user || null });
});

app.get('/profile', requirePageAuth, (req, res) => {
  res.render('profile', { profile: {}, user: req.user || null });
});

/**
 * Crowz — Standalone React Analytics Dashboard (no auth required)
 */
app.get('/crowz', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

/**
 * Logout — clear session cookie and redirect
 * Note: This route does NOT use requirePageAuth so it works even if the session is already expired.
 */
app.get('/logout', (req, res) => {
  const { path, secure, sameSite } = SESSION_COOKIE_OPTIONS;
  res.clearCookie('__session', { path, secure, sameSite });
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Signing out…</title></head>
<body><script src="/js/api.js"></script><script>
  if (window.IaApi) window.IaApi.clearSession();
  window.location.replace('/login');
</script></body></html>`);
});

/**
 * Auth error handler middleware — must come BEFORE 404 handler
 */
app.use(authErrorHandler);

/**
 * 404 handler — must be after all routes but after error handler
 */
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.status(404).render('error', {
    message: 'The page you are looking for does not exist or has been moved.',
    status: 404,
  });
});

app.use((err, req, res, next) => {
  console.error('Application error:', err);
  
  // Check if it's an API request
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({
      error: process.env.NODE_ENV === 'production' 
        ? 'An error occurred' 
        : err.message
    });
  }

  // For non-API requests, render error page
  res.status(err.status || 500).render('error', {
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred. Please try again later.' 
      : err.message,
    status: err.status || 500,
  });
});

/**
 * Export the app (for testing / clustering)
 */
module.exports = app;

// Only start the server if this file is the main entry point
// (Prevents auto-listening when imported by tests or cluster workers)
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Industrial Attachment platform running on http://localhost:${PORT}`);
    console.log(`API Documentation: http://localhost:${PORT}/api`);
    console.log(`Firebase initialized successfully`);
  });

  // Server-level timeout (covers all requests)
  const TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT || '30000', 10);
  server.timeout = TIMEOUT;

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`${signal} received — shutting down gracefully...`);
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
