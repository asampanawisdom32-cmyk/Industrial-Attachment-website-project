/**
 * E2E Dashboard Rendering Tests
 *
 * These tests render each EJS template directly with ejs.renderFile() and
 * parse the HTML with cheerio to check for expected CSS classes and
 * structural elements. This catches styling regressions without needing
 * Firebase credentials or Express middleware.
 */
const ejs = require('ejs');
const path = require('path');
const cheerio = require('cheerio');

const VIEWS_DIR = path.join(__dirname, '..', '..', 'views');

/**
 * Render an EJS template and return a cheerio instance.
 * @param {string} templatePath - Path relative to views/ (e.g. 'dashboards/admin.ejs')
 * @param {object} data - Template variables
 */
async function render(templatePath, data = {}) {
  const filePath = path.join(VIEWS_DIR, templatePath);
  const html = await ejs.renderFile(filePath, data);
  return cheerio.load(html);
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────
describe('Admin Dashboard (dashboards/admin.ejs)', () => {
  let $;

  beforeAll(async () => {
    $ = await render('dashboards/admin.ejs', {
      title: 'Admin Dashboard',
      page: 'admin-dashboard',
      user: null,
    });
  });

  it('renders the dashboard-root container with data-role="admin"', () => {
    const root = $('#dashboard-root');
    expect(root.length).toBe(1);
    expect(root.attr('data-role')).toBe('admin');
    expect(root.attr('data-page-root')).toBe('');
  });

  it('renders admin-stats-grid with 4 admin-stat-card elements', () => {
    expect($('.admin-stats-grid').length).toBe(1);
    expect($('.admin-stat-card').length).toBe(4);
  });

  it('renders stat cards with correct accent classes', () => {
    const cards = $('.admin-stat-card');
    expect(cards.eq(0).hasClass('primary')).toBe(true);
    expect(cards.eq(1).hasClass('teal')).toBe(true);
    expect(cards.eq(2).hasClass('gold')).toBe(true);
    expect(cards.eq(3).hasClass('blue')).toBe(true);
  });

  it('renders stat values and labels inside each card', () => {
    $('.admin-stat-card').each((_i, card) => {
      const $card = $(card);
      expect($card.find('.admin-stat-value').length).toBe(1);
      expect($card.find('.admin-stat-label').length).toBe(1);
    });
  });

  it('renders analytics-grid with 2 premium cards', () => {
    expect($('.analytics-grid').length).toBe(1);
    expect($('.analytics-grid .premium-card').length).toBe(2);
  });

  it('renders quick-actions section', () => {
    expect($('.dashboard-section').length).toBe(1);
    expect($('.quick-action-btn').length).toBeGreaterThanOrEqual(3);
  });

  it('includes the header with sidebar navigation', () => {
    expect($('.sidebar').length).toBe(1);
    expect($('.nav-menu').length).toBe(1);
    expect($('.sidebar-brand').length).toBe(1);
  });

  it('loads admin.css (page is authenticated)', () => {
    const adminCss = $(`link[href="/css/admin.css"]`);
    expect(adminCss.length).toBe(1);
  });

  it('loads layout.css and dashboard.css', () => {
    expect($(`link[href="/css/layout.css"]`).length).toBe(1);
    expect($(`link[href="/css/dashboard.css"]`).length).toBe(1);
  });

  it('includes the footer scripts', () => {
    expect($('script[src="/js/api.js"]').length).toBe(1);
    expect($('script[src="/js/auth-guard.js"]').length).toBe(1);
  });
});

// ─── Student Dashboard ────────────────────────────────────────────────────
describe('Student Dashboard (dashboards/student.ejs)', () => {
  let $;

  beforeAll(async () => {
    $ = await render('dashboards/student.ejs', {
      title: 'Student Dashboard',
      page: 'student-dashboard',
      user: null,
    });
  });

  it('renders the dashboard-root container with data-role="student"', () => {
    const root = $('#dashboard-root');
    expect(root.length).toBe(1);
    expect(root.attr('data-role')).toBe('student');
  });

  it('has no server-rendered stat cards (rendered by client JS)', () => {
    expect($('.admin-stats-grid').length).toBe(0);
    expect($('.admin-stat-card').length).toBe(0);
  });

  it('loads admin.css (page is authenticated)', () => {
    expect($(`link[href="/css/admin.css"]`).length).toBe(1);
  });

  it('includes the header with sidebar', () => {
    expect($('.sidebar').length).toBe(1);
  });
});

// ─── School Supervisor Dashboard ──────────────────────────────────────────
describe('School Supervisor Dashboard (dashboards/school-supervisor.ejs)', () => {
  let $;

  beforeAll(async () => {
    $ = await render('dashboards/school-supervisor.ejs', {
      title: 'School Supervisor Dashboard',
      page: 'school-supervisor-dashboard',
      user: null,
    });
  });

  it('renders the dashboard-root container with data-role="school_supervisor"', () => {
    const root = $('#dashboard-root');
    expect(root.length).toBe(1);
    expect(root.attr('data-role')).toBe('school_supervisor');
  });

  it('renders admin-stats-grid with 4 admin-stat-card elements', () => {
    expect($('.admin-stats-grid').length).toBe(1);
    expect($('.admin-stat-card').length).toBe(4);
  });

  it('renders stat cards with correct accent classes', () => {
    const cards = $('.admin-stat-card');
    expect(cards.eq(0).hasClass('primary')).toBe(true);
    expect(cards.eq(1).hasClass('teal')).toBe(true);
    expect(cards.eq(2).hasClass('gold')).toBe(true);
    expect(cards.eq(3).hasClass('blue')).toBe(true);
  });

  it('renders supervisor-specific stat IDs', () => {
    expect($('#supervisor-students').length).toBe(1);
    expect($('#supervisor-pending').length).toBe(1);
    expect($('#supervisor-reviewed').length).toBe(1);
    expect($('#supervisor-score').length).toBe(1);
  });

  it('renders analytics-grid with premium cards and quick actions', () => {
    expect($('.analytics-grid').length).toBe(1);
    expect($('.premium-card').length).toBe(2);
    expect($('.quick-action-btn').length).toBeGreaterThanOrEqual(2);
  });

  it('loads admin.css (page is authenticated)', () => {
    expect($(`link[href="/css/admin.css"]`).length).toBe(1);
  });
});

// ─── Workplace Supervisor Dashboard ───────────────────────────────────────
describe('Workplace Supervisor Dashboard (dashboards/workplace-supervisor.ejs)', () => {
  let $;

  beforeAll(async () => {
    $ = await render('dashboards/workplace-supervisor.ejs', {
      title: 'Workplace Supervisor Dashboard',
      page: 'workplace-supervisor-dashboard',
      user: null,
    });
  });

  it('renders the dashboard-root container with data-role="workplace_supervisor"', () => {
    const root = $('#dashboard-root');
    expect(root.length).toBe(1);
    expect(root.attr('data-role')).toBe('workplace_supervisor');
  });

  it('renders admin-stats-grid with 4 admin-stat-card elements', () => {
    expect($('.admin-stats-grid').length).toBe(1);
    expect($('.admin-stat-card').length).toBe(4);
  });

  it('renders stat cards with correct accent classes', () => {
    const cards = $('.admin-stat-card');
    expect(cards.eq(0).hasClass('primary')).toBe(true);
    expect(cards.eq(1).hasClass('teal')).toBe(true);
    expect(cards.eq(2).hasClass('gold')).toBe(true);
    expect(cards.eq(3).hasClass('blue')).toBe(true);
  });

  it('renders workplace-specific stat IDs', () => {
    expect($('#wp-students').length).toBe(1);
    expect($('#wp-pending').length).toBe(1);
    expect($('#wp-attendance').length).toBe(1);
    expect($('#wp-feedback').length).toBe(1);
  });

  it('renders analytics-grid with premium cards', () => {
    expect($('.analytics-grid').length).toBe(1);
    expect($('.premium-card').length).toBe(2);
  });

  it('loads admin.css (page is authenticated)', () => {
    expect($(`link[href="/css/admin.css"]`).length).toBe(1);
  });
});

// ─── Login Page (no admin.css) ────────────────────────────────────────────
describe('Login Page (login.ejs) — public, no auth', () => {
  let $;

  beforeAll(async () => {
    $ = await render('login.ejs', { error: null });
  });

  it('renders the login page with class "login-page" on body', () => {
    expect($('body.login-page').length).toBe(1);
  });

  it('renders login wrapper with brand panel and form panel', () => {
    expect($('.login-wrapper').length).toBe(1);
    expect($('.login-brand-panel').length).toBe(1);
    expect($('.login-form-panel').length).toBe(1);
  });

  it('renders login form with email, password, and role fields', () => {
    expect($('#login-form').length).toBe(1);
    expect($('#login-email').length).toBe(1);
    expect($('#login-password').length).toBe(1);
    expect($('#login-role').length).toBe(1);
    expect($('#login-submit').length).toBe(1);
  });

  it('renders forgot password modal', () => {
    expect($('#forgot-modal').length).toBe(1);
    expect($('#forgot-email').length).toBe(1);
    expect($('#forgot-submit').length).toBe(1);
  });

  it('loads layout.css and style.css (NOT dashboard.css or admin.css)', () => {
    expect($(`link[href="/css/layout.css"]`).length).toBe(1);
    expect($(`link[href="/css/style.css"]`).length).toBe(1);
    expect($(`link[href="/css/dashboard.css"]`).length).toBe(0);
    expect($(`link[href="/css/admin.css"]`).length).toBe(0);
  });

  it('renders link to signup page', () => {
    const signupLink = $('.login-form-footer a[href="/signup"]');
    expect(signupLink.length).toBe(1);
    expect(signupLink.text()).toContain('Create one');
  });

  it('renders feature list items', () => {
    expect($('.login-feature').length).toBe(3);
  });
});

// ─── Cross-Dashboard Consistency Checks ───────────────────────────────────
describe('Dashboard consistency across all roles', () => {
  const dashboards = [
    { name: 'admin', template: 'dashboards/admin.ejs', page: 'admin-dashboard', role: 'admin' },
    { name: 'student', template: 'dashboards/student.ejs', page: 'student-dashboard', role: 'student' },
    { name: 'school-supervisor', template: 'dashboards/school-supervisor.ejs', page: 'school-supervisor-dashboard', role: 'school_supervisor' },
    { name: 'workplace-supervisor', template: 'dashboards/workplace-supervisor.ejs', page: 'workplace-supervisor-dashboard', role: 'workplace_supervisor' },
  ];

  dashboards.forEach(({ name, template, page, role }) => {
    describe(`${name} dashboard`, () => {
      let $;

      beforeAll(async () => {
        $ = await render(template, { title: `${name} Dashboard`, page, user: null });
      });

      it('has dashboard-root', () => {
        expect($('#dashboard-root').length).toBe(1);
      });

      it(`has data-role="${role}"`, () => {
        expect($('#dashboard-root').attr('data-role')).toBe(role);
      });

      it('has admin-stats-grid (admin-style stats)', () => {
        // Student dashboard is rendered by JS, so static HTML only has the shell
        if (name === 'student') {
          expect($('.admin-stats-grid').length).toBe(0);
        } else {
          expect($('.admin-stats-grid').length).toBe(1);
          expect($('.admin-stat-card').length).toBe(4);
        }
      });

      it('has admin.css loaded', () => {
        expect($(`link[href="/css/admin.css"]`).length).toBe(1);
      });

      it('has sidebar navigation', () => {
        expect($('.sidebar').length).toBe(1);
      });

      it('has footer scripts (api.js + auth-guard.js)', () => {
        expect($('script[src="/js/api.js"]').length).toBe(1);
        expect($('script[src="/js/auth-guard.js"]').length).toBe(1);
      });

      it('has analytics-grid with premium cards (admin/supervisors)', () => {
        // Student dashboard is rendered by JS, so static HTML only has the shell
        if (name !== 'student') {
          expect($('.analytics-grid').length).toBe(1);
          expect($('.premium-card').length).toBe(2);
        }
      });
    });
  });

  it('all dashboards render without rendering errors (no crash test)', async () => {
    const results = await Promise.all(
      dashboards.map(({ template, page }) =>
        render(template, { title: 'Test', page, user: null })
      )
    );
    results.forEach(($) => {
      // Each dashboard should have at least the dashboard-root
      expect($('#dashboard-root').length).toBe(1);
    });
  });

  it('admin and supervisor dashboards use admin-stats-grid (student shell has none)', async () => {
    const admin$ = await render('dashboards/admin.ejs', { title: 'Test', page: 'admin-dashboard', user: null });
    const school$ = await render('dashboards/school-supervisor.ejs', { title: 'Test', page: 'school-supervisor-dashboard', user: null });
    const work$ = await render('dashboards/workplace-supervisor.ejs', { title: 'Test', page: 'workplace-supervisor-dashboard', user: null });
    const student$ = await render('dashboards/student.ejs', { title: 'Test', page: 'student-dashboard', user: null });

    // Admin + supervisors use admin-stats-grid
    expect(admin$('.admin-stats-grid').length).toBe(1);
    expect(school$('.admin-stats-grid').length).toBe(1);
    expect(work$('.admin-stats-grid').length).toBe(1);
    // Student dashboard shell has no stat cards (rendered by client JS)
    expect(student$('.hero-card').length).toBe(0);
    expect(student$('.stat-ring-card').length).toBe(0);
    expect(student$('.admin-stats-grid').length).toBe(0);
  });
});
