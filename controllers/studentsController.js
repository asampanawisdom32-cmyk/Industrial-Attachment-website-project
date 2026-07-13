const StudentsService = require('../services/studentsService');
const EvaluationsService = require('../services/evaluationsService');
const FirestoreService = require('../services/firestoreService');

/**
 * Students Controller
 * Handles student-related HTTP requests
 */
class StudentsController {
  /**
   * Create a new student record
   * POST /students
   */
  static async createStudent(req, res) {
    try {
      const { uid, studentId, name, email, department, yearOfStudy, phone, workplace, supervisor, durationWeeks } = req.body;

      if (!uid || !studentId || !name || !email) {
        return res.status(400).json({ error: 'Required fields are missing' });
      }

      const student = await StudentsService.createStudent(uid, {
        studentId,
        name,
        email,
        department,
        yearOfStudy,
        phone,
        workplace,
        supervisor,
        durationWeeks: parseInt(durationWeeks, 10) || 12,
      });

      return res.status(201).json({
        message: 'Student created successfully',
        student,
      });
    } catch (error) {
      console.error('Create student error:', error);
      return res.status(500).json({ error: error.message || 'Failed to create student' });
    }
  }

  /**
   * Get student by UID
   * GET /students/:uid
   */
  static async getStudent(req, res) {
    try {
      const { uid } = req.params;

      const student = await StudentsService.getStudentByUid(uid);

      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      return res.json({ student });
    } catch (error) {
      console.error('Get student error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get student' });
    }
  }

  /**
   * Get all students
   * GET /students
   */
  static async getAllStudents(req, res) {
    try {
      const { status } = req.query;

      const students = await StudentsService.getAllStudents(status || null);

      return res.json({
        students,
        count: students.length,
      });
    } catch (error) {
      console.error('Get all students error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get students' });
    }
  }

  /**
   * Update student information
   * PUT /students/:docId
   */
  static async updateStudent(req, res) {
    try {
      const { docId } = req.params;
      const updates = req.body;

      await StudentsService.updateStudent(docId, updates);

      return res.json({
        message: 'Student updated successfully',
      });
    } catch (error) {
      console.error('Update student error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update student' });
    }
  }

  /**
   * Get students by department
   * GET /students/department/:department
   */
  static async getStudentsByDepartment(req, res) {
    try {
      const { department } = req.params;

      const students = await StudentsService.getStudentsByDepartment(department);

      return res.json({
        students,
        count: students.length,
      });
    } catch (error) {
      console.error('Get students by department error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get students' });
    }
  }

  /**
   * Get students by supervisor
   * GET /students/supervisor/:supervisorId
   */
  static async getStudentsBySupervisor(req, res) {
    try {
      const { supervisorId } = req.params;

      const students = await StudentsService.getStudentsBySupervisor(supervisorId);

      return res.json({
        students,
        count: students.length,
      });
    } catch (error) {
      console.error('Get students by supervisor error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get students' });
    }
  }

  /**
   * Get student with evaluation summary
   * GET /students/:uid/summary
   */
  static async getStudentSummary(req, res) {
    try {
      const { uid } = req.params;

      const student = await StudentsService.getStudentByUid(uid);
      if (!student) {
        return res.status(404).json({ error: 'Student not found' });
      }

      const performanceSummary = await EvaluationsService.getPerformanceSummary(student.id);

      return res.json({
        student,
        performanceSummary,
      });
    } catch (error) {
      console.error('Get student summary error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get summary' });
    }
  }

  /**
   * Get recent attendance logs for a student
   * GET /students/:docId/attendance-logs
   */
  static async getAttendanceLogs(req, res) {
    try {
      const { docId } = req.params;
      const allLogs = await FirestoreService.getByField('attendance_logs', 'studentId', docId);
      const logsSorted = allLogs.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const recent = logsSorted.slice(0, 14).map((l) => ({
        date: l.date,
        status: l.status,
        markedByRole: l.markedByRole || '',
      }));
      return res.json({ logs: recent });
    } catch (error) {
      console.error('Get attendance logs error:', error);
      return res.status(500).json({ error: error.message || 'Failed to get logs' });
    }
  }

  /**
   * Mark attendance for a student (daily log)
   * PUT /students/:docId/attendance
   * Only workplace supervisors and admins can mark.
   * Each day can only be marked once — re-marking the same day updates the existing log.
   * Attendance % = weighted sum of all logs / total days marked * 100
   */
  static async updateAttendance(req, res) {
    try {
      const { docId } = req.params;
      const { status } = req.body;

      if (!status || !['present', 'absent', 'late', 'excused'].includes(status)) {
        return res.status(400).json({ error: 'Valid attendance status is required (present, absent, late, excused)' });
      }

      // Today's date as YYYY-MM-DD (one log per student per day)
      const today = new Date().toISOString().slice(0, 10);
      const logId = `${docId}_${today}`;

      // Check if already marked today — update instead of duplicating
      const existing = await FirestoreService.getDocument('attendance_logs', logId);
      if (existing) {
        await FirestoreService.updateDocument('attendance_logs', logId, {
          status,
          markedBy: req.user.uid,
          markedByRole: req.userDocument ? req.userDocument.role : 'unknown',
          updatedAt: new Date(),
        });
      } else {
        await FirestoreService.createDocument('attendance_logs', {
          studentId: docId,
          date: today,
          status,
          markedBy: req.user.uid,
          markedByRole: req.userDocument ? req.userDocument.role : 'unknown',
          timestamp: new Date(),
        }, logId);
      }

      // Recalculate cumulative attendance % from all logs for this student
      const allLogs = await FirestoreService.getByField('attendance_logs', 'studentId', docId);
      const weightMap = { present: 1, absent: 0, late: 0.5, excused: 0.75 };
      let weightedSum = 0;
      for (const log of allLogs) {
        weightedSum += (weightMap[log.status] || 0);
      }
      const totalDays = allLogs.length;
      const percentage = totalDays > 0 ? Math.round((weightedSum / totalDays) * 100) : 0;

      await StudentsService.updateStudent(docId, { attendance: percentage });

      return res.json({
        message: existing ? `Attendance updated for ${today}` : `Attendance marked for ${today}`,
        status,
        percentage,
        totalDays,
      });
    } catch (error) {
      console.error('Update attendance error:', error);
      return res.status(500).json({ error: error.message || 'Failed to update attendance' });
    }
  }

  /**
   * Delete student record
   * DELETE /students/:docId
   */
  static async deleteStudent(req, res) {
    try {
      const { docId } = req.params;

      await StudentsService.deleteStudent(docId);

      return res.json({
        message: 'Student deleted successfully',
      });
    } catch (error) {
      console.error('Delete student error:', error);
      return res.status(500).json({ error: error.message || 'Failed to delete student' });
    }
  }
}

module.exports = StudentsController;
