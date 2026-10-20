/**
 * Admin → Testimonials → Social proof. Lists socialProof entries (public) with
 * their socialProofDetails (admin-only), edits them in a numbered drawer, and
 * opens a Results check-in email in Compose. Pure rules live in social-proof.js.
 * While the database list is empty the built-in clients show; the first save
 * copies all of them in, so their order survives.
 */
(function (global) {
  'use strict';

  var SP = global.SocialProof;
  var doc = global.document;
  var els = {};
  var rows = [];
  var bound = false;
  var loading = null;
  // Only true after a read succeeded. A failed read shows the built-ins, and
  // saving from them would copy them over whatever is really in the database.
  var loadedOk = false;
  var testimonials = [];
  var testimonialsOk = true;

  // ── pure helpers (tested in scripts/test-social-proof-admin.mjs) ──

  function rowsFrom(pubVal, detVal) {
    var pub = pubVal && typeof pubVal === 'object' ? pubVal : {};
    var det = detVal && typeof detVal === 'object' ? detVal : {};
    var ids = Object.keys(pub);
    if (!ids.length) {
      return SP.BUILT_IN.map(function (b) {
        return { id: b.id, entry: SP.sanitizeEntry(b), details: SP.sanitizeDetails({}), builtIn: true };
      });
    }
    return ids
      .map(function (id) {
        return { id: id, entry: SP.sanitizeEntry(pub[id]), details: SP.sanitizeDetails(det[id]), builtIn: false };
      })
      .sort(function (a, b) { return a.entry.order - b.entry.order; });
  }

  /** One multi-path update: the public entry and its private details together. */
  function writePaths(id, entry, details) {
    var out = {};
    out['socialProof/' + id] = entry;
    out['socialProofDetails/' + id] = details;
    return out;
  }

  /** Saving while the built-ins show copies every row, in its current order. */
  function builtInCopyPaths(list, now) {
    var out = {};
    list.forEach(function (r) {
      var entry = SP.sanitizeEntry(Object.assign({}, r.entry, { updatedAt: now }));
      var details = SP.sanitizeDetails(Object.assign({}, r.details, { createdAt: r.details.createdAt || now }));
      Object.assign(out, writePaths(r.id, entry, details));
    });
    return out;
  }

  /** Rows with one moved by delta, orders renumbered 10, 20, 30… */
  function reorder(list, index, delta) {
    var next = list.slice();
    var to = index + delta;
    if (to >= 0 && to < next.length) {
      var moved = next.splice(index, 1)[0];
      next.splice(to, 0, moved);
    }
    return next.map(function (r, i) {
      return Object.assign({}, r, { entry: Object.assign({}, r.entry, { order: (i + 1) * 10 }) });
    });
  }

  function deletePaths(id) {
    var out = {};
    out['socialProof/' + id] = null;
    out['socialProofDetails/' + id] = null;
    return out;
  }

  function confirmDeleteText(row, list) {
    var text = 'Delete “' + row.entry.client + '” from social proof? This can’t be undone.';
    var others = list.filter(function (r) { return r.id !== row.id && !r.builtIn; });
    if (!others.length) text += '\n\nIt’s the last entry, so the built-in clients will show again on the homepage. To hide the section instead, turn off “Show on the homepage”.';
    return text;
  }

  function checkInEmail(entry) {
    return {
      subject: 'Quick check-in on ' + entry.client,
      message:
        'Hi,\n\n' +
        'I hope everything’s running smoothly. Quick question for my records: since launch, has anything measurable changed, like orders, calls, bookings, or time saved?\n\n' +
        'A rough number is perfect, and I’ll only share it on my site with your OK.\n\n' +
        'Thanks,\nRuben'
    };
  }

  /** Public testimonial fields only; private answers are never read here. */
  function testimonialFromDoc(id, d) {
    var x = d || {};
    var c = x.createdAt;
    var ms = c && typeof c.toMillis === 'function' ? c.toMillis() : (c && c.seconds ? c.seconds * 1000 : Number(c) || 0);
    return {
      id: id,
      name: String(x.name || '').trim(),
      title: String(x.title || '').trim(),
      company: String(x.company || '').trim(),
      text: String(x.text || ''),
      rating: Math.max(0, Math.min(5, parseInt(x.rating, 10) || 0)),
      hidden: x.hidden === true,
      createdMs: ms
    };
  }

  /** Use a testimonial: their words as the quote, who said it as the bottom line. */
  function prefillFromTestimonial(t) {
    return { summary: SP.quoteFromText(t.text), tagline: SP.creditFromTestimonial(t) };
  }

  /**
   * Use a testimonial on an existing entry. If the entry shows a number, only the quote is
   * filled: the bottom line sits under the number, and a person's name there would read as
   * if they reported it.
   */
  function testimonialPrefillFor(entry, t) {
    var pre = prefillFromTestimonial(t);
    return entry && entry.stat ? { summary: pre.summary } : pre;
  }

  /** Use an Outcome: its first paragraph as the quote; the bottom line stays. */
  function prefillFromOutcome(p) {
    // Links the project too, so a card matched by name gets a real link on Save.
    return { summary: SP.quoteFromText(p.outcome), projectId: p.id };
  }

  function newEntryFromTestimonial(t) {
    return Object.assign({ client: String(t.company || t.name || '').trim(), published: false }, prefillFromTestimonial(t));
  }

  function newEntryFromOutcome(p) {
    return Object.assign({ client: String(p.title || '').trim(), projectId: p.id, published: false }, prefillFromOutcome(p));
  }

  // ── DOM ──

  function $(id) { return doc.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cache() {
    els = {
      panel: $('admin-panel-social-proof'),
      unused: $('admin-social-proof-unused'),
      unusedList: $('admin-social-proof-unused-list'),
      numberNote: $('social-proof-number-note'),
      list: $('admin-social-proof-list'),
      status: $('admin-social-proof-status'),
      add: $('admin-social-proof-add-btn'),
      modal: $('social-proof-modal'),
      form: $('social-proof-form'),
      title: $('social-proof-modal-title'),
      id: $('social-proof-id'),
      client: $('social-proof-client'),
      logo: $('social-proof-logo'),
      project: $('social-proof-project'),
      kind: $('social-proof-kind'),
      before: $('social-proof-before'),
      after: $('social-proof-after'),
      count: $('social-proof-count'),
      preview: $('social-proof-stat-preview'),
      label: $('social-proof-label'),
      source: $('social-proof-source'),
      asOf: $('social-proof-as-of'),
      launch: $('social-proof-launch'),
      note: $('social-proof-note'),
      summary: $('social-proof-summary'),
      tagline: $('social-proof-tagline'),
      published: $('social-proof-published'),
      del: $('social-proof-delete-btn'),
      errors: $('social-proof-errors'),
      checkin: $('social-proof-checkin-btn')
    };
  }

  function ready() {
    if (!global.rtdb || !global.rtdbRef || !global.rtdbGet || !global.rtdbUpdate || !global.rtdbPush) return false;
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

  function rootRef() { return global.rtdbRef(global.rtdb); }

  function status(msg, isError) {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.hidden = !msg;
    els.status.classList.toggle('is-error', !!isError);
  }

  function chipHtml(r) {
    var label = r.builtIn ? 'Built-in' : (r.entry.published ? 'Published' : 'Draft');
    var html = '<span class="admin-social-proof-chip is-' + label.toLowerCase().replace(/[^a-z]/g, '') + '">' + label + '</span>';
    if (!r.builtIn && SP.checkInDue(r.details, r.entry, new Date())) {
      html += '<span class="admin-social-proof-chip is-due">Check-in due</span>';
    }
    return html;
  }

  function projectsAll() {
    return Array.isArray(global.portfolioProjectsAll) ? global.portfolioProjectsAll : [];
  }

  function findTestimonial(id) {
    return testimonials.filter(function (t) { return t.id === id; })[0] || null;
  }

  function stars(n) {
    return n > 0 ? '<span class="admin-social-proof-stars" aria-label="' + n + ' of 5 stars">' + '★'.repeat(n) + '</span> ' : '';
  }

  function homepageBlock(e) {
    var line = e.stat
      ? '<strong>' + esc(e.stat) + '</strong> ' + esc(e.label)
      : (e.summary ? '“' + esc(e.summary) + '”' : '<span class="admin-social-proof-muted">No quote or number yet</span>');
    return '<div class="admin-social-proof-block">' +
      '<p class="admin-social-proof-kicker">Homepage</p>' +
      '<p class="admin-social-proof-text">' + line + '</p>' +
      '<p class="admin-social-proof-meta">' + esc(SP.metaLine(e, 'en')) + '</p>' +
      '</div>';
  }

  function outcomeBlock(p) {
    return '<div class="admin-social-proof-block">' +
      '<p class="admin-social-proof-kicker">Outcome · ' + esc(p.title || 'Project') + '</p>' +
      '<p class="admin-social-proof-text">' + esc(SP.quoteFromText(p.outcome)) + '</p>' +
      '<p class="admin-social-proof-block-actions">' +
        '<button type="button" class="btn btn-secondary" data-use-outcome>Use on homepage</button>' +
        '<button type="button" class="admin-social-proof-link" data-edit-project="' + esc(p.id) + '">Edit project</button>' +
      '</p></div>';
  }

  function testimonialBlock(t) {
    return '<div class="admin-social-proof-block">' +
      '<p class="admin-social-proof-kicker">Testimonial · ' + esc([t.name, t.title].filter(Boolean).join(', ')) + (t.hidden ? ' · Hidden' : '') + '</p>' +
      '<p class="admin-social-proof-text">' + stars(t.rating) + '“' + esc(SP.quoteFromText(t.text)) + '”</p>' +
      '<p class="admin-social-proof-block-actions">' +
        '<button type="button" class="btn btn-secondary" data-use-testimonial="' + esc(t.id) + '">Use on homepage</button>' +
        '<button type="button" class="admin-social-proof-link" data-open-testimonials>Open in Reviews</button>' +
      '</p></div>';
  }

  function render() {
    if (!els.list) return;
    var projects = projectsAll();
    els.list.innerHTML = rows.map(function (r, i) {
      var e = r.entry;
      var outcome = SP.outcomeFor(e, projects);
      var fromClient = SP.testimonialsFor(e, testimonials);
      return '<li class="admin-social-proof-row" data-index="' + i + '">' +
        '<div class="admin-social-proof-head">' +
          (e.logoUrl
            ? '<img class="admin-social-proof-logo" src="' + esc(e.logoUrl) + '" alt="">'
            : '<span class="admin-social-proof-logo is-empty" aria-hidden="true"></span>') +
          '<div class="admin-social-proof-main">' +
            '<p class="admin-social-proof-name">' + esc(e.client) + '</p>' +
            '<p class="admin-social-proof-chips">' + chipHtml(r) + '</p>' +
          '</div>' +
          '<div class="admin-social-proof-actions">' +
            '<button type="button" class="admin-social-proof-move" data-move="-1" aria-label="Move ' + esc(e.client) + ' up"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
            '<button type="button" class="admin-social-proof-move" data-move="1" aria-label="Move ' + esc(e.client) + ' down"' + (i === rows.length - 1 ? ' disabled' : '') + '>▼</button>' +
            '<button type="button" class="btn btn-secondary admin-social-proof-checkin" data-checkin>Check-in</button>' +
            '<button type="button" class="btn btn-secondary admin-social-proof-edit" data-edit>Edit</button>' +
            // Built-ins aren't saved yet, so there's nothing to delete.
            (r.builtIn ? '' : '<button type="button" class="admin-social-proof-delete" data-delete aria-label="Delete ' + esc(e.client) + '">Delete</button>') +
          '</div>' +
        '</div>' +
        '<div class="admin-social-proof-proof">' +
          homepageBlock(e) +
          (outcome ? outcomeBlock(outcome) : '') +
          fromClient.map(testimonialBlock).join('') +
        '</div></li>';
    }).join('');
    renderUnused(projects);
  }

  function renderUnused(projects) {
    if (!els.unusedList) return;
    var u = SP.unusedProof(rows.map(function (r) { return r.entry; }), testimonials, projects);
    var items = u.testimonials.map(function (t) {
      return '<li class="admin-social-proof-unused-item">' +
        '<p class="admin-social-proof-kicker">Testimonial · ' + esc([t.name, t.company].filter(Boolean).join(' · ')) + '</p>' +
        '<p class="admin-social-proof-text">' + stars(t.rating) + '“' + esc(SP.quoteFromText(t.text)) + '”</p>' +
        '<p class="admin-social-proof-block-actions"><button type="button" class="btn btn-secondary" data-add-testimonial="' + esc(t.id) + '">Add to homepage</button></p>' +
        '</li>';
    }).concat(u.outcomes.map(function (p) {
      return '<li class="admin-social-proof-unused-item">' +
        '<p class="admin-social-proof-kicker">Outcome · ' + esc(p.title || 'Project') + '</p>' +
        '<p class="admin-social-proof-text">' + esc(SP.quoteFromText(p.outcome)) + '</p>' +
        '<p class="admin-social-proof-block-actions"><button type="button" class="btn btn-secondary" data-add-outcome="' + esc(p.id) + '">Add to homepage</button></p>' +
        '</li>';
    }));
    els.unused.hidden = !items.length;
    els.unusedList.innerHTML = items.join('');
  }

  /** One read per load; a failure leaves the cards up without testimonials. */
  async function loadTestimonials() {
    if (!global.db || !global.getDocs || !global.collection) { testimonialsOk = false; return []; }
    try {
      var snap = await global.getDocs(global.collection(global.db, 'testimonials'));
      var list = [];
      snap.forEach(function (d) { list.push(testimonialFromDoc(d.id, d.data())); });
      testimonialsOk = true;
      return list;
    } catch (err) {
      console.warn('Testimonials load failed', err);
      testimonialsOk = false;
      return [];
    }
  }

  async function load() {
    if (loading) return loading;
    loading = (async function () {
      status('Loading social proof…');
      var testimonialsRead = loadTestimonials();
      var note = '';
      try {
        var both = await Promise.all([
          global.rtdbGet(global.rtdbRef(global.rtdb, 'socialProof')),
          global.rtdbGet(global.rtdbRef(global.rtdb, 'socialProofDetails'))
        ]);
        rows = rowsFrom(both[0].val(), both[1].val());
        loadedOk = true;
        note = rows[0] && rows[0].builtIn ? 'Showing the built-in clients. Your first save copies them into the database.' : '';
      } catch (err) {
        console.warn('Social proof load failed', err);
        rows = rowsFrom(null, null);
        loadedOk = false;
        note = 'Couldn’t read the social proof list (check your connection, or deploy the database rules). Saving is off until it loads, so reopen this tab.';
      }
      testimonials = await testimonialsRead;
      if (!testimonialsOk) note = (note ? note + ' ' : '') + 'Couldn’t load testimonials, so the cards show without them.';
      status(note, !loadedOk || !testimonialsOk);
      render();
    })();
    try { await loading; } finally { loading = null; }
  }

  async function write(paths) {
    await global.rtdbUpdate(rootRef(), paths);
  }

  var NOT_LOADED = 'Couldn’t read the social proof list, so nothing was saved. Check your connection, then reopen this tab.';

  /** Saving from the built-ins copies them in; only do that if the database list is still empty. */
  async function builtInsStillCurrent() {
    var snap = await global.rtdbGet(global.rtdbRef(global.rtdb, 'socialProof'));
    var val = snap.val();
    return !(val && typeof val === 'object' && Object.keys(val).length);
  }

  async function reloadBecauseChanged() {
    closeDrawer();
    await load();
    status('Your social proof list changed since this tab loaded, so nothing was saved. Make your edit again.', true);
  }

  // ── drawer ──

  function fillProjects(selected) {
    if (!els.project) return;
    var all = Array.isArray(global.portfolioProjectsAll) ? global.portfolioProjectsAll : [];
    els.project.innerHTML = '<option value="">None</option>' + all.map(function (p) {
      var isPublic = String(p.visibility || 'public').toLowerCase() !== 'private';
      return '<option value="' + esc(p.id) + '">' + esc(p.title || 'Untitled') + (isPublic ? '' : ' (client-only, no link)') + '</option>';
    }).join('');
    els.project.value = selected || '';
  }

  function readDetails() {
    return {
      kind: els.kind.value,
      before: els.before.value,
      after: els.after.value,
      count: els.count.value,
      launchDate: els.launch.value,
      note: els.note.value
    };
  }

  function readEntry() {
    return {
      client: els.client.value,
      logoUrl: els.logo.value,
      projectId: els.project.value,
      label: els.label.value,
      source: els.source.value,
      asOf: els.asOf.value,
      summary: els.summary.value,
      tagline: els.tagline.value,
      published: els.published.checked
    };
  }

  function syncKind() {
    var kind = els.kind.value;
    els.modal.querySelectorAll('[data-social-proof-kind]').forEach(function (n) {
      n.hidden = n.getAttribute('data-social-proof-kind') !== kind;
    });
    els.modal.querySelectorAll('[data-social-proof-has-number]').forEach(function (n) {
      n.hidden = kind === 'none';
    });
    var stat = SP.statFor(SP.sanitizeDetails(readDetails()));
    els.preview.hidden = !stat;
    els.preview.innerHTML = stat ? 'Shows on the homepage as <strong>' + esc(stat) + '</strong>' : '';
  }

  function showErrors(list) {
    els.errors.hidden = !list.length;
    els.errors.innerHTML = list.map(esc).join('<br>');
    // The box sits at the end of the scrolling body; bring it into view so Save doesn't look dead.
    // Focus moves to it too: Safari keeps a still-focused text field in view when the layout
    // changes, which would scroll the drawer back up and hide the message again.
    if (list.length) {
      els.errors.setAttribute('tabindex', '-1');
      if (els.errors.focus) els.errors.focus({ preventScroll: true });
      if (els.errors.scrollIntoView) els.errors.scrollIntoView({ block: 'nearest' });
    }
  }

  /** prefill (optional): fields from a testimonial or Outcome, applied over the entry. Nothing saves until Save. */
  function openDrawer(index, prefill) {
    var r = index != null ? rows[index] : null;
    var pre = prefill || {};
    els.form.reset();
    showErrors([]);
    els.id.value = r ? r.id : '';
    els.title.textContent = r ? 'Edit ' + r.entry.client : 'Add client';
    fillProjects(pre.projectId || (r ? r.entry.projectId : ''));
    if (r) {
      var e = r.entry;
      var d = r.details;
      els.client.value = e.client;
      els.logo.value = e.logoUrl;
      els.kind.value = d.kind;
      els.before.value = d.before == null ? '' : String(d.before);
      els.after.value = d.after == null ? '' : String(d.after);
      els.count.value = d.count;
      els.label.value = e.label;
      els.source.value = e.source;
      els.asOf.value = e.asOf;
      els.launch.value = d.launchDate;
      els.note.value = d.note;
      els.summary.value = e.summary;
      els.tagline.value = e.tagline;
      els.published.checked = e.published;
    }
    if (pre.client != null && !r) els.client.value = pre.client;
    if (pre.summary != null) els.summary.value = pre.summary;
    if (pre.tagline != null) els.tagline.value = pre.tagline;
    if (pre.published === false) els.published.checked = false;
    if (els.numberNote) els.numberNote.hidden = !(r && r.entry.stat);
    els.del.hidden = !r || r.builtIn;
    els.checkin.hidden = !r;
    syncKind();
    if (els.modal.parentElement !== doc.body) doc.body.appendChild(els.modal);
    els.modal.style.display = 'flex';
    els.modal.classList.add('active');
    els.client.focus({ preventScroll: true });
  }

  function closeDrawer() {
    els.modal.classList.remove('active');
    els.modal.style.display = 'none';
  }

  function currentRow() {
    var id = els.id.value;
    return rows.filter(function (r) { return r.id === id; })[0] || null;
  }

  async function save(ev) {
    ev.preventDefault();
    var row = currentRow();
    var now = Date.now();
    var details = SP.sanitizeDetails(Object.assign({}, row ? row.details : {}, readDetails()));
    var stat = SP.statFor(details);
    var raw = Object.assign({}, row ? row.entry : {}, readEntry(), { stat: stat, updatedAt: now });
    if (!row) raw.order = rows.length ? rows[rows.length - 1].entry.order + 10 : 10;
    if (!stat) { raw.label = ''; raw.source = ''; raw.asOf = ''; }
    var entry = SP.sanitizeEntry(raw);
    var errors = SP.validate(entry, details);
    if (errors.length) { showErrors(errors); return; }
    if (!loadedOk) { showErrors([NOT_LOADED]); return; }
    if (!details.createdAt) details.createdAt = now;

    var id = row ? row.id : global.rtdbPush(global.rtdbRef(global.rtdb, 'socialProof')).key;
    var others = rows.filter(function (r) { return r.id !== id; });
    var paths = rows.length && rows[0].builtIn ? builtInCopyPaths(others, now) : {};
    Object.assign(paths, writePaths(id, entry, details));
    try {
      if (rows.length && rows[0].builtIn && !(await builtInsStillCurrent())) {
        await reloadBecauseChanged();
        return;
      }
      await write(paths);
      closeDrawer();
      await load();
    } catch (err) {
      console.error('Social proof save failed', err);
      showErrors(['Couldn’t save. If this is the first save, deploy the database rules first.']);
    }
  }

  async function remove() {
    await removeRow(currentRow(), true);
  }

  /** Delete from the drawer, or straight from a card (fromDrawer false). Always confirms. */
  async function removeRow(row, fromDrawer) {
    if (!row || row.builtIn) return;
    var report = function (msg) { if (fromDrawer) showErrors([msg]); else status(msg, true); };
    if (!loadedOk) { report(NOT_LOADED); return; }
    if (!(await global.CwrUI.confirm({ title: 'Delete from social proof?', message: confirmDeleteText(row, rows), confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await write(deletePaths(row.id));
      if (fromDrawer) closeDrawer();
      await load();
    } catch (err) {
      console.error('Social proof delete failed', err);
      report('Couldn’t delete. Try again.');
    }
  }

  async function move(index, delta) {
    if (!loadedOk) { status(NOT_LOADED, true); return; }
    var next = reorder(rows, index, delta);
    var paths = {};
    if (rows[0] && rows[0].builtIn) {
      paths = builtInCopyPaths(next, Date.now());
    } else {
      next.forEach(function (r) { paths['socialProof/' + r.id + '/order'] = r.entry.order; });
    }
    try {
      if (rows[0] && rows[0].builtIn && !(await builtInsStillCurrent())) {
        await reloadBecauseChanged();
        return;
      }
      await write(paths);
      await load();
    } catch (err) {
      console.error('Social proof reorder failed', err);
      status('Couldn’t save the new order (deploy the database rules first).', true);
    }
  }

  function checkIn(row) {
    if (typeof global.openAdminClientEmailCompose !== 'function') return;
    var m = checkInEmail(row.entry);
    closeDrawer();
    global.openAdminClientEmailCompose({
      name: row.entry.client,
      email: '',
      link: '',
      templateId: 'outreach-script',
      portalButton: false,
      subject: m.subject,
      message: m.message
    });
  }

  function bind() {
    if (bound || !els.list || !els.modal) return;
    bound = true;
    els.add.addEventListener('click', function () { openDrawer(null); });
    els.list.addEventListener('click', function (ev) {
      var li = ev.target.closest('.admin-social-proof-row');
      if (!li) return;
      var i = Number(li.getAttribute('data-index'));
      var mv = ev.target.closest('[data-move]');
      if (mv && !mv.disabled) { move(i, Number(mv.getAttribute('data-move'))); return; }
      if (ev.target.closest('[data-checkin]')) { checkIn(rows[i]); return; }
      if (ev.target.closest('[data-delete]')) { removeRow(rows[i], false); return; }
      var useT = ev.target.closest('[data-use-testimonial]');
      if (useT) {
        var t = findTestimonial(useT.getAttribute('data-use-testimonial'));
        if (t) openDrawer(i, testimonialPrefillFor(rows[i].entry, t));
        return;
      }
      if (ev.target.closest('[data-use-outcome]')) {
        var p = SP.outcomeFor(rows[i].entry, projectsAll());
        if (p) openDrawer(i, prefillFromOutcome(p));
        return;
      }
      var ep = ev.target.closest('[data-edit-project]');
      if (ep) {
        if (typeof global.openPortfolioProjectEditor === 'function') global.openPortfolioProjectEditor(ep.getAttribute('data-edit-project'));
        return;
      }
      if (ev.target.closest('[data-open-testimonials]')) {
        var tab = doc.getElementById('admin-tab-testimonials');
        if (tab) tab.click();
        return;
      }
      if (ev.target.closest('[data-edit]')) openDrawer(i);
    });
    if (els.unusedList) {
      els.unusedList.addEventListener('click', function (ev) {
        var at = ev.target.closest('[data-add-testimonial]');
        if (at) {
          var t = findTestimonial(at.getAttribute('data-add-testimonial'));
          if (t) openDrawer(null, newEntryFromTestimonial(t));
          return;
        }
        var ao = ev.target.closest('[data-add-outcome]');
        if (ao) {
          var id = ao.getAttribute('data-add-outcome');
          var p = projectsAll().filter(function (x) { return x.id === id; })[0];
          if (p) openDrawer(null, newEntryFromOutcome(p));
        }
      });
    }
    els.form.addEventListener('submit', save);
    els.form.addEventListener('input', function (ev) {
      if (ev.target === els.before || ev.target === els.after || ev.target === els.count) syncKind();
    });
    els.kind.addEventListener('change', syncKind);
    els.del.addEventListener('click', remove);
    els.checkin.addEventListener('click', function () { var r = currentRow(); if (r) checkIn(r); });
    els.modal.querySelectorAll('[data-social-proof-close]').forEach(function (n) {
      n.addEventListener('click', closeDrawer);
    });
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && els.modal.classList.contains('active')) closeDrawer();
    });
  }

  async function open() {
    cache();
    if (!els.list) return;
    bind();
    status('Loading social proof…');
    if (!(await waitReady(30000))) {
      status('Couldn’t reach the database. Make sure you’re signed in, then reopen this tab.', true);
      return;
    }
    await load();
  }

  global.CWR_SOCIAL_PROOF = {
    open: open,
    _test: {
      rowsFrom: rowsFrom,
      writePaths: writePaths,
      builtInCopyPaths: builtInCopyPaths,
      reorder: reorder,
      checkInEmail: checkInEmail,
      confirmDeleteText: confirmDeleteText,
      deletePaths: deletePaths,
      testimonialFromDoc: testimonialFromDoc,
      testimonialPrefillFor: testimonialPrefillFor,
      prefillFromTestimonial: prefillFromTestimonial,
      prefillFromOutcome: prefillFromOutcome,
      newEntryFromTestimonial: newEntryFromTestimonial,
      newEntryFromOutcome: newEntryFromOutcome
    }
  };

  // The admin can reopen straight onto this tab before this file loads.
  var panel = doc && doc.getElementById('admin-panel-social-proof');
  if (panel && !panel.hidden) open();
})(typeof window !== 'undefined' ? window : globalThis);
