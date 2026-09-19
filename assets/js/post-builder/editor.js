/**
 * Post builder — full-screen editor.
 *
 * Canvas: the slide renders at native size (1080 wide) inside .pb-stage-scale, which is
 * CSS-scaled to fit. Moveable (esm.sh) handles drag / resize / rotate / snapping on the
 * selected element; every gesture writes back into the design model, and the history
 * gets one checkpoint per gesture.
 *
 * Panels (add, style, layers, slides) talk to the editor through `ctx` only.
 */
import { FORMATS, MAX_SLIDES, createElement, createSlide, duplicateElement, duplicateSlide, sizingOf, clone, slugify } from './model.js?v=pb1';
import { createHistory } from './history.js?v=pb1';
import { renderSlide, layoutSlide, layoutElement, applyBox, renderElement, ensureFonts } from './render.js?v=pb1';
import { uiIcon } from './icons.js?v=pb1';
import { renderAddPane } from './panel-add.js?v=pb1';
import { renderStylePane, syncStyleBox } from './panel-props.js?v=pb1';
import { renderLayersPane } from './panel-layers.js?v=pb1';
import { renderSlidesPane } from './panel-slides.js?v=pb1';
import * as exporter from './export.js?v=pb1';

var moveablePromise = null;
var PHONE_MQ = '(max-width: 900px)';
var MARGIN = 60;

function loadMoveable() {
  if (!moveablePromise) {
    moveablePromise = import('https://esm.sh/moveable@0.53.0').then(function (m) { return m.default || m; });
  }
  return moveablePromise;
}

function isTypingTarget(t) {
  return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
}

function shellHtml() {
  return '' +
    '<header class="pb-top">' +
      '<button type="button" class="pb-icon-btn" data-act="close" aria-label="Back to library">' + uiIcon('back') + '</button>' +
      '<input class="pb-name" maxlength="80" aria-label="Design name" />' +
      '<span class="pb-status" role="status" aria-live="polite"></span>' +
      '<div class="pb-top-actions">' +
        '<button type="button" class="pb-icon-btn" data-act="undo" aria-label="Undo" title="Undo (Ctrl/⌘ Z)">' + uiIcon('undo') + '</button>' +
        '<button type="button" class="pb-icon-btn" data-act="redo" aria-label="Redo" title="Redo (Shift Ctrl/⌘ Z)">' + uiIcon('redo') + '</button>' +
        '<button type="button" class="pb-btn pb-btn--primary pb-export-btn" data-act="export-menu">' + uiIcon('download') + '<span>Export</span></button>' +
      '</div>' +
      '<div class="pb-menu" data-menu="export" hidden>' +
        '<button type="button" data-export="share" class="pb-share-only">' + uiIcon('share') + 'Share all slides</button>' +
        '<button type="button" data-export="current">' + uiIcon('image') + 'Download this slide</button>' +
        '<button type="button" data-export="all">' + uiIcon('download') + 'Download all slides</button>' +
        '<button type="button" data-export="zip">' + uiIcon('download') + 'Download .zip</button>' +
      '</div>' +
    '</header>' +
    '<div class="pb-main">' +
      '<aside class="pb-rail pb-rail--left">' +
        '<nav class="pb-tabs"><button type="button" data-tab="add">Add</button><button type="button" data-tab="slides">Slides</button></nav>' +
        '<section class="pb-pane" data-pane="add"></section>' +
        '<section class="pb-pane" data-pane="slides"></section>' +
      '</aside>' +
      '<div class="pb-canvas-wrap">' +
        '<div class="pb-stage"><div class="pb-stage-scale"></div><div class="pb-guides" aria-hidden="true"></div></div>' +
      '</div>' +
      '<aside class="pb-rail pb-rail--right">' +
        '<nav class="pb-tabs"><button type="button" data-tab="style">Style</button><button type="button" data-tab="layers">Layers</button></nav>' +
        '<section class="pb-pane" data-pane="style"></section>' +
        '<section class="pb-pane" data-pane="layers"></section>' +
      '</aside>' +
    '</div>' +
    '<div class="pb-canvas-bar">' +
      '<button type="button" class="pb-icon-btn" data-act="prev-slide" aria-label="Previous slide">' + uiIcon('left') + '</button>' +
      '<span class="pb-slide-label"></span>' +
      '<button type="button" class="pb-icon-btn" data-act="next-slide" aria-label="Next slide">' + uiIcon('right') + '</button>' +
      '<span class="pb-bar-sep"></span>' +
      '<button type="button" class="pb-icon-btn" data-act="zoom-out" aria-label="Zoom out">' + uiIcon('minus') + '</button>' +
      '<button type="button" class="pb-zoom-label" data-act="zoom-fit" title="Fit to screen">Fit</button>' +
      '<button type="button" class="pb-icon-btn" data-act="zoom-in" aria-label="Zoom in">' + uiIcon('plus') + '</button>' +
    '</div>' +
    '<nav class="pb-toolbar" aria-label="Editor tools">' +
      '<button type="button" data-sheet="add">' + uiIcon('plus') + '<span>Add</span></button>' +
      '<button type="button" data-sheet="style">' + uiIcon('sliders') + '<span>Style</span></button>' +
      '<button type="button" data-sheet="layers">' + uiIcon('layers') + '<span>Layers</span></button>' +
      '<button type="button" data-sheet="slides">' + uiIcon('slides') + '<span>Slides</span></button>' +
    '</nav>' +
    '<div class="pb-scrim" data-act="close-sheet"></div>';
}

