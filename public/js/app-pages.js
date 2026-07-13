function formatRole(role) {
  return String(role || '').replace(/_/g, ' ');
}

var escapeHtml = window.IaApi.escapeHtml;
var loadWhenReady = window.IaApi.loadWhenReady;

function renderPlaceholder(title, message) {
  return `
    <div class="card card-full" style="text-align:center;padding:48px 24px;">
      <div style="font-size:48px;margin-bottom:16px;">🚧</div>
      <h2>${escapeHtml(title)}</h2>
      <p class="text-muted" style="max-width:400px;margin:8px auto 0;">
        ${escapeHtml(message || 'This page is being rebuilt. Features will be added here soon.')}
      </p>
    </div>`;
}

function loadDashboard() {
  // Redirect to role-specific dashboard instead of showing a placeholder
  var user = window.IaApi && window.IaApi.getStoredUser && window.IaApi.getStoredUser();
  if (user && user.role) {
    var rolePath = user.role === 'admin' ? 'admin' :
      user.role === 'school_supervisor' ? 'school-supervisor' :
      user.role === 'workplace_supervisor' ? 'workplace-supervisor' : 'student';
    window.location.href = '/dashboard/' + rolePath;
    return;
  }
  // Fallback: show placeholder if user data isn't available yet
  const root = document.querySelector('[data-page-root]');
  if (!root) return;
  root.innerHTML = renderPlaceholder('Dashboard', 'Redirecting to your dashboard…');
}

/* ===== Students Page (admin full CRUD, supervisor view) ===== */
var studentsPageData = null;
var studentSupervisors = null;
var studentsSearchQuery = '';
var studentsEditDocId = null;

function getStatusBadgeLabel(status) {
  switch (status) {
    case 'active': return '<span class="status-premium status-premium-active">&#9679; Active</span>';
    case 'pending': return '<span class="status-premium status-premium-pending">&#9679; Pending</span>';
    case 'completed': return '<span class="status-premium status-premium-completed">&#9679; Completed</span>';
    case 'dropped': return '<span class="status-premium status-premium-dropped">&#9679; Dropped</span>';
    default: return '<span class="text-muted">' + escapeHtml(status) + '</span>';
  }
}

/**
 * Animate stat counter values from 0 to target
 */
function animateCounters() {
  var elements = document.querySelectorAll('.stat-value-anim');
  elements.forEach(function(el) {
    var target = parseInt(el.getAttribute('data-target'), 10);
    if (isNaN(target) || target === 0) return;
    var duration = 800;
    var startTime = null;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(eased * target);
      el.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    }
    requestAnimationFrame(step);
  });
}

