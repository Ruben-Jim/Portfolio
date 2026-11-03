/**
 * "What's included" on portfolio cards: one shared list of feature names, so
 * every card says "Client portal" the same way and in the same order. Pure
 * rules, loaded by the site and by scripts/test-portfolio-features.mjs.
 */
(function (root) {
  'use strict';

  var DEFAULTS = [
    'Online booking',
    'Online payments',
    'Client portal',
    'CRM',
    'Admin dashboard',
    'Mobile app',
    'Push notifications',
    'Invoices & estimates',
    'Online ordering',
    'Reviews',
    'Live chat',
    'English & Spanish',
    'Crew scheduling',
    'Before-and-after gallery'
  ];
  var MAX_LABEL = 40;
  var MAX_ITEMS = 16;
  var CARD_MAX = 6;

  function slug(label) {
    return String(label == null ? '' : label)
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function cleanLabel(v) {
    return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL);
  }

  /** What a project saves: trimmed names, no blanks or repeats, at most 16. */
  function clean(list) {
    if (!Array.isArray(list)) return [];
    var seen = {};
    var out = [];
    list.forEach(function (v) {
      var label = cleanLabel(v);
      var key = slug(label);
      if (!key || seen[key] || out.length >= MAX_ITEMS) return;
      seen[key] = true;
      out.push(label);
    });
    return out;
  }

  /** The defaults, then any name a project added, once each, in first-seen order. */
  function masterList(projects) {
    var out = DEFAULTS.slice();
    var seen = {};
    out.forEach(function (l) { seen[slug(l)] = true; });
    (projects || []).forEach(function (p) {
      clean(p && p.features).forEach(function (l) {
        var key = slug(l);
        if (seen[key]) return;
        seen[key] = true;
        out.push(l);
      });
    });
    return out;
  }

  /** A project's features in the shared list's order and spelling; names not in it go last. */
  function ordered(features, master) {
    var index = {};
    (master || DEFAULTS).forEach(function (l, i) { index[slug(l)] = { i: i, label: l }; });
    var known = [];
    var extra = [];
    clean(features).forEach(function (l) {
      var hit = index[slug(l)];
      if (hit) known.push(hit);
      else extra.push(l);
    });
    known.sort(function (a, b) { return a.i - b.i; });
    return known.map(function (k) { return k.label; }).concat(extra);
  }

  /** What a card shows: the first 6, and how many more the popup has. */
  function cardView(features, master, max) {
    var list = ordered(features, master);
    var n = max || CARD_MAX;
    return { shown: list.slice(0, n), more: Math.max(0, list.length - n) };
  }

  // Packages that can have a demo link (and so their own "What's included").
  var PACKAGES = ['starter-page', 'website', 'starter', 'growth'];

  /** Per-package lists, cleaned, kept only for packages with a demo link. */
  function cleanPackageFeatures(raw, demos) {
    var out = {};
    if (!raw || typeof raw !== 'object' || !demos || typeof demos !== 'object') return out;
    PACKAGES.forEach(function (id) {
      if (!demos[id]) return;
      var list = clean(raw[id]);
      if (list.length) out[id] = list;
    });
    return out;
  }

  var api = {
    DEFAULTS: DEFAULTS,
    PACKAGES: PACKAGES,
    cleanPackageFeatures: cleanPackageFeatures,
    MAX_LABEL: MAX_LABEL,
    slug: slug,
    clean: clean,
    masterList: masterList,
    ordered: ordered,
    cardView: cardView
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PortfolioFeatures = api;
})(typeof window !== 'undefined' ? window : null);
