const ReportsService = require('../../services/reportsService');
const FirestoreService = require('../../services/firestoreService');

jest.mock('../../services/firestoreService');
jest.mock('../../models', () => {
  const { Report } = jest.requireActual('../../models');
  return { Report };
});

describe('ReportsService', () => {
  const mockReportData = {
    title: 'Week 1 Report',
    content: 'This week I worked on...',
    week: 1,
    status: 'draft',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createReport', () => {
    it('creates a report and returns it with id', async () => {
      FirestoreService.createDocument.mockResolvedValue('report-1');
      const result = await ReportsService.createReport('student1', mockReportData);
      expect(FirestoreService.createDocument).toHaveBeenCalledWith(
        'reports',
        expect.objectContaining({
          studentId: 'student1',
          title: 'Week 1 Report',
          week: 1,
          status: 'draft',
        })
      );
      expect(result.id).toBe('report-1');
      expect(result.title).toBe('Week 1 Report');
    });

    it('throws on error', async () => {
      FirestoreService.createDocument.mockRejectedValue(new Error('DB error'));
      await expect(ReportsService.createReport('s1', mockReportData)).rejects.toThrow('Failed to create report');
    });
  });

  describe('getReport', () => {
    it('returns a report by ID', async () => {
      const report = { id: 'r1', title: 'Test' };
      FirestoreService.getDocument.mockResolvedValue(report);
      const result = await ReportsService.getReport('r1');
      expect(result).toEqual(report);
      expect(FirestoreService.getDocument).toHaveBeenCalledWith('reports', 'r1');
    });

    it('returns null when not found', async () => {
      FirestoreService.getDocument.mockResolvedValue(null);
      const result = await ReportsService.getReport('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getStudentReports', () => {
    it('returns reports filtered by student ID', async () => {
      const reports = [{ id: 'r1', studentId: 's1' }];
      FirestoreService.getByField.mockResolvedValue(reports);
      const result = await ReportsService.getStudentReports('s1');
      expect(FirestoreService.getByField).toHaveBeenCalledWith('reports', 'studentId', 's1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getReportsByStatus', () => {
    it('returns reports filtered by status', async () => {
      FirestoreService.getByField.mockResolvedValue([{ id: 'r1', status: 'submitted' }]);
      const result = await ReportsService.getReportsByStatus('submitted');
      expect(FirestoreService.getByField).toHaveBeenCalledWith('reports', 'status', 'submitted');
      expect(result).toHaveLength(1);
    });
  });

  describe('updateReport', () => {
    it('updates a report document', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);
      const result = await ReportsService.updateReport('r1', { title: 'Updated' });
      expect(result).toBe(true);
      expect(FirestoreService.updateDocument).toHaveBeenCalledWith('reports', 'r1', { title: 'Updated' });
    });
  });

  describe('submitReport', () => {
    it('sets status to submitted', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);
      const result = await ReportsService.submitReport('r1');
      expect(result).toBe(true);
      expect(FirestoreService.updateDocument).toHaveBeenCalledWith(
        'reports', 'r1',
        expect.objectContaining({ status: 'submitted', updatedAt: expect.any(Date) })
      );
    });
  });

  describe('addFeedback', () => {
    it('adds feedback and updates status', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);
      const result = await ReportsService.addFeedback('r1', 'Great work!', 'reviewed');
      expect(result).toBe(true);
      expect(FirestoreService.updateDocument).toHaveBeenCalledWith(
        'reports', 'r1',
        expect.objectContaining({ feedback: 'Great work!', status: 'reviewed', updatedAt: expect.any(Date) })
      );
    });

    it('defaults status to reviewed', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);
      await ReportsService.addFeedback('r1', 'Nice');
      expect(FirestoreService.updateDocument).toHaveBeenCalledWith(
        'reports', 'r1',
        expect.objectContaining({ status: 'reviewed' })
      );
    });
  });

  describe('deleteReport', () => {
    it('deletes a report document', async () => {
      FirestoreService.deleteDocument.mockResolvedValue(true);
      const result = await ReportsService.deleteReport('r1');
      expect(result).toBe(true);
      expect(FirestoreService.deleteDocument).toHaveBeenCalledWith('reports', 'r1');
    });
  });

  describe('getWeeklyReport', () => {
    it('returns the report for a specific student and week', async () => {
      FirestoreService.getDocuments.mockResolvedValue([{ id: 'r1', studentId: 's1', week: 3 }]);
      const result = await ReportsService.getWeeklyReport('s1', 3);
      expect(result).toEqual({ id: 'r1', studentId: 's1', week: 3 });
      expect(FirestoreService.getDocuments).toHaveBeenCalledWith('reports', [
        ['studentId', '==', 's1'],
        ['week', '==', 3],
      ]);
    });

    it('returns null when no report for that week', async () => {
      FirestoreService.getDocuments.mockResolvedValue([]);
      const result = await ReportsService.getWeeklyReport('s1', 99);
      expect(result).toBeNull();
    });
  });
});
