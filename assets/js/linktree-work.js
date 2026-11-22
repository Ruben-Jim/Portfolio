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

  /** One card's data from a portfolioProjects record. */
  function toItem(p) {
    return {
      id: String(p.id || ''),
      title: String(p.title || '').trim().slice(0, 80),
      // A project marked "client" never links out (same rule as the portfolio popup).
      url: p.liveKind === 'client' ? '' : cleanLink(p.projectUrl),
      thumb: thumbFor(p),
      badge: p.isTemplate === true ? 'template' : 'live',
      desc: descFor(p),
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
      .map(function (x) { return toItem(x.p); });
  }

  var api = { MAX_ITEMS: MAX_ITEMS, pick: pick, toItem: toItem, descFor: descFor, thumbFor: thumbFor, orderNumber: orderNumber };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.LinktreeWork = api;
})(typeof window !== 'undefined' ? window : null);
