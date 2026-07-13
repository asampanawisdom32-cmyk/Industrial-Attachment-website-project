var loadWhenReady = window.IaApi.loadWhenReady;
var escapeHtml = window.IaApi.escapeHtml;

function getRoleBadgeClass(page) {
  return page === 'school-supervisor-dashboard' ? 'role-badge-school' : 'role-badge-workplace';
}

function getRoleIcon(page) {
  return page === 'school-supervisor-dashboard'
    ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>'
    : '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>';
}

function getRoleInitial(page) {
  return page === 'school-supervisor-dashboard' ? 'S' : 'W';
}

function getScoreColor(score) {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#1A6B8A';
  if (score >= 40) return '#d97706';
  return '#dc2626';
}

function getStatusBadge(status) {
  switch (status) {
    case 'active': return '<span class="badge badge-blue">Active</span>';
    case 'completed': return '<span class="badge badge-green">Completed</span>';
    case 'pending': return '<span class="badge badge-yellow">Pending</span>';
    case 'dropped': return '<span class="badge badge-red">Dropped</span>';
    default: return '<span class="text-muted">' + escapeHtml(status) + '</span>';
  }
}

function getStatusReportBadge(status) {
  switch (status) {
    case 'draft': return 'badge';
    case 'submitted': return 'badge badge-blue';
    case 'reviewed': return 'badge badge-green';
    case 'approved': return 'badge badge-green';
    default: return 'badge';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'draft': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    case 'submitted': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>';
    case 'reviewed':
    case 'approved': return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    default: return '';
  }
}

function renderStatusBadge(status) {
  var icon = getStatusIcon(status);
  var cls = getStatusReportBadge(status);
  return '<span class="' + cls + '">' + icon + ' ' + escapeHtml(status) + '</span>';
}

var evaluationCategories = [
  { value: 'technical', label: 'Technical Skills' },
  { value: 'soft_skills', label: 'Soft Skills' },
  { value: 'work_ethic', label: 'Work Ethic' },
  { value: 'communication', label: 'Communication' },
  { value: 'teamwork', label: 'Teamwork' },
  { value: 'problem_solving', label: 'Problem Solving' },
  { value: 'punctuality', label: 'Attendance & Punctuality' },
  { value: 'overall', label: 'Overall Performance' },
];

function animateCounters() {
  var counters = document.querySelectorAll('.stat-value-anim');
  counters.forEach(function(el) {
    var target = parseFloat(el.getAttribute('data-target'));
    if (isNaN(target)) return;
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1200;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(eased * target);
      el.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target + suffix;
      }
    }
    requestAnimationFrame(step);
  });
}

function statCard(value, label, accentClass, iconSvg, delayClass) {
  delayClass = delayClass || 'animate-in-d1';
  return '<div class="stat-card-ring ' + accentClass + ' animate-in ' + delayClass + '">' +
    '<div class="stat-icon" style="background:none;padding:0">' +
      iconSvg +
    '</div>' +
    '<div class="stat-card-ring-body">' +
      '<div class="stat-value-anim" data-target="' + value + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + escapeHtml(String(value)) + '</div>' +
      '<div class="stat-card-ring-label" style="font-size:0.9rem;margin:2px 0 0">' + escapeHtml(label) + '</div>' +
    '</div>' +
  '</div>';
}

