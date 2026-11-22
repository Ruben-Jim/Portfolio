/**
 * Admin → Link Tree. Picks what /linktree shows; nothing is copied:
 *  - What it costs: which 3 packages + Most popular → /agencyPricing/linktree.
 *    Prices and sales stay in the Pricing tab.
 *  - What clients say: a Link Tree switch per review (testimonials.linktree,
 *    its own Firestore rule). Reviews are edited in the Reviews tab.
 *  - Recent work: every portfolio project with a Show switch and order arrows
 *    (portfolioProjects.linktree / linktreeOrder). Tapping one opens the
 *    Portfolio project editor right here.
 * Pure rules live in linktree-work.js (scripts/test-linktree-work.mjs).
 */
(function (global) {
  'use strict';

  var W = global.LinktreeWork;
  var doc = global.document;
  var els = {};
  var bound = false;
  var busy = false;
  var reviews = [];
  var reviewsOk = true;
  var settings = null;

  function $(id) { return doc.getElementById(id); }

  function cache() {
    els.panel = $('admin-panel-linktree');
    els.status = $('admin-linktree-status');
    els.cards = $('admin-linktree-cards');
    els.reviews = $('admin-linktree-reviews');
    els.reviewsHint = $('admin-linktree-reviews-hint');
    els.shown = $('admin-linktree-work-shown');
    els.hidden = $('admin-linktree-work-hidden');
  }

  function toast(msg, tone) {
    if (global.CwrUI && typeof global.CwrUI.toast === 'function') global.CwrUI.toast(msg, { tone: tone || 'success' });
  }

  function status(msg, isError) {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.hidden = !msg;
    els.status.classList.toggle('is-error', !!isError);
  }

  function ready() {
    if (!global.rtdb || !global.rtdbRef || !global.rtdbGet || !global.rtdbUpdate) return false;
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

  function el(tag, className, text) {
    var n = doc.createElement(tag);
    if (className) n.className = className;
    if (text) n.textContent = text;
    return n;
  }

  /** A switch matching the admin's custom-switch look. */
  function switchEl(checked, label, onChange) {
    var wrap = el('label', 'admin-linktree-switch');
    var input = el('input', 'custom-switch-input');
    input.type = 'checkbox';
    input.checked = !!checked;
    input.setAttribute('aria-label', label);
    wrap.appendChild(input);
    var knob = el('span', 'custom-switch');
    knob.setAttribute('aria-hidden', 'true');
    wrap.appendChild(knob);
    input.addEventListener('change', function () { onChange(input.checked, input); });
    return wrap;
  }

  function knownPackages() {
    var PP = global.PackagePricing;
    return PP && PP.PACKAGES ? PP.PACKAGES : [];
  }

  function money(n) {
    return global.CarePricing && global.CarePricing.money ? global.CarePricing.money(n) : '$' + n;
  }

  // ── What it costs ──

  function renderCards() {
    if (!els.cards) return;
    var pkgs = knownPackages();
    var s = settings || W.normalizeSettings(null, pkgs.map(function (p) { return p.id; }));
    var PP = global.PackagePricing;
    els.cards.replaceChildren();
    s.packages.forEach(function (id, i) {
      var box = el('div', 'admin-linktree-card' + (s.popular === id ? ' is-popular' : ''));
      var lab = el('label', 'admin-linktree-card-label', 'Card ' + (i + 1));
      var sel = el('select', 'form-input admin-linktree-select');
      sel.id = 'admin-linktree-card-' + i;
      lab.htmlFor = sel.id;
      pkgs.forEach(function (p) {
        var o = el('option', '', p.name + ' — ' + (PP ? PP.regularLabel(p) : money(p.price)));
        o.value = p.id;
        if (p.id === id) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        var next = s.packages.slice();
        var other = next.indexOf(sel.value);
        // Picking a package another card shows swaps the two.
        if (other >= 0 && other !== i) next[other] = next[i];
        next[i] = sel.value;
        var popular = s.popular === next[i] || next.indexOf(s.popular) >= 0 ? s.popular : '';
        saveSettings({ packages: next, popular: popular });
      });
      box.appendChild(lab);
      box.appendChild(sel);
      var offer = PP && PP.activeOffer ? PP.activeOffer(id) : null;
      if (offer) box.appendChild(el('p', 'admin-linktree-card-sale', 'On sale: ' + money(offer.price)));
      var pop = el('label', 'admin-linktree-popular');
      var radio = el('input');
      radio.type = 'radio';
      radio.name = 'admin-linktree-popular';
      radio.checked = s.popular === id;
      radio.addEventListener('change', function () { if (radio.checked) saveSettings({ packages: s.packages, popular: id }); });
      pop.appendChild(radio);
      pop.appendChild(doc.createTextNode(' Most popular'));
      box.appendChild(pop);
      els.cards.appendChild(box);
    });
    var none = el('label', 'admin-linktree-popular admin-linktree-popular--none');
    var r0 = el('input');
    r0.type = 'radio';
    r0.name = 'admin-linktree-popular';
    r0.checked = !s.popular;
    r0.addEventListener('change', function () { if (r0.checked) saveSettings({ packages: s.packages, popular: '' }); });
    none.appendChild(r0);
    none.appendChild(doc.createTextNode(' No “Most popular” tag'));
    els.cards.appendChild(none);
  }

  async function loadSettings() {
    try {
      var snap = await global.rtdbGet(global.rtdbRef(global.rtdb, 'agencyPricing/linktree'));
      settings = W.normalizeSettings(snap && snap.val(), knownPackages().map(function (p) { return p.id; }));
    } catch (err) {
      console.warn('Link Tree settings load failed', err);
      settings = W.normalizeSettings(null, knownPackages().map(function (p) { return p.id; }));
    }
  }

  async function saveSettings(next) {
    var clean = W.normalizeSettings(next, knownPackages().map(function (p) { return p.id; }));
    try {
      await global.rtdbUpdate(global.rtdbRef(global.rtdb, 'agencyPricing'), {
        linktree: { packages: clean.packages, popular: clean.popular, updatedAt: Date.now() }
      });
      settings = clean;
      toast('Link Tree cards saved.');
    } catch (err) {
      console.error(err);
      toast('Couldn’t save the cards: ' + (err.message || 'try again'), 'error');
    }
    renderCards();
  }

  // ── What clients say ──

  async function loadReviews() {
    if (!global.db || !global.getDocs || !global.collection) { reviewsOk = false; reviews = []; return; }
    try {
      var snap = await global.getDocs(global.collection(global.db, 'testimonials'));
      var list = [];
      snap.forEach(function (d) { list.push({ id: d.id, data: d.data() || {} }); });
      list.sort(function (a, b) { return W.millis(b.data.createdAt) - W.millis(a.data.createdAt); });
      reviews = list;
      reviewsOk = true;
    } catch (err) {
      console.warn('Reviews load failed', err);
      reviewsOk = false;
      reviews = [];
    }
  }

  function renderReviews() {
    if (!els.reviews) return;
    els.reviews.replaceChildren();
    if (!reviewsOk) {
      els.reviews.appendChild(el('li', 'admin-linktree-empty', 'Couldn’t load reviews. Reopen this tab to try again.'));
      return;
    }
    if (!reviews.length) {
      els.reviews.appendChild(el('li', 'admin-linktree-empty', 'No reviews yet.'));
      return;
    }
    var onPage = W.reviewsFor(reviews).map(function (x) { return x.id; });
    var picked = reviews.filter(function (x) { return x.data.linktree === true && x.data.hidden !== true; }).length;
    if (els.reviewsHint) {
      els.reviewsHint.textContent = picked
        ? 'Switch on up to 3. ' + picked + ' on.'
        : 'Switch on up to 3. None on, so the 2 newest show.';
    }
    reviews.forEach(function (r) {
      var d = r.data;
      var li = el('li', 'admin-linktree-row' + (onPage.indexOf(r.id) >= 0 ? ' is-on-page' : ''));
      var main = el('div', 'admin-linktree-main');
      var title = el('p', 'admin-linktree-name', d.name || 'Client');
      var stars = Math.max(0, Math.min(5, Math.round(Number(d.rating) || 0)));
      if (stars) title.appendChild(el('span', 'admin-linktree-stars', ' ' + '★'.repeat(stars)));
      main.appendChild(title);
      main.appendChild(el('p', 'admin-linktree-meta admin-linktree-quote', String(d.text || '').trim()));
      var tags = [];
      if (d.hidden === true) tags.push('Off the site (Reviews tab)');
      else if (onPage.indexOf(r.id) >= 0 && d.linktree !== true) tags.push('Showing as one of the 2 newest');
      if (tags.length) main.appendChild(el('p', 'admin-linktree-meta admin-linktree-note', tags.join(' · ')));
      li.appendChild(main);
      var sw = switchEl(d.linktree === true, 'Show ' + (d.name || 'review') + ' on the Link Tree', function (on, input) {
        setReview(r, on, input);
      });
      if (d.hidden === true) sw.querySelector('input').disabled = true;
      li.appendChild(sw);
      els.reviews.appendChild(li);
    });
  }

  async function setReview(r, on, input) {
    var picked = reviews.filter(function (x) { return x.data.linktree === true && x.data.hidden !== true; }).length;
    if (on && picked >= W.MAX_REVIEWS) {
      input.checked = false;
      toast('Up to ' + W.MAX_REVIEWS + ' reviews show. Switch one off first.', 'info');
      return;
    }
    input.disabled = true;
    try {
      await global.updateDoc(global.doc(global.db, 'testimonials', r.id), { linktree: on });
      r.data.linktree = on;
      toast(on ? 'Review shows on the Link Tree.' : 'Review removed from the Link Tree.');
    } catch (err) {
      console.error(err);
      input.checked = !on;
      var denied = err && /permission/i.test(String(err.code || err.message));
      toast(denied ? 'Not allowed yet: deploy the Firestore rules first.' : 'Couldn’t save: ' + (err.message || 'try again'), 'error');
    }
    input.disabled = false;
    renderReviews();
  }

  // ── Recent work ──

  function projects() {
    return Array.isArray(global.portfolioProjectsAll) ? global.portfolioProjectsAll : [];
  }

  function projectRow(r, shownRows, index) {
    var li = el('li', 'admin-linktree-row admin-linktree-row--work' + (r.overCap ? ' is-over-cap' : ''));
    var open = el('button', 'admin-linktree-open');
    open.type = 'button';
    open.setAttribute('aria-label', 'Edit ' + r.title);
    var thumb = el('span', 'admin-linktree-thumb');
    if (r.thumb) {
      var img = el('img');
      img.src = r.thumb; img.alt = ''; img.loading = 'lazy'; img.width = 40; img.height = 40;
      thumb.appendChild(img);
    } else {
      thumb.textContent = r.title.charAt(0).toUpperCase();
    }
    open.appendChild(thumb);
    var main = el('span', 'admin-linktree-main');
    main.appendChild(el('span', 'admin-linktree-name', r.title));
    var meta = [r.badge === 'template' ? 'Template' : 'Live'];
    if (r.parentTitle) meta.push('Build of ' + r.parentTitle);
    if (r.isPrivate) meta.push('Private');
    if (r.overCap) meta.push('Over the 6 limit, not shown');
    main.appendChild(el('span', 'admin-linktree-meta', meta.join(' · ')));
    open.appendChild(main);
    open.addEventListener('click', function () { openEditor(r.id); });
    li.appendChild(open);
    if (shownRows) {
      var arrows = el('span', 'admin-linktree-arrows');
      [['chevron-up-outline', -1, 'Move up'], ['chevron-down-outline', 1, 'Move down']].forEach(function (a) {
        var b = el('button', 'admin-linktree-arrow');
        b.type = 'button';
        b.setAttribute('aria-label', a[2] + ': ' + r.title);
        b.disabled = (a[1] < 0 && index === 0) || (a[1] > 0 && index === shownRows.length - 1);
        var icon = el('ion-icon');
        icon.setAttribute('name', a[0]);
        icon.setAttribute('aria-hidden', 'true');
        b.appendChild(icon);
        b.addEventListener('click', function () { move(shownRows, index, a[1]); });
        arrows.appendChild(b);
      });
      li.appendChild(arrows);
    }
    li.appendChild(switchEl(!!shownRows, 'Show ' + r.title + ' on the Link Tree', function (on, input) {
      setProject(r, on, input);
    }));
    return li;
  }

  function renderWork() {
    if (!els.shown || !els.hidden) return;
    var rows = W.adminRows(projects());
    els.shown.replaceChildren();
    els.hidden.replaceChildren();
    if (!rows.shown.length) els.shown.appendChild(el('li', 'admin-linktree-empty', 'Nothing switched on, so the Link Tree shows its built-in cards.'));
    rows.shown.forEach(function (r, i) { els.shown.appendChild(projectRow(r, rows.shown, i)); });
    if (!rows.hidden.length) els.hidden.appendChild(el('li', 'admin-linktree-empty', 'Every project is shown.'));
    rows.hidden.forEach(function (r) { els.hidden.appendChild(projectRow(r, null, -1)); });
  }

  async function reloadProjects() {
    if (typeof global.loadPortfolioProjectsFromRtdb === 'function') await global.loadPortfolioProjectsFromRtdb();
    renderWork();
  }

  async function writeProjects(patches) {
    var flat = {};
    Object.keys(patches).forEach(function (id) {
      Object.keys(patches[id]).forEach(function (k) { flat['portfolioProjects/' + id + '/' + k] = patches[id][k]; });
    });
    await global.rtdbUpdate(global.rtdbRef(global.rtdb), flat);
  }

  async function setProject(r, on, input) {
    if (busy) { input.checked = !on; return; }
    var rows = W.adminRows(projects());
    if (on && rows.shown.length >= W.MAX_ITEMS) {
      input.checked = false;
      toast('Up to ' + W.MAX_ITEMS + ' projects show. Switch one off first.', 'info');
      return;
    }
    busy = true;
    input.disabled = true;
    try {
      // If Portfolio fell back to its built-in list, these ids aren't in the database:
      // writing would create a stub project. Only switch real records.
      var exists = await global.rtdbGet(global.rtdbRef(global.rtdb, 'portfolioProjects/' + r.id + '/title'));
      if (!exists || !exists.exists()) throw new Error('this project isn’t saved in the database yet');
      var patch = {};
      patch[r.id] = W.togglePatch(rows.shown, on);
      await writeProjects(patch);
      toast(on ? r.title + ' shows on the Link Tree.' : r.title + ' removed from the Link Tree.');
    } catch (err) {
      console.error(err);
      input.checked = !on;
      toast('Couldn’t save: ' + (err.message || 'try again'), 'error');
    }
    busy = false;
    await reloadProjects();
  }

  async function move(shownRows, index, delta) {
    if (busy) return;
    var orders = W.movePatches(shownRows, index, delta);
    var ids = Object.keys(orders);
    if (!ids.length) return;
    busy = true;
    try {
      var patches = {};
      ids.forEach(function (id) { patches[id] = { linktreeOrder: orders[id] }; });
      await writeProjects(patches);
    } catch (err) {
      console.error(err);
      toast('Couldn’t reorder: ' + (err.message || 'try again'), 'error');
    }
    busy = false;
    await reloadProjects();
  }

  /** The Portfolio project editor, opened over this tab. */
  function openEditor(id) {
    var project = projects().filter(function (p) { return p.id === id; })[0];
    if (!project || typeof global.openPortfolioProjectModal !== 'function') {
      toast('Couldn’t open that project. Try the Portfolio tab.', 'info');
      return;
    }
    global.openPortfolioProjectModal(false, project);
  }

  // ── Tab ──

  function bind() {
    if (bound) return;
    bound = true;
    if (els.panel) {
      els.panel.querySelectorAll('[data-linktree-goto]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (typeof global.adminActivateTab === 'function') global.adminActivateTab(b.getAttribute('data-linktree-goto'));
        });
      });
    }
    // The editor saves, Pricing changes: keep the lists current.
    doc.addEventListener('portfolioProjectsLoaded', function () { if (els.panel && !els.panel.hidden) renderWork(); });
    if (global.CarePricing && typeof global.CarePricing.onChange === 'function') {
      global.CarePricing.onChange(function () { if (els.panel && !els.panel.hidden) renderCards(); });
    }
  }

  async function open() {
    cache();
    if (!els.panel || !W) return;
    bind();
    status('Loading…');
    if (!(await waitReady(30000))) {
      status('Couldn’t reach the database. Make sure you’re signed in, then reopen this tab.', true);
      return;
    }
    if (global.PackagePricing && typeof global.PackagePricing.load === 'function') {
      try { await global.PackagePricing.load(); } catch (e) { /* defaults */ }
    }
    await Promise.all([loadSettings(), loadReviews(), projects().length ? Promise.resolve() : reloadProjects()]);
    status('');
    renderCards();
    renderReviews();
    renderWork();
  }

  global.CWR_LINKTREE = { open: open };

  // Opened before this file loaded (a restored session on this tab).
  var panel = doc && doc.getElementById('admin-panel-linktree');
  if (panel && !panel.hidden) open();
})(typeof window !== 'undefined' ? window : this);
