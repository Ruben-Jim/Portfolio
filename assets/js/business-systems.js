/**
 * Business Systems Explorer — path fork, catalog render, selection, contact prefill.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'bsActivePath';
  var activePath = '';
  var selectedIds = new Set();
  var initialized = false;

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getData() {
    return window.BUSINESS_SYSTEMS_DATA || null;
  }

  function getPathMeta(pathId) {
    var data = getData();
    if (!data || !data.paths) return null;
    return data.paths[pathId] || null;
  }

  function findCardById(cardId) {
    var data = getData();
    if (!data || !data.catalogs) return null;
    var paths = ['newBrand', 'existingApp'];
    for (var p = 0; p < paths.length; p++) {
      var cats = data.catalogs[paths[p]] || [];
      for (var c = 0; c < cats.length; c++) {
        var cards = cats[c].cards || [];
        for (var i = 0; i < cards.length; i++) {
          if (cards[i].id === cardId) {
            return {
              card: cards[i],
              category: cats[c],
              pathId: paths[p]
            };
          }
        }
      }
    }
    return null;
  }

  function getCatalogForPath(pathId) {
    var data = getData();
    if (!data || !data.catalogs) return [];
    return data.catalogs[pathId] || [];
  }

  function persistPath(pathId) {
    try {
      sessionStorage.setItem(STORAGE_KEY, pathId);
    } catch (e) {}
    if (window.location.hash !== '#' + pathId) {
      try {
        window.history.replaceState(
          window.history.state,
          '',
          window.location.pathname + window.location.search + '#' + pathId
        );
      } catch (err) {}
    }
  }

  function loadPersistedPath() {
    var hash = (window.location.hash || '').replace(/^#/, '');
    if (hash === 'newBrand' || hash === 'existingApp') return hash;
    try {
      var saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved === 'newBrand' || saved === 'existingApp') return saved;
    } catch (e) {}
    return '';
  }

  function updateStickyBar() {
    var countEl = document.getElementById('bs-selection-count');
    var contactBtn = document.getElementById('bs-contact-btn');
    var n = selectedIds.size;
    if (countEl) {
      countEl.textContent =
        n === 0
          ? 'Tap the offers you’re interested in'
          : n === 1
            ? '1 offer selected'
            : n + ' offers selected';
    }
    if (contactBtn) {
      contactBtn.disabled = n === 0;
      contactBtn.setAttribute('aria-disabled', n === 0 ? 'true' : 'false');
    }
  }

  function renderCatalog(pathId) {
    var catalogEl = document.getElementById('bs-catalog');
    if (!catalogEl) return;

    var categories = getCatalogForPath(pathId);
    if (!categories.length) {
      catalogEl.innerHTML = '<p class="bs-catalog-empty">Nothing listed for this path yet — check back soon.</p>';
      catalogEl.hidden = false;
      return;
    }

    var html = '';
    categories.forEach(function (cat) {
      html += '<section class="bs-category" data-category="' + esc(cat.id) + '">';
      html += '<h3 class="h3 bs-category-title">' + esc(cat.title) + '</h3>';
      html += '<div class="bs-card-grid">';
      (cat.cards || []).forEach(function (card) {
        var selected = selectedIds.has(card.id);
        var featured = card.featured ? ' bs-system-card--featured' : '';
        html +=
          '<article class="bs-system-card' +
          featured +
          (selected ? ' is-selected' : '') +
          '" data-card-id="' +
          esc(card.id) +
          '">' +
          '<button type="button" class="bs-system-card-select" data-bs-select="' +
          esc(card.id) +
          '" aria-pressed="' +
          (selected ? 'true' : 'false') +
          '" aria-label="Interested in ' +
          esc(card.title) +
          '">' +
          '<span class="bs-system-card-check" aria-hidden="true"><ion-icon name="checkmark-outline"></ion-icon></span>' +
          '</button>' +
          (card.featured ? '<span class="bs-system-card-badge">Popular</span>' : '') +
          '<h4 class="bs-system-card-title">' +
          esc(card.title) +
          '</h4>' +
          '<p class="bs-system-card-summary">' +
          esc(card.summary) +
          '</p>';
        if (card.priceBand) {
          html +=
            '<p class="bs-system-card-price">' +
            esc(card.priceBand) +
            '</p>';
        }
        if (card.tags && card.tags.length) {
          html += '<ul class="bs-system-card-tags">';
          card.tags.forEach(function (tag) {
            html += '<li>' + esc(tag) + '</li>';
          });
          html += '</ul>';
        }
        if (card.demoUrl && card.demoUrl !== '#') {
          html +=
            '<a class="bs-system-card-demo" href="' +
            esc(card.demoUrl) +
            '" target="_blank" rel="noopener noreferrer">View demo</a>';
        }
        html += '</article>';
      });
      html += '</div></section>';
    });

    catalogEl.innerHTML = html;
    catalogEl.hidden = false;
  }

  function setActivePath(pathId, skipPersist) {
    var data = getData();
    if (!data) return;
    if (pathId !== 'newBrand' && pathId !== 'existingApp') return;

    activePath = pathId;
    if (!skipPersist) persistPath(pathId);

    var fork = document.getElementById('bs-path-fork');
    if (fork) {
      fork.querySelectorAll('[data-bs-path]').forEach(function (btn) {
        var on = btn.getAttribute('data-bs-path') === pathId;
        btn.classList.toggle('is-active', on);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    }

    var hint = document.getElementById('bs-path-hint');
    var meta = getPathMeta(pathId);
    if (hint && meta) {
      hint.textContent = meta.description;
      hint.hidden = false;
    }

    renderCatalog(pathId);
    updateStickyBar();
  }

  function toggleCard(cardId) {
    if (selectedIds.has(cardId)) selectedIds.delete(cardId);
    else selectedIds.add(cardId);

    var cardEl = document.querySelector('.bs-system-card[data-card-id="' + cardId + '"]');
    if (cardEl) {
      var on = selectedIds.has(cardId);
      cardEl.classList.toggle('is-selected', on);
      var btn = cardEl.querySelector('[data-bs-select]');
      if (btn) btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    updateStickyBar();
  }

  function buildContactPrefill() {
    var data = getData();
    var pathMeta = getPathMeta(activePath);
    var pathLabel = pathMeta ? pathMeta.sublabel : activePath;

    var lines = [
      'I looked through your What We Build page.',
      '',
      'My situation: ' + pathLabel,
      '',
      'What I’m interested in:'
    ];

    var ids = Array.from(selectedIds);
    ids.forEach(function (id) {
      var found = findCardById(id);
      if (found) {
        lines.push('• ' + found.card.title);
      }
    });

    lines.push('');
    lines.push(
      'Please reply with next steps and how this maps to your packages (happy to review Services & Pricing on a call).'
    );

    return {
      subject: 'What We Build — ' + pathLabel + ' (' + ids.length + ' items)',
      message: lines.join('\n')
    };
  }

  function goToContact() {
    if (!selectedIds.size) return;
    var prefill = buildContactPrefill();
    if (typeof window.prefillContactForm === 'function') {
      window.prefillContactForm(prefill.subject, prefill.message);
    }
    if (typeof window.switchToPage === 'function') {
      window.switchToPage('contact');
    }
  }

  function bindEvents() {
    var article = document.querySelector('[data-page="business-systems"]');
    if (!article || article.dataset.bsBound === '1') return;
    article.dataset.bsBound = '1';

    var fork = document.getElementById('bs-path-fork');
    if (fork) {
      fork.addEventListener('click', function (e) {
        var pathBtn = e.target.closest('[data-bs-path]');
        if (!pathBtn) return;
        e.preventDefault();
        setActivePath(pathBtn.getAttribute('data-bs-path'));
      });
    }

    var catalog = document.getElementById('bs-catalog');
    if (catalog) {
      catalog.addEventListener('click', function (e) {
        if (e.target.closest('.bs-system-card-demo')) return;
        var selectBtn = e.target.closest('[data-bs-select]');
        var card = e.target.closest('.bs-system-card');
        if (selectBtn) {
          e.preventDefault();
          toggleCard(selectBtn.getAttribute('data-bs-select'));
          return;
        }
        if (card) {
          var id = card.getAttribute('data-card-id');
          if (id) toggleCard(id);
        }
      });
    }

    var contactBtn = document.getElementById('bs-contact-btn');
    if (contactBtn) {
      contactBtn.addEventListener('click', function (e) {
        e.preventDefault();
        goToContact();
      });
    }

    var packagesBtn = document.getElementById('bs-packages-btn');
    if (packagesBtn) {
      packagesBtn.addEventListener('click', function (e) {
        e.preventDefault();
        if (typeof window.switchToPage === 'function') window.switchToPage('services-pricing');
      });
    }

    window.addEventListener('hashchange', function () {
      if (!article.classList.contains('active')) return;
      var h = loadPersistedPath();
      if (h && h !== activePath) setActivePath(h, true);
    });
  }

  function initBusinessSystemsPage() {
    if (!getData()) return;

    var data = getData();
    var leadEl = document.getElementById('bs-page-lead');
    if (leadEl && data.pageLead) leadEl.textContent = data.pageLead;

    bindEvents();

    var initial = loadPersistedPath();
    if (initial) {
      setActivePath(initial, true);
    } else {
      var catalogEl = document.getElementById('bs-catalog');
      if (catalogEl) catalogEl.hidden = true;
      var hint = document.getElementById('bs-path-hint');
      if (hint) hint.hidden = true;
    }

    updateStickyBar();
    initialized = true;
  }

  function onPageActivated() {
    var article = document.querySelector('[data-page="business-systems"]');
    if (!article || !article.classList.contains('active')) return;
    initBusinessSystemsPage();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initBusinessSystemsPage();
    var pages = document.querySelectorAll('[data-page]');
    pages.forEach(function (page) {
      if (page.dataset.page !== 'business-systems') return;
      var obs = new MutationObserver(function () {
        if (page.classList.contains('active')) onPageActivated();
      });
      obs.observe(page, { attributes: true, attributeFilter: ['class'] });
    });
  });

  window.initBusinessSystemsPage = initBusinessSystemsPage;
})();
