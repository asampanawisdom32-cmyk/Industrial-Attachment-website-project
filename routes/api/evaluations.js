const express = require('express');
const EvaluationsController = require('../../controllers/evaluationsController');
const { verifyFirebaseToken, checkRole, checkUserActive } = require('../../middleware/authMiddleware');

const router = express.Router();

/**
 * All evaluation routes require authentication
 */

// Supervisor/Admin routes - create evaluations
router.post('/', verifyFirebaseToken, checkRole(['admin', 'school_supervisor', 'workplace_supervisor']), EvaluationsController.createEvaluation);

// View routes
router.get('/:evaluationId', verifyFirebaseToken, checkUserActive, EvaluationsController.getEvaluation);
router.get('/student/:studentId', verifyFirebaseToken, checkUserActive, EvaluationsController.getStudentEvaluations);
router.get('/student/:studentId/average', verifyFirebaseToken, checkUserActive, EvaluationsController.getAverageScore);
router.get('/student/:studentId/summary', verifyFirebaseToken, checkUserActive, EvaluationsController.getPerformanceSummary);
router.get('/student/:studentId/category/:category', verifyFirebaseToken, checkUserActive, EvaluationsController.getEvaluationsByCategory);

// Supervisor routes
router.get('/supervisor/:supervisorId', verifyFirebaseToken, checkUserActive, EvaluationsController.getEvaluationsBySupervisor);

// Update/Delete routes
router.put('/:evaluationId', verifyFirebaseToken, checkRole(['admin', 'school_supervisor', 'workplace_supervisor']), EvaluationsController.updateEvaluation);
router.delete('/:evaluationId', verifyFirebaseToken, checkRole('admin'), EvaluationsController.deleteEvaluation);

module.exports = router;
