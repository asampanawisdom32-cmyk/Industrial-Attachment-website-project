const PUBLIC_PATHS = ['/', '/login', '/signup'];

function isPublicPath(pathname) {
  return PUBLIC_PATHS.includes(pathname);
}

async function requireAuth() {
  const pathname = window.location.pathname;
  if (isPublicPath(pathname)) return;

  const token = window.IaApi?.getToken();
  if (!token) {
    window.location.href = '/login';
    return;
  }

  try {
    const { user } = await window.IaApi.apiFetch('/api/auth/profile');
    window.IaApi.setSession({ idToken: token, user });

    // Refresh the server-side session cookie so requirePageAuth doesn't redirect
    window.IaApi.apiFetch('/api/auth/session', {
      method: 'POST',
      body: { idToken: token },
    }).catch(() => {
      // Cookie refresh is best-effort; client-side auth still works
    });

    updateShellUser(user);
    document.dispatchEvent(new CustomEvent('ia:user-ready', { detail: user }));
  } catch {
    window.IaApi.clearSession();
    window.location.href = '/login';
  }
}

function updateShellUser(user) {
  if (!user) return;

  // Update sidebar profile
  const nameEl = document.getElementById('sidebar-profile-name');
  const roleEl = document.getElementById('sidebar-profile-role');
  const initialEl = document.getElementById('sidebar-profile-initials');
  if (nameEl) nameEl.textContent = user.name || 'User';
  if (roleEl) roleEl.textContent = (user.role || '').replace(/_/g, ' ');
  if (initialEl) initialEl.textContent = (user.name || 'U').charAt(0).toUpperCase();

  // Update page title if on dashboard
  const subtitle = document.querySelector('.subtitle');
  if (subtitle) {
    subtitle.innerHTML = `Welcome back, <strong>${user.name}</strong> &middot; <strong>${(user.role || '').replace(/_/g, ' ')}</strong>`;
  }

  // Inject user chip in sidebar footer
  const footer = document.querySelector('.sidebar-footer');
  if (footer) {
    const initial = (user.name || 'U').charAt(0).toUpperCase();
    footer.innerHTML = `
      <div class="user-chip">
        <div class="user-avatar">${initial}</div>
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          <div class="user-role">${(user.role || '').replace(/_/g, ' ')}</div>
        </div>
      </div>
      <a class="logout-btn" href="/logout" data-logout>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign out
      </a>
    `;
    initLogoutLinks();
  }

  // Role-based nav visibility: show items whose data-role includes user's role
  document.querySelectorAll('.nav-item[data-role]').forEach(function (link) {
    var roles = (link.getAttribute('data-role') || '').split(/\s+/);
    link.hidden = !roles.includes(user.role);
  });

  // Highlight the current page's nav item
  document.querySelectorAll('.nav-item[data-page]').forEach(function (link) {
    link.classList.toggle('active', link.getAttribute('data-page') === document.body.dataset.page);
  });
}

function initLogoutLinks() {
  document.querySelectorAll('[data-logout], a[href="/logout"]').forEach((el) => {
    el.addEventListener('click', (event) => {
      event.preventDefault();
      window.IaApi.clearSession();
      // Navigate to server-side /logout to clear the __session cookie
      window.location.href = '/logout';
    });
  });
}

/**
 * Page transition — intercept internal navigation links for a smooth exit animation
 * before the browser navigates to the next page.
 */
function initPageTransitions() {
  var content = document.querySelector('.page-content');
  if (!content) return;

  // Listen to clicks on all internal links within the app
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href]');
    if (!link) return;

    var href = link.getAttribute('href');

    // Only intercept internal navigations (same-origin, non-external)
    if (!href ||
        href.startsWith('http') ||
        href.startsWith('//') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href === '/logout' ||
        link.hasAttribute('data-no-transition') ||
        link.hasAttribute('download') ||
        link.getAttribute('target') === '_blank' ||
        e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }

    e.preventDefault();
    content.classList.add('is-exiting');

    // Wait for the exit animation to finish, then navigate
    setTimeout(function () {
      window.location.href = href;
    }, 200);
  });
}

/**
 * Re-trigger the enter animation on pageshow (handles browser back/forward bfcache).
 */
function initPageShowHandler() {
  window.addEventListener('pageshow', function (e) {
    var content = document.querySelector('.page-content');
    if (!content) return;

    // If the page was served from bfcache, re-apply the enter animation
    if (e.persisted) {
      content.classList.remove('is-exiting');
      // Force reflow so the animation plays again
      void content.offsetWidth;
      content.style.animation = 'none';
      void content.offsetWidth;
      content.style.animation = '';
    }
  });
}

/**
 * Sidebar toggle — collapses/expands on desktop, opens/closes on mobile.
 * State is persisted in localStorage so it survives page reloads.
 */
function initSidebarToggle() {
  var toggle = document.getElementById('sidebar-toggle');
  var sidebar = document.querySelector('.sidebar');
  var overlay = document.querySelector('.sidebar-overlay');
  if (!sidebar) return;

  function isMobile() { return window.innerWidth <= 1024; }

  // Restore saved state on page load (desktop only)
  if (!isMobile() && localStorage.getItem('sidebarCollapsed') === 'true') {
    sidebar.classList.add('sidebar-collapsed');
  }

  if (!toggle) return;

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    if (isMobile()) {
      sidebar.classList.toggle('open');
      if (overlay) overlay.classList.toggle('active');
    } else {
      sidebar.classList.toggle('sidebar-collapsed');
      localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('sidebar-collapsed'));
    }
  });

  // Close mobile sidebar when overlay is clicked
  if (overlay) {
    overlay.addEventListener('click', function () {
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
    });
  }
}/**
 * Theme toggle — switches between light and dark mode.
 * State persisted in localStorage.
 */
function initThemeToggle() {
  var toggle = document.getElementById('theme-toggle');
  var html = document.documentElement;

  // Restore saved theme on page load
  if (localStorage.getItem('theme') === 'dark') {
    html.setAttribute('data-theme', 'dark');
  }

  if (!toggle) return;

  toggle.addEventListener('click', function () {
    var isDark = html.getAttribute('data-theme') === 'dark';
    if (isDark) {
      html.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
  });
}



document.addEventListener('DOMContentLoaded', () => {
  initPageTransitions();
  initPageShowHandler();
  initThemeToggle();

  if (window.IaApi) {
    requireAuth();
    initSidebarToggle();
  }
});
