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
  return (name || 'A').charAt(0).toUpperCase();
}

/* ===== Badge helpers ===== */
function getStatusBadge(status) {
  switch (status) {
    case 'draft': return 'badge-draft';
    case 'submitted': return 'badge-warning';
    case 'reviewed':
    case 'approved': return 'badge-success';
    default: return 'badge-muted';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'draft': return '\ud83d\udcdd';
    case 'submitted': return '\u23f3';
    case 'reviewed':
    case 'approved': return '\u2705';
    default: return '';
  }
}

function renderStatusBadge(status) {
  var icon = getStatusIcon(status);
  var cls = getStatusBadge(status);
  return '<span class="badge ' + cls + '">' + icon + ' ' + escapeHtml(status) + '</span>';
}

/* ===== Stat card builder (admin variant — no rings, just bold value) ===== */
function statCard(value, label, sublabel, accentClass, iconSvg, delayClass) {
  delayClass = delayClass || 'animate-in-d1';
  return '<div class="stat-card-ring ' + accentClass + ' animate-in ' + delayClass + ' admin-reveal admin-reveal-scale">' +
    '<div class="stat-icon" style="background:none;padding:0">' +
      iconSvg +
    '</div>' +
    '<div class="stat-card-ring-body">' +
      '<div class="stat-value-anim" data-target="' + value + '" data-count-to="' + value + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + escapeHtml(String(value)) + '</div>' +
      '<div class="stat-card-ring-label" style="font-size:0.9rem;margin:2px 0 0">' + escapeHtml(label) + '</div>' +
      '<div class="stat-card-ring-sub">' + escapeHtml(sublabel || '') + '</div>' +
    '</div>' +
  '</div>';
}

/* ===== Animated counter — simple fade-up for stat values ===== */
function animateCounters() {
  document.querySelectorAll('.stat-card-ring .stat-value-anim').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-target'), 10);
    if (isNaN(target)) return;
    el.textContent = '0';
    var duration = 800;
    var start = performance.now();
    function step(now) {
      var elapsed = now - start;
      var progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(eased * target);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    requestAnimationFrame(step);
  });
}

