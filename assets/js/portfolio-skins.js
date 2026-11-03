/**
 * Portfolio skins — pure rules shared by the public card, the popup tabs and
 * the admin Skins section. A platform is a template project; its skins are
 * projects with builtFromTemplateId pointing at it.
 * A skin is a demo (an industry version visitors can open: its own projectUrl)
 * or a client (a real business on the platform: shown, never linked). An
 * unmarked skin is a client, so nothing opens until admin marks it a demo.
 * Browser: window.PortfolioSkins. Node (tests): module.exports.
 */
(function (root) {
  'use strict';

  var MAX_LABEL = 40;
  var MAX_BLURB = 120;
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

  function kindOf(record) {
    return record && record.skinKind === 'demo' ? 'demo' : 'client';
  }

  /**
   * A top-level project (a platform, or a standalone project) is a demo until
   * marked client, so its link keeps opening. Its own field: an old skinKind
   * left on it by the editor must never hide the link.
   */
  function liveKindOf(record) {
    return record && record.liveKind === 'client' ? 'client' : 'demo';
  }

  /** A real http(s) link, or ''. */
  function cleanLink(v) {
    var s = String(v == null ? '' : v).trim();
    return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s.slice(0, 2000) : '';
  }

  function cleanBlurb(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, MAX_BLURB);
  }

  /** The link a demo opens; clients and demos without a link get ''. */
  function demoLinkFor(record) {
    return kindOf(record) === 'demo' ? cleanLink(record.projectUrl) : '';
  }

  /**
   * What the popup shows for a tab: blurb and live button. The platform tab
   * keeps the platform's link; a skin tab never falls back to it.
   */
  function tabInfo(platform, record, isPlatform, platformLiveUrl) {
    if (isPlatform) {
      var client = liveKindOf(platform) === 'client';
      return { blurb: cleanBlurb(platform && platform.skinBlurb), liveUrl: client ? '' : platformLiveUrl || '', liveLabel: '', isClient: client };
    }
    var link = demoLinkFor(record);
    return {
      blurb: cleanBlurb(record && record.skinBlurb),
      liveUrl: link,
      liveLabel: link ? 'Open ' + labelFor(record, false) + ' demo' : '',
      isClient: kindOf(record) === 'client'
    };
  }

  function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
  }

  /** "2 industry demos · 1 live business" for the card badge and the popup line. */
  function buildsSummary(skins) {
    var demos = 0;
    var clients = 0;
    (skins || []).forEach(function (s) {
      if (kindOf(s) === 'demo') demos += 1;
      else clients += 1;
    });
    var parts = [];
    if (demos) parts.push(plural(demos, 'industry demo', 'industry demos'));
    if (clients) parts.push(plural(clients, 'live business', 'live businesses'));
    return { demos: demos, clients: clients, text: parts.join(' · ') };
  }

  /** What a skin save may write — nothing else on the skin is ever touched. */
  function skinPatch(fields) {
    fields = fields || {};
    var out = {};
    if ('skinLabel' in fields) out.skinLabel = cleanLabel(fields.skinLabel);
    if ('skinOrder' in fields) out.skinOrder = orderNumber(fields.skinOrder);
    if ('coverImageUrl' in fields) out.coverImageUrl = String(fields.coverImageUrl || '');
    if ('skinKind' in fields) out.skinKind = fields.skinKind === 'demo' ? 'demo' : 'client';
    if ('liveKind' in fields) out.liveKind = fields.liveKind === 'client' ? 'client' : 'demo';
    if ('visibility' in fields) out.visibility = fields.visibility === 'private' ? 'private' : 'public';
    if ('skinBlurb' in fields) out.skinBlurb = cleanBlurb(fields.skinBlurb);
    if ('projectUrl' in fields) out.projectUrl = cleanLink(fields.projectUrl);
    return out;
  }

  // Admin list row field → saved field.
  var ROW_FIELDS = { label: 'skinLabel', order: 'skinOrder', cover: 'coverImageUrl', kind: 'skinKind', liveKind: 'liveKind', link: 'projectUrl', blurb: 'skinBlurb', visibility: 'visibility' };

  /** Only the fields edited since the row loaded (vs row.original), cleaned; null when nothing changed. */
  function changedPatch(row) {
    var orig = (row && row.original) || {};
    var fields = {};
    Object.keys(ROW_FIELDS).forEach(function (k) {
      if (k in row && row[k] !== orig[k]) fields[ROW_FIELDS[k]] = row[k];
    });
    return Object.keys(fields).length ? skinPatch(fields) : null;
  }

  /** Moves rows[i] by delta (-1 up, 1 down) and renumbers 10, 20, 30…; returns new rows. */
  function moveRow(rows, i, delta) {
    var out = rows.map(function (r) { return Object.assign({}, r); });
    var j = i + delta;
    if (j >= 0 && j < out.length) out.splice(j, 0, out.splice(i, 1)[0]);
    else return out;
    out.forEach(function (r, k) { r.order = (k + 1) * 10; });
    return out;
  }

  var api = {
    MAX_LABEL: MAX_LABEL,
    MAX_BLURB: MAX_BLURB,
    isVideoUrl: isVideoUrl,
    isAllowedCover: isAllowedCover,
    coverChoices: coverChoices,
    labelFor: labelFor,
    orderSkins: orderSkins,
    skinPatch: skinPatch,
    changedPatch: changedPatch,
    moveRow: moveRow,
    kindOf: kindOf,
    liveKindOf: liveKindOf,
    cleanLink: cleanLink,
    demoLinkFor: demoLinkFor,
    tabInfo: tabInfo,
    buildsSummary: buildsSummary
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PortfolioSkins = api;
})(typeof window !== 'undefined' ? window : null);