async function loadSupervisorDashboard() {
  var root = document.querySelector('[data-page-root]');
  if (!root) return;
  try {

  var page = document.body.dataset.page;
  var isSchool = page === 'school-supervisor-dashboard';
  var isWorkplace = page === 'workplace-supervisor-dashboard';
  var roleLabel = isSchool ? 'School Supervisor' : 'Workplace Supervisor';
  var badgeClass = getRoleBadgeClass(page);
  var roleInitial = getRoleInitial(page);
  var iconSvg = getRoleIcon(page);

  window.IaApi.showSkeleton(root, page);

  var result = await window.IaApi.apiFetch('/api/dashboard/summary') || {};
  var { summary } = result;
  var sup = summary.supervisor || {};
  var students = summary.students || [];
  var user = window.IaApi.getStoredUser();
  var userName = user && user.name ? user.name : roleLabel;

  var hour = new Date().getHours();
  var greeting = hour < 12 ? 'Good morning' : (hour < 18 ? 'Good afternoon' : 'Good evening');

  var showScoreColumn = isSchool;
  var showEvaluateButton = isSchool;
  var showReportsColumn = isWorkplace;
  var showNeedsFeedbackColumn = isWorkplace;
  var showFeedbackButton = isSchool || isWorkplace;

  var totalStudents = sup.totalStudents || 0;
  var pendingReports = sup.totalPendingReports || 0;
  var avgAttendance = sup.avgAttendance || 0;
  var avgScore = sup.avgScore || 0;
  var needingFeedback = sup.totalNeedingFeedback || 0;

  var statIcons = {
    students: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    pending: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    attendance: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    score: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    feedback: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  };

  var statsHtml =
    '<div class="grid grid-4">' +
      statCard(totalStudents, 'Total Students', 'stat-card-accent-students', statIcons.students, 'animate-in-d1') +
      statCard(pendingReports, 'Pending Reports', 'stat-card-accent-feedback', statIcons.pending, 'animate-in-d2') +
      statCard(avgAttendance, 'Avg Attendance', 'stat-card-accent-attendance', statIcons.attendance, 'animate-in-d3') +
      (isSchool
        ? statCard(avgScore, 'Avg Score', 'stat-card-accent-evaluations', statIcons.score, 'animate-in-d4')
        : statCard(needingFeedback, 'Needs Feedback', 'stat-card-accent-feedback', statIcons.feedback, 'animate-in-d4')) +
    '</div>';

  var headerCols = ['Student', 'Department', 'Company', 'Status'];
  if (showScoreColumn) headerCols.push('Progress', 'Score');
  if (showReportsColumn) headerCols.push('Reports');
  if (showNeedsFeedbackColumn) headerCols.push('Needs Feedback');
  headerCols.push('Attendance');
  headerCols.push('Actions');

  var colspan = headerCols.length;

  var tableRows = students.length === 0
    ? '<tr><td colspan="' + colspan + '" class="text-muted empty-row">No students assigned to you yet.</td></tr>'
    : students.map(function(s) {
        var cells = '';

        cells += '<td><strong>' + escapeHtml(s.name) + '</strong></td>' +
          '<td>' + escapeHtml(s.department || '&mdash;') + '</td>' +
          '<td>' + escapeHtml(s.company || '&mdash;') + '</td>' +
          '<td>' + getStatusBadge(s.status) + '</td>';

        if (isSchool) {
          var score = s.latestEvalScore;
          var scoreDisplay = score !== null
            ? '<span class="score-value" style="color:' + getScoreColor(score) + '">' + score + '%</span>'
            : '<span class="text-muted">&mdash;</span>';

          cells += '<td>' +
            '<div class="progress-cell">' +
              '<div class="progress-bar"><div class="progress-fill" style="width:' + (s.progress || 0) + '%"></div></div>' +
              '<span class="progress-cell-text">' + (s.progress || 0) + '%</span>' +
            '</div>' +
          '</td>' +
          '<td>' + scoreDisplay + '</td>';
        }

        if (isWorkplace) {
          cells += '<td>' + (s.totalReports > 0 ? s.totalReports : '<span class="text-muted">0</span>') + '</td>' +
            '<td>' +
              (s.reportsNeedingFeedback > 0
                ? '<span class="badge badge-yellow">' + s.reportsNeedingFeedback + '</span>'
                : (s.totalReports > 0 ? '<span class="badge badge-green"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' : '<span class="text-muted">&mdash;</span>')) +
            '</td>';
        }

        cells += '<td>' +
          '<div class="progress-cell">' +
            '<div class="progress-bar"><div class="progress-fill progress-fill-green" style="width:' + (s.attendance || 0) + '%"></div></div>' +
            '<span class="progress-cell-text">' + (s.attendance || 0) + '%</span>' +
          '</div>' +
        '</td>';

        cells += '<td>';
        if (showFeedbackButton) {
          cells += '<button class="btn btn-sm btn-secondary" data-feedback-id="' + escapeHtml(s.id) + '" data-feedback-name="' + escapeHtml(s.name) + '">Feedback</button> ';
        }
        if (showEvaluateButton) {
          cells += '<button class="btn btn-sm btn-secondary" data-eval-id="' + escapeHtml(s.id) + '" data-eval-name="' + escapeHtml(s.name) + '">Evaluate</button> ';
        }
        if (isWorkplace) {
          cells += '<button class="btn btn-sm btn-secondary" data-attendance-id="' + escapeHtml(s.id) + '" data-attendance-name="' + escapeHtml(s.name) + '">Attend</button>';
        }
        cells += '</td>';

        return '<tr>' + cells + '</tr>';
      }).join('');

  var tableHtml = students.length > 0
    ? '<div class="table-wrap"><table class="table">' +
        '<thead><tr>' + headerCols.map(function(h) { return '<th>' + escapeHtml(h) + '</th>'; }).join('') + '</tr></thead>' +
        '<tbody>' + tableRows + '</tbody>' +
      '</table></div>'
    : '<div class="empty-state"><div class="empty-state-icon">' +
      '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
      '</div><p class="text-muted">' + tableRows + '</p></div>';

  var dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  root.innerHTML =
    '<div class="hero animate-in">' +
      '<button class="hero-action-btn" id="sidebar-toggle" aria-label="Toggle sidebar">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
      '</button>' +
      '<div style="position:relative">' +
        '<button class="hero-action-btn" id="notification-btn" aria-label="Notifications">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
          '<span class="notification-dot" id="notification-dot"></span>' +
        '</button>' +
        '<div class="notification-dropdown" id="notification-dropdown" hidden>' +
          '<div class="notification-dropdown-header"><h4>Notifications</h4><button class="notification-mark-read" id="notification-mark-all">Mark all read</button></div>' +
          '<div class="notification-list" id="notification-list"></div>' +
        '</div>' +
      '</div>' +
      '<div class="hero-content">' +
        '<div class="hero-avatar">' + roleInitial + '</div>' +
        '<div class="hero-greeting">' +
          '<h2>' + greeting + ', ' + escapeHtml(userName.split(' ')[0]) + '</h2>' +
          '<p>' + roleLabel + ' Dashboard' +
            (students.length > 0
              ? ' &bull; <strong>' + students.length + '</strong> student(s) assigned'
              : ' &bull; No students assigned yet') +
          '</p>' +
        '</div>' +
        '<div class="hero-badge">' + roleLabel + '</div>' +
        '<span class="hero-date">' + dateStr + '</span>' +
      '</div>' +
    '</div>' +

    statsHtml +

    '<div class="card animate-in">' +
      '<div class="card-title">My Students</div>' +
      '<div class="search-input">' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '<input type="text" id="student-search-input" placeholder="Filter students by name, department, or company&hellip;" />' +
      '</div>' +
      tableHtml +
    '</div>' +

    '<div class="card animate-in-d3">' +
      '<div class="card-title">Quick Links</div>' +
      '<div class="quick-links">' +
        '<a href="/students" class="quick-link">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' +
          'View All Students' +
        '</a>' +
        '<a href="/reports" class="quick-link">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
          'Review Student Reports' +
        '</a>' +
        '<a href="/profile" class="quick-link">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
          'My Profile' +
        '</a>' +
      '</div>' +
    '</div>' +

    (isSchool || isWorkplace ? '' +
    '<div id="feedback-modal" class="modal-overlay" hidden>' +
      '<div class="modal modal-wide">' +
        '<div class="modal-header">' +
          '<h3>Reports &amp; Feedback &mdash; <span id="feedback-student-name"></span></h3>' +
          '<button class="modal-close" id="feedback-modal-close">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="modal-body" id="feedback-modal-body">' +
          '<p class="text-muted" id="feedback-loading">Loading reports&hellip;</p>' +
          '<div id="feedback-reports-wrap" hidden></div>' +
        '</div>' +
      '</div>' +
    '</div>' : '') +

    (isSchool ? '' +
    '<div id="evaluation-modal" class="modal-overlay" hidden>' +
      '<div class="modal modal-wide">' +
        '<div class="modal-header">' +
          '<h3>Evaluate: <span id="eval-student-name"></span></h3>' +
          '<button class="modal-close" id="eval-modal-close">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="modal-body" id="eval-modal-body">' +
          '<p class="text-muted" id="eval-loading">Loading evaluation history&hellip;</p>' +
          '<div id="eval-history-wrap" hidden></div>' +
          '<hr />' +
          '<h4>New Evaluation</h4>' +
          '<form id="eval-form">' +
            '<div class="form-group">' +
              '<label for="eval-category">Category</label>' +
              '<select id="eval-category" class="form-select" required>' +
                evaluationCategories.map(function(c) {
                  return '<option value="' + c.value + '">' + escapeHtml(c.label) + '</option>';
                }).join('') +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label for="eval-score">Score: <strong id="eval-score-display">75</strong>%</label>' +
              '<input type="range" id="eval-score" min="0" max="100" value="75" step="1" />' +
              '<div class="range-labels"><span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span></div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label for="eval-comment">Comment (optional)</label>' +
              '<textarea id="eval-comment" class="textarea" rows="3" placeholder="Provide feedback on this student&rsquo;s performance&hellip;"></textarea>' +
            '</div>' +
            '<div class="form-actions">' +
              '<button class="btn btn-primary" type="submit" id="eval-submit-btn">Submit Evaluation</button>' +
            '</div>' +
            '<p id="eval-form-msg" class="text-muted" hidden></p>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>' : '') +

    (isWorkplace ? '' +
    '<div id="attendance-modal" class="modal-overlay" hidden>' +
      '<div class="modal" style="max-width:520px">' +
        '<div class="modal-header">' +
          '<h3>Attendance &mdash; <span id="attendance-student-name"></span></h3>' +
          '<button class="modal-close" id="attendance-modal-close">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="modal-body">' +
          '<div id="attendance-today-box" style="margin-bottom:16px"></div>' +
          '<label style="font-weight:600;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:8px;display:block">Mark Attendance</label>' +
          '<div class="attendance-options" style="margin-bottom:16px">' +
            '<button class="btn btn-sm btn-attendance" data-attendance-value="present">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Present' +
            '</button>' +
            '<button class="btn btn-sm btn-attendance" data-attendance-value="absent">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Absent' +
            '</button>' +
            '<button class="btn btn-sm btn-attendance" data-attendance-value="late">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Late' +
            '</button>' +
            '<button class="btn btn-sm btn-attendance" data-attendance-value="excused">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> Excused' +
            '</button>' +
          '</div>' +
          '<div style="font-weight:600;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:8px">Recent 14 Days</div>' +
          '<div id="attendance-grid" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div>' +
          '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280"><span style="width:10px;height:10px;border-radius:50%;background:#d1fae5;border:1px solid #a7f3d0;display:inline-block"></span>Present</span>' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280"><span style="width:10px;height:10px;border-radius:50%;background:#fee2e2;border:1px solid #fecaca;display:inline-block"></span>Absent</span>' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280"><span style="width:10px;height:10px;border-radius:50%;background:#fef3c7;border:1px solid #fde68a;display:inline-block"></span>Late</span>' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280"><span style="width:10px;height:10px;border-radius:50%;background:#e5efff;border:1px solid #bfdbfe;display:inline-block"></span>Excused</span>' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280"><span style="width:10px;height:10px;border-radius:50%;background:#f3f4f6;border:1px solid #d1d5db;display:inline-block"></span>Not marked</span>' +
          '</div>' +
          '<p id="attendance-modal-msg" class="text-muted" hidden></p>' +
        '</div>' +
        '<div class="modal-footer">' +
          '<button class="btn btn-secondary" id="attendance-cancel-btn">Close</button>' +
        '</div>' +
      '</div>' +
    '</div>' : '');

  // Re-bind sidebar toggle (button rendered by JS)
  var tb = document.getElementById('sidebar-toggle');
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.querySelector('.sidebar-overlay');
  if (tb && sidebar) {
    function isMobile() { return window.innerWidth <= 1024; }
    var scrollPos = 0;
    function setSidebarOpen(isOpen) {
      if (isMobile() && isOpen) {
        scrollPos = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = -scrollPos + 'px';
        document.body.style.width = '100%';
      } else {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollPos);
      }
      sidebar.classList.toggle('open', isOpen);
      if (overlay) overlay.classList.toggle('active', isOpen);
    }
    tb.addEventListener('click', function (e) {
      e.stopPropagation();
      if (isMobile()) {
        setSidebarOpen(!sidebar.classList.contains('open'));
      } else {
        sidebar.classList.toggle('sidebar-collapsed');
        document.body.classList.toggle('sidebar-collapsed', sidebar.classList.contains('sidebar-collapsed'));
        try { localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('sidebar-collapsed')); } catch (_) {}
      }
    });
    if (overlay) {
      overlay.addEventListener('click', function () { setSidebarOpen(false); });
    }
    sidebar.querySelectorAll('.nav-item').forEach(function (item) {
      item.addEventListener('click', function () { if (isMobile()) setSidebarOpen(false); });
    });
  }

  setTimeout(function() { animateCounters(); }, 100);

  var searchInput = document.getElementById('student-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', function() {
      var q = this.value.toLowerCase();
      var rows = document.querySelectorAll('.table tbody tr');
      rows.forEach(function(row) {
        var text = row.textContent.toLowerCase();
        row.style.display = text.indexOf(q) > -1 ? '' : 'none';
      });
    });
  }

  if (isSchool || isWorkplace) {
    var feedbackModal = document.getElementById('feedback-modal');
    var feedbackStudentName = document.getElementById('feedback-student-name');
    var feedbackCloseBtn = document.getElementById('feedback-modal-close');
    var feedbackLoading = document.getElementById('feedback-loading');
    var feedbackReportsWrap = document.getElementById('feedback-reports-wrap');
    var currentFeedbackStudentId = null;

    function openFeedbackModal(studentId, studentName) {
      currentFeedbackStudentId = studentId;
      if (feedbackStudentName) feedbackStudentName.textContent = studentName;
      if (feedbackLoading) feedbackLoading.hidden = false;
      if (feedbackReportsWrap) { feedbackReportsWrap.hidden = true; feedbackReportsWrap.innerHTML = ''; }
      if (feedbackModal) feedbackModal.hidden = false;
      loadStudentReportsForFeedback(studentId);
    }

    function closeFeedbackModal() {
      if (feedbackModal) feedbackModal.hidden = true;
      currentFeedbackStudentId = null;
    }

    async function loadStudentReportsForFeedback(studentId) {
      try {
        var st = (summary.students || []).find(function(s) { return s.id === studentId; });
        var reports = (st && st.reportList) || [];

        if (feedbackLoading) feedbackLoading.hidden = true;

        if (reports.length === 0) {
          if (feedbackReportsWrap) {
            feedbackReportsWrap.innerHTML = '<p class="text-muted">No reports submitted yet by this student.</p>';
            feedbackReportsWrap.hidden = false;
          }
          return;
        }

        reports.sort(function(a, b) {
          return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
        });

        var html = '<div class="feedback-summary">' +
          '<strong>' + reports.length + '</strong> report(s) total. ' +
          'Click <strong>Add Feedback</strong> on submitted reports to review.</div>';

        reports.forEach(function(r, idx) {
          var dateStr = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '&mdash;';
          var canAddFeedback = r.status === 'submitted';
          var rId = escapeHtml(r.id);

          html += '<div class="card feedback-report-card" data-report-id="' + rId + '">';

          html += '<div class="feedback-report-header">' +
            '<div><strong>' + escapeHtml(r.title || 'Untitled') + '</strong>' +
            ' <span class="text-muted">&mdash; Week ' + (r.week || '&mdash;') + '</span></div>' +
            '<div>' + renderStatusBadge(r.status) + '</div>' +
          '</div>';

          html += '<div class="text-muted feedback-report-date">' + dateStr + '</div>';

          if (r.feedback && r.feedback.length > 0) {
            html += '<div class="feedback-existing">' +
              '<strong>Your feedback:</strong> ' + escapeHtml(r.feedback) +
            '</div>';
          }

          if (canAddFeedback) {
            html += '<div class="feedback-form-' + rId + '">' +
              '<textarea class="textarea" data-report-id="' + rId + '" rows="2" placeholder="Write your feedback for this report&hellip;">' +
              (r.feedback ? escapeHtml(r.feedback) : '') + '</textarea>' +
              '<button class="btn btn-sm btn-primary feedback-submit-btn" data-report-id="' + rId + '">Submit Feedback</button>' +
              '<span class="feedback-msg-' + rId + '" hidden></span>' +
            '</div>';
          }

          html += '</div>';
        });

        if (feedbackReportsWrap) {
          feedbackReportsWrap.innerHTML = html;
          feedbackReportsWrap.hidden = false;
        }

        document.querySelectorAll('.feedback-submit-btn').forEach(function(btn) {
          btn.addEventListener('click', async function(e) {
            e.stopPropagation();
            try {
              var reportId = this.dataset.reportId;
              var textarea = document.querySelector('.textarea[data-report-id="' + reportId + '"]');
              var msgEl = document.querySelector('.feedback-msg-' + reportId);
              var feedbackText = textarea ? textarea.value.trim() : '';

              if (!feedbackText) {
                if (msgEl) { msgEl.hidden = false; msgEl.textContent = 'Please enter feedback.'; }
                return;
              }

              this.disabled = true;
              if (msgEl) { msgEl.hidden = false; msgEl.textContent = 'Saving&hellip;'; }

              try {
                await window.IaApi.apiFetch('/api/reports/' + reportId + '/feedback', {
                  method: 'PUT',
                  body: { feedback: feedbackText },
                });
                window.IaApi.showToast('Feedback saved!', 'success');
                await loadStudentReportsForFeedback(currentFeedbackStudentId);
                await loadSupervisorDashboard();
              } catch (err) {
                window.IaApi.showToast(err.message || 'Failed to save feedback.', 'error');
                if (msgEl) msgEl.textContent = err.message || 'Failed to save.';
                this.disabled = false;
              }
            } catch (err) {
              console.error('Feedback submit handler error:', err);
              window.IaApi.showToast(err && err.message || 'Unexpected error.', 'error');
              this.disabled = false;
            }
          });
        });
      } catch (err) {
        console.error('Failed to load reports for feedback:', err);
        if (feedbackLoading) feedbackLoading.textContent = 'Failed to load reports.';
      }
    }

    document.querySelectorAll('[data-feedback-id]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openFeedbackModal(this.dataset.feedbackId, this.dataset.feedbackName);
      });
    });

    if (feedbackCloseBtn) feedbackCloseBtn.addEventListener('click', closeFeedbackModal);
    if (feedbackModal) {
      feedbackModal.addEventListener('click', function(e) {
        if (e.target === feedbackModal) closeFeedbackModal();
      });
    }
  }

  if (isSchool) {
    var evalModal = document.getElementById('evaluation-modal');
    var evalStudentName = document.getElementById('eval-student-name');
    var evalCloseBtn = document.getElementById('eval-modal-close');
    var evalLoading = document.getElementById('eval-loading');
    var evalHistoryWrap = document.getElementById('eval-history-wrap');
    var evalForm = document.getElementById('eval-form');
    var evalScoreInput = document.getElementById('eval-score');
    var evalScoreDisplay = document.getElementById('eval-score-display');
    var evalCategory = document.getElementById('eval-category');
    var evalComment = document.getElementById('eval-comment');
    var evalSubmitBtn = document.getElementById('eval-submit-btn');
    var evalFormMsg = document.getElementById('eval-form-msg');
    var currentEvalStudentId = null;

    if (evalScoreInput && evalScoreDisplay) {
      evalScoreInput.addEventListener('input', function() {
        evalScoreDisplay.textContent = this.value;
      });
    }

    function openEvalModal(studentId, studentName) {
      currentEvalStudentId = studentId;
      if (evalStudentName) evalStudentName.textContent = studentName;
      if (evalForm) evalForm.reset();
      if (evalScoreInput) evalScoreInput.value = 75;
      if (evalScoreDisplay) evalScoreDisplay.textContent = '75';
      if (evalFormMsg) { evalFormMsg.hidden = true; evalFormMsg.textContent = ''; }
      if (evalHistoryWrap) evalHistoryWrap.hidden = true;
      if (evalLoading) evalLoading.hidden = false;
      if (evalModal) evalModal.hidden = false;
      loadEvalHistory(studentId);
    }

    function closeEvalModal() {
      if (evalModal) evalModal.hidden = true;
      currentEvalStudentId = null;
    }

    async function loadEvalHistory(studentId) {
      try {
        var data = await window.IaApi.apiFetch('/api/evaluations/student/' + studentId);
        var evals = data.evaluations || [];
        if (evalLoading) evalLoading.hidden = true;

        if (evals.length === 0) {
          if (evalHistoryWrap) {
            evalHistoryWrap.innerHTML = '<p class="text-muted">No evaluations recorded yet.</p>';
            evalHistoryWrap.hidden = false;
          }
          return;
        }

        var avgScore = Math.round(evals.reduce(function(sum, e) { return sum + (e.score || 0); }, 0) / evals.length);

        var historyHtml =
          '<div class="eval-history-header">' +
            '<h4>Evaluation History</h4>' +
            '<span class="eval-avg">Avg: <strong style="color:' + getScoreColor(avgScore) + '">' + avgScore + '%</strong></span>' +
          '</div>' +
          '<div class="evaluations-list">';

        evals.sort(function(a, b) {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        });

        evals.forEach(function(e) {
          var catLabel = e.category ? e.category.replace(/_/g, ' ') : 'General';
          var dateStr = e.evaluationDate ? new Date(e.evaluationDate).toLocaleDateString() : (e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '&mdash;');
          var commentText = e.comment ? '<p class="eval-comment">' + escapeHtml(e.comment) + '</p>' : '';

          historyHtml +=
            '<div class="eval-row">' +
              '<div class="eval-row-top">' +
                '<div>' +
                  '<strong>' + escapeHtml(catLabel) + '</strong>' +
                  '<span class="eval-period"> &middot; ' + dateStr + '</span>' +
                '</div>' +
                '<div class="eval-score" style="color:' + getScoreColor(e.score) + '">' + e.score + '%</div>' +
              '</div>' +
              commentText +
            '</div>';
        });

        historyHtml += '</div>';

        if (evalHistoryWrap) {
          evalHistoryWrap.innerHTML = historyHtml;
          evalHistoryWrap.hidden = false;
        }
      } catch (err) {
        console.error('Failed to load evaluation history:', err);
        if (evalLoading) evalLoading.textContent = 'Failed to load evaluation history.';
      }
    }

    document.querySelectorAll('[data-eval-id]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openEvalModal(this.dataset.evalId, this.dataset.evalName);
      });
    });

    if (evalCloseBtn) evalCloseBtn.addEventListener('click', closeEvalModal);
    if (evalModal) {
      evalModal.addEventListener('click', function(e) {
        if (e.target === evalModal) closeEvalModal();
      });
    }

    if (evalForm) {
      evalForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (!currentEvalStudentId) return;

          var score = parseInt(evalScoreInput ? evalScoreInput.value : '75', 10);
          var category = evalCategory ? evalCategory.value : 'overall';
          var comment = evalComment ? evalComment.value : '';

          if (evalSubmitBtn) evalSubmitBtn.disabled = true;
          if (evalFormMsg) { evalFormMsg.hidden = true; evalFormMsg.textContent = ''; }

          try {
            await window.IaApi.apiFetch('/api/evaluations', {
              method: 'POST',
              body: {
                studentId: currentEvalStudentId,
                supervisorId: '__self__',
                score: score,
                comment: comment,
                category: category,
              },
            });
            window.IaApi.showToast('Evaluation submitted!', 'success');
            if (evalFormMsg) {
              evalFormMsg.hidden = false;
              evalFormMsg.textContent = 'Evaluation recorded successfully.';
            }
            await loadEvalHistory(currentEvalStudentId);
            await loadSupervisorDashboard();
          } catch (err) {
            window.IaApi.showToast(err.message || 'Failed to submit evaluation.', 'error');
            if (evalFormMsg) {
              evalFormMsg.hidden = false;
              evalFormMsg.textContent = err.message || 'Failed to submit evaluation.';
            }
            if (evalSubmitBtn) evalSubmitBtn.disabled = false;
          }
        } catch (err) {
          console.error('Evaluation submit handler error:', err);
          window.IaApi.showToast(err && err.message || 'Unexpected error.', 'error');
          if (evalSubmitBtn) evalSubmitBtn.disabled = false;
        }
      });
    }
  }

  if (isWorkplace) {
  var modal = document.getElementById('attendance-modal');
  var modalName = document.getElementById('attendance-student-name');
  var modalMsg = document.getElementById('attendance-modal-msg');
  var closeBtn = document.getElementById('attendance-modal-close');
  var cancelBtn = document.getElementById('attendance-cancel-btn');
  var todayBox = document.getElementById('attendance-today-box');
  var attGrid = document.getElementById('attendance-grid');
  var currentStudentId = null;

  var ATT_STATUS_COLORS = {
    present: { bg: '#d1fae5', border: '#a7f3d0', color: '#059669', label: 'Present' },
    absent:  { bg: '#fee2e2', border: '#fecaca', color: '#dc2626', label: 'Absent' },
    late:    { bg: '#fef3c7', border: '#fde68a', color: '#d97706', label: 'Late' },
    excused: { bg: '#e5efff', border: '#bfdbfe', color: '#1A6B8A', label: 'Excused' },
  };

  function getTodayStr() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function formatDateShort(dateStr) {
    var parts = dateStr.split('-');
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
  }

  function renderSupAttGrid(logs) {
    if (!attGrid) return;
    attGrid.innerHTML = '';
    var today = getTodayStr();
    for (var i = 13; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var day = String(d.getDate()).padStart(2, '0');
      var dateStr = d.getFullYear() + '-' + m + '-' + day;
      var log = logs.find(function(l) { return l.date === dateStr; });
      var status = log ? log.status : null;
      var sc = status ? ATT_STATUS_COLORS[status] : null;
      var isToday = dateStr === today;
      var chip = document.createElement('div');
      chip.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:2px;min-width:30px';
      var dot = document.createElement('div');
      dot.style.cssText = 'width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700';
      if (sc) { dot.style.background = sc.bg; dot.style.border = '2px solid ' + sc.border; dot.style.color = sc.color; dot.textContent = status === 'present' ? '\u2713' : status === 'absent' ? '\u2717' : status === 'late' ? '\u23F1' : '\u24D8'; }
      else { dot.style.background = '#f3f4f6'; dot.style.border = '2px solid #d1d5db'; dot.style.color = '#9ca3af'; dot.textContent = '\u2014'; }
      var label = document.createElement('span');
      label.style.cssText = 'font-size:9px;color:#9ca3af;line-height:1';
      label.textContent = formatDateShort(dateStr);
      if (isToday) { chip.style.outline = '2px solid #2563eb'; chip.style.outlineOffset = '2px'; chip.style.borderRadius = '8px'; }
      chip.appendChild(dot); chip.appendChild(label); attGrid.appendChild(chip);
    }
  }

  function renderSupTodayStatus(logs) {
    if (!todayBox) return;
    var today = getTodayStr();
    var todayLog = logs.find(function(l) { return l.date === today; });
    if (todayLog) {
      var sc = ATT_STATUS_COLORS[todayLog.status] || {};
      todayBox.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:' + (sc.bg || '#f3f4f6') + ';border:1px solid ' + (sc.border || '#d1d5db') + ';border-radius:8px"><span style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;background:' + (sc.bg || '#f3f4f6') + ';color:' + (sc.color || '#6b7280') + ';border:2px solid ' + (sc.border || '#d1d5db') + '">' + (todayLog.status === 'present' ? '\u2713' : todayLog.status === 'absent' ? '\u2717' : todayLog.status === 'late' ? '\u23F1' : '\u24D8') + '</span><div><div style="font-weight:600;font-size:0.85rem;color:' + (sc.color || '#374151') + '">Today: ' + (sc.label || todayLog.status) + '</div><div style="font-size:0.75rem;color:#6b7280">Already marked \u2014 click a button to update</div></div></div>';
    } else {
      todayBox.innerHTML = '<div style="padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px"><div style="font-weight:600;font-size:0.85rem;color:#92400e">Not yet marked today</div><div style="font-size:0.75rem;color:#6b7280">Select a status below to mark attendance</div></div>';
    }
  }

  async function openAttendanceModal(studentId, studentName) {
    currentStudentId = studentId;
    if (modalName) modalName.textContent = studentName;
    if (modalMsg) { modalMsg.hidden = true; modalMsg.textContent = ''; }
    if (attGrid) attGrid.innerHTML = '<span style="font-size:12px;color:#9ca3af">Loading...</span>';
    if (todayBox) todayBox.innerHTML = '';
    if (modal) modal.hidden = false;
    try {
      var data = await window.IaApi.apiFetch('/api/students/' + studentId + '/attendance-logs');
      var logs = data.logs || [];
      renderSupTodayStatus(logs);
      renderSupAttGrid(logs);
    } catch (err) {
      if (attGrid) attGrid.innerHTML = '<span style="font-size:12px;color:#dc2626">Failed to load history</span>';
    }
  }

  function closeAttendanceModal() {
    if (modal) modal.hidden = true;
    currentStudentId = null;
  }

  document.querySelectorAll('[data-attendance-id]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      openAttendanceModal(this.dataset.attendanceId, this.dataset.attendanceName);
    });
  });

  document.querySelectorAll('.btn-attendance').forEach(function(btn) {
    btn.addEventListener('click', async function() {
      if (!currentStudentId) return;
      var status = this.dataset.attendanceValue;
      var clickedBtn = this;
      clickedBtn.disabled = true;
      try {
        await window.IaApi.apiFetch('/api/students/' + currentStudentId + '/attendance', {
          method: 'PUT',
          body: { status: status },
        });
        window.IaApi.showToast('Attendance marked: ' + status, 'success');
        var data = await window.IaApi.apiFetch('/api/students/' + currentStudentId + '/attendance-logs');
        var logs = data.logs || [];
        renderSupTodayStatus(logs);
        renderSupAttGrid(logs);
        if (modalMsg) { modalMsg.hidden = true; modalMsg.textContent = ''; }
      } catch (err) {
        if (modalMsg) { modalMsg.hidden = false; modalMsg.textContent = err.message || 'Failed to mark attendance.'; }
        window.IaApi.showToast(err.message || 'Failed to mark attendance.', 'error');
      } finally {
        clickedBtn.disabled = false;
      }
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeAttendanceModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeAttendanceModal);
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeAttendanceModal();
    });
  }
  }

  document.removeEventListener('keydown', loadSupervisorDashboard._escHandler);
  var sharedEscHandler = function(e) {
    if (e.key === 'Escape') {
      if (isSchool) {
        var evalM = document.getElementById('evaluation-modal');
        if (evalM && !evalM.hidden) { evalM.hidden = true; return; }
      }
      if (isSchool || isWorkplace) {
        var fbM = document.getElementById('feedback-modal');
        if (fbM && !fbM.hidden) { fbM.hidden = true; return; }
      }
      var attM = document.getElementById('attendance-modal');
      if (attM && !attM.hidden) { attM.hidden = true; }
    }
  };
  loadSupervisorDashboard._escHandler = sharedEscHandler;
  document.addEventListener('keydown', sharedEscHandler);
  } catch (err) {
    window.IaApi.showToast(err && err.message || 'Failed to load supervisor dashboard.', 'error');
    if (root) window.IaApi.showError(root, err && err.message || 'Failed to load supervisor dashboard.');
  }
}

function initSupervisorDashboard() {
  var page = document.body.dataset.page;
  if (page === 'school-supervisor-dashboard' || page === 'workplace-supervisor-dashboard') {
    loadWhenReady(loadSupervisorDashboard);
  }
}

document.addEventListener('DOMContentLoaded', initSupervisorDashboard);
document.addEventListener('ia:user-ready', initSupervisorDashboard);