function renderStudentsList() {
  var root = document.querySelector('[data-page-root]');
  if (!root || !studentsPageData) return;

  var data = studentsPageData;
  var students = data.students || [];
  var isAdmin = data.role === 'admin';
  var isWorkplaceSupervisor = data.role === 'workplace_supervisor';
  var isSupervisor = !isAdmin;

  // Stats
  var total = students.length;
  var active = students.filter(function(s) { return s.status === 'active'; }).length;
  var pending = students.filter(function(s) { return s.status === 'pending'; }).length;
  var completed = students.filter(function(s) { return s.status === 'completed'; }).length;

  // Filter by search query
  var q = studentsSearchQuery.toLowerCase();
  var filtered = q ? students.filter(function(s) {
    return (s.name || '').toLowerCase().indexOf(q) > -1 ||
      (s.studentId || '').toLowerCase().indexOf(q) > -1 ||
      (s.department || '').toLowerCase().indexOf(q) > -1 ||
      (s.company || s.workplace || '').toLowerCase().indexOf(q) > -1;
  }) : students;

  // Save search cursor position before innerHTML replacement
  var oldSearchInput = document.getElementById('students-search-input');
  var savedCursorStart = oldSearchInput ? oldSearchInput.selectionStart : 0;
  var savedCursorEnd = oldSearchInput ? oldSearchInput.selectionEnd : 0;

  // Build table rows
  var adminColCount = 8;
  var rows = filtered.length === 0
    ? '<tr><td colspan="' + (isAdmin ? adminColCount : 7) + '" style="text-align:center;padding:32px"><span class="text-muted">' +
      (q ? 'No students match your search.' : 'No students yet.') + '</span></td></tr>'
    : filtered.map(function(s) {
        var safeId = escapeHtml(s.id);
        var safeName = escapeHtml(s.name || '');
        var safeSid = escapeHtml(s.studentId || '');
        var safeCompany = escapeHtml(s.company || s.workplace || '—');
        var safeSch = escapeHtml(s.schoolSupervisorName || 'Unassigned');
        var safeWrk = escapeHtml(s.workplaceSupervisorName || 'Unassigned');

        var actionsHtml = '';
        if (isAdmin) {
          actionsHtml = '<button class="btn btn-xs btn-secondary students-edit-btn" data-sid="' + safeId + '">Edit</button> ' +
            '<button class="btn btn-xs btn-danger students-delete-btn" data-sid="' + safeId + '" data-sname="' + safeName + '">Del</button>';
        } else if (isWorkplaceSupervisor) {
          actionsHtml = '<button class="btn btn-xs btn-outline students-attendance-btn" data-sid="' + safeId + '" data-sname="' + safeName + '">Attend</button>';
        }

        var row = '<tr>' +
          '<td class="stu-name"><strong>' + safeName + '</strong></td>' +
          '<td class="stu-id">' + safeSid + '</td>' +
          '<td class="stu-company">' + safeCompany + '</td>' +
          '<td class="stu-status">' + getStatusBadgeLabel(s.status) + '</td>';
        if (isAdmin) {
          row += '<td class="stu-sup">' + safeSch + '</td>' +
            '<td class="stu-sup">' + safeWrk + '</td>';
        }
        row += '<td class="stu-progress"><div class="progress-cell progress-cell-clickable" data-sid="' + safeId + '" data-sname="' + safeName + '" style="cursor:pointer"><div class="progress-cell-bar"><div class="progress-cell-fill" style="width:' + (s.progress || 0) + '%"></div></div><span class="progress-cell-text">' + (s.progress || 0) + '%</span></div></td>' +
          '<td class="stu-actions">' + actionsHtml + '</td>' +
        '</tr>';
        return row;
      }).join('');

  var headerCols = isAdmin
    ? ['Student', 'ID', 'Company', 'Status', 'School Sup.', 'Workplace Sup.', 'Progress', 'Actions']
    : ['Student', 'ID', 'Company', 'Status', 'Progress', 'Attendance', 'Actions'];

  root.innerHTML =
    // Premium Hero Banner
    '<div class="students-hero admin-reveal">' +
      '<div class="students-hero-shimmer"></div>' +
      '<div class="students-hero-content">' +
        '<div class="students-hero-left">' +
          '<div class="students-hero-text">' +
            '<h2 class="text-glow">' + (isAdmin ? 'Student Management' : 'My Students') + '</h2>' +
            '<p>' + (isAdmin ? 'Full CRUD management of all students in the program.' : 'View and manage your assigned students.') + '</p>' +
          '</div>' +
        '</div>' +
        (isAdmin ? '<button class="btn btn-sm quick-chip admin-shimmer" id="students-add-btn" style="flex-shrink:0">+ Add Student</button>' : '') +
      '</div>' +
    '</div>' +

    // Premium Stat Cards (using ring-style cards)
    '<div class="stats-grid admin-stagger-children admin-revealed" style="margin-bottom:4px">' +
      '<div class="stat-card-ring stat-card-accent-total animate-in animate-in-d1">' +
        '<div class="stat-icon stat-icon-students"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + total + '" data-count-to="' + total + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + total + '</div><span class="stat-label">Total Students</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-active-placement animate-in animate-in-d2">' +
        '<div class="stat-icon stat-icon-active"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + active + '" data-count-to="' + active + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + active + '</div><span class="stat-label">Active</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-pending animate-in animate-in-d3">' +
        '<div class="stat-icon stat-icon-pending"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + pending + '" data-count-to="' + pending + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + pending + '</div><span class="stat-label">Pending</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-avg-progress animate-in animate-in-d4">' +
        '<div class="stat-icon stat-icon-progress"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + completed + '" data-count-to="' + completed + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + completed + '</div><span class="stat-label">Completed</span></div>' +
      '</div>' +
    '</div>' +

    // Premium Filters + Search
    '<div class="form-premium admin-reveal admin-reveal-scale">' +
      '<div class="search-premium">' +
        '<span class="search-premium-icon">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' +
        '</span>' +
        '<input type="text" id="students-search-input" placeholder="Search by name, student ID, department, or company…" value="' + escapeHtml(studentsSearchQuery) + '" />' +
      '</div>' +
    '</div>' +

    // Students Table (separate from search card so it can expand fully)
    '<div class="table-premium-wrap" style="margin-bottom:20px">' +
      '<table class="table-premium">' +
        '<thead><tr>' + headerCols.map(function(h) { return '<th>' + h + '</th>'; }).join('') + '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>' +

    // Create Student Modal (admin only)
    (isAdmin ? '' +
    '<div id="students-create-modal" class="modal-premium-overlay" hidden>' +
      '<div class="modal-premium modal-premium-wide">' +
        '<div class="modal-premium-header">' +
          '<h3>Add New Student</h3>' +
          '<button class="modal-premium-close" id="students-create-close">&times;</button>' +
        '</div>' +
        '<div class="modal-premium-body">' +
          '<form id="students-create-form" class="form-premium" style="border:none;padding:0;margin:0;box-shadow:none">' +
            '<div class="form-grid">' +
              '<div><label>Name *</label><input type="text" name="name" required /></div>' +
              '<div><label>Email *</label><input type="email" name="email" required /></div>' +
              '<div><label>Student ID *</label><input type="text" name="studentId" required /></div>' +
              '<div><label>Department</label><input type="text" name="department" /></div>' +
              '<div><label>Year of Study</label><input type="text" name="yearOfStudy" /></div>' +
              '<div><label>Phone</label><input type="tel" name="phone" /></div>' +
              '<div class="form-row"><label>Company / Workplace</label><input type="text" name="workplace" /></div>' +
              '<div class="form-row"><label>Location</label><input type="text" name="location" /></div>' +
              '<div><label>Duration (weeks)</label><input type="number" name="durationWeeks" value="12" min="1" max="52" /></div>' +
            '</div>' +
            '<div class="form-actions">' +
              '<button class="btn btn-primary" type="submit">Create Student</button>' +
              '<button class="btn btn-outline" type="button" id="students-create-cancel">Cancel</button>' +
            '</div>' +
            '<p id="students-create-msg" class="text-muted" hidden></p>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>' : '') +

    // Edit Student Modal (admin only)
    (isAdmin ? '' +
    '<div id="students-edit-modal" class="modal-premium-overlay" hidden>' +
      '<div class="modal-premium modal-premium-wide">' +
        '<div class="modal-premium-header">' +
          '<h3>Edit Student</h3>' +
          '<button class="modal-premium-close" id="students-edit-close">&times;</button>' +
        '</div>' +
        '<div class="modal-premium-body">' +
          '<form id="students-edit-form" class="form-premium" style="border:none;padding:0;margin:0;box-shadow:none">' +
            '<div class="form-grid">' +
              '<div><label>Name</label><input type="text" name="name" id="edit-name" required /></div>' +
              '<div><label>Email</label><input type="email" name="email" id="edit-email" /></div>' +
              '<div><label>Student ID</label><input type="text" name="studentId" id="edit-studentId" /></div>' +
              '<div><label>Department</label><input type="text" name="department" id="edit-department" /></div>' +
              '<div><label>Year of Study</label><input type="text" name="yearOfStudy" id="edit-yearOfStudy" /></div>' +
              '<div><label>Phone</label><input type="tel" name="phone" id="edit-phone" /></div>' +
              '<div class="form-row"><label>Company / Workplace</label><input type="text" name="workplace" id="edit-workplace" /></div>' +
              '<div class="form-row"><label>Location</label><input type="text" name="location" id="edit-location" /></div>' +
              '<div><label>Duration (weeks)</label><input type="number" name="durationWeeks" id="edit-durationWeeks" min="1" max="52" value="12" /></div>' +
              '<div><label>Status</label><select name="status" id="edit-status">' +
                '<option value="active">Active</option>' +
                '<option value="pending">Pending</option>' +
                '<option value="completed">Completed</option>' +
                '<option value="dropped">Dropped</option>' +
              '</select></div>' +
              '<div><label>Progress (%)</label><input type="number" name="progress" id="edit-progress" min="0" max="100" /></div>' +
              '<div class="form-row"><label>Attendance (%)</label><input type="number" name="attendance" id="edit-attendance" min="0" max="100" /></div>' +
              '<div class="form-row" style="border-top:1px solid var(--border);padding-top:12px;margin-top:4px">' +
                '<label style="font-weight:700;margin-bottom:8px;display:block">Supervisor Assignment</label>' +
                '<div class="grid-2-responsive">' +
                  '<div><label>School Supervisor</label><select id="edit-school-sup"></select></div>' +
                  '<div><label>Workplace Supervisor</label><select id="edit-workplace-sup"></select></div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="form-actions">' +
              '<button class="btn btn-primary" type="submit">Save Changes</button>' +
              '<button class="btn btn-outline" type="button" id="students-edit-cancel">Cancel</button>' +
            '</div>' +
            '<p id="students-edit-msg" class="text-muted" hidden></p>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>' : '') +

    // Attendance Modal (workplace supervisors only)
    (isWorkplaceSupervisor ? '' +
    '<div id="students-attendance-modal" class="modal-premium-overlay" hidden>' +
      '<div class="modal-premium" style="max-width:520px">' +
        '<div class="modal-premium-header">' +
          '<h3>Attendance — <span id="students-att-name"></span></h3>' +
          '<button class="modal-premium-close" id="students-att-close">&times;</button>' +
        '</div>' +
        '<div class="modal-premium-body">' +
          '<div id="students-att-today" style="margin-bottom:16px"></div>' +
          '<label style="font-weight:600;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:8px;display:block">Mark Attendance</label>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">' +
            '<button class="btn btn-sm btn-attendance" data-att-value="present" style="background:#d1fae5;color:#059669;font-weight:700;border:2px solid transparent">&check; Present</button>' +
            '<button class="btn btn-sm btn-attendance" data-att-value="absent" style="background:#fee2e2;color:#dc2626;font-weight:700;border:2px solid transparent">&cross; Absent</button>' +
            '<button class="btn btn-sm btn-attendance" data-att-value="late" style="background:#fef3c7;color:#d97706;font-weight:700;border:2px solid transparent">&#9201; Late</button>' +
            '<button class="btn btn-sm btn-attendance" data-att-value="excused" style="background:#e5efff;color:#1A6B8A;font-weight:700;border:2px solid transparent">&#9432; Excused</button>' +
          '</div>' +
          '<div id="students-att-grid-label" style="font-weight:600;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;margin-bottom:8px">Recent 14 Days</div>' +
          '<div id="students-att-grid" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px"></div>' +
          '<div id="students-att-legend" style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280"><span style="width:10px;height:10px;border-radius:50%;background:#d1fae5;border:1px solid #a7f3d0;display:inline-block"></span>Present</span>' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280"><span style="width:10px;height:10px;border-radius:50%;background:#fee2e2;border:1px solid #fecaca;display:inline-block"></span>Absent</span>' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280"><span style="width:10px;height:10px;border-radius:50%;background:#fef3c7;border:1px solid #fde68a;display:inline-block"></span>Late</span>' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280"><span style="width:10px;height:10px;border-radius:50%;background:#e5efff;border:1px solid #bfdbfe;display:inline-block"></span>Excused</span>' +
            '<span style="display:flex;align-items:center;gap:4px;font-size:0.78rem;color:#6b7280"><span style="width:10px;height:10px;border-radius:50%;background:#f3f4f6;border:1px solid #d1d5db;display:inline-block"></span>Not marked</span>' +
          '</div>' +
          '<p id="students-att-msg" class="text-muted" hidden style="margin-top:8px"></p>' +
        '</div>' +
        '<div class="modal-premium-footer"><button class="btn btn-secondary" id="students-att-cancel">Close</button></div>' +
      '</div>' +
    '</div>' : '') +

    // Progress Detail Modal (all supervisors + admin)
    '<div id="students-progress-modal" class="modal-premium-overlay" hidden>' +
      '<div class="modal-premium modal-premium-wide">' +
        '<div class="modal-premium-header">' +
          '<h3>Student Progress — <span id="prog-modal-name"></span></h3>' +
          '<button class="modal-premium-close" id="prog-modal-close">&times;</button>' +
        '</div>' +
        '<div class="modal-premium-body" id="prog-modal-body">' +
          '<p class="text-muted">Loading progress…</p>' +
        '</div>' +
      '</div>' +
    '</div>'

  // Run animated counters on the stat values
  setTimeout(function() {
    animateCounters();
  }, 100);

  // ── Wire up search ──────────────────────────────────────────────────
  var searchInput = document.getElementById('students-search-input');
  if (searchInput) {
    // Restore cursor position
    searchInput.focus();
    searchInput.setSelectionRange(savedCursorStart, savedCursorEnd);

    searchInput.addEventListener('input', function() {
      studentsSearchQuery = this.value;
      renderStudentsList();
    });
  }

  // ── Add Student modal ───────────────────────────────────────────────
  if (isAdmin) {
    var addBtn = document.getElementById('students-add-btn');
    var createModal = document.getElementById('students-create-modal');
    var createClose = document.getElementById('students-create-close');
    var createCancel = document.getElementById('students-create-cancel');
    var createForm = document.getElementById('students-create-form');
    var createMsg = document.getElementById('students-create-msg');

    function openCreateModal() {
      if (createForm) createForm.reset();
      if (createMsg) { createMsg.hidden = true; createMsg.textContent = ''; }
      if (createModal) createModal.hidden = false;
    }

    function closeCreateModal() {
      if (createModal) createModal.hidden = true;
    }

    if (addBtn) addBtn.addEventListener('click', openCreateModal);
    if (createClose) createClose.addEventListener('click', closeCreateModal);
    if (createCancel) createCancel.addEventListener('click', closeCreateModal);
    if (createModal) {
      createModal.addEventListener('click', function(e) {
        if (e.target === createModal) closeCreateModal();
      });
    }

    if (createForm) {
      createForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var fd = new FormData(createForm);
        if (createMsg) { createMsg.hidden = true; createMsg.textContent = ''; }
        var submitBtn = createForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
          // First, register the user
          var userResult = await window.IaApi.apiFetch('/api/auth/register', {
            method: 'POST',
            body: {
              name: fd.get('name'),
              email: fd.get('email'),
              password: 'Temp@123', // temporary password — student will reset
              role: 'student',
              studentProfile: {
                studentId: fd.get('studentId'),
                department: fd.get('department'),
                yearOfStudy: fd.get('yearOfStudy'),
                phone: fd.get('phone'),
                workplace: fd.get('workplace'),
                location: fd.get('location'),
                durationWeeks: parseInt(fd.get('durationWeeks'), 10) || 12,
              },
            },
          });

          window.IaApi.showToast('Student created successfully!', 'success');
          if (createMsg) {
            createMsg.hidden = false;
            createMsg.textContent = 'Student created. They can log in with the email and a temporary password.';
          }
          closeCreateModal();
          await loadStudentsPage();
        } catch (err) {
          window.IaApi.showToast(err.message || 'Failed to create student.', 'error');
          if (createMsg) {
            createMsg.hidden = false;
            createMsg.textContent = err.message || 'Failed to create student.';
          }
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  }

  // ── Edit Student modal ─────────────────────────────────────────────
  if (isAdmin) {
    var editModal = document.getElementById('students-edit-modal');
    var editClose = document.getElementById('students-edit-close');
    var editCancel = document.getElementById('students-edit-cancel');
    var editForm = document.getElementById('students-edit-form');
    var editMsg = document.getElementById('students-edit-msg');

    // Populate supervisor dropdowns
    var schSupSelect = document.getElementById('edit-school-sup');
    var wrkSupSelect = document.getElementById('edit-workplace-sup');

    if (schSupSelect && studentSupervisors) {
      var schOptions = '<option value="">Unassigned</option>';
      (studentSupervisors.schoolSupervisors || []).forEach(function(s) {
        schOptions += '<option value="' + escapeHtml(s.uid) + '">' + escapeHtml(s.name || s.email) + '</option>';
      });
      schSupSelect.innerHTML = schOptions;
    }
    if (wrkSupSelect && studentSupervisors) {
      var wrkOptions = '<option value="">Unassigned</option>';
      (studentSupervisors.workplaceSupervisors || []).forEach(function(s) {
        wrkOptions += '<option value="' + escapeHtml(s.uid) + '">' + escapeHtml(s.name || s.email) + '</option>';
      });
      wrkSupSelect.innerHTML = wrkOptions;
    }

    function openEditModal(student) {
      if (!student) return;
      studentsEditDocId = student.id;

      document.getElementById('edit-name').value = student.name || '';
      document.getElementById('edit-email').value = student.email || '';
      document.getElementById('edit-studentId').value = student.studentId || '';
      document.getElementById('edit-department').value = student.department || '';
      document.getElementById('edit-yearOfStudy').value = student.yearOfStudy || '';
      document.getElementById('edit-phone').value = student.phone || '';
      document.getElementById('edit-workplace').value = student.workplace || '';
      document.getElementById('edit-location').value = student.location || '';
      document.getElementById('edit-durationWeeks').value = student.durationWeeks || 12;
      document.getElementById('edit-status').value = student.status || 'active';
      document.getElementById('edit-progress').value = student.progress || 0;
      document.getElementById('edit-attendance').value = student.attendance || 0;

      // Set supervisor selections
      if (schSupSelect) schSupSelect.value = student.schoolSupervisor || '';
      if (wrkSupSelect) wrkSupSelect.value = student.workplaceSupervisor || '';

      if (editMsg) { editMsg.hidden = true; editMsg.textContent = ''; }
      if (editModal) editModal.hidden = false;
    }

    function closeEditModal() {
      if (editModal) editModal.hidden = true;
      studentsEditDocId = null;
    }

    if (editClose) editClose.addEventListener('click', closeEditModal);
    if (editCancel) editCancel.addEventListener('click', closeEditModal);
    if (editModal) {
      editModal.addEventListener('click', function(e) {
        if (e.target === editModal) closeEditModal();
      });
    }

    // Edit buttons
    document.querySelectorAll('.students-edit-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var sid = this.dataset.sid;
        var student = (studentsPageData.students || []).find(function(s) { return s.id === sid; });
        openEditModal(student);
      });
    });

    if (editForm) {
      editForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!studentsEditDocId) return;
        if (editMsg) { editMsg.hidden = true; editMsg.textContent = ''; }
        var submitBtn = editForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
          var fd = new FormData(editForm);
          var updates = {
            name: fd.get('name'),
            email: fd.get('email'),
            studentId: fd.get('studentId'),
            department: fd.get('department'),
            yearOfStudy: fd.get('yearOfStudy'),
            phone: fd.get('phone'),
            workplace: fd.get('workplace'),
            location: fd.get('location'),
            durationWeeks: parseInt(fd.get('durationWeeks'), 10) || 12,
            status: fd.get('status'),
            progress: parseInt(fd.get('progress'), 10) || 0,
            attendance: parseInt(fd.get('attendance'), 10) || 0,
          };

          await window.IaApi.apiFetch('/api/students/' + studentsEditDocId, {
            method: 'PUT',
            body: updates,
          });

          // Update supervisor assignments if changed
          var newSchSup = schSupSelect ? schSupSelect.value : '';
          var newWrkSup = wrkSupSelect ? wrkSupSelect.value : '';

          // Always send the API call (empty string = clear assignment)
          await window.IaApi.apiFetch('/api/admin/students/' + studentsEditDocId + '/assign-school-supervisor', {
            method: 'PUT',
            body: { supervisorUid: newSchSup },
          });
          await window.IaApi.apiFetch('/api/admin/students/' + studentsEditDocId + '/assign-workplace-supervisor', {
            method: 'PUT',
            body: { supervisorUid: newWrkSup },
          });

          window.IaApi.showToast('Student updated successfully!', 'success');
          closeEditModal();
          await loadStudentsPage();
        } catch (err) {
          window.IaApi.showToast(err.message || 'Failed to update student.', 'error');
          if (editMsg) {
            editMsg.hidden = false;
            editMsg.textContent = err.message || 'Failed to update student.';
          }
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  }

  // ── Delete buttons (admin only) ─────────────────────────────────────
  if (isAdmin) {
    document.querySelectorAll('.students-delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var sid = this.dataset.sid;
        var sname = this.dataset.sname;
        if (!confirm('Delete student "' + sname + '"? This action cannot be undone.')) return;

        window.IaApi.apiFetch('/api/students/' + sid, { method: 'DELETE' })
          .then(function() {
            window.IaApi.showToast('Student deleted.', 'success');
            return loadStudentsPage();
          })
          .catch(function(err) {
            window.IaApi.showToast(err.message || 'Failed to delete student.', 'error');
          });
      });
    });
  }

  // ── Attendance buttons (workplace supervisor only) ─────────────────────────────────
  if (isWorkplaceSupervisor) {
    var attModal = document.getElementById('students-attendance-modal');
    var attName = document.getElementById('students-att-name');
    var attMsg = document.getElementById('students-att-msg');
    var attClose = document.getElementById('students-att-close');
    var attCancel = document.getElementById('students-att-cancel');
    var attTodayBox = document.getElementById('students-att-today');
    var attGrid = document.getElementById('students-att-grid');
    var currentAttStudentId = null;
    var attRefreshTimer = null;

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

    function getDayOfWeek(dateStr) {
      var days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      return days[new Date(dateStr + 'T00:00:00').getDay()];
    }

    function renderAttGrid(logs) {
      if (!attGrid) return;
      attGrid.innerHTML = '';
      var today = getTodayStr();

      for (var i = 13; i >= 0; i--) {
        var d = new Date();
        d.setDate(d.getDate() - i);
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
        dot.style.cssText = 'width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;transition:transform 0.15s';
        if (sc) {
          dot.style.background = sc.bg;
          dot.style.border = '2px solid ' + sc.border;
          dot.style.color = sc.color;
          dot.textContent = status === 'present' ? '\u2713' : status === 'absent' ? '\u2717' : status === 'late' ? '\u23F1' : '\u24D8';
        } else {
          dot.style.background = '#f3f4f6';
          dot.style.border = '2px solid #d1d5db';
          dot.style.color = '#9ca3af';
          dot.textContent = '\u2014';
        }

        var label = document.createElement('span');
        label.style.cssText = 'font-size:9px;color:#9ca3af;line-height:1';
        label.textContent = formatDateShort(dateStr);

        if (isToday) {
          chip.style.outline = '2px solid #2563eb';
          chip.style.outlineOffset = '2px';
          chip.style.borderRadius = '8px';
        }

        chip.appendChild(dot);
        chip.appendChild(label);
        attGrid.appendChild(chip);
      }
    }

    function renderTodayStatus(logs) {
      if (!attTodayBox) return;
      var today = getTodayStr();
      var todayLog = logs.find(function(l) { return l.date === today; });

      if (todayLog) {
        var sc = ATT_STATUS_COLORS[todayLog.status] || {};
        attTodayBox.innerHTML =
          '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:' + (sc.bg || '#f3f4f6') + ';border:1px solid ' + (sc.border || '#d1d5db') + ';border-radius:8px">' +
            '<span style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;background:' + (sc.bg || '#f3f4f6') + ';color:' + (sc.color || '#6b7280') + ';border:2px solid ' + (sc.border || '#d1d5db') + '">' +
              (todayLog.status === 'present' ? '\u2713' : todayLog.status === 'absent' ? '\u2717' : todayLog.status === 'late' ? '\u23F1' : '\u24D8') +
            '</span>' +
            '<div>' +
              '<div style="font-weight:600;font-size:0.85rem;color:' + (sc.color || '#374151') + '">Today: ' + (sc.label || todayLog.status) + '</div>' +
              '<div style="font-size:0.75rem;color:#6b7280">Already marked \u2014 click a button to update</div>' +
            '</div>' +
          '</div>';
      } else {
        attTodayBox.innerHTML =
          '<div style="padding:10px 14px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">' +
            '<div style="font-weight:600;font-size:0.85rem;color:#92400e">Not yet marked today</div>' +
            '<div style="font-size:0.75rem;color:#6b7280">Select a status below to mark attendance</div>' +
          '</div>';
      }
    }

    async function openAttModal(studentId, studentName) {
      currentAttStudentId = studentId;
      if (attName) attName.textContent = studentName;
      if (attMsg) { attMsg.hidden = true; attMsg.textContent = ''; }
      if (attGrid) attGrid.innerHTML = '<span style="font-size:12px;color:#9ca3af">Loading...</span>';
      if (attTodayBox) attTodayBox.innerHTML = '';
      if (attModal) attModal.hidden = false;

      try {
        var data = await window.IaApi.apiFetch('/api/students/' + studentId + '/attendance-logs');
        var logs = data.logs || [];
        renderTodayStatus(logs);
        renderAttGrid(logs);
      } catch (err) {
        if (attGrid) attGrid.innerHTML = '<span style="font-size:12px;color:#dc2626">Failed to load attendance history</span>';
      }
    }

    function closeAttModal() {
      if (attModal) attModal.hidden = true;
      currentAttStudentId = null;
      if (attRefreshTimer) { clearInterval(attRefreshTimer); attRefreshTimer = null; }
    }

    document.querySelectorAll('.students-attendance-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openAttModal(this.dataset.sid, this.dataset.sname);
      });
    });

    document.querySelectorAll('.btn-attendance').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        if (!currentAttStudentId) return;
        var status = this.dataset.attValue;
        var clickedBtn = this;
        clickedBtn.disabled = true;
        try {
          await window.IaApi.apiFetch('/api/students/' + currentAttStudentId + '/attendance', {
            method: 'PUT',
            body: { status: status },
          });
          window.IaApi.showToast('Attendance marked: ' + status, 'success');
          var data = await window.IaApi.apiFetch('/api/students/' + currentAttStudentId + '/attendance-logs');
          var logs = data.logs || [];
          renderTodayStatus(logs);
          renderAttGrid(logs);
          if (attMsg) { attMsg.hidden = true; attMsg.textContent = ''; }
        } catch (err) {
          if (attMsg) {
            attMsg.hidden = false;
            attMsg.textContent = err.message || 'Failed to mark attendance.';
          }
          window.IaApi.showToast(err.message || 'Failed to mark attendance.', 'error');
        } finally {
          clickedBtn.disabled = false;
        }
      });
    });

    if (attClose) attClose.addEventListener('click', closeAttModal);
    if (attCancel) attCancel.addEventListener('click', closeAttModal);
    if (attModal) {
      attModal.addEventListener('click', function(e) {
        if (e.target === attModal) closeAttModal();
      });
    }
  }

  // ── Progress Detail Modal (all roles) ───────────────────────────────
  var progModal = document.getElementById('students-progress-modal');
  var progName = document.getElementById('prog-modal-name');
  var progBody = document.getElementById('prog-modal-body');
  var progClose = document.getElementById('prog-modal-close');
  var currentProgStudentId = null;
  var progRefreshTimer = null;

  function closeProgModal() {
    if (progModal) progModal.hidden = true;
    currentProgStudentId = null;
    if (progRefreshTimer) { clearInterval(progRefreshTimer); progRefreshTimer = null; }
  }

  function renderProgressBody(d) {
    var statusColor = d.status === 'active' ? '#059669' : d.status === 'completed' ? '#2563eb' : '#d97706';
    var html =
      '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:18px">' +
        '<div style="flex:1;min-width:180px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-md);padding:16px">' +
          '<div style="font-size:0.72rem;text-transform:uppercase;font-weight:700;color:var(--text-secondary);letter-spacing:0.05em">Progress</div>' +
          '<div style="font-size:1.8rem;font-weight:800;margin-top:4px">' + d.progress + '%</div>' +
          '<div style="margin-top:6px"><div class="progress-cell-bar" style="height:8px"><div class="progress-cell-fill" style="width:' + d.progress + '%"></div></div></div>' +
        '</div>' +
        '<div style="flex:1;min-width:180px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-md);padding:16px">' +
          '<div style="font-size:0.72rem;text-transform:uppercase;font-weight:700;color:var(--text-secondary);letter-spacing:0.05em">Attendance</div>' +
          '<div style="font-size:1.8rem;font-weight:800;margin-top:4px">' + d.attendance + '%</div>' +
          '<div style="margin-top:6px"><div class="progress-cell-bar" style="height:8px"><div class="progress-cell-fill green" style="width:' + d.attendance + '%"></div></div></div>' +
        '</div>' +
        '<div style="flex:1;min-width:180px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-md);padding:16px">' +
          '<div style="font-size:0.72rem;text-transform:uppercase;font-weight:700;color:var(--text-secondary);letter-spacing:0.05em">Status</div>' +
          '<div style="font-size:1rem;font-weight:700;margin-top:8px;color:' + statusColor + '">' + escapeHtml(d.status || 'pending') + '</div>' +
          '<div style="font-size:0.78rem;color:var(--text-secondary);margin-top:4px">' + escapeHtml(d.department || '\u2014') + ' \u00B7 ' + escapeHtml(d.company || '\u2014') + '</div>' +
          '<div style="font-size:0.72rem;color:var(--text-secondary);margin-top:4px">Duration: ' + (d.durationWeeks || 12) + ' weeks</div>' +
        '</div>' +
      '</div>';

    // Attendance breakdown
    html +=
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">' +
        '<div style="background:#d1fae5;color:#059669;padding:6px 14px;border-radius:20px;font-size:0.78rem;font-weight:600">Present: ' + d.presentCount + '</div>' +
        '<div style="background:#fef3c7;color:#d97706;padding:6px 14px;border-radius:20px;font-size:0.78rem;font-weight:600">Late: ' + d.lateCount + '</div>' +
        '<div style="background:#e5efff;color:#1A6B8A;padding:6px 14px;border-radius:20px;font-size:0.78rem;font-weight:600">Excused: ' + d.excusedCount + '</div>' +
        '<div style="background:#fee2e2;color:#dc2626;padding:6px 14px;border-radius:20px;font-size:0.78rem;font-weight:600">Absent: ' + d.absentCount + '</div>' +
        '<div style="background:var(--card-bg);color:var(--text-primary);padding:6px 14px;border-radius:20px;font-size:0.78rem;font-weight:600;border:1px solid var(--card-border)">Total Days: ' + d.totalDays + '</div>' +
      '</div>';

    // Reports summary
    var rs = d.reports;
    html +=
      '<div style="margin-bottom:18px">' +
        '<div style="font-weight:700;font-size:0.85rem;margin-bottom:8px">Reports (' + rs.total + ')</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<span style="background:var(--card-bg);border:1px solid var(--card-border);padding:4px 12px;border-radius:12px;font-size:0.75rem">Draft: ' + rs.byStatus.draft + '</span>' +
          '<span style="background:#fef3c7;color:#92400e;padding:4px 12px;border-radius:12px;font-size:0.75rem">Submitted: ' + rs.byStatus.submitted + '</span>' +
          '<span style="background:#e5efff;color:#1A6B8A;padding:4px 12px;border-radius:12px;font-size:0.75rem">Reviewed: ' + rs.byStatus.reviewed + '</span>' +
          '<span style="background:#d1fae5;color:#059669;padding:4px 12px;border-radius:12px;font-size:0.75rem">Approved: ' + rs.byStatus.approved + '</span>' +
        '</div>' +
      '</div>';

    // Evaluations
    var ev = d.evaluations;
    html +=
      '<div style="margin-bottom:18px">' +
        '<div style="font-weight:700;font-size:0.85rem;margin-bottom:8px">Evaluations</div>' +
        '<div style="font-size:0.82rem;color:var(--text-secondary)">Total: ' + ev.total + ' · Average Score: <strong>' + ev.averageScore + '</strong></div>';
    if (ev.byCategory.length > 0) {
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">';
      ev.byCategory.forEach(function(c) {
        html += '<span style="background:var(--card-bg);border:1px solid var(--card-border);padding:4px 12px;border-radius:12px;font-size:0.75rem">' + escapeHtml(c.category) + ': ' + c.average + ' <span style="color:var(--text-secondary)">(' + c.count + ')</span></span>';
      });
      html += '</div>';
    }
    html += '</div>';

    // Recent attendance logs
    if (d.recentLogs.length > 0) {
      html +=
        '<div>' +
          '<div style="font-weight:700;font-size:0.85rem;margin-bottom:8px">Recent Attendance</div>' +
          '<div style="display:flex;gap:6px;flex-wrap:wrap">';
      var statusColors = { present: '#059669', late: '#d97706', excused: '#1A6B8A', absent: '#dc2626' };
      d.recentLogs.forEach(function(l) {
        var bg = statusColors[l.status] || '#6b7280';
        html += '<div style="display:flex;align-items:center;gap:4px;font-size:0.72rem;background:var(--card-bg);border:1px solid var(--card-border);padding:4px 10px;border-radius:8px">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:' + bg + ';flex-shrink:0"></span>' +
          '<span>' + escapeHtml(l.date) + '</span>' +
          '<span style="color:' + bg + ';font-weight:600">' + escapeHtml(l.status) + '</span>' +
        '</div>';
      });
      html += '</div></div>';
    }

    html += '<div style="text-align:right;margin-top:12px;font-size:0.7rem;color:var(--text-secondary)">Last updated: ' + new Date(d.updatedAt).toLocaleTimeString() + '</div>';

    progBody.innerHTML = html;
  }

  async function openProgModal(studentId, studentName) {
    currentProgStudentId = studentId;
    if (progName) progName.textContent = studentName;
    if (progBody) progBody.innerHTML = '<p class="text-muted">Loading progress…</p>';
    if (progModal) progModal.hidden = false;

    async function fetchProgress() {
      if (!currentProgStudentId) return;
      try {
        var data = await window.IaApi.apiFetch('/api/dashboard/student-progress/' + currentProgStudentId);
        if (data && data.student && currentProgStudentId) renderProgressBody(data.student);
      } catch (err) {
        if (progBody) progBody.innerHTML = '<p class="text-muted">' + escapeHtml(err.message || 'Failed to load progress.') + '</p>';
      }
    }

    await fetchProgress();
    if (progRefreshTimer) clearInterval(progRefreshTimer);
    progRefreshTimer = setInterval(fetchProgress, 15000);
  }

  document.querySelectorAll('.progress-cell-clickable').forEach(function(cell) {
    cell.addEventListener('click', function() {
      openProgModal(this.dataset.sid, this.dataset.sname);
    });
  });

  if (progClose) progClose.addEventListener('click', closeProgModal);
  if (progModal) {
    progModal.addEventListener('click', function(e) {
      if (e.target === progModal) closeProgModal();
    });
  }

  // Escape key handler
  document.removeEventListener('keydown', renderStudentsList._escHandler);
  var escHandler = function(e) {
    if (e.key !== 'Escape') return;
    var pm = document.getElementById('students-progress-modal');
    if (pm && !pm.hidden) { closeProgModal(); return; }
    if (isAdmin) {
      var em = document.getElementById('students-edit-modal');
      if (em && !em.hidden) { em.hidden = true; studentsEditDocId = null; return; }
      var cm = document.getElementById('students-create-modal');
      if (cm && !cm.hidden) { cm.hidden = true; return; }
    }
    if (isSupervisor) {
      var am = document.getElementById('students-attendance-modal');
      if (am && !am.hidden) { am.hidden = true; currentAttStudentId = null; }
    }
  };
  renderStudentsList._escHandler = escHandler;
  document.addEventListener('keydown', escHandler);
}