/* ===== Main loader ===== */
async function loadAdminDashboard() {
  var root = document.querySelector('[data-page-root]');
  if (!root) return;
  window.IaApi.showSkeleton(root, 'admin-dashboard');

  try {
    var [summaryRes, user] = await Promise.all([
      window.IaApi.apiFetch('/api/dashboard/summary'),
      Promise.resolve(window.IaApi.getStoredUser()),
    ]);

    var summary = summaryRes.summary || {};
    var stats = summary.stats || {};
    var funnel = summary.funnel || {};
    var supervisors = summary.supervisors || {};
    var recentReports = summary.recentReports || [];

    var totalStudents = stats.totalStudents || 0;
    var activeStudents = stats.activeStudents || 0;
    var pendingPlacements = stats.pendingPlacements || 0;
    var avgProgress = stats.averageProgress || 0;
    var pendingReports = stats.pendingReports || 0;
    var totalReports = stats.totalReports || 0;

    var userName = (user && user.name) || 'Administrator';
    var greeting = getGreeting();
    var today = formatDate();
    var initial = getInitial(userName);

    // Funnel percentages
    var funnelTotal = funnel.total || 1;
    var placedCount = funnel.placed || 0;
    var activeCount = funnel.active || 0;
    var placedPct = Math.round((placedCount / funnelTotal) * 100);
    var activePct = Math.round((activeCount / funnelTotal) * 100);

    // Recent reports rows
    var reportRows = recentReports.length === 0
      ? '<tr><td colspan="5"><div class="empty-state"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> No reports submitted yet.</div></td></tr>'
      : recentReports.map(function (r) {
          var date = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '\u2014';
          return '<tr>' +
            '<td><strong>' + escapeHtml(r.studentName) + '</strong></td>' +
            '<td>' + escapeHtml(r.title) + '</td>' +
            '<td>' + (r.week ? 'Week ' + r.week : '\u2014') + '</td>' +
            '<td>' + renderStatusBadge(r.status) + '</td>' +
            '<td>' + date + '</td>' +
          '</tr>';
        }).join('');

    // School + workplace supervisor counts
    var schoolCount = supervisors.school || 0;
    var workplaceCount = supervisors.workplace || 0;
    var totalSup = schoolCount + workplaceCount;

    // Build the full dashboard HTML
    root.innerHTML = '' +

      // ===== HERO =====
      '<div class="hero animate-in admin-reveal">' +
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
          '<div class="hero-avatar">' + initial + '</div>' +
          '<div class="hero-greeting">' +
            '<h2>' + greeting + ', ' + escapeHtml(userName) + '</h2>' +
            '<p>' + today + '</p>' +
          '</div>' +
          '<div class="hero-badge">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>' +
            ' Admin' +
          '</div>' +
        '</div>' +
        '<div class="hero-actions">' +
          '<a href="/admin" class="quick-chip">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
            ' Admin Panel' +
          '</a>' +
          '<a href="/analytics" class="quick-chip">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' +
            ' Analytics' +
          '</a>' +
          '<a href="/students" class="quick-chip">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
            ' Students' +
          '</a>' +
          '<a href="/reports" class="quick-chip">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
            ' Reports' +
          '</a>' +
        '</div>' +
      '</div>' +

      // ===== STATS =====
      '<div class="grid admin-stats-grid">' +
        statCard(totalStudents, 'Total Students', 'Enrolled in the program', 'stat-card-accent-total', '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', 'animate-in-d1') +
        statCard(activeStudents, 'Active Placements', 'Currently on attachment', 'stat-card-accent-active-placement', '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', 'animate-in-d2') +
        statCard(pendingPlacements, 'Pending Placement', 'Awaiting assignment', 'stat-card-accent-pending', '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>', 'animate-in-d3') +
        statCard(pendingReports, 'Pending Reports', totalReports + ' total \u00b7 ' + pendingReports + ' awaiting review', 'stat-card-accent-submitted', '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', 'animate-in-d4') +
        statCard(avgProgress + '%', 'Avg Progress', 'Attachment completion rate', 'stat-card-accent-avg-progress', '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>', 'animate-in-d4') +
      '</div>' +

      // ===== MAIN 2-COL GRID =====
      '<div class="grid grid-2">' +

        // LEFT COLUMN
        '<div>' +

          // Student Funnel
          '<div class="card animate-in animate-in-d3 admin-reveal admin-reveal-left">' +
            '<div class="card-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>' +
              ' Student Funnel' +
            '</div>' +
            '<div class="funnel">' +
              '<div class="funnel-bar">' +
                '<span class="funnel-label">All Students</span>' +
                '<div class="funnel-track">' +
                  '<div class="funnel-fill funnel-fill-all" style="width:100%">' +
                    '<span>' + funnelTotal + '</span>' +
                    '<span class="funnel-percent">100%</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="funnel-bar">' +
                '<span class="funnel-label">On Placement</span>' +
                '<div class="funnel-track">' +
                  '<div class="funnel-fill funnel-fill-placed" style="width:' + placedPct + '%">' +
                    '<span>' + placedCount + '</span>' +
                    '<span class="funnel-percent">' + placedPct + '%</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div class="funnel-bar">' +
                '<span class="funnel-label">Active</span>' +
                '<div class="funnel-track">' +
                  '<div class="funnel-fill funnel-fill-active" style="width:' + activePct + '%">' +
                    '<span>' + activeCount + '</span>' +
                    '<span class="funnel-percent">' + activePct + '%</span>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>' +

          // Quick Actions
          '<div class="card animate-in animate-in-d4 admin-reveal admin-reveal-left">' +
            '<div class="card-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
              ' Quick Actions' +
            '</div>' +
            '<div class="quick-actions-grid admin-stagger-children admin-revealed">' +
              '<a href="/admin" class="quick-action-card admin-card-3d">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' +
                ' Admin Panel' +
              '</a>' +
              '<a href="/analytics" class="quick-action-card admin-card-3d">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>' +
                ' Analytics' +
              '</a>' +
              '<a href="/students" class="quick-action-card admin-card-3d">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
                ' View Students' +
              '</a>' +
              '<a href="/reports" class="quick-action-card admin-card-3d">' +
                '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                ' All Reports' +
              '</a>' +
            '</div>' +
          '</div>' +
        '</div>' +

        // RIGHT COLUMN
        '<div>' +

          // Recent Reports
          '<div class="card animate-in animate-in-d5 admin-reveal admin-reveal-right">' +
            '<div class="card-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
              ' Recent Reports' +
              (recentReports.length > 0 ? '<span class="card-title-meta">' + recentReports.length + ' latest</span>' : '') +
            '</div>' +
            '<div class="table-wrap">' +
              '<table class="table">' +
                '<thead>' +
                  '<tr>' +
                    '<th>Student</th>' +
                    '<th>Title</th>' +
                    '<th>Week</th>' +
                    '<th>Status</th>' +
                    '<th>Date</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody>' + reportRows + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>' +

          // Supervisor Summary
          '<div class="card animate-in animate-in-d6 admin-reveal admin-reveal-right">' +
            '<div class="card-title">' +
              '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' +
              ' Supervisors' +
            '</div>' +
            '<div class="sup-summary-grid">' +
              '<div class="sup-summary-block">' +
                '<div class="sup-summary-value school">' + schoolCount + '</div>' +
                '<div class="sup-summary-label">School Supervisors</div>' +
              '</div>' +
              '<div class="sup-summary-block">' +
                '<div class="sup-summary-value workplace">' + workplaceCount + '</div>' +
                '<div class="sup-summary-label">Workplace Supervisors</div>' +
              '</div>' +
              '<div class="sup-summary-block">' +
                '<div class="sup-summary-value sup-summary-value-total">' + totalSup + '</div>' +
                '<div class="sup-summary-label">Total Supervisors</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // ===== SYSTEM HEALTH =====
      '<div class="card animate-in animate-in-d6 admin-reveal admin-reveal-scale">' +
        '<div class="card-title">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><path d="M6 6h.01M6 18h.01"/></svg>' +
          ' System Health' +
        '</div>' +
        '<ul class="health-list">' +
          '<li class="health-item">' +
            '<span class="health-icon health-icon-blue">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>' +
            '</span>' +
            '<span>Student Records — <span class="health-stat">' + totalStudents + '</span> students enrolled</span>' +
          '</li>' +
          '<li class="health-item">' +
            '<span class="health-icon ' + (activeStudents > 0 ? 'health-icon-green' : 'health-icon-yellow') + '">' +
              (activeStudents > 0
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>') +
            '</span>' +
            '<span>Active Placements — <span class="health-stat">' + activeStudents + '</span> currently on attachment</span>' +
          '</li>' +
          '<li class="health-item">' +
            '<span class="health-icon ' + ((stats.completedStudents || 0) > 0 ? 'health-icon-green' : 'health-icon-blue') + '">' +
              ((stats.completedStudents || 0) > 0
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>') +
            '</span>' +
            '<span>Completed — <span class="health-stat">' + (stats.completedStudents || 0) + '</span> students finished</span>' +
          '</li>' +
          '<li class="health-item">' +
            '<span class="health-icon health-icon-blue">' +
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
            '</span>' +              '<span>Reports — <span class="health-stat">' + totalReports + ' total' + (pendingReports > 0 ? ', ' + pendingReports + ' pending review' : '') + '</span></span>' +
          '</li>' +
          '<li class="health-item">' +
            '<span class="health-icon ' + (totalSup > 0 ? 'health-icon-green' : 'health-icon-yellow') + '">' +
              (totalSup > 0
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>') +
            '</span>' +
            '<span>Supervisors — <span class="health-stat">' + totalSup + '</span> registered (' + schoolCount + ' school, ' + workplaceCount + ' workplace)</span>' +
          '</li>' +
        '</ul>' +
      '</div>';

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

    // Animate counters after render
    requestAnimationFrame(animateCounters);

  } catch (err) {
    window.IaApi.showToast(err.message || 'Failed to load admin dashboard.', 'error');
    window.IaApi.showError(root, err.message || 'Failed to load admin dashboard.');
  }
}

/* ===== Initialization ===== */
function initAdminDashboard() {
  var page = document.body && document.body.dataset.page;
  if (page === 'admin-dashboard') {
    loadWhenReady(loadAdminDashboard);
  }
}

document.addEventListener('DOMContentLoaded', initAdminDashboard);
document.addEventListener('ia:user-ready', initAdminDashboard);
