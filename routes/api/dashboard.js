const express = require('express');
const DashboardController = require('../../controllers/dashboardController');
const { verifyFirebaseToken, checkUserActive, checkRole } = require('../../middleware/authMiddleware');

const router = express.Router();

router.use(verifyFirebaseToken, checkUserActive);

router.get('/summary', DashboardController.getSummary);
router.get('/students', DashboardController.getStudentsPage);
router.get('/student-progress/:studentId', verifyFirebaseToken, checkRole(['admin', 'school_supervisor', 'workplace_supervisor']), DashboardController.getStudentProgress);
router.get('/reports', DashboardController.getReportsPage);
router.get('/profile', DashboardController.getProfile);
router.get('/analytics', checkRole('admin'), DashboardController.getAnalytics);

module.exports = router;
