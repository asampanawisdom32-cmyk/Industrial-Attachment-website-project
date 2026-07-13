const FirestoreService = require('./firestoreService');
const { Student } = require('../models');

/**
 * Students Service
 * Handles all student-related operations
 */
class StudentsService {
  /**
   * Create a new student record
   * @param {string} uid - Firebase UID of student user
   * @param {object} studentData - Student information
   */
  static async createStudent(uid, studentData) {
    try {
      const student = new Student({
        uid,
        ...studentData,
      });

      const docId = await FirestoreService.createDocument('students', student.toObject());
      return { id: docId, ...student.toObject() };
    } catch (error) {
      console.error('Error creating student:', error);
      throw new Error(`Failed to create student: ${error.message}`);
    }
  }

  /**
   * Assign a school supervisor to a student
   * @param {string} docId - Student document ID
   * @param {string} supervisorUid - Supervisor UID
   */
  static async assignSchoolSupervisor(docId, supervisorUid) {
    try {
      await FirestoreService.updateDocument('students', docId, {
        schoolSupervisor: supervisorUid,
      });
      return true;
    } catch (error) {
      console.error('Error assigning school supervisor:', error);
      throw new Error(`Failed to assign supervisor: ${error.message}`);
    }
  }

  /**
   * Assign a workplace supervisor to a student
   * @param {string} docId - Student document ID
   * @param {string} supervisorUid - Supervisor UID
   */
  static async assignWorkplaceSupervisor(docId, supervisorUid) {
    try {
      await FirestoreService.updateDocument('students', docId, {
        workplaceSupervisor: supervisorUid,
      });
      return true;
    } catch (error) {
      console.error('Error assigning workplace supervisor:', error);
      throw new Error(`Failed to assign supervisor: ${error.message}`);
    }
  }

  /**
   * Bulk assign a school supervisor to multiple students
   * @param {string[]} docIds - Array of student document IDs
   * @param {string} supervisorUid - Supervisor UID
   */
  static async assignSchoolSupervisorBulk(docIds, supervisorUid) {
    try {
      const operations = docIds.map((docId) => ({
        collection: 'students',
        docId,
        data: { schoolSupervisor: supervisorUid, updatedAt: new Date() },
        type: 'update',
      }));
      await FirestoreService.batchWrite(operations);
      return { assigned: docIds.length };
    } catch (error) {
      console.error('Error bulk assigning school supervisor:', error);
      throw new Error(`Failed to bulk assign supervisors: ${error.message}`);
    }
  }

  /**
   * Bulk assign a workplace supervisor to multiple students
   * @param {string[]} docIds - Array of student document IDs
   * @param {string} supervisorUid - Supervisor UID
   */
  static async assignWorkplaceSupervisorBulk(docIds, supervisorUid) {
    try {
      const operations = docIds.map((docId) => ({
        collection: 'students',
        docId,
        data: { workplaceSupervisor: supervisorUid, updatedAt: new Date() },
        type: 'update',
      }));
      await FirestoreService.batchWrite(operations);
      return { assigned: docIds.length };
    } catch (error) {
      console.error('Error bulk assigning workplace supervisor:', error);
      throw new Error(`Failed to bulk assign supervisors: ${error.message}`);
    }
  }

  /**
   * Get student by UID
   * @param {string} uid - Firebase UID
   */
  static async getStudentByUid(uid) {
    try {
      const students = await FirestoreService.getByField('students', 'uid', uid);
      return students.length > 0 ? students[0] : null;
    } catch (error) {
      console.error('Error getting student:', error);
      throw new Error(`Failed to get student: ${error.message}`);
    }
  }

  /**
   * Get all students
   * @param {string} status - Optional status filter (active, completed, dropped)
   */
  static async getAllStudents(status = null) {
    try {
      if (status) {
        return await FirestoreService.getByField('students', 'status', status);
      }
      return await FirestoreService.getDocuments('students', [], 'name', 'asc');
    } catch (error) {
      console.error('Error getting students:', error);
      throw new Error(`Failed to get students: ${error.message}`);
    }
  }

