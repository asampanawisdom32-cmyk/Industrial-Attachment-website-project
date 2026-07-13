const TOKEN_KEY = 'ia_idToken';
const USER_KEY = 'ia_user';

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession({ idToken, user }) {
  if (idToken) localStorage.setItem(TOKEN_KEY, idToken);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Detect FormData — let browser set Content-Type (with boundary)
  const isFormData = options.body instanceof FormData;

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: isFormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
  });

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || 'Request failed');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

// ===== Shared UI Helpers =====

/**
 * Escape HTML text for safe rendering
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

/**
 * Show an error message in a container element
 */
function showError(container, message) {
  if (!container) return;
  container.innerHTML = `<div class="card card-full"><p class="text-muted">${escapeHtml(message)}</p></div>`;
}

/**
 * Wait for user to be ready before loading a page
 */
function loadWhenReady(loader) {
  const run = async () => {
    try {
      await loader();
    } catch (err) {
      const root = document.querySelector('[data-page-root]');
      if (root) showError(root, err.message || 'Failed to load page data.');
      showToast(err.message || 'Failed to load page data.', 'error');
    }
  };

  if (getToken()) {
    run();
    return;
  }

  document.addEventListener('ia:user-ready', run, { once: true });
}

// ===== Toast Notification System =====

let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toast-container';
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
  }
  return toastContainer;
}

/**
 * Show a toast notification (auto-dismisses after 4s)
 * @param {string} message - The message to display
 * @param {'success'|'error'|'info'} type - Toast type
 * @param {number} duration - Auto-dismiss duration in ms (0 = sticky)
 */
function showToast(message, type, duration) {
  if (duration === undefined) duration = 4000;
  var container = getToastContainer();
  var icons = { success: '\u2713', error: '\u2717', info: '\u2139' };
  var icon = icons[type] || icons.info;

  var toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'info');
  toast.innerHTML =
    '<div class="toast-icon">' + icon + '</div>' +
    '<div class="toast-body">' + escapeHtml(message) + '</div>' +
    '<button class="toast-dismiss" aria-label="Dismiss">&times;</button>';

  toast.querySelector('.toast-dismiss').addEventListener('click', function () {
    dismissToast(toast);
  });

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(function () {
      dismissToast(toast);
    }, duration);
  }
}

function dismissToast(toast) {
  if (!toast || toast.classList.contains('toast-out')) return;
  toast.classList.add('toast-out');
  setTimeout(function () {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
  }, 300);
}

// ===== Loading Spinner Helpers =====

/**
 * Show a spinner in a container element (replaces its contents)
 * @param {HTMLElement} container - The container to show the spinner in
 * @param {string} message - Optional loading message
 */
function showSpinner(container, message) {
  if (!container) return;
  container.innerHTML =
    '<div class="page-loader">' +
      '<div class="spinner"></div>' +
      '<p class="text-muted">' + escapeHtml(message || 'Loading…') + '</p>' +
    '</div>';
}

// ===== Loading Skeleton Helpers =====

/**
 * Build a skeleton line with a given width
 */
function skLine(width) {
  width = width || '100%';
  return '<div class="skeleton skeleton-line" style="width:' + width + '"></div>';
}

/**
 * Build a grid of skeleton stat cards
 */
function skStatGrid(count) {
  count = count || 4;
  var html = '<div class="stats-grid" style="margin-bottom:24px">';
  for (var i = 0; i < count; i++) {
    html += '<div class="skeleton-stat">' +
      '<div class="skeleton skeleton-icon"></div>' +
      '<div class="skeleton-stat-body">' +
        '<div class="skeleton skeleton-stat-value"></div>' +
        '<div class="skeleton skeleton-stat-label"></div>' +
      '</div>' +
    '</div>';
  }
  html += '</div>';
  return html;
}

/**
 * Build skeleton cards (2-column or full-width)
 */
function skCardGrid(cols) {
  cols = cols || 2;
  var html = '<div class="grid grid-' + cols + '" style="margin-bottom:24px">';
  for (var i = 0; i < cols; i++) {
    html += '<div class="skeleton-card">' +
      '<div class="skeleton skeleton-title" style="width:40%"></div>' +
      skLine('85%') +
      skLine('60%') +
      skLine('45%') +
    '</div>';
  }
  html += '</div>';
  return html;
}

/**
 * Build a skeleton table
 */
