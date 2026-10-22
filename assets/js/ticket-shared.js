/**
 * Client tickets — pure rules shared by Admin → client drawer and the client
 * portal. Tickets live in agencyMaintenance/{id}/tickets[]; private debug
 * notes and screenshots in admin-only agencyTicketNotes/{id}/{ref}.
 * Browser: window.CwrTickets. Node (tests): module.exports.
 */
(function (root) {
  'use strict';

  var STATUSES = ['open', 'in-progress', 'check', 'resolved'];
  var STATUS_LABELS = {
    open: 'Open',
    'in-progress': 'In progress',
    check: 'Ready for you to check',
    resolved: 'Resolved'
  };
  // The drawer's one-tap button: what comes next, and what the button says.
  var NEXT = {
    open: { key: 'in-progress', label: 'Start' },
    'in-progress': { key: 'check', label: 'Ready to check' },
    check: { key: 'resolved', label: 'Resolve' },
    resolved: { key: 'open', label: 'Reopen' }
  };

  var SOURCES = [
    { key: 'text', label: 'Text' },
    { key: 'email', label: 'Email' },
    { key: 'call', label: 'Call' },
    { key: 'in-person', label: 'In person' },
    { key: 'portal', label: 'Portal' }
  ];

  var KINDS = [
    { key: 'bug', label: 'Bug fix' },
    { key: 'change', label: 'Change request' },
    { key: 'question', label: 'Question' }
  ];

  var AREAS = [
    'Booking / scheduling',
    'Payments',
    'Customer accounts',
    'Admin dashboard',
    'Website / pages',
    'Mobile app',
    'Something else'
  ];

  // "If your app is down" promise on each plan card (client-portal.js MAINTENANCE_PLANS).
  var DOWN_WORDS = {
    essential: 'Reply within 1 business day',
    standard: 'Reply within 4 hours',
    priority: 'Reply within 2 hours'
  };

  var LIMITS = { title: 120, area: 60, details: 1200, writeup: 2000, note: 1200 };

  function str(v, max) {
    return String(v == null ? '' : v).slice(0, max);
  }

  function statusKey(v) {
    var t = String(v || 'open').toLowerCase();
    if (t === 'resolved' || t === 'closed' || t === 'done') return 'resolved';
    if (t === 'in-progress' || t === 'progress') return 'in-progress';
    if (t === 'check') return 'check';
    return 'open';
  }

  function statusLabel(v) {
    return STATUS_LABELS[statusKey(v)];
  }

  function nextStatus(v) {
    return NEXT[statusKey(v)];
  }

  function find(list, key) {
    for (var i = 0; i < list.length; i++) if (list[i].key === key) return list[i];
    return null;
  }

  /** Tickets from before CWR could open them carry no source: they came from the portal. */
  function sourceKey(v) {
    var hit = find(SOURCES, String(v || '').toLowerCase());
    return hit ? hit.key : 'portal';
  }

  function sourceLabel(v) {
    return find(SOURCES, sourceKey(v)).label;
  }

  function kindKey(v) {
    var hit = find(KINDS, String(v || '').toLowerCase());
    return hit ? hit.key : '';
  }

  function kindLabel(v) {
    var hit = find(KINDS, kindKey(v));
    return hit ? hit.label : '';
  }

  function slaWords(hours, fallback) {
    var h = Number(hours) || 0;
    if (!h) return fallback || 'No response time set';
    if (h < 24) return 'Reply within ' + h + (h === 1 ? ' business hour' : ' business hours');
    if (h === 24) return 'Reply within 24 hours';
    if (h % 24 === 0) return 'Reply within ' + h / 24 + ' business days';
    return 'Reply within ' + h + ' hours';
  }

  /** Something down uses the plan's faster "app is down" promise; anything else the plan's regular reply time. */
  function responseWords(ticket, maint, fallback) {
    var tier = String((maint && maint.planTier) || '').toLowerCase();
    if (ticket && ticket.down === true && DOWN_WORDS[tier]) return DOWN_WORDS[tier];
    return slaWords(maint && maint.slaHours, fallback);
  }

  /** Three-letter tag from the client name, e.g. "Pro Cleaning" -> PRC. Same as functions/portal-api.js. */
  function clientTag(maint) {
    var name = String((maint && maint.clientName) || '').toUpperCase();
    var words = name.replace(/[^A-Z ]/g, ' ').split(/\s+/).filter(Boolean);
    if (words.length >= 3) return words[0][0] + words[1][0] + words[2][0];
    if (words.length === 2) return (words[0].slice(0, 2) + words[1][0]).slice(0, 3);
    if (words.length === 1 && words[0].length >= 3) return words[0].slice(0, 3);
    var id = String((maint && maint.id) || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    return (id.slice(-3) || 'CLI').padStart(3, 'X');
  }

  /**
   * Sequential per client, e.g. CWR-PRC-004. From the highest number on the
   * record, not the count, so deleting an old ticket never reissues a live one.
   */
  function makeRef(maint, existing) {
    var highest = 0;
    (Array.isArray(existing) ? existing : []).forEach(function (t) {
      var m = String((t && t.ref) || '').match(/(\d+)\s*$/);
      if (m) highest = Math.max(highest, parseInt(m[1], 10));
    });
    var next = String(highest + 1);
    while (next.length < 3) next = '0' + next;
    return 'CWR-' + clientTag(maint) + '-' + next;
  }

  function normalizeTicket(raw) {
    var o = typeof raw === 'string' ? { title: raw } : raw || {};
    var reply = o.clientReply && typeof o.clientReply === 'object' ? o.clientReply : null;
    return {
      ref: str(o.ref, 40),
      title: str(o.title || o.subject || 'Ticket', LIMITS.title),
      area: str(o.area, LIMITS.area),
      details: str(o.details, LIMITS.details),
      status: statusKey(o.status),
      createdAt: str(o.createdAt || o.date, 40),
      source: sourceKey(o.source),
      kind: kindKey(o.kind),
      down: o.down === true,
      found: str(o.found, LIMITS.writeup),
      fixed: str(o.fixed, LIMITS.writeup),
      howToCheck: str(o.howToCheck, LIMITS.writeup),
      shareWriteup: o.shareWriteup !== false,
      clientReply: reply
        ? { verdict: reply.verdict === 'ok' ? 'ok' : 'not-working', note: str(reply.note, LIMITS.note), at: str(reply.at, 40) }
        : null,
      loggedAt: str(o.loggedAt, 40),
      resolvedAt: str(o.resolvedAt, 40),
      updatedAt: o.updatedAt || null
    };
  }

  /**
   * Display order for both ticket lists: what still needs doing reads before
   * what is handled, newest first. `i` is the slot in the stored array.
   */
  function listRows(tickets) {
    return (Array.isArray(tickets) ? tickets : [])
      .map(function (t, i) {
        var row = normalizeTicket(t);
        row.i = i;
        return row;
      })
      .sort(function (a, b) {
        var ar = a.status === 'resolved' ? 1 : 0;
        var br = b.status === 'resolved' ? 1 : 0;
        if (ar !== br) return ar - br;
        return String(b.createdAt).localeCompare(String(a.createdAt));
      });
  }

  /** Writes address a ticket by ref: array slots shift when one is deleted. */
  function findTicketIndex(tickets, ref) {
    var list = Array.isArray(tickets) ? tickets : [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && typeof list[i] === 'object' && list[i].ref === ref) return i;
    }
    return -1;
  }

  /** The printed write-up, filled sections only. */
  function writeupSections(t, opts) {
    var out = [];
    var add = function (label, text) {
      if (String(text || '').trim()) out.push({ label: label, text: String(text) });
    };
    if (opts && opts.includeReport) add('You told us', t.details);
    add('What we found', t.found);
    add('What we fixed', t.fixed);
    add('How to check it', t.howToCheck);
    return out;
  }

  /** Planner hours linked to one ticket, rounded like the planner (0.1 h). */
  function ticketHours(entries, maintId, ref) {
    var total = 0;
    (Array.isArray(entries) ? entries : []).forEach(function (e) {
      if (e && e.kind === 'maint' && e.maintenanceId === maintId && e.ticketRef === ref) {
        total += Math.max(0, Number(e.loggedHours) || 0);
      }
    });
    return Math.round(total * 10) / 10;
  }

  var api = {
    STATUSES: STATUSES,
    SOURCES: SOURCES,
    KINDS: KINDS,
    AREAS: AREAS,
    LIMITS: LIMITS,
    statusKey: statusKey,
    statusLabel: statusLabel,
    nextStatus: nextStatus,
    sourceKey: sourceKey,
    sourceLabel: sourceLabel,
    kindKey: kindKey,
    kindLabel: kindLabel,
    slaWords: slaWords,
    responseWords: responseWords,
    makeRef: makeRef,
    normalizeTicket: normalizeTicket,
    listRows: listRows,
    findTicketIndex: findTicketIndex,
    writeupSections: writeupSections,
    ticketHours: ticketHours
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CwrTickets = api;
})(typeof window !== 'undefined' ? window : null);
