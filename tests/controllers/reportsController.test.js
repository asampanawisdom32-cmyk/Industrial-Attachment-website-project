const ReportsController = require('../../controllers/reportsController');
const ReportsService = require('../../services/reportsService');
const StudentsService = require('../../services/studentsService');

jest.mock('../../services/reportsService');
jest.mock('../../services/studentsService');

describe('ReportsController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  // ─── createReport ──────────────────────────────────────────────
  describe('createReport', () => {
    it('creates a report and returns 201', async () => {
      req.body = { studentId: 's1', title: 'Week 1', content: 'Work done...' };
      ReportsService.createReport.mockResolvedValue({ id: 'r1', title: 'Week 1', week: 0, status: 'draft' });

      await ReportsController.createReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Report created successfully', report: expect.objectContaining({ title: 'Week 1' }) })
      );
    });

    it('passes week number when provided', async () => {
      req.body = { studentId: 's1', title: 'Week 2', content: 'Data...', week: 2 };
      ReportsService.createReport.mockResolvedValue({ id: 'r2', week: 2 });
      await ReportsController.createReport(req, res);
      expect(ReportsService.createReport).toHaveBeenCalledWith('s1', expect.objectContaining({ week: 2 }));
    });

    it('returns 400 for missing required fields', async () => {
      req.body = { studentId: 's1' };
      await ReportsController.createReport(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── getReport ─────────────────────────────────────────────────
  describe('getReport', () => {
    it('returns a report by ID', async () => {
      req.params = { reportId: 'r1' };
      ReportsService.getReport.mockResolvedValue({ id: 'r1', title: 'Test' });
      await ReportsController.getReport(req, res);
      expect(res.json).toHaveBeenCalledWith({ report: { id: 'r1', title: 'Test' } });
    });

    it('returns 404 when not found', async () => {
      req.params = { reportId: 'r1' };
      ReportsService.getReport.mockResolvedValue(null);
      await ReportsController.getReport(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── getStudentReports ─────────────────────────────────────────
  describe('getStudentReports', () => {
    it('returns reports for a student', async () => {
      req.params = { studentId: 's1' };
      ReportsService.getStudentReports.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
      await ReportsController.getStudentReports(req, res);
      expect(res.json).toHaveBeenCalledWith({ reports: [{ id: 'r1' }, { id: 'r2' }], count: 2 });
    });
  });

  // ─── getReportsByStatus ────────────────────────────────────────
  describe('getReportsByStatus', () => {
    it('returns reports filtered by status', async () => {
      req.query = { status: 'submitted' };
      ReportsService.getReportsByStatus.mockResolvedValue([{ id: 'r1', status: 'submitted' }]);
      await ReportsController.getReportsByStatus(req, res);
      expect(ReportsService.getReportsByStatus).toHaveBeenCalledWith('submitted');
      expect(res.json).toHaveBeenCalledWith({ reports: [{ id: 'r1', status: 'submitted' }], count: 1 });
    });

    it('returns 400 when status is missing', async () => {
      req.query = {};
      await ReportsController.getReportsByStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Status parameter is required' });
    });
  });

  // ─── updateReport ──────────────────────────────────────────────
  describe('updateReport', () => {
    it('updates a draft report and returns success', async () => {
      req.params = { reportId: 'r1' };
      req.body = { title: 'Updated' };
      req.user = { uid: 'studentUid' };
      ReportsService.getReport.mockResolvedValue({ id: 'r1', studentId: 's1', status: 'draft', title: 'Original' });
      StudentsService.getStudentByUid.mockResolvedValue({ id: 's1' });
      ReportsService.updateReport.mockResolvedValue(true);
      await ReportsController.updateReport(req, res);
      expect(ReportsService.updateReport).toHaveBeenCalledWith('r1', { title: 'Updated' });
      expect(res.json).toHaveBeenCalledWith({ message: 'Report updated successfully' });
    });

    it('returns 403 when report is not a draft', async () => {
      req.params = { reportId: 'r1' };
      req.body = { title: 'Updated' };
      req.user = { uid: 'studentUid' };
      ReportsService.getReport.mockResolvedValue({ id: 'r1', studentId: 's1', status: 'submitted' });
      await ReportsController.updateReport(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when student tries to edit another student report', async () => {
      req.params = { reportId: 'r1' };
      req.body = { title: 'Updated' };
      req.user = { uid: 'studentUid' };
      ReportsService.getReport.mockResolvedValue({ id: 'r1', studentId: 's2', status: 'draft' });
      StudentsService.getStudentByUid.mockResolvedValue({ id: 's1' });
      await ReportsController.updateReport(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── submitReport ─────────────────────────────────────────────
  describe('submitReport', () => {
    it('submits a report', async () => {
      req.params = { reportId: 'r1' };
      req.user = { uid: 'studentUid' };
      ReportsService.getReport.mockResolvedValue({ id: 'r1', studentId: 's1', status: 'draft' });
      StudentsService.getStudentByUid.mockResolvedValue({ id: 's1' });
      ReportsService.submitReport.mockResolvedValue(true);
      await ReportsController.submitReport(req, res);
      expect(ReportsService.submitReport).toHaveBeenCalledWith('r1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Report submitted successfully' });
    });

    it('returns 403 when student tries to submit another student report', async () => {
      req.params = { reportId: 'r1' };
      req.user = { uid: 'studentUid' };
      ReportsService.getReport.mockResolvedValue({ id: 'r1', studentId: 's2', status: 'draft' });
      StudentsService.getStudentByUid.mockResolvedValue({ id: 's1' });
      await ReportsController.submitReport(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── addFeedback ───────────────────────────────────────────────
  describe('addFeedback', () => {
    it('adds feedback to a report', async () => {
      req.params = { reportId: 'r1' };
      req.body = { feedback: 'Great work!', status: 'reviewed' };
      ReportsService.addFeedback.mockResolvedValue(true);
      await ReportsController.addFeedback(req, res);
      expect(ReportsService.addFeedback).toHaveBeenCalledWith('r1', 'Great work!', 'reviewed');
      expect(res.json).toHaveBeenCalledWith({ message: 'Feedback added successfully' });
    });

    it('returns 400 when feedback is missing', async () => {
      req.params = { reportId: 'r1' };
      req.body = {};
      await ReportsController.addFeedback(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── deleteReport ──────────────────────────────────────────────
  describe('deleteReport', () => {
    it('deletes a draft report', async () => {
      req.params = { reportId: 'r1' };
      req.user = { uid: 'studentUid' };
      ReportsService.getReport.mockResolvedValue({ id: 'r1', studentId: 's1', status: 'draft' });
      StudentsService.getStudentByUid.mockResolvedValue({ id: 's1' });
      ReportsService.deleteReport.mockResolvedValue(true);
      await ReportsController.deleteReport(req, res);
      expect(ReportsService.deleteReport).toHaveBeenCalledWith('r1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Report deleted successfully' });
    });

    it('returns 403 when report is not a draft', async () => {
      req.params = { reportId: 'r1' };
      req.user = { uid: 'studentUid' };
      ReportsService.getReport.mockResolvedValue({ id: 'r1', studentId: 's1', status: 'submitted' });
      await ReportsController.deleteReport(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 403 when student tries to delete another student report', async () => {
      req.params = { reportId: 'r1' };
      req.user = { uid: 'studentUid' };
      ReportsService.getReport.mockResolvedValue({ id: 'r1', studentId: 's2', status: 'draft' });
      StudentsService.getStudentByUid.mockResolvedValue({ id: 's1' });
      await ReportsController.deleteReport(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ─── getWeeklyReport ───────────────────────────────────────────
  describe('getWeeklyReport', () => {
    it('returns a weekly report for a student', async () => {
      req.params = { studentId: 's1', week: '3' };
      ReportsService.getWeeklyReport.mockResolvedValue({ id: 'r1', studentId: 's1', week: 3 });
      await ReportsController.getWeeklyReport(req, res);
      expect(ReportsService.getWeeklyReport).toHaveBeenCalledWith('s1', 3);
      expect(res.json).toHaveBeenCalledWith({ report: { id: 'r1', studentId: 's1', week: 3 } });
    });

    it('returns 404 when no report for that week', async () => {
      req.params = { studentId: 's1', week: '99' };
      ReportsService.getWeeklyReport.mockResolvedValue(null);
      await ReportsController.getWeeklyReport(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });
});
