const EvaluationsService = require('../../services/evaluationsService');
const FirestoreService = require('../../services/firestoreService');

jest.mock('../../services/firestoreService');
jest.mock('../../models', () => {
  const { Evaluation } = jest.requireActual('../../models');
  return { Evaluation };
});

describe('EvaluationsService', () => {
  const mockEvalData = {
    studentId: 'student1',
    supervisorId: 'supervisor1',
    score: 85,
    comment: 'Good performance',
    category: 'technical',
    evaluationDate: new Date('2025-01-15'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEvaluation', () => {
    it('creates an evaluation and returns it with id', async () => {
      FirestoreService.createDocument.mockResolvedValue('eval-1');
      const result = await EvaluationsService.createEvaluation(mockEvalData);
      expect(FirestoreService.createDocument).toHaveBeenCalledWith(
        'evaluations',
        expect.objectContaining({
          studentId: 'student1',
          score: 85,
          category: 'technical',
        })
      );
      expect(result.id).toBe('eval-1');
      expect(result.score).toBe(85);
    });

    it('throws on error', async () => {
      FirestoreService.createDocument.mockRejectedValue(new Error('DB error'));
      await expect(EvaluationsService.createEvaluation(mockEvalData)).rejects.toThrow('Failed to create evaluation');
    });
  });

  describe('getEvaluation', () => {
    it('returns an evaluation by ID', async () => {
      const evaluation = { id: 'e1', score: 90 };
      FirestoreService.getDocument.mockResolvedValue(evaluation);
      const result = await EvaluationsService.getEvaluation('e1');
      expect(result).toEqual(evaluation);
      expect(FirestoreService.getDocument).toHaveBeenCalledWith('evaluations', 'e1');
    });

    it('returns null when not found', async () => {
      FirestoreService.getDocument.mockResolvedValue(null);
      const result = await EvaluationsService.getEvaluation('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getStudentEvaluations', () => {
    it('returns evaluations for a student', async () => {
      FirestoreService.getByField.mockResolvedValue([{ id: 'e1', studentId: 's1' }]);
      const result = await EvaluationsService.getStudentEvaluations('s1');
      expect(FirestoreService.getByField).toHaveBeenCalledWith('evaluations', 'studentId', 's1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getEvaluationsBySupervisor', () => {
    it('returns evaluations by supervisor ID', async () => {
      FirestoreService.getByField.mockResolvedValue([{ id: 'e1', supervisorId: 'sup1' }]);
      const result = await EvaluationsService.getEvaluationsBySupervisor('sup1');
      expect(FirestoreService.getByField).toHaveBeenCalledWith('evaluations', 'supervisorId', 'sup1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getAverageScore', () => {
    it('returns average of all evaluation scores', async () => {
      FirestoreService.getByField.mockResolvedValue([
        { score: 80 },
        { score: 90 },
        { score: 100 },
      ]);
      const result = await EvaluationsService.getAverageScore('s1');
      expect(result).toBe(90);
    });

    it('returns 0 when no evaluations exist', async () => {
      FirestoreService.getByField.mockResolvedValue([]);
      const result = await EvaluationsService.getAverageScore('s1');
      expect(result).toBe(0);
    });
  });

  describe('updateEvaluation', () => {
    it('updates an evaluation document', async () => {
      FirestoreService.updateDocument.mockResolvedValue(true);
      const result = await EvaluationsService.updateEvaluation('e1', { score: 95 });
      expect(result).toBe(true);
      expect(FirestoreService.updateDocument).toHaveBeenCalledWith('evaluations', 'e1', { score: 95 });
    });
  });

  describe('deleteEvaluation', () => {
    it('deletes an evaluation document', async () => {
      FirestoreService.deleteDocument.mockResolvedValue(true);
      const result = await EvaluationsService.deleteEvaluation('e1');
      expect(result).toBe(true);
      expect(FirestoreService.deleteDocument).toHaveBeenCalledWith('evaluations', 'e1');
    });
  });

  describe('getEvaluationsByCategory', () => {
    it('filters evaluations by category', async () => {
      FirestoreService.getByField.mockResolvedValue([
        { id: 'e1', category: 'technical', score: 80 },
        { id: 'e2', category: 'soft_skills', score: 90 },
        { id: 'e3', category: 'technical', score: 85 },
      ]);
      const result = await EvaluationsService.getEvaluationsByCategory('s1', 'technical');
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.category === 'technical')).toBe(true);
    });
  });

  describe('getPerformanceSummary', () => {
    it('returns full performance summary with category averages', async () => {
      FirestoreService.getByField.mockResolvedValue([
        { score: 80, category: 'technical' },
        { score: 90, category: 'technical' },
        { score: 70, category: 'soft_skills' },
      ]);
      const result = await EvaluationsService.getPerformanceSummary('s1');
      expect(result.totalEvaluations).toBe(3);
      expect(result.averageScore).toBe(80);
      expect(result.byCategory.technical.average).toBe(85);
      expect(result.byCategory.soft_skills.average).toBe(70);
      expect(result.byCategory.technical.scores).toEqual([80, 90]);
    });

    it('returns zeroed summary when no evaluations exist', async () => {
      FirestoreService.getByField.mockResolvedValue([]);
      const result = await EvaluationsService.getPerformanceSummary('s1');
      expect(result).toEqual({
        totalEvaluations: 0,
        averageScore: 0,
        byCategory: {},
      });
    });
  });
});
