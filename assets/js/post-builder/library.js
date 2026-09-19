/**
 * Post builder — library (lives in the admin tab): your designs, plus the
 * "New design" dialog: start from the services posts, a blank canvas, or a copy.
 */
import { FORMATS, createDesign, duplicateDesign, normalizeDesign } from './model.js?v=pb1';
import { esc } from './render.js?v=pb1';
import { uiIcon } from './icons.js?v=pb1';
import { openEditor } from './editor.js?v=pb1';
import { renderThumb } from './export.js?v=pb1';

var STARTERS_URL = '/assets/js/post-builder/starters.json?v=pb1';
var startersPromise = null;

function loadStarters() {
  if (!startersPromise) {
    startersPromise = fetch(STARTERS_URL).then(function (r) {
      if (!r.ok) throw new Error('starters.json ' + r.status);
      return r.json();
    }).then(function (d) { return d.sets || []; }).catch(function (err) {
      startersPromise = null;
      throw err;
    });
  }
  return startersPromise;
}

function ago(ts) {
  var s = Math.max(1, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'just now';
  var m = Math.round(s / 60);
  if (m < 60) return m + ' min ago';
  var h = Math.round(m / 60);
  if (h < 24) return h + ' h ago';
  var d = Math.round(h / 24);
  return d < 30 ? d + ' d ago' : new Date(ts).toLocaleDateString();
}

function aspect(format) {
  var f = FORMATS[format] || FORMATS.feed34;
  return f.w + ' / ' + f.h;
}

function cardHtml(s) {
  var f = FORMATS[s.format] || FORMATS.feed34;
  var thumb = s.thumbUrl
    ? '<img src="' + esc(s.thumbUrl) + '" alt="" loading="lazy" />'
    : '<span class="pb-card-empty">' + esc(f.label) + '</span>';
  return '<article class="pb-card" data-id="' + esc(s.id) + '">' +
    '<button type="button" class="pb-card-open" data-lib="open" style="aspect-ratio:' + aspect(s.format) + '" aria-label="Open ' + esc(s.name) + '">' + thumb + '</button>' +
    '<div class="pb-card-meta"><strong title="' + esc(s.name) + '">' + esc(s.name) + '</strong>' +
      '<span>' + esc(f.label) + ' · ' + s.slides + ' slide' + (s.slides > 1 ? 's' : '') + ' · ' + ago(s.updatedAt || Date.now()) + '</span></div>' +
    '<div class="pb-card-actions">' +
      '<button type="button" class="pb-icon-btn" data-lib="duplicate" title="Duplicate" aria-label="Duplicate">' + uiIcon('copy') + '</button>' +
      '<button type="button" class="pb-icon-btn" data-lib="rename" title="Rename" aria-label="Rename">' + uiIcon('type') + '</button>' +
      '<button type="button" class="pb-icon-btn pb-danger" data-lib="delete" title="Delete" aria-label="Delete">' + uiIcon('trash') + '</button>' +
    '</div></article>';
}

function dialogHtml() {
  return '<div class="pb-dialog" role="dialog" aria-modal="true" aria-label="New design">' +
    '<header class="pb-dialog-head"><strong>New design</strong>' +
      '<button type="button" class="pb-icon-btn" data-new="close" aria-label="Close">' + uiIcon('close') + '</button></header>' +
    '<nav class="pb-tabs pb-dialog-tabs">' +
      '<button type="button" data-new-tab="starters" class="is-on">From the new posts</button>' +
      '<button type="button" data-new-tab="blank">Blank</button>' +
      '<button type="button" data-new-tab="copy">Copy a design</button>' +
    '</nav>' +
    '<div class="pb-dialog-body">' +
      '<section data-new-pane="starters"><p class="pb-note">Loading the services posts…</p></section>' +
      '<section data-new-pane="blank" hidden><div class="pb-formats">' + Object.keys(FORMATS).map(function (k) {
        var f = FORMATS[k];
        return '<button type="button" class="pb-format" data-new="blank" data-format="' + k + '">' +
          '<span class="pb-format-box" style="aspect-ratio:' + f.w + ' / ' + f.h + '"></span>' +
          '<b>' + f.label + '</b><span>' + f.w + '×' + f.h + (k === 'feed34' ? ' · fills the profile grid' : k === 'story' ? ' · stories + reel covers' : '') + '</span></button>';
      }).join('') + '</div></section>' +
      '<section data-new-pane="copy" hidden></section>' +
    '</div></div>';
}

function startersHtml(sets) {
  return sets.map(function (set, si) {
    return '<div class="pb-starter-set">' +
      '<div class="pb-starter-head"><div><b>' + esc(set.name) + '</b><span>' + FORMATS[set.format].label + ' · ' + set.slides.length + ' slides</span></div>' +
      '<button type="button" class="pb-btn pb-btn--primary" data-new="set" data-set="' + si + '">Use all ' + set.slides.length + ' slides</button></div>' +
      '<div class="pb-starter-row">' + set.boards.map(function (b, bi) {
        return '<button type="button" class="pb-starter" data-new="board" data-set="' + si + '" data-board="' + bi + '" style="aspect-ratio:' + aspect(set.format) + '" title="Just this slide">' +
          '<img src="' + esc(b.thumb) + '" alt="Slide ' + (bi + 1) + '" loading="lazy" /></button>';
      }).join('') + '</div></div>';
  }).join('');
}

export function mountLibrary(root, store) {
  var designs = [];
  var busy = false;

  root.innerHTML =
    '<div class="pb-lib">' +
      '<div class="pb-lib-head">' +
        '<p class="pb-lib-lead">Drag-and-drop posts and stories in the CWR style. ' +
          (store.mode === 'firebase' ? 'Designs save to Firebase automatically.' : 'Local mode: designs save in this browser only.') + '</p>' +
        '<button type="button" class="pb-btn pb-btn--primary" data-lib="new">' + uiIcon('plus') + 'New design</button>' +
      '</div>' +
      '<p class="pb-lib-status" role="status" aria-live="polite"></p>' +
      '<div class="pb-lib-grid"></div>' +
    '</div>' +
    '<div class="pb-modal" hidden>' + dialogHtml() + '</div>';

  var grid = root.querySelector('.pb-lib-grid');
  var statusEl = root.querySelector('.pb-lib-status');
  var modal = root.querySelector('.pb-modal');

  function status(msg) { statusEl.textContent = msg || ''; }

  function renderGrid() {
    grid.innerHTML = designs.length
      ? designs.map(cardHtml).join('')
      : '<div class="pb-lib-empty"><b>No designs yet.</b><span>Start from one of the new services posts or a blank canvas.</span></div>';
  }

  store.subscribe(function (list) {
    designs = list;
    renderGrid();
    if (!modal.hidden) renderCopyPane();
  });

  async function open(design) {
    status('');
    await openEditor(design, {
      store: store,
      onClose: function (final) {
        // Refresh the library thumbnail in the background.
        renderThumb(final).then(function (blob) { return store.saveThumb(final, blob); }).catch(function (err) {
          console.warn('[post-builder] thumbnail failed', err);
        });
      }
    });
  }

  async function run(label, fn) {
    if (busy) return;
    busy = true;
    status(label);
    try {
      await fn();
      status('');
    } catch (err) {
      console.error('[post-builder]', err);
      status((err && err.message) || 'Something went wrong.');
    } finally {
      busy = false;
    }
  }

  async function createAndOpen(design) {
    closeDialog();
    await store.save(design);
    await open(design);
  }

  // ---------- new design dialog ----------

  function openDialog() {
    modal.hidden = false;
    document.documentElement.classList.add('pb-modal-open');
    showNewTab('starters');
    loadStarters().then(function (sets) {
      modal.querySelector('[data-new-pane="starters"]').innerHTML = startersHtml(sets);
    }).catch(function () {
      modal.querySelector('[data-new-pane="starters"]').innerHTML = '<p class="pb-note">Couldn’t load the services posts. Try Blank instead.</p>';
    });
  }

  function closeDialog() {
    modal.hidden = true;
    document.documentElement.classList.remove('pb-modal-open');
  }

  function showNewTab(name) {
    modal.querySelectorAll('[data-new-tab]').forEach(function (b) { b.classList.toggle('is-on', b.getAttribute('data-new-tab') === name); });
    modal.querySelectorAll('[data-new-pane]').forEach(function (p) { p.hidden = p.getAttribute('data-new-pane') !== name; });
    if (name === 'copy') renderCopyPane();
  }

  function renderCopyPane() {
    var pane = modal.querySelector('[data-new-pane="copy"]');
    pane.innerHTML = designs.length
      ? '<div class="pb-copy-list">' + designs.map(function (s) {
          return '<button type="button" class="pb-copy" data-new="copy" data-id="' + esc(s.id) + '">' +
            (s.thumbUrl ? '<img src="' + esc(s.thumbUrl) + '" alt="" />' : '<span class="pb-card-empty"></span>') +
            '<span><b>' + esc(s.name) + '</b><span>' + FORMATS[s.format].label + ' · ' + s.slides + ' slides</span></span></button>';
        }).join('') + '</div>'
      : '<p class="pb-note">No saved designs to copy yet.</p>';
  }

  modal.addEventListener('click', function (e) {
    if (e.target === modal) return closeDialog();
    var tab = e.target.closest('[data-new-tab]');
    if (tab) return showNewTab(tab.getAttribute('data-new-tab'));
    var btn = e.target.closest('[data-new]');
    if (!btn) return;
    var what = btn.getAttribute('data-new');
    if (what === 'close') return closeDialog();
    if (what === 'blank') {
      var format = btn.getAttribute('data-format');
      return run('Creating…', function () { return createAndOpen(createDesign(format, 'Untitled ' + FORMATS[format].label.toLowerCase())); });
    }
    if (what === 'set' || what === 'board') {
      return run('Creating…', async function () {
        var sets = await loadStarters();
        var set = sets[+btn.getAttribute('data-set')];
        var bi = what === 'board' ? +btn.getAttribute('data-board') : null;
        var base = normalizeDesign({
          name: bi == null ? set.name : set.name + ' · slide ' + (bi + 1),
          format: set.format,
          source: 'starter:' + set.id + (bi == null ? '' : ':' + set.boards[bi].id),
          slides: bi == null ? set.slides : [set.slides[bi]]
        });
        var d = duplicateDesign(base, base.name);
        d.source = base.source;
        await createAndOpen(d);
      });
    }
    if (what === 'copy') {
      return run('Copying…', async function () {
        var full = await store.load(btn.getAttribute('data-id'));
        await createAndOpen(duplicateDesign(full));
      });
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.hidden) closeDialog();
  });

  // ---------- library actions ----------

  root.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-lib]');
    if (!btn || modal.contains(btn)) return;
    var what = btn.getAttribute('data-lib');
    if (what === 'new') return openDialog();
    var card = btn.closest('[data-id]');
    var summary = card && designs.find(function (d) { return d.id === card.getAttribute('data-id'); });
    if (!summary) return;
    if (what === 'open') {
      return run('Opening…', async function () { await open(await store.load(summary.id)); });
    }
    if (what === 'duplicate') {
      return run('Duplicating…', async function () { await store.save(duplicateDesign(await store.load(summary.id))); });
    }
    if (what === 'rename') {
      var name = window.prompt('Rename design', summary.name);
      if (!name || !name.trim() || name.trim() === summary.name) return;
      return run('Renaming…', async function () {
        var full = await store.load(summary.id);
        full.name = name.trim().slice(0, 80);
        full.updatedAt = Date.now();
        await store.save(full);
      });
    }
    if (what === 'delete') {
      if (!window.confirm('Delete “' + summary.name + '”? This can’t be undone.')) return;
      return run('Deleting…', function () { return store.remove(summary); });
    }
  });
}