function skTable(columns, rows) {
  columns = columns || 5;
  rows = rows || 5;
  var widths = [];
  for (var c = 0; c < columns; c++) {
    // Distribute widths: first and last narrower, middle wider
    if (c === 0) widths.push('18%');
    else if (c === columns - 1) widths.push('12%');
    else widths.push(Math.round(60 / (columns - 2)) + '%');
  }

  var html = '<div class="skeleton-table" style="margin-bottom:24px">';
  // Header
  html += '<div class="skeleton-table-header">';
  for (var c = 0; c < columns; c++) {
    html += '<div class="skeleton skeleton-line" style="width:' + widths[c] + ';margin:0;height:14px"></div>';
  }
  html += '</div>';
  // Body rows
  html += '<div class="skeleton-table-body">';
  for (var r = 0; r < rows; r++) {
    html += '<div class="skeleton-table-row">';
    for (var c = 0; c < columns; c++) {
      html += '<div class="skeleton skeleton-line" style="width:' + widths[c] + ';margin:0;height:12px"></div>';
    }
    html += '</div>';
  }
  html += '</div></div>';
  return html;
}

/**
 * Build a skeleton form
 */
function skForm() {
  return '<div class="skeleton-form" style="margin-bottom:24px">' +
    '<div class="skeleton skeleton-title" style="width:35%"></div>' +
    '<div class="skeleton skeleton-line" style="width:20%"></div>' +
    '<div class="skeleton skeleton-input"></div>' +
    '<div class="skeleton skeleton-line" style="width:25%"></div>' +
    '<div class="skeleton skeleton-input skeleton-input-sm"></div>' +
    '<div class="skeleton skeleton-line" style="width:30%"></div>' +
    '<div class="skeleton skeleton-input" style="height:100px;border-radius:14px"></div>' +
    '<div class="skeleton skeleton-button"></div>' +
  '</div>';
}

/**
 * Build a skeleton role header
 */
function skRoleHeader() {
  return '<div class="skeleton-role-header">' +
    '<div class="skeleton skeleton-role-badge"></div>' +
    '<div class="skeleton-role-text">' +
      '<div class="skeleton skeleton-title" style="width:35%;margin-bottom:8px"></div>' +
      '<div class="skeleton skeleton-line" style="width:55%"></div>' +
    '</div>' +
  '</div>';
}

/**
 * Build a skeleton profile grid
 */
function skProfileGrid() {
  var html = '<div class="skeleton-profile-grid">';
  for (var i = 0; i < 6; i++) {
    html += '<div class="skeleton-profile-item">' +
      '<div class="skeleton skeleton-profile-label"></div>' +
      '<div class="skeleton skeleton-profile-value"></div>' +
    '</div>';
  }
  html += '</div>';
  return html;
}

/**
 * Build a skeleton for the admin panel (tabs + content)
 */
function skAdminPanel() {
  var html = '<div style="margin-bottom:24px">' +
    '<div class="skeleton skeleton-title" style="width:25%;margin-bottom:8px"></div>' +
    '<div class="skeleton skeleton-subtitle" style="width:40%;margin-bottom:0"></div>' +
  '</div>';
  // Tab bar
  html += '<div style="display:flex;gap:8px;margin-bottom:24px;border-bottom:2px solid var(--border);padding-bottom:0">';
  for (var i = 0; i < 4; i++) {
    html += '<div class="skeleton skeleton-line" style="width:100px;height:32px;flex-shrink:0;margin:0 0 -2px;border-radius:0;border-bottom:2px solid transparent"></div>';
  }
  html += '</div>';
  // Content area
  html += skStatGrid(3);
  html += skCardGrid(2);
  html += skTable(4, 4);
  return html;
}

/**
 * Render a loading skeleton that mimics the actual page layout
 * @param {HTMLElement} container - Container to render skeleton into
 * @param {string} pageType - Type of page for layout-specific skeleton
 */