async function loadStudentsPage() {
  const root = document.querySelector('[data-page-root]');
  if (!root) return;
  window.IaApi.showSkeleton(root, 'students');

  try {
    var user = window.IaApi.getStoredUser();
    var role = (user && user.role) || '';

    var data;
    if (role === 'admin') {
      data = await window.IaApi.apiFetch('/api/admin/students/all');
      try {
        var supData = await window.IaApi.apiFetch('/api/admin/supervisors');
        studentSupervisors = supData;
      } catch (e) {
        studentSupervisors = { schoolSupervisors: [], workplaceSupervisors: [] };
      }
    } else {
      data = await window.IaApi.apiFetch('/api/dashboard/students');
    }

    studentsPageData = data;
    studentsPageData.role = role;

    renderStudentsList();
  } catch (err) {
    window.IaApi.showToast(err.message || 'Failed to load students.', 'error');
    var root2 = document.querySelector('[data-page-root]');
    if (root2) window.IaApi.showError(root2, err.message || 'Failed to load students.');
  }
}
function getStatusBadge(status) {
  switch (status) {
    case 'draft': return 'badge-draft';
    case 'submitted': return 'badge-warning';
    case 'reviewed': return 'badge-reviewed';
    case 'approved': return 'badge-success';
    default: return 'badge-muted';
  }
}

function getStatusIcon(status) {
  switch (status) {
    case 'draft': return '\ud83d\udcdd'; // 📝
    case 'submitted': return '\u23f3'; // ⏳
    case 'reviewed': return '\u2705'; // ✅
    case 'approved': return '\u2705'; // ✅
    default: return '';
  }
}

