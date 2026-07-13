const express = require('express');
const StudentsController = require('../../controllers/studentsController');
const { verifyFirebaseToken, checkRole, checkUserActive } = require('../../middleware/authMiddleware');

const router = express.Router();

/**
 * All student routes require authentication
 */

// Public routes for authenticated users
router.post('/', verifyFirebaseToken, checkUserActive, StudentsController.createStudent);

// Supervisor-specific routes (must be before :uid wildcard)
router.get('/supervisor/:supervisorId', verifyFirebaseToken, checkUserActive, StudentsController.getStudentsBySupervisor);

// Department-specific routes (must be before :uid wildcard)
router.get('/department/:department', verifyFirebaseToken, checkRole(['admin', 'school_supervisor']), StudentsController.getStudentsByDepartment);

// Admin/Supervisor routes (must be before :uid wildcard)
router.get('/', verifyFirebaseToken, checkRole(['admin', 'school_supervisor', 'workplace_supervisor']), StudentsController.getAllStudents);

// Specific sub-resource routes (must be before :uid wildcard)
router.get('/:docId/attendance-logs', verifyFirebaseToken, checkRole(['admin', 'school_supervisor', 'workplace_supervisor']), StudentsController.getAttendanceLogs);
router.put('/:docId', verifyFirebaseToken, checkRole(['admin', 'school_supervisor', 'workplace_supervisor']), StudentsController.updateStudent);
router.put('/:docId/attendance', verifyFirebaseToken, checkRole(['admin', 'workplace_supervisor']), StudentsController.updateAttendance);
router.delete('/:docId', verifyFirebaseToken, checkRole('admin'), StudentsController.deleteStudent);

// Catch-all param routes (must be last)
router.get('/:uid', verifyFirebaseToken, checkUserActive, StudentsController.getStudent);
router.get('/:uid/summary', verifyFirebaseToken, checkUserActive, StudentsController.getStudentSummary);

module.exports = router;
