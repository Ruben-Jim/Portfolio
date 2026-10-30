/**
 * CwrUI — the site's own popups. Use these instead of the browser's confirm(),
 * alert() and prompt() (scripts/preflight.mjs fails on those in admin code).
 *
 *   if (!(await CwrUI.confirm({ title, message, confirmLabel: 'Delete', tone: 'danger' }))) return;
 *   var pick = await CwrUI.choose({ title, message, actions: [{ label, value }, …] });   // null = closed
 *   var text = await CwrUI.prompt({ title, label, value, required: true });               // null = cancelled
 *   CwrUI.toast('Saved', { tone: 'success' });                                             // slides in, fades out
 *
 * One dialog at a time (later requests wait their turn). It sits on the confirm
 * layer and notices on the toast layer, above every drawer and modal.
 * Text is always set as text, never HTML.
 */
(function (global) {
  'use strict';

  var doc = global.document;
  var queue = [];
  var current = null;
  var els = null;
  var toastTimer = 0;

  // ── dialog ──

  function build() {
    if (els) return els;
    var root = doc.createElement('div');
    root.className = 'modal-container';
    root.id = 'cwr-dialog';
    root.setAttribute('data-layer', 'confirm');
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="overlay" data-cwr-dismiss></div>' +
      '<section class="confirm-delete-modal" role="alertdialog" aria-modal="true" aria-labelledby="cwr-dialog-title" aria-describedby="cwr-dialog-message">' +
        '<div class="confirm-delete-modal__header">' +
          '<h3 id="cwr-dialog-title"></h3>' +
          '<button type="button" class="confirm-delete-modal__close" data-cwr-dismiss aria-label="Close">' +
            '<ion-icon name="close-outline"></ion-icon>' +
          '</button>' +
        '</div>' +
        '<div class="confirm-delete-modal__body">' +
          '<p id="cwr-dialog-message"></p>' +
          '<label class="cwr-dialog-label" for="cwr-dialog-input" hidden></label>' +
          '<input type="text" class="form-input" id="cwr-dialog-input" autocomplete="off" hidden>' +
        '</div>' +
        '<div class="confirm-delete-modal__actions"></div>' +
      '</section>';
    doc.body.appendChild(root);
    els = {
      root: root,
      title: root.querySelector('#cwr-dialog-title'),
      message: root.querySelector('#cwr-dialog-message'),
      label: root.querySelector('.cwr-dialog-label'),
      input: root.querySelector('#cwr-dialog-input'),
      actions: root.querySelector('.confirm-delete-modal__actions'),
      overlay: root.querySelector('.overlay')
    };
    root.addEventListener('click', function (ev) {
      if (current && ev.target.closest('[data-cwr-dismiss]')) finish(current.dismissValue);
    });
    els.input.addEventListener('input', syncRequired);
    // Capture on window: while the dialog is open, keys belong to it. Escape/Enter are
    // handled here, and no key reaches page shortcuts underneath (e.g. the post builder's
    // Delete or arrow keys). Defaults stay on, so typing, Tab and button keys still work.
    global.addEventListener('keydown', function (ev) {
      if (!current) return;
      ev.stopImmediatePropagation();
      if (ev.key === 'Escape') {
        ev.preventDefault();
        finish(current.dismissValue);
      } else if (ev.key === 'Enter' && ev.target === els.input) {
        ev.preventDefault();
        var primary = els.actions.querySelector('[data-cwr-primary]');
        if (primary && !primary.disabled) primary.click();
      }
    }, true);
    return els;
  }

  function syncRequired() {
    if (!current || !current.required) return;
    var primary = els.actions.querySelector('[data-cwr-primary]');
    if (primary) primary.disabled = !els.input.value.trim();
  }

  function open(spec) {
    return new Promise(function (resolve) {
      queue.push({ spec: spec, resolve: resolve });
      if (!current) next();
    });
  }

  function next() {
    var item = queue.shift();
    if (!item) return;
    build();
    var s = item.spec;
    current = {
      resolve: item.resolve,
      dismissValue: s.dismissValue,
      required: !!s.required,
      returnFocus: doc.activeElement
    };
    els.title.textContent = s.title || '';
    els.message.textContent = s.message || '';
    els.message.hidden = !s.message;
    els.label.hidden = !(s.prompt && s.label);
    els.label.textContent = s.label || '';
    els.input.hidden = !s.prompt;
    els.input.value = s.prompt ? (s.value == null ? '' : String(s.value)) : '';
    els.input.placeholder = s.placeholder || '';
    els.actions.innerHTML = '';
    s.actions.forEach(function (a) {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'btn ' + (a.tone === 'danger' ? 'btn-danger' : a.tone === 'secondary' ? 'btn-secondary' : 'btn-primary');
      b.textContent = a.label;
      if (a.primary) b.setAttribute('data-cwr-primary', '');
      if (a.cancel) b.setAttribute('data-cwr-cancel', '');
      b.addEventListener('click', function () {
        finish(typeof a.value === 'function' ? a.value() : a.value);
      });
      els.actions.appendChild(b);
    });
    syncRequired();
    els.root.classList.add('active');
    els.overlay.classList.add('active');
    els.root.setAttribute('aria-hidden', 'false');
    global.setTimeout(function () {
      var target = s.prompt
        ? els.input
        : els.actions.querySelector('[data-cwr-cancel]') || els.actions.querySelector('button');
      if (target && current) target.focus();
    }, 40);
  }

  function finish(value) {
    if (!current) return;
    var c = current;
    current = null;
    els.root.classList.remove('active');
    els.overlay.classList.remove('active');
    els.root.setAttribute('aria-hidden', 'true');
    var back = c.returnFocus;
    if (back && back !== doc.body && typeof back.focus === 'function' && doc.contains(back)) {
      try { back.focus({ preventScroll: true }); } catch (e) {}
    }
    c.resolve(value);
    if (queue.length) global.setTimeout(next, 0);
  }

  /** Yes/no. Resolves true on the action button; Cancel, ×, the overlay and Escape resolve false. */
  function confirm(opts) {
    var o = opts || {};
    return open({
      title: o.title,
      message: o.message,
      dismissValue: false,
      actions: [
        { label: o.cancelLabel || 'Cancel', value: false, tone: 'secondary', cancel: true },
        { label: o.confirmLabel || 'Confirm', value: true, tone: o.tone === 'danger' ? 'danger' : 'primary', primary: true }
      ]
    });
  }

  /** Both buttons do something. Resolves the clicked action's value; closing the box resolves null. */
  function choose(opts) {
    var o = opts || {};
    var list = o.actions || [];
    return open({
      title: o.title,
      message: o.message,
      dismissValue: null,
      actions: list.map(function (a, i) {
        var last = i === list.length - 1;
        return { label: a.label, value: a.value, tone: a.tone || (last ? 'primary' : 'secondary'), primary: last };
      })
    });
  }

  /** One line of text. Resolves the trimmed text, or null when cancelled. */
  function prompt(opts) {
    var o = opts || {};
    return open({
      title: o.title,
      message: o.message,
      prompt: true,
      label: o.label,
      value: o.value,
      placeholder: o.placeholder,
      required: !!o.required,
      dismissValue: null,
      actions: [
        { label: o.cancelLabel || 'Cancel', value: null, tone: 'secondary', cancel: true },
        { label: o.confirmLabel || 'Save', value: function () { return els.input.value.trim(); }, tone: 'primary', primary: true }
      ]
    });
  }

  // ── notices ──

  /** A short message that slides in and disappears by itself. One at a time. */
  function toast(message, opts) {
    var o = opts || {};
    var old = doc.getElementById('cwr-toast');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    global.clearTimeout(toastTimer);

    var t = doc.createElement('div');
    t.id = 'cwr-toast';
    t.className = 'cwr-toast' + (o.tone === 'error' ? ' is-error' : o.tone === 'success' ? ' is-success' : '');
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    var msg = doc.createElement('span');
    msg.className = 'cwr-toast-msg';
    msg.textContent = message == null ? '' : String(message);
    t.appendChild(msg);

    function dismiss() {
      t.classList.remove('is-visible');
      global.setTimeout(function () {
        if (t.parentNode) t.parentNode.removeChild(t);
      }, 280);
    }

    var action = o.action;
    if (action && action.label && typeof action.onClick === 'function') {
      var b = doc.createElement('button');
      b.type = 'button';
      b.className = 'cwr-toast-action';
      b.textContent = action.label;
      b.addEventListener('click', function () {
        dismiss();
        action.onClick();
      });
      t.appendChild(b);
    }

    doc.body.appendChild(t);
    global.setTimeout(function () { t.classList.add('is-visible'); }, 10);
    toastTimer = global.setTimeout(dismiss, o.duration || (action ? 6000 : 3200));
  }

  // ── empty states ──

  function escText(v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * The one empty state for admin lists, as HTML: an icon, a line, an optional
   * hint and an optional button. `textHtml` is trusted markup (e.g. <code>);
   * `action` is a button's HTML. Styled by .admin-empty (agency-tools.css).
   */
  function emptyHtml(o) {
    o = o || {};
    return (
      '<div class="admin-empty' + (o.compact ? ' admin-empty--compact' : '') + '" role="status">' +
      (o.icon ? '<ion-icon class="admin-empty-icon" name="' + escText(o.icon) + '" aria-hidden="true"></ion-icon>' : '') +
      '<p class="admin-empty-title">' + escText(o.title || 'Nothing here yet') + '</p>' +
      (o.textHtml ? '<p class="admin-empty-text">' + o.textHtml + '</p>' : o.text ? '<p class="admin-empty-text">' + escText(o.text) + '</p>' : '') +
      (o.action || '') +
      '</div>'
    );
  }

  // ── floating buttons step aside ──

  var watching = false;
  var scheduled = false;

  function isShown(el) {
    if (el.hidden || el.getAttribute('aria-hidden') === 'true') return false;
    var cs = global.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0) return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function syncOverlayState() {
    scheduled = false;
    var open = Array.prototype.some.call(doc.querySelectorAll('[data-layer]'), isShown);
    doc.body.classList.toggle('cwr-overlay-open', open);
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    global.requestAnimationFrame(syncOverlayState);
  }

  /**
   * Keeps body.cwr-overlay-open set while any [data-layer] overlay is visible, so
   * [data-float] buttons (the timer) hide. Starts once the admin is active; public
   * pages never run it. No list of overlays: anything on a layer counts.
   */
  function watchOverlays() {
    if (watching || !doc.body) return;
    function start() {
      if (watching) return;
      watching = true;
      new MutationObserver(scheduleSync).observe(doc.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden', 'aria-hidden']
      });
      // Overlays that fade in or out only settle when their transition ends.
      doc.addEventListener('transitionend', scheduleSync, true);
      doc.addEventListener('transitioncancel', scheduleSync, true);
      scheduleSync();
    }
    if (doc.body.classList.contains('admin-page-active')) { start(); return; }
    var gate = new MutationObserver(function () {
      if (!doc.body.classList.contains('admin-page-active')) return;
      gate.disconnect();
      start();
    });
    gate.observe(doc.body, { attributes: true, attributeFilter: ['class'] });
  }

  global.CwrUI = {
    confirm: confirm,
    choose: choose,
    prompt: prompt,
    toast: toast,
    emptyHtml: emptyHtml,
    watchOverlays: watchOverlays
  };
})(window);
