/**
 * Shared portfolio detail view — used by client portal (and optionally public modal later).
 */
(function (global) {
  'use strict';

  var PLACEHOLDER_IMAGE = '/assets/images/projects/project-comingsoon.svg';
  var IMAGE_CACHE_BUST = '20260518b';
  var MAX_DETAIL_SECTIONS = 8;
  var ASSET_MEDIA_EXT = '(?:png|jpe?g|webp|svg|gif|mp4|webm|mov)';

  function cleanImageUrlInput(url) {
    return String(url != null ? url : '')
      .replace(/^@+/, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();
  }

  function extractAssetImagePath(url) {
    var s = cleanImageUrlInput(url);
    if (!s) return '';
    var match = s.match(
      new RegExp('assets/images/[A-Za-z0-9._-]+\\.' + ASSET_MEDIA_EXT, 'i')
    );
    if (!match) return '';
    var file = match[0].slice('assets/images/'.length).toLowerCase();
    return '/assets/images/' + file;
  }

  function normalizeAssetImageUrl(url) {
    var s = cleanImageUrlInput(url);
    if (!s) return '';
    var extracted = extractAssetImagePath(s);
    if (extracted) return extracted;
    if (/^(https?:|data:|blob:)/i.test(s)) return s;
    if (/^\.?\/?assets\//i.test(s)) {
      return extractAssetImagePath(s) || '/' + s.replace(/^\.?\//, '');
    }
    return s;
  }

  function isVideoUrl(url) {
    var normalized = normalizeAssetImageUrl(url);
    if (!normalized) return false;
    return /\.(?:mp4|webm|mov)(?:\?|$)/i.test(normalized);
  }

  function videoPosterUrl(url) {
    var normalized = normalizeAssetImageUrl(url);
    if (!normalized || !isVideoUrl(normalized)) return '';
    return normalized.replace(/\.(mp4|webm|mov)$/i, '-poster.webp');
  }

  function displayImageSrc(url) {
    var path = normalizeAssetImageUrl(url) || PLACEHOLDER_IMAGE;
    if (/^https?:\/\//i.test(path)) {
      var extracted = extractAssetImagePath(path);
      if (extracted) path = extracted;
      else return path;
    }
    if (path.indexOf('/') !== 0) path = '/' + path.replace(/^\.?\//, '');
    return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v=' + IMAGE_CACHE_BUST;
  }

  function displayMediaSrc(url) {
    return displayImageSrc(url);
  }

  function renderCarouselSlideMedia(url, alt) {
    if (isVideoUrl(url)) {
      var src = displayMediaSrc(url);
      var poster = videoPosterUrl(url);
      var posterAttr = poster ? ' poster="' + esc(displayMediaSrc(poster)) + '"' : '';
      return (
        '<video src="' +
        esc(src) +
        '"' +
        posterAttr +
        ' playsinline muted loop preload="metadata" aria-label="' +
        esc(alt) +
        '"></video>'
      );
    }
    return (
      '<img src="' +
      esc(displayImageSrc(url)) +
      '" alt="' +
      esc(alt) +
      '" loading="lazy">'
    );
  }

  function syncCarouselVideos(track, activeIndex) {
    if (!track) return;
    track.querySelectorAll('.portfolio-carousel-slide').forEach(function (slide, j) {
      var video = slide.querySelector('video');
      if (!video) return;
      if (j === activeIndex && slide.classList.contains('is-active')) {
        video.currentTime = 0;
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function () {});
        }
      } else {
        video.pause();
      }
    });
  }

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

  var CANVAS_DOC_CACHE_BUST = '20260608a';

  function extractCanvasDocPath(url) {
    var s = cleanImageUrlInput(url);
    if (!s) return '';
    var match = s.match(
      /assets\/(?:docs\/)?[A-Za-z0-9._/-]+\.(?:md|pdf|canvas\.tsx)/i
    );
    if (!match) return '';
    return '/' + match[0].toLowerCase();
  }

  function normalizeCanvasDocUrl(url) {
    var s = cleanImageUrlInput(url);
    if (!s) return '';
    var extracted = extractCanvasDocPath(s);
    if (extracted) return extracted;
    if (/^\.?\/?assets\//i.test(s)) {
      return extractCanvasDocPath(s) || '/' + s.replace(/^\.?\//, '');
    }
    if (/^https?:\/\//i.test(s)) return extractCanvasDocPath(s) || s;
    return '';
  }

  function isCanvasMarkdownUrl(url) {
    return /\.md(?:\?|$)/i.test(normalizeCanvasDocUrl(url));
  }

  function isCanvasPdfUrl(url) {
    return /\.pdf(?:\?|$)/i.test(normalizeCanvasDocUrl(url));
  }

  function isCanvasTsxUrl(url) {
    return /\.canvas\.tsx(?:\?|$)/i.test(normalizeCanvasDocUrl(url));
  }

  function displayCanvasDocSrc(url) {
    var path = normalizeCanvasDocUrl(url);
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v=' + CANVAS_DOC_CACHE_BUST;
  }

  function renderMarkdownToHtml(md) {
    return String(md || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^### (.*)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^\- (.*)$/gm, '<ul><li>$1</li></ul>')
      .replace(/^\d+\. (.*)$/gm, '<ol><li>$1</li></ol>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" loading="lazy">');
  }

  function renderCanvasDocSectionHtml(record) {
    var url = normalizeCanvasDocUrl(record.canvasDocUrl);
    if (!url) return '';
    var title = String(record.canvasDocTitle || 'Project overview').trim().slice(0, 120);
    return (
      '<section class="project-detail-section project-detail-canvas-doc" data-portfolio-canvas-doc>' +
      '<h4 class="project-detail-section-title">' +
      esc(title) +
      '</h4>' +
      '<div class="project-detail-canvas-body" data-portfolio-canvas-body>' +
      '<p class="project-detail-canvas-loading">Loading document…</p>' +
      '</div></section>'
    );
  }

  function initCanvasDoc(rootEl, record) {
    if (!rootEl || !record) return;
    var section =
      rootEl.matches && rootEl.matches('[data-portfolio-canvas-doc]')
        ? rootEl
        : rootEl.querySelector('[data-portfolio-canvas-doc]');
    if (!section) return;
    var body = section.querySelector('[data-portfolio-canvas-body]');
    var url = normalizeCanvasDocUrl(record.canvasDocUrl);
    if (!body || !url) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    var src = displayCanvasDocSrc(url);
    var docTitle = String(record.canvasDocTitle || 'Project document').trim();
    if (isCanvasTsxUrl(url)) {
      body.innerHTML =
        '<div class="project-detail-canvas-tsx-note">' +
        '<p class="project-detail-canvas-tsx-lead">' +
        'This file is a <strong>Cursor Canvas</strong> (<code>.canvas.tsx</code>). It opens interactively in Cursor IDE — it does not render in the browser like Markdown or PDF.</p>' +
        '<p class="project-detail-canvas-tsx-hint">For portfolio visitors, add a <code>.md</code> or <code>.pdf</code> path here (or as a second doc) so the walkthrough shows on the site.</p>' +
        '<a class="project-detail-canvas-pdf-link" href="' +
        esc(src) +
        '" download>Download canvas source</a></div>';
      return;
    }
    if (isCanvasPdfUrl(url)) {
      body.innerHTML =
        '<a class="project-detail-canvas-pdf-link" href="' +
        esc(src) +
        '" target="_blank" rel="noopener noreferrer">Open project document (PDF)</a>' +
        '<iframe class="project-detail-canvas-pdf-frame" src="' +
        esc(src) +
        '" title="' +
        esc(docTitle) +
        '"></iframe>';
      return;
    }
    if (isCanvasMarkdownUrl(url)) {
      fetch(src)
        .then(function (res) {
          if (!res.ok) throw new Error('Could not load document');
          return res.text();
        })
        .then(function (text) {
          body.innerHTML =
            '<div class="project-detail-canvas-md portfolio-markdown">' +
            renderMarkdownToHtml(text) +
            '</div>';
        })
        .catch(function () {
          body.innerHTML =
            '<p class="project-detail-canvas-error">Could not load markdown file. Confirm <code>' +
            esc(url) +
            '</code> is deployed.</p>';
        });
      return;
    }
    section.hidden = true;
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
      canvasDocUrl: normalizeCanvasDocUrl(row.canvasDocUrl),
      canvasDocTitle: String(row.canvasDocTitle || 'Project overview').slice(0, 120),
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

    var canvasDocHtml = renderCanvasDocSectionHtml(record);

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
      '<button type="button" class="portfolio-carousel-btn portfolio-carousel-prev" aria-label="Previous slide" hidden>&#8249;</button>' +
      '<button type="button" class="portfolio-carousel-btn portfolio-carousel-next" aria-label="Next slide" hidden>&#8250;</button>' +
      '<div class="portfolio-carousel-dots" role="tablist" aria-label="Slideshow slides"></div>' +
      '</div></figure>' +
      '<div class="project-detail-body">' +
      '<div class="project-detail-scroll has-scrollbar">' +
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
      canvasDocHtml +
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
          renderCarouselSlideMedia(url, alt) +
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
      syncCarouselVideos(track, index);
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
              '" role="tab" aria-label="Slide ' +
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
    initCanvasDoc(detailRoot, record);
  }

  global.PortfolioDetailShared = {
    normalizePortfolioDetailRecord: normalizePortfolioDetailRecord,
    parseDetailSections: parseDetailSections,
    renderPortfolioDetailHtml: renderPortfolioDetailHtml,
    initPortfolioDetailCarousel: initPortfolioDetailCarousel,
    initPortfolioDetailPage: initPortfolioDetailPage,
    initCanvasDoc: initCanvasDoc,
    normalizeCanvasDocUrl: normalizeCanvasDocUrl,
    resolveLiveUrl: resolveLiveUrl
  };
})(typeof window !== 'undefined' ? window : this);
