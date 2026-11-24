/**
 * Link Tree "Recent work" — which portfolio projects show on /linktree and how.
 * A project shows when admin ticks "Show on Link Tree" (linktree: true) in the
 * Portfolio editor; linktreeOrder sorts them (lowest first, unnumbered last).
 * The page reads /portfolioProjects (public read) over REST and keeps its
 * typed fallback cards when nothing is ticked or the read fails.
 * Browser: window.LinktreeWork. Node (tests): module.exports.
 */
(function (root) {
  'use strict';

  var MAX_ITEMS = 6;
  var MAX_DESC = 120;
  var MAX_TAGS = 3;
  var VIDEO_RE = /\.(?:mp4|webm|mov)(?:\?|$)/i;
  var DOC_RE = /\.md(?:\?|$)/i;

  function orderNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function cleanLink(v) {
    var s = String(v == null ? '' : v).trim();
    return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : '';
  }

  /** RTDB stores arrays as arrays or as {0: …, 1: …}. */
  function list(v) {
    if (Array.isArray(v)) return v;
    if (v && typeof v === 'object') return Object.keys(v).sort(function (a, b) { return a - b; }).map(function (k) { return v[k]; });
    if (typeof v === 'string') return v.split(',');
    return [];
  }

  function isStill(u) {
    return !!u && !VIDEO_RE.test(u) && !DOC_RE.test(u);
  }

  function thumbFor(p) {
    var cover = String(p.coverImageUrl || '').trim();
    if (isStill(cover)) return cover;
    var urls = list(p.imageUrls).map(function (u) { return String(u || '').trim(); });
    if (!urls.length && p.imageUrl) urls = [String(p.imageUrl).trim()];
    return urls.filter(isStill)[0] || '';
  }

  /** The short line under the name: the build blurb, else the description's first sentence. */
  function descFor(p) {
    var blurb = String(p.skinBlurb || '').replace(/\s+/g, ' ').trim();
    if (blurb) return blurb.slice(0, MAX_DESC);
    var text = String(p.description || '')
      .split(/\r?\n/)
      .map(function (l) { return l.replace(/^\s*(?:[-•·*]\s+)/, '').trim(); })
      .filter(Boolean)
      .join(' ');
    var first = (text.match(/^.*?[.!?](?=\s|$)/) || [text])[0].trim();
    if (first.length <= MAX_DESC) return first;
    var cut = first.slice(0, MAX_DESC - 1);
    var space = cut.lastIndexOf(' ');
    return (space > 60 ? cut.slice(0, space) : cut).replace(/[,;:\s]+$/, '') + '…';
  }

  // ── Phone view ─────────────────────────────────────────────────────────
  // Same picks as the portfolio's phone cards (script.js portfolioPhoneMedia):
  //   1. the hero showcase capture for the project's live site (video if recorded),
  //   2. a phone-shaped video in the project's slides, else its media folder,
  //   3. a phone-shaped still, same order. Back-office screens never count.
  // PHONE_SHOTS / PHONE_VIDEOS / PHONE_VERSION mirror PORTFOLIO_MOBILE_SHOTS /
  // PORTFOLIO_MOBILE_VIDEOS / PORTFOLIO_MOBILE_SHOT_VERSION (test-linktree-work checks).
  var PHONE_SHOTS = {
    'procleaning.expo.app': 'procleaning',
    'roofcleaning.expo.app': 'roofcleaning',
    'treeservice.expo.app': 'treeservice',
    'carpet.expo.app': 'carpet',
    'sunergyelectricservices.expo.app': 'sunergy',
    'pawshine.expo.app': 'pawshine',
    'lawncare.expo.app': 'lawncare',
    'beautysalon.expo.app': 'beautysalon',
    'barbershoptemplate.expo.app': 'barbershop',
    'photographer.expo.app': 'photographer',
    'realtor.expo.app': 'realtor',
    'ruben-jim.github.io/DEMO': 'homeverse',
    'ruben-jim.github.io/ZoomRealty2025-main': 'zoomrealty'
  };
  var PHONE_VIDEOS = ['barbershop', 'beautysalon', 'carpet', 'lawncare', 'pawshine', 'photographer',
    'procleaning', 'realtor', 'roofcleaning', 'sunergy', 'treeservice'];
  var PHONE_VERSION = 5;

  function isBackOffice(url) {
    var base = String(String(url || '').split('?')[0].split('/').pop() || '');
    return /(?:^|[-_])(?:admin|dashboard|crew|staff|worker|timesheet)(?:[-_.]|$)/i.test(base);
  }

  /** Site-relative /assets/... path for a record URL (absolute rubenjimenez.dev links too). */
  function assetPath(url) {
    var s = String(url || '').trim().split('?')[0].split('#')[0];
    if (!s) return '';
    var m = s.match(/^https?:\/\/(?:www\.)?rubenjimenez\.dev(\/assets\/.+)$/i);
    if (m) s = m[1];
    if (/^\.?\/?assets\//i.test(s)) s = '/' + s.replace(/^\.?\//, '');
    return /^\/assets\//.test(s) ? s : '';
  }

  var phoneIndexCache = { groups: null, index: null };

  function phoneIndex(groups) {
    if (phoneIndexCache.groups === groups && phoneIndexCache.index) return phoneIndexCache.index;
    var byPath = {};
    var byFolder = {};
    list(groups).forEach(function (g) {
      if (!g || g.source !== 'images') return;
      list(g.files).forEach(function (f) {
        if (!f || !f.portrait || isBackOffice(f.path)) return;
        var path = assetPath(f.path);
        if (!path) return;
        var folder = path.slice(0, path.lastIndexOf('/'));
        byPath[path] = f;
        (byFolder[folder] = byFolder[folder] || []).push(f);
      });
    });
    phoneIndexCache = { groups: groups, index: { byPath: byPath, byFolder: byFolder } };
    return phoneIndexCache.index;
  }

  function bestPhoneFile(files) {
    var best = null;
    var bestScore = -1;
    files.forEach(function (f) {
      var score = (f.kind === 'video' ? 2 : 0) + (/home/i.test(f.name || '') ? 1 : 0);
      if (score > bestScore) { best = f; bestScore = score; }
    });
    return best;
  }

  /**
   * { kind: 'video'|'image', src, poster? } or null when the project has no phone capture.
   * Paths are site-relative; the page maps videos to Firebase Storage (media-url.js).
   */
  function phoneFor(p, groups) {
    if (!p) return null;
    if (groups === undefined && typeof window !== 'undefined') groups = window.PORTFOLIO_ASSET_GROUPS;
    try {
      var u = new URL(String(p.projectUrl || ''));
      var firstSeg = u.pathname.split('/').filter(Boolean)[0];
      var id = PHONE_SHOTS[u.hostname] || (firstSeg && PHONE_SHOTS[u.hostname + '/' + firstSeg]);
      if (id) {
        var v = '?v=' + PHONE_VERSION;
        return PHONE_VIDEOS.indexOf(id) !== -1
          ? { kind: 'video', src: '/assets/video/showcase/' + id + '-mobile.mp4' + v, poster: '/assets/video/showcase/' + id + '-mobile-poster.webp' + v }
          : { kind: 'image', src: '/assets/images/hero/showcase/' + id + '-mobile.webp' + v };
      }
    } catch (e) { /* no live URL: fall through to the project's own media */ }
    var index = phoneIndex(groups);
    var urls = list(p.imageUrls).map(assetPath).filter(Boolean);
    if (!urls.length && p.imageUrl) urls = [assetPath(p.imageUrl)].filter(Boolean);
    var own = urls.map(function (x) { return index.byPath[x]; }).filter(Boolean);
    var folder = urls.length ? index.byFolder[urls[0].slice(0, urls[0].lastIndexOf('/'))] || [] : [];
    var isVideo = function (f) { return f.kind === 'video'; };
    var file = own.filter(isVideo)[0] || bestPhoneFile(folder.filter(isVideo)) || own[0] || bestPhoneFile(folder);
    if (!file) return null;
    var path = assetPath(file.path);
    if (file.kind === 'video') {
      var poster = file.poster ? assetPath(file.poster) : '';
      return { kind: 'video', src: path, poster: poster };
    }
    return { kind: 'image', src: path };
  }

  var MAX_BLURB = 90;
  var MAX_FEATURES = 3;
  var PORTFOLIO_URL = 'https://rubenjimenez.dev/portfolio';

  /** The one line typed in Admin → Link Tree: single spaces, at most MAX_BLURB. */
  function cleanBlurb(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, MAX_BLURB);
  }

  function isPrivate(p) {
    return !p || String(p.visibility || '').toLowerCase() === 'private';
  }

  /**
   * Where a card goes: the project's popup on the portfolio (/portfolio?project=id)
   * when visitors can see it there (a build needs its platform public too), else
   * its live site, else nowhere.
   */
  function hrefFor(p, byId) {
    var platform = p.builtFromTemplateId && byId ? byId[p.builtFromTemplateId] : null;
    var onPortfolio = platform ? !isPrivate(platform) : !isPrivate(p);
    if (onPortfolio && p.id) return PORTFOLIO_URL + '?project=' + encodeURIComponent(String(p.id));
    return p.liveKind === 'client' ? '' : cleanLink(p.projectUrl);
  }

  /** One card's data from a portfolioProjects record (byId: all records, for a build's platform). */
  function toItem(p, byId) {
    return {
      id: String(p.id || ''),
      title: String(p.title || '').trim().slice(0, 80),
      // A project marked "client" never links out (same rule as the portfolio popup).
      url: p.liveKind === 'client' ? '' : cleanLink(p.projectUrl),
      thumb: thumbFor(p),
      // Phone capture for the phone-view card; null → the cover is shown in the phone shape.
      phone: phoneFor(p),
      badge: p.isTemplate === true ? 'template' : 'live',
      href: hrefFor(p, byId),
      blurb: cleanBlurb(p.linktreeBlurb),
      // The typed line, else the description's first sentence.
      desc: cleanBlurb(p.linktreeBlurb) || descFor(p),
      // "What's included" chips: the first features ticked in the Portfolio editor.
      features: list(p.features).map(function (f) { return String(f || '').trim(); }).filter(Boolean).slice(0, MAX_FEATURES),
      tags: list(p.techTags).map(function (t) { return String(t || '').trim(); }).filter(Boolean).slice(0, MAX_TAGS)
    };
  }

  /** Projects ticked for the Link Tree, in order, at most MAX_ITEMS. Accepts the RTDB object or an array. */
  function pick(projects) {
    var rows = Array.isArray(projects)
      ? projects.slice()
      : Object.keys(projects || {}).map(function (id) {
        var r = projects[id];
        return r && typeof r === 'object' ? Object.assign({ id: id }, r) : null;
      });
    var byId = {};
    rows.forEach(function (p) { if (p && p.id) byId[p.id] = p; });
    return rows
      .map(function (p, i) { return { p: p, i: i, n: p ? orderNumber(p.linktreeOrder) : null }; })
      .filter(function (x) { return x.p && x.p.linktree === true && String(x.p.title || '').trim(); })
      .sort(function (a, b) {
        if (a.n !== null && b.n !== null && a.n !== b.n) return a.n - b.n;
        if (a.n !== null && b.n === null) return -1;
        if (a.n === null && b.n !== null) return 1;
        var ao = Number(a.p.order) || 0;
        var bo = Number(b.p.order) || 0;
        return ao !== bo ? ao - bo : a.i - b.i;
      })
      .slice(0, MAX_ITEMS)
      .map(function (x) { return toItem(x.p, byId); });
  }

  // ── Admin → Link Tree: the Recent work list ──

  function rowsOf(projects) {
    return Array.isArray(projects)
      ? projects.filter(Boolean)
      : Object.keys(projects || {}).map(function (id) {
        var r = projects[id];
        return r && typeof r === 'object' ? Object.assign({ id: id }, r) : null;
      }).filter(Boolean);
  }

  /**
   * Every project for the admin list: { shown, hidden }. Shown = on the page,
   * in page order (the same order pick() uses); hidden = the rest in portfolio
   * order. Builds name their platform.
   */
  function adminRows(projects) {
    var rows = rowsOf(projects).filter(function (p) { return String(p.title || '').trim(); });
    var byId = {};
    rows.forEach(function (p) { byId[p.id] = p; });
    var shownIds = pick(rows).map(function (x) { return x.id; });
    var shownAll = rows.filter(function (p) { return p.linktree === true; });
    function row(p) {
      var parent = p.builtFromTemplateId && byId[p.builtFromTemplateId];
      return {
        id: String(p.id),
        title: String(p.title).trim(),
        thumb: thumbFor(p),
        badge: p.isTemplate === true ? 'template' : 'live',
        blurb: cleanBlurb(p.linktreeBlurb),
        autoBlurb: descFor(p),
        // No phone capture: the Link Tree tab warns so you know which to record.
        hasPhone: !!phoneFor(p),
        parentTitle: parent ? String(parent.title || '').trim() : '',
        isPrivate: String(p.visibility || '').toLowerCase() === 'private',
        order: orderNumber(p.linktreeOrder),
        // Ticked but past the cap: on in admin, not on the page.
        overCap: p.linktree === true && shownIds.indexOf(String(p.id)) < 0
      };
    }
    var shown = shownIds.map(function (id) { return row(byId[id]); })
      .concat(shownAll.filter(function (p) { return shownIds.indexOf(String(p.id)) < 0; }).map(row));
    var hidden = rows
      .filter(function (p) { return p.linktree !== true; })
      .sort(function (a, b) { return (Number(a.order) || 0) - (Number(b.order) || 0); })
      .map(row);
    return { shown: shown, hidden: hidden };
  }

  /** Patch for one project's switch; a newly shown one goes last. */
  function togglePatch(shownRows, on) {
    if (!on) return { linktree: false, linktreeOrder: null };
    var max = 0;
    (shownRows || []).forEach(function (r) { if (r.order !== null && r.order > max) max = r.order; });
    return { linktree: true, linktreeOrder: (shownRows && shownRows.length ? Math.max(max, shownRows.length * 10) : 0) + 10 };
  }

  /** Moves shown[i] by delta and renumbers all 10, 20, 30…: { id: order } for the ones that change. */
  function movePatches(shownRows, i, delta) {
    var list = (shownRows || []).slice();
    var j = i + delta;
    if (i < 0 || i >= list.length || j < 0 || j >= list.length) return {};
    list.splice(j, 0, list.splice(i, 1)[0]);
    var out = {};
    list.forEach(function (r, k) {
      var n = (k + 1) * 10;
      if (r.order !== n) out[r.id] = n;
    });
    return out;
  }

  // ── What it costs: which 3 packages and which is Most popular ──
  // Stored at /agencyPricing/linktree = { packages: [id, id, id], popular: id | '' }.

  var DEFAULT_PACKAGES = ['starter-page', 'website', 'starter'];
  var DEFAULT_POPULAR = 'starter';

  /** Three different known ids (else the defaults); popular must be one of them or ''. */
  function normalizeSettings(raw, knownIds) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var known = knownIds && knownIds.length ? knownIds : DEFAULT_PACKAGES;
    var ids = list(raw.packages).map(function (x) { return String(x || ''); });
    var ok = ids.length === 3 &&
      ids.every(function (id) { return known.indexOf(id) >= 0; }) &&
      ids[0] !== ids[1] && ids[0] !== ids[2] && ids[1] !== ids[2];
    var packages = ok ? ids : DEFAULT_PACKAGES.slice();
    var popular = raw.popular === undefined || raw.popular === null ? (ok ? '' : DEFAULT_POPULAR) : String(raw.popular);
    if (popular && packages.indexOf(popular) < 0) popular = '';
    return { packages: packages, popular: popular };
  }

  // ── What clients say ──

  var MAX_REVIEWS = 3;

  function millis(v) {
    if (!v) return 0;
    if (typeof v.toMillis === 'function') return v.toMillis();
    if (typeof v.seconds === 'number') return v.seconds * 1000;
    var n = Number(v);
    if (isFinite(n)) return n;
    var t = Date.parse(v);
    return isFinite(t) ? t : 0;
  }

  /**
   * Reviews for the page, newest first: the ones switched on for the Link Tree
   * (at most 3); none switched on → the 2 newest. A review switched off the
   * site (hidden) never shows. Items: { id, data }.
   */
  function reviewsFor(items) {
    var live = (items || []).filter(function (x) { return x && x.data && x.data.hidden !== true; })
      .sort(function (a, b) { return millis(b.data.createdAt) - millis(a.data.createdAt); });
    var picked = live.filter(function (x) { return x.data.linktree === true; });
    return picked.length ? picked.slice(0, MAX_REVIEWS) : live.slice(0, 2);
  }

  var api = {
    MAX_ITEMS: MAX_ITEMS,
    MAX_REVIEWS: MAX_REVIEWS,
    MAX_BLURB: MAX_BLURB,
    cleanBlurb: cleanBlurb,
    hrefFor: hrefFor,
    DEFAULT_PACKAGES: DEFAULT_PACKAGES,
    DEFAULT_POPULAR: DEFAULT_POPULAR,
    pick: pick,
    toItem: toItem,
    descFor: descFor,
    thumbFor: thumbFor,
    phoneFor: phoneFor,
    PHONE_SHOTS: PHONE_SHOTS,
    PHONE_VIDEOS: PHONE_VIDEOS,
    PHONE_VERSION: PHONE_VERSION,
    orderNumber: orderNumber,
    adminRows: adminRows,
    togglePatch: togglePatch,
    movePatches: movePatches,
    normalizeSettings: normalizeSettings,
    reviewsFor: reviewsFor,
    millis: millis
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LinktreeWork = api;
})(typeof window !== 'undefined' ? window : null);
