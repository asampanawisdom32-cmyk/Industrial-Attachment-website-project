var escapeHtml = window.IaApi.escapeHtml;
var showError = window.IaApi.showError;
var loadWhenReady = window.IaApi.loadWhenReady;

async function loadAdminPage() {
  const root = document.querySelector('[data-page-root]');
  if (!root) return;
  window.IaApi.showSkeleton(root, 'admin');

  // Fetch all data in parallel
  const [studentsRes, supervisorsRes, deptGroupsRes, locGroupsRes] = await Promise.all([
    window.IaApi.apiFetch('/api/admin/students/all').catch(() => ({ students: [] })),
    window.IaApi.apiFetch('/api/admin/supervisors').catch(() => ({ schoolSupervisors: [], workplaceSupervisors: [] })),
    window.IaApi.apiFetch('/api/admin/students/grouped-by-department').catch(() => ({ groups: {} })),
    window.IaApi.apiFetch('/api/admin/students/grouped-by-location').catch(() => ({ groups: {} })),
  ]);

  const students = studentsRes.students || [];
  const schoolSupervisors = supervisorsRes.schoolSupervisors || [];
  const workplaceSupervisors = supervisorsRes.workplaceSupervisors || [];
  const deptGroups = deptGroupsRes.groups || {};
  const locGroups = locGroupsRes.groups || {};

  // Build supervisor name maps
  const schoolSupMap = {};
  for (const s of schoolSupervisors) {
    schoolSupMap[s.uid] = s.name || s.email;
  }
  const workplaceSupMap = {};
  for (const s of workplaceSupervisors) {
    workplaceSupMap[s.uid] = s.name || s.email;
  }

  // Render tabs
  root.innerHTML = `
    <div class="admin-header admin-reveal">
      <h2>Administration Panel</h2>
      <p class="text-muted">Manage supervisors, assign students, and view grouped data.</p>
    </div>

    <div class="admin-tabs admin-reveal">
      <button class="admin-tab active" data-tab="students">Students</button>
      <button class="admin-tab" data-tab="supervisors">Supervisors</button>
      <button class="admin-tab" data-tab="groups">Groups</button>
    </div>

    <div id="admin-students-tab" class="admin-tab-content active">
      <div class="card card-full admin-reveal">
        <div class="card-title">All Students — Assign Supervisors</div>

        <!-- Search / filter bar -->
        <div class="search-bar">
          <input
            type="text"
            id="student-search"
            placeholder="Search students by name, department, company, or location…"
            autocomplete="off"
          />
        </div>

        <!-- Bulk action toolbar (hidden until students are selected) -->
        <div id="bulk-toolbar" class="bulk-toolbar" hidden>
          <span id="bulk-count" class="bulk-count">0 selected</span>
          <button class="btn btn-sm btn-primary bulk-assign-btn" data-sup-type="school">Assign School Supervisor</button>
          <button class="btn btn-sm btn-primary bulk-assign-btn" data-sup-type="workplace">Assign Workplace Supervisor</button>
          <button class="btn btn-sm btn-secondary" id="bulk-clear">Clear</button>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="col-check">
                  <input type="checkbox" id="select-all" class="student-checkbox" />
                </th>
                <th>Student</th>
                <th>Department</th>
                <th>Company</th>
                <th>Location</th>
                <th>School Supervisor</th>
                <th>Workplace Supervisor</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="students-tbody">
              ${renderStudentsRows(students)}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="admin-supervisors-tab" class="admin-tab-content">
      <div class="grid grid-2">
        <div class="card admin-card-3d admin-reveal admin-reveal-left">
          <div class="card-title">School Supervisors (${schoolSupervisors.length})</div>
          ${schoolSupervisors.length === 0
            ? '<p class="text-muted">No school supervisors registered.</p>'
            : `<ul class="list-muted">${schoolSupervisors.map(s => `<li>${escapeHtml(s.name || s.email)} — ${escapeHtml(s.email)}</li>`).join('')}</ul>`}
        </div>
        <div class="card admin-card-3d admin-reveal admin-reveal-right">
          <div class="card-title">Workplace Supervisors (${workplaceSupervisors.length})</div>
          ${workplaceSupervisors.length === 0
            ? '<p class="text-muted">No workplace supervisors registered.</p>'
            : `<ul class="list-muted">${workplaceSupervisors.map(s => `<li>${escapeHtml(s.name || s.email)} — ${escapeHtml(s.email)}</li>`).join('')}</ul>`}
        </div>
      </div>
    </div>

    <div id="admin-groups-tab" class="admin-tab-content">
      <div class="grid grid-2">
        <div class="card admin-reveal admin-reveal-left">
          <div class="card-title">By Department</div>
          ${Object.keys(deptGroups).length === 0
            ? '<p class="text-muted">No students to group.</p>'
            : Object.entries(deptGroups).map(([dept, deptStudents]) => `
              <div class="group-section">
                <h4 class="group-heading">${escapeHtml(dept)} (${deptStudents.length})</h4>
                <ul class="list-muted">${deptStudents.map(s => `<li>${escapeHtml(s.name)} — ${escapeHtml(s.workplace || 'No placement')}</li>`).join('')}</ul>
              </div>
            `).join('')}
        </div>
        <div class="card admin-reveal admin-reveal-right">
          <div class="card-title">By Company Location</div>
          ${Object.keys(locGroups).length === 0
            ? '<p class="text-muted">No students to group.</p>'
            : Object.entries(locGroups).map(([loc, locStudents]) => `
              <div class="group-section">
                <h4 class="group-heading">${escapeHtml(loc)} (${locStudents.length})</h4>
                <ul class="list-muted">${locStudents.map(s => `<li>${escapeHtml(s.name)} — ${escapeHtml(s.department || 'N/A')}</li>`).join('')}</ul>
              </div>
            `).join('')}
        </div>
      </div>
    </div>

    <!-- Assignment modal (used for both single and bulk) -->
    <div id="assign-modal" class="modal-overlay" hidden>
      <div class="modal-card">
        <div class="modal-header">
          <h3 id="assign-modal-title">Assign Supervisor</h3>
          <button class="modal-close" id="assign-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p id="assign-modal-student"></p>
          <label for="assign-supervisor-select">Select Supervisor:</label>
          <select id="assign-supervisor-select" class="form-select"></select>
          <p id="assign-modal-msg" class="text-muted" hidden></p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="assign-modal-cancel">Cancel</button>
          <button class="btn btn-primary admin-shimmer" id="assign-modal-confirm">Assign</button>
        </div>
      </div>
    </div>
  `;

  // ========== Store for filtering ==========
  const allStudents = students;

  // ========== Search / filter logic ==========
  const searchInput = document.getElementById('student-search');

  function renderStudentsRows(list) {
    if (list.length === 0) {
      return '<tr><td colspan="8"><p class="text-muted">No students match your search.</p></td></tr>';
    }
    return list.map((s, idx) => `
      <tr>
        <td class="col-check">
          <input type="checkbox" class="student-checkbox" value="${escapeHtml(s.id)}" data-idx="${idx}" />
        </td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml(s.department || '—')}</td>
        <td>${escapeHtml(s.workplace || '—')}</td>
        <td>${escapeHtml(s.location || '—')}</td>
        <td class="sup-cell">
          <span class="sup-name">${escapeHtml(s.schoolSupervisorName || 'Unassigned')}</span>
        </td>
        <td class="sup-cell">
          <span class="sup-name">${escapeHtml(s.workplaceSupervisorName || 'Unassigned')}</span>
        </td>
        <td>
          <button class="btn btn-sm btn-secondary assign-sup-btn" data-student-id="${escapeHtml(s.id)}" data-student-name="${escapeHtml(s.name)}" data-sup-type="school">Assign School</button>
          <button class="btn btn-sm btn-secondary assign-sup-btn" data-student-id="${escapeHtml(s.id)}" data-student-name="${escapeHtml(s.name)}" data-sup-type="workplace">Assign Workplace</button>
        </td>
      </tr>
    `).join('');
  }

  function filterStudents() {
    const term = (searchInput.value || '').toLowerCase().trim();
    if (!term) {
      return allStudents;
    }
    return allStudents.filter((s) => {
      return (
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.department && s.department.toLowerCase().includes(term)) ||
        (s.workplace && s.workplace.toLowerCase().includes(term)) ||
        (s.location && s.location.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term))
      );
    });
  }

  function applyFilterAndUpdateTable() {
    const filtered = filterStudents();
    const tbody = document.getElementById('students-tbody');
    if (tbody) {
      tbody.innerHTML = renderStudentsRows(filtered);
    }
    // Re-bind checkbox + assignment events
    bindTableEvents();
    // Reset bulk toolbar (re-render clears all selections)
    updateBulkToolbar();
  }

  if (searchInput) {
    searchInput.addEventListener('input', applyFilterAndUpdateTable);
  }

  // ========== Tab switching ==========
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(`admin-${tab.dataset.tab}-tab`);
      if (target) target.classList.add('active');
      // Re-focus search when switching to students tab
      if (tab.dataset.tab === 'students') {
        const searchInput = document.getElementById('student-search');
        if (searchInput) setTimeout(() => searchInput.focus(), 100);
      }
    });
  });

  // Keyboard shortcut: Ctrl+K / Cmd+K to focus search
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('student-search');
      if (searchInput) searchInput.focus();
    }
  });

  // ========== Checkbox & bulk selection logic ==========
  let checkboxes = [];
  const selectAll = document.getElementById('select-all');
  const bulkToolbar = document.getElementById('bulk-toolbar');
  const bulkCount = document.getElementById('bulk-count');
  const bulkClear = document.getElementById('bulk-clear');

  function updateBulkToolbar() {
    const checked = Array.from(checkboxes).filter((cb) => cb.checked);
    const count = checked.length;
    if (count > 0) {
      bulkToolbar.hidden = false;
      bulkCount.textContent = `${count} student${count !== 1 ? 's' : ''} selected`;
    } else {
      bulkToolbar.hidden = true;
    }
    if (selectAll) {
      selectAll.checked = count === checkboxes.length && checkboxes.length > 0;
      selectAll.indeterminate = count > 0 && count < checkboxes.length;
    }
  }

  // Bind persistent elements ONCE (outside tbody, survive re-render)
  if (selectAll) {
    selectAll.addEventListener('change', () => {
      checkboxes.forEach((cb) => { cb.checked = selectAll.checked; });
      updateBulkToolbar();
    });
  }

  if (bulkClear) {
    bulkClear.addEventListener('click', () => {
      checkboxes.forEach((cb) => { cb.checked = false; });
      updateBulkToolbar();
    });
  }

  document.querySelectorAll('.bulk-assign-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const checked = Array.from(checkboxes).filter((cb) => cb.checked).map((cb) => cb.value);
      if (checked.length === 0) return;
      const supType = btn.dataset.supType;
      openBulkModal(supType, checked);
    });
  });

  // Re-bound on each filter (elements inside tbody get replaced)
  function bindTableEvents() {
    checkboxes = document.querySelectorAll('.student-checkbox:not(#select-all)');
    checkboxes.forEach((cb) => cb.addEventListener('change', updateBulkToolbar));

    document.querySelectorAll('.assign-sup-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const studentId = btn.dataset.studentId;
        const studentName = btn.dataset.studentName;
        const supType = btn.dataset.supType;
        openSingleModal(studentId, studentName, supType);
      });
    });
  }

  bindTableEvents();

  // ========== Single assignment modal ==========
  let currentStudentId = '';
  let currentSupType = ''; // 'school' or 'workplace'
  let isBulkMode = false;
  let bulkStudentIds = [];

  const modal = document.getElementById('assign-modal');
  const modalTitle = document.getElementById('assign-modal-title');
  const modalStudent = document.getElementById('assign-modal-student');
  const modalSelect = document.getElementById('assign-supervisor-select');
  const modalMsg = document.getElementById('assign-modal-msg');
  const modalClose = document.getElementById('assign-modal-close');
  const modalCancel = document.getElementById('assign-modal-cancel');
  const modalConfirm = document.getElementById('assign-modal-confirm');

  function openSingleModal(studentId, studentName, supType) {
    isBulkMode = false;
    bulkStudentIds = [];
    currentStudentId = studentId;
    currentSupType = supType;
    modalTitle.textContent = supType === 'school' ? 'Assign School Supervisor' : 'Assign Workplace Supervisor';
    modalStudent.textContent = `Student: ${studentName}`;
    populateSupervisorSelect(supType);
    modal.hidden = false;
  }

  function openBulkModal(supType, selectedIds) {
    isBulkMode = true;
    bulkStudentIds = selectedIds;
    currentSupType = supType;
    currentStudentId = '';
    modalTitle.textContent = `Bulk Assign ${supType === 'school' ? 'School' : 'Workplace'} Supervisor`;
    modalStudent.textContent = `${selectedIds.length} student(s) selected`;
    populateSupervisorSelect(supType);
    modal.hidden = false;
  }

  function populateSupervisorSelect(supType) {
    modalMsg.hidden = true;
    const supervisors = supType === 'school' ? schoolSupervisors : workplaceSupervisors;
    modalSelect.innerHTML = supervisors.length === 0
      ? '<option value="">No supervisors available</option>'
      : '<option value="">— Select a supervisor —</option>' +
        supervisors.map((s) => `<option value="${escapeHtml(s.uid)}">${escapeHtml(s.name || s.email)}</option>`).join('');
  }

  function closeModal() {
    modal.hidden = true;
    currentStudentId = '';
    currentSupType = '';
    isBulkMode = false;
    bulkStudentIds = [];
    modalMsg.className = 'text-muted';
    modalConfirm.disabled = false;
  }

  if (modalClose) modalClose.addEventListener('click', closeModal);
  if (modalCancel) modalCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  if (modalConfirm) {
    modalConfirm.addEventListener('click', async () => {
      const supervisorUid = modalSelect.value;
      if (!supervisorUid) {
        modalMsg.hidden = false;
        modalMsg.textContent = 'Please select a supervisor.';
        return;
      }

      modalConfirm.disabled = true;
      modalMsg.hidden = false;
      modalMsg.textContent = 'Assigning…';

      try {
        if (isBulkMode) {
          // Bulk assignment
          const endpoint = currentSupType === 'school'
            ? '/api/admin/students/bulk-assign-school-supervisor'
            : '/api/admin/students/bulk-assign-workplace-supervisor';

          const result = await window.IaApi.apiFetch(endpoint, {
            method: 'PUT',
            body: { studentIds: bulkStudentIds, supervisorUid },
          });

          window.IaApi.showToast(result.message || `Assigned to ${result.assigned} student(s)!`, 'success');
          modalMsg.textContent = result.message || `Assigned to ${result.assigned} student(s)!`;
          modalMsg.className = 'text-muted success';
        } else {
          // Single assignment
          const endpoint = currentSupType === 'school'
            ? `/api/admin/students/${currentStudentId}/assign-school-supervisor`
            : `/api/admin/students/${currentStudentId}/assign-workplace-supervisor`;

          await window.IaApi.apiFetch(endpoint, {
            method: 'PUT',
            body: { supervisorUid },
          });

          window.IaApi.showToast('Supervisor assigned successfully!', 'success');
          modalMsg.textContent = 'Supervisor assigned successfully!';
          modalMsg.className = 'text-muted success';
        }

        // Refresh page after short delay
        setTimeout(() => {
          closeModal();
          loadAdminPage();
        }, 1200);
      } catch (err) {
        window.IaApi.showToast(err.message || 'Failed to assign supervisor.', 'error');
        modalMsg.textContent = err.message || 'Failed to assign supervisor.';
        modalMsg.className = 'text-muted error';
        modalConfirm.disabled = false;
      }
    });
  }
}

function initAdminPage() {
  const page = document.body.dataset.page;
  if (page === 'admin') {
    loadWhenReady(loadAdminPage);
  }
}

document.addEventListener('DOMContentLoaded', initAdminPage);
document.addEventListener('ia:user-ready', initAdminPage);