function renderStatusBadge(status) {
  var icon = getStatusIcon(status);
  var cls = getStatusBadge(status);
  return '<span class="badge-premium badge-premium-' + status + '">' + icon + ' ' + escapeHtml(status) + '</span>';
}

var REPORTS_PAGE = 'reports-page';
var EVALS_PAGE = 'evals-page';

/* ===== Reports Page ===== */
var editingReportId = null;
var editingReportData = null;
var reportsPageData = null;
var pendingUploadFiles = [];
var reportsFilter = 'all';

function clearEditMode() {
  editingReportId = null;
  editingReportData = null;
  pendingUploadFiles = [];
}

async function deleteDraftReport(reportId) {
  if (!confirm('Delete this draft report? This cannot be undone.')) return;
  try {
    await window.IaApi.apiFetch('/api/reports/' + reportId, { method: 'DELETE' });
    window.IaApi.showToast('Report deleted.', 'success');
    clearEditMode();
    await loadReportsPage();
  } catch (err) {
    window.IaApi.showToast(err.message || 'Failed to delete report.', 'error');
  }
}

function startEditReport(report) {
  editingReportId = report.id;
  editingReportData = report;
  pendingUploadFiles = [];
  renderReportsPage();
  var el = document.getElementById('report-title');
  if (el) el.focus();
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function fileIconHtml(filename) {
  var ext = filename.split('.').pop().toLowerCase();
  var icons = { png: '\ud83d\uddbc\ufe0f', jpg: '\ud83d\uddbc\ufe0f', jpeg: '\ud83d\uddbc\ufe0f', gif: '\ud83d\uddbc\ufe0f', webp: '\ud83d\uddbc\ufe0f', pdf: '\ud83d\udcc4', doc: '\ud83d\udcdd', docx: '\ud83d\udcdd', xls: '\ud83d\udcca', xlsx: '\ud83d\udcca', ppt: '\ud83d\udcd1', pptx: '\ud83d\udcd1', zip: '\ud83d\udce6', rar: '\ud83d\udce6', txt: '\ud83d\udcc4' };
  return icons[ext] || '\ud83d\udcce';
}

/* Report upload zone helpers */
function initUploadZone() {
  var zone = document.getElementById('report-upload-zone');
  var input = document.getElementById('report-upload-input');
  if (!zone || !input) return;

  zone.onclick = function() { input.click(); };

  zone.ondragover = function(e) { e.preventDefault(); zone.classList.add('report-upload-dragover'); };
  zone.ondragleave = function() { zone.classList.remove('report-upload-dragover'); };
  zone.ondrop = function(e) {
    e.preventDefault();
    zone.classList.remove('report-upload-dragover');
    for (var i = 0; i < e.dataTransfer.files.length; i++) {
      pendingUploadFiles.push(e.dataTransfer.files[i]);
    }
    renderFileList();
  };

  input.onchange = function() {
    for (var i = 0; i < this.files.length; i++) {
      pendingUploadFiles.push(this.files[i]);
    }
    renderFileList();
    this.value = '';
  };
}

var _objectUrls = [];

function _revokeObjectUrls() {
  _objectUrls.forEach(function(url) { URL.revokeObjectURL(url); });
  _objectUrls = [];
}

function renderFileList() {
  var list = document.getElementById('report-file-list');
  if (!list) return;
  _revokeObjectUrls();
  if (pendingUploadFiles.length === 0) {
    list.innerHTML = '';
    return;
  }
  list.innerHTML = pendingUploadFiles.map(function(f, i) {
    var isImage = f.type && f.type.startsWith('image/');
    var thumbUrl = isImage ? URL.createObjectURL(f) : '';
    if (thumbUrl) _objectUrls.push(thumbUrl);
    var thumb = isImage
      ? '<div class="report-file-thumb"><img src="' + thumbUrl + '" /></div>'
      : '<div class="report-file-thumb report-file-thumb-doc"><span class="report-file-ext-icon">' + fileIconHtml(f.name) + '</span></div>';
    return '<div class="report-file-item">' +
      thumb +
      '<div class="report-file-info">' +
      '<span class="report-file-name">' + escapeHtml(f.name) + '</span>' +
      '<span class="report-file-size">' + formatFileSize(f.size) + '</span>' +
      '</div>' +
      '<button class="report-file-remove" data-idx="' + i + '">&times;</button>' +
    '</div>';
  }).join('');
  // Wire remove buttons
  list.querySelectorAll('.report-file-remove').forEach(function(btn) {
    btn.onclick = function() {
      var idx = parseInt(this.dataset.idx, 10);
      pendingUploadFiles.splice(idx, 1);
      renderFileList();
    };
  });
}

function renderAttachmentGallery(attachments) {
  if (!attachments || attachments.length === 0) return '';
  var imgs = [];
  var docs = [];
  attachments.forEach(function(a) {
    var isImg = a.type && a.type.startsWith('image/');
    if (isImg) { imgs.push(a); } else { docs.push(a); }
  });
  var html = '<div class="report-attachments">';
  if (imgs.length > 0) {
    html += '<div class="report-attach-label">\ud83d\uddbc\ufe0f Photos</div><div class="report-attach-grid">';
    imgs.forEach(function(a) {
      html += '<a href="' + escapeHtml(a.url) + '" target="_blank" class="report-attach-img" title="' + escapeHtml(a.name) + '">' +
        '<img src="' + escapeHtml(a.url) + '" loading="lazy" /></a>';
    });
    html += '</div>';
  }
  if (docs.length > 0) {
    html += '<div class="report-attach-label">\ud83d\udcc4 Documents</div><div class="report-attach-docs">';
    docs.forEach(function(a) {
      html += '<a href="' + escapeHtml(a.url) + '" target="_blank" class="report-attach-doc">' +
        '<span class="report-attach-doc-icon">' + fileIconHtml(a.name) + '</span>' +
        '<span class="report-attach-doc-name">' + escapeHtml(a.name) + '</span>' +
        '<span class="report-attach-doc-size">' + formatFileSize(a.size) + '</span>' +
      '</a>';
    });
    html += '</div>';
  }
  html += '</div>';
  return html;
}

function renderReportsPage() {
  var root = document.querySelector('[data-page-root]');
  if (!root || !reportsPageData) return;

  var data = reportsPageData;
  var isStudent = data.role === 'student';
  var isSupervisor = data.role === 'school_supervisor' || data.role === 'workplace_supervisor';
  var isEditing = editingReportId !== null;
  var user = window.IaApi.getStoredUser();

  // Stats
  var allReports = data.reports || [];
  var totalReports = allReports.length;
  var draftCount = allReports.filter(function(r) { return r.status === 'draft'; }).length;
  var submittedCount = allReports.filter(function(r) { return r.status === 'submitted'; }).length;
  var reviewedCount = allReports.filter(function(r) { return r.status === 'reviewed' || r.status === 'approved'; }).length;

  // Filter
  var filtered = reportsFilter === 'all' ? allReports : allReports.filter(function(r) { return r.status === reportsFilter; });

  // Form HTML
  var formHtml = '';
  if (isStudent && data.studentId) {
    var formTitle = isEditing ? escapeHtml(editingReportData.title || '') : '';
    var formWeek = isEditing ? (editingReportData.week || 1) : 1;
    var formContent = isEditing ? escapeHtml(editingReportData.content || '') : '';
    var existingAttachments = isEditing ? (editingReportData.attachments || []) : [];

    formHtml = '<div class="report-form-card">' +
      '<div class="report-form-header">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>' +
        (isEditing ? 'Edit Report' : 'New Report') +
      '</div>' +
      '<form id="report-submit-form" class="report-form-body">' +
        '<div class="report-form-row">' +
          '<div class="report-form-field report-form-field-grow">' +
            '<label for="report-title">Report Title</label>' +
            '<input type="text" id="report-title" name="title" value="' + formTitle + '" placeholder="e.g. Week 4 Progress Report" required />' +
          '</div>' +
          '<div class="report-form-field" style="max-width:120px">' +
            '<label for="report-week">Week</label>' +
            '<input type="number" id="report-week" name="week" min="1" max="52" value="' + formWeek + '" required />' +
          '</div>' +
        '</div>' +
        '<div class="report-form-field">' +
          '<label for="report-content">Report Content</label>' +
          '<textarea id="report-content" name="content" rows="5" placeholder="Describe your activities, achievements, challenges, and learning experiences this week." required>' + formContent + '</textarea>' +
        '</div>' +
        // Upload zone
        '<div class="report-form-field">' +
          '<label>Attachments (photos, documents — max 10 MB each)</label>' +
          '<div class="report-upload-zone" id="report-upload-zone">' +
            '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>' +
            '<p>Drag & drop files here or <span class="report-upload-link">click to browse</span></p>' +
            '<input type="file" id="report-upload-input" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" multiple hidden />' +
          '</div>' +
          '<div id="report-file-list"></div>' +
        '</div>' +
        // Existing attachments (edit mode)
        (existingAttachments.length > 0 ? '<div class="report-form-field"><label>Current Attachments</label>' + renderAttachmentGallery(existingAttachments) + '</div>' : '') +
        '<div class="report-form-actions">' +
          '<button class="btn btn-primary" type="submit">' + (isEditing ? 'Update Report' : 'Submit Report') + '</button>' +
          (isEditing ? '<button class="btn btn-outline" type="button" id="report-edit-cancel">Cancel</button>' : '') +
        '</div>' +
        '<p id="report-form-msg" class="text-muted" hidden></p>' +
      '</form>' +
    '</div>';
  }

  // Report cards
  var cardsHtml = filtered.length === 0
    ? '<div class="report-empty"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><h3>No reports found</h3><p class="text-muted">' + (reportsFilter !== 'all' ? 'No ' + reportsFilter + ' reports.' : (isStudent ? 'Create your first report above.' : 'No reports have been submitted yet.')) + '</p></div>'
    : filtered.map(function(r) {
        var date = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : (r.updatedAt ? new Date(r.updatedAt).toLocaleDateString() : '—');
        var preview = (r.content || '').substring(0, 250);
        var hasMore = (r.content || '').length > 250;
        var attachmentsHtml = renderAttachmentGallery(r.attachments);

        var actionsHtml = '';
        if (isStudent && r.status === 'draft') {
          actionsHtml = '<button class="btn btn-sm btn-outline report-card-edit" data-rid="' + escapeHtml(r.id) + '">Edit</button>' +
            '<button class="btn btn-sm btn-danger report-card-delete" data-rid="' + escapeHtml(r.id) + '">Delete</button>';
        }
        if (isSupervisor && (r.status === 'submitted' || r.status === 'reviewed')) {
          actionsHtml = '<button class="btn btn-sm btn-primary report-card-feedback" data-rid="' + escapeHtml(r.id) + '" data-rtitle="' + escapeHtml(r.title) + '">' +
            (r.feedback ? 'View Feedback' : 'Give Feedback') + '</button>';
        }

        var feedbackHtml = r.feedback ? '<div class="report-card-feedback-block"><div class="report-card-fb-label">\ud83d\udcac Feedback</div><p>' + escapeHtml(r.feedback) + '</p></div>' : '';

        return '<div class="report-card animate-in">' +
          '<div class="report-card-top">' +
            '<div class="report-card-status">' + renderStatusBadge(r.status) + '</div>' +
            '<div class="report-card-week">Week ' + (r.week || '—') + '</div>' +
            '<div class="report-card-date">' + date + '</div>' +
          '</div>' +
          '<h3 class="report-card-title">' + escapeHtml(r.title) + '</h3>' +
          '<div class="report-card-content">' + escapeHtml(preview) + (hasMore ? '<span class="report-card-more">... <button class="report-card-expand-btn">Read more</button></span>' : '') + '</div>' +
          attachmentsHtml +
          feedbackHtml +
          '<div class="report-card-bottom">' +
            '<div class="report-card-author">' + escapeHtml(r.student_name || '') + '</div>' +
            (actionsHtml ? '<div class="report-card-actions">' + actionsHtml + '</div>' : '') +
          '</div>' +
        '</div>';
      }).join('');

  root.innerHTML =
    // Hero
    '<div class="reports-hero">' +
      '<div class="reports-hero-shimmer"></div>' +
      '<div class="reports-hero-content">' +
        '<div class="reports-hero-text">' +
          '<h2 class="text-glow">Reports</h2>' +
          '<p>' + (isStudent ? 'Submit and manage your weekly attachment reports with photos and documents.' : (isSupervisor ? 'Review student reports and provide feedback.' : 'View all report submissions.')) + '</p>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Stats
    '<div class="stats-grid admin-stagger-children admin-revealed" style="margin-bottom:4px">' +
      '<div class="stat-card-ring stat-card-accent-total animate-in animate-in-d1">' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + totalReports + '" data-count-to="' + totalReports + '">' + totalReports + '</div><span class="stat-label">Total Reports</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-pending animate-in animate-in-d2">' +
        '<div class="stat-icon stat-icon-pending"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + draftCount + '" data-count-to="' + draftCount + '">' + draftCount + '</div><span class="stat-label">Drafts</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-submitted animate-in animate-in-d3">' +
        '<div class="stat-icon stat-icon-submitted"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + submittedCount + '" data-count-to="' + submittedCount + '">' + submittedCount + '</div><span class="stat-label">Submitted</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-completed animate-in animate-in-d4">' +
        '<div class="stat-icon stat-icon-reviewed"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + reviewedCount + '" data-count-to="' + reviewedCount + '">' + reviewedCount + '</div><span class="stat-label">Reviewed</span></div>' +
      '</div>' +
    '</div>' +

    // Form
    (formHtml ? formHtml.replace('<div class="report-form-card"', '<div class="report-form-card admin-reveal admin-reveal-scale"') : '') +

    // Filters
    '<div class="report-filters admin-reveal"><span class="report-filters-label">Filter:</span>' +
      ['all', 'draft', 'submitted', 'reviewed'].map(function(s) {
        var count = s === 'all' ? totalReports : (s === 'draft' ? draftCount : (s === 'submitted' ? submittedCount : reviewedCount));
        return '<button class="report-filter-chip' + (reportsFilter === s ? ' is-active' : '') + '" data-filter="' + s + '">' +
          s.charAt(0).toUpperCase() + s.slice(1) +
          ' <span class="report-filter-count">' + count + '</span>' +
        '</button>';
      }).join('') +
    '</div>' +

    // Report cards
    '<div id="report-cards-container" class="admin-reveal">' + cardsHtml + '</div>' +

    // Feedback modal (supervisors)
    (isSupervisor ? '' +
    '<div id="report-feedback-modal" class="modal-premium-overlay admin-reveal" hidden>' +
      '<div class="modal-premium modal-premium-wide">' +
        '<div class="modal-premium-header">' +
          '<h3>Feedback: <span id="report-feedback-title"></span></h3>' +
          '<button class="modal-premium-close" id="report-feedback-close">&times;</button>' +
        '</div>' +
        '<div class="modal-premium-body">' +
          '<div class="report-feedback-modal-icon">\ud83d\udcac</div>' +
          '<label for="report-feedback-text" class="report-feedback-label">Your Feedback</label>' +
          '<textarea id="report-feedback-text" rows="4" placeholder="Provide constructive feedback on this report\u2026"></textarea>' +
          '<div class="report-feedback-actions">' +
            '<button class="btn btn-primary" id="report-feedback-submit">\u2713 Submit Feedback</button>' +
            '<button class="btn btn-outline" id="report-feedback-cancel">Cancel</button>' +
          '</div>' +
          '<p id="report-feedback-msg" class="text-muted" hidden></p>' +
        '</div>' +
      '</div>' +
    '</div>' : '');

  // ── Wire up form ──────────────────────────────────────────────────
  var form = document.getElementById('report-submit-form');
  if (form) {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      var msg = document.getElementById('report-form-msg');
      var fd = new FormData();
      fd.append('title', document.getElementById('report-title').value);
      fd.append('week', document.getElementById('report-week').value);
      fd.append('content', document.getElementById('report-content').value);

      // Append pending files
      pendingUploadFiles.forEach(function(f) {
        fd.append('attachments', f);
      });

      if (isEditing && editingReportId) {
        try {
          await window.IaApi.apiFetch('/api/reports/' + editingReportId, {
            method: 'PUT',
            body: fd,
          });
          window.IaApi.showToast('Report updated!', 'success');
          if (msg) { msg.hidden = false; msg.textContent = 'Report updated successfully.'; }
          clearEditMode();
          await loadReportsPage();
        } catch (err) {
          window.IaApi.showToast(err.message || 'Failed to update report.', 'error');
          if (msg) { msg.hidden = false; msg.textContent = err.message; }
        }
      } else {
        // For new reports, include studentId
        fd.append('studentId', data.studentId);
        try {
          var created = await window.IaApi.apiFetch('/api/reports', {
            method: 'POST',
            body: fd,
          });
          if (created.report && created.report.id) {
            await window.IaApi.apiFetch('/api/reports/' + created.report.id + '/submit', {
              method: 'PUT',
            });
          }
          window.IaApi.showToast('Report submitted!', 'success');
          if (msg) { msg.hidden = false; msg.textContent = 'Report submitted successfully.'; }
          clearEditMode();
          await loadReportsPage();
        } catch (err) {
          window.IaApi.showToast(err.message || 'Failed to submit report.', 'error');
          if (msg) { msg.hidden = false; msg.textContent = err.message; }
        }
      }
    });
    var cancelBtn = document.getElementById('report-edit-cancel');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', function() {
        clearEditMode();
        renderReportsPage();
      });
    }
  }

  // ── Init upload zone ──────────────────────────────────────────────
  initUploadZone();
  renderFileList();

  // ── Filter chips ──────────────────────────────────────────────────
  document.querySelectorAll('.report-filter-chip').forEach(function(chip) {
    chip.addEventListener('click', function() {
      reportsFilter = this.dataset.filter;
      renderReportsPage();
    });
  });

  // ── Edit/Delete buttons ───────────────────────────────────────────
  document.querySelectorAll('.report-card-edit').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var rid = this.dataset.rid;
      var report = (data.reports || []).find(function(r) { return r.id === rid; });
      if (report) startEditReport(report);
    });
  });
  document.querySelectorAll('.report-card-delete').forEach(function(btn) {
    btn.addEventListener('click', function() {
      deleteDraftReport(this.dataset.rid);
    });
  });

  // ── Read more buttons ─────────────────────────────────────────────
  document.querySelectorAll('.report-card-expand-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var card = this.closest('.report-card');
      if (!card) return;
      card.classList.toggle('report-card-expanded');
      var contentEl = card.querySelector('.report-card-content');
      if (!contentEl) return;
      var fullContent = contentEl.getAttribute('data-full') || '';
      if (!fullContent) {
        var rid = card.querySelector('[data-rid]');
        if (rid) {
          var id = rid.dataset.rid;
          var report = (data.reports || []).find(function(r) { return r.id === id; });
          if (report) {
            fullContent = escapeHtml(report.content || '');
            contentEl.setAttribute('data-full', fullContent);
          }
        }
      }
      if (card.classList.contains('report-card-expanded') && fullContent) {
        contentEl.innerHTML = fullContent;
        btn.textContent = 'Show less';
      } else {
        var preview = (card.getAttribute('data-preview') || '');
        contentEl.innerHTML = escapeHtml(preview) + '<span class="report-card-more">... <button class="report-card-expand-btn">Read more</button></span>';
        btn.textContent = 'Read more';
      }
    });
  });

  // Save preview text on cards
  document.querySelectorAll('.report-card-content').forEach(function(el) {
    var card = el.closest('.report-card');
    if (card) card.setAttribute('data-preview', el.textContent.replace('... Read more', '').trim());
  });

  // ── Feedback modal (supervisor) ───────────────────────────────────
  if (isSupervisor) {
    var fbModal = document.getElementById('report-feedback-modal');
    var fbClose = document.getElementById('report-feedback-close');
    var fbCancel = document.getElementById('report-feedback-cancel');
    var fbSubmit = document.getElementById('report-feedback-submit');
    var fbText = document.getElementById('report-feedback-text');
    var fbTitle = document.getElementById('report-feedback-title');
    var fbMsg = document.getElementById('report-feedback-msg');
    var currentFbReportId = null;

    function openFeedbackModal(reportId, reportTitle, existingFeedback) {
      currentFbReportId = reportId;
      if (fbTitle) fbTitle.textContent = reportTitle;
      if (fbText) { fbText.value = existingFeedback || ''; fbText.focus(); }
      if (fbMsg) { fbMsg.hidden = true; fbMsg.textContent = ''; }
      if (fbModal) fbModal.hidden = false;
      if (fbSubmit) fbSubmit.dataset.rid = reportId;
    }

    function closeFeedbackModal() {
      if (fbModal) fbModal.hidden = true;
      currentFbReportId = null;
    }

    document.querySelectorAll('.report-card-feedback').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var rid = this.dataset.rid;
        var rtitle = this.dataset.rtitle;
        openFeedbackModal(rid, rtitle, '');
      });
    });

    if (fbClose) fbClose.addEventListener('click', closeFeedbackModal);
    if (fbCancel) fbCancel.addEventListener('click', closeFeedbackModal);
    if (fbModal) {
      fbModal.addEventListener('click', function(e) {
        if (e.target === fbModal) closeFeedbackModal();
      });
    }

    if (fbSubmit) {
      fbSubmit.addEventListener('click', async function(e) {
        e.stopPropagation();
        var reportId = this.dataset.rid || currentFbReportId;
        if (!reportId) {
          if (fbMsg) { fbMsg.hidden = false; fbMsg.textContent = 'No report selected. Please close and try again.'; }
          return;
        }
        var feedback = fbText ? fbText.value.trim() : '';
        if (!feedback) {
          if (fbMsg) { fbMsg.hidden = false; fbMsg.textContent = 'Please enter feedback.'; }
          return;
        }
        this.disabled = true;
        if (fbMsg) { fbMsg.hidden = false; fbMsg.textContent = 'Saving\u2026'; }
        try {
          var result = await window.IaApi.apiFetch('/api/reports/' + reportId + '/feedback', {
            method: 'PUT',
            body: { feedback: feedback },
          });
          window.IaApi.showToast('Feedback saved!', 'success');
          closeFeedbackModal();
          await loadReportsPage();
        } catch (err) {
          console.error('Feedback API error:', err);
          window.IaApi.showToast(err.message || 'Failed to save feedback.', 'error');
          if (fbMsg) {
            fbMsg.hidden = false;
            fbMsg.textContent = err.message || 'Failed to save feedback.';
          }
          this.disabled = false;
        }
      });
    } else {
      console.error('fbSubmit NOT FOUND — #report-feedback-submit missing from DOM');
    }
  }

  // ── Animate counters ──────────────────────────────────────────────
  setTimeout(function() { animateCounters(); }, 100);

  // Escape key
  document.removeEventListener('keydown', renderReportsPage._escHandler);
  var escHandler2 = function(e) {
    if (e.key !== 'Escape') return;
    if (isEditing) { clearEditMode(); renderReportsPage(); return; }
    var fm = document.getElementById('report-feedback-modal');
    if (fm && !fm.hidden) { fm.hidden = true; currentFbReportId = null; }
  };
  renderReportsPage._escHandler = escHandler2;
  document.addEventListener('keydown', escHandler2);
}

