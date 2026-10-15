/**
 * Portfolio skins — pure rules shared by the public card, the popup tabs and
 * the admin Skins section. A platform is a template project; its skins are
 * projects with builtFromTemplateId pointing at it.
 * Browser: window.PortfolioSkins. Node (tests): module.exports.
 */
(function (root) {
  'use strict';

  var MAX_LABEL = 40;
  // Same test as portfolioIsVideoUrl in script.js.
  var VIDEO_RE = /\.(?:mp4|webm|mov)(?:\?|$)/i;
  var DOC_RE = /\.md(?:\?|$)/i;

  function isVideoUrl(url) {
    return VIDEO_RE.test(String(url || ''));
  }

  function stills(urls) {
    return (urls || []).filter(function (u) {
      return u && !isVideoUrl(u) && !DOC_RE.test(u);
    });
  }

  function posters(urls, posterOf) {
    var out = [];
    (urls || []).forEach(function (u) {
      if (!isVideoUrl(u)) return;
      var p = posterOf ? posterOf(u) : '';
      if (p && out.indexOf(p) < 0) out.push(p);
    });
    return out;
  }

  /** A card cover must be one of the record's stills, or the poster of one of its videos. */
  function isAllowedCover(urls, cover, posterOf) {
    if (!cover) return false;
    return stills(urls).indexOf(cover) >= 0 || posters(urls, posterOf).indexOf(cover) >= 0;
  }

  function fileName(u) {
    return String(u).split('?')[0].split('/').pop();
  }

  function coverChoices(urls, posterOf) {
    var out = [{ value: '', label: 'Auto (first screenshot)' }];
    stills(urls).forEach(function (u) {
      out.push({ value: u, label: 'Screenshot · ' + fileName(u) });
    });
    posters(urls, posterOf).forEach(function (p) {
      out.push({ value: p, label: 'Home page (video poster) · ' + fileName(p) });
    });
    return out;
  }

  function cleanLabel(v) {
    return String(v == null ? '' : v).trim().slice(0, MAX_LABEL);
  }

  function labelFor(record, isPlatform) {
    var own = cleanLabel(record && record.skinLabel);
    if (own) return own;
    if (isPlatform) return 'Platform';
    return (record && record.title) || 'Build';
  }

  function orderNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  /** Numbered skins first (by number), then the rest in their incoming order. Stable. */
  function orderSkins(skins) {
    return (skins || [])
      .map(function (s, i) {
        return { s: s, i: i, n: orderNumber(s && s.skinOrder) };
      })
      .sort(function (a, b) {
        if (a.n !== null && b.n !== null && a.n !== b.n) return a.n - b.n;
        if (a.n !== null && b.n === null) return -1;
        if (a.n === null && b.n !== null) return 1;
        return a.i - b.i;
      })
      .map(function (x) {
        return x.s;
      });
  }

  /** What a skin save may write — nothing else on the skin is ever touched. */
  function skinPatch(fields) {
    fields = fields || {};
    var out = {};
    if ('skinLabel' in fields) out.skinLabel = cleanLabel(fields.skinLabel);
    if ('skinOrder' in fields) out.skinOrder = orderNumber(fields.skinOrder);
    if ('coverImageUrl' in fields) out.coverImageUrl = String(fields.coverImageUrl || '');
    return out;
  }

  var api = {
    MAX_LABEL: MAX_LABEL,
    isVideoUrl: isVideoUrl,
    isAllowedCover: isAllowedCover,
    coverChoices: coverChoices,
    labelFor: labelFor,
    orderSkins: orderSkins,
    skinPatch: skinPatch
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PortfolioSkins = api;
})(typeof window !== 'undefined' ? window : null);
