const express = require('express');
const AuthController = require('../../controllers/authController');
const { verifyFirebaseToken, checkRole, checkUserActive } = require('../../middleware/authMiddleware');

const router = express.Router();

/**
 * Public Routes (no auth required)
 */
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/forgot-password', AuthController.forgotPassword);
router.get('/admin-exists', AuthController.checkAdminExistsPublic);

/**
 * Protected Routes (auth required)
 */
router.post('/session', AuthController.createSession);
router.get('/profile', verifyFirebaseToken, checkUserActive, AuthController.getProfile);
router.put('/profile', verifyFirebaseToken, checkUserActive, AuthController.updateProfile);

/**
 * Admin Routes (admin role required)
 */
router.get('/users', verifyFirebaseToken, checkRole('admin'), AuthController.getAllUsers);
router.put('/users/:uid/role', verifyFirebaseToken, checkRole('admin'), AuthController.updateUserRole);
router.put('/users/:uid/deactivate', verifyFirebaseToken, checkRole('admin'), AuthController.deactivateUser);
router.delete('/users/:uid', verifyFirebaseToken, checkRole('admin'), AuthController.deleteUser);

module.exports = router;