  /**
   * Update student information
   * @param {string} docId - Student document ID
   * @param {object} updates - Fields to update
   */
  static async updateStudent(docId, updates) {
    try {
      await FirestoreService.updateDocument('students', docId, updates);
      return true;
    } catch (error) {
      console.error('Error updating student:', error);
      throw new Error(`Failed to update student: ${error.message}`);
    }
  }

  /**
   * Get students by department
   * @param {string} department - Department name
   */
  static async getStudentsByDepartment(department) {
    try {
      return await FirestoreService.getByField('students', 'department', department);
    } catch (error) {
      console.error('Error getting students by department:', error);
      throw new Error(`Failed to get students: ${error.message}`);
    }
  }

  /**
   * Get students by supervisor (queries old supervisor + new schoolSupervisor + new workplaceSupervisor fields)
   * @param {string} supervisorId - Supervisor UID
   */
  static async getStudentsBySupervisor(supervisorId) {
    try {
      // Firestore doesn't support OR queries, so run three queries and merge results
      const [oldSup, schoolSup, workplaceSup] = await Promise.all([
        FirestoreService.getByField('students', 'supervisor', supervisorId),
        FirestoreService.getByField('students', 'schoolSupervisor', supervisorId),
        FirestoreService.getByField('students', 'workplaceSupervisor', supervisorId),
      ]);

      // Deduplicate by student document ID
      const seen = new Set();
      const merged = [];
      for (const student of [...oldSup, ...schoolSup, ...workplaceSup]) {
        if (!seen.has(student.id)) {
          seen.add(student.id);
          merged.push(student);
        }
      }
      return merged;
    } catch (error) {
      console.error('Error getting students by supervisor:', error);
      throw new Error(`Failed to get students: ${error.message}`);
    }
  }

  /**
   * Update student evaluation score
   * @param {string} docId - Student document ID
   * @param {number} score - Evaluation score
   */
  static async updateEvaluationScore(docId, score) {
    try {
      await FirestoreService.updateDocument('students', docId, {
        evaluationScore: score,
      });
      return true;
    } catch (error) {
      console.error('Error updating evaluation score:', error);
      throw new Error(`Failed to update score: ${error.message}`);
    }
  }

  /**
   * Get students grouped by department
   * @returns {object} - { departments: { departmentName: [students] } }
   */
  static async getStudentsGroupedByDepartment() {
    try {
      const students = await this.getAllStudents();
      const groups = {};
      for (const student of students) {
        const dept = student.department || 'Unassigned';
        if (!groups[dept]) groups[dept] = [];
        groups[dept].push(student);
      }
      return groups;
    } catch (error) {
      console.error('Error grouping students by department:', error);
      throw new Error(`Failed to group students: ${error.message}`);
    }
  }

  /**
   * Get students grouped by company location
   * @returns {object} - { locations: { locationName: [students] } }
   */
  static async getStudentsGroupedByLocation() {
    try {
      const students = await this.getAllStudents();
      const groups = {};
      for (const student of students) {
        const loc = student.location || student.workplace || 'Unassigned';
        if (!groups[loc]) groups[loc] = [];
        groups[loc].push(student);
      }
      return groups;
    } catch (error) {
      console.error('Error grouping students by location:', error);
      throw new Error(`Failed to group students: ${error.message}`);
    }
  }

  /**
   * Delete student record
   * @param {string} docId - Student document ID
   */
  static async deleteStudent(docId) {
    try {
      await FirestoreService.deleteDocument('students', docId);
      return true;
    } catch (error) {
      console.error('Error deleting student:', error);
      throw new Error(`Failed to delete student: ${error.message}`);
    }
  }
}

module.exports = StudentsService;
