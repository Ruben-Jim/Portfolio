/**
 * Public client project portal — /portal/{token}
 * Loaded only from portal.html (no admin UI).
 */
(function () {
  'use strict';

  var PATH_PORTALS = 'agencyClientPortals';
  var PATH_PROJECTS = 'agencyProjects';
  var PATH_PORTFOLIO = 'portfolioProjects';

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
      portfolioProjectId: String(row.portfolioProjectId || '').slice(0, 80),
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

  async function loadPortfolioRecord(id) {
    if (!id) return null;
    var snap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_PORTFOLIO + '/' + id));
    if (!snap.val()) return null;
    return Object.assign({ id: id }, snap.val());
  }

  function findPortfolioMatchId(hubRow, allPortfolioVal) {
    if (!allPortfolioVal || typeof allPortfolioVal !== 'object') return '';
    var title = String(hubRow.title || hubRow.clientName || '').toLowerCase().trim();
    if (!title) return '';
    var keys = Object.keys(allPortfolioVal);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var pt = String(allPortfolioVal[key].title || '').toLowerCase();
      if (pt.indexOf(title) >= 0 || title.indexOf(pt) >= 0) return key;
    }
    return '';
  }

  async function resolveShowcaseRaw(hubRow) {
    if (hubRow.portfolioProjectId) {
      var linked = await loadPortfolioRecord(hubRow.portfolioProjectId);
      if (linked) return linked;
    }
    var allSnap = await window.rtdbGet(window.rtdbRef(window.rtdb, PATH_PORTFOLIO));
    var allVal = allSnap.val();
    if (!allVal) return null;
    var matchedId = findPortfolioMatchId(hubRow, allVal);
    if (!matchedId) return null;
    return loadPortfolioRecord(matchedId);
  }

  function renderBrandHeader(project) {
    return (
      '<div class="client-portal-brand">' +
      '<h1>' +
      esc(project.clientName || project.title || 'Your project') +
      '</h1>' +
      '<p class="client-portal-tagline">CodeWithRuben client portal</p></div>'
    );
  }

  function renderStatusFooter(project, detailRecord, options) {
    options = options || {};
    var done = project.milestones.filter(function (m) { return m.done; }).length;
    var total = project.milestones.length || 0;
    var liveUrl =
      window.PortfolioDetailShared && detailRecord
        ? window.PortfolioDetailShared.resolveLiveUrl(detailRecord, options)
        : '';
    var expoUrl = String(project.expoUrl || '').trim();
    var showPreview =
      expoUrl &&
      expoUrl !== '#' &&
      (!liveUrl || expoUrl.replace(/\/+$/, '') !== liveUrl.replace(/\/+$/, ''));

    return (
      '<details class="client-portal-status-footer">' +
      '<summary>Project status</summary>' +
      '<div class="client-portal-status-footer-body">' +
      '<p class="client-portal-status-meta">' +
      done +
      ' of ' +
      total +
      ' milestones complete</p>' +
      project.milestones
        .map(function (m) {
          return (
            '<div class="client-portal-milestone' +
            (m.done ? ' done' : '') +
            '">' +
            '<span class="client-portal-milestone-icon" aria-hidden="true"></span>' +
            '<span>' +
            esc(m.label) +
            '</span></div>'
          );
        })
        .join('') +
      (showPreview
        ? '<p class="client-portal-status-preview"><a class="btn btn-primary" href="' +
          esc(expoUrl) +
          '" target="_blank" rel="noopener">Open preview</a></p>'
        : '') +
      '</div></details>'
    );
  }

  function renderNoShowcaseMessage() {
    return (
      '<section class="client-portal-section client-portal-empty-showcase">' +
      '<h2>Project showcase</h2>' +
      '<p>No client showcase is linked to this project yet. Your project contact will share the full detail page once it is ready.</p>' +
      '</section>'
    );
  }

  function renderProjectPage(inner, project, detailRecord, detailOptions) {
    var brand = renderBrandHeader(project);
    var detailHtml = '';
    if (detailRecord && window.PortfolioDetailShared) {
      detailHtml = window.PortfolioDetailShared.renderPortfolioDetailHtml(detailRecord, detailOptions);
    } else {
      detailHtml = renderNoShowcaseMessage();
    }
    var footer = renderStatusFooter(project, detailRecord, detailOptions);
    inner.innerHTML = brand + detailHtml + footer;
    if (detailRecord && window.PortfolioDetailShared) {
      window.PortfolioDetailShared.initPortfolioDetailPage(inner, detailRecord, detailOptions);
    }
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

    if (!window.PortfolioDetailShared) {
      renderError(inner, 'Unable to load project showcase. Please try again later.');
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
      var hubRow = projSnap.val() || {};
      var project = normalizeProject(link.projectId, hubRow);
      var showcaseRaw = await resolveShowcaseRaw(hubRow);
      var detailRecord = showcaseRaw
        ? window.PortfolioDetailShared.normalizePortfolioDetailRecord(showcaseRaw, showcaseRaw.id)
        : null;
      var detailOptions = {
        hideBuyButtons: true,
        hideQuoteButton: true,
        showLiveButton: true,
        liveUrlFallback: project.expoUrl,
        adminSectionLabel: 'Admin dashboard'
      };

      renderProjectPage(inner, project, detailRecord, detailOptions);
      document.title = (project.clientName || project.title || 'Your project') + ' — CodeWithRuben';
    } catch (err) {
      console.error(err);
      renderError(inner, 'Unable to load project data. Please try again later.');
    }
  }

  function boot() {
    loadClientPortal(getPortalToken());
  }

  function waitForSdk() {
    var attempts = 0;
    (function tick() {
      if (
        window.FIREBASE_CONFIG &&
        window.initializeApp &&
        window.getDatabase &&
        window.rtdbRef &&
        window.rtdbGet &&
        window.PortfolioDetailShared
      ) {
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
