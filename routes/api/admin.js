const express = require('express');
const AdminController = require('../../controllers/adminController');
const { verifyFirebaseToken, checkRole } = require('../../middleware/authMiddleware');

const router = express.Router();

// Admin existence check — accessible without auth (for signup flow)
router.get('/check-admin', AdminController.checkAdminExists);

/**
 * All other admin routes require authentication + admin role
 */
router.use(verifyFirebaseToken, checkRole('admin'));

// Supervisor management
router.get('/supervisors', AdminController.getSupervisors);
router.delete('/supervisors/:uid', AdminController.deleteSupervisor);

// Student assignment (bulk) — MUST come before /:docId routes to avoid param shadowing
router.put('/students/bulk-assign-school-supervisor', AdminController.bulkAssignSchoolSupervisor);
router.put('/students/bulk-assign-workplace-supervisor', AdminController.bulkAssignWorkplaceSupervisor);

// Grouped student views — MUST come before /:docId routes
router.get('/students/grouped-by-department', AdminController.getStudentsByDepartment);
router.get('/students/grouped-by-location', AdminController.getStudentsByLocation);
router.get('/students/all', AdminController.getAllStudentsWithSupervisors);

// Student assignment (single) — parameterized routes last
router.put('/students/:docId/assign-school-supervisor', AdminController.assignSchoolSupervisor);
router.put('/students/:docId/assign-workplace-supervisor', AdminController.assignWorkplaceSupervisor);

module.exports = router;
