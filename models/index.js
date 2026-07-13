// User Model
class User {
  constructor(data = {}) {
    this.uid = data.uid || '';
    this.email = data.email || '';
    this.name = data.name || '';
    this.role = data.role || 'student'; // admin, school_supervisor, workplace_supervisor, student
    this.active = data.active !== undefined ? data.active : true;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this.phoneNumber = data.phoneNumber || '';
    this.profilePicture = data.profilePicture || '';
  }

  toObject() {
    return {
      uid: this.uid,
      email: this.email,
      name: this.name,
      role: this.role,
      active: this.active,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      phoneNumber: this.phoneNumber,
      profilePicture: this.profilePicture,
    };
  }
}

// Student Model
class Student {
  constructor(data = {}) {
    this.uid = data.uid || '';
    this.studentId = data.studentId || '';
    this.name = data.name || '';
    this.email = data.email || '';
    this.department = data.department || '';
    this.yearOfStudy = data.yearOfStudy || '';
    this.phone = data.phone || '';
    this.workplace = data.workplace || '';
    this.location = data.location || '';
    this.schoolSupervisor = data.schoolSupervisor || '';
    this.workplaceSupervisor = data.workplaceSupervisor || '';
    this.supervisor = data.supervisor || ''; // kept for backward compat
    this.startDate = data.startDate || '';
    this.endDate = data.endDate || '';
    this.durationWeeks = data.durationWeeks || 12;
    this.status = data.status || 'active'; // active, completed, dropped
    this.evaluationScore = data.evaluationScore || 0;
    this.attendance = data.attendance != null ? data.attendance : 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toObject() {
    return {
      uid: this.uid,
      studentId: this.studentId,
      name: this.name,
      email: this.email,
      department: this.department,
      yearOfStudy: this.yearOfStudy,
      phone: this.phone,
      workplace: this.workplace,
      location: this.location,
      schoolSupervisor: this.schoolSupervisor,
      workplaceSupervisor: this.workplaceSupervisor,
      supervisor: this.supervisor,
      startDate: this.startDate,
      endDate: this.endDate,
      durationWeeks: this.durationWeeks,
      status: this.status,
      evaluationScore: this.evaluationScore,
      attendance: this.attendance,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// Report Model
class Report {
  constructor(data = {}) {
    this.id = data.id || '';
    this.studentId = data.studentId || '';
    this.title = data.title || '';
    this.content = data.content || '';
    this.week = data.week || 0;
    this.status = data.status || 'draft'; // draft, submitted, reviewed
    this.feedback = data.feedback || '';
    this.attachments = data.attachments || []; // [{ url, name, type, size }]
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toObject() {
    return {
      id: this.id,
      studentId: this.studentId,
      title: this.title,
      content: this.content,
      week: this.week,
      status: this.status,
      feedback: this.feedback,
      attachments: this.attachments,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

// Evaluation Model
class Evaluation {
  constructor(data = {}) {
    this.id = data.id || '';
    this.studentId = data.studentId || '';
    this.supervisorId = data.supervisorId || '';
    this.score = data.score || 0;
    this.comment = data.comment || '';
    this.evaluationDate = data.evaluationDate || new Date();
    this.category = data.category || ''; // technical, soft_skills, work_ethic, etc.
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toObject() {
    return {
      id: this.id,
      studentId: this.studentId,
      supervisorId: this.supervisorId,
      score: this.score,
      comment: this.comment,
      evaluationDate: this.evaluationDate,
      category: this.category,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = {
  User,
  Student,
  Report,
  Evaluation,
};
