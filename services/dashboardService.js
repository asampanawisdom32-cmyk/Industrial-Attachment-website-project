const StudentsService = require('./studentsService');
const ReportsService = require('./reportsService');
const EvaluationsService = require('./evaluationsService');
const AuthService = require('./authService');
const FirestoreService = require('./firestoreService');

/**
 * Simple in-memory cache with TTL for frequently-accessed dashboard data
 */
const cache = new Map();
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '60000', 10); // 60 seconds default

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function setCache(key, value, ttl = CACHE_TTL) {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
  // Evict old entries when cache grows large — O(1) eviction
  if (cache.size > 200) {
    // Delete ~20% of oldest entries by scanning (avoids sort overhead)
    const oldestKeys = [];
    for (const [k, v] of cache) {
      if (Date.now() > v.expiresAt) {
        oldestKeys.push(k);
      }
    }
    // If no expired entries, delete the first 20 we find
    if (oldestKeys.length === 0) {
      let i = 0;
      for (const k of cache.keys()) {
        if (i++ >= 40) break;
        oldestKeys.push(k);
      }
    }
    for (const k of oldestKeys.slice(0, 40)) cache.delete(k);
  }
}

function _serializeDate(val) {
  if (!val) return null;
  if (typeof val === 'object' && val._seconds != null) {
    return new Date(val._seconds * 1000).toISOString();
  }
  if (val instanceof Date) return val.toISOString();
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

class DashboardService {
  static EXPECTED_WEEKS = 12;

  static async _calculateProgress(studentId, durationWeeks) {
    const [reports, evaluations, attendanceLogs, studentDoc] = await Promise.all([
      ReportsService.getStudentReports(studentId).catch(() => []),
      EvaluationsService.getStudentEvaluations(studentId).catch(() => []),
      FirestoreService.getByField('attendance_logs', 'studentId', studentId).catch(() => []),
      durationWeeks ? Promise.resolve(null) : FirestoreService.getDocument('students', studentId).catch(() => null),
    ]);

    const weeks = durationWeeks || studentDoc?.durationWeeks || this.EXPECTED_WEEKS;
    const reportWeight = 0.4;
    const evalWeight = 0.3;
    const attendWeight = 0.3;

    // Reports: count submitted + reviewed + approved (not drafts)
    const activeReports = reports.filter((r) => r.status === 'submitted' || r.status === 'reviewed' || r.status === 'approved');
    const reportScore = Math.min(activeReports.length / weeks, 1) * 100;

    // Attendance: weighted score from logs
    let attendScore = 0;
    if (attendanceLogs.length > 0) {
      const weights = { present: 1, excused: 0.75, late: 0.5, absent: 0 };
      const totalWeighted = attendanceLogs.reduce((sum, log) => sum + (weights[log.status] || 0), 0);
      attendScore = (totalWeighted / attendanceLogs.length) * 100;
    }

    // Evaluations: average score out of 100
    let evalScore = 0;
    if (evaluations.length > 0) {
      const total = evaluations.reduce((sum, e) => sum + (e.score || 0), 0);
      evalScore = total / evaluations.length;
    }

    const progress = Math.round(reportWeight * reportScore + attendWeight * attendScore + evalWeight * evalScore);

    return {
      progress: Math.min(progress, 100),
      attendance: Math.round(attendScore),
      _counts: {
        reports: reports.length,
        activeReports: activeReports.length,
        evaluations: evaluations.length,
        attendanceDays: attendanceLogs.length,
      },
    };
  }

  static async getSummary(user) {
    if (user.role === 'student') {
      return this.getStudentSummary(user);
    }
    if (user.role === 'admin') {
      return this.getAdminSummary(user);
    }
    if (user.role === 'school_supervisor' || user.role === 'workplace_supervisor') {
      return this.getSupervisorSummary(user);
    }
    return { role: user.role, message: 'Dashboard is being rebuilt.' };
  }

  static async getStudentSummary(user) {
    const student = await StudentsService.getStudentByUid(user.uid);
    const studentDocId = student?.id;

    let reports = [];
    let evaluations = [];
    let calcProgress = { progress: 0, attendance: 0 };

    if (studentDocId) {
      [reports, evaluations, calcProgress] = await Promise.all([
        ReportsService.getStudentReports(studentDocId).catch(() => []),
        EvaluationsService.getStudentEvaluations(studentDocId).catch(() => []),
        this._calculateProgress(studentDocId).catch(() => ({ progress: 0, attendance: 0 })),
      ]);
    }

    // Resolve supervisor names — parallel fetch both supervisors
    let schoolSupervisorName = '';
    let workplaceSupervisorName = '';
    if (student?.schoolSupervisor || student?.workplaceSupervisor) {
      const [schoolSup, workplaceSup] = await Promise.all([
        student?.schoolSupervisor
          ? AuthService.getUserByUid(student.schoolSupervisor).catch(() => null)
          : Promise.resolve(null),
        student?.workplaceSupervisor
          ? AuthService.getUserByUid(student.workplaceSupervisor).catch(() => null)
          : Promise.resolve(null),
      ]);
      schoolSupervisorName = schoolSup?.name || '';
      workplaceSupervisorName = workplaceSup?.name || '';
    }

    // Group evaluations by category for performance breakdown
    const evalByCategory = {};
    for (const e of evaluations) {
      const cat = e.category || 'General';
      if (!evalByCategory[cat]) evalByCategory[cat] = [];
      evalByCategory[cat].push({
        score: e.score,
        date: e.createdAt || e.updatedAt || null,
      });
    }

    // Compute category averages
    const categoryBreakdown = Object.entries(evalByCategory).map(([category, scores]) => ({
      category,
      count: scores.length,
      average: Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length),
      scores: scores.sort((a, b) => {
        const dateA = a.date ? new Date(a.date._seconds ? a.date._seconds * 1000 : a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date._seconds ? b.date._seconds * 1000 : b.date).getTime() : 0;
        return dateA - dateB;
      }),
    }));

    // Sort reports by week
    reports.sort((a, b) => (a.week || 0) - (b.week || 0));

    return {
      role: 'student',
      student: {
        company: student?.workplace || '',
        department: student?.department || '',
        progress: calcProgress.progress,
        attendance: calcProgress.attendance,
        studentId: student?.studentId || student?.id || '',
        status: student?.status || 'active',
        year: student?.year || '',
        location: student?.location || '',
        schoolSupervisorName,
        workplaceSupervisorName,
      },
      reports: reports.map((r) => ({
        id: r.id,
        title: r.title,
        content: r.content || '',
        status: r.status,
        week: r.week,
        feedback: r.feedback || '',
        attachments: r.attachments || [],
        submittedAt: _serializeDate(r.submittedAt || r.updatedAt || r.createdAt),
      })),
      evaluations: evaluations.map((e) => ({
        id: e.id,
        period: e.category || (e.evaluationDate ? _serializeDate(e.evaluationDate) : 'Evaluation'),
        score: e.score,
        category: e.category,
        comment: e.comment || '',
        createdAt: _serializeDate(e.createdAt),
      })),
      categoryBreakdown,
      studentDocId,
    };
  }

  static async getStudentsPageData(user) {
    if (user.role === 'school_supervisor' || user.role === 'workplace_supervisor') {
      const students = await StudentsService.getStudentsBySupervisor(user.uid);
      const supName = user.name || user.email || 'Supervisor';

      // Calculate real progress for each student in parallel
      const progressResults = await Promise.all(
        students.map((s) => this._calculateProgress(s.id).catch(() => ({ progress: 0, attendance: 0 })))
      );

      const enriched = students.map((s, i) => ({
        ...s,
        progress: progressResults[i].progress,
        attendance: progressResults[i].attendance,
        schoolSupervisorName: user.role === 'school_supervisor' ? supName : (s.schoolSupervisorName || 'Unassigned'),
        workplaceSupervisorName: user.role === 'workplace_supervisor' ? supName : (s.workplaceSupervisorName || 'Unassigned'),
      }));
      return { role: user.role, students: enriched };
    }
    return { role: user.role, students: [] };
  }

  static async getStudentProgressDetail(studentId) {
    const student = await FirestoreService.getDocument('students', studentId);
    if (!student) return null;

    const [reports, evalSummary, attendanceLogs, calcProgress] = await Promise.all([
      ReportsService.getStudentReports(studentId).catch(() => []),
      EvaluationsService.getPerformanceSummary(studentId).catch(() => ({ totalEvaluations: 0, averageScore: 0, byCategory: {} })),
      FirestoreService.getByField('attendance_logs', 'studentId', studentId).catch(() => []),
      this._calculateProgress(studentId, student.durationWeeks).catch(() => ({ progress: 0, attendance: 0 })),
    ]);

    const reportsByStatus = { draft: 0, submitted: 0, reviewed: 0, approved: 0 };
    reports.forEach((r) => { if (reportsByStatus[r.status] !== undefined) reportsByStatus[r.status]++; });

    const logsSorted = attendanceLogs.sort((a, b) => {
      const da = a.date || '';
      const db = b.date || '';
      return da > db ? -1 : da < db ? 1 : 0;
    });
    const recentLogs = logsSorted.slice(0, 14).map((l) => ({
      date: l.date,
      status: l.status,
      markedByRole: l.markedByRole || '',
    }));

    const presentCount = attendanceLogs.filter((l) => l.status === 'present').length;
    const lateCount = attendanceLogs.filter((l) => l.status === 'late').length;
    const excusedCount = attendanceLogs.filter((l) => l.status === 'excused').length;
    const absentCount = attendanceLogs.filter((l) => l.status === 'absent').length;
    const totalDays = attendanceLogs.length;

    return {
      id: student.id,
      name: student.name,
      studentId: student.studentId,
      department: student.department,
      company: student.company || student.workplace || '',
      status: student.status,
      durationWeeks: student.durationWeeks || 12,
      progress: calcProgress.progress,
      attendance: calcProgress.attendance,
      totalDays,
      presentCount,
      lateCount,
      excusedCount,
      absentCount,
      recentLogs,
      reports: {
        total: reports.length,
        byStatus: reportsByStatus,
      },
      evaluations: {
        total: evalSummary.totalEvaluations,
        averageScore: Math.round(evalSummary.averageScore * 10) / 10,
        byCategory: Object.keys(evalSummary.byCategory).map((cat) => ({
          category: cat,
          average: Math.round(evalSummary.byCategory[cat].average * 10) / 10,
          count: evalSummary.byCategory[cat].scores.length,
        })),
      },
      updatedAt: new Date().toISOString(),
    };
  }

  static _serializeReport(r) {
    return {
      id: r.id,
      title: r.title,
      content: r.content,
      status: r.status,
      week: r.week,
      feedback: r.feedback || r.school_feedback || r.workplace_feedback || '',
      attachments: r.attachments || [],
      student_name: r.student_name || '',
      createdAt: _serializeDate(r.createdAt),
      updatedAt: _serializeDate(r.updatedAt),
      submittedAt: _serializeDate(r.submittedAt),
    };
  }

  static async getReportsPageData(user) {
    if (user.role === 'student') {
      const student = await StudentsService.getStudentByUid(user.uid);
      const reports = student
        ? await ReportsService.getStudentReports(student.id)
        : [];
      return {
        role: user.role,
        studentId: student?.id || null,
        reports: reports.map((r) => this._serializeReport({
          ...r,
          student_name: 'You',
        })),
      };
    }

    if (user.role === 'school_supervisor' || user.role === 'workplace_supervisor') {
      const students = await StudentsService.getStudentsBySupervisor(user.uid);

      if (students.length === 0) {
        return { role: user.role, reports: [] };
      }

      // Parallel fetch reports for all students (N+1 → 1 query per student, in parallel)
      const reportsArrays = await Promise.all(
        students.map((student) =>
          ReportsService.getStudentReports(student.id)
            .then((reports) =>
              reports.map((r) => this._serializeReport({
                ...r,
                student_name: student.name || student.studentId || 'Unknown',
              }))
            )
            .catch(() => [])
        )
      );

      const allReports = reportsArrays.flat();

      return { role: user.role, reports: allReports };
    }

    if (user.role === 'admin') {
      const allReports = await ReportsService.getAllReports();

      // Build student name map for resolving student_name on each report
      const students = await StudentsService.getAllStudents();
      const studentMap = {};
      for (const s of students) {
        studentMap[s.id] = s.name || 'Unknown';
      }

      return {
        role: user.role,
        reports: allReports.map((r) => this._serializeReport({
          ...r,
          student_name: studentMap[r.studentId] || 'Unknown',
        })),
      };
    }

    return { role: user.role, reports: [] };
  }

  static async getSupervisorSummary(user) {
    const students = await StudentsService.getStudentsBySupervisor(user.uid);

    // Fetch reports, evaluations, and calculated progress for each student
    const studentDetails = await Promise.all(students.map(async (student) => {
      const [reports, evaluations, calcProgress] = await Promise.all([
        ReportsService.getStudentReports(student.id).catch(() => []),
        EvaluationsService.getStudentEvaluations(student.id).catch(() => []),
        this._calculateProgress(student.id).catch(() => ({ progress: 0, attendance: 0 })),
      ]);

      const pendingReports = reports.filter(r => r.status === 'submitted' || r.status === 'pending').length;
      // Reports submitted but without feedback yet — needs the supervisor's attention
      const reportsNeedingFeedback = reports.filter(r => (r.status === 'submitted') && !r.feedback).length;
      // Reports that already have feedback
      const reportsWithFeedback = reports.filter(r => r.feedback && r.feedback.length > 0).length;

      const latestEval = evaluations.length > 0
        ? evaluations.reduce((a, b) => new Date(_serializeDate(a.createdAt) || 0) > new Date(_serializeDate(b.createdAt) || 0) ? a : b)
        : null;

      // Collect full report info for the feedback modal (workplace supervisor)
      const reportList = reports.map(r => ({
        id: r.id,
        title: r.title,
        week: r.week,
        status: r.status,
        feedback: r.feedback || '',
        attachments: r.attachments || [],
        submittedAt: _serializeDate(r.submittedAt || r.updatedAt || r.createdAt),
      }));

      return {
        id: student.id,
        name: student.name || 'Unknown',
        department: student.department || '',
        company: student.workplace || '',
        progress: calcProgress.progress,
        attendance: calcProgress.attendance,
        status: student.status || 'active',
        pendingReports,
        reportsNeedingFeedback,
        reportsWithFeedback,
        totalReports: reports.length,
        reportList,
        latestEvalScore: latestEval ? latestEval.score : null,
        latestEvalPeriod: latestEval ? (latestEval.category || _serializeDate(latestEval.createdAt)) : null,
      };
    }));

    const totalStudents = studentDetails.length;
    const totalPendingReports = studentDetails.reduce((sum, s) => sum + s.pendingReports, 0);
    const totalNeedingFeedback = studentDetails.reduce((sum, s) => sum + s.reportsNeedingFeedback, 0);
    const avgAttendance = totalStudents > 0
      ? Math.round(studentDetails.reduce((sum, s) => sum + s.attendance, 0) / totalStudents)
      : 0;
    const avgProgress = totalStudents > 0
      ? Math.round(studentDetails.reduce((sum, s) => sum + s.progress, 0) / totalStudents)
      : 0;
    const scored = studentDetails.filter(s => s.latestEvalScore !== null);
    const avgScore = scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + s.latestEvalScore, 0) / scored.length)
      : 0;

    return {
      role: user.role,
      supervisor: {
        totalStudents,
        totalPendingReports,
        totalNeedingFeedback,
        avgAttendance,
        avgProgress,
        avgScore,
      },
      students: studentDetails,
    };
  }

  static async getAdminSummary(user) {
    const cacheKey = 'admin_summary';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const students = await StudentsService.getAllStudents();
    const [allReports, supervisors] = await Promise.all([
      ReportsService.getAllReports(),
      AuthService.getAllSupervisors(),
    ]);

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;
    const pendingPlacements = students.filter(s => s.status === 'pending' || !s.workplace).length;
    const completedStudents = students.filter(s => s.status === 'completed').length;
    const avgProgress = totalStudents > 0
      ? Math.round(students.reduce((sum, s) => sum + Number(s.evaluationScore ?? s.progress ?? 0), 0) / totalStudents)
      : 0;

    // Build student name map (keyed by student id)
    const studentMap = {};
    for (const s of students) {
      studentMap[s.id] = s.name || 'Unknown';
    }

    // Recent reports with student names
    const recentReports = allReports.slice(0, 8).map(r => ({
      id: r.id,
      title: r.title,
      studentName: studentMap[r.studentId] || 'Unknown',
      status: r.status,
      submittedAt: _serializeDate(r.submittedAt || r.updatedAt || r.createdAt),
      week: r.week || null,
    }));

    // Student funnel: all → placed (has workplace) → active (status=active)
    const placed = students.filter(s => s.workplace).length;
    const pendingReports = allReports.filter(r => r.status === 'submitted').length;
    const totalReports = allReports.length;

    const result = {
      role: 'admin',
      stats: {
        totalStudents,
        activeStudents,
        pendingPlacements,
        completedStudents,
        averageProgress: avgProgress,
        placed,
        pendingReports,
        totalReports,
      },
      supervisors: {
        school: supervisors.schoolSupervisors.length,
        workplace: supervisors.workplaceSupervisors.length,
      },
      recentReports,
      funnel: {
        total: totalStudents,
        placed,
        active: activeStudents,
      },
    };

    setCache(cacheKey, result);
    return result;
  }

  static async getAnalyticsData() {
    const cacheKey = 'analytics_data';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const students = await StudentsService.getAllStudents();
    const [allReports, supervisors] = await Promise.all([
      ReportsService.getAllReports(),
      AuthService.getAllSupervisors(),
    ]);

    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'active').length;
    const pendingPlacements = students.filter(s => s.status === 'pending' || !s.workplace).length;
    const completedStudents = students.filter(s => s.status === 'completed').length;
    const droppedStudents = students.filter(s => s.status === 'dropped').length;

    const avgProgress = totalStudents > 0
      ? Math.round(students.reduce((sum, s) => sum + Number(s.evaluationScore ?? s.progress ?? 0), 0) / totalStudents)
      : 0;

    const avgAttendance = totalStudents > 0
      ? Math.round(students.reduce((sum, s) => sum + Number(s.attendance ?? 0), 0) / totalStudents)
      : 0;

    // Department distribution
    const deptMap = {};
    for (const s of students) {
      const dept = s.department || 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = 0;
      deptMap[dept]++;
    }
    const departmentDistribution = Object.entries(deptMap)
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count);

    // Top placements by company
    const companyMap = {};
    for (const s of students) {
      const company = s.workplace || 'Unassigned';
      if (!companyMap[company]) companyMap[company] = 0;
      companyMap[company]++;
    }
    const topPlacements = Object.entries(companyMap)
      .map(([company, count]) => ({ company, count }))
      .filter(p => p.company !== 'Unassigned')
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Student name map for reports
    const studentMap = {};
    for (const s of students) {
      studentMap[s.id] = s.name || 'Unknown';
    }
    const recentReports = allReports.slice(0, 10).map(r => ({
      id: r.id,
      title: r.title,
      studentName: studentMap[r.studentId] || 'Unknown',
      status: r.status,
      submittedAt: _serializeDate(r.submittedAt || r.updatedAt || r.createdAt),
    }));

    const result = {
      totalStudents,
      activeStudents,
      pendingPlacements,
      completedStudents,
      droppedStudents,
      averageProgress: avgProgress,
      averageAttendance: avgAttendance,
      departmentDistribution,
      topPlacements,
      recentReports,
      totalReports: allReports.length,
      schoolSupervisors: supervisors.schoolSupervisors.length,
      workplaceSupervisors: supervisors.workplaceSupervisors.length,
    };

    setCache(cacheKey, result);
    return result;
  }

  static async getProfileData(user) {
    const profile = {
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber || '',
    };

    if (user.role === 'student') {
      const student = await StudentsService.getStudentByUid(user.uid);
      if (student) {
        profile.student = {
          id: student.id,
          department: student.department || '',
          company: student.workplace || '',
          progress: Math.round(Number(student.evaluationScore ?? student.progress ?? 0) || 0),
          attendance: student.attendance ?? 0,
          studentId: student.studentId || '',
        };
      }
    }

    return profile;
  }
}

module.exports = DashboardService;
