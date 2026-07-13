/* ── Supervisors Page (admin only) ── */
(function () {
  var root = document.querySelector('[data-page-root]');
  if (!root) return;

  var activeTab = 'school';
  var supervisorsData = { schoolSupervisors: [], workplaceSupervisors: [] };

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str || ''));
    return div.innerHTML;
  }

  function getRoleLabel(role) {
    return role === 'school_supervisor' ? 'School Supervisor' : 'Workplace Supervisor';
  }

  function getRoleBadgeColor(role) {
    return role === 'school_supervisor' ? '#2563eb' : '#059669';
  }

  function render() {
    var list = activeTab === 'school' ? supervisorsData.schoolSupervisors : supervisorsData.workplaceSupervisors;
    var schoolCount = supervisorsData.schoolSupervisors.length;
    var workplaceCount = supervisorsData.workplaceSupervisors.length;

    root.innerHTML =
      // Hero
      '<div class="students-hero admin-reveal">' +
        '<div class="students-hero-shimmer"></div>' +
        '<div class="students-hero-content">' +
          '<div class="students-hero-left">' +
            '<div class="students-hero-text">' +
              '<h2 class="text-glow">Supervisors</h2>' +
              '<p>Manage school and workplace supervisors for the attachment program.</p>' +
            '</div>' +
          '</div>' +
          '<button class="btn btn-sm quick-chip admin-shimmer" id="sup-add-btn" style="flex-shrink:0">+ Add Supervisor</button>' +
        '</div>' +
      '</div>' +

      // Stats
      '<div class="stats-grid admin-stagger-children admin-revealed" style="margin-bottom:16px">' +
        '<div class="stat-card-ring stat-card-accent-total animate-in animate-in-d1">' +
          '<div class="stat-icon stat-icon-students"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>' +
          '<div class="stat-body"><div class="stat-value-anim stat-value">' + (schoolCount + workplaceCount) + '</div><span class="stat-label">Total Supervisors</span></div>' +
        '</div>' +
        '<div class="stat-card-ring stat-card-accent-active-placement animate-in animate-in-d2">' +
          '<div class="stat-icon stat-icon-active"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>' +
          '<div class="stat-body"><div class="stat-value-anim stat-value">' + schoolCount + '</div><span class="stat-label">School</span></div>' +
        '</div>' +
        '<div class="stat-card-ring stat-card-accent-pending animate-in animate-in-d3">' +
          '<div class="stat-icon stat-icon-pending"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg></div>' +
          '<div class="stat-body"><div class="stat-value-anim stat-value">' + workplaceCount + '</div><span class="stat-label">Workplace</span></div>' +
        '</div>' +
      '</div>' +

      // Tabs
      '<div style="display:flex;gap:0;margin-bottom:0">' +
        '<button class="sup-tab' + (activeTab === 'school' ? ' active' : '') + '" data-tab="school">School Supervisors (' + schoolCount + ')</button>' +
        '<button class="sup-tab' + (activeTab === 'workplace' ? ' active' : '') + '" data-tab="workplace">Workplace Supervisors (' + workplaceCount + ')</button>' +
      '</div>' +

      // Table
      '<div class="table-premium-wrap" style="margin-bottom:20px;border-top-left-radius:0;border-top-right-radius:0">' +
        '<table class="table-premium">' +
          '<thead><tr>' +
            '<th>Name</th>' +
            '<th>Email</th>' +
            '<th>Role</th>' +
            '<th>Assigned Students</th>' +
            '<th style="text-align:right">Actions</th>' +
          '</tr></thead>' +
          '<tbody>' +
            (list.length === 0
              ? '<tr><td colspan="5" style="text-align:center;padding:32px"><span class="text-muted">No ' + activeTab + ' supervisors yet.</span></td></tr>'
              : list.map(function(s) {
                  var assignedCount = 0;
                  if (activeTab === 'school') {
                    assignedCount = (window._supPageData.students || []).filter(function(st) { return st.schoolSupervisor === s.uid; }).length;
                  } else {
                    assignedCount = (window._supPageData.students || []).filter(function(st) { return st.workplaceSupervisor === s.uid; }).length;
                  }
                  return '<tr>' +
                    '<td class="stu-name"><strong>' + escapeHtml(s.name || 'Unnamed') + '</strong></td>' +
                    '<td>' + escapeHtml(s.email || '') + '</td>' +
                    '<td><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:0.72rem;font-weight:600;background:' + getRoleBadgeColor(s.role) + '22;color:' + getRoleBadgeColor(s.role) + '">' + getRoleLabel(s.role) + '</span></td>' +
                    '<td>' + assignedCount + '</td>' +
                    '<td style="text-align:right"><button class="btn btn-xs btn-danger sup-delete-btn" data-uid="' + escapeHtml(s.uid) + '" data-name="' + escapeHtml(s.name || s.email) + '">Remove</button></td>' +
                  '</tr>';
                }).join('')) +
          '</tbody>' +
        '</table>' +
      '</div>' +

      // Add Supervisor Modal
      '<div id="sup-create-modal" class="modal-premium-overlay" hidden>' +
        '<div class="modal-premium">' +
          '<div class="modal-premium-header">' +
            '<h3>Add New Supervisor</h3>' +
            '<button class="modal-premium-close" id="sup-create-close">&times;</button>' +
          '</div>' +
          '<div class="modal-premium-body">' +
            '<form id="sup-create-form" class="form-premium" style="border:none;padding:0;margin:0;box-shadow:none">' +
              '<div class="form-grid">' +
                '<div><label>Name *</label><input type="text" name="name" required /></div>' +
                '<div><label>Email *</label><input type="email" name="email" required /></div>' +
                '<div><label>Phone</label><input type="tel" name="phone" /></div>' +
                '<div><label>Role *</label><select name="role" required>' +
                  '<option value="school_supervisor">School Supervisor</option>' +
                  '<option value="workplace_supervisor">Workplace Supervisor</option>' +
                '</select></div>' +
                '<div><label>Password *</label><input type="password" name="password" value="Supervisor@123" required /><small style="color:#6b7280;font-size:0.72rem">Default: Supervisor@123</small></div>' +
              '</div>' +
              '<div class="form-actions">' +
                '<button class="btn btn-primary" type="submit">Create Supervisor</button>' +
                '<button class="btn btn-outline" type="button" id="sup-create-cancel">Cancel</button>' +
              '</div>' +
              '<p id="sup-create-msg" class="text-muted" hidden></p>' +
            '</form>' +
          '</div>' +
        '</div>' +
      '</div>';

    bindEvents();
  }

  function bindEvents() {
    // Tab switching
    document.querySelectorAll('.sup-tab').forEach(function(tab) {
      tab.addEventListener('click', function() {
        activeTab = this.dataset.tab;
        render();
      });
    });

    // Add button
    var addBtn = document.getElementById('sup-add-btn');
    var modal = document.getElementById('sup-create-modal');
    var closeBtn = document.getElementById('sup-create-close');
    var cancelBtn = document.getElementById('sup-create-cancel');
    var form = document.getElementById('sup-create-form');
    var msg = document.getElementById('sup-create-msg');

    if (addBtn) addBtn.addEventListener('click', function() { modal.hidden = false; });
    if (closeBtn) closeBtn.addEventListener('click', function() { modal.hidden = true; });
    if (cancelBtn) cancelBtn.addEventListener('click', function() { modal.hidden = true; });
    if (modal) modal.addEventListener('click', function(e) { if (e.target === modal) modal.hidden = true; });

    // Create form
    if (form) {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        var fd = new FormData(form);
        var submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        if (msg) { msg.hidden = true; msg.textContent = ''; }

        try {
          await window.IaApi.apiFetch('/api/auth/register', {
            method: 'POST',
            body: {
              name: fd.get('name'),
              email: fd.get('email'),
              password: fd.get('password'),
              role: fd.get('role'),
              phone: fd.get('phone'),
            },
          });
          window.IaApi.showToast('Supervisor created successfully!', 'success');
          modal.hidden = true;
          form.reset();
          await loadData();
        } catch (err) {
          window.IaApi.showToast(err.message || 'Failed to create supervisor.', 'error');
          if (msg) { msg.hidden = false; msg.textContent = err.message || 'Failed to create supervisor.'; }
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      });
    }

    // Delete buttons
    document.querySelectorAll('.sup-delete-btn').forEach(function(btn) {
      btn.addEventListener('click', async function() {
        var uid = this.dataset.uid;
        var name = this.dataset.name;
        if (!confirm('Remove supervisor "' + name + '"? This cannot be undone.')) return;
        try {
          await window.IaApi.apiFetch('/api/admin/supervisors/' + uid, { method: 'DELETE' });
          window.IaApi.showToast('Supervisor removed.', 'success');
          await loadData();
        } catch (err) {
          window.IaApi.showToast(err.message || 'Failed to remove supervisor.', 'error');
        }
      });
    });
  }

  async function loadData() {
    try {
      var supData = await window.IaApi.apiFetch('/api/admin/supervisors');
      supervisorsData = supData || { schoolSupervisors: [], workplaceSupervisors: [] };
      // Also fetch students to count assigned students per supervisor
      try {
        var stuData = await window.IaApi.apiFetch('/api/admin/students/all');
        window._supPageData = { students: (stuData && stuData.students) || [] };
      } catch (_) {
        window._supPageData = { students: [] };
      }
      render();
    } catch (err) {
      window.IaApi.showToast(err.message || 'Failed to load supervisors.', 'error');
      root.innerHTML = '<div style="text-align:center;padding:48px"><p class="text-muted">Failed to load supervisors.</p></div>';
    }
  }

  loadData();
})();
