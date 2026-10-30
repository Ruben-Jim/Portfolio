/**
 * Admin → Reviews. One list of everything clients have said: form testimonials,
 * reviews Ruben adds from an email, and Google reviews he copies in by hand.
 * Each has an "On site" switch (`hidden` on the testimonials doc).
 * loadTestimonialAdminPanel (script.js) fetches and caches, then calls renderList.
 * Rows keep the old data-* hooks, so View questionnaire / Delete link / Remove
 * still run through script.js. Pure rules are exposed as CWR_REVIEWS._test.
 */
(function (global) {
  'use strict';

  var doc = global.document;
  var LIMITS = { name: 120, title: 120, company: 160, product: 200, text: 5000, reviewUrl: 500 };
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  // ── pure rules ──

  function str(v) {
    return v == null ? '' : String(v);
  }

  function msOf(c) {
    if (!c) return 0;
    if (typeof c.toMillis === 'function') return c.toMillis();
    if (typeof c.getTime === 'function') return c.getTime();
    if (typeof c.seconds === 'number') return c.seconds * 1000;
    return Number(c) || 0;
  }

  function sourceOf(d) {
    var s = d && d.source;
    return s === 'email' || s === 'google' ? s : 'form';
  }

  function starsOf(v) {
    var n = parseInt(v, 10);
    return n >= 1 && n <= 5 ? n : 0;
  }

  /** Testimonials (newest first) plus invites still waiting on the client. */
  function buildRows(tokens, testimonials) {
    var tokenById = {};
    (tokens || []).forEach(function (t) { tokenById[t.id] = t.data || {}; });
    var answered = {};
    var rows = (testimonials || []).map(function (t) {
      var d = t.data || {};
      var tokenId = typeof d.token === 'string' ? d.token : '';
      var invite = tokenId ? tokenById[tokenId] || {} : {};
      if (tokenId) answered[tokenId] = true;
      return {
        kind: sourceOf(d),
        id: t.id,
        tokenId: tokenId,
        name: str(d.name).trim() || str(invite.name).trim(),
        email: str(invite.email).trim(),
        product: str(d.product).trim() || str(invite.product).trim(),
        text: str(d.text),
        rating: starsOf(d.rating),
        shown: d.hidden !== true,
        createdMs: msOf(d.createdAt),
        reviewUrl: sourceOf(d) === 'google' ? str(d.reviewUrl) : '',
        data: d
      };
    });
    (tokens || []).forEach(function (t) {
      var d = t.data || {};
      // A used invite whose testimonial was removed has nothing left to show.
      if (answered[t.id] || d.used === true) return;
      rows.push({
        kind: 'waiting',
        id: '',
        tokenId: t.id,
        name: str(d.name).trim(),
        email: str(d.email).trim(),
        product: str(d.product).trim(),
        text: '',
        rating: 0,
        shown: false,
        createdMs: msOf(d.createdAt),
        reviewUrl: '',
        data: d
      });
    });
    rows.sort(function (a, b) { return b.createdMs - a.createdMs; });
    return rows;
  }

  function isOnSite(r) {
    return r.kind !== 'waiting' && r.shown;
  }

  function countRows(rows) {
    var c = { all: 0, onSite: 0, google: 0, waiting: 0 };
    rows.forEach(function (r) {
      c.all += 1;
      if (isOnSite(r)) c.onSite += 1;
      if (r.kind === 'google') c.google += 1;
      if (r.kind === 'waiting') c.waiting += 1;
    });
    return c;
  }

  function filterRows(rows, filter) {
    return rows.filter(function (r) {
      if (filter === 'on-site') return isOnSite(r);
      if (filter === 'google') return r.kind === 'google';
      if (filter === 'waiting') return r.kind === 'waiting';
      return true;
    });
  }

  function parseDateInput(value) {
    var m = DATE_RE.exec(str(value).trim());
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3], 12);
    // Rejects 2026-02-31 and the like (Date rolls them over).
    return d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
  }

  function dateInputValue(createdMs) {
    if (!createdMs) return '';
    var d = new Date(createdMs);
    if (isNaN(d.getTime())) return '';
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  /** The Add/Edit review form → { ok, fields } or { ok: false, error }. `now` is for tests. */
  function validateReview(input, now) {
    var i = input || {};
    var source = i.source === 'email' ? 'email' : 'google';
    var f = {
      source: source,
      name: str(i.name).trim(),
      title: str(i.title).trim(),
      company: str(i.company).trim(),
      product: str(i.product).trim(),
      text: str(i.text).trim()
    };
    if (!f.name) return { ok: false, error: 'Add their name.' };
    if (!f.text) return { ok: false, error: 'Add their words.' };
    var labels = { name: 'Their name', title: 'The job title', company: 'The business', product: 'The product', text: 'Their words' };
    for (var key in labels) {
      if (f[key].length > LIMITS[key]) return { ok: false, error: labels[key] + ' is too long.' };
    }
    var rating = starsOf(i.rating);
    if (source === 'google' && !rating) return { ok: false, error: 'Pick their stars. Every Google review has them.' };
    if (rating) f.rating = rating;
    var url = str(i.reviewUrl).trim();
    if (source === 'google' && url) {
      if (!/^https:\/\/\S+$/.test(url)) return { ok: false, error: 'The review link must start with https://' };
      if (url.length > LIMITS.reviewUrl) return { ok: false, error: 'The review link is too long.' };
      f.reviewUrl = url;
    }
    var date = str(i.date).trim();
    if (date) {
      var d = parseDateInput(date);
      if (!d) return { ok: false, error: 'Use a real date.' };
      // Compare days, not times: today is fine at 9 a.m. (a date is saved as noon).
      if (date > dateInputValue(now == null ? Date.now() : now)) return { ok: false, error: "Date posted can't be in the future." };
    }
    return { ok: true, fields: f };
  }

  /**
   * The whole document to write (setDoc replaces it on Edit). Keeps the photo,
   * the switch, and the original time unless the date was changed. Picking today
   * means "now", so it isn't saved as a later noon. With no createdAt here, the
   * caller adds serverTimestamp(). `now` is for tests.
   */
  function editPayload(existing, fields, dateInput, now) {
    var e = existing || null;
    var p = {
      source: fields.source,
      name: fields.name,
      title: fields.title || '',
      company: fields.company || '',
      product: fields.product || '',
      text: fields.text,
      avatar: (e && typeof e.avatar === 'string' && e.avatar) || 'avatar-1.png'
    };
    if (fields.rating) p.rating = fields.rating;
    if (fields.reviewUrl) p.reviewUrl = fields.reviewUrl;
    if (e && typeof e.hidden === 'boolean') p.hidden = e.hidden;
    var date = str(dateInput).trim();
    var unchanged = e && e.createdAt && date === dateInputValue(msOf(e.createdAt));
    var today = dateInputValue(now == null ? Date.now() : now);
    if (unchanged) p.createdAt = e.createdAt;
    else if (date && date !== today) p.createdAt = parseDateInput(date);
    else if (!date && e && e.createdAt) p.createdAt = e.createdAt;
    return p;
  }

  function googleAskEmail(row) {
    return {
      subject: 'A quick favor: your review on Google',
      message:
        'Hi ' + str(row.name).trim() + ',\n\n' +
        'Thank you again for your kind words. They mean a lot.\n\n' +
        'Would you be willing to post them on Google too? It helps other local businesses find me. ' +
        'Here’s what you wrote, so you can copy and paste it:\n\n' +
        '“' + str(row.text).trim() + '”\n\n' +
        'The button below opens my Google review page. It only takes a minute.\n\n' +
        'Thank you,\nRuben Jimenez\nCodeWithRuben'
    };
  }

  function inviteUrl(tokenId, origin) {
    return str(origin).replace(/\/$/, '') + '/review/' + encodeURIComponent(tokenId);
  }

  // ── the list ──

  var FILTERS = [
    { id: 'all', label: 'All', key: 'all' },
    { id: 'on-site', label: 'On site', key: 'onSite' },
    { id: 'google', label: 'Google', key: 'google' },
    { id: 'waiting', label: 'Waiting on', key: 'waiting' }
  ];
  var TAGS = { form: 'Testimonial form', email: 'Email', google: 'Google', waiting: 'Waiting on them' };
  var state = { rows: [], filter: 'all', container: null, editing: null };

  function esc(s) {
    return str(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function toast(msg, tone) {
    if (global.CwrUI) global.CwrUI.toast(msg, tone ? { tone: tone } : undefined);
  }

  function starsHtml(n) {
    return '<span class="admin-review-stars-on" aria-label="' + n + ' out of 5 stars">' +
      '★★★★★'.slice(0, n) + '<span class="admin-review-stars-off">' + '☆☆☆☆☆'.slice(0, 5 - n) + '</span></span>';
  }

  function dateLabel(ms) {
    return ms ? new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'earlier';
  }

  function findRow(id) {
    for (var i = 0; i < state.rows.length; i++) if (state.rows[i].id && state.rows[i].id === id) return state.rows[i];
    return null;
  }

  function btn(cls, attrs, label) {
    return '<button type="button" class="btn ' + cls + ' btn-sm" ' + attrs + '>' + label + '</button>';
  }

  function actionsHtml(r) {
    var id = esc(r.id);
    var tok = esc(r.tokenId);
    var ask = btn('btn-secondary', 'data-review-ask-google="' + id + '"', 'Ask for a Google review');
    var edit = btn('btn-secondary', 'data-review-edit="' + id + '"', 'Edit');
    // The photo picker lives in the questionnaire drawer (script.js).
    var photo = btn('btn-secondary', 'data-action="view-testimonial" data-view-testimonial="' + id + '"', 'Change photo');
    var remove = btn('btn-secondary admin-review-remove', 'data-delete-published-testimonial="' + id + '"', 'Remove');
    if (r.kind === 'waiting') {
      return btn('btn-primary', 'data-action="view-testimonial" data-view-testimonial-token="' + tok + '" data-view-invite-only="1"', 'View invite') +
        btn('btn-secondary', 'data-review-copy-link="' + tok + '"', 'Copy link') +
        btn('btn-secondary admin-review-remove', 'data-delete-testimonial-token="' + tok + '"', 'Delete link');
    }
    if (r.kind === 'form') {
      return btn('btn-primary', 'data-action="view-testimonial" data-view-testimonial="' + id + '"' + (tok ? ' data-view-testimonial-token="' + tok + '"' : ''), 'View questionnaire') +
        ask + remove;
    }
    if (r.kind === 'email') return ask + edit + photo + remove;
    var open = /^https:\/\//.test(r.reviewUrl)
      ? '<a class="btn btn-secondary btn-sm" data-review-open-google href="' + esc(r.reviewUrl) + '" target="_blank" rel="noopener">Open on Google</a>'
      : '';
    return open + edit + photo + remove;
  }

  function switchHtml(r) {
    return '<div class="admin-review-switch-wrap">' +
      '<button type="button" class="admin-review-switch" role="switch" aria-checked="' + (r.shown ? 'true' : 'false') + '"' +
        ' data-review-toggle="' + esc(r.id) + '" aria-label="Show ' + esc(r.name || 'this review') + ' on the site"' +
        (r.saving ? ' disabled' : '') + '></button>' +
      '<span class="admin-review-switch-label" aria-hidden="true">' + (r.shown ? 'On site' : 'Hidden') + '</span>' +
      '</div>';
  }

  function rowHtml(r) {
    var interactive = r.kind === 'form' || r.kind === 'waiting';
    var cls = 'admin-testimonial-combined-row admin-review-row' +
      (interactive ? ' admin-testimonial-combined-row--interactive' : '') +
      (r.kind !== 'waiting' && !r.shown ? ' is-hidden' : '');
    var attrs = (r.id ? ' data-testimonial-row="' + esc(r.id) + '"' : '') +
      (r.tokenId ? ' data-testimonial-token="' + esc(r.tokenId) + '"' : '');
    var text = r.text.length > 220 ? r.text.slice(0, 220) + '…' : r.text;
    var body = r.kind === 'waiting'
      ? '<p class="admin-review-quote">Link sent ' + esc(dateLabel(r.createdMs)) + ', not filled in yet.' +
        (r.email ? ' · ' + esc(r.email) : '') + '</p>'
      : '<p class="admin-review-stars">' + (r.rating ? starsHtml(r.rating) : '<span class="admin-review-nostars">No stars given</span>') + '</p>' +
        '<p class="admin-review-quote">“' + esc(text) + '”</p>';
    return '<div class="' + cls + '"' + attrs + '>' +
      '<div class="admin-testimonial-combined-main admin-review-main">' +
        '<p class="admin-review-name"><strong>' + esc(r.name || 'No name') + '</strong>' +
          '<span class="admin-review-src admin-review-src--' + r.kind + '">' + TAGS[r.kind] + '</span></p>' +
        body +
        '<div class="admin-review-actions">' + actionsHtml(r) + '</div>' +
      '</div>' +
      (r.kind === 'waiting' ? '' : switchHtml(r)) +
      '</div>';
  }

  function draw() {
    var c = state.container;
    if (!c) return;
    var counts = countRows(state.rows);
    var bar = doc.getElementById('admin-review-filters');
    if (bar) {
      bar.innerHTML = FILTERS.map(function (f) {
        var on = state.filter === f.id;
        return '<button type="button" class="admin-review-chip' + (on ? ' is-on' : '') + '" data-review-filter="' + f.id + '" aria-pressed="' + on + '">' +
          f.label + ' <span class="admin-review-chip-count">' + counts[f.key] + '</span></button>';
      }).join('');
    }
    var list = filterRows(state.rows, state.filter);
    c.innerHTML = list.length
      ? list.map(rowHtml).join('')
      : window.CwrUI.emptyHtml(state.rows.length
        ? { icon: 'filter-outline', title: 'Nothing in this filter', compact: true }
        : { icon: 'chatbox-ellipses-outline', title: 'No reviews or invites yet', text: 'Request a testimonial, or add a review.' });
  }

  function toggle(row) {
    if (!row || row.saving) return;
    if (!global.db || !global.updateDoc || !global.doc) {
      toast('Firestore is not ready.', 'error');
      return;
    }
    var next = !row.shown;
    row.shown = next;
    row.saving = true;
    draw();
    global.updateDoc(global.doc(global.db, 'testimonials', row.id), { hidden: !next }).then(function () {
      row.saving = false;
      row.data.hidden = !next;
      draw();
      if (typeof global.loadDynamicTestimonials === 'function') global.loadDynamicTestimonials();
    }, function (err) {
      console.error(err);
      row.shown = !next;
      row.saving = false;
      draw();
      global.CwrUI.toast("Couldn't change it. If this is the first time, deploy the Firestore rules.", { tone: 'error' });
    });
  }

  function askGoogle(row) {
    if (!row) return;
    if (!global.CWR_GOOGLE_REVIEW_URL) {
      toast('Add your Google review link to config.js first.', 'error');
      return;
    }
    if (typeof global.openAdminClientEmailCompose !== 'function') {
      toast('Compose is not ready yet. Try again in a moment.', 'error');
      return;
    }
    var mail = googleAskEmail(row);
    global.openAdminClientEmailCompose({
      name: row.name,
      email: row.email,
      link: global.CWR_GOOGLE_REVIEW_URL,
      templateId: 'outreach-script',
      portalButton: true,
      buttonLabel: 'Post on Google →',
      subject: mail.subject,
      message: mail.message
    });
  }

  function copyLink(tokenId) {
    var origin = str(global.PORTFOLIO_PUBLIC_ORIGIN).trim() || (global.location && global.location.origin) || '';
    var url = inviteUrl(tokenId, origin);
    var done = function () { toast('Link copied.', 'success'); };
    var fail = function () { if (global.CwrUI) global.CwrUI.toast('Couldn’t copy. The link is ' + url, { tone: 'error', duration: 9000 }); };
    if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
      global.navigator.clipboard.writeText(url).then(done, fail);
    } else {
      fail();
    }
  }

  function bindList(container) {
    if (container.dataset.reviewsBound) return;
    container.dataset.reviewsBound = '1';
    // View / Delete link / Remove stay with script.js's handler on the same list.
    container.addEventListener('click', function (e) {
      var t = e.target.closest('[data-review-toggle], [data-review-edit], [data-review-ask-google], [data-review-copy-link]');
      if (!t || !container.contains(t) || t.disabled) return;
      if (t.hasAttribute('data-review-toggle')) toggle(findRow(t.getAttribute('data-review-toggle')));
      else if (t.hasAttribute('data-review-edit')) openEdit(t.getAttribute('data-review-edit'));
      else if (t.hasAttribute('data-review-ask-google')) askGoogle(findRow(t.getAttribute('data-review-ask-google')));
      else copyLink(t.getAttribute('data-review-copy-link'));
    });
    var bar = doc.getElementById('admin-review-filters');
    if (bar && !bar.dataset.reviewsBound) {
      bar.dataset.reviewsBound = '1';
      bar.addEventListener('click', function (e) {
        var chip = e.target.closest('[data-review-filter]');
        if (!chip) return;
        state.filter = chip.getAttribute('data-review-filter');
        draw();
      });
    }
  }

  /** Called by loadTestimonialAdminPanel (script.js) with the fetched {id, data} rows. */
  function renderList(container, tokens, testimonials) {
    if (!container) return;
    state.container = container;
    state.rows = buildRows(tokens, testimonials);
    bindList(container);
    draw();
  }

  // ── Add / Edit review ──

  var m = null;

  function modal() {
    if (m) return m;
    var root = doc && doc.getElementById('admin-review-modal');
    if (!root) return null;
    var $ = function (id) { return doc.getElementById(id); };
    m = {
      root: root, form: $('admin-review-form'), heading: $('admin-review-heading'), source: $('admin-review-source'),
      name: $('admin-review-name'), title: $('admin-review-title'), company: $('admin-review-company'),
      product: $('admin-review-product'), text: $('admin-review-text'), rating: $('admin-review-rating'),
      ratingNone: $('admin-review-rating-none'), ratingHint: $('admin-review-rating-hint'),
      url: $('admin-review-url'), urlWrap: $('admin-review-url-wrap'), date: $('admin-review-date'),
      status: $('admin-review-status'), save: $('admin-review-save'),
      sources: root.querySelectorAll('[data-review-source]')
    };
    return m;
  }

  function setStatus(msg, isError) {
    m.status.textContent = msg || '';
    m.status.classList.toggle('is-error', !!isError);
  }

  function setSource(src) {
    m.source.value = src;
    Array.prototype.forEach.call(m.sources, function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-review-source') === src ? 'true' : 'false');
    });
    var google = src === 'google';
    m.urlWrap.hidden = !google;
    m.ratingNone.textContent = google ? 'Pick stars' : 'No rating';
    m.ratingHint.textContent = google ? '' : '(only if they gave a rating)';
  }

  function show() {
    m.date.max = dateInputValue(Date.now());
    setStatus('', false);
    m.root.hidden = false;
    m.name.focus();
  }

  function close() {
    if (m) m.root.hidden = true;
    state.editing = null;
  }

  function openAdd() {
    if (!modal()) return;
    state.editing = null;
    m.form.reset();
    Array.prototype.forEach.call(m.sources, function (b) { b.disabled = false; });
    setSource('google');
    m.heading.textContent = 'Add a review';
    m.save.textContent = 'Add review';
    show();
  }

  /** Only reviews Ruben added (email / Google) are edited here; form ones use View questionnaire. */
  function openEdit(id) {
    var row = findRow(id);
    if (!row || (row.kind !== 'email' && row.kind !== 'google') || !modal()) return;
    m.form.reset();
    state.editing = row;
    var d = row.data;
    setSource(row.kind);
    // The source can't change on an edit (the rules keep it fixed).
    Array.prototype.forEach.call(m.sources, function (b) { b.disabled = true; });
    m.name.value = str(d.name);
    m.title.value = str(d.title);
    m.company.value = str(d.company);
    m.product.value = str(d.product);
    m.text.value = str(d.text);
    m.rating.value = row.rating ? String(row.rating) : '';
    m.url.value = str(d.reviewUrl);
    m.date.value = dateInputValue(row.createdMs);
    m.heading.textContent = 'Edit review';
    m.save.textContent = 'Save';
    show();
  }

  function save(ev) {
    ev.preventDefault();
    var v = validateReview({
      source: m.source.value, name: m.name.value, title: m.title.value, company: m.company.value,
      product: m.product.value, text: m.text.value, rating: m.rating.value, reviewUrl: m.url.value, date: m.date.value
    });
    if (!v.ok) {
      setStatus(v.error, true);
      return;
    }
    if (!global.db || !global.doc || !global.collection || !global.addDoc || !global.setDoc || !global.serverTimestamp) {
      setStatus('Firestore is not ready.', true);
      return;
    }
    var editing = state.editing;
    var payload = editPayload(editing ? editing.data : null, v.fields, m.date.value);
    if (!payload.createdAt) payload.createdAt = global.serverTimestamp();
    m.save.disabled = true;
    setStatus(editing ? 'Saving…' : 'Adding…', false);
    var write = editing
      ? global.setDoc(global.doc(global.db, 'testimonials', editing.id), payload)
      : global.addDoc(global.collection(global.db, 'testimonials'), payload);
    Promise.resolve(write).then(function () {
      m.save.disabled = false;
      close();
      toast(editing ? 'Review saved.' : 'Review added.', 'success');
      if (typeof global.loadTestimonialAdminPanel === 'function') global.loadTestimonialAdminPanel();
      if (typeof global.loadDynamicTestimonials === 'function') global.loadDynamicTestimonials();
    }, function (err) {
      console.error(err);
      m.save.disabled = false;
      setStatus('Couldn’t save it. If this is the first one, deploy the Firestore rules first.', true);
    });
  }

  function bindModal() {
    var addBtn = doc && doc.getElementById('admin-review-add-btn');
    if (!addBtn || !modal() || m.form.dataset.reviewsBound) return;
    m.form.dataset.reviewsBound = '1';
    addBtn.addEventListener('click', openAdd);
    Array.prototype.forEach.call(m.sources, function (b) {
      b.addEventListener('click', function () {
        if (!b.disabled) setSource(b.getAttribute('data-review-source'));
      });
    });
    m.root.querySelectorAll('[data-review-close]').forEach(function (el) {
      el.addEventListener('click', close);
    });
    // On the document: Safari doesn't focus clicked buttons, so focus is often outside the form.
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !m.root.hidden) close();
    });
    m.form.addEventListener('submit', save);
  }

  bindModal();

  global.CWR_REVIEWS = {
    renderList: renderList,
    openAdd: openAdd,
    openEdit: openEdit,
    _test: {
      sourceOf: sourceOf,
      buildRows: buildRows,
      countRows: countRows,
      filterRows: filterRows,
      validateReview: validateReview,
      editPayload: editPayload,
      dateInputValue: dateInputValue,
      googleAskEmail: googleAskEmail,
      inviteUrl: inviteUrl,
      rowHtml: rowHtml
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
