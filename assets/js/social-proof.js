/**
 * Social proof — pure rules shared by the homepage spotlight and Admin →
 * Testimonials → Social proof. Public entries live in RTDB socialProof/{id};
 * the raw numbers behind them in admin-only socialProofDetails/{id}.
 * Browser: window.SocialProof. Node (tests): module.exports.
 */
(function (root) {
  'use strict';

  var MAX = 6;
  var CHECK_IN_DAYS = 60;
  var MINUS = '−';
  var LIMITS = { client: 80, logoUrl: 500, stat: 12, label: 80, summary: 200, note: 500, count: 24 };
  var MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  // Real clients, so the homepage is never empty. No numbers until Ruben has real ones.
  var BUILT_IN = [
    {
      id: 'builtin-rizo', client: "Rizo's Pizzeria", logoUrl: '/assets/images/logo/logo-2-color.png',
      stat: '', label: '', source: '', asOf: '',
      summary: 'Online ordering with real-time order tracking for customers and a kitchen dashboard that keeps every order moving.',
      projectId: '', published: true, order: 10, updatedAt: 0
    },
    {
      id: 'builtin-shelton', client: 'Shelton Springs HOA', logoUrl: '/assets/images/logo/logo-1-color.png',
      stat: '', label: '', source: '', asOf: '',
      summary: 'A resident portal and board tools built for how the neighborhood actually runs day to day.',
      projectId: '', published: true, order: 20, updatedAt: 0
    },
    {
      id: 'builtin-procleaning', client: 'ProCleaning Seattle', logoUrl: '/assets/images/logo/logo-3-color.png',
      stat: '', label: '', source: '', asOf: '',
      summary: 'Field service workflows that keep crews, schedules, and customers in sync from the job site.',
      projectId: '', published: true, order: 30, updatedAt: 0
    }
  ];

  var SOURCES = {
    app: { en: 'From the app', es: 'Desde la app' },
    client: { en: 'Client-reported', es: 'Según el cliente' }
  };
  var MONTHS = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  };

  function str(v, max) {
    return String(v == null ? '' : v).trim().slice(0, max);
  }

  /** A number from what someone typed ("1,200", "$40", " 55 "), else null. */
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v == null ? '' : v).replace(/[\s,$]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    return Number(s);
  }

  function percentChange(before, after) {
    var b = num(before);
    var a = num(after);
    if (b == null || a == null || !(b > 0) || a < 0) return '';
    var pct = Math.round(((a - b) / b) * 100);
    var abs = Math.abs(pct).toLocaleString('en-US');
    return (pct < 0 ? MINUS : '+') + abs + '%';
  }

  function formatCount(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (/^\d[\d,]*$/.test(s)) return Number(s.replace(/,/g, '')).toLocaleString('en-US');
    return s;
  }

  function statFor(details) {
    var d = details || {};
    if (d.kind === 'change') return percentChange(d.before, d.after);
    if (d.kind === 'count') return formatCount(d.count);
    return '';
  }

  function sourceLabel(source, lang) {
    var s = SOURCES[source];
    if (!s) return '';
    return lang === 'es' ? s.es : s.en;
  }

  function monthLabel(asOf, lang) {
    var m = MONTH_RE.exec(String(asOf || ''));
    if (!m) return '';
    return (lang === 'es' ? MONTHS.es : MONTHS.en)[Number(m[2]) - 1] + ' ' + m[1];
  }

  /** "Rizo's Pizzeria · From the app · Sep 2026" (blank parts skipped). */
  function metaLine(entry, lang) {
    var e = entry || {};
    return [String(e.client || ''), sourceLabel(e.source, lang), monthLabel(e.asOf, lang)]
      .filter(Boolean)
      .join(' · ');
  }

  /** A site asset path or an https URL, else ''. */
  function cleanLogoUrl(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (s.length > LIMITS.logoUrl) return '';
    if (/^\.?\/?assets\//i.test(s)) s = '/' + s.replace(/^\.?\//, '');
    if (/^\/assets\/[A-Za-z0-9._\/-]+$/.test(s)) return s;
    if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
    return '';
  }

  /** The public entry: display fields only, every limit applied. */
  function sanitizeEntry(raw) {
    var r = raw || {};
    var order = Number(r.order);
    var updatedAt = Number(r.updatedAt);
    return {
      client: str(r.client, LIMITS.client),
      logoUrl: cleanLogoUrl(r.logoUrl),
      stat: str(r.stat, LIMITS.stat),
      label: str(r.label, LIMITS.label),
      source: r.source === 'app' || r.source === 'client' ? r.source : '',
      asOf: MONTH_RE.test(String(r.asOf || '')) ? String(r.asOf) : '',
      summary: str(r.summary, LIMITS.summary),
      projectId: /^[A-Za-z0-9_-]{1,64}$/.test(String(r.projectId || '')) ? String(r.projectId) : '',
      published: r.published === true,
      order: isFinite(order) ? order : 0,
      updatedAt: updatedAt > 0 ? updatedAt : 0
    };
  }

  /** The admin-only inputs behind an entry. */
  function sanitizeDetails(raw) {
    var r = raw || {};
    var kind = r.kind === 'change' || r.kind === 'count' ? r.kind : 'none';
    var createdAt = Number(r.createdAt);
    return {
      kind: kind,
      before: kind === 'change' ? num(r.before) : null,
      after: kind === 'change' ? num(r.after) : null,
      count: kind === 'count' ? str(r.count, LIMITS.count) : '',
      note: str(r.note, LIMITS.note),
      launchDate: DATE_RE.test(String(r.launchDate || '')) ? String(r.launchDate) : '',
      createdAt: createdAt > 0 ? createdAt : 0
    };
  }

  function validate(entry, details) {
    var e = entry || {};
    var d = details || {};
    var errors = [];
    if (!String(e.client || '').trim()) errors.push("Add the client's name.");
    // Kickoff draft: the before number is all there is until the check-in.
    var kickoff = d.kind === 'change' && num(d.after) == null && e.published !== true;
    if (d.kind === 'change') {
      var b = num(d.before);
      var a = num(d.after);
      if (b == null || !(b > 0)) errors.push('Before must be a number above 0.');
      if (!kickoff && (a == null || a < 0)) errors.push('After must be a number, 0 or more.');
    }
    if (d.kind === 'count') {
      var c = formatCount(d.count);
      if (!c) errors.push('Add the count.');
      else if (c.length > LIMITS.stat) errors.push('Keep the count to 12 characters or fewer.');
    }
    if ((d.kind === 'change' && !kickoff) || d.kind === 'count') {
      if (!String(e.label || '').trim()) errors.push('Say what the number measures.');
      if (e.source !== 'app' && e.source !== 'client') errors.push('Pick where the number came from.');
      if (!MONTH_RE.test(String(e.asOf || ''))) errors.push('Pick the month the number is from.');
    }
    if (e.published === true && !statFor(d) && !String(e.summary || '').trim()) {
      errors.push('Add a number or a what-we-built line before publishing.');
    }
    return errors;
  }

  function byOrder(a, b) {
    return (Number(a.order) || 0) - (Number(b.order) || 0);
  }

  /**
   * What the homepage shows. dbList null = not loaded / unreadable; [] = empty.
   * Either way the built-ins show. Saved entries with none published → [].
   */
  function visibleEntries(dbList, builtIns) {
    var list = Array.isArray(dbList) && dbList.length ? dbList : (builtIns || BUILT_IN);
    return list
      .filter(function (x) { return x && x.published === true && x.client; })
      .sort(byOrder)
      .slice(0, MAX);
  }

  /** No number yet, and 60+ days since launch. */
  function checkInDue(details, entry, today) {
    if (entry && String(entry.stat || '')) return false;
    var m = DATE_RE.exec(String((details && details.launchDate) || ''));
    if (!m) return false;
    var launch = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var t = today instanceof Date ? today : new Date(today);
    var now = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
    return (now - launch) / 86400000 >= CHECK_IN_DAYS;
  }

  var api = {
    BUILT_IN: BUILT_IN,
    MAX: MAX,
    CHECK_IN_DAYS: CHECK_IN_DAYS,
    num: num,
    percentChange: percentChange,
    formatCount: formatCount,
    statFor: statFor,
    sourceLabel: sourceLabel,
    monthLabel: monthLabel,
    metaLine: metaLine,
    cleanLogoUrl: cleanLogoUrl,
    sanitizeEntry: sanitizeEntry,
    sanitizeDetails: sanitizeDetails,
    validate: validate,
    visibleEntries: visibleEntries,
    checkInDue: checkInDue
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SocialProof = api;
})(typeof window !== 'undefined' ? window : null);
