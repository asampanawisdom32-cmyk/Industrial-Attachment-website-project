const fs = require('fs');
const ReportsService = require('../services/reportsService');
const StudentsService = require('../services/studentsService');

/**
 * Reports Controller
 * Handles report-related HTTP requests
 */
class ReportsController {
  /**
   * Create a new report
   * POST /reports
   */
  static async createReport(req, res) {
    try {
      const { studentId, title, content, week } = req.body;

      if (!studentId || !title || !content) {
        return res.status(400).json({ error: 'Required fields are missing' });
      }

      // Process uploaded files
      const attachments = (req.files || []).map(f => ({
        url: '/uploads/reports/' + f.filename,
        name: f.originalname,
        type: f.mimetype,
        size: f.size,
      }));

      const report = await ReportsService.createReport(studentId, {
        title,
        content,
        week: week || 0,
        status: 'draft',
        attachments,
      });

      return res.status(201).json({
        message: 'Report created successfully',
        report,
      });
    } catch (error) {
      // Clean up uploaded files on failure (async, non-blocking)
      if (req.files) {
        for (const f of req.files) {
          fs.unlink(f.path, (unlinkErr) => {
            if (unlinkErr) console.warn('Failed to clean up uploaded file:', f.path, unlinkErr.message);
          });
        }
      }
      console.error('Create report error:', error);
      return res.status(500).json({ error: error.message || 'Failed to create report' });
    }
  }

  /**
   * Get report by ID
   * GET /reports/:reportId
   */
  static async getReport(req, res) {
    try {
      const { reportId } = req.params;

      const report = await ReportsService.getReport(reportId);

      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      return res.json({ report });
    } catch (error) {
      console.error('Get report error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get report' });
    }
  }

  /**
   * Get all reports for a student
   * GET /reports/student/:studentId
   */
  static async getStudentReports(req, res) {
    try {
      const { studentId } = req.params;

      const reports = await ReportsService.getStudentReports(studentId);

      return res.json({
        reports,
        count: reports.length,
      });
    } catch (error) {
      console.error('Get student reports error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get reports' });
    }
  }

  /**
   * Get reports by status
   * GET /reports?status=submitted
   */
  static async getReportsByStatus(req, res) {
    try {
      const { status } = req.query;

      if (!status) {
        return res.status(400).json({ error: 'Status parameter is required' });
      }

      const reports = await ReportsService.getReportsByStatus(status);

      return res.json({
        reports,
        count: reports.length,
      });
    } catch (error) {
      console.error('Get reports by status error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get reports' });
    }
  }

  /**
   * Update report
   * PUT /reports/:reportId
   */
  static async updateReport(req, res) {
    try {
      const { reportId } = req.params;

      // Fetch the report and verify ownership
      const report = await ReportsService.getReport(reportId);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Only allow editing draft reports
      if (report.status !== 'draft') {
        return res.status(403).json({ error: 'Only draft reports can be edited' });
      }

      // Check that the student owns this report
      const student = await StudentsService.getStudentByUid(req.user.uid);
      if (!student) {
        return res.status(403).json({ error: 'Student profile not found' });
      }
      if (report.studentId !== student.id) {
        return res.status(403).json({ error: 'You can only edit your own reports' });
      }

      const updates = { ...req.body };

      // Process uploaded files — merge with existing if any
      const newFiles = (req.files || []).map(f => ({
        url: '/uploads/reports/' + f.filename,
        name: f.originalname,
        type: f.mimetype,
        size: f.size,
      }));

      if (newFiles.length > 0) {
        const existing = report.attachments || [];
        updates.attachments = [...existing, ...newFiles];
      }

      // Remove multer-specific fields
      delete updates.attachmentsRaw;

      await ReportsService.updateReport(reportId, updates);

      return res.json({
        message: 'Report updated successfully',
      });
    } catch (error) {
      console.error('Update report error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update report' });
    }
  }

  /**
   * Submit a report
   * PUT /reports/:reportId/submit
   */
  static async submitReport(req, res) {
    try {
      const { reportId } = req.params;

      // Verify ownership
      const report = await ReportsService.getReport(reportId);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }
      const student = await StudentsService.getStudentByUid(req.user.uid);
      if (!student) {
        return res.status(403).json({ error: 'Student profile not found' });
      }
      if (report.studentId !== student.id) {
        return res.status(403).json({ error: 'You can only submit your own reports' });
      }

      await ReportsService.submitReport(reportId);

      return res.json({
        message: 'Report submitted successfully',
      });
    } catch (error) {
      console.error('Submit report error:', error);
      return res.status(500).json({ error: error.message || 'Failed to submit report' });
    }
  }

  /**
   * Add feedback to a report (reviewer)
   * PUT /reports/:reportId/feedback
   */
  static async addFeedback(req, res) {
    try {
      const { reportId } = req.params;
      const { feedback, status } = req.body;

      if (!feedback) {
        return res.status(400).json({ error: 'Feedback is required' });
      }

      const report = await ReportsService.getReport(reportId);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      await ReportsService.addFeedback(reportId, feedback, status || 'reviewed');

      return res.json({
        message: 'Feedback added successfully',
      });
    } catch (error) {
      console.error('Add feedback error:', error);
      return res.status(500).json({ error: error.message || 'Failed to add feedback' });
    }
  }

  /**
   * Delete report
   * DELETE /reports/:reportId
   */
  static async deleteReport(req, res) {
    try {
      const { reportId } = req.params;

      // Fetch the report and verify ownership
      const report = await ReportsService.getReport(reportId);
      if (!report) {
        return res.status(404).json({ error: 'Report not found' });
      }

      // Only allow deleting draft reports
      if (report.status !== 'draft') {
        return res.status(403).json({ error: 'Only draft reports can be deleted' });
      }

      // Check that the student owns this report
      const student = await StudentsService.getStudentByUid(req.user.uid);
      if (!student) {
        return res.status(403).json({ error: 'Student profile not found' });
      }
      if (report.studentId !== student.id) {
        return res.status(403).json({ error: 'You can only delete your own reports' });
      }

      await ReportsService.deleteReport(reportId);

      return res.json({
        message: 'Report deleted successfully',
      });
    } catch (error) {
      console.error('Delete report error:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete report' });
    }
  }

  /**
   * Get weekly report for a student
   * GET /reports/student/:studentId/week/:week
   */
  static async getWeeklyReport(req, res) {
    try {
      const { studentId, week } = req.params;

      const report = await ReportsService.getWeeklyReport(studentId, parseInt(week));

      if (!report) {
        return res.status(404).json({ error: 'No report found for this week' });
      }

      return res.json({ report });
    } catch (error) {
      console.error('Get weekly report error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get report' });
    }
  }
}

module.exports = ReportsController;
