const FirestoreService = require('./firestoreService');
const { Report } = require('../models');

/**
 * Reports Service
 * Handles all report-related operations
 */
class ReportsService {
  /**
   * Create a new report
   * @param {string} studentId - Student document ID
   * @param {object} reportData - Report information
   */
  static async createReport(studentId, reportData) {
    try {
      const report = new Report({
        studentId,
        ...reportData,
      });

      const docId = await FirestoreService.createDocument('reports', report.toObject());
      return { ...report.toObject(), id: docId };
    } catch (error) {
      console.error('Error creating report:', error);
      throw new Error(`Failed to create report: ${error.message}`);
    }
  }

  /**
   * Get report by ID
   * @param {string} reportId - Report document ID
   */
  static async getReport(reportId) {
    try {
      return await FirestoreService.getDocument('reports', reportId);
    } catch (error) {
      console.error('Error getting report:', error);
      throw new Error(`Failed to get report: ${error.message}`);
    }
  }

  /**
   * Get all reports for a student
   * @param {string} studentId - Student document ID
   */
  static async getStudentReports(studentId) {
    try {
      return await FirestoreService.getByField('reports', 'studentId', studentId);
    } catch (error) {
      console.error('Error getting student reports:', error);
      throw new Error(`Failed to get reports: ${error.message}`);
    }
  }

  /**
   * Get reports by status
   * @param {string} status - Report status (draft, submitted, reviewed)
   */
  static async getReportsByStatus(status) {
    try {
      return await FirestoreService.getByField('reports', 'status', status);
    } catch (error) {
      console.error('Error getting reports by status:', error);
      throw new Error(`Failed to get reports: ${error.message}`);
    }
  }

  /**
   * Update report
   * @param {string} reportId - Report document ID
   * @param {object} updates - Fields to update
   */
  static async updateReport(reportId, updates) {
    try {
      await FirestoreService.updateDocument('reports', reportId, updates);
      return true;
    } catch (error) {
      console.error('Error updating report:', error);
      throw new Error(`Failed to update report: ${error.message}`);
    }
  }

  /**
   * Submit report (change status to submitted)
   * @param {string} reportId - Report document ID
   */
  static async submitReport(reportId) {
    try {
      await FirestoreService.updateDocument('reports', reportId, {
        status: 'submitted',
        submittedAt: new Date(),
        updatedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error('Error submitting report:', error);
      throw new Error(`Failed to submit report: ${error.message}`);
    }
  }

  /**
   * Add feedback to report
   * @param {string} reportId - Report document ID
   * @param {string} feedback - Feedback text
   * @param {string} reviewerStatus - New status after review
   */
  static async addFeedback(reportId, feedback, reviewerStatus = 'reviewed') {
    try {
      await FirestoreService.updateDocument('reports', reportId, {
        feedback,
        status: reviewerStatus,
        updatedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error('Error adding feedback:', error);
      throw new Error(`Failed to add feedback: ${error.message}`);
    }
  }

  /**
   * Delete report
   * @param {string} reportId - Report document ID
   */
  static async deleteReport(reportId) {
    try {
      await FirestoreService.deleteDocument('reports', reportId);
      return true;
    } catch (error) {
      console.error('Error deleting report:', error);
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  }

  /**
   * Get all reports (for admin use), sorted by most recent
   */
  static async getAllReports() {
    try {
      return await FirestoreService.getDocuments('reports', [], 'updatedAt', 'desc');
    } catch (error) {
      console.error('Error getting all reports:', error);
      throw new Error(`Failed to get reports: ${error.message}`);
    }
  }

  /**
   * Get weekly reports for a student
   * @param {string} studentId - Student document ID
   * @param {number} week - Week number
   */
  static async getWeeklyReport(studentId, week) {
    try {
      const reports = await FirestoreService.getDocuments('reports', [
        ['studentId', '==', studentId],
        ['week', '==', week],
      ]);
      return reports.length > 0 ? reports[0] : null;
    } catch (error) {
      console.error('Error getting weekly report:', error);
      throw new Error(`Failed to get report: ${error.message}`);
    }
  }
}

module.exports = ReportsService;