async function loadReportsPage() {
  const root = document.querySelector('[data-page-root]');
  if (!root) return;
  window.IaApi.showSkeleton(root, 'reports');

  try {
    const data = await window.IaApi.apiFetch('/api/dashboard/reports');
    reportsPageData = data;
    renderReportsPage();
  } catch (err) {
    window.IaApi.showError(root, err.message || 'Failed to load reports.');
  }
}

async function loadAnalyticsPage() {
  const root = document.querySelector('[data-page-root]');
  if (!root) return;
  window.IaApi.showSkeleton(root, 'analytics');

  try {
    const result = await window.IaApi.apiFetch('/api/dashboard/analytics') || {};
    const { analytics } = result;

  const totalStudents = analytics.totalStudents || 0;
  const activeStudents = analytics.activeStudents || 0;
  const pendingPlacements = analytics.pendingPlacements || 0;
  const completedStudents = analytics.completedStudents || 0;
  const droppedStudents = analytics.droppedStudents || 0;
  const avgProgress = analytics.averageProgress || 0;
  const avgAttendance = analytics.averageAttendance || 0;
  const totalReports = analytics.totalReports || 0;

  // Department distribution bars
  const deptBars = (analytics.departmentDistribution || []).map(function(d) {
    var pct = totalStudents > 0 ? Math.round((d.count / totalStudents) * 100) : 0;
    var colorClass = pct > 30 ? 'green' : (pct > 20 ? 'purple' : (pct > 10 ? 'amber' : ''));
    return '<div class="dist-bar">' +
      '<div class="dist-bar-label">' + escapeHtml(d.department) + '</div>' +
      '<div class="dist-bar-track"><div class="dist-bar-fill ' + colorClass + '" style="width:' + pct + '%">' + (pct > 12 ? pct + '%' : '') + '</div></div>' +
      '<div class="dist-bar-count">' + d.count + '</div>' +
    '</div>';
  }).join('') || '<p class="text-muted" style="padding:16px;text-align:center">No department data available.</p>';

  // Top placements
  const placementRows = (analytics.topPlacements || []).map(function(p) {
    var pct = totalStudents > 0 ? Math.round((p.count / totalStudents) * 100) : 0;
    var colorClass = pct > 25 ? 'green' : 'purple';
    return '<div class="dist-bar">' +
      '<div class="dist-bar-label">' + escapeHtml(p.company) + '</div>' +
      '<div class="dist-bar-track"><div class="dist-bar-fill ' + colorClass + '" style="width:' + pct + '%">' + (pct > 12 ? pct + '%' : '') + '</div></div>' +
      '<div class="dist-bar-count">' + p.count + '</div>' +
    '</div>';
  }).join('') || '<p class="text-muted" style="padding:16px;text-align:center">No placements yet.</p>';

  // Recent reports
  const reportRows = (analytics.recentReports || []).map(function(r) {
    var date = r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—';
    return '<tr>' +
      '<td><strong>' + escapeHtml(r.studentName) + '</strong></td>' +
      '<td>' + escapeHtml(r.title) + '</td>' +
      '<td>' + renderStatusBadge(r.status) + '</td>' +
      '<td>' + date + '</td>' +
    '</tr>';
  }).join('');

  root.innerHTML =
    // Premium Hero Banner
    '<div class="analytics-hero admin-reveal">' +
      '<div class="analytics-hero-shimmer"></div>' +
      '<div class="analytics-hero-content">' +
        '<div class="analytics-hero-icon">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>' +
        '</div>' +
        '<div class="analytics-hero-text">' +
          '<h2 class="text-glow">Program Analytics</h2>' +
          '<p>Comprehensive overview of the industrial attachment program.</p>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Premium Ring-Style Stat Cards
    '<div class="stats-grid admin-stagger-children admin-revealed" style="margin-bottom:4px">' +
      '<div class="stat-card-ring stat-card-accent-total animate-in animate-in-d1">' +
        '<div class="stat-icon stat-icon-students"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + totalStudents + '" data-count-to="' + totalStudents + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + totalStudents + '</div><span class="stat-label">Total Students</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-active-placement animate-in animate-in-d2">' +
        '<div class="stat-icon stat-icon-active"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + activeStudents + '" data-count-to="' + activeStudents + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + activeStudents + '</div><span class="stat-label">Active</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-pending animate-in animate-in-d3">' +
        '<div class="stat-icon stat-icon-pending"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + pendingPlacements + '" data-count-to="' + pendingPlacements + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + pendingPlacements + '</div><span class="stat-label">Pending</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-avg-progress animate-in animate-in-d4">' +
        '<div class="stat-icon stat-icon-progress"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + avgProgress + '" data-count-to="' + avgProgress + '" style="font-size:1.9rem;font-weight:800;line-height:1.1">' + avgProgress + '<span style="font-size:0.75em;font-weight:600;color:var(--muted)">%</span></div><span class="stat-label">Avg Progress</span></div>' +
      '</div>' +
    '</div>' +

    <!-- Premium Summary Blocks -->
    '<div class="form-premium admin-reveal admin-reveal-scale">' +
      '<div class="form-premium-title">' +
        '<span class="form-icon">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>' +
        '</span>' +
        'Program Summary' +
      '</div>' +
      '<div class="summary-blocks-premium">' +
        '<div class="summary-block-premium">' +
          '<div class="summary-block-premium-value count-blue">' + completedStudents + '</div>' +
          '<div class="summary-block-premium-label">Completed</div>' +
        '</div>' +
        '<div class="summary-block-premium">' +
          '<div class="summary-block-premium-value count-green">' + avgAttendance + '%</div>' +
          '<div class="summary-block-premium-label">Avg Attendance</div>' +
        '</div>' +
        '<div class="summary-block-premium">' +
          '<div class="summary-block-premium-value count-teal">' + totalReports + '</div>' +
          '<div class="summary-block-premium-label">Total Reports</div>' +
        '</div>' +
        '<div class="summary-block-premium">' +
          '<div class="summary-block-premium-value count-rose">' + droppedStudents + '</div>' +
          '<div class="summary-block-premium-label">Dropped / Inactive</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    <!-- 2-column: Departments + Top Placements -->
    '<div class="grid grid-2 admin-stagger-children admin-revealed" style="margin-bottom:24px">' +
      '<div class="form-premium admin-reveal admin-reveal-left" style="margin-bottom:0">' +
        '<div class="form-premium-title">' +
          '<span class="form-icon">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>' +
          '</span>' +
          'Students by Department' +
        '</div>' +
        '<div class="dist-bars-wrap">' + deptBars + '</div>' +
      '</div>' +
      '<div class="form-premium admin-reveal admin-reveal-right" style="margin-bottom:0">' +
        '<div class="form-premium-title">' +
          '<span class="form-icon">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          '</span>' +
          'Top Placement Companies' +
        '</div>' +
        '<div class="dist-bars-wrap">' + placementRows + '</div>' +
      '</div>' +
    '</div>' +

    <!-- Recent Reports -->
    '<div class="form-premium admin-reveal admin-reveal-scale" style="border-radius:var(--radius);overflow:hidden;padding:0">' +
      '<div class="form-premium-title" style="padding:20px 24px 0;margin-bottom:0">' +
        '<span class="form-icon">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
        '</span>' +
        'Recent Reports' +
      '</div>' +
      '<div class="table-premium-wrap" style="border:none;border-radius:0">' +
        '<table class="table-premium">' +
          '<thead><tr><th>Student</th><th>Title</th><th>Status</th><th>Submitted</th></tr></thead>' +
          '<tbody>' + (reportRows || '<tr><td colspan="4" style="text-align:center;padding:32px"><span class="text-muted">No reports submitted yet.</span></td></tr>') + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>';

  // Run animated counters
  setTimeout(function() { animateCounters(); }, 100);
  } catch (err) {
    window.IaApi.showError(root, err.message || 'Failed to load analytics.');
  }
}