function showSkeleton(container, pageType) {
  if (!container) return;

  var html = '';

  switch (pageType) {
    case 'admin-dashboard':
      // Premium skeleton: hero banner + stat ring cards + two-column glass layout
      html = '' +
        '<div class="admin-hero" style="margin-bottom:24px;padding:32px 36px;background:linear-gradient(135deg,#0a1f3f,#0F5570,#1A6B8A);border-radius:var(--radius);height:140px">' +
          '<div class="skeleton skeleton-line" style="width:35%;height:18px;background:rgba(255,255,255,0.20);border-radius:6px;margin-bottom:12px"></div>' +
          '<div class="skeleton skeleton-line" style="width:22%;height:13px;background:rgba(255,255,255,0.15);border-radius:6px"></div>' +
        '</div>' +
        skStatGrid(4) +
        '<div class="grid grid-2" style="margin-bottom:24px">' +
          '<div>' +
            '<div class="skeleton-card" style="margin-bottom:20px">' +
              '<div class="skeleton skeleton-title" style="width:35%"></div>' +
              skLine('90%') + skLine('75%') + skLine('60%') +
            '</div>' +
            '<div class="skeleton-card">' +
              '<div class="skeleton skeleton-title" style="width:30%"></div>' +
              skLine('85%') + skLine('70%') +
            '</div>' +
          '</div>' +
          '<div>' +
            '<div class="skeleton-card" style="margin-bottom:20px">' +
              '<div class="skeleton skeleton-title" style="width:28%"></div>' +
              skLine('93%') + skLine('80%') + skLine('65%') + skLine('50%') +
            '</div>' +
            '<div class="skeleton-card">' +
              '<div class="skeleton skeleton-title" style="width:25%"></div>' +
              '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px">' +
                '<div class="skeleton skeleton-stat" style="height:70px"></div>' +
                '<div class="skeleton skeleton-stat" style="height:70px"></div>' +
                '<div class="skeleton skeleton-stat" style="height:70px"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="skeleton-card">' +
          '<div class="skeleton skeleton-title" style="width:22%"></div>' +
          skLine('88%') + skLine('72%') + skLine('55%') + skLine('42%') + skLine('65%') +
        '</div>';
      break;
    case 'student-dashboard':
      html = skRoleHeader() + skStatGrid(4) + '<div class="card card-full" style="margin-bottom:24px">' + skLine('70%') + skLine('50%') + '</div>' + skCardGrid(2);
      break;
    case 'school-supervisor-dashboard':
    case 'workplace-supervisor-dashboard':
      html = '' +
        '<div class="supervisor-hero" style="margin-bottom:24px;padding:32px 36px;background:linear-gradient(135deg,#0d9488,#14b8a6,#5eead4);border-radius:var(--radius);height:130px">' +
          '<div style="display:flex;align-items:center;gap:20px">' +
            '<div class="skeleton" style="width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,0.18)"></div>' +
            '<div>' +
              '<div class="skeleton skeleton-line" style="width:30%;height:18px;background:rgba(255,255,255,0.20);border-radius:6px;margin-bottom:10px"></div>' +
              '<div class="skeleton skeleton-line" style="width:22%;height:12px;background:rgba(255,255,255,0.15);border-radius:6px;margin-bottom:8px"></div>' +
              '<div class="skeleton skeleton-line" style="width:16%;height:10px;background:rgba(255,255,255,0.12);border-radius:6px"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        skStatGrid(4) +
        '<div class="skeleton-card" style="margin-bottom:24px">' +
          '<div class="skeleton skeleton-title" style="width:25%"></div>' +
          skLine('90%') +
          skTable(6, 4) +
        '</div>' +
        '<div class="skeleton-card">' +
          '<div class="skeleton skeleton-title" style="width:18%"></div>' +
          '<div style="display:flex;gap:12px;margin-top:12px">' +
            '<div class="skeleton skeleton-stat" style="height:48px;flex:1"></div>' +
            '<div class="skeleton skeleton-stat" style="height:48px;flex:1"></div>' +
            '<div class="skeleton skeleton-stat" style="height:48px;flex:1"></div>' +
          '</div>' +
        '</div>';
      break;
    case 'dashboard':
      html = skStatGrid(3) + skCardGrid(2) + '<div class="card card-full">' + skLine('60%') + skLine('40%') + '</div>';
      break;
    case 'students':
      html = '' +
        '<div class="students-hero" style="margin-bottom:16px;padding:24px 28px;background:linear-gradient(135deg,#0a1f3f,#0F5570,#1A6B8A);border-radius:var(--radius);height:100px">' +
          '<div class="skeleton skeleton-line" style="width:30%;height:16px;background:rgba(255,255,255,0.20);border-radius:6px;margin-bottom:10px"></div>' +
          '<div class="skeleton skeleton-line" style="width:20%;height:12px;background:rgba(255,255,255,0.15);border-radius:6px"></div>' +
        '</div>' +
        skStatGrid(4) +
        skTable(10, 4);
      break;
    case 'reports':
      html = '' +
        '<div class="reports-hero" style="margin-bottom:16px;padding:24px 28px;background:linear-gradient(135deg,#0d9488,#14b8a6,#5eead4);border-radius:var(--radius);height:90px">' +
          '<div class="skeleton skeleton-line" style="width:28%;height:16px;background:rgba(255,255,255,0.20);border-radius:6px;margin-bottom:10px"></div>' +
          '<div class="skeleton skeleton-line" style="width:18%;height:12px;background:rgba(255,255,255,0.15);border-radius:6px"></div>' +
        '</div>' +
        skStatGrid(4) +
        skForm() +
        skTable(6, 4);
      break;
    case 'analytics':
      html = '' +
        '<div class="analytics-hero" style="margin-bottom:16px;padding:24px 28px;background:linear-gradient(135deg,#0a1f3f,#1e3a6e,#4f7ec9);border-radius:var(--radius);height:100px">' +
          '<div class="skeleton skeleton-line" style="width:30%;height:16px;background:rgba(255,255,255,0.20);border-radius:6px;margin-bottom:10px"></div>' +
          '<div class="skeleton skeleton-line" style="width:20%;height:12px;background:rgba(255,255,255,0.15);border-radius:6px"></div>' +
        '</div>' +
        skStatGrid(4) +
        '<div class="skeleton-card" style="margin-bottom:24px">' +
          '<div class="skeleton skeleton-title" style="width:25%"></div>' +
          '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px">' +
            '<div class="skeleton skeleton-stat" style="height:80px"></div>' +
            '<div class="skeleton skeleton-stat" style="height:80px"></div>' +
            '<div class="skeleton skeleton-stat" style="height:80px"></div>' +
            '<div class="skeleton skeleton-stat" style="height:80px"></div>' +
          '</div>' +
        '</div>' +
        skCardGrid(2) +
        skTable(4, 4);
      break;
    case 'profile':
      html = '' +
        '<div class="profile-hero" style="margin-bottom:24px;padding:32px 36px;background:linear-gradient(135deg,#0F5570,#1A6B8A,#4DBDB5);border-radius:var(--radius);height:130px">' +
          '<div style="display:flex;align-items:center;gap:20px">' +
            '<div class="skeleton" style="width:80px;height:80px;border-radius:50%;background:rgba(255,255,255,0.18)"></div>' +
            '<div>' +
              '<div class="skeleton skeleton-line" style="width:35%;height:18px;background:rgba(255,255,255,0.20);border-radius:6px;margin-bottom:10px"></div>' +
              '<div class="skeleton skeleton-line" style="width:22%;height:12px;background:rgba(255,255,255,0.15);border-radius:6px;margin-bottom:8px"></div>' +
              '<div class="skeleton skeleton-line" style="width:15%;height:10px;background:rgba(255,255,255,0.12);border-radius:6px"></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="form-premium" style="margin-bottom:24px">' +
          '<div class="skeleton skeleton-title" style="width:25%;margin-bottom:16px"></div>' +
          skProfileGrid() +
        '</div>';
      break;
    case 'admin':
      html = skAdminPanel();
      break;
    case 'evaluations':
      html = '' +
        '<div class="evals-hero" style="margin-bottom:16px;padding:24px 28px;background:linear-gradient(135deg,#7c3aed,#a855f7,#c084fc);border-radius:var(--radius);height:90px">' +
          '<div class="skeleton skeleton-line" style="width:28%;height:16px;background:rgba(255,255,255,0.20);border-radius:6px;margin-bottom:10px"></div>' +
          '<div class="skeleton skeleton-line" style="width:18%;height:12px;background:rgba(255,255,255,0.15);border-radius:6px"></div>' +
        '</div>' +
        skStatGrid(4) +
        skTable(6, 4);
      break;
    default:
      // Fall back to stat cards + content
      html = skStatGrid(3) + skCardGrid(2);
      break;
  }

  container.innerHTML = html;
}

window.IaApi = {
  TOKEN_KEY,
  USER_KEY,
  getToken,
  setSession,
  clearSession,
  getStoredUser,
  apiFetch,
  escapeHtml,
  showError,
  loadWhenReady,
  showToast,
  showSpinner,
  showSkeleton,
};
