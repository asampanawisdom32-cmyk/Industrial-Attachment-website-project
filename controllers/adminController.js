const AuthService = require('../services/authService');
const StudentsService = require('../services/studentsService');
const FirestoreService = require('../services/firestoreService');

/**
 * Admin Controller
 * Handles admin-specific management operations
 */
class AdminController {
  /**
   * Check if admin account already exists
   * GET /api/admin/check-admin
   */
  static async checkAdminExists(req, res) {
    try {
      const exists = await AuthService.adminExists();
      return res.json({ adminExists: exists });
    } catch (error) {
      console.error('Check admin error:', error);
      return res.status(500).json({ error: error.message || 'Failed to check admin' });
    }
  }

  /**
   * Get all supervisors (school + workplace)
   * GET /api/admin/supervisors
   */
  static async getSupervisors(req, res) {
    try {
      const supervisors = await AuthService.getAllSupervisors();
      return res.json(supervisors);
    } catch (error) {
      console.error('Get supervisors error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get supervisors' });
    }
  }

  /**
   * Validate supervisor UID has the expected role
   */
  static async validateSupervisor(supervisorUid, expectedRole) {
    const user = await AuthService.getUserByUid(supervisorUid);
    if (!user) {
      throw new Error('Supervisor not found');
    }
    if (user.role !== expectedRole) {
      throw new Error(`User is not a ${expectedRole.replace('_', ' ')}`);
    }
    return user;
  }

  /**
   * Assign a school supervisor to a student
   * PUT /api/admin/students/:docId/assign-school-supervisor
   */
  static async assignSchoolSupervisor(req, res) {
    try {
      const { docId } = req.params;
      const { supervisorUid } = req.body;

      if (supervisorUid) {
        await AdminController.validateSupervisor(supervisorUid, 'school_supervisor');
      }
      await StudentsService.assignSchoolSupervisor(docId, supervisorUid || '');

      return res.json({
        message: supervisorUid ? 'School supervisor assigned successfully' : 'School supervisor cleared',
      });
    } catch (error) {
      console.error('Assign school supervisor error:', error);
      const status = error.message.includes('not found') || error.message.includes('not a') ? 400 : 500;
      return res.status(status).json({ error: error.message || 'Failed to assign supervisor' });
    }
  }

  /**
   * Assign a workplace supervisor to a student
   * PUT /api/admin/students/:docId/assign-workplace-supervisor
   */
  static async assignWorkplaceSupervisor(req, res) {
    try {
      const { docId } = req.params;
      const { supervisorUid } = req.body;

      if (supervisorUid) {
        await AdminController.validateSupervisor(supervisorUid, 'workplace_supervisor');
      }
      await StudentsService.assignWorkplaceSupervisor(docId, supervisorUid || '');

      return res.json({
        message: supervisorUid ? 'Workplace supervisor assigned successfully' : 'Workplace supervisor cleared',
      });
    } catch (error) {
      console.error('Assign workplace supervisor error:', error);
      const status = error.message.includes('not found') || error.message.includes('not a') ? 400 : 500;
      return res.status(status).json({ error: error.message || 'Failed to assign supervisor' });
    }
  }

  /**
   * Get students grouped by department
   * GET /api/admin/students/grouped-by-department
   */
  static async getStudentsByDepartment(req, res) {
    try {
      const groups = await StudentsService.getStudentsGroupedByDepartment();
      return res.json({ groups });
    } catch (error) {
      console.error('Get students by department error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get grouped students' });
    }
  }

  /**
   * Get students grouped by company location
   * GET /api/admin/students/grouped-by-location
   */
  static async getStudentsByLocation(req, res) {
    try {
      const groups = await StudentsService.getStudentsGroupedByLocation();
      return res.json({ groups });
    } catch (error) {
      console.error('Get students by location error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get grouped students' });
    }
  }

  /**
   * Bulk assign a school supervisor to multiple students
   * PUT /api/admin/students/bulk-assign-school-supervisor
   */
  static async bulkAssignSchoolSupervisor(req, res) {
    try {
      const { studentIds, supervisorUid } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ error: 'At least one student ID is required' });
      }
      if (!supervisorUid) {
        return res.status(400).json({ error: 'Supervisor UID is required' });
      }

      await AdminController.validateSupervisor(supervisorUid, 'school_supervisor');
      const result = await StudentsService.assignSchoolSupervisorBulk(studentIds, supervisorUid);

      return res.json({
        message: `School supervisor assigned to ${result.assigned} student(s) successfully`,
        assigned: result.assigned,
      });
    } catch (error) {
      console.error('Bulk assign school supervisor error:', error);
      const status = error.message.includes('not found') || error.message.includes('not a') ? 400 : 500;
      return res.status(status).json({ error: error.message || 'Failed to bulk assign supervisors' });
    }
  }

  /**
   * Bulk assign a workplace supervisor to multiple students
   * PUT /api/admin/students/bulk-assign-workplace-supervisor
   */
  static async bulkAssignWorkplaceSupervisor(req, res) {
    try {
      const { studentIds, supervisorUid } = req.body;

      if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ error: 'At least one student ID is required' });
      }
      if (!supervisorUid) {
        return res.status(400).json({ error: 'Supervisor UID is required' });
      }

      await AdminController.validateSupervisor(supervisorUid, 'workplace_supervisor');
      const result = await StudentsService.assignWorkplaceSupervisorBulk(studentIds, supervisorUid);

      return res.json({
        message: `Workplace supervisor assigned to ${result.assigned} student(s) successfully`,
        assigned: result.assigned,
      });
    } catch (error) {
      console.error('Bulk assign workplace supervisor error:', error);
      const status = error.message.includes('not found') || error.message.includes('not a') ? 400 : 500;
      return res.status(status).json({ error: error.message || 'Failed to bulk assign supervisors' });
    }
  }

  /**
   * Get all students with supervisor info populated
   * GET /api/admin/students/all
   */
  static async getAllStudentsWithSupervisors(req, res) {
    try {
      const students = await StudentsService.getAllStudents();
      const supervisors = await AuthService.getAllSupervisors();
      const allSup = [...supervisors.schoolSupervisors, ...supervisors.workplaceSupervisors];
      const supMap = {};
      for (const s of allSup) {
        supMap[s.uid] = s.name || s.email;
      }

      const DashboardService = require('../services/dashboardService');

      const enriched = await Promise.all(students.map(async (s) => {
        const calc = await DashboardService._calculateProgress(s.id, s.durationWeeks).catch(() => ({ progress: 0, attendance: 0 }));
        return {
          ...s,
          progress: calc.progress,
          attendance: calc.attendance,
          schoolSupervisorName: supMap[s.schoolSupervisor] || 'Unassigned',
          workplaceSupervisorName: supMap[s.workplaceSupervisor] || 'Unassigned',
        };
      }));

      return res.json({ students: enriched });
    } catch (error) {
      console.error('Get all students with supervisors error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get students' });
    }
  }

  /**
   * Delete a supervisor user
   * DELETE /api/admin/supervisors/:uid
   */
  static async deleteSupervisor(req, res) {
    try {
      const { uid } = req.params;
      const user = await AuthService.getUserByUid(uid);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      if (user.role !== 'school_supervisor' && user.role !== 'workplace_supervisor') {
        return res.status(400).json({ error: 'User is not a supervisor' });
      }

      const { auth: firebaseAuth } = require('../config/firebase');
      await firebaseAuth.deleteUser(uid);
      await FirestoreService.deleteDocument('users', uid);

      return res.json({ message: 'Supervisor deleted successfully' });
    } catch (error) {
      console.error('Delete supervisor error:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete supervisor' });
    }
  }
}

module.exports = AdminController;