/* ===== Profile Page (supports all roles, editable name + phone) ===== */
var profileData = null;

function getRoleGradient(role) {
  switch (role) {
    case 'admin': return 'linear-gradient(135deg, #0a1f3f 0%, #0F5570 40%, #1A6B8A 100%)';
    case 'school_supervisor': return 'linear-gradient(135deg, #0d9488 0%, #14b8a6 40%, #5eead4 100%)';
    case 'workplace_supervisor': return 'linear-gradient(135deg, #7c3aed 0%, #a855f7 40%, #c084fc 100%)';
    case 'student': return 'linear-gradient(135deg, #0a1f3f 0%, #0F5570 40%, #1A6B8A 100%)';
    default: return 'linear-gradient(135deg, #0F5570 0%, #1A6B8A 40%, #4DBDB5 100%)';
  }
}

function getRoleInitial(role) {
  switch (role) {
    case 'admin': return 'A';
    case 'school_supervisor': return 'S';
    case 'workplace_supervisor': return 'W';
    case 'student': return 'S';
    default: return 'U';
  }
}

function renderProfileView() {
  if (!profileData) return;
  const p = profileData;

  const roleFormatted = formatRole(p.role);
  const roleInitial = getRoleInitial(p.role);
  const roleGradient = getRoleGradient(p.role);

  // Main profile detail rows
  var profileRows = '' +
    '<div class="profile-detail">' +
      '<div class="profile-detail-icon email"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>' +
      '<div><div class="profile-detail-label">Email</div><div class="profile-detail-value">' + escapeHtml(p.email) + '</div></div>' +
    '</div>' +
    '<div class="profile-detail">' +
      '<div class="profile-detail-icon phone"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg></div>' +
      '<div><div class="profile-detail-label">Phone</div><div class="profile-detail-value">' + escapeHtml(p.phoneNumber || '—') + '</div></div>' +
    '</div>';

  // Student-specific details
  let studentSection = '';
  if (p.student) {
    var s = p.student;
    profileRows += '' +
      '<div class="profile-detail">' +
        '<div class="profile-detail-icon student-id"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg></div>' +
        '<div><div class="profile-detail-label">Student ID</div><div class="profile-detail-value">' + escapeHtml(s.studentId || '—') + '</div></div>' +
      '</div>' +
      '<div class="profile-detail">' +
        '<div class="profile-detail-icon dept"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg></div>' +
        '<div><div class="profile-detail-label">Department</div><div class="profile-detail-value">' + escapeHtml(s.department || '—') + '</div></div>' +
      '</div>' +
      '<div class="profile-detail">' +
        '<div class="profile-detail-icon company"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>' +
        '<div><div class="profile-detail-label">Company</div><div class="profile-detail-value">' + escapeHtml(s.company || '—') + '</div></div>' +
      '</div>';

    studentSection = '' +
      '<div class="form-premium" style="margin-bottom:0">' +
        '<div class="form-premium-title">' +
          '<span class="form-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></span>' +
          'Academic Progress' +
        '</div>' +
        '<div class="grid-2-responsive" style="gap:20px">' +
          '<div>' +
            '<div class="profile-detail-label">Overall Progress</div>' +
            '<div class="profile-progress-row">' +
              '<div class="profile-progress-track"><div class="profile-progress-fill" style="width:' + (s.progress || 0) + '%"></div></div>' +
              '<span class="profile-progress-value">' + (s.progress || 0) + '%</span>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="profile-detail-label">Attendance</div>' +
            '<div class="profile-progress-row">' +
              '<div class="profile-progress-track"><div class="profile-progress-fill green" style="width:' + (s.attendance || 0) + '%"></div></div>' +
              '<span class="profile-progress-value">' + (s.attendance || 0) + '%</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '</div>' +
      '</div>';
  }

  const root = document.querySelector('[data-page-root]');
  if (!root) return;

  root.innerHTML =
    // Premium Hero Banner (role-appropriate gradient)
    '<div class="profile-hero admin-reveal" style="background:' + roleGradient + '">' +
      '<div class="profile-hero-shimmer"></div>' +
      '<div class="profile-hero-content">' +
        '<div class="profile-hero-avatar">' + roleInitial + '</div>' +
        '<div class="profile-hero-text">' +
          '<h2>' + escapeHtml(p.name) + '</h2>' +
          '<p>Your personal profile and account settings</p>' +
          '<div class="profile-hero-role-badge">' + escapeHtml(roleFormatted) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Profile Details
    '<div class="form-premium admin-reveal admin-reveal-scale">' +
      '<div class="form-premium-title">' +
        '<span class="form-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>' +
        'Contact Information' +
      '</div>' +
      '<div class="profile-grid-premium">' +
        profileRows +
      '</div>' +
      '<div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">' +
        '<button class="btn btn-primary" id="profile-edit-btn">Edit Profile</button>' +
      '</div>' +
    '</div>' +

    // Student Academic Progress
    studentSection;

  document.getElementById('profile-edit-btn')?.addEventListener('click', renderProfileEditForm);
}

function renderProfileEditForm() {
  if (!profileData) return;
  const p = profileData;
  const root = document.querySelector('[data-page-root]');
  if (!root) return;

  const roleFormatted = formatRole(p.role);
  const roleInitial = getRoleInitial(p.role);
  const roleGradient = getRoleGradient(p.role);
  var nameVal = escapeHtml(p.name || '');
  var phoneVal = escapeHtml(p.phoneNumber || '');

  root.innerHTML =
    // Premium Hero Banner (same as view)
    '<div class="profile-hero" style="background:' + roleGradient + '">' +
      '<div class="profile-hero-shimmer"></div>' +
      '<div class="profile-hero-content">' +
        '<div class="profile-hero-avatar">' + roleInitial + '</div>' +
        '<div class="profile-hero-text">' +
          '<h2>' + escapeHtml(p.name) + '</h2>' +
          '<p>Edit your profile information</p>' +
          '<div class="profile-hero-role-badge">' + escapeHtml(roleFormatted) + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Edit Form
    '<div class="form-premium">' +
      '<div class="form-premium-title">' +
        '<span class="form-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span>' +
        'Edit Profile' +
      '</div>' +
      '<form id="profile-edit-form" class="profile-edit-form">' +
        '<div>' +
          '<label for="edit-name">Full Name</label>' +
          '<input type="text" id="edit-name" name="name" value="' + nameVal + '" required />' +
        '</div>' +
        '<div>' +
          '<label for="edit-phone">Phone Number</label>' +
          '<input type="tel" id="edit-phone" name="phoneNumber" value="' + phoneVal + '" placeholder="+233 XX XXX XXXX" />' +
        '</div>' +
        '<div class="form-full">' +
          '<label>Email</label>' +
          '<input type="email" value="' + escapeHtml(p.email) + '" disabled class="readonly-field" />' +
        '</div>' +
        '<div class="form-full">' +
          '<label>Role</label>' +
          '<input type="text" value="' + escapeHtml(roleFormatted) + '" disabled class="readonly-field" />' +
        '</div>' +
        '<div class="form-full" style="display:flex;gap:12px;margin-top:8px">' +
          '<button class="btn btn-primary" type="submit" id="profile-save-btn">Save Changes</button>' +
          '<button class="btn btn-outline" type="button" id="profile-cancel-btn">Cancel</button>' +
        '</div>' +
        '<p id="profile-form-msg" class="text-muted" hidden style="margin-top:12px"></p>' +
      '</form>' +
    '</div>';

  document.getElementById('profile-cancel-btn')?.addEventListener('click', function () {
    renderProfileView();
  });

  document.getElementById('profile-edit-form')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    const msg = document.getElementById('profile-form-msg');
    const saveBtn = document.getElementById('profile-save-btn');
    if (saveBtn) saveBtn.disabled = true;
    if (msg) { msg.hidden = true; msg.textContent = ''; }

    try {
      const form = document.getElementById('profile-edit-form');
      const formData = new FormData(form);
      const body = {
        name: formData.get('name'),
        phoneNumber: formData.get('phoneNumber'),
      };

      await window.IaApi.apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: body,
      });

      window.IaApi.showToast('Profile updated successfully!', 'success');
      // Refresh profile data and re-render view
      const fresh = await window.IaApi.apiFetch('/api/dashboard/profile');
      profileData = fresh.profile;
      renderProfileView();
    } catch (err) {
      window.IaApi.showToast(err.message || 'Failed to update profile.', 'error');
      if (msg) {
        msg.hidden = false;
        msg.textContent = err.message || 'Failed to update profile.';
      }
      if (saveBtn) saveBtn.disabled = false;
    }
  });
}

async function loadProfilePage() {
  const root = document.querySelector('[data-page-root]');
  if (!root) return;
  window.IaApi.showSkeleton(root, 'profile');

  try {
    const fresh = await window.IaApi.apiFetch('/api/dashboard/profile');
    profileData = fresh.profile;
    renderProfileView();
  } catch (err) {
    window.IaApi.showError(root, err.message || 'Failed to load profile.');
  }
}

/* ===== Evaluations Page (supervisor/admin evaluation scoring) ===== */
var evaluationsPageData = null;

/* ===== Student-specific evaluations view ===== */
var studentEvalData = null;

async function loadStudentEvaluations(root) {
  try {
    var profileRes = await window.IaApi.apiFetch('/api/dashboard/profile');
    var profile = profileRes.profile || {};
    var student = profile.student || {};
    var studentDocId = student.id;

    if (!studentDocId) {
      root.innerHTML = '<div class="card card-full" style="text-align:center;padding:48px 24px;">' +
        '<div style="font-size:48px;margin-bottom:16px;">📋</div>' +
        '<h2>No Student Profile</h2>' +
        '<p class="text-muted">Your student profile has not been set up yet. Please contact your administrator.</p></div>';
      return;
    }

    var [evalsRes, summaryRes] = await Promise.all([
      window.IaApi.apiFetch('/api/evaluations/student/' + studentDocId),
      window.IaApi.apiFetch('/api/evaluations/student/' + studentDocId + '/summary'),
    ]);

    var evaluations = evalsRes.evaluations || [];
    var summary = summaryRes.summary || {};
    studentEvalData = { evaluations, summary };
    renderStudentEvaluations(root, evaluations, summary);
  } catch (err) {
    window.IaApi.showToast(err.message || 'Failed to load evaluations.', 'error');
    if (root) window.IaApi.showError(root, err.message || 'Failed to load evaluations.');
  }
}