/**
 * Open the editor over the page. opts: { store, onClose(design) }.
 * Resolves once the editor is on screen.
 */
export async function openEditor(initial, opts) {
  var Moveable = await loadMoveable();
  await ensureFonts();

  var store = opts.store;
  var design = initial;
  var slideIndex = 0;
  var selectedId = null;
  var zoom = 0; // 0 = fit
  var history = createHistory(50);
  var gestureBefore = null;
  var gesture = null;
  var coalesceKey = '';
  var coalesceAt = 0;
  var clipboard = null;
  var exportCache = null;
  var slidesTimer = null;

  var root = document.createElement('div');
  root.className = 'pb-editor';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Post builder editor');
  root.dataset.left = 'add';
  root.dataset.right = 'style';
  root.innerHTML = shellHtml();
  document.body.appendChild(root);
  document.documentElement.classList.add('pb-open');

  function $(sel) { return root.querySelector(sel); }
  var stage = $('.pb-stage');
  var scaleEl = $('.pb-stage-scale');
  var wrap = $('.pb-canvas-wrap');
  var guides = $('.pb-guides');
  var nameInput = $('.pb-name');
  var statusEl = $('.pb-status');
  var panes = {
    add: $('[data-pane="add"]'),
    slides: $('[data-pane="slides"]'),
    style: $('[data-pane="style"]'),
    layers: $('[data-pane="layers"]')
  };
  var board = null;
  var touch = window.matchMedia('(pointer: coarse)').matches;

  if (!exporter.canShareFiles()) root.classList.add('pb-no-share');

  var mv = new Moveable(stage, {
    target: null,
    className: 'pb-moveable',
    draggable: true,
    resizable: true,
    rotatable: true,
    snappable: true,
    pinchable: ['resizable', 'rotatable'],
    origin: false,
    zoom: touch ? 1.5 : 1,
    throttleDrag: 0,
    throttleResize: 0,
    throttleRotate: 0,
    snapThreshold: 6,
    snapRotationDegrees: [0, 90, 180, 270],
    snapRotationThreshold: 4,
    isDisplaySnapDigit: false,
    snapDirections: { top: true, left: true, bottom: true, right: true, center: true, middle: true },
    elementSnapDirections: { top: true, left: true, bottom: true, right: true, center: true, middle: true },
    rotationPosition: 'top',
    preventClickEventOnDrag: true
  });

  // ---------- model helpers ----------

  function fmt() { return FORMATS[design.format]; }
  function slide() { return design.slides[slideIndex]; }
  function find(id) {
    if (!id) return null;
    var list = slide().elements;
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function cur() { return find(selectedId); }
  function nodeOf(id) { return board && board.querySelector('[data-id="' + id + '"]'); }
  function snapshot() { return JSON.stringify(design); }
  function isPhone() { return window.matchMedia(PHONE_MQ).matches; }

  // ---------- status + saving ----------

  var STATUS = {
    saving: 'Saving…',
    saved: 'Saved',
    local: 'Saved on this device',
    error: 'Not saved — kept on this device'
  };

  function setStatus(kind, extra) {
    statusEl.textContent = STATUS[kind] || kind || '';
    statusEl.dataset.kind = STATUS[kind] ? kind : 'info';
    if (kind === 'error' && extra && extra.message) statusEl.title = extra.message;
  }

  function touched() {
    design.updatedAt = Date.now();
    exportCache = null;
    store.scheduleSave(design, setStatus);
    updateUndo();
    scheduleSlidesPane();
  }

  function updateUndo() {
    $('[data-act="undo"]').disabled = !history.canUndo();
    $('[data-act="redo"]').disabled = !history.canRedo();
  }

  /**
   * Apply a change. opts:
   *   coalesce — key; repeated calls with the same key within 1.2s share one undo step
   *   only     — element id; re-render just that element instead of the whole slide
   *   panels   — false to leave the style pane alone (e.g. while typing in it)
   */
  function mutate(fn, o) {
    o = o || {};
    var now = Date.now();
    if (!o.coalesce || o.coalesce !== coalesceKey || now - coalesceAt > 1200) history.checkpoint(snapshot());
    coalesceKey = o.coalesce || '';
    coalesceAt = now;
    fn(design);
    touched();
    if (o.only && nodeOf(o.only) && find(o.only)) rerenderElement(o.only);
    else renderCanvas();
    if (o.panels !== false) renderStyle();
    renderLayers();
  }

  function restore(snap) {
    design = JSON.parse(snap);
    if (slideIndex >= design.slides.length) slideIndex = design.slides.length - 1;
    if (!find(selectedId)) selectedId = null;
    design.updatedAt = Date.now();
    exportCache = null;
    store.scheduleSave(design, setStatus);
    renderAll();
  }

  function undo() {
    var prev = history.undo(snapshot());
    if (prev) restore(prev);
    updateUndo();
  }

  function redo() {
    var next = history.redo(snapshot());
    if (next) restore(next);
    updateUndo();
  }

  // ---------- rendering ----------

  function fitZoom() {
    var r = wrap.getBoundingClientRect();
    var pad = isPhone() ? 24 : 64;
    var f = fmt();
    return Math.max(0.08, Math.min((r.width - pad) / f.w, (r.height - pad) / f.h));
  }

  function currentZoom() { return zoom || fitZoom(); }

  function applyZoom() {
    var f = fmt();
    var z = currentZoom();
    stage.style.width = Math.round(f.w * z) + 'px';
    stage.style.height = Math.round(f.h * z) + 'px';
    scaleEl.style.width = f.w + 'px';
    scaleEl.style.height = f.h + 'px';
    scaleEl.style.transform = 'scale(' + z + ')';
    var v = [0, MARGIN, f.w / 2, f.w - MARGIN, f.w];
    var h = [0, MARGIN, f.h / 2, f.h - MARGIN, f.h];
    if (f.safe) h.push(f.safe.top, f.h - f.safe.bottom);
    mv.verticalGuidelines = v.map(function (x) { return x * z; });
    mv.horizontalGuidelines = h.map(function (y) { return y * z; });
    $('.pb-zoom-label').textContent = zoom ? Math.round(z * 100) + '%' : 'Fit';
    drawGuides(z);
    mv.updateRect();
  }

  function drawGuides(z) {
    var f = fmt();
    if (!f.safe) { guides.innerHTML = ''; return; }
    guides.innerHTML =
      '<div class="pb-safe pb-safe--top" style="height:' + f.safe.top * z + 'px"><span>Story UI · keep clear</span></div>' +
      '<div class="pb-safe pb-safe--bottom" style="height:' + f.safe.bottom * z + 'px"><span>Reply bar · keep clear</span></div>';
  }

  function renderCanvas() {
    var built = renderSlide(design, slideIndex, 'editor');
    scaleEl.innerHTML = '';
    scaleEl.appendChild(built.root);
    board = built.board;
    layoutSlide(board, slide());
    applyZoom();
    retarget();
    $('.pb-slide-label').textContent = 'Slide ' + (slideIndex + 1) + ' / ' + design.slides.length;
    $('[data-act="prev-slide"]').disabled = slideIndex === 0;
    $('[data-act="next-slide"]').disabled = slideIndex === design.slides.length - 1;
  }

  function rerenderElement(id) {
    var el = find(id);
    var old = nodeOf(id);
    if (!el || !old) return renderCanvas();
    var node = renderElement(el, { index: slideIndex, total: design.slides.length, mode: 'editor' });
    old.replaceWith(node);
    layoutElement(node, el);
    retarget();
  }

  function retarget() {
    var el = cur();
    var node = el && nodeOf(el.id);
    if (!node) {
      selectedId = null;
      mv.target = null;
      return;
    }
    var sizing = sizingOf(el.type);
    var locked = !!el.locked;
    mv.draggable = !locked;
    mv.resizable = !locked;
    mv.rotatable = !locked;
    mv.keepRatio = sizing === 'scale' || sizing === 'square' || el.type === 'image';
    mv.renderDirections = locked ? [] :
      sizing === 'width' ? ['nw', 'ne', 'sw', 'se', 'w', 'e'] :
      sizing === 'scale' || sizing === 'square' || el.type === 'image' ? ['nw', 'ne', 'sw', 'se'] :
      el.type === 'shape' && el.props.kind === 'line' ? ['w', 'e'] :
      ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
    mv.elementGuidelines = Array.prototype.filter.call(board.querySelectorAll('.pb-el'), function (n) {
      return n !== node && !n.classList.contains('is-hidden');
    });
    mv.target = node;
    mv.updateRect();
  }

  function renderStyle() { renderStylePane(panes.style, ctx); }
  function renderLayers() { renderLayersPane(panes.layers, ctx); }
  function scheduleSlidesPane() {
    clearTimeout(slidesTimer);
    slidesTimer = setTimeout(function () { renderSlidesPane(panes.slides, ctx); }, 350);
  }

  function renderAll() {
    nameInput.value = design.name;
    renderCanvas();
    renderStyle();
    renderLayers();
    renderSlidesPane(panes.slides, ctx);
    updateUndo();
  }

  // ---------- selection + structure ----------

  function select(id) {
    selectedId = id && find(id) ? id : null;
    retarget();
    renderStyle();
    renderLayers();
  }

  function setSlide(i) {
    if (i < 0 || i >= design.slides.length || i === slideIndex) return;
    slideIndex = i;
    selectedId = null;
    renderCanvas();
    renderStyle();
    renderLayers();
    renderSlidesPane(panes.slides, ctx);
  }

  function addElement(type, o) {
    var el = createElement(type, o, design.format);
    var f = fmt();
    if (f.safe && el.y < f.safe.top) el.y = f.safe.top;
    mutate(function () { slide().elements.push(el); });
    select(el.id);
    if (isPhone()) closeSheet();
    return el;
  }

  function removeElement(id) {
    mutate(function () {
      var list = slide().elements;
      var i = list.findIndex(function (e) { return e.id === id; });
      if (i >= 0) list.splice(i, 1);
    });
    if (selectedId === id) select(null);
  }

  function duplicateEl(id) {
    var el = find(id);
    if (!el) return;
    var copy = duplicateElement(el);
    mutate(function () {
      var list = slide().elements;
      list.splice(list.indexOf(el) + 1, 0, copy);
    });
    select(copy.id);
  }

  /** dir: +1 forward, -1 backward, 'front', 'back'. */
  function reorder(id, dir) {
    var list = slide().elements;
    var i = list.findIndex(function (e) { return e.id === id; });
    if (i < 0) return;
    var j = dir === 'front' ? list.length - 1 : dir === 'back' ? 0 : i + dir;
    if (j < 0 || j >= list.length || j === i) return;
    mutate(function () {
      var el = list.splice(i, 1)[0];
      list.splice(j, 0, el);
    });
  }

  function toggle(id, key) {
    mutate(function () {
      var el = find(id);
      if (el) el[key] = !el[key];
    }, { only: id });
  }

  function addSlide() {
    if (design.slides.length >= MAX_SLIDES) return setStatus('Instagram allows ' + MAX_SLIDES + ' slides max');
    mutate(function () { design.slides.splice(slideIndex + 1, 0, createSlide(slide().background.preset)); });
    setSlide(slideIndex + 1);
  }

  function duplicateSlideAt(i) {
    if (design.slides.length >= MAX_SLIDES) return setStatus('Instagram allows ' + MAX_SLIDES + ' slides max');
    mutate(function () { design.slides.splice(i + 1, 0, duplicateSlide(design.slides[i])); });
    setSlide(i + 1);
  }

  function removeSlide(i) {
    if (design.slides.length <= 1) return;
    mutate(function () { design.slides.splice(i, 1); });
    slideIndex = Math.min(slideIndex, design.slides.length - 1);
    selectedId = null;
    renderAll();
  }

  function moveSlide(i, dir) {
    var j = i + dir;
    if (j < 0 || j >= design.slides.length) return;
    mutate(function () {
      var s = design.slides.splice(i, 1)[0];
      design.slides.splice(j, 0, s);
    });
    slideIndex = j;
    renderAll();
  }

  async function uploadImage(file) {
    setStatus('Uploading image…');
    try {
      var res = await store.uploadImage(design, file);
      if (res.path && design.assets.indexOf(res.path) === -1) design.assets.push(res.path);
      setStatus(store.mode === 'firebase' ? 'saved' : 'local');
      return res.url;
    } catch (err) {
      console.error('[post-builder] upload failed', err);
      setStatus('Upload failed — ' + (err && err.message ? err.message : 'try again'));
      throw err;
    }
  }

  // ---------- sheets (phone) + tabs (desktop) ----------

  function showPane(name) {
    if (name === 'add' || name === 'slides') root.dataset.left = name;
    else root.dataset.right = name;
    if (name === 'slides') renderSlidesPane(panes.slides, ctx);
  }

  function openSheet(name) {
    if (root.dataset.sheet === name) return closeSheet();
    showPane(name);
    root.dataset.sheet = name;
  }

  function closeSheet() { root.dataset.sheet = ''; }

  // ---------- Moveable gestures ----------

  function beginGesture() { gestureBefore = snapshot(); }

  function endGesture() {
    if (gestureBefore && gestureBefore !== snapshot()) {
      history.checkpoint(gestureBefore);
      coalesceKey = '';
      touched();
      renderLayers();
    }
    gestureBefore = null;
    gesture = null;
    mv.updateRect();
    var el = cur();
    if (el) syncStyleBox(panes.style, el);
  }

  mv.on('dragStart', function (e) {
    var el = cur();
    if (!el || el.locked) return false;
    beginGesture();
    e.set([el.x, el.y]);
  }).on('drag', function (e) {
    var el = cur();
    if (!el) return;
    el.x = Math.round(e.beforeTranslate[0]);
    el.y = Math.round(e.beforeTranslate[1]);
    applyBox(e.target, el);
  }).on('dragEnd', endGesture);

  mv.on('resizeStart', function (e) {
    var el = cur();
    if (!el) return false;
    beginGesture();
    e.setOrigin(['%', '%']);
    if (e.dragStart) e.dragStart.set([el.x, el.y]);
    var inner = e.target.firstElementChild;
    gesture = { x: el.x, y: el.y, w: el.w, h: el.h, size: el.props.size, naturalW: inner ? inner.offsetWidth : el.w, dir: e.direction };
  }).on('resize', function (e) {
    var el = cur();
    var g = gesture;
    if (!el || !g) return;
    var sizing = sizingOf(el.type);
    var t = e.drag.beforeTranslate;
    if (sizing === 'width') {
      var w = Math.max(40, Math.round(e.width));
      var corner = g.dir[0] !== 0 && g.dir[1] !== 0;
      if (corner) el.props.size = Math.max(6, Math.round(g.size * (w / g.w) * 10) / 10);
      el.w = w;
      if (corner) {
        var fresh = renderElement(el, { index: slideIndex, total: design.slides.length, mode: 'editor' });
        e.target.innerHTML = fresh.innerHTML;
      }
      applyBox(e.target, el);
      layoutElement(e.target, el);
      // Height follows the text, so anchor the opposite edge ourselves when unrotated.
      if (!el.rotate) {
        el.x = g.dir[0] < 0 ? Math.round(g.x + g.w - el.w) : g.x;
        el.y = g.dir[1] < 0 ? Math.round(g.y + g.h - el.h) : g.y;
      } else {
        el.x = Math.round(t[0]);
        el.y = Math.round(t[1]);
      }
    } else if (sizing === 'scale') {
      el.props.scale = Math.max(0.05, Math.round(e.width / g.naturalW * 1000) / 1000);
      el.x = Math.round(t[0]);
      el.y = Math.round(t[1]);
      applyBox(e.target, el);
      layoutElement(e.target, el);
    } else if (sizing === 'square') {
      el.w = el.h = Math.max(12, Math.round(e.width));
      el.x = Math.round(t[0]);
      el.y = Math.round(t[1]);
    } else {
      el.w = Math.max(8, Math.round(e.width));
      el.h = Math.max(4, Math.round(e.height));
      el.x = Math.round(t[0]);
      el.y = Math.round(t[1]);
    }
    applyBox(e.target, el);
  }).on('resizeEnd', endGesture);

  mv.on('rotateStart', function (e) {
    var el = cur();
    if (!el) return false;
    beginGesture();
    e.set(el.rotate || 0);
  }).on('rotate', function (e) {
    var el = cur();
    if (!el) return;
    var r = ((e.rotation % 360) + 360) % 360;
    if (r > 180) r -= 360;
    el.rotate = Math.round(r * 10) / 10;
    applyBox(e.target, el);
  }).on('rotateEnd', endGesture);

  mv.on('click', function (e) {
    var el = cur();
    if (e.isDouble && el && (el.type === 'text' || el.type === 'checklist' || el.props.text != null)) focusText();
  });

  function focusText() {
    if (isPhone()) openSheet('style');
    else showPane('style');
    var field = panes.style.querySelector('[data-focus-text]');
    if (field) setTimeout(function () { field.focus(); field.select && field.select(); }, 60);
  }

  // Press an unselected element: select it and drag it in the same gesture. Once
  // selected, Moveable owns the gestures. (Moveable's own dragStart() leaves its
  // gesture handler broken for later drags, so this first drag is tracked here.)
  function pointOf(ev) {
    var t = ev.touches ? (ev.touches[0] || ev.changedTouches[0]) : ev;
    return { x: t.clientX, y: t.clientY };
  }

  function snapCenter(value, size, total, threshold) {
    return Math.abs(value + size / 2 - total / 2) < threshold ? Math.round((total - size) / 2) : value;
  }

  function firstDrag(e, el, node) {
    var isTouch = !!e.touches;
    if (isTouch && e.touches.length > 1) return;
    var p0 = pointOf(e);
    var start = { x: el.x, y: el.y };
    var z = currentZoom();
    var f = fmt();
    var moved = false;
    beginGesture();
    function move(ev) {
      var p = pointOf(ev);
      var dx = (p.x - p0.x) / z;
      var dy = (p.y - p0.y) / z;
      if (!moved && Math.abs(p.x - p0.x) + Math.abs(p.y - p0.y) < 3) return;
      moved = true;
      if (ev.cancelable) ev.preventDefault();
      el.x = snapCenter(Math.round(start.x + dx), el.w, f.w, 6 / z);
      el.y = snapCenter(Math.round(start.y + dy), el.h, f.h, 6 / z);
      applyBox(node, el);
      mv.updateRect();
    }
    function up() {
      window.removeEventListener(isTouch ? 'touchmove' : 'mousemove', move);
      window.removeEventListener(isTouch ? 'touchend' : 'mouseup', up);
      window.removeEventListener('touchcancel', up);
      endGesture();
    }
    window.addEventListener(isTouch ? 'touchmove' : 'mousemove', move, { passive: false });
    window.addEventListener(isTouch ? 'touchend' : 'mouseup', up);
    if (isTouch) window.addEventListener('touchcancel', up);
  }

  function onCanvasDown(e) {
    if (e.target.closest('.moveable-control-box')) return;
    var node = e.target.closest('.pb-el');
    if (!node || !scaleEl.contains(node)) {
      select(null);
      return;
    }
    var id = node.getAttribute('data-id');
    if (id === selectedId) return;
    select(id);
    var el = cur();
    var fresh = nodeOf(id);
    if (el && fresh && !el.locked) firstDrag(e, el, fresh);
  }
  wrap.addEventListener('mousedown', onCanvasDown);
  wrap.addEventListener('touchstart', onCanvasDown, { passive: true });

  // ---------- keyboard ----------

  function nudge(dx, dy) {
    var el = cur();
    if (!el || el.locked) return;
    if (coalesceKey !== 'nudge:' + el.id || Date.now() - coalesceAt > 1200) history.checkpoint(snapshot());
    coalesceKey = 'nudge:' + el.id;
    coalesceAt = Date.now();
    el.x += dx;
    el.y += dy;
    var node = nodeOf(el.id);
    if (node) applyBox(node, el);
    mv.updateRect();
    touched();
    syncStyleBox(panes.style, el);
  }

  function onKey(e) {
    if (!root.isConnected) return;
    if (isTypingTarget(e.target)) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    var mod = e.metaKey || e.ctrlKey;
    var k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && k === 'y') { e.preventDefault(); redo(); return; }
    var el = cur();
    if (mod && k === 'c' && el) { clipboard = clone(el); return; }
    if (mod && k === 'v' && clipboard) {
      e.preventDefault();
      var pasted = duplicateElement(clipboard);
      mutate(function () { slide().elements.push(pasted); });
      select(pasted.id);
      clipboard = pasted;
      return;
    }
    if (!el) return;
    if (mod && k === 'd') { e.preventDefault(); duplicateEl(el.id); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); removeElement(el.id); return; }
    if (e.key === 'Escape') { select(null); return; }
    var step = e.shiftKey ? 10 : 1;
    if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(-step, 0); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nudge(step, 0); }
    if (e.key === 'ArrowUp') { e.preventDefault(); nudge(0, -step); }
    if (e.key === 'ArrowDown') { e.preventDefault(); nudge(0, step); }
  }
  document.addEventListener('keydown', onKey);

  // ---------- export ----------

  function toggleExportMenu(force) {
    var menu = $('[data-menu="export"]');
    menu.hidden = force != null ? !force : !menu.hidden;
  }

  async function runExport(kind) {
    toggleExportMenu(false);
    try {
      // Share must run inside the tap that started it, so reuse files from a previous render.
      if (kind === 'share' && exportCache) {
        await exporter.shareFiles(exportCache, design.name);
        setStatus('Shared ' + exportCache.length + ' image' + (exportCache.length > 1 ? 's' : ''));
        return;
      }
      var indexes = kind === 'current' ? [slideIndex] : null;
      var files = await exporter.renderSlides(design, {
        indexes: indexes,
        onProgress: function (k, n) { setStatus('Rendering ' + (k + 1) + ' / ' + n + '…'); }
      });
      if (kind === 'share') {
        exportCache = files;
        try {
          await exporter.shareFiles(files, design.name);
          setStatus('Shared ' + files.length + ' image' + (files.length > 1 ? 's' : ''));
        } catch (err) {
          if (err && err.name === 'NotAllowedError') setStatus('Ready — tap Share again');
          else if (!err || err.name !== 'AbortError') throw err;
          else setStatus('');
        }
        return;
      }
      if (kind === 'zip') await exporter.downloadZip(files, slugify(design.name) + '.zip');
      else await exporter.downloadAll(files);
      setStatus('Exported ' + files.length + ' PNG' + (files.length > 1 ? 's' : ''));
    } catch (err) {
      console.error('[post-builder] export failed', err);
      setStatus('Export failed — ' + (err && err.message ? err.message : 'see console'));
    }
  }

  // ---------- chrome events ----------

  root.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-tab]');
    if (tab) return showPane(tab.getAttribute('data-tab'));
    var sheet = e.target.closest('[data-sheet]');
    if (sheet && sheet.closest('.pb-toolbar')) return openSheet(sheet.getAttribute('data-sheet'));
    var exp = e.target.closest('[data-export]');
    if (exp) return runExport(exp.getAttribute('data-export'));
    var act = e.target.closest('[data-act]');
    if (!act) {
      if (!e.target.closest('.pb-menu, .pb-export-btn')) toggleExportMenu(false);
      return;
    }
    switch (act.getAttribute('data-act')) {
      case 'close': close(); break;
      case 'undo': undo(); break;
      case 'redo': redo(); break;
      case 'export-menu': toggleExportMenu(); break;
      case 'close-sheet': closeSheet(); break;
      case 'prev-slide': setSlide(slideIndex - 1); break;
      case 'next-slide': setSlide(slideIndex + 1); break;
      case 'zoom-fit': zoom = 0; applyZoom(); break;
      case 'zoom-in': zoom = Math.min(3, currentZoom() * 1.25); applyZoom(); break;
      case 'zoom-out': zoom = Math.max(0.08, currentZoom() / 1.25); applyZoom(); break;
    }
  });

  nameInput.addEventListener('input', function () {
    var value = nameInput.value.trim() || 'Untitled design';
    history.checkpoint(snapshot());
    design.name = value;
    touched();
  });

  function onResize() { applyZoom(); }
  window.addEventListener('resize', onResize);

  // ---------- open / close ----------

  var closing = false;
  async function close() {
    if (closing) return;
    closing = true;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    clearTimeout(slidesTimer);
    mv.destroy();
    root.remove();
    document.documentElement.classList.remove('pb-open');
    await store.flush();
    if (opts.onClose) opts.onClose(design);
  }

  var ctx = {
    get design() { return design; },
    get slideIndex() { return slideIndex; },
    slide: slide,
    selected: cur,
    format: fmt,
    select: select,
    setSlide: setSlide,
    mutate: mutate,
    addElement: addElement,
    removeElement: removeElement,
    duplicateElement: duplicateEl,
    reorder: reorder,
    toggle: toggle,
    addSlide: addSlide,
    duplicateSlide: duplicateSlideAt,
    removeSlide: removeSlide,
    moveSlide: moveSlide,
    uploadImage: uploadImage,
    status: setStatus,
    isPhone: isPhone,
    closeSheet: closeSheet,
    nudge: nudge
  };

  renderAddPane(panes.add, ctx);
  renderAll();
  if (design.restored) setStatus('Restored unsaved changes');
  else setStatus(store.mode === 'firebase' ? 'saved' : 'local');
  // Fonts or late layout can shift the fit size on first paint.
  requestAnimationFrame(function () { applyZoom(); });

  return { close: close, ctx: ctx };
}
