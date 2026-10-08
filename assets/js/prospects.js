/**
 * Prospects — researched businesses you have not heard back from yet.
 *
 * Lives in RTDB `agencyProspects` (admin-only), separate from `pipelineLeads`
 * so the pipeline and "Script results" only count real conversations. A
 * prospect moves to the pipeline when they reply or ask for a mockup.
 *
 * Flow: import a list (CSV upload / pasted rows / one at a time) → work the
 * "Due today" list → log each outcome → follow-ups schedule themselves →
 * promote replies to Client Pipeline.
 *
 * Cadence (outbound touches with no reply, counted in distinct days):
 *   1st day → follow up in 3 days · 2nd → 4 days later (day 7) ·
 *   3rd → nurture, check back in 30 days.
 */
(function (global) {
  'use strict';

  var PATH = 'agencyProspects';
  var PIPELINE_PATH = 'pipelineLeads';
  var DAILY_GOAL = 30;

  var STATUS = {
    new: 'New',
    working: 'Contacted',
    replied: 'Replied',
    mockup: 'Wants mockup',
    promoted: 'In pipeline',
    nurture: 'Nurture',
    dead: 'Closed'
  };
  // Outbound touches never move a prospect backwards from these.
  var ENGAGED = { replied: 1, mockup: 1, promoted: 1 };

  var OUTCOMES = [
    { id: 'no-answer', label: 'No answer', outbound: true },
    { id: 'voicemail', label: 'Voicemail', outbound: true },
    { id: 'texted', label: 'Texted', outbound: true },
    { id: 'emailed', label: 'Emailed', outbound: true },
    { id: 'dm', label: 'DM sent', outbound: true },
    { id: 'walked-in', label: 'Walked in', outbound: true },
    { id: 'talked', label: 'Talked', status: 'replied', next: 2 },
    { id: 'replied', label: 'They replied', status: 'replied', next: 1 },
    { id: 'wants-mockup', label: 'Wants mockup', status: 'mockup', next: 1, promote: true },
    { id: 'not-interested', label: 'Not interested', status: 'dead' },
    { id: 'bad-number', label: 'Wrong number', status: 'dead' }
  ];
  var OUTCOME_BY_ID = {};
  OUTCOMES.forEach(function (o) { OUTCOME_BY_ID[o.id] = o; });

  // ——— pure helpers (also exercised by scripts/test-prospects.mjs) ———

  function pad(n) { return String(n).padStart(2, '0'); }

  function dateKey(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function addDays(days, from) {
    var d = from ? new Date(from) : new Date();
    d.setDate(d.getDate() + days);
    return dateKey(d);
  }

  function digits(v) { return String(v || '').replace(/\D/g, '').slice(-10); }

  function normName(v) {
    return String(v || '').toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]/g, '')
      .replace(/(llc|inc|co)$/, '');
  }

  /** RFC-4180-ish: quoted fields, "" escapes, newlines inside quotes. Tabs when pasted from a sheet. */
  function parseTable(text) {
    text = String(text || '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
    var firstLine = text.split('\n')[0] || '';
    var delim = firstLine.indexOf('\t') !== -1 && firstLine.indexOf(',') === -1 ? '\t' : ',';
    var rows = [];
    var row = [];
    var field = '';
    var quoted = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
        else if (c === '"') quoted = false;
        else field += c;
      } else if (c === '"' && field === '') {
        quoted = true;
      } else if (c === delim) {
        row.push(field); field = '';
      } else if (c === '\n') {
        row.push(field); rows.push(row); row = []; field = '';
      } else {
        field += c;
      }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (f) { return String(f).trim(); }); });
  }

  var HEADERS = {
    order: ['#', 'order', 'priority', 'no'],
    business: ['business', 'businessname', 'company', 'name'],
    owner: ['owner', 'ownername', 'contactname'],
    phone: ['phone', 'phonenumber', 'tel', 'mobile'],
    email: ['email', 'emailaddress'],
    website: ['website', 'site', 'url'],
    city: ['city', 'town', 'location'],
    niche: ['niche', 'category', 'industry', 'type'],
    reviews: ['googlereviews', 'reviews', 'rating'],
    finding: ['whatwefound', 'finding', 'findings', 'notes', 'note'],
    scriptId: ['script', 'scriptid'],
    contactHow: ['howtocontact', 'contact', 'contactmethod', 'when']
  };

  function headerKey(h) {
    var raw = String(h || '').trim().toLowerCase();
    var k = raw === '#' ? '#' : raw.replace(/[^a-z0-9]/g, '');
    for (var field in HEADERS) if (HEADERS[field].indexOf(k) !== -1) return field;
    return '';
  }

  /** Table rows → prospect records. The first row must be a header row. */
  function rowsToProspects(rows, defaults) {
    defaults = defaults || {};
    if (!rows.length) return { records: [], error: 'No rows found.' };
    var map = rows[0].map(headerKey);
    if (map.indexOf('business') === -1) {
      return { records: [], error: 'Missing a "Business" (or "Company") header in the first row.' };
    }
    var records = rows.slice(1).map(function (r) {
      var rec = {};
      map.forEach(function (field, i) {
        if (field) rec[field] = String(r[i] == null ? '' : r[i]).trim();
      });
      return rec;
    }).filter(function (rec) { return rec.business; }).map(function (rec, i) {
      var n = parseInt(rec.order, 10);
      var website = /^none$/i.test(rec.website || '') ? '' : (rec.website || '');
      return {
        business: rec.business.slice(0, 160),
        owner: (rec.owner || '').slice(0, 120),
        phone: (rec.phone || '').slice(0, 40),
        email: (rec.email || '').slice(0, 160),
        website: website.slice(0, 300),
        city: (rec.city || defaults.city || '').slice(0, 80),
        niche: (rec.niche || defaults.niche || 'Other').slice(0, 60),
        reviews: (rec.reviews || '').slice(0, 40),
        finding: (rec.finding || '').slice(0, 600),
        scriptId: (rec.scriptId || '').replace(/\s*\(.*\)\s*$/, '').trim().slice(0, 80),
        contactHow: (rec.contactHow || '').slice(0, 120),
        // Numbered rows keep their order; "BACKUP" and blanks go after them.
        order: isNaN(n) ? 900 + i : n,
        list: (defaults.list || '').slice(0, 80)
      };
    });
    return { records: records, error: '' };
  }

  /** Same phone (last 10 digits) or same business name. */
  function findMatch(rec, pool) {
    var p = digits(rec.phone);
    var n = normName(rec.business || rec.company);
    for (var i = 0; i < pool.length; i++) {
      var o = pool[i];
      if (p.length === 10 && digits(o.phone) === p) return o;
      if (n && normName(o.business || o.company || o.name) === n) return o;
    }
    return null;
  }

  /** Split an import into new rows and duplicates (of saved prospects, pipeline leads, or earlier rows). */
  function dedupe(records, existing, leads) {
    var fresh = [];
    var dupes = [];
    records.forEach(function (rec) {
      var hit = findMatch(rec, existing) || findMatch(rec, leads || []) || findMatch(rec, fresh);
      if (hit) dupes.push({ rec: rec, hit: hit });
      else fresh.push(rec);
    });
    return { fresh: fresh, dupes: dupes };
  }

  function touchList(p) {
    var t = p && p.touches;
    if (!t || typeof t !== 'object') return [];
    return Object.keys(t).map(function (k) { return Object.assign({ id: k }, t[k]); })
      .filter(function (x) { return x && x.at; })
      .sort(function (a, b) { return a.at - b.at; });
  }

  /** Distinct local days with an outbound touch, counting `extraDay` too. */
  function outboundDays(touches, extraDay) {
    var days = {};
    touches.forEach(function (t) {
      var o = OUTCOME_BY_ID[t.kind];
      if (o && o.outbound) days[dateKey(new Date(t.at))] = 1;
    });
    if (extraDay) days[extraDay] = 1;
    return Object.keys(days).length;
  }

  /** What logging `outcomeId` today does to status and the next follow-up. */
  function applyOutcome(p, outcomeId, now) {
    var o = OUTCOME_BY_ID[outcomeId];
    if (!o) return null;
    now = now || new Date();
    var today = dateKey(now);
    var status = p.status || 'new';
    if (o.status) {
      return {
        status: o.status === 'replied' && status === 'promoted' ? 'promoted' : o.status,
        nextAt: o.next ? addDays(o.next, now) : ''
      };
    }
    if (ENGAGED[status]) return { status: status, nextAt: addDays(2, now) };
    var days = outboundDays(touchList(p), today);
    if (days >= 3) return { status: 'nurture', nextAt: addDays(30, now) };
    return { status: 'working', nextAt: addDays(days === 1 ? 3 : 4, now) };
  }

  function isDue(p, today) {
    today = today || dateKey();
    if (p.status === 'dead' || p.status === 'promoted') return false;
    if (p.status === 'new') return true;
    return !!p.nextAt && p.nextAt <= today;
  }

  function sortProspects(list, today) {
    today = today || dateKey();
    return list.slice().sort(function (a, b) {
      var da = isDue(a, today) ? 0 : 1;
      var db = isDue(b, today) ? 0 : 1;
      if (da !== db) return da - db;
      // Follow-ups that are due come before brand-new rows.
      var na = a.status === 'new' ? 1 : 0;
      var nb = b.status === 'new' ? 1 : 0;
      if (na !== nb) return na - nb;
      if (a.status === 'new') return (a.order || 0) - (b.order || 0);
      return String(a.nextAt || '9999').localeCompare(String(b.nextAt || '9999'));
    });
  }

  /** Scoreboard numbers for today and per niche. */
  function scoreboard(list, now) {
    var today = dateKey(now);
    var contactedToday = 0;
    var repliesToday = 0;
    var niches = {};
    list.forEach(function (p) {
      var touches = touchList(p);
      var todays = touches.filter(function (t) { return dateKey(new Date(t.at)) === today; });
      if (todays.length) contactedToday += 1;
      if (todays.some(function (t) { var o = OUTCOME_BY_ID[t.kind]; return o && !o.outbound && o.status !== 'dead'; })) {
        repliesToday += 1;
      }
      var key = p.niche || 'Other';
      var row = niches[key] || (niches[key] = { niche: key, total: 0, contacted: 0, replied: 0, mockup: 0, promoted: 0 });
      row.total += 1;
      if (touches.length) row.contacted += 1;
      if (ENGAGED[p.status] || touches.some(function (t) {
        var o = OUTCOME_BY_ID[t.kind]; return o && (o.status === 'replied' || o.status === 'mockup');
      })) row.replied += 1;
      if (p.status === 'mockup' || touches.some(function (t) { return t.kind === 'wants-mockup'; })) row.mockup += 1;
      if (p.status === 'promoted') row.promoted += 1;
    });
    return {
      contactedToday: contactedToday,
      repliesToday: repliesToday,
      due: list.filter(function (p) { return isDue(p, today) && p.status !== 'new'; }).length,
      fresh: list.filter(function (p) { return p.status === 'new'; }).length,
      niches: Object.keys(niches).map(function (k) { return niches[k]; })
        .sort(function (a, b) { return b.total - a.total; })
    };
  }

  function csvCell(v) {
    var s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function toCsv(list) {
    var head = ['Business', 'Owner', 'Phone', 'Email', 'Website', 'City', 'Niche', 'Google reviews', 'What we found',
      'Script', 'How to contact', 'Status', 'Next follow-up', 'Touches', 'Last outcome', 'Touch log', 'Pipeline lead', 'List'];
    var lines = [head.join(',')];
    list.forEach(function (p) {
      var touches = touchList(p);
      var last = touches[touches.length - 1];
      lines.push([
        p.business, p.owner, p.phone, p.email, p.website, p.city, p.niche, p.reviews, p.finding,
        p.scriptId, p.contactHow, STATUS[p.status] || p.status, p.nextAt, touches.length,
        last ? (OUTCOME_BY_ID[last.kind] || {}).label || last.kind : '',
        touches.map(function (t) {
          return dateKey(new Date(t.at)) + ' ' + ((OUTCOME_BY_ID[t.kind] || {}).label || t.kind) + (t.note ? ' (' + t.note + ')' : '');
        }).join('; '),
        p.leadId || '', p.list
      ].map(csvCell).join(','));
    });
    return lines.join('\n');
  }

  // ——— state ———

  var prospects = [];
  var byId = {};
  var unsub = null;
  var els = {};
  var bound = false;
  var filter = 'due';
  var nicheFilter = '';
  var query = '';
  var pendingImport = null;
  var expanded = {};

  function esc(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function ready() {
    if (!global.rtdb || !global.rtdbRef || !global.rtdbOnValue || !global.rtdbUpdate || !global.rtdbPush) return false;
    return typeof global.isAdminSession === 'function' ? !!global.isAdminSession() : true;
  }

  function waitReady(ms) {
    return new Promise(function (resolve) {
      var waited = 0;
      (function tick() {
        if (ready()) return resolve(true);
        if (waited >= ms) return resolve(false);
        waited += 250;
        setTimeout(tick, 250);
      })();
    });
  }

  function ref(path) { return global.rtdbRef(global.rtdb, path); }

  function now() { return Date.now(); }

  function status(msg, isError) {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.hidden = !msg;
    els.status.classList.toggle('is-error', !!isError);
  }

  function subscribe() {
    if (unsub) return;
    unsub = global.rtdbOnValue(ref(PATH), function (snap) {
      var val = snap && typeof snap.val === 'function' ? snap.val() : null;
      byId = {};
      prospects = Object.keys(val || {}).map(function (id) {
        var p = Object.assign({ id: id }, val[id]);
        byId[id] = p;
        return p;
      });
      render();
    }, function (err) {
      console.warn('Prospects:', err);
      status('Could not load prospects — make sure you’re signed in and the database rules are deployed.', true);
    });
  }

  async function loadLeads() {
    var snap = await global.rtdbGet(ref(PIPELINE_PATH));
    var val = snap && typeof snap.val === 'function' ? snap.val() : null;
    return Object.keys(val || {}).map(function (id) { return Object.assign({ id: id }, val[id]); });
  }

  // ——— writes ———

  async function logTouch(id, kind, note) {
    var p = byId[id];
    if (!p || !OUTCOME_BY_ID[kind]) return;
    var res = applyOutcome(p, kind);
    var key = global.rtdbPush(ref(PATH + '/' + id + '/touches')).key;
    var patch = {
      status: res.status,
      nextAt: res.nextAt || null,
      lastTouchAt: now(),
      updatedAt: now()
    };
    patch['touches/' + key] = { at: now(), kind: kind, note: note ? String(note).slice(0, 300) : null };
    await global.rtdbUpdate(ref(PATH + '/' + id), patch);
    if (OUTCOME_BY_ID[kind].promote && !p.leadId) {
      await promote(id);
    }
  }

  async function scriptLabel(scriptId) {
    if (!scriptId) return '';
    try {
      var snap = await global.rtdbGet(ref('agencyOutreachScripts/' + scriptId + '/label'));
      return (snap && snap.val && snap.val()) || scriptId;
    } catch (e) { return scriptId; }
  }

  function leadNotes(p) {
    var lines = ['Prospect · ' + [p.niche, p.city, p.reviews ? 'Google ★ ' + p.reviews : ''].filter(Boolean).join(' · ')];
    if (p.website) lines.push('Website: ' + p.website);
    if (p.finding) lines.push('Found: ' + p.finding);
    var touches = touchList(p);
    if (touches.length) {
      lines.push('', 'Outreach log:');
      touches.forEach(function (t) {
        lines.push('- ' + dateKey(new Date(t.at)) + ' ' + ((OUTCOME_BY_ID[t.kind] || {}).label || t.kind) + (t.note ? ' — ' + t.note : ''));
      });
    }
    return lines.join('\n');
  }

  /** Create (or link) a Client Pipeline lead for this prospect. */
  async function promote(id) {
    var p = byId[id];
    if (!p) return;
    if (p.leadId) { status('“' + p.business + '” is already in Client Pipeline.'); return; }
    var leads = await loadLeads();
    var dup = findMatch(p, leads);
    var leadId;
    if (dup) {
      leadId = dup.id;
      await global.rtdbUpdate(ref(PIPELINE_PATH + '/' + dup.id), {
        notes: (dup.notes ? String(dup.notes) + '\n\n' : '') + leadNotes(p),
        updatedAt: now()
      });
    } else {
      var leadRef = global.rtdbPush(ref(PIPELINE_PATH));
      leadId = leadRef.key;
      await global.rtdbSet(leadRef, {
        name: p.owner || p.business,
        company: p.business,
        phone: p.phone || '',
        email: p.email || '',
        projectType: 'web',
        value: 0,
        stage: 'lead',
        source: 'cold',
        notes: leadNotes(p),
        followUpAt: p.nextAt || addDays(1),
        outreachScriptId: p.scriptId || null,
        outreachScriptLabel: p.scriptId ? await scriptLabel(p.scriptId) : null,
        createdAt: now(),
        updatedAt: now()
      });
    }
    await linkLead(id, leadId);
    status((dup ? 'Linked “' : 'Added “') + p.business + '” to Client Pipeline.');
  }

  async function linkLead(id, leadId) {
    if (!byId[id] || !leadId) return;
    await global.rtdbUpdate(ref(PATH + '/' + id), { leadId: leadId, status: 'promoted', updatedAt: now() });
  }

  async function saveFields(id, fields) {
    fields.updatedAt = now();
    await global.rtdbUpdate(ref(PATH + '/' + id), fields);
  }

  async function removeProspect(id) {
    if (!global.rtdbRemove) return;
    await global.rtdbRemove(ref(PATH + '/' + id));
  }

  // ——— import ———

  async function prepareImport(text, source) {
    var parsed = rowsToProspects(parseTable(text), {
      city: (els.importCity && els.importCity.value || '').trim(),
      list: (els.importList && els.importList.value || '').trim() || source + ' ' + dateKey()
    });
    if (parsed.error) { pendingImport = null; renderImportPreview(parsed.error, true); return; }
    var leads = [];
    try { leads = await loadLeads(); } catch (e) { /* pipeline unreadable — prospects-only dedupe */ }
    pendingImport = dedupe(parsed.records, prospects, leads);
    renderImportPreview();
  }

  async function commitImport() {
    if (!pendingImport || !pendingImport.fresh.length) return;
    var writes = {};
    var t = now();
    pendingImport.fresh.forEach(function (rec) {
      var key = global.rtdbPush(ref(PATH)).key;
      writes[key] = Object.assign({}, rec, { status: 'new', nextAt: null, createdAt: t, updatedAt: t });
    });
    await global.rtdbUpdate(ref(PATH), writes);
    var n = pendingImport.fresh.length;
    pendingImport = null;
    if (els.importText) els.importText.value = '';
    if (els.importFile) els.importFile.value = '';
    renderImportPreview();
    var add = els.root.querySelector('.prospects-add');
    if (add) add.open = false;
    filter = 'due';
    status('Imported ' + n + ' prospect' + (n === 1 ? '' : 's') + '.');
  }

  async function addOne(form) {
    var get = function (name) { var el = form.elements[name]; return el ? String(el.value || '').trim() : ''; };
    if (!get('business')) { status('Add the business name first.', true); return; }
    var rec = rowsToProspects([
      ['Business', 'Owner', 'Phone', 'Website', 'City', 'Niche', 'Script', 'What we found'],
      [get('business'), get('owner'), get('phone'), get('website'), get('city'), get('niche'), get('script'), get('finding')]
    ], { list: 'Added by hand' }).records[0];
    var hit = findMatch(rec, prospects);
    if (hit) { status('“' + hit.business + '” is already in Prospects.', true); return; }
    rec.order = 0;
    var r = global.rtdbPush(ref(PATH));
    await global.rtdbSet(r, Object.assign(rec, { status: 'new', createdAt: now(), updatedAt: now() }));
    form.reset();
    status('Added “' + rec.business + '”.');
  }

  function exportCsv() {
    var blob = new Blob([toCsv(sortProspects(prospects))], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'prospects-' + dateKey() + '.csv';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  // ——— open in Outreach Scripts ———

  function openScript(id) {
    var p = byId[id];
    if (!p || !global.CWR_OUTREACH || typeof global.CWR_OUTREACH.prefill !== 'function') return;
    var tab = document.getElementById('admin-tab-outreach');
    if (tab) tab.click();
    global.CWR_OUTREACH.prefill({
      prospectId: id,
      scriptId: p.scriptId,
      name: p.owner || '',
      company: p.business,
      city: p.city || '',
      phone: p.phone || '',
      email: p.email || ''
    });
  }

  // ——— render ———

  function filtered() {
    var today = dateKey();
    var q = query.toLowerCase();
    return sortProspects(prospects, today).filter(function (p) {
      if (nicheFilter && (p.niche || 'Other') !== nicheFilter) return false;
      if (q && [p.business, p.owner, p.phone, p.city, p.niche, p.finding].join(' ').toLowerCase().indexOf(q) === -1) return false;
      if (filter === 'all') return true;
      if (filter === 'due') return isDue(p, today);
      return (p.status || 'new') === filter;
    });
  }

  function renderScore() {
    if (!els.score) return;
    var s = scoreboard(prospects);
    var pct = Math.min(100, Math.round((s.contactedToday / DAILY_GOAL) * 100));
    var nicheRows = s.niches.map(function (r) {
      var rate = r.contacted ? Math.round((r.replied / r.contacted) * 100) + '%' : '—';
      return '<tr><td>' + esc(r.niche) + '</td><td>' + r.total + '</td><td>' + r.contacted + '</td><td>' + r.replied +
        '</td><td>' + rate + '</td><td>' + r.mockup + '</td><td>' + r.promoted + '</td></tr>';
    }).join('');
    els.score.innerHTML =
      '<div class="prospects-goal">' +
        '<div class="prospects-goal-top"><strong>' + s.contactedToday + ' / ' + DAILY_GOAL + '</strong> businesses contacted today</div>' +
        '<div class="prospects-goal-bar" role="progressbar" aria-valuemin="0" aria-valuemax="' + DAILY_GOAL + '" aria-valuenow="' + s.contactedToday + '"><span style="width:' + pct + '%"></span></div>' +
        '<div class="prospects-goal-meta">' + s.repliesToday + ' repl' + (s.repliesToday === 1 ? 'y' : 'ies') + ' today · ' +
          s.due + ' follow-up' + (s.due === 1 ? '' : 's') + ' due · ' + s.fresh + ' not contacted yet</div>' +
      '</div>' +
      (nicheRows
        ? '<div class="prospects-table-wrap"><table class="outreach-stats-table prospects-niche-table"><thead><tr><th>Niche</th><th>Total</th><th>Contacted</th><th>Replied</th><th>Reply rate</th><th>Mockups</th><th>Pipeline</th></tr></thead><tbody>' + nicheRows + '</tbody></table></div>'
        : '');
  }

  function renderFilters() {
    if (!els.filters) return;
    var today = dateKey();
    var counts = { due: 0, all: prospects.length };
    Object.keys(STATUS).forEach(function (k) { counts[k] = 0; });
    prospects.forEach(function (p) {
      counts[p.status || 'new'] = (counts[p.status || 'new'] || 0) + 1;
      if (isDue(p, today)) counts.due += 1;
    });
    var chips = [['due', 'Due today']].concat(
      ['new', 'working', 'replied', 'mockup', 'nurture', 'promoted', 'dead'].map(function (k) { return [k, STATUS[k]]; }),
      [['all', 'All']]
    );
    els.filters.innerHTML = chips.map(function (c) {
      return '<button type="button" class="prospects-chip' + (filter === c[0] ? ' is-active' : '') + '" data-prospect-filter="' + c[0] + '">' +
        esc(c[1]) + ' <span>' + (counts[c[0]] || 0) + '</span></button>';
    }).join('');
    if (els.niche && typeof global.setBusinessDocSelectOptions === 'function') {
      var niches = {};
      prospects.forEach(function (p) { niches[p.niche || 'Other'] = 1; });
      if (nicheFilter && !niches[nicheFilter]) nicheFilter = '';
      global.setBusinessDocSelectOptions(els.niche, [{ value: '', label: 'All niches' }].concat(
        Object.keys(niches).sort().map(function (n) { return { value: n, label: n }; })
      ), { value: nicheFilter, keepValue: false });
    }
  }

  function siteHref(w) {
    if (!w || /\s/.test(w) && !/^https?:/i.test(w)) return '';
    return /^https?:\/\//i.test(w) ? w : 'https://' + w;
  }

  function card(p, today) {
    var touches = touchList(p);
    var last = touches[touches.length - 1];
    var st = p.status || 'new';
    var due = isDue(p, today);
    var meta = [p.niche, p.city, p.reviews ? '★ ' + p.reviews : ''].filter(Boolean).map(esc).join(' · ');
    var href = siteHref(p.website);
    var tel = digits(p.phone);
    var nextLine = st === 'dead' ? 'Closed'
      : st === 'promoted' ? 'In Client Pipeline'
      : st === 'new' ? (p.contactHow ? esc(p.contactHow) : 'Not contacted yet')
      : 'Next: ' + esc(p.nextAt || '—') + (due ? ' · <strong>due</strong>' : '');
    var open = expanded[p.id];
    return '<div class="prospect-card prospect-card--' + st + (due ? ' is-due' : '') + '" data-id="' + esc(p.id) + '">' +
      '<div class="prospect-card-head">' +
        '<div><h4 class="prospect-name">' + esc(p.business) + (p.owner ? ' <span>· ' + esc(p.owner) + '</span>' : '') + '</h4>' +
        '<p class="prospect-meta">' + meta + '</p></div>' +
        '<span class="prospect-pill">' + esc(STATUS[st] || st) + '</span>' +
      '</div>' +
      (p.finding ? '<p class="prospect-finding">' + esc(p.finding) + '</p>' : '') +
      '<p class="prospect-links">' +
        (p.phone ? '<a href="tel:' + esc(tel) + '">' + esc(p.phone) + '</a>' : '') +
        (href ? '<a href="' + esc(href) + '" target="_blank" rel="noopener">Website</a>' : (p.website ? '' : '<span>No website</span>')) +
        (p.scriptId ? '<span>Script: ' + esc(p.scriptId) + '</span>' : '') +
      '</p>' +
      '<p class="prospect-next">' + nextLine + (last ? ' · last: ' + esc((OUTCOME_BY_ID[last.kind] || {}).label || last.kind) + ' ' + esc(dateKey(new Date(last.at))) : '') + '</p>' +
      '<div class="prospect-actions">' +
        (p.scriptId ? '<button type="button" class="outreach-btn outreach-btn--primary" data-act="script">Open script</button>' : '') +
        ((st === 'replied' || st === 'mockup') && !p.leadId ? '<button type="button" class="outreach-btn outreach-btn--pipeline" data-act="promote">Add to pipeline</button>' : '') +
        '<button type="button" class="outreach-btn" data-act="toggle" aria-expanded="' + (open ? 'true' : 'false') + '">' + (open ? 'Close' : 'Log outcome') + '</button>' +
      '</div>' +
      (open ? detail(p, touches) : '') +
    '</div>';
  }

  function detail(p, touches) {
    return '<div class="prospect-detail">' +
      '<div class="prospect-outcomes" role="group" aria-label="Log outcome">' +
        OUTCOMES.map(function (o) {
          return '<button type="button" class="prospects-chip' + (o.outbound ? '' : ' prospects-chip--result') + '" data-outcome="' + o.id + '">' + esc(o.label) + '</button>';
        }).join('') +
      '</div>' +
      '<label class="prospect-field">Note for this outcome <em>(optional)</em><input type="text" class="form-input" data-field="touch-note" maxlength="300" placeholder="Owner is Maria, call back after 3"></label>' +
      '<div class="prospect-edit">' +
        '<label class="prospect-field">Owner<input type="text" class="form-input" data-field="owner" value="' + esc(p.owner) + '"></label>' +
        '<label class="prospect-field">Email<input type="email" class="form-input" data-field="email" value="' + esc(p.email) + '"></label>' +
        '<label class="prospect-field">Next follow-up<input type="date" class="form-input" data-field="nextAt" value="' + esc(p.nextAt || '') + '"></label>' +
        '<label class="prospect-field">Script id<input type="text" class="form-input" data-field="scriptId" value="' + esc(p.scriptId) + '"></label>' +
      '</div>' +
      '<div class="prospect-actions">' +
        '<button type="button" class="outreach-btn" data-act="save">Save details</button>' +
        '<button type="button" class="outreach-btn prospect-delete" data-act="delete">Delete</button>' +
      '</div>' +
      (touches.length
        ? '<ol class="prospect-log">' + touches.slice().reverse().map(function (t) {
            return '<li><span>' + esc(new Date(t.at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + '</span> ' +
              esc((OUTCOME_BY_ID[t.kind] || {}).label || t.kind) + (t.note ? ' — ' + esc(t.note) : '') + '</li>';
          }).join('') + '</ol>'
        : '<p class="prospect-log-empty">No outreach logged yet.</p>') +
    '</div>';
  }

  function renderList() {
    if (!els.list) return;
    var today = dateKey();
    var rows = filtered();
    if (!prospects.length) {
      els.list.innerHTML = '<p class="prospects-empty">No prospects yet. Use “Add prospects” above to upload your list.</p>';
      return;
    }
    if (!rows.length) {
      els.list.innerHTML = '<p class="prospects-empty">' + (filter === 'due' ? 'Nothing due today. Nice work — add new prospects or check Nurture.' : 'No prospects match.') + '</p>';
      return;
    }
    els.list.innerHTML = rows.map(function (p) { return card(p, today); }).join('');
  }

  function renderImportPreview(error, isError) {
    if (!els.importPreview) return;
    if (error) {
      els.importPreview.innerHTML = '<p class="prospects-import-msg' + (isError ? ' is-error' : '') + '">' + esc(error) + '</p>';
      els.importPreview.hidden = false;
      return;
    }
    if (!pendingImport) { els.importPreview.hidden = true; els.importPreview.innerHTML = ''; return; }
    var f = pendingImport.fresh;
    var d = pendingImport.dupes;
    els.importPreview.innerHTML =
      '<p class="prospects-import-msg"><strong>' + f.length + ' new</strong> · ' + d.length + ' already saved (skipped)</p>' +
      (d.length ? '<p class="prospects-import-dupes">Skipped: ' + d.map(function (x) { return esc(x.rec.business); }).join(', ') + '</p>' : '') +
      (f.length ? '<ul class="prospects-import-list">' + f.slice(0, 8).map(function (r) {
        return '<li>' + esc(r.business) + ' <span>' + esc([r.niche, r.city, r.phone].filter(Boolean).join(' · ')) + '</span></li>';
      }).join('') + (f.length > 8 ? '<li><span>…and ' + (f.length - 8) + ' more</span></li>' : '') + '</ul>' : '') +
      '<div class="prospect-actions">' +
        (f.length ? '<button type="button" class="outreach-btn outreach-btn--primary" data-act="commit-import">Import ' + f.length + '</button>' : '') +
        '<button type="button" class="outreach-btn" data-act="cancel-import">Cancel</button>' +
      '</div>';
    els.importPreview.hidden = false;
  }

  function render() {
    // Clear "Loading…" once data arrives, but keep messages like "Imported 12".
    if (els.status && /^Loading/.test(els.status.textContent)) status('');
    renderScore();
    renderFilters();
    renderList();
  }

  // ——— events ———

  function cardId(el) {
    var c = el.closest('[data-id]');
    return c ? c.getAttribute('data-id') : '';
  }

  function run(promise) {
    Promise.resolve(promise).catch(function (err) {
      console.warn('Prospects:', err);
      status(err && err.message ? err.message : 'Something went wrong.', true);
    });
  }

  function bind() {
    if (bound) return;
    bound = true;

    els.root.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-prospect-filter]');
      if (chip) { filter = chip.getAttribute('data-prospect-filter'); renderFilters(); renderList(); return; }

      var outcome = e.target.closest('[data-outcome]');
      if (outcome) {
        var oid = cardId(outcome);
        var noteEl = outcome.closest('.prospect-card').querySelector('[data-field="touch-note"]');
        run(logTouch(oid, outcome.getAttribute('data-outcome'), noteEl ? noteEl.value.trim() : ''));
        return;
      }

      var btn = e.target.closest('[data-act]');
      if (!btn) return;
      var act = btn.getAttribute('data-act');
      var id = cardId(btn);
      if (act === 'toggle') { expanded[id] = !expanded[id]; renderList(); }
      else if (act === 'script') openScript(id);
      else if (act === 'promote') run(promote(id));
      else if (act === 'save') {
        var c = btn.closest('.prospect-card');
        var val = function (f) { var el = c.querySelector('[data-field="' + f + '"]'); return el ? el.value.trim() : ''; };
        run(saveFields(id, { owner: val('owner'), email: val('email'), nextAt: val('nextAt') || null, scriptId: val('scriptId') })
          .then(function () { status('Saved.'); }));
      } else if (act === 'delete') {
        var p = byId[id];
        if (p && global.confirm('Delete “' + p.business + '” from Prospects? Its outreach log goes with it.')) {
          delete expanded[id];
          run(removeProspect(id));
        }
      } else if (act === 'commit-import') run(commitImport());
      else if (act === 'cancel-import') { pendingImport = null; renderImportPreview(); }
      else if (act === 'paste-preview') run(prepareImport(els.importText.value, 'Pasted'));
      else if (act === 'export') exportCsv();
    });

    if (els.search) els.search.addEventListener('input', function () { query = els.search.value.trim(); renderList(); });
    if (els.niche) els.niche.addEventListener('change', function () { nicheFilter = els.niche.value; renderList(); });
    if (els.importFile) els.importFile.addEventListener('change', function () {
      var file = els.importFile.files && els.importFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () { run(prepareImport(String(reader.result || ''), file.name.replace(/\.[^.]+$/, ''))); };
      reader.readAsText(file);
    });
    if (els.addForm) els.addForm.addEventListener('submit', function (e) { e.preventDefault(); run(addOne(els.addForm)); });
  }

  function cache() {
    els = {
      root: document.getElementById('prospects-root'),
      status: document.getElementById('prospects-status'),
      score: document.getElementById('prospects-score'),
      filters: document.getElementById('prospects-filters'),
      niche: document.getElementById('prospects-niche'),
      search: document.getElementById('prospects-search'),
      list: document.getElementById('prospects-list'),
      importFile: document.getElementById('prospects-import-file'),
      importText: document.getElementById('prospects-import-text'),
      importCity: document.getElementById('prospects-import-city'),
      importList: document.getElementById('prospects-import-list'),
      importPreview: document.getElementById('prospects-import-preview'),
      addForm: document.getElementById('prospects-add-form')
    };
  }

  var opening = null;

  function open() {
    if (unsub) return Promise.resolve();
    if (!opening) opening = openOnce().then(function () { opening = null; }, function () { opening = null; });
    return opening;
  }

  async function openOnce() {
    cache();
    if (!els.root) return;
    bind();
    status('Loading prospects…');
    if (!(await waitReady(30000))) {
      status('Could not reach your prospects — make sure you’re signed in, then reopen this tab.', true);
      return;
    }
    subscribe();
  }

  global.CWR_PROSPECTS = {
    open: open,
    logTouch: function (id, kind, note) { return byId[id] ? logTouch(id, kind, note) : Promise.resolve(); },
    linkLead: linkLead,
    get: function (id) { return byId[id] || null; },
    _test: {
      parseTable: parseTable, rowsToProspects: rowsToProspects, dedupe: dedupe, applyOutcome: applyOutcome,
      isDue: isDue, sortProspects: sortProspects, scoreboard: scoreboard, toCsv: toCsv, dateKey: dateKey, addDays: addDays
    }
  };

  // The admin can reopen straight onto this tab before this file loads.
  var panel = typeof document !== 'undefined' && document.getElementById('admin-panel-prospects');
  if (panel && !panel.hidden) open();
})(typeof window !== 'undefined' ? window : globalThis);
