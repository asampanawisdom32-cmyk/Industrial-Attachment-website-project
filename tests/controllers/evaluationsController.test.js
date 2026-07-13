const EvaluationsController = require('../../controllers/evaluationsController');
const EvaluationsService = require('../../services/evaluationsService');

jest.mock('../../services/evaluationsService');

describe('EvaluationsController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = { body: {}, params: {}, query: {} };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
  });

  // ─── createEvaluation ──────────────────────────────────────────
  describe('createEvaluation', () => {
    it('creates an evaluation and returns 201', async () => {
      req.body = { studentId: 's1', supervisorId: 'sup1', score: 85, category: 'technical', comment: 'Good' };
      EvaluationsService.createEvaluation.mockResolvedValue({ id: 'e1', score: 85, category: 'technical' });

      await EvaluationsController.createEvaluation(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Evaluation created successfully',
          evaluation: expect.objectContaining({ score: 85, category: 'technical' }),
        })
      );
      expect(EvaluationsService.createEvaluation).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: 's1', score: 85, category: 'technical', evaluationDate: expect.any(Date) })
      );
    });

    it('returns 400 for missing required fields', async () => {
      req.body = { studentId: 's1' };
      await EvaluationsController.createEvaluation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns 400 for out-of-range score', async () => {
      req.body = { studentId: 's1', supervisorId: 'sup1', score: 150, category: 'technical' };
      await EvaluationsController.createEvaluation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Score must be between 0 and 100' });
    });

    it('returns 400 for negative score', async () => {
      req.body = { studentId: 's1', supervisorId: 'sup1', score: -10, category: 'technical' };
      await EvaluationsController.createEvaluation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ─── getEvaluation ─────────────────────────────────────────────
  describe('getEvaluation', () => {
    it('returns an evaluation by ID', async () => {
      req.params = { evaluationId: 'e1' };
      EvaluationsService.getEvaluation.mockResolvedValue({ id: 'e1', score: 85 });
      await EvaluationsController.getEvaluation(req, res);
      expect(res.json).toHaveBeenCalledWith({ evaluation: { id: 'e1', score: 85, createdAt: null, evaluationDate: null, updatedAt: null } });
    });

    it('returns 404 when not found', async () => {
      req.params = { evaluationId: 'e1' };
      EvaluationsService.getEvaluation.mockResolvedValue(null);
      await EvaluationsController.getEvaluation(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ─── getStudentEvaluations ─────────────────────────────────────
  describe('getStudentEvaluations', () => {
    it('returns evaluations for a student', async () => {
      req.params = { studentId: 's1' };
      EvaluationsService.getStudentEvaluations.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);
      await EvaluationsController.getStudentEvaluations(req, res);
      expect(res.json).toHaveBeenCalledWith({ evaluations: [{ id: 'e1', createdAt: null, evaluationDate: null, updatedAt: null }, { id: 'e2', createdAt: null, evaluationDate: null, updatedAt: null }], count: 2 });
    });
  });

  // ─── getEvaluationsBySupervisor ────────────────────────────────
  describe('getEvaluationsBySupervisor', () => {
    it('returns evaluations by supervisor', async () => {
      req.params = { supervisorId: 'sup1' };
      EvaluationsService.getEvaluationsBySupervisor.mockResolvedValue([{ id: 'e1', supervisorId: 'sup1' }]);
      await EvaluationsController.getEvaluationsBySupervisor(req, res);
      expect(res.json).toHaveBeenCalledWith({
        evaluations: [{ id: 'e1', supervisorId: 'sup1', createdAt: null, evaluationDate: null, updatedAt: null }],
        count: 1,
      });
    });
  });

  // ─── getAverageScore ───────────────────────────────────────────
  describe('getAverageScore', () => {
    it('returns average score for a student', async () => {
      req.params = { studentId: 's1' };
      EvaluationsService.getAverageScore.mockResolvedValue(85.5);
      await EvaluationsController.getAverageScore(req, res);
      expect(res.json).toHaveBeenCalledWith({ studentId: 's1', averageScore: 85.5 });
    });
  });

  // ─── getPerformanceSummary ─────────────────────────────────────
  describe('getPerformanceSummary', () => {
    it('returns performance summary', async () => {
      req.params = { studentId: 's1' };
      EvaluationsService.getPerformanceSummary.mockResolvedValue({
        totalEvaluations: 2,
        averageScore: 80,
        byCategory: { technical: { average: 85, scores: [80, 90] } },
      });
      await EvaluationsController.getPerformanceSummary(req, res);
      expect(res.json).toHaveBeenCalledWith({
        studentId: 's1',
        summary: { totalEvaluations: 2, averageScore: 80, byCategory: { technical: { average: 85, scores: [80, 90] } } },
      });
    });
  });

  // ─── updateEvaluation ──────────────────────────────────────────
  describe('updateEvaluation', () => {
    it('updates an evaluation and returns success', async () => {
      req.params = { evaluationId: 'e1' };
      req.body = { score: 95 };
      EvaluationsService.updateEvaluation.mockResolvedValue(true);
      await EvaluationsController.updateEvaluation(req, res);
      expect(EvaluationsService.updateEvaluation).toHaveBeenCalledWith('e1', { score: 95 });
      expect(res.json).toHaveBeenCalledWith({ message: 'Evaluation updated successfully' });
    });

    it('returns 400 for out-of-range score in update', async () => {
      req.params = { evaluationId: 'e1' };
      req.body = { score: 200 };
      await EvaluationsController.updateEvaluation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(EvaluationsService.updateEvaluation).not.toHaveBeenCalled();
    });
  });

  // ─── deleteEvaluation ──────────────────────────────────────────
  describe('deleteEvaluation', () => {
    it('deletes an evaluation', async () => {
      req.params = { evaluationId: 'e1' };
      EvaluationsService.deleteEvaluation.mockResolvedValue(true);
      await EvaluationsController.deleteEvaluation(req, res);
      expect(EvaluationsService.deleteEvaluation).toHaveBeenCalledWith('e1');
      expect(res.json).toHaveBeenCalledWith({ message: 'Evaluation deleted successfully' });
    });
  });

  // ─── getEvaluationsByCategory ──────────────────────────────────
  describe('getEvaluationsByCategory', () => {
    it('returns evaluations filtered by category', async () => {
      req.params = { studentId: 's1', category: 'technical' };
      EvaluationsService.getEvaluationsByCategory.mockResolvedValue([{ id: 'e1', category: 'technical' }]);
      await EvaluationsController.getEvaluationsByCategory(req, res);
      expect(EvaluationsService.getEvaluationsByCategory).toHaveBeenCalledWith('s1', 'technical');
      expect(res.json).toHaveBeenCalledWith({
        evaluations: [{ id: 'e1', category: 'technical', createdAt: null, evaluationDate: null, updatedAt: null }],
        count: 1,
      });
    });
  });
});
