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

  function resolveDocRelativeUrl(href, docUrl) {
    var s = String(href || '').trim();
    if (!s || /^(https?:|data:|mailto:|tel:|#)/i.test(s)) return s;
    if (s.charAt(0) === '/') return s;
    var base = normalizeCanvasDocUrl(docUrl);
    if (!base) return s;
    var dir = base.replace(/[^/]+$/, '');
    if (dir.charAt(dir.length - 1) !== '/') dir += '/';
    var parts = (dir + s).split('/').filter(Boolean);
    var stack = [];
    parts.forEach(function (part) {
      if (part === '..') stack.pop();
      else if (part !== '.') stack.push(part);
    });
    return '/' + stack.join('/');
  }

  function displayDocAssetSrc(path, docUrl) {
    var resolved = resolveDocRelativeUrl(path, docUrl);
    if (!resolved) return '';
    if (/^https?:\/\//i.test(resolved)) return resolved;
    return resolved + (resolved.indexOf('?') >= 0 ? '&' : '?') + 'v=' + CANVAS_DOC_CACHE_BUST;
  }

  function parseMarkdownTableRow(line) {
    var cells = String(line || '')
      .split('|')
      .map(function (cell) {
        return cell.trim();
      });
    if (cells.length && cells[0] === '') cells.shift();
    if (cells.length && cells[cells.length - 1] === '') cells.pop();
    return cells;
  }

  function isMarkdownTableRow(line) {
    return /^\|.+\|$/.test(String(line || '').trim());
  }

  function isMarkdownTableSeparator(line) {
    var trimmed = String(line || '').trim();
    return /^\|?[\s\-:|]+\|?$/.test(trimmed) && trimmed.indexOf('-') >= 0;
  }

  function renderInlineMarkdown(text, docUrl) {
    return esc(text)
      .replace(/!\[(.*?)\]\((.*?)\)/g, function (_match, alt, src) {
        return (
          '<img class="portfolio-md-inline-img" src="' +
          esc(displayDocAssetSrc(src, docUrl)) +
          '" alt="' +
          esc(alt) +
          '" loading="lazy">'
        );
      })
      .replace(/\[(.*?)\]\((.*?)\)/g, function (_match, label, href) {
        var resolved = resolveDocRelativeUrl(href, docUrl);
        return (
          '<a href="' +
          esc(resolved) +
          '" target="_blank" rel="noopener noreferrer">' +
          label +
          '</a>'
        );
      })
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function renderMarkdownTable(headers, rows, docUrl) {
    return (
      '<div class="portfolio-md-table-wrap" tabindex="0" role="region" aria-label="Table">' +
      '<table class="portfolio-md-table"><thead><tr>' +
      headers
        .map(function (cell) {
          return '<th>' + renderInlineMarkdown(cell, docUrl) + '</th>';
        })
        .join('') +
      '</tr></thead><tbody>' +
      rows
        .map(function (row) {
          return (
            '<tr>' +
            row
              .map(function (cell) {
                return '<td>' + renderInlineMarkdown(cell, docUrl) + '</td>';
              })
              .join('') +
            '</tr>'
          );
        })
        .join('') +
      '</tbody></table></div>'
    );
  }

  function isMarkdownSubtitleParagraph(text) {
    var trimmed = String(text || '').trim();
    return trimmed.charAt(0) === '*' && trimmed.charAt(trimmed.length - 1) === '*' && trimmed.indexOf('*', 1) === trimmed.length - 1;
  }

  function isMarkdownStepHeading(text) {
    return /^Step \d+/i.test(String(text || '').trim());
  }

  function renderMarkdownToHtml(md, docUrl) {
    var lines = String(md || '').replace(/\r\n/g, '\n').split('\n');
    var html = [];
    var i = 0;
    var openStepSection = false;
    var sawDocTitle = false;

    function closeStepSection() {
      if (openStepSection) {
        html.push('</section>');
        openStepSection = false;
      }
    }

    function pushStepHeading(title) {
      closeStepSection();
      html.push('<section class="portfolio-md-step">');
      openStepSection = true;
      html.push('<h3>' + renderInlineMarkdown(title, docUrl) + '</h3>');
    }

    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();

      if (!trimmed) {
        i++;
        continue;
      }

      if (trimmed.indexOf('```') === 0) {
        closeStepSection();
        var code = [];
        i++;
        while (i < lines.length && lines[i].trim().indexOf('```') !== 0) {
          code.push(lines[i]);
          i++;
        }
        i++;
        html.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
        continue;
      }

      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
        closeStepSection();
        html.push('<hr class="portfolio-md-hr">');
        i++;
        continue;
      }

      var h3Match = trimmed.match(/^### (.+)$/);
      if (h3Match) {
        if (isMarkdownStepHeading(h3Match[1])) pushStepHeading(h3Match[1]);
        else {
          closeStepSection();
          html.push('<h3>' + renderInlineMarkdown(h3Match[1], docUrl) + '</h3>');
        }
        i++;
        continue;
      }

      var h2Match = trimmed.match(/^## (.+)$/);
      if (h2Match) {
        closeStepSection();
        html.push('<h2>' + renderInlineMarkdown(h2Match[1], docUrl) + '</h2>');
        i++;
        continue;
      }

      var h1Match = trimmed.match(/^# (.+)$/);
      if (h1Match) {
        closeStepSection();
        html.push('<h1 class="portfolio-md-doc-title">' + renderInlineMarkdown(h1Match[1], docUrl) + '</h1>');
        sawDocTitle = true;
        i++;
        continue;
      }

      if (trimmed.indexOf('> ') === 0) {
        closeStepSection();
        var quote = [];
        while (i < lines.length && lines[i].trim().indexOf('> ') === 0) {
          quote.push(lines[i].trim().slice(2));
          i++;
        }
        html.push(
          '<blockquote class="portfolio-md-callout"><p>' +
            renderInlineMarkdown(quote.join(' '), docUrl) +
            '</p></blockquote>'
        );
        continue;
      }

      if (isMarkdownTableRow(trimmed) && i + 1 < lines.length && isMarkdownTableSeparator(lines[i + 1])) {
        closeStepSection();
        var headers = parseMarkdownTableRow(trimmed);
        i += 2;
        var tableRows = [];
        while (i < lines.length && isMarkdownTableRow(lines[i].trim())) {
          tableRows.push(parseMarkdownTableRow(lines[i].trim()));
          i++;
        }
        html.push(renderMarkdownTable(headers, tableRows, docUrl));
        continue;
      }

      if (/^[-*] /.test(trimmed)) {
        closeStepSection();
        var bullets = [];
        while (i < lines.length && /^[-*] /.test(lines[i].trim())) {
          bullets.push(lines[i].trim().slice(2));
          i++;
        }
        html.push(
          '<ul class="portfolio-md-list">' +
            bullets
              .map(function (item) {
                return '<li>' + renderInlineMarkdown(item, docUrl) + '</li>';
              })
              .join('') +
            '</ul>'
        );
        continue;
      }

      if (/^\d+\. /.test(trimmed)) {
        closeStepSection();
        var ordered = [];
        while (i < lines.length && /^\d+\. /.test(lines[i].trim())) {
          ordered.push(lines[i].trim().replace(/^\d+\.\s*/, ''));
          i++;
        }
        html.push(
          '<ol class="portfolio-md-list">' +
            ordered
              .map(function (item) {
                return '<li>' + renderInlineMarkdown(item, docUrl) + '</li>';
              })
              .join('') +
            '</ol>'
        );
        continue;
      }

      var imageMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (imageMatch) {
        html.push(
          '<figure class="portfolio-md-figure">' +
            '<img src="' +
            esc(displayDocAssetSrc(imageMatch[2], docUrl)) +
            '" alt="' +
            esc(imageMatch[1]) +
            '" loading="lazy">' +
            '<figcaption>' +
            esc(imageMatch[1]) +
            '</figcaption></figure>'
        );
        i++;
        continue;
      }

      var paragraph = [trimmed];
      i++;
      while (i < lines.length) {
        var nextLine = lines[i].trim();
        if (!nextLine) break;
        if (
          /^(#{1,3} |[-*] |\d+\. |> |```|\|.+\||!\[|(-{3,}|\*{3,}|_{3,})$)/.test(nextLine)
        ) {
          break;
        }
        paragraph.push(nextLine);
        i++;
      }

      var paragraphText = paragraph.join(' ');
      var paragraphClass = 'portfolio-md-paragraph';
      if (sawDocTitle && isMarkdownSubtitleParagraph(paragraphText)) {
        paragraphClass += ' portfolio-md-subtitle';
      }
      html.push('<p class="' + paragraphClass + '">' + renderInlineMarkdown(paragraphText, docUrl) + '</p>');
    }

    closeStepSection();
    return html.join('\n');
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
            renderMarkdownToHtml(text, url) +
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

    var guideOnly = !!options.guideOnly;
    var pageClass = 'portfolio-detail-page' + (guideOnly ? ' portfolio-detail-page--guide-only' : '');
    var mediaHtml = guideOnly
      ? ''
      : '<figure class="project-detail-media">' +
        '<div class="portfolio-carousel project-detail-carousel" data-portfolio-detail-carousel aria-roledescription="carousel">' +
        '<div class="portfolio-carousel-track" aria-live="polite"></div>' +
        '<button type="button" class="portfolio-carousel-btn portfolio-carousel-prev" aria-label="Previous slide" hidden>&#8249;</button>' +
        '<button type="button" class="portfolio-carousel-btn portfolio-carousel-next" aria-label="Next slide" hidden>&#8250;</button>' +
        '<div class="portfolio-carousel-dots" role="tablist" aria-label="Slideshow slides"></div>' +
        '</div></figure>';

    return (
      '<article class="' +
      pageClass +
      '" data-portfolio-detail-root>' +
      mediaHtml +
      '<div class="project-detail-body">' +
      '<div class="project-detail-scroll has-scrollbar">' +
      (guideOnly
        ? ''
        : '<div class="project-detail-meta">' +
          '<h2 class="project-detail-title">' +
          esc(record.title || 'Project') +
          '</h2></div>') +
      (!guideOnly && record.description && record.description.trim()
        ? '<p class="project-detail-description portfolio-preserve-breaks">' +
          renderMultilineHtml(record.description.trim()) +
          '</p>'
        : '') +
      (guideOnly ? '' : techHtml) +
      (guideOnly ? '' : outcomeHtml) +
      (guideOnly ? '' : adminHtml) +
      canvasDocHtml +
      (guideOnly ? '' : accordionHtml) +
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
    options = options || {};
    var detailRoot = rootEl.querySelector('[data-portfolio-detail-root]') || rootEl;
    if (!options.guideOnly) {
      initPortfolioDetailCarousel(detailRoot, record, options);
    }
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
