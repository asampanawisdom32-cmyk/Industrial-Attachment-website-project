const EvaluationsService = require('../services/evaluationsService');

/**
 * Evaluations Controller
 * Handles evaluation-related HTTP requests
 */
class EvaluationsController {
  static _serializeDate(val) {
    if (!val) return null;
    if (typeof val === 'object' && val._seconds != null) {
      return new Date(val._seconds * 1000).toISOString();
    }
    if (val instanceof Date) return val.toISOString();
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  static _serializeEval(e) {
    if (!e) return e;
    return {
      ...e,
      createdAt: EvaluationsController._serializeDate(e.createdAt),
      evaluationDate: EvaluationsController._serializeDate(e.evaluationDate),
      updatedAt: EvaluationsController._serializeDate(e.updatedAt),
    };
  }

  /**
   * Create a new evaluation
   * POST /evaluations
   */
  static async createEvaluation(req, res) {
    try {
      let { studentId, supervisorId, score, comment, category } = req.body;

      // Support '__self__' token — use the authenticated user's UID
      if (supervisorId === '__self__') {
        supervisorId = req.user.uid;
      }

      if (!studentId || !supervisorId || score === undefined || !category) {
        return res.status(400).json({ error: 'Required fields are missing' });
      }

      if (score < 0 || score > 100) {
        return res.status(400).json({ error: 'Score must be between 0 and 100' });
      }

      const evaluation = await EvaluationsService.createEvaluation({
        studentId,
        supervisorId,
        score,
        comment: comment || '',
        category,
        evaluationDate: new Date(),
      });

      return res.status(201).json({
        message: 'Evaluation created successfully',
        evaluation,
      });
    } catch (error) {
      console.error('Create evaluation error:', error);
      return res.status(500).json({ error: error.message || 'Failed to create evaluation' });
    }
  }

  /**
   * Get evaluation by ID
   * GET /evaluations/:evaluationId
   */
  static async getEvaluation(req, res) {
    try {
      const { evaluationId } = req.params;

      const evaluation = EvaluationsController._serializeEval(await EvaluationsService.getEvaluation(evaluationId));

      if (!evaluation) {
        return res.status(404).json({ error: 'Evaluation not found' });
      }

      return res.json({ evaluation });
    } catch (error) {
      console.error('Get evaluation error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get evaluation' });
    }
  }

  /**
   * Get all evaluations for a student
   * GET /evaluations/student/:studentId
   */
  static async getStudentEvaluations(req, res) {
    try {
      const { studentId } = req.params;

      const evaluations = (await EvaluationsService.getStudentEvaluations(studentId)).map(e => EvaluationsController._serializeEval(e));

      return res.json({
        evaluations,
        count: evaluations.length,
      });
    } catch (error) {
      console.error('Get student evaluations error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get evaluations' });
    }
  }

  /**
   * Get evaluations by supervisor
   * GET /evaluations/supervisor/:supervisorId
   */
  static async getEvaluationsBySupervisor(req, res) {
    try {
      const { supervisorId } = req.params;

      const evaluations = (await EvaluationsService.getEvaluationsBySupervisor(supervisorId)).map(e => EvaluationsController._serializeEval(e));

      return res.json({
        evaluations,
        count: evaluations.length,
      });
    } catch (error) {
      console.error('Get evaluations by supervisor error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get evaluations' });
    }
  }

  /**
   * Get average evaluation score for a student
   * GET /evaluations/student/:studentId/average
   */
  static async getAverageScore(req, res) {
    try {
      const { studentId } = req.params;

      const averageScore = await EvaluationsService.getAverageScore(studentId);

      return res.json({
        studentId,
        averageScore,
      });
    } catch (error) {
      console.error('Get average score error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get average score' });
    }
  }

  /**
   * Get performance summary for a student
   * GET /evaluations/student/:studentId/summary
   */
  static async getPerformanceSummary(req, res) {
    try {
      const { studentId } = req.params;

      const summary = await EvaluationsService.getPerformanceSummary(studentId);

      return res.json({
        studentId,
        summary,
      });
    } catch (error) {
      console.error('Get performance summary error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get summary' });
    }
  }

  /**
   * Update evaluation
   * PUT /evaluations/:evaluationId
   */
  static async updateEvaluation(req, res) {
    try {
      const { evaluationId } = req.params;
      const updates = req.body;

      if (updates.score !== undefined) {
        if (updates.score < 0 || updates.score > 100) {
          return res.status(400).json({ error: 'Score must be between 0 and 100' });
        }
      }

      await EvaluationsService.updateEvaluation(evaluationId, updates);

      return res.json({
        message: 'Evaluation updated successfully',
      });
    } catch (error) {
      console.error('Update evaluation error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update evaluation' });
    }
  }

  /**
   * Delete evaluation
   * DELETE /evaluations/:evaluationId
   */
  static async deleteEvaluation(req, res) {
    try {
      const { evaluationId } = req.params;

      await EvaluationsService.deleteEvaluation(evaluationId);

      return res.json({
        message: 'Evaluation deleted successfully',
      });
    } catch (error) {
      console.error('Delete evaluation error:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete evaluation' });
    }
  }

  /**
   * Get evaluations by category
   * GET /evaluations/student/:studentId/category/:category
   */
  static async getEvaluationsByCategory(req, res) {
    try {
      const { studentId, category } = req.params;

      const evaluations = (await EvaluationsService.getEvaluationsByCategory(studentId, category)).map(e => EvaluationsController._serializeEval(e));

      return res.json({
        evaluations,
        count: evaluations.length,
      });
    } catch (error) {
      console.error('Get evaluations by category error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get evaluations' });
    }
  }
}

module.exports = EvaluationsController;
