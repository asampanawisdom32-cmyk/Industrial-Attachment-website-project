const StudentsService = require('../../services/studentsService');
const FirestoreService = require('../../services/firestoreService');

jest.mock('../../services/firestoreService');
jest.mock('../../models', () => {
  const { Student } = jest.requireActual('../../models');
  return { Student };
});

describe('StudentsService', () => {
  const mockStudentInput = {
    uid: 'stu123',
    studentId: 'STU001',
    name: 'Alice Student',
    email: 'alice@example.com',
    department: 'Computer Science',
    yearOfStudy: '3',
    phone: '555-0100',
    workplace: 'TechCorp',
    supervisor: 'sup001',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createStudent', () => {
    it('creates a student record and returns it with id', async () => {
      FirestoreService.createDocument.mockResolvedValue('new-doc-id');
      const result = await StudentsService.createStudent('stu123', mockStudentInput);
      expect(FirestoreService.createDocument).toHaveBeenCalledWith(
        'students',
        expect.objectContaining({
          uid: 'stu123',
          studentId: 'STU001',
          name: 'Alice Student',
        })
      );
      expect(result.id).toBe('new-doc-id');
      expect(result.name).toBe('Alice Student');
    });

    it('throws on error', async () => {
      FirestoreService.createDocument.mockRejectedValue(new Error('DB error'));
      await expect(StudentsService.createStudent('stu123', mockStudentInput)).rejects.toThrow('Failed to create student');
    });
  });

  describe('assignSchoolSupervisor', () => {
    it('updates the schoolSupervisor field', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);
      const result = await StudentsService.assignSchoolSupervisor('doc1', 'sup001');
      expect(result).toBe(true);
      expect(FirestoreService.updateDocument).toHaveBeenCalledWith('students', 'doc1', { schoolSupervisor: 'sup001' });
    });
  });

  describe('assignWorkplaceSupervisor', () => {
    it('updates the workplaceSupervisor field', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);
      const result = await StudentsService.assignWorkplaceSupervisor('doc1', 'wp001');
      expect(result).toBe(true);
      expect(FirestoreService.updateDocument).toHaveBeenCalledWith('students', 'doc1', { workplaceSupervisor: 'wp001' });
    });
  });

  describe('assignSchoolSupervisorBulk', () => {
    it('performs batch write for multiple students', async () => {
      FirestoreService.batchWrite.mockResolvedValue(true);
      const result = await StudentsService.assignSchoolSupervisorBulk(['doc1', 'doc2'], 'sup001');
      expect(result).toEqual({ assigned: 2 });
      expect(FirestoreService.batchWrite).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ collection: 'students', docId: 'doc1', type: 'update' }),
          expect.objectContaining({ collection: 'students', docId: 'doc2', type: 'update' }),
        ])
      );
    });
  });

  describe('assignWorkplaceSupervisorBulk', () => {
    it('performs batch write for multiple students', async () => {
      FirestoreService.batchWrite.mockResolvedValue(true);
      const result = await StudentsService.assignWorkplaceSupervisorBulk(['doc1', 'doc2'], 'wp001');
      expect(result).toEqual({ assigned: 2 });
      expect(FirestoreService.batchWrite).toHaveBeenCalled();
    });
  });

  describe('getStudentByUid', () => {
    it('returns student when found', async () => {
      const student = { id: 'd1', uid: 'stu123', name: 'Alice' };
      FirestoreService.getByField.mockResolvedValue([student]);
      const result = await StudentsService.getStudentByUid('stu123');
      expect(result).toEqual(student);
      expect(FirestoreService.getByField).toHaveBeenCalledWith('students', 'uid', 'stu123');
    });

    it('returns null when not found', async () => {
      FirestoreService.getByField.mockResolvedValue([]);
      const result = await StudentsService.getStudentByUid('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAllStudents', () => {
    it('returns all students when no status filter', async () => {
      const students = [{ id: 'd1' }, { id: 'd2' }];
      FirestoreService.getDocuments.mockResolvedValue(students);
      const result = await StudentsService.getAllStudents();
      expect(result).toEqual(students);
      expect(FirestoreService.getDocuments).toHaveBeenCalledWith('students', [], 'name', 'asc');
    });

    it('filters by status when provided', async () => {
      FirestoreService.getByField.mockResolvedValue([{ id: 'd1', status: 'active' }]);
      const result = await StudentsService.getAllStudents('active');
      expect(FirestoreService.getByField).toHaveBeenCalledWith('students', 'status', 'active');
      expect(result).toHaveLength(1);
    });
  });

  describe('updateStudent', () => {
    it('updates student document', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);
      const result = await StudentsService.updateStudent('doc1', { name: 'Updated' });
      expect(result).toBe(true);
      expect(FirestoreService.updateDocument).toHaveBeenCalledWith('students', 'doc1', { name: 'Updated' });
    });
  });

  describe('getStudentsByDepartment', () => {
    it('returns students filtered by department', async () => {
      FirestoreService.getByField.mockResolvedValue([{ id: 'd1', department: 'CS' }]);
      const result = await StudentsService.getStudentsByDepartment('CS');
      expect(FirestoreService.getByField).toHaveBeenCalledWith('students', 'department', 'CS');
      expect(result).toHaveLength(1);
    });
  });

  describe('getStudentsBySupervisor', () => {
    it('merges and deduplicates results from three supervisor fields', async () => {
      FirestoreService.getByField
        .mockResolvedValueOnce([{ id: 'd1', name: 'A' }])   // old 'supervisor' field
        .mockResolvedValueOnce([{ id: 'd1', name: 'A' }])   // schoolSupervisor (duplicate)
        .mockResolvedValueOnce([{ id: 'd2', name: 'B' }]);   // workplaceSupervisor

      const result = await StudentsService.getStudentsBySupervisor('sup001');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('d1');
      expect(result[1].id).toBe('d2');
    });

    it('returns empty array when no matches', async () => {
      FirestoreService.getByField.mockResolvedValue([]).mockResolvedValue([]).mockResolvedValue([]);
      const result = await StudentsService.getStudentsBySupervisor('nonexistent');
      expect(result).toEqual([]);
    });
  });

  describe('updateEvaluationScore', () => {
    it('updates the evaluation score field', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);
      const result = await StudentsService.updateEvaluationScore('doc1', 85);
      expect(result).toBe(true);
      expect(FirestoreService.updateDocument).toHaveBeenCalledWith('students', 'doc1', { evaluationScore: 85 });
    });
  });

  describe('getStudentsGroupedByDepartment', () => {
    it('groups students by department', async () => {
      FirestoreService.getDocuments.mockResolvedValue([
        { id: 'd1', department: 'CS', name: 'Alice' },
        { id: 'd2', department: 'CS', name: 'Bob' },
        { id: 'd3', department: 'EE', name: 'Charlie' },
        { id: 'd4', department: '', name: 'No dept' },
      ]);
      const result = await StudentsService.getStudentsGroupedByDepartment();
      expect(Object.keys(result)).toEqual(['CS', 'EE', 'Unassigned']);
      expect(result.CS).toHaveLength(2);
      expect(result.Unassigned).toHaveLength(1);
    });
  });

  describe('getStudentsGroupedByLocation', () => {
    it('groups students by location or workplace', async () => {
      FirestoreService.getDocuments.mockResolvedValue([
        { id: 'd1', location: 'NYC', name: 'Alice' },
        { id: 'd2', location: '', workplace: 'Remote Inc', name: 'Bob' },
        { id: 'd3', location: '', workplace: '', name: 'No loc' },
      ]);
      const result = await StudentsService.getStudentsGroupedByLocation();
      expect(Object.keys(result)).toEqual(['NYC', 'Remote Inc', 'Unassigned']);
    });
  });

  describe('deleteStudent', () => {
    it('deletes student document', async () => {
      FirestoreService.deleteDocument.mockResolvedValue(true);
      const result = await StudentsService.deleteStudent('doc1');
      expect(result).toBe(true);
      expect(FirestoreService.deleteDocument).toHaveBeenCalledWith('students', 'doc1');
    });

    it('throws on error', async () => {
      FirestoreService.deleteDocument.mockRejectedValue(new Error('DB error'));
      await expect(StudentsService.deleteStudent('doc1')).rejects.toThrow('Failed to delete student');
    });
  });
});
