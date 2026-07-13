const express = require('express');
const multer = require('multer');
const path = require('path');
const ReportsController = require('../../controllers/reportsController');
const { verifyFirebaseToken, checkRole, checkUserActive } = require('../../middleware/authMiddleware');

const router = express.Router();

// Multer config — store files in public/uploads/reports
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', '..', 'public', 'uploads', 'reports'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: function (req, file, cb) {
    const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Allowed: images, documents, archives.'));
    }
  },
});

function wrapMulter(mw) {
  return function (req, res, next) {
    mw(req, res, function (err) {
      if (err) {
        const message = err instanceof multer.MulterError
          ? 'Upload error: ' + err.message
          : err.message;
        return res.status(400).json({ error: message });
      }
      next();
    });
  };
}

/**
 * All report routes require authentication
 */

// Student routes - create and view own reports
router.post('/', verifyFirebaseToken, checkUserActive, wrapMulter(upload.array('attachments', 5)), ReportsController.createReport);
router.get('/student/:studentId', verifyFirebaseToken, checkUserActive, ReportsController.getStudentReports);
router.get('/student/:studentId/week/:week', verifyFirebaseToken, checkUserActive, ReportsController.getWeeklyReport);

// Report management routes
router.get('/:reportId', verifyFirebaseToken, checkUserActive, ReportsController.getReport);
router.put('/:reportId', verifyFirebaseToken, checkUserActive, wrapMulter(upload.array('attachments', 5)), ReportsController.updateReport);
router.put('/:reportId/submit', verifyFirebaseToken, checkUserActive, ReportsController.submitReport);
router.delete('/:reportId', verifyFirebaseToken, checkUserActive, ReportsController.deleteReport);

// Admin/Reviewer routes
router.get('/', verifyFirebaseToken, checkRole(['admin', 'school_supervisor', 'workplace_supervisor']), ReportsController.getReportsByStatus);
router.put('/:reportId/feedback', verifyFirebaseToken, checkRole(['admin', 'school_supervisor', 'workplace_supervisor']), ReportsController.addFeedback);

module.exports = router;
