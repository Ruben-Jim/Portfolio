/**
 * One set of rules for "is this the same business?" — used by Prospects,
 * Outreach Scripts, the Leads Pipeline form, and the Cloud Functions that turn
 * Hire Me / Contact / Schedule-a-call into leads. Pure functions, no database.
 *
 * Loads in the browser (window.CWR_LEAD_MATCH) and in Node (module.exports).
 * functions/lead-match.js is a copy made by the functions predeploy step —
 * edit this file, never that one. scripts/test-lead-match.mjs fails if they
 * drift.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CWR_LEAD_MATCH = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /** Last 10 digits, so "+1 (559) 555-0101" and "5595550101" match. */
  function digits(v) { return String(v || '').replace(/\D/g, '').slice(-10); }

  function normEmail(v) { return String(v || '').trim().toLowerCase(); }

  /** "Valley Lawn Co." and "valley lawn" match; "A & B" and "A and B" too. */
  function normName(v) {
    return String(v || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
      .replace(/(llc|inc|co)$/, '');
  }

  /** Business name for a prospect (business), lead (company), or anything with a name. */
  function businessOf(r) {
    return (r && (r.business || r.company)) || '';
  }

  /**
   * Same business when any of these agree: phone (10 digits), email, or
   * business name. A person's name alone is never enough — two "Maria"s are
   * not one lead.
   */
  function isSame(a, b) {
    if (!a || !b) return false;
    var pa = digits(a.phone), pb = digits(b.phone);
    if (pa.length === 10 && pa === pb) return true;
    var ea = normEmail(a.email), eb = normEmail(b.email);
    if (ea && ea === eb) return true;
    var na = normName(businessOf(a)), nb = normName(businessOf(b));
    return !!(na && na === nb);
  }

  function findMatch(rec, pool) {
    var list = pool || [];
    for (var i = 0; i < list.length; i++) if (isSame(rec, list[i])) return list[i];
    return null;
  }

  // Prospect touch kinds → the lead's "last contacted" methods.
  var TOUCH_TO_METHOD = {
    texted: 'text',
    emailed: 'email',
    dm: 'dm',
    'no-answer': 'call',
    voicemail: 'call',
    talked: 'call',
    'walked-in': 'visit'
  };

  /** {id: {at, kind, note}} or [{at, kind, note}] → oldest-first array. */
  function touchArray(touches) {
    if (!touches || typeof touches !== 'object') return [];
    var list = Array.isArray(touches) ? touches : Object.keys(touches).map(function (k) { return touches[k]; });
    return list.filter(function (t) { return t && t.at && t.kind; })
      .sort(function (a, b) { return a.at - b.at; });
  }

  /** Latest timestamp per method, merged over what the lead already has. */
  function outreachFromTouches(touches, existing) {
    var out = {};
    Object.keys(existing || {}).forEach(function (m) { if (Number(existing[m]) > 0) out[m] = Number(existing[m]); });
    touchArray(touches).forEach(function (t) {
      var m = TOUCH_TO_METHOD[t.kind];
      if (m && (!out[m] || t.at > out[m])) out[m] = t.at;
    });
    return out;
  }

  /**
   * The lead's timeline: prospect touches carried over plus anything already
   * there, de-duplicated on (at, kind) and keyed so RTDB stores it as a map.
   */
  function mergeHistory(existing, touches, from) {
    var seen = {};
    var all = touchArray(existing).concat(touchArray(touches).map(function (t) {
      return { at: t.at, kind: t.kind, note: t.note || null, from: t.from || from || 'prospect' };
    }));
    var out = {};
    all.forEach(function (t) {
      var key = 'h' + t.at + '_' + String(t.kind).replace(/[^a-z0-9-]/gi, '');
      if (seen[key]) return;
      seen[key] = 1;
      out[key] = { at: t.at, kind: t.kind, note: t.note || null, from: t.from || from || 'lead' };
    });
    return out;
  }

  /** Only the fields `existing` is missing — never overwrite what's there. */
  function fillBlanks(existing, incoming, fields) {
    var patch = {};
    (fields || Object.keys(incoming || {})).forEach(function (f) {
      var have = existing ? existing[f] : null;
      var want = incoming ? incoming[f] : null;
      var empty = have == null || have === '' || (typeof have === 'number' && have === 0);
      if (empty && want != null && want !== '' && want !== 0) patch[f] = want;
    });
    return patch;
  }

  // Leads Pipeline stages in order. Inbound events only ever move a lead forward.
  var STAGE_ORDER = ['lead', 'discovery-call', 'proposal', 'deposit'];

  function laterStage(a, b) {
    var ia = STAGE_ORDER.indexOf(a), ib = STAGE_ORDER.indexOf(b);
    return ib > ia ? b : (ia >= 0 ? a : b);
  }

  return {
    digits: digits,
    normEmail: normEmail,
    normName: normName,
    isSame: isSame,
    findMatch: findMatch,
    touchArray: touchArray,
    outreachFromTouches: outreachFromTouches,
    mergeHistory: mergeHistory,
    fillBlanks: fillBlanks,
    laterStage: laterStage,
    STAGE_ORDER: STAGE_ORDER,
    TOUCH_TO_METHOD: TOUCH_TO_METHOD
  };
});
