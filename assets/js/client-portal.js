/**
 * Public client project portal — /portal/{token}
 * Loaded only from portal.html (no admin UI).
 */
(function () {
  'use strict';

  var PATH_PORTALS = 'agencyClientPortals';
  var PATH_PROJECTS = 'agencyProjects';

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function rtdbReady() {
    return !!(window.rtdb && window.rtdbRef && window.rtdbGet);
  }

  function normalizeProject(id, row) {
    row = row || {};
    var milestones = Array.isArray(row.milestones) ? row.milestones : [];
    return {
      id: id,
      clientName: String(row.clientName || '').slice(0, 120),
      title: String(row.title || '').slice(0, 200),
      expoUrl: String(row.expoUrl || '').slice(0, 500),
      milestones: milestones.map(function (m, i) {
        return {
          id: m.id || 'm' + i,
          label: String(m.label || '').slice(0, 120),
          done: !!m.done
        };
      })
    };
  }

  function getPortalToken() {
    var params = new URLSearchParams(location.search);
    var fromQuery = params.get('token');
    if (fromQuery) return fromQuery.replace(/[^a-f0-9]/gi, '').slice(0, 64);

    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var portalIdx = parts.indexOf('portal');
    if (portalIdx >= 0 && parts[portalIdx + 1] && parts[portalIdx + 1] !== 'portal.html') {
      return parts[portalIdx + 1].replace(/[^a-f0-9]/gi, '').slice(0, 64);
    }
    return '';
  }

  function renderProject(inner, p) {
    var done = p.milestones.filter(function (m) { return m.done; }).length;
    var total = p.milestones.length || 0;
    inner.innerHTML =
      '<div class="client-portal-brand"><h1>' + esc(p.clientName || p.title || 'Your project') + '</h1>' +
      '<p class="client-portal-tagline">CodeWithRuben client portal</p></div>' +
      '<section class="client-portal-section"><h2>Progress</h2>' +
      '<p>' + done + ' of ' + total + ' milestones complete</p>' +
      p.milestones.map(function (m) {
        return '<div class="client-portal-milestone' + (m.done ? ' done' : '') + '">' +
          '<span class="client-portal-milestone-icon" aria-hidden="true"></span>' +
          '<span>' + esc(m.label) + '</span></div>';
      }).join('') +
      '</section>' +
      (p.expoUrl
        ? '<section class="client-portal-section"><h2>Preview</h2><a class="btn btn-primary" href="' + esc(p.expoUrl) + '" target="_blank" rel="noopener">Open preview</a></section>'
        : '') +
      '<section class="client-portal-section"><h2>Share files</h2>' +
      '<p class="client-portal-note">Email assets to your project contact, or use the message below.</p>' +
      '<textarea class="client-portal-textarea" rows="3" readonly>Project: ' + esc(p.title) + ' — assets shared via client portal.</textarea></section>';
  }

  function renderError(inner, message) {
    inner.innerHTML = '<p class="client-portal-error">' + esc(message) + '</p>';
  }

  function initFirebase() {
    var cfg = window.FIREBASE_CONFIG;
    if (!cfg || typeof window.initializeApp !== 'function' || typeof window.getDatabase !== 'function') {
      return false;
    }
    try {
      var app = window.initializeApp(cfg);
      window.rtdb = window.getDatabase(app);
      return !!window.rtdb;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function loadClientPortal(token) {
    var inner = document.getElementById('client-portal-inner');
    if (!inner) return;

    if (!token) {
      renderError(inner, 'This client link is invalid or expired.');
      return;
    }

    if (!initFirebase() || !rtdbReady()) {
      renderError(inner, 'Unable to load project data. Please try again later.');
      return;
    }

    try {
      var linkSnap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_PORTALS + '/' + token));
      var link = linkSnap.val();
      if (!link || !link.projectId || (link.expiresAt && link.expiresAt < Date.now())) {
        renderError(inner, 'This client link is invalid or expired.');
        return;
      }

      var projSnap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_PROJECTS + '/' + link.projectId));
      var p = normalizeProject(link.projectId, projSnap.val());
      renderProject(inner, p);
      document.title = (p.clientName || p.title || 'Your project') + ' — CodeWithRuben';
    } catch (err) {
      console.error(err);
      renderError(inner, 'Unable to load project data. Please try again later.');
    }
  }

  function boot() {
    var token = getPortalToken();
    loadClientPortal(token);
  }

  function waitForSdk() {
    var attempts = 0;
    (function tick() {
      if (window.FIREBASE_CONFIG && window.initializeApp && window.getDatabase && window.rtdbRef && window.rtdbGet) {
        boot();
        return;
      }
      if (++attempts > 120) {
        var inner = document.getElementById('client-portal-inner');
        if (inner) renderError(inner, 'Unable to load project data. Please try again later.');
        return;
      }
      setTimeout(tick, 50);
    })();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForSdk);
  } else {
    waitForSdk();
  }
})();