function renderStudentEvaluations(root, evaluations, summary) {
  var totalEvals = evaluations.length;
  var avgScore = summary.averageScore ? Math.round(summary.averageScore) : 0;
  var byCategory = summary.byCategory || {};
  var categoryKeys = Object.keys(byCategory);
  var userName = (window.IaApi.getStoredUser() || {}).name || 'Student';

  var CATEGORY_META = {
    technical: { icon: '&#9881;', label: 'Technical Skills', color: '#2563eb', bg: '#dbeafe' },
    soft_skills: { icon: '&#128101;', label: 'Soft Skills', color: '#7c3aed', bg: '#ede9fe' },
    work_ethic: { icon: '&#128170;', label: 'Work Ethic', color: '#059669', bg: '#d1fae5' },
    communication: { icon: '&#128172;', label: 'Communication', color: '#0d9488', bg: '#ccfbf1' },
    teamwork: { icon: '&#129309;', label: 'Teamwork', color: '#d97706', bg: '#fef3c7' },
    punctuality: { icon: '&#9200;', label: 'Punctuality', color: '#dc2626', bg: '#fee2e2' },
    initiative: { icon: '&#128640;', label: 'Initiative', color: '#1A6B8A', bg: '#e5efff' },
    overall: { icon: '&#11088;', label: 'Overall Performance', color: '#7c3aed', bg: '#ede9fe' },
  };

  function getScoreColor(score) {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#2563eb';
    if (score >= 40) return '#d97706';
    return '#dc2626';
  }

  function getEvalScoreClass(score) {
    if (score >= 75) return 'eval-score-high';
    if (score >= 55) return 'eval-score-medium';
    if (score >= 35) return 'eval-score-low';
    return 'eval-score-poor';
  }

  function formatDate(d) {
    if (!d) return '&mdash;';
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch (e) { return '&mdash;'; }
  }

  // Latest score
  var latestScore = evaluations.length > 0
    ? evaluations.reduce(function(a, b) { return new Date(a.createdAt || 0) > new Date(b.createdAt || 0) ? a : b; })
    : null;
  var latestScoreValue = latestScore ? Number(latestScore.score) : 0;

  // Score color class for avg
  var scoreColorClass = avgScore >= 80 ? 'stat-value-score-high' : (avgScore >= 60 ? 'stat-value-score-medium' : (avgScore >= 40 ? 'stat-value-score-warning' : 'stat-value-score-low'));

  // Category cards
  var categoryCards = categoryKeys.length > 0
    ? categoryKeys.map(function(key) {
        var info = byCategory[key];
        var avg = Math.round(info.average);
        var meta = CATEGORY_META[key] || { icon: '&#9632;', label: key.replace(/_/g, ' '), color: '#64748b', bg: '#f1f5f9' };
        return '<div class="category-card">' +
          '<div class="category-card-icon" style="background:' + meta.bg + ';color:' + meta.color + '">' + meta.icon + '</div>' +
          '<div class="category-card-value" style="color:' + getScoreColor(avg) + '">' + avg + '%</div>' +
          '<div class="category-card-label">' + escapeHtml(meta.label) + '</div>' +
        '</div>';
      }).join('')
    : '<p class="text-muted" style="grid-column:1/-1;text-align:center;padding:16px">No category data yet.</p>';

  // Evaluation cards
  var evalCards = evaluations.length === 0
    ? '<div class="evals-empty"><div class="evals-empty-icon">&#x2b50;</div><h3>No evaluations yet</h3><p class="text-muted">Supervisors will evaluate your performance here.</p></div>'
    : evaluations.slice().sort(function(a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); }).map(function(e) {
        var score = Number(e.score) || 0;
        var dateStr = formatDate(e.createdAt);
        var meta = CATEGORY_META[e.category] || { label: e.category || 'Evaluation', color: '#64748b' };
        return '<div class="eval-card-item" onclick="this.classList.toggle(\'eval-card-expanded\')">' +
          '<div class="eval-card-header">' +
            '<div class="eval-score-badge ' + getEvalScoreClass(score) + '">' + score + '</div>' +
            '<div class="eval-card-info">' +
              '<div class="eval-category-label">' + escapeHtml(meta.label) + '</div>' +
              '<div class="eval-category-sub">Score: ' + score + '/100 &middot; ' + dateStr + '</div>' +
            '</div>' +
            '<div class="eval-card-expand-icon">' +
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>' +
            '</div>' +
          '</div>' +
          (e.comment ? '<div class="eval-card-body"><div class="eval-card-comment">' + escapeHtml(e.comment) + '</div></div>' : '') +
        '</div>';
      }).join('');

  root.innerHTML = '' +
    '<div class="evals-hero">' +
      '<div class="evals-hero-shimmer"></div>' +
      '<div class="evals-hero-content">' +
        '<div class="evals-hero-text">' +
          '<h2 class="text-glow">My Evaluations</h2>' +
          '<p>View your performance evaluations from supervisors.</p>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="stats-grid" style="margin-bottom:4px">' +
      '<div class="stat-card-ring stat-card-accent-total animate-in animate-in-d1">' +
        '<div class="stat-icon stat-icon-students"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + totalEvals + '">' + totalEvals + '</div><span class="stat-label">Evaluations</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-avg-progress animate-in animate-in-d2">' +
        '<div class="stat-icon stat-icon-active"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value ' + scoreColorClass + '" data-target="' + avgScore + '">' + avgScore + '</div><span class="stat-label">Average Score</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-pending animate-in animate-in-d3">' +
        '<div class="stat-icon stat-icon-pending"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + categoryKeys.length + '">' + categoryKeys.length + '</div><span class="stat-label">Categories</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-evals animate-in animate-in-d4">' +
        '<div class="stat-icon stat-icon-progress"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value ' + (latestScoreValue >= 80 ? 'stat-value-score-high' : latestScoreValue >= 60 ? 'stat-value-score-medium' : latestScoreValue >= 40 ? 'stat-value-score-warning' : 'stat-value-score-low') + '" data-target="' + latestScoreValue + '">' + latestScoreValue + '</div><span class="stat-label">Latest Score</span></div>' +
      '</div>' +
    '</div>' +

    (categoryKeys.length > 0 ? '<div class="form-premium">' +
      '<div class="form-premium-title">' +
        '<span class="form-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>' +
        'Performance by Category' +
      '</div>' +
      '<div class="category-grid">' + categoryCards + '</div>' +
    '</div>' : '') +

    '<div class="form-premium" style="padding-top:20px">' +
      '<div class="form-premium-title">' +
        '<span class="form-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></span>' +
        'All Evaluations' +
      '</div>' +
      '<div class="evaluations-list">' + evalCards + '</div>' +
      '<div style="margin-top:16px"><a href="/dashboard/student" class="btn btn-secondary btn-sm">&larr; Back to Dashboard</a></div>' +
    '</div>';

  // Animate counters
  setTimeout(function() {
    var els = document.querySelectorAll('.stat-card-ring .stat-value-anim');
    els.forEach(function(el) {
      var target = parseInt(el.getAttribute('data-target'), 10);
      if (isNaN(target)) return;
      el.textContent = '0';
      var duration = 800;
      var start = performance.now();
      function step(now) {
        var elapsed = now - start;
        var p = Math.min(elapsed / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(eased * target);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, 100);
}

async function loadEvaluationsPage() {
  const root = document.querySelector('[data-page-root]');
  if (!root) return;
  window.IaApi.showSkeleton(root, 'evaluations');

  try {
    var user = window.IaApi.getStoredUser();
    var role = (user && user.role) || '';

    // Student sees only their own evaluations
    if (role === 'student') {
      await loadStudentEvaluations(root);
      return;
    }

    var isAdmin = role === 'admin';
    var isSchoolSupervisor = role === 'school_supervisor';
    var isWorkplaceSupervisor = role === 'workplace_supervisor';
    var isSupervisor = isSchoolSupervisor || isWorkplaceSupervisor;

    var students;
    if (isAdmin) {
      var data = await window.IaApi.apiFetch('/api/admin/students/all');
      students = data.students || [];
    } else {
      var data = await window.IaApi.apiFetch('/api/dashboard/students');
      students = data.students || [];
    }

    // Fetch evaluations for each student (parallel)
    var studentEvals = {};
    var allEvals = [];
    var evalPromises = students.map(async function(s) {
      try {
        var res = await window.IaApi.apiFetch('/api/evaluations/student/' + s.id);
        var evals = res.evaluations || [];
        studentEvals[s.id] = evals;
        allEvals = allEvals.concat(evals);
      } catch (e) {
        studentEvals[s.id] = [];
      }
    });
    await Promise.all(evalPromises);

    evaluationsPageData = {
      students: students,
      studentEvals: studentEvals,
      allEvals: allEvals,
      role: role,
      isAdmin: isAdmin,
      isSupervisor: isSupervisor,
    };

    renderEvaluationsPage();
  } catch (err) {
    window.IaApi.showToast(err.message || 'Failed to load evaluations.', 'error');
    var root2 = document.querySelector('[data-page-root]');
    if (root2) window.IaApi.showError(root2, err.message || 'Failed to load evaluations.');
  }
}

function renderEvaluationsPage() {
  var root = document.querySelector('[data-page-root]');
  if (!root || !evaluationsPageData) return;

  var data = evaluationsPageData;
  var students = data.students || [];
  var studentEvals = data.studentEvals || {};
  var allEvals = data.allEvals || [];
  var isAdmin = data.isAdmin;
  var isSupervisor = data.isSupervisor;
  var role = data.role;

  // Stats
  var totalStudents = students.length;
  var evaluatedCount = 0;
  var totalScoreSum = 0;
  var totalEvalCount = allEvals.length;
  var categoryCounts = {};
  var categoryScores = {};
  for (var sid in studentEvals) {
    var evals = studentEvals[sid];
    if (evals && evals.length > 0) {
      evaluatedCount++;
      for (var j = 0; j < evals.length; j++) {
        totalScoreSum += Number(evals[j].score || 0);
        var cat = evals[j].category || 'other';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        if (!categoryScores[cat]) categoryScores[cat] = { sum: 0, count: 0 };
        categoryScores[cat].sum += Number(evals[j].score || 0);
        categoryScores[cat].count++;
      }
    }
  }
  var avgScore = totalEvalCount > 0 ? Math.round(totalScoreSum / totalEvalCount) : 0;
  var needingEval = totalStudents - evaluatedCount;

  // Score color class for avg
  var scoreColorClass = avgScore >= 80 ? 'stat-value-score-high' : (avgScore >= 60 ? 'stat-value-score-medium' : (avgScore >= 40 ? 'stat-value-score-warning' : 'stat-value-score-low'));

  // Category icons and colors
  var CATEGORY_META = {
    technical: { icon: '&#9881;', color: '#2563eb', bg: '#dbeafe' },
    soft_skills: { icon: '&#128101;', color: '#7c3aed', bg: '#ede9fe' },
    work_ethic: { icon: '&#128170;', color: '#059669', bg: '#d1fae5' },
    communication: { icon: '&#128172;', color: '#0d9488', bg: '#ccfbf1' },
    teamwork: { icon: '&#129309;', color: '#d97706', bg: '#fef3c7' },
    punctuality: { icon: '&#9200;', color: '#dc2626', bg: '#fee2e2' },
    initiative: { icon: '&#128640;', color: '#1A6B8A', bg: '#e5efff' },
    overall: { icon: '&#11088;', color: '#7c3aed', bg: '#ede9fe' },
  };

  // Category labels
  var CATEGORIES = {
    technical: 'Technical Skills',
    soft_skills: 'Soft Skills',
    work_ethic: 'Work Ethic',
    communication: 'Communication',
    teamwork: 'Teamwork',
    punctuality: 'Punctuality',
    initiative: 'Initiative',
    overall: 'Overall Performance',
  };

  function getScoreColor(score) {
    if (score >= 80) return '#059669';
    if (score >= 60) return '#2563eb';
    if (score >= 40) return '#d97706';
    return '#dc2626';
  }

  function formatCategory(cat) {
    return CATEGORIES[cat] || escapeHtml(cat);
  }

  function formatDate(d) {
    if (!d) return '&mdash;';
    try { return new Date(d).toLocaleDateString(); } catch (e) { return '&mdash;'; }
  }

  // Build table
  var rows = students.length === 0
    ? '<tr><td colspan="8" style="text-align:center;padding:32px"><span class="text-muted">No students assigned yet.</span></td></tr>'
    : students.map(function(s) {
        var evals = studentEvals[s.id] || [];
        var evalCount = evals.length;
        var avg = evalCount > 0 ? Math.round(evals.reduce(function(sum, e) { return sum + Number(e.score || 0); }, 0) / evalCount) : null;
        var latest = evalCount > 0 ? evals.reduce(function(a, b) { return new Date(a.createdAt || 0) > new Date(b.createdAt || 0) ? a : b; }) : null;

        var scoreDisplay = avg !== null
          ? '<span class="eval-score-premium ' + getScorePremiumClass(avg) + '">' + avg + '%</span>'
          : '<span class="text-muted">&mdash;</span>';

        var latestDisplay = latest
          ? '<span class="eval-score-premium ' + getScorePremiumClass(latest.score) + '">' + latest.score + '%</span>'
          : '<span class="text-muted">&mdash;</span>';

        var actionsHtml = '';
        if (isSupervisor) {
          actionsHtml = '<button class="btn btn-xs btn-primary eval-evaluate-btn" data-sid="' + escapeHtml(s.id) + '" data-sname="' + escapeHtml(s.name || '') + '">Evaluate</button>';
        }

        return '<tr>' +
          '<td><strong>' + escapeHtml(s.name || 'Unknown') + '</strong></td>' +
          '<td>' + escapeHtml(s.department || '&mdash;') + '</td>' +
          '<td>' + escapeHtml(s.workplace || s.company || '&mdash;') + '</td>' +
          '<td style="text-align:center">' + evalCount + '</td>' +
          '<td style="text-align:center">' + scoreDisplay + '</td>' +
          '<td style="text-align:center">' + latestDisplay + '</td>' +
          '<td>' + actionsHtml + '</td>' +
        '</tr>';
      }).join('');

  function getScorePremiumClass(score) {
    if (score >= 80) return 'eval-score-premium-high';
    if (score >= 60) return 'eval-score-premium-medium';
    if (score >= 40) return 'eval-score-premium-warning';
    return 'eval-score-premium-low';
  }

  root.innerHTML =
    // Premium Hero Banner
    '<div class="evals-hero admin-reveal">' +
      '<div class="evals-hero-shimmer"></div>' +
      '<div class="evals-hero-content">' +
        '<div class="evals-hero-text">' +
          '<h2 class="text-glow">Evaluations</h2>' +
          '<p>' + (isAdmin ? 'Overview of all student evaluations across the program.' : 'Score your assigned students across multiple categories.') + '</p>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // Premium Stat Cards (ring style) — with "Needs Eval" and colored avg score
    '<div class="stats-grid admin-stagger-children admin-revealed" style="margin-bottom:4px">' +
      '<div class="stat-card-ring stat-card-accent-total animate-in animate-in-d1">' +
        '<div class="stat-icon stat-icon-students"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + totalStudents + '" data-count-to="' + totalStudents + '">' + totalStudents + '</div><span class="stat-label">Students</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-avg-progress animate-in animate-in-d2">' +
        '<div class="stat-icon stat-icon-active"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + evaluatedCount + '" data-count-to="' + evaluatedCount + '">' + evaluatedCount + '</div><span class="stat-label">Evaluated</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-pending animate-in animate-in-d3">' +
        '<div class="stat-icon stat-icon-pending"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value" data-target="' + needingEval + '" data-count-to="' + needingEval + '">' + needingEval + '</div><span class="stat-label">Needs Evaluation</span></div>' +
      '</div>' +
      '<div class="stat-card-ring stat-card-accent-evals animate-in animate-in-d4">' +
        '<div class="stat-icon stat-icon-progress"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>' +
        '<div class="stat-body"><div class="stat-value-anim stat-value ' + scoreColorClass + '" data-target="' + avgScore + '" data-count-to="' + avgScore + '">' + avgScore + '</div><span class="stat-label">Avg Score</span></div>' +
      '</div>' +
    '</div>' +

    // Category Breakdown (show avg scores per category when data exists)
    (function() {
      var catHtml = '';
      var catCount = 0;
      for (var catKey in categoryScores) {
        var info = categoryScores[catKey];
        var avg = Math.round(info.sum / info.count);
        var meta = CATEGORY_META[catKey] || { icon: '&#9632;', color: '#64748b', bg: '#f1f5f9' };
        catHtml += '<div class="category-card">' +
          '<div class="category-card-icon" style="background:' + meta.bg + ';color:' + meta.color + '">' + meta.icon + '</div>' +
          '<div class="category-card-value" style="color:' + (avg >= 80 ? '#059669' : avg >= 60 ? '#2563eb' : avg >= 40 ? '#d97706' : '#dc2626') + '">' + avg + '%</div>' +
          '<div class="category-card-label">' + formatCategory(catKey) + '</div>' +
        '</div>';
        catCount++;
      }
      return catCount > 0 ? '<div class="form-premium admin-reveal admin-reveal-scale">' +
        '<div class="form-premium-title">' +
          '<span class="form-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></span>' +
          'Performance by Category' +
        '</div>' +
        '<div class="category-grid">' + catHtml + '</div>' +
      '</div>' : '';
    })() +

    // Premium Table
    '<div class="form-premium admin-reveal" style="border-radius:var(--radius);overflow:hidden;padding:0">' +
      '<div class="table-premium-wrap">' +
        '<table class="table-premium">' +
          '<thead><tr><th>Student</th><th>Department</th><th>Company</th><th style="text-align:center">Evals</th><th style="text-align:center">Avg Score</th><th style="text-align:center">Latest</th>' + (isSupervisor ? '<th>Actions</th>' : '') + '</tr></thead>' +
          '<tbody>' + rows + '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +

    // Evaluation Modal (supervisor only)
    (isSupervisor ? '' +
    '<div id="eval-modal" class="modal-premium-overlay" hidden>' +
      '<div class="modal-premium modal-premium-wide">' +
        '<div class="modal-premium-header">' +
          '<h3>Evaluate — <span id="eval-student-name"></span></h3>' +
          '<button class="modal-premium-close" id="eval-modal-close">&times;</button>' +
        '</div>' +
        '<div class="modal-premium-body">' +
          // History section
          '<div class="form-premium" style="margin-bottom:20px;padding:16px 18px">' +
            '<div class="form-premium-title" style="border:none;padding:0;margin-bottom:10px;font-size:0.9rem">' +
              '<span class="form-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>' +
              'Evaluation History' +
            '</div>' +
            '<div id="eval-history-list" style="max-height:220px;overflow-y:auto">' +
              '<p class="text-muted" style="padding:12px;text-align:center">Loading history&hellip;</p>' +
            '</div>' +
          '</div>' +
          // Form section
          '<h4 style="margin:0 0 16px;font-size:0.95rem;font-weight:700;color:var(--text-primary)">New Evaluation</h4>' +
          '<form id="eval-form">' +
            '<div class="grid-2-responsive" style="gap:14px">' +
              '<div><label for="eval-category" style="font-weight:600;font-size:0.8rem;display:block;margin-bottom:6px;color:var(--text-primary)">Category *</label>' +
                '<select id="eval-category" class="form-select-premium" required>' +
                  '<option value="">Select category&hellip;</option>' +
                  '<option value="technical">Technical Skills</option>' +
                  '<option value="soft_skills">Soft Skills</option>' +
                  '<option value="work_ethic">Work Ethic</option>' +
                  '<option value="communication">Communication</option>' +
                  '<option value="teamwork">Teamwork</option>' +
                  '<option value="punctuality">Punctuality</option>' +
                  '<option value="initiative">Initiative</option>' +
                  '<option value="overall">Overall Performance</option>' +
                '</select></div>' +
              '<div><label for="eval-score" style="font-weight:600;font-size:0.8rem;display:block;margin-bottom:6px;color:var(--text-primary)">Score: <span id="eval-score-display" style="font-weight:800">50</span>/100</label>' +
                '<input type="range" id="eval-score" min="0" max="100" value="50" step="1" class="eval-slider-medium" style="width:100%" />' +
                '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-top:4px"><span>0</span><span>50</span><span>100</span></div></div>' +
            '</div>' +
            '<div style="margin-top:16px"><label for="eval-comment" style="font-weight:600;font-size:0.8rem;display:block;margin-bottom:6px;color:var(--text-primary)">Comment (optional)</label>' +
              '<textarea id="eval-comment" rows="3" placeholder="Add notes or observations about this evaluation&hellip;" class="form-textarea-premium"></textarea></div>' +
            '<div style="display:flex;gap:12px;margin-top:20px">' +
              '<button class="btn btn-primary" type="submit">Submit Evaluation</button>' +
              '<button class="btn btn-outline" type="button" id="eval-cancel">Cancel</button>' +
            '</div>' +
            '<p id="eval-msg" class="text-muted" hidden style="margin-top:12px"></p>' +
          '</form>' +
        '</div>' +
      '</div>' +
    '</div>' : '');

  // Run animated counters
  setTimeout(function() { animateCounters(); }, 100);

  // ── Wire up Evaluate buttons ────────────────────────────────────────
  if (isSupervisor) {
    var evalModal = document.getElementById('eval-modal');
    var evalClose = document.getElementById('eval-modal-close');
    var evalCancel = document.getElementById('eval-cancel');
    var evalForm = document.getElementById('eval-form');
    var evalMsg = document.getElementById('eval-msg');
    var evalCategory = document.getElementById('eval-category');
    var evalScore = document.getElementById('eval-score');
    var evalScoreDisplay = document.getElementById('eval-score-display');
    var evalComment = document.getElementById('eval-comment');
    var evalHistoryList = document.getElementById('eval-history-list');
    var evalStudentName = document.getElementById('eval-student-name');
    var currentEvalStudentId = null;

    // Score slider live display + dynamic color
    function updateEvalSliderColor(val) {
      var num = parseInt(val, 10);
      var cls = '';
      if (num >= 80) cls = 'eval-slider-high';
      else if (num >= 60) cls = 'eval-slider-medium';
      else if (num >= 40) cls = 'eval-slider-warning';
      else cls = 'eval-slider-low';
      // Remove all color classes and add the right one
      evalScore.className = evalScore.className.replace(/eval-slider-\w+/g, '').trim();
      if (cls) evalScore.classList.add(cls);
      // Update display color
      if (evalScoreDisplay) {
        evalScoreDisplay.textContent = val;
        evalScoreDisplay.style.color = num >= 80 ? '#059669' : num >= 60 ? '#2563eb' : num >= 40 ? '#d97706' : '#dc2626';
      }
    }

    if (evalScore && evalScoreDisplay) {
      updateEvalSliderColor(evalScore.value);
      evalScore.addEventListener('input', function() {
        updateEvalSliderColor(this.value);
      });
    }

    function openEvalModal(studentId, studentName) {
      currentEvalStudentId = studentId;
      if (evalStudentName) evalStudentName.textContent = studentName;
      if (evalForm) evalForm.reset();
      if (evalScoreDisplay) evalScoreDisplay.textContent = '50';
      if (evalMsg) { evalMsg.hidden = true; evalMsg.textContent = ''; }

      // Load evaluation history
      if (evalHistoryList) {
        var evals = studentEvals[studentId] || [];
        if (evals.length === 0) {
          evalHistoryList.innerHTML = '<p class="text-muted" style="padding:8px;text-align:center">No evaluations yet.</p>';
        } else {
          var historyHtml = evals.slice().sort(function(a, b) {
            return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
          }).map(function(e) {
            var scoreColor = getScoreColor(e.score);
            return '<div class="eval-history-item">' +
              '<div><strong class="eval-history-score" style="color:' + scoreColor + '">' + e.score + '%</strong> ' + formatCategory(e.category) + '</div>' +
              '<div class="eval-history-meta">' +
                '<div class="eval-history-date">' + formatDate(e.createdAt) + '</div>' +
                (e.comment ? '<div class="eval-history-comment">"' + escapeHtml(e.comment) + '"</div>' : '') +
              '</div>' +
            '</div>';
          }).join('');

          // Show average
          var avg = Math.round(evals.reduce(function(sum, e) { return sum + Number(e.score || 0); }, 0) / evals.length);
          evalHistoryList.innerHTML =
            '<div class="eval-history-average">' +
              '<span style="font-weight:600">Average Score</span>' +
              '<span style="font-weight:700;color:' + getScoreColor(avg) + '">' + avg + '%</span>' +
            '</div>' +
            '<div style="max-height:150px;overflow-y:auto">' + historyHtml + '</div>';
        }
      }

      if (evalModal) evalModal.hidden = false;
    }

    function closeEvalModal() {
      if (evalModal) evalModal.hidden = true;
      currentEvalStudentId = null;
    }

    // Wire up Evaluate buttons
    document.querySelectorAll('.eval-evaluate-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        openEvalModal(this.dataset.sid, this.dataset.sname);
      });
    });

    if (evalClose) evalClose.addEventListener('click', closeEvalModal);
    if (evalCancel) evalCancel.addEventListener('click', closeEvalModal);
    if (evalModal) {
      evalModal.addEventListener('click', function(e) {
        if (e.target === evalModal) closeEvalModal();
      });
    }

    // Form submission
    if (evalForm) {
      evalForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        if (!currentEvalStudentId) return;
        if (evalMsg) { evalMsg.hidden = true; evalMsg.textContent = ''; }
        var submitBtn = evalForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        var category = evalCategory ? evalCategory.value : '';
        var score = evalScore ? parseInt(evalScore.value, 10) : 50;
        var comment = evalComment ? evalComment.value : '';

        if (!category) {
          if (evalMsg) {
            evalMsg.hidden = false;
            evalMsg.textContent = 'Please select a category.';
          }
          if (submitBtn) submitBtn.disabled = false;
          return;
        }

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

          window.IaApi.showToast('Evaluation submitted successfully!', 'success');
          closeEvalModal();
          // Reload the page to refresh data
          await loadEvaluationsPage();
        } catch (err) {
          window.IaApi.showToast(err.message || 'Failed to submit evaluation.', 'error');
          if (evalMsg) {
            evalMsg.hidden = false;
            evalMsg.textContent = err.message || 'Failed to submit evaluation.';
          }
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }
  }

  // ── Escape key handler ──────────────────────────────────────────────
  document.removeEventListener('keydown', renderEvaluationsPage._escHandler);
  var escHandler = function(e) {
    if (e.key !== 'Escape') return;
    if (isSupervisor) {
      var em = document.getElementById('eval-modal');
      if (em && !em.hidden) { em.hidden = true; currentEvalStudentId = null; }
    }
  };
  renderEvaluationsPage._escHandler = escHandler;
  document.addEventListener('keydown', escHandler);
}

let pageLoaded = false;

function initPage() {
  const page = document.body.dataset.page;
  if (!page || pageLoaded) return;

  const loaders = {
    dashboard: loadDashboard,
    students: loadStudentsPage,
    reports: loadReportsPage,
    analytics: loadAnalyticsPage,
    profile: loadProfilePage,
    evaluations: loadEvaluationsPage,
  };

  const loader = loaders[page];
  if (loader) {
    pageLoaded = true;
    loadWhenReady(loader);
  }
}

document.addEventListener('DOMContentLoaded', initPage);
document.addEventListener('ia:user-ready', initPage);
