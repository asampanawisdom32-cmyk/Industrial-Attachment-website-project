var escapeHtml = window.IaApi.escapeHtml;
var loadWhenReady = window.IaApi.loadWhenReady;

/* ===== Shared helpers ===== */
function getGreeting() {
  var h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getInitial(name) {
  return (name || 'S').charAt(0).toUpperCase();
}

function getStatusColor(status) {
  switch (status) {
    case 'submitted': return 'var(--warning)';
    case 'reviewed':
    case 'approved': return 'var(--success)';
    default: return 'var(--muted)';
  }
}

function getStatusBadge(status) {
  switch (status) {
    case 'draft': return 'is-draft';
    case 'submitted': return 'is-warning';
    case 'reviewed':
    case 'approved': return 'is-success';
    default: return 'is-muted';
  }
}

function renderStatusBadge(status) {
  return '<span class="badge ' + getStatusBadge(status) + '">' + escapeHtml(status) + '</span>';
}

/* ===== Score color helpers ===== */
function getScoreClass(score) {
  if (score >= 75) return 'eval-score-high';
  if (score >= 55) return 'eval-score-medium';
  if (score >= 35) return 'eval-score-low';
  return 'eval-score-poor';
}

/* ===== Animated counter ===== */
function animateCounters() {
  document.querySelectorAll('.stat-value-anim').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-target'), 10);
    if (isNaN(target)) return;
    el.textContent = '0';
    var duration = 800;
    var start = performance.now();
    function step(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* ===== Stat card builder (admin-style with icon, colored accent, and sublabel) ===== */
function statCard(value, label, sublabel, accentClass, iconSvg, delayClass) {
  delayClass = delayClass || 'animate-in-d1';
  return '<div class="stat-card-ring ' + accentClass + ' animate-in ' + delayClass + '">' +
    '<div class="stat-icon" style="background:none;padding:0">' + iconSvg + '</div>' +
    '<div class="stat-card-ring-body">' +
      '<div class="stat-value-anim" data-target="' + value + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + escapeHtml(String(value)) + '</div>' +
      '<div class="stat-card-ring-label" style="font-size:0.9rem;margin:2px 0 0">' + escapeHtml(label) + '</div>' +
      '<div class="stat-card-ring-sub">' + escapeHtml(sublabel || '') + '</div>' +
    '</div>' +
  '</div>';
}

/* ===== Build performance trend bars ===== */
function renderPerformanceChart(categoryBreakdown) {
  if (!categoryBreakdown || categoryBreakdown.length === 0) {
    return '<div class="empty-state">' +
      '<div class="empty-state-icon">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
          '<path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>' +
        '</svg>' +
      '</div>' +
      'No evaluation data yet. Check back after you receive evaluations.' +
    '</div>';
  }

  var chartColors = ['#7c3aed', '#059669', '#2563eb', '#d97706', '#dc2626', '#0d9488'];
  var bars = categoryBreakdown.map(function (cat, i) {
    var color = chartColors[i % chartColors.length];
    var pct = Math.min(cat.average, 100);
    return '<div class="perf-bar-item">' +
      '<div class="perf-bar-header">' +
        '<span class="perf-bar-label">' + escapeHtml(cat.category) + '</span>' +
        '<span class="perf-bar-score" style="color:' + color + '">' + cat.average + '</span>' +
      '</div>' +
      '<div class="perf-bar-track">' +
        '<div class="perf-bar-fill" style="width:0%;background:' + color + '" data-target-width="' + pct + '%"></div>' +
      '</div>' +
      '<div class="perf-bar-footer">' + cat.count + ' evaluation' + (cat.count !== 1 ? 's' : '') + '</div>' +
    '</div>';
  }).join('');

  return '<div class="perf-chart">' + bars + '</div>';
}

/* ===== Animate performance bars on render ===== */
function animatePerfBars() {
  document.querySelectorAll('.perf-bar-fill').forEach(function (bar, i) {
    setTimeout(function () {
      bar.style.width = bar.getAttribute('data-target-width') || '0%';
    }, 300 + i * 100);
  });
}

/* ===== Build attendance mini-chart ===== */
function renderAttendanceMiniChart(attendanceValue) {
  var base = Math.min(Math.round(attendanceValue), 100);
  var patterns = [-15, -8, 0, +5, +10, +5, -5, +8, +10, +5, -3, -10];
  var weeks = [];
  for (var i = 0; i < 12; i++) {
    var val = Math.min(Math.max(base + patterns[i], 20), 100);
    var colorClass = val >= 80 ? 'is-high' : val >= 60 ? 'is-mid' : 'is-low';
    weeks.push({ week: i + 1, value: val, colorClass: colorClass });
  }

  var bars = weeks.map(function (w) {
    return '<div class="attend-bar-wrap" title="Week ' + w.week + ': ' + w.value + '%">' +
      '<div class="attend-bar ' + w.colorClass + '" style="height:' + w.value + '%"></div>' +
      '<span class="attend-bar-label">W' + w.week + '</span>' +
    '</div>';
  }).join('');

  return '<div class="attend-chart"><div class="attend-bars">' + bars + '</div></div>';
}

/* ===== Build interactive timeline ===== */
function renderInteractiveTimeline(reports) {
  var blocks = '';
  for (var i = 0; i < 12; i++) {
    var weekNum = i + 1;
    var reportForWeek = reports.find(function (r) { return r.week == weekNum; });
    var cls = 'is-empty';
    var title = 'Week ' + weekNum + ' — Not started';
    if (reportForWeek) {
      if (reportForWeek.status === 'submitted' || reportForWeek.status === 'reviewed' || reportForWeek.status === 'approved') {
        cls = 'is-complete';
        title = 'Week ' + weekNum + ' — ' + reportForWeek.status.charAt(0).toUpperCase() + reportForWeek.status.slice(1);
      } else {
        cls = 'is-pending';
        title = 'Week ' + weekNum + ' — ' + reportForWeek.status.charAt(0).toUpperCase() + reportForWeek.status.slice(1);
      }
    }
    blocks += '<div class="week-block ' + cls + '" data-week="' + weekNum + '" title="' + escapeHtml(title) + '">' +
      '<span class="week-block-num">' + weekNum + '</span>' +
      '<span class="week-block-label">wk</span>' +
    '</div>';
  }
  return blocks;
}

/* ===== Build filterable report list ===== */
function renderReportList(reports, activeFilter) {
  if (!reports || reports.length === 0) {
    return '<div class="empty-state">' +
      '<div class="empty-state-icon">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
          '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
          '<polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' +
        '</svg>' +
      '</div>' +
      'No reports yet. Submit your first weekly report!' +
    '</div>';
  }

  var filtered = activeFilter === 'all'
    ? reports
    : reports.filter(function (r) { return r.status === activeFilter; });

  if (filtered.length === 0) {
    return '<div class="empty-state">' +
      '<div class="empty-state-icon">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
          '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
        '</svg>' +
      '</div>' +
      'No reports match the selected filter.' +
    '</div>';
  }

  return filtered.map(function (r) {
    var dateStr = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    return '<div class="report-item">' +
      '<div class="report-item-header" onclick="this.parentNode.classList.toggle(\'is-expanded\')">' +
        '<div class="report-item-left">' +
          '<div class="report-item-icon">' +
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
              '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' +
              '<polyline points="14 2 14 8 20 8"/>' +
            '</svg>' +
          '</div>' +
          '<div class="report-item-info">' +
            '<div class="report-item-title">' + escapeHtml(r.title || 'Week ' + r.week + ' Report') + '</div>' +
            '<div class="report-item-meta">' +
              renderStatusBadge(r.status) +
              (r.week ? '<span class="text-muted">Week ' + r.week + '</span>' : '') +
              (dateStr ? '<span class="text-muted">' + dateStr + '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="report-item-expand-icon">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</div>' +
      '</div>' +
      '<div class="report-item-body">' +
        (r.content
          ? '<div class="report-item-content">' + escapeHtml(r.content.substring(0, 300)) + (r.content.length > 300 ? '…' : '') + '</div>'
          : '') +
        (r.feedback
          ? '<div class="report-item-feedback">' +
            '<span class="feedback-label">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
              '</svg>' +
              ' Feedback:' +
            '</span> ' + escapeHtml(r.feedback) +
          '</div>'
          : '') +
      '</div>' +
    '</div>';
  }).join('');
}

/* ===== Build evaluations ===== */
function renderEvaluationCards(evaluations) {
  if (!evaluations || evaluations.length === 0) {
    return '<div class="empty-state">' +
      '<div class="empty-state-icon">' +
        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
          '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>' +
        '</svg>' +
      '</div>' +
      'No evaluations yet. Supervisors will evaluate your performance here.' +
    '</div>';
  }

  return evaluations.map(function (e) {
    var score = Number(e.score) || 0;
    var dateStr = e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
    return '<div class="eval-item" onclick="this.classList.toggle(\'is-expanded\')">' +
      '<div class="eval-item-header">' +
        '<div class="eval-score ' + getScoreClass(score) + '">' + score + '</div>' +
        '<div class="eval-info">' +
          '<div class="eval-category">' + escapeHtml(e.category || e.period || 'Evaluation') + '</div>' +
          '<div class="eval-date">Score: ' + score + '/100' + (dateStr ? ' · ' + dateStr : '') + '</div>' +
        '</div>' +
        '<div class="eval-expand-icon">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>' +
        '</div>' +
      '</div>' +
      (e.comment ? '<div class="eval-item-body"><div class="eval-comment">' + escapeHtml(e.comment) + '</div></div>' : '') +
    '</div>';
  }).join('');
}

/* ===== Build filter chips ===== */
function renderFilterChips(activeFilter) {
  var filters = [
    { key: 'all', label: 'All' },
    { key: 'draft', label: 'Draft' },
    { key: 'submitted', label: 'Submitted' },
    { key: 'reviewed', label: 'Reviewed' },
  ];
  return filters.map(function (f) {
    var active = f.key === activeFilter ? ' is-active' : '';
    return '<button class="filter-chip' + active + '" data-filter="' + f.key + '">' + f.label + '</button>';
  }).join('');
}

/* ===== Main loader ===== */
async function loadStudentDashboard() {
  var root = document.querySelector('[data-page-root]');
  if (!root) return;
  window.IaApi.showSkeleton(root, 'student-dashboard');

  try {
    var [summaryRes, user] = await Promise.all([
      window.IaApi.apiFetch('/api/dashboard/summary'),
      Promise.resolve(window.IaApi.getStoredUser()),
    ]);

    var summary = summaryRes.summary || {};
    var st = summary.student || {};
    var reports = summary.reports || [];
    var evaluations = summary.evaluations || [];
    var categoryBreakdown = summary.categoryBreakdown || [];

    var progressValue = Math.min(Math.round(st.progress ?? 0), 100);
    var attendanceValue = Math.min(Math.round(st.attendance ?? 0), 100);
    var reportsCount = reports.length;
    var evalsCount = evaluations.length;

    var userName = (user && user.name) || 'Student';
    var greeting = getGreeting();
    var today = formatDate();
    var initial = getInitial(userName);

    var avgEvalScore = evaluations.length > 0
      ? Math.round(evaluations.reduce(function (sum, e) { return sum + Number(e.score || 0); }, 0) / evaluations.length)
      : 0;

    var submittedCount = reports.filter(function (r) { return r.status === 'submitted' || r.status === 'reviewed' || r.status === 'approved'; }).length;
    var draftCount = reports.filter(function (r) { return r.status === 'draft'; }).length;

    var weekBlocks = renderInteractiveTimeline(reports);
    var activeFilter = 'all';
    var reportListHtml = renderReportList(reports, activeFilter);
    var filterChips = renderFilterChips(activeFilter);
    var evalHtml = renderEvaluationCards(evaluations);
    var perfChartHtml = renderPerformanceChart(categoryBreakdown);
    var attendChartHtml = renderAttendanceMiniChart(attendanceValue);

    var schoolSupName = st.schoolSupervisorName || 'Assigned by admin';
    var workplaceSupName = st.workplaceSupervisorName || 'Assigned by admin';

    var statusColors = { active: '#059669', completed: '#2563eb', pending: '#d97706', dropped: '#94a3b8' };
    var statusColor = statusColors[st.status] || '#94a3b8';
    var statusLabel = st.status ? st.status.replace(/_/g, ' ') : 'Active';

    root.innerHTML = '' +

      /* ===== HERO ===== */
      '<div class="hero animate-in">' +
        '<button class="hero-action-btn" id="sidebar-toggle" aria-label="Toggle sidebar">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>' +
        '</button>' +
        '<button class="hero-action-btn" aria-label="Notifications">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>' +
          '<span class="notification-dot"></span>' +
        '</button>' +
        '<div class="hero-content">' +
          '<div class="hero-avatar">' + initial + '</div>' +
          '<div class="hero-greeting">' +
            '<h2>' + greeting + ', ' + escapeHtml(userName) + '</h2>' +
            '<p>' + today + '</p>' +
          '</div>' +
          '<div class="hero-badge">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>' +
            ' Student' +
          '</div>' +
        '</div>' +
        '<div class="hero-actions">' +
          '<a href="/reports" class="quick-chip">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>' +
            ' New Report' +
          '</a>' +
          '<a href="/evaluations" class="quick-chip">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
            ' Evaluations' +
          '</a>' +
          '<a href="/profile" class="quick-chip">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
            ' Profile' +
          '</a>' +
        '</div>' +
      '</div>' +

      /* ===== ADMIN-STYLE STATS GRID ===== */
      '<div class="grid grid-4">' +
        statCard(progressValue, 'Overall Progress', 'Attachment completion', 'stat-card-accent-total',
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
          'animate-in-d1') +
        statCard(attendanceValue, 'Attendance', 'Present & engaged', 'stat-card-accent-attendance',
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
          'animate-in-d2') +
        statCard(reportsCount, 'Reports Submitted', 'This term', 'stat-card-accent-submitted',
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
          'animate-in-d3') +
        statCard(avgEvalScore || '—', 'Evaluation Score', 'From supervisors', 'stat-card-accent-evaluations',
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
          'animate-in-d4') +
      '</div>' +

      /* ===== MAIN 2-COL GRID ===== */
      '<div class="grid grid-2">' +

        /* LEFT COLUMN */
        '<div>' +

          /* Placement Details */
          '<div class="card animate-in animate-in-d3">' +
            '<div class="card-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>' +
              ' Placement Details' +
            '</div>' +
            '<div class="card-body">' +
              '<div class="detail-row">' +
                '<div class="detail-icon is-work">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' +
                '</div>' +
                '<div class="detail-content">' +
                  '<div class="detail-content-label">Company / Workplace</div>' +
                  '<div class="detail-content-value">' + escapeHtml(st.company || 'Not assigned yet') + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="detail-row">' +
                '<div class="detail-icon is-dept">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' +
                '</div>' +
                '<div class="detail-content">' +
                  '<div class="detail-content-label">Department</div>' +
                  '<div class="detail-content-value">' + escapeHtml(st.department || 'Not set') + '</div>' +
                '</div>' +
              '</div>' +
              '<div class="detail-row">' +
                '<div class="detail-icon is-id">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="12" y2="14"/></svg>' +
                '</div>' +
                '<div class="detail-content">' +
                  '<div class="detail-content-label">Student ID</div>' +
                  '<div class="detail-content-value">' + escapeHtml(st.studentId || '—') + '</div>' +
                '</div>' +
              '</div>' +
              (st.year ? '<div class="detail-row">' +
                '<div class="detail-icon is-year">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>' +
                '</div>' +
                '<div class="detail-content">' +
                  '<div class="detail-content-label">Year</div>' +
                  '<div class="detail-content-value">' + escapeHtml(String(st.year)) + '</div>' +
                '</div>' +
              '</div>' : '') +
              (st.location ? '<div class="detail-row">' +
                '<div class="detail-icon is-location">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
                '</div>' +
                '<div class="detail-content">' +
                  '<div class="detail-content-label">Location</div>' +
                  '<div class="detail-content-value">' + escapeHtml(st.location) + '</div>' +
                '</div>' +
              '</div>' : '') +
              '<div class="detail-row">' +
                '<div class="detail-icon is-progress">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' +
                '</div>' +
                '<div class="detail-content">' +
                  '<div class="detail-content-label">Progress</div>' +
                  '<div class="detail-content-value">' +
                    '<div class="progress-thin"><div class="progress-thin-fill" style="width:' + progressValue + '%"></div></div>' +
                    '<span class="progress-value is-progress">' + progressValue + '%</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="detail-row">' +
                '<div class="detail-icon is-attendance">' +
                  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
                '</div>' +
                '<div class="detail-content">' +
                  '<div class="detail-content-label">Attendance</div>' +
                  '<div class="detail-content-value">' +
                    '<div class="progress-thin"><div class="progress-thin-fill is-green" style="width:' + attendanceValue + '%"></div></div>' +
                    '<span class="progress-value is-attendance">' + attendanceValue + '%</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="supervisor-info">' +
                '<div class="supervisor-info-label">Supervisors</div>' +
                '<div class="supervisor-item">' +
                  '<div class="supervisor-icon">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>' +
                  '</div>' +
                  '<div class="supervisor-detail">' +
                    '<div class="supervisor-name">' + escapeHtml(schoolSupName) + '</div>' +
                    '<div class="supervisor-role">School Supervisor</div>' +
                  '</div>' +
                '</div>' +
                '<div class="supervisor-item">' +
                  '<div class="supervisor-icon is-workplace">' +
                    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>' +
                  '</div>' +
                  '<div class="supervisor-detail">' +
                    '<div class="supervisor-name">' + escapeHtml(workplaceSupName) + '</div>' +
                    '<div class="supervisor-role">Workplace Supervisor</div>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          /* Quick Actions (admin-style grid) */
          '<div class="card animate-in animate-in-d4">' +
            '<div class="card-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
              ' Quick Actions' +
            '</div>' +
            '<div class="quick-actions-grid">' +
              '<a href="/reports" class="quick-action-card">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                ' Submit Report' +
              '</a>' +
              '<a href="/evaluations" class="quick-action-card">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
                ' Evaluations' +
              '</a>' +
              '<a href="/profile" class="quick-action-card">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>' +
                ' My Profile' +
              '</a>' +
              '<a href="/reports" class="quick-action-card">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
                ' All Reports' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +

        /* RIGHT COLUMN */
        '<div>' +

          /* Attachment Timeline */
          '<div class="card animate-in animate-in-d5">' +
            '<div class="card-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
              ' Attachment Timeline' +
            '</div>' +
            '<div class="card-body">' +
              '<p class="card-sub">Click a week for details</p>' +
              '<div class="week-grid">' + weekBlocks + '</div>' +
              '<div class="week-legend">' +
                '<span><span class="legend-dot is-complete"></span> Submitted</span>' +
                '<span><span class="legend-dot is-pending"></span> Draft / Pending</span>' +
                '<span><span class="legend-dot is-empty"></span> Not started</span>' +
              '</div>' +
              '<div class="week-actions">' +
                '<a href="/reports" class="btn btn-primary btn-sm">+ New Report</a>' +
                '<a href="/evaluations" class="btn btn-secondary btn-sm">View Evaluations</a>' +
              '</div>' +
            '</div>' +
          '</div>' +

          /* Reports Summary */
          '<div class="card animate-in animate-in-d6">' +
            '<div class="card-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
              ' Recent Reports' +
              (reports.length > 0 ? '<span class="card-title-meta">' + reports.length + ' total</span>' : '') +
            '</div>' +
            '<div class="card-body">' +
              '<div class="report-filters">' + filterChips + '</div>' +
              '<div class="report-list" id="report-list">' + reportListHtml + '</div>' +
              (reports.length > 0
                ? '<div class="card-actions"><a href="/reports" class="btn btn-secondary btn-sm">View All Reports &rarr;</a></div>'
                : '<div class="card-actions"><a href="/reports" class="btn btn-primary btn-sm">Submit First Report</a></div>') +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      /* ===== MIDDLE WIDE ROW: Attendance Chart ===== */
      '<div class="card u-mb">' +
        '<div class="card-title">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' +
          ' Weekly Attendance Overview' +
          '<span class="card-title-meta">Overall: ' + attendanceValue + '%</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<p class="card-sub">Estimated weekly attendance across attachment period</p>' +
          attendChartHtml +
        '</div>' +
      '</div>' +

      /* ===== MIDDLE WIDE ROW: Performance Trends ===== */
      '<div class="card u-mb">' +
        '<div class="card-title">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
          ' Performance Trends' +
          (avgEvalScore > 0 ? '<span class="card-title-meta">Average: ' + avgEvalScore + '</span>' : '') +
        '</div>' +
        '<div class="card-body">' +
          perfChartHtml +
        '</div>' +
      '</div>' +

      /* ===== BOTTOM 2-COL GRID ===== */
      '<div class="grid grid-2">' +

        /* Evaluations */
        '<div class="card">' +
          '<div class="card-title">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
            ' Evaluations' +
            (evalsCount > 0 ? '<span class="card-title-meta">' + evalsCount + ' total</span>' : '') +
          '</div>' +
          '<div class="card-body">' +
            '<div class="eval-list">' + evalHtml + '</div>' +
            '<div class="card-actions"><a href="/profile" class="btn btn-secondary btn-sm">View Full Profile &rarr;</a></div>' +
          '</div>' +
        '</div>' +

        /* Status Summary (admin-style health list) */
        '<div class="card">' +
          '<div class="card-title">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/></svg>' +
            ' Status Summary' +
          '</div>' +
          '<ul class="health-list">' +
            '<li class="health-item">' +
              '<span class="health-icon ' + (progressValue > 0 ? 'health-icon-green' : 'health-icon-blue') + '">' +
                (progressValue > 0
                  ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
                  : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>') +
              '</span>' +
              '<span>Progress — <span class="health-stat">' + progressValue + '%</span> complete</span>' +
            '</li>' +
            '<li class="health-item">' +
              '<span class="health-icon ' + (attendanceValue >= 75 ? 'health-icon-green' : 'health-icon-yellow') + '">' +
                (attendanceValue >= 75
                  ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
                  : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>') +
              '</span>' +
              '<span>Attendance — <span class="health-stat">' + attendanceValue + '%</span> attendance rate</span>' +
            '</li>' +
            '<li class="health-item">' +
              '<span class="health-icon ' + (submittedCount > 0 ? 'health-icon-green' : 'health-icon-blue') + '">' +
                (submittedCount > 0
                  ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
                  : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>') +
              '</span>' +
              '<span>Reports — <span class="health-stat">' + submittedCount + ' submitted</span>, ' + draftCount + ' drafts</span>' +
            '</li>' +
            '<li class="health-item">' +
              '<span class="health-icon ' + (evalsCount > 0 ? 'health-icon-green' : 'health-icon-blue') + '">' +
                (evalsCount > 0
                  ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
                  : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>') +
              '</span>' +
              '<span>Evaluations — <span class="health-stat">' + evalsCount + ' received</span>' + (avgEvalScore > 0 ? ', avg score ' + avgEvalScore : '') + '</span>' +
            '</li>' +
          '</ul>' +
        '</div>' +
      '</div>' +

      /* ===== OVERLAY ===== */
      '<div id="week-tooltip-overlay" class="overlay" style="display:none">' +
        '<div class="overlay-content">' +
          '<button class="overlay-close">&times;</button>' +
          '<div class="overlay-body"></div>' +
        '</div>' +
      '</div>';

    // Animate counters
    requestAnimationFrame(animateCounters);

    // Animate performance bars
    setTimeout(animatePerfBars, 100);

    // Animate attendance bars
    document.querySelectorAll('.attend-bar').forEach(function (bar, i) {
      bar.style.animationDelay = (i * 0.06) + 's';
    });

    // Wire up filter chips
    document.querySelectorAll('.filter-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        var filter = this.getAttribute('data-filter');
        document.querySelectorAll('.filter-chip').forEach(function (c) { c.classList.remove('is-active'); });
        this.classList.add('is-active');
        var list = document.getElementById('report-list');
        if (list) {
          list.style.opacity = '0';
          list.style.transform = 'translateY(8px)';
          setTimeout(function () {
            list.innerHTML = renderReportList(reports, filter);
            list.style.opacity = '1';
            list.style.transform = 'translateY(0)';
          }, 150);
        }
      });
    });

    // Wire up interactive week blocks
    document.querySelectorAll('.week-block').forEach(function (block) {
      block.addEventListener('click', function (e) {
        e.stopPropagation();
        var week = this.getAttribute('data-week');
        var report = reports.find(function (r) { return r.week == week; });
        var overlay = document.getElementById('week-tooltip-overlay');
        var body = overlay.querySelector('.overlay-body');
        if (report) {
          body.innerHTML =
            '<div class="tooltip-detail-title">' + escapeHtml(report.title || 'Week ' + week + ' Report') + '</div>' +
            '<div class="tooltip-detail-status">' + renderStatusBadge(report.status) + '</div>' +
            (report.submittedAt ? '<div class="tooltip-detail-date">Submitted: ' + new Date(report.submittedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</div>' : '') +
            (report.content ? '<div class="tooltip-detail-content">' + escapeHtml(report.content.substring(0, 500)) + (report.content.length > 500 ? '&hellip;' : '') + '</div>' : '') +
            (report.feedback
              ? '<div class="tooltip-detail-feedback">' +
                '<strong>' +
                  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' +
                  '</svg>' +
                  ' Feedback:' +
                '</strong> ' + escapeHtml(report.feedback) +
              '</div>'
              : '');
        } else {
          body.innerHTML =
            '<div class="tooltip-detail-title">Week ' + week + '</div>' +
            '<div class="tooltip-detail-status"><span class="badge is-muted">Not started</span></div>' +
            '<p class="tooltip-detail-empty">No report has been submitted for this week yet.</p>';
        }
        overlay.style.display = 'flex';
      });
    });

    // Close tooltip overlay
    var overlay = document.getElementById('week-tooltip-overlay');
    if (overlay) {
      overlay.querySelector('.overlay-close').addEventListener('click', function () {
        overlay.style.display = 'none';
      });
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    }

    // Re-bind sidebar toggle
    var tb = document.getElementById('sidebar-toggle');
    var sidebar = document.querySelector('.sidebar');
    if (tb && sidebar) {
      tb.addEventListener('click', function (e) {
        e.stopPropagation();
        sidebar.classList.toggle('sidebar-collapsed');
        try { localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('sidebar-collapsed')); } catch (_) {}
      });
    }

  } catch (err) {
    window.IaApi.showToast(err.message || 'Failed to load student dashboard.', 'error');
    window.IaApi.showError(root, err.message || 'Failed to load student dashboard.');
  }
}

/* ===== Initialization ===== */
function initStudentDashboard() {
  var page = document.body && document.body.dataset.page;
  if (page === 'student-dashboard') {
    loadWhenReady(loadStudentDashboard);
  }
}

document.addEventListener('DOMContentLoaded', initStudentDashboard);
document.addEventListener('ia:user-ready', initStudentDashboard);
