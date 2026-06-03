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

  function parseTechTags(raw) {
    if (raw == null || raw === '') return [];
    if (Array.isArray(raw)) {
      return raw.map(function (t) { return String(t).trim(); }).filter(Boolean).slice(0, 24);
    }
    return String(raw)
      .split(/[\n,]+/)
      .map(function (t) { return t.trim(); })
      .filter(Boolean)
      .slice(0, 24);
  }

  function imageUrlsFromRecord(row) {
    if (!row || typeof row !== 'object') return [];
    if (Array.isArray(row.imageUrls) && row.imageUrls.length) {
      return row.imageUrls.map(function (u) { return String(u || '').trim(); }).filter(Boolean).slice(0, 12);
    }
    if (row.imageUrl) return [String(row.imageUrl).trim()];
    return [];
  }

  function normalizePortfolio(id, row) {
    row = row || {};
    return {
      id: id,
      title: String(row.title || '').slice(0, 200),
      description: String(row.description || '').slice(0, 8000),
      outcome: String(row.outcome || '').slice(0, 4000),
      imageAlt: String(row.imageAlt || '').slice(0, 200),
      imageUrls: imageUrlsFromRecord(row),
      techTags: parseTechTags(row.techTags)
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

  function renderMultilineHtml(text) {
    return esc(text).replace(/\r?\n/g, '<br>');
  }

  function renderShowcaseHtml(showcase) {
    if (!showcase) return '';
    var urls = showcase.imageUrls || [];
    var carousel =
      urls.length > 0
        ? '<div class="client-portal-showcase-carousel" data-showcase-carousel>' +
          '<div class="client-portal-showcase-track">' +
          urls
            .map(function (url, i) {
              return (
                '<figure class="client-portal-showcase-slide' +
                (i === 0 ? ' is-active' : '') +
                '" data-showcase-slide="' +
                i +
                '">' +
                '<img src="' +
                esc(url) +
                '" alt="' +
                esc(showcase.imageAlt || showcase.title || 'Project screenshot') +
                '" loading="lazy">' +
                '</figure>'
              );
            })
            .join('') +
          '</div>' +
          (urls.length > 1
            ? '<div class="client-portal-showcase-controls">' +
              '<button type="button" class="client-portal-showcase-btn" data-showcase-prev aria-label="Previous screenshot">‹</button>' +
              '<span class="client-portal-showcase-counter" data-showcase-counter>1 / ' +
              urls.length +
              '</span>' +
              '<button type="button" class="client-portal-showcase-btn" data-showcase-next aria-label="Next screenshot">›</button>' +
              '</div>'
            : '') +
          '</div>'
        : '';

    var techTags = showcase.techTags || [];
    var techHtml = techTags.length
      ? '<div class="client-portal-tech-tags">' +
        techTags
          .map(function (tag) {
            return '<span class="client-portal-tech-tag">' + esc(tag) + '</span>';
          })
          .join('') +
        '</div>'
      : '';

    var outcomeHtml =
      showcase.outcome && showcase.outcome.trim()
        ? '<div class="client-portal-showcase-outcome"><strong>Outcome</strong><p>' +
          renderMultilineHtml(showcase.outcome.trim()) +
          '</p></div>'
        : '';

    return (
      '<section class="client-portal-section client-portal-showcase">' +
      '<h2>' +
      esc(showcase.title || 'Project showcase') +
      '</h2>' +
      carousel +
      (showcase.description && showcase.description.trim()
        ? '<div class="client-portal-showcase-description">' + renderMultilineHtml(showcase.description.trim()) + '</div>'
        : '') +
      techHtml +
      outcomeHtml +
      '</section>'
    );
  }

  function initShowcaseCarousel(root) {
    if (!root) return;
    var carousel = root.querySelector('[data-showcase-carousel]');
    if (!carousel) return;
    var slides = carousel.querySelectorAll('[data-showcase-slide]');
    if (slides.length <= 1) return;
    var counter = carousel.querySelector('[data-showcase-counter]');
    var index = 0;

    function showSlide(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-active', i === index);
      });
      if (counter) counter.textContent = index + 1 + ' / ' + slides.length;
    }

    var prev = carousel.querySelector('[data-showcase-prev]');
    var next = carousel.querySelector('[data-showcase-next]');
    if (prev) prev.addEventListener('click', function () { showSlide(index - 1); });
    if (next) next.addEventListener('click', function () { showSlide(index + 1); });
  }

  function renderProject(inner, p, showcase) {
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
      renderShowcaseHtml(showcase) +
      '<section class="client-portal-section"><h2>Share files</h2>' +
      '<p class="client-portal-note">Email assets to your project contact, or use the message below.</p>' +
      '<textarea class="client-portal-textarea" rows="3" readonly>Project: ' + esc(p.title) + ' — assets shared via client portal.</textarea></section>';

    initShowcaseCarousel(inner);
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

      var showcase = null;
      if (p.portfolioProjectId) {
        var portSnap = await window.rtdbGet(
          window.rtdbRef(window.rtdb, PATH_PORTFOLIO + '/' + p.portfolioProjectId)
        );
        if (portSnap.val()) {
          showcase = normalizePortfolio(p.portfolioProjectId, portSnap.val());
        }
      }

      renderProject(inner, p, showcase);
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
