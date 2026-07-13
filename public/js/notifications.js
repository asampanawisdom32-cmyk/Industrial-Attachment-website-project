/**
 * Notification dropdown panel — toggles open/closed, renders items, marks read.
 * Reads notifications from localStorage (client-side for now).
 */
(function () {
  var NOTIF_KEY = 'ia_notifications';
  var READ_KEY = 'ia_notifications_read';

  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function getNotifications() {
    try { return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]'); } catch { return []; }
  }

  function getReadIds() {
    try { return JSON.parse(localStorage.getItem(READ_KEY) || '[]'); } catch { return []; }
  }

  function markAllRead() {
    var ids = getNotifications().map(function (n) { return n.id; });
    localStorage.setItem(READ_KEY, JSON.stringify(ids));
    renderList();
    updateDot();
  }

  function markRead(id) {
    var read = getReadIds();
    if (read.indexOf(id) === -1) read.push(id);
    localStorage.setItem(READ_KEY, JSON.stringify(read));
    renderList();
    updateDot();
  }

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.floor(hrs / 24);
    return days + 'd ago';
  }

  function renderList() {
    var list = document.getElementById('notification-list');
    if (!list) return;
    var items = getNotifications();
    var readIds = getReadIds();

    if (!items.length) {
      list.innerHTML = '<div class="notification-empty">No notifications yet</div>';
      return;
    }

    list.innerHTML = items.map(function (n) {
      var isUnread = readIds.indexOf(n.id) === -1;
      var iconClass = n.type === 'success' ? 'success' : n.type === 'warning' ? 'warning' : n.type === 'error' ? 'error' : '';
      var icon = n.type === 'success' ? '&#10003;' : n.type === 'warning' ? '!' : n.type === 'error' ? '&#10007;' : '\uD83D\uDD14';
      return '<div class="notification-item' + (isUnread ? ' unread' : '') + '" data-notif-id="' + n.id + '">' +
        '<div class="notif-icon ' + iconClass + '">' + icon + '</div>' +
        '<div class="notif-body">' +
          '<p class="notif-title">' + escapeHtml(n.title || '') + '</p>' +
          '<p class="notif-desc">' + escapeHtml(n.desc || '') + '</p>' +
          '<div class="notif-time">' + timeAgo(n.ts || Date.now()) + '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.notification-item').forEach(function (el) {
      el.addEventListener('click', function () {
        markRead(el.getAttribute('data-notif-id'));
      });
    });
  }

  function updateDot() {
    var items = getNotifications();
    var readIds = getReadIds();
    var unread = items.filter(function (n) { return readIds.indexOf(n.id) === -1; }).length;
    var dot = document.getElementById('notification-dot');
    if (dot) dot.style.display = unread > 0 ? '' : 'none';
  }

  function addNotification(title, desc, type) {
    var items = getNotifications();
    var id = 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    items.unshift({ id: id, title: title, desc: desc || '', type: type || 'info', ts: Date.now() });
    if (items.length > 50) items = items.slice(0, 50);
    localStorage.setItem(NOTIF_KEY, JSON.stringify(items));
    renderList();
    updateDot();
  }

  // Expose for other scripts
  window.IaNotifications = {
    add: addNotification,
    refresh: function () { renderList(); updateDot(); }
  };

  // Listen for ia:user-ready to seed initial notifications
  document.addEventListener('ia:user-ready', function (e) {
    var user = e.detail;
    if (!user) return;
    var existing = getNotifications();
    if (existing.length > 0) return;

    var role = user.role || 'student';
    var name = (user.name || 'there').split(' ')[0];
    addNotification('Welcome, ' + name + '!', 'You are signed in as ' + role.replace(/_/g, ' ') + '.', 'info');

    if (role === 'student') {
      addNotification('Complete your profile', 'Fill in your placement details to get started.', 'warning');
    } else if (role === 'admin') {
      addNotification('Admin panel ready', 'Manage supervisors and assign students.', 'info');
    } else if (role.indexOf('supervisor') !== -1) {
      addNotification('Review pending', 'Check student reports awaiting your evaluation.', 'info');
    }
  });

  // Init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('notification-btn');
    var dropdown = document.getElementById('notification-dropdown');
    var markAllBtn = document.getElementById('notification-mark-all');

    if (!btn || !dropdown) return;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var isOpen = !dropdown.hidden;
      dropdown.hidden = isOpen;
      if (!isOpen) {
        renderList();
        updateDot();
      }
    });

    if (markAllBtn) {
      markAllBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        markAllRead();
      });
    }

    // Close on outside click
    document.addEventListener('click', function (e) {
      if (!dropdown.hidden && !dropdown.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
        dropdown.hidden = true;
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !dropdown.hidden) {
        dropdown.hidden = true;
      }
    });

    renderList();
    updateDot();
  });
})();
