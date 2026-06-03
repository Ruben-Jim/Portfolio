/**
 * Shared portfolio detail view — used by client portal (and optionally public modal later).
 */
(function (global) {
  'use strict';

  var PLACEHOLDER_IMAGE = '/assets/images/projects/project-comingsoon.svg';
  var IMAGE_CACHE_BUST = '20260518b';
  var MAX_DETAIL_SECTIONS = 8;

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeAssetImageUrl(url) {
    var s = String(url || '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (s.charAt(0) === '/') return s;
    if (/^\.?\/?assets\//i.test(s)) return '/' + s.replace(/^\.?\//, '');
    return s;
  }

  function displayImageSrc(url) {
    var path = normalizeAssetImageUrl(url) || PLACEHOLDER_IMAGE;
    if (/^https?:\/\//i.test(path)) return path;
    if (path.indexOf('/') !== 0) path = '/' + path.replace(/^\.?\//, '');
    return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v=' + IMAGE_CACHE_BUST;
  }

  function imageUrlFromRecord(row) {
    if (!row || typeof row !== 'object') return '';
    return normalizeAssetImageUrl(row.imageUrl || row.imageURL || row.image || row.thumbnailUrl || '');
  }

  function parseImageUrls(row) {
    var list = [];
    var seen = {};
    function pushUrl(url) {
      var normalized = normalizeAssetImageUrl(url);
      if (!normalized || seen[normalized]) return;
      seen[normalized] = true;
      list.push(normalized);
    }
    if (row && Array.isArray(row.imageUrls)) {
      row.imageUrls.forEach(function (u) {
        if (list.length >= 12) return;
        pushUrl(u);
      });
    }
    if (!list.length) pushUrl(imageUrlFromRecord(row));
    return list.slice(0, 12);
  }

  function parseTechTags(raw) {
    if (raw == null || raw === '') return [];
    if (Array.isArray(raw)) {
      return raw.map(function (t) { return String(t).trim(); }).filter(Boolean).slice(0, 24);
    }
    if (typeof raw === 'object') {
      return Object.keys(raw)
        .sort()
        .map(function (k) { return String(raw[k] || '').trim(); })
        .filter(Boolean)
        .slice(0, 24);
    }
    return String(raw)
      .split(/[\n,]+/)
      .map(function (t) { return t.trim(); })
      .filter(Boolean)
      .slice(0, 24);
  }

  function parseDetailSections(raw) {
    if (!Array.isArray(raw)) return [];
    return raw
      .map(function (s) {
        if (!s || typeof s !== 'object') return null;
        var title = String(s.title || '').trim().slice(0, 120);
        var body = String(s.body || '').trim().slice(0, 4000);
        if (!title && !body) return null;
        return { title: title, body: body };
      })
      .filter(Boolean)
      .slice(0, MAX_DETAIL_SECTIONS);
  }

  function parseBestFor(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(function (x) { return String(x || '').trim(); }).filter(Boolean).slice(0, 12);
  }

  function normalizePortfolioDetailRecord(row, id) {
    row = row || {};
    return {
      id: id || row.id || '',
      title: String(row.title || '').slice(0, 200),
      projectUrl: String(row.projectUrl || '').trim().slice(0, 2000),
      imageUrls: parseImageUrls(row),
      imageAlt: String(row.imageAlt || '').slice(0, 200),
      description: String(row.description || '').slice(0, 8000),
      techTags: parseTechTags(row.techTags),
      outcome: String(row.outcome || '').slice(0, 4000),
      adminModalNote: String(row.adminModalNote || '').slice(0, 2000),
      bestFor: parseBestFor(row.bestFor),
      detailSections: parseDetailSections(row.detailSections),
      buyNowLabel: String(row.buyNowLabel || '').slice(0, 120),
      buyPremiumLabel: String(row.buyPremiumLabel || '').slice(0, 160),
      showQuoteButton: row.showQuoteButton !== false
    };
  }

  function renderMultilineHtml(text) {
    return esc(text).replace(/\r?\n/g, '<br>');
  }

  function resolveLiveUrl(record, options) {
    options = options || {};
    var projectUrl = String(record.projectUrl || '').trim();
    if (projectUrl && projectUrl !== '#') return projectUrl;
    var fallback = String(options.liveUrlFallback || '').trim();
    if (fallback && fallback !== '#') return fallback;
    return '';
  }

  function renderPortfolioDetailHtml(record, options) {
    options = options || {};
    record = record || {};
    var adminLabel = options.adminSectionLabel || 'Admin Page';
    var techTags = record.techTags || [];
    var bestFor = record.bestFor || [];
    var detailSections = record.detailSections || [];
    var liveUrl = resolveLiveUrl(record, options);

    var techHtml = techTags.length
      ? '<div class="project-detail-tech">' +
        techTags.map(function (tag) {
          return '<span class="tech-tag">' + esc(tag) + '</span>';
        }).join('') +
        '</div>'
      : '';

    var outcomeHtml =
      record.outcome && record.outcome.trim()
        ? '<section class="project-detail-section project-detail-outcome-section">' +
          '<h4 class="project-detail-section-title">Outcome</h4>' +
          '<p class="project-detail-outcome portfolio-preserve-breaks">' +
          renderMultilineHtml(record.outcome.trim()) +
          '</p></section>'
        : '';

    var adminHtml =
      record.adminModalNote && record.adminModalNote.trim()
        ? '<section class="project-detail-section project-detail-admin-section">' +
          '<h4 class="project-detail-section-title">' +
          esc(adminLabel) +
          '</h4>' +
          '<p class="project-detail-admin-text portfolio-preserve-breaks">' +
          renderMultilineHtml(record.adminModalNote.trim()) +
          '</p></section>'
        : '';

    var bestForHtml = bestFor.length
      ? '<section class="project-detail-section project-detail-bestfor-section">' +
        '<h4 class="project-detail-section-title">Best for</h4>' +
        '<ul class="project-fit-list project-detail-bestfor-list">' +
        bestFor
          .map(function (item) {
            return '<li>' + esc(item) + '</li>';
          })
          .join('') +
        '</ul></section>'
      : '';

    var accordionHtml = detailSections.length
      ? '<section class="project-detail-section project-detail-extra-sections">' +
        '<h4 class="project-detail-section-title">Project details</h4>' +
        '<div class="project-detail-page-accordion">' +
        detailSections
          .map(function (section, i) {
            return (
              '<details class="project-detail-page-item"' +
              (i === 0 ? ' open' : '') +
              '>' +
              '<summary>' +
              esc(section.title || 'Section ' + (i + 1)) +
              '</summary>' +
              '<div class="project-detail-page-body">' +
              '<p class="project-detail-page-row portfolio-preserve-breaks">' +
              renderMultilineHtml(section.body || '') +
              '</p></div></details>'
            );
          })
          .join('') +
        '</div></section>'
      : '';

    var actionsHtml = '';
    if (options.showLiveButton !== false && liveUrl) {
      actionsHtml =
        '<div class="project-detail-actions">' +
        '<a class="project-detail-btn project-detail-btn-primary" href="' +
        esc(liveUrl) +
        '" target="_blank" rel="noopener noreferrer">' +
        '<span class="project-detail-btn-label">Open live project</span></a></div>';
    }

    return (
      '<article class="portfolio-detail-page" data-portfolio-detail-root>' +
      '<figure class="project-detail-media">' +
      '<div class="portfolio-carousel project-detail-carousel" data-portfolio-detail-carousel aria-roledescription="carousel">' +
      '<div class="portfolio-carousel-track" aria-live="polite"></div>' +
      '<button type="button" class="portfolio-carousel-btn portfolio-carousel-prev" aria-label="Previous screenshot" hidden>&#8249;</button>' +
      '<button type="button" class="portfolio-carousel-btn portfolio-carousel-next" aria-label="Next screenshot" hidden>&#8250;</button>' +
      '<div class="portfolio-carousel-dots" role="tablist" aria-label="Screenshot slides"></div>' +
      '</div></figure>' +
      '<div class="project-detail-body">' +
      '<div class="project-detail-scroll">' +
      '<div class="project-detail-meta">' +
      '<h2 class="project-detail-title">' +
      esc(record.title || 'Project') +
      '</h2></div>' +
      (record.description && record.description.trim()
        ? '<p class="project-detail-description portfolio-preserve-breaks">' +
          renderMultilineHtml(record.description.trim()) +
          '</p>'
        : '') +
      techHtml +
      outcomeHtml +
      adminHtml +
      bestForHtml +
      accordionHtml +
      '</div>' +
      actionsHtml +
      '</div></article>'
    );
  }

  function initPortfolioDetailCarousel(rootEl, record, options) {
    if (!rootEl) return;
    var carousel = rootEl.querySelector('[data-portfolio-detail-carousel]');
    if (!carousel) return;

    var track = carousel.querySelector('.portfolio-carousel-track');
    var prevBtn = carousel.querySelector('.portfolio-carousel-prev');
    var nextBtn = carousel.querySelector('.portfolio-carousel-next');
    var dotsEl = carousel.querySelector('.portfolio-carousel-dots');
    if (!track) return;

    options = options || {};
    record = record || {};
    var urls = parseImageUrls(record);
    var altBase = record.imageAlt || record.title || 'Project screenshot';
    var index = 0;

    if (!urls.length) urls = [PLACEHOLDER_IMAGE];

    track.innerHTML = urls
      .map(function (url, i) {
        var alt =
          altBase + (urls.length > 1 ? ' (' + (i + 1) + ' of ' + urls.length + ')' : '');
        return (
          '<div class="portfolio-carousel-slide' +
          (i === index ? ' is-active' : '') +
          '" data-index="' +
          i +
          '">' +
          '<img src="' +
          esc(displayImageSrc(url)) +
          '" alt="' +
          esc(alt) +
          '" loading="lazy">' +
          '</div>'
        );
      })
      .join('');

    function goTo(i) {
      index = ((i % urls.length) + urls.length) % urls.length;
      track.querySelectorAll('.portfolio-carousel-slide').forEach(function (slide, j) {
        slide.classList.toggle('is-active', j === index);
      });
      if (dotsEl) {
        dotsEl.querySelectorAll('.portfolio-carousel-dot').forEach(function (dot, j) {
          dot.classList.toggle('is-active', j === index);
          dot.setAttribute('aria-selected', j === index ? 'true' : 'false');
        });
      }
    }

    var multi = urls.length > 1;
    if (prevBtn) {
      prevBtn.hidden = !multi;
      prevBtn.onclick = function () { goTo(index - 1); };
    }
    if (nextBtn) {
      nextBtn.hidden = !multi;
      nextBtn.onclick = function () { goTo(index + 1); };
    }
    if (dotsEl) {
      if (multi) {
        dotsEl.innerHTML = urls
          .map(function (_, i) {
            return (
              '<button type="button" class="portfolio-carousel-dot' +
              (i === index ? ' is-active' : '') +
              '" role="tab" aria-label="Screenshot ' +
              (i + 1) +
              '" aria-selected="' +
              (i === index ? 'true' : 'false') +
              '" data-index="' +
              i +
              '"></button>'
            );
          })
          .join('');
        dotsEl.hidden = false;
        dotsEl.querySelectorAll('.portfolio-carousel-dot').forEach(function (dot) {
          dot.addEventListener('click', function () {
            goTo(parseInt(dot.getAttribute('data-index'), 10));
          });
        });
      } else {
        dotsEl.innerHTML = '';
        dotsEl.hidden = true;
      }
    }
    goTo(index);
  }

  function initPortfolioDetailPage(rootEl, record, options) {
    if (!rootEl) return;
    var detailRoot = rootEl.querySelector('[data-portfolio-detail-root]') || rootEl;
    initPortfolioDetailCarousel(detailRoot, record, options);
  }

  global.PortfolioDetailShared = {
    normalizePortfolioDetailRecord: normalizePortfolioDetailRecord,
    parseDetailSections: parseDetailSections,
    renderPortfolioDetailHtml: renderPortfolioDetailHtml,
    initPortfolioDetailCarousel: initPortfolioDetailCarousel,
    initPortfolioDetailPage: initPortfolioDetailPage,
    resolveLiveUrl: resolveLiveUrl
  };
})(typeof window !== 'undefined' ? window : this);
