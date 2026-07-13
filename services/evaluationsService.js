const FirestoreService = require('./firestoreService');
const { Evaluation } = require('../models');

/**
 * Evaluations Service
 * Handles all evaluation-related operations
 */
class EvaluationsService {
  /**
   * Create a new evaluation
   * @param {object} evaluationData - Evaluation information
   */
  static async createEvaluation(evaluationData) {
    try {
      const evaluation = new Evaluation(evaluationData);

      const docId = await FirestoreService.createDocument('evaluations', evaluation.toObject());
      return { ...evaluation.toObject(), id: docId };
    } catch (error) {
      console.error('Error creating evaluation:', error);
      throw new Error(`Failed to create evaluation: ${error.message}`);
    }
  }

  /**
   * Get evaluation by ID
   * @param {string} evaluationId - Evaluation document ID
   */
  static async getEvaluation(evaluationId) {
    try {
      return await FirestoreService.getDocument('evaluations', evaluationId);
    } catch (error) {
      console.error('Error getting evaluation:', error);
      throw new Error(`Failed to get evaluation: ${error.message}`);
    }
  }

  /**
   * Get all evaluations for a student
   * @param {string} studentId - Student document ID
   */
  static async getStudentEvaluations(studentId) {
    try {
      return await FirestoreService.getByField('evaluations', 'studentId', studentId);
    } catch (error) {
      console.error('Error getting student evaluations:', error);
      throw new Error(`Failed to get evaluations: ${error.message}`);
    }
  }

  /**
   * Get evaluations by supervisor
   * @param {string} supervisorId - Supervisor UID
   */
  static async getEvaluationsBySupervisor(supervisorId) {
    try {
      return await FirestoreService.getByField('evaluations', 'supervisorId', supervisorId);
    } catch (error) {
      console.error('Error getting evaluations by supervisor:', error);
      throw new Error(`Failed to get evaluations: ${error.message}`);
    }
  }

  /**
   * Get average evaluation score for a student
   * @param {string} studentId - Student document ID
   */
  static async getAverageScore(studentId) {
    try {
      const evaluations = await this.getStudentEvaluations(studentId);
      if (evaluations.length === 0) return 0;

      const totalScore = evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
      return totalScore / evaluations.length;
    } catch (error) {
      console.error('Error calculating average score:', error);
      throw new Error(`Failed to calculate score: ${error.message}`);
    }
  }

  /**
   * Update evaluation
   * @param {string} evaluationId - Evaluation document ID
   * @param {object} updates - Fields to update
   */
  static async updateEvaluation(evaluationId, updates) {
    try {
      await FirestoreService.updateDocument('evaluations', evaluationId, updates);
      return true;
    } catch (error) {
      console.error('Error updating evaluation:', error);
      throw new Error(`Failed to update evaluation: ${error.message}`);
    }
  }

  /**
   * Delete evaluation
   * @param {string} evaluationId - Evaluation document ID
   */
  static async deleteEvaluation(evaluationId) {
    try {
      await FirestoreService.deleteDocument('evaluations', evaluationId);
      return true;
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      throw new Error(`Failed to delete evaluation: ${error.message}`);
    }
  }

  /**
   * Get evaluations by category
   * @param {string} studentId - Student document ID
   * @param {string} category - Evaluation category
   */
  static async getEvaluationsByCategory(studentId, category) {
    try {
      const evaluations = await this.getStudentEvaluations(studentId);
      return evaluations.filter((evaluation) => evaluation.category === category);
    } catch (error) {
      console.error('Error getting evaluations by category:', error);
      throw new Error(`Failed to get evaluations: ${error.message}`);
    }
  }

  /**
   * Get performance summary for a student
   * @param {string} studentId - Student document ID
   */
  static async getPerformanceSummary(studentId) {
    try {
      const evaluations = await this.getStudentEvaluations(studentId);

      const summary = {
        totalEvaluations: evaluations.length,
        averageScore: 0,
        byCategory: {},
      };

      if (evaluations.length === 0) return summary;

      // Calculate average
      const totalScore = evaluations.reduce((sum, evaluation) => sum + evaluation.score, 0);
      summary.averageScore = totalScore / evaluations.length;

      // Group by category
      evaluations.forEach((evaluation) => {
        if (!summary.byCategory[evaluation.category]) {
          summary.byCategory[evaluation.category] = [];
        }
        summary.byCategory[evaluation.category].push(evaluation.score);
      });

      // Calculate category averages
      Object.keys(summary.byCategory).forEach((category) => {
        const scores = summary.byCategory[category];
        const average = scores.reduce((a, b) => a + b, 0) / scores.length;
        summary.byCategory[category] = {
          scores,
          average,
        };
      });

      return summary;
    } catch (error) {
      console.error('Error getting performance summary:', error);
      throw new Error(`Failed to get summary: ${error.message}`);
    }
  }
}

module.exports = EvaluationsService;
