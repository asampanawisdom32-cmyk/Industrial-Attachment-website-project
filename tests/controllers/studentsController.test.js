const StudentsController = require('../../controllers/studentsController');
const StudentsService = require('../../services/studentsService');
const EvaluationsService = require('../../services/evaluationsService');
const FirestoreService = require('../../services/firestoreService');

jest.mock('../../services/studentsService');
jest.mock('../../services/evaluationsService');
jest.mock('../../services/firestoreService');

describe('StudentsController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {}, query: {}, user: { uid: 'auth-user' }, userDocument: { role: 'workplace_supervisor' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  // ─── createStudent ─────────────────────────────────────────────
  describe('createStudent', () => {
    it('creates a student and returns 201', async () => {
      req.body = { uid: 'stu1', studentId: 'S001', name: 'Alice', email: 'alice@test.com' };
      StudentsService.createStudent.mockResolvedValue({ id: 'doc1', name: 'Alice' });

      await StudentsController.createStudent(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Student created successfully', student: expect.objectContaining({ name: 'Alice' }) })
      );
    });

    it('returns 400 for missing required fields', async () => {
      req.body = { uid: 'stu1' }; // missing studentId, name, email
      await StudentsController.createStudent(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Required fields are missing' });
    });
  });

  // ─── getStudent ────────────────────────────────────────────────
  describe('getStudent', () => {
    it('returns a student by UID', async () => {
      req.params = { uid: 'stu1' };
      StudentsService.getStudentByUid.mockResolvedValue({ id: 'doc1', name: 'Alice' });

      await StudentsController.getStudent(req, res);
      expect(res.json).toHaveBeenCalledWith({ student: { id: 'doc1', name: 'Alice' } });
    });

    it('returns 404 when not found', async () => {
      req.params = { uid: 'nonexistent' };
      StudentsService.getStudentByUid.mockResolvedValue(null);
      await StudentsController.getStudent(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── getAllStudents ────────────────────────────────────────────
  describe('getAllStudents', () => {
    it('returns all students with count', async () => {
      StudentsService.getAllStudents.mockResolvedValue([{ id: 'd1' }, { id: 'd2' }]);
      await StudentsController.getAllStudents(req, res);
      expect(res.json).toHaveBeenCalledWith({ students: [{ id: 'd1' }, { id: 'd2' }], count: 2 });
    });

    it('passes status filter', async () => {
      req.query = { status: 'active' };
      StudentsService.getAllStudents.mockResolvedValue([{ id: 'd1', status: 'active' }]);
      await StudentsController.getAllStudents(req, res);
      expect(StudentsService.getAllStudents).toHaveBeenCalledWith('active');
    });
  });

  // ─── updateStudent ─────────────────────────────────────────────
  describe('updateStudent', () => {
    it('updates a student and returns success', async () => {
      req.params = { docId: 'doc1' };
      req.body = { name: 'Updated' };
      StudentsService.updateStudent.mockResolvedValue(true);
      await StudentsController.updateStudent(req, res);
      expect(StudentsService.updateStudent).toHaveBeenCalledWith('doc1', { name: 'Updated' });
      expect(res.json).toHaveBeenCalledWith({ message: 'Student updated successfully' });
    });
  });

  // ─── getStudentsByDepartment ──────────────────────────────────
  describe('getStudentsByDepartment', () => {
    it('returns students for a department', async () => {
      req.params = { department: 'CS' };
      StudentsService.getStudentsByDepartment.mockResolvedValue([{ id: 'd1', department: 'CS' }]);
      await StudentsController.getStudentsByDepartment(req, res);
      expect(res.json).toHaveBeenCalledWith({ students: [{ id: 'd1', department: 'CS' }], count: 1 });
    });
  });

  // ─── getStudentsBySupervisor ──────────────────────────────────
  describe('getStudentsBySupervisor', () => {
    it('returns students assigned to a supervisor', async () => {
      req.params = { supervisorId: 'sup1' };
      StudentsService.getStudentsBySupervisor.mockResolvedValue([{ id: 'd1' }]);
      await StudentsController.getStudentsBySupervisor(req, res);
      expect(res.json).toHaveBeenCalledWith({ students: [{ id: 'd1' }], count: 1 });
    });
  });

  // ─── getStudentSummary ─────────────────────────────────────────
  describe('getStudentSummary', () => {
    it('returns student with performance summary', async () => {
      req.params = { docId: 'doc1' };
      StudentsService.getStudentByUid.mockResolvedValue({ id: 'doc1', name: 'Alice' });
      EvaluationsService.getPerformanceSummary.mockResolvedValue({ totalEvaluations: 3, averageScore: 85, byCategory: {} });

      await StudentsController.getStudentSummary(req, res);

      expect(res.json).toHaveBeenCalledWith({
        student: { id: 'doc1', name: 'Alice' },
        performanceSummary: { totalEvaluations: 3, averageScore: 85, byCategory: {} },
      });
    });

    it('returns 404 when student not found', async () => {
      req.params = { docId: 'nonexistent' };
      StudentsService.getStudentByUid.mockResolvedValue(null);
      await StudentsController.getStudentSummary(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── updateAttendance ──────────────────────────────────────────
  describe('updateAttendance', () => {
    beforeEach(() => {
      FirestoreService.getDocument.mockResolvedValue(null);
      FirestoreService.createDocument.mockResolvedValue('log1');
      FirestoreService.getByField.mockResolvedValue([]);
      StudentsService.updateStudent.mockResolvedValue(true);
    });

    it('creates a daily log and sets attendance to 100% for present', async () => {
      req.params = { docId: 'doc1' };
      req.body = { status: 'present' };
      FirestoreService.getByField.mockResolvedValue([{ id: 'log1', status: 'present' }]);

      await StudentsController.updateAttendance(req, res);
      expect(FirestoreService.createDocument).toHaveBeenCalled();
      expect(StudentsService.updateStudent).toHaveBeenCalledWith('doc1', { attendance: 100 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'present',
        percentage: 100,
        totalDays: 1,
      }));
    });

    it('creates a daily log and sets attendance to 0% for absent', async () => {
      req.params = { docId: 'doc1' };
      req.body = { status: 'absent' };
      FirestoreService.getByField.mockResolvedValue([{ id: 'log1', status: 'absent' }]);

      await StudentsController.updateAttendance(req, res);
      expect(StudentsService.updateStudent).toHaveBeenCalledWith('doc1', { attendance: 0 });
    });

    it('calculates cumulative percentage across multiple days', async () => {
      req.params = { docId: 'doc1' };
      req.body = { status: 'present' };
      // Simulate 3 prior days: present, absent, present + today's present = 4 days
      FirestoreService.getByField.mockResolvedValue([
        { id: 'log1', status: 'present' },
        { id: 'log2', status: 'absent' },
        { id: 'log3', status: 'present' },
        { id: 'log4', status: 'present' },
      ]);

      await StudentsController.updateAttendance(req, res);
      // (1 + 0 + 1 + 1) / 4 = 0.75 => 75%
      expect(StudentsService.updateStudent).toHaveBeenCalledWith('doc1', { attendance: 75 });
    });

    it('updates existing log when same day is marked again', async () => {
      req.params = { docId: 'doc1' };
      req.body = { status: 'late' };
      const today = new Date().toISOString().slice(0, 10);
      FirestoreService.getDocument.mockResolvedValue({ id: `doc1_${today}`, status: 'present' });
      FirestoreService.getByField.mockResolvedValue([{ id: `doc1_${today}`, status: 'late' }]);

      await StudentsController.updateAttendance(req, res);
      expect(FirestoreService.updateDocument).toHaveBeenCalled();
      expect(FirestoreService.createDocument).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid status', async () => {
      req.params = { docId: 'doc1' };
      req.body = { status: 'invalid' };
      await StudentsController.updateAttendance(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 when status is missing', async () => {
      req.params = { docId: 'doc1' };
      req.body = {};
      await StudentsController.updateAttendance(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── deleteStudent ────────────────────────────────────────────
  describe('deleteStudent', () => {
    it('deletes a student and returns success', async () => {
      req.params = { docId: 'doc1' };
      StudentsService.deleteStudent.mockResolvedValue(true);
      await StudentsController.deleteStudent(req, res);
      expect(StudentsService.deleteStudent).toHaveBeenCalledWith('doc1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Student deleted successfully' });
    });
  });
});
