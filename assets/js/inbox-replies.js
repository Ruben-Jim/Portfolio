/**
 * Admin → Messages → Replies: the instant reply customers get in their chat after the
 * contact / Hire Me form, and saved replies you insert from the reply bar.
 *
 * Data: agencyInboxReplies = { auto: { enabled, contact, hireMe }, saved: { id: { title, body, order } } }
 * (admin-only). The instant reply itself is sent by the autoReplyOnInquiry Cloud Function.
 * DEFAULT_AUTO must match functions/inbox-auto-reply.js (scripts/test-inbox-replies.mjs).
 * Admin-only: lazy-loaded through loadAdminBundle.
 */
(function () {
  'use strict';

  var PATH = 'agencyInboxReplies';

  var DEFAULT_AUTO = {
    enabled: true,
    contact: "Hi {name}! Thanks for reaching out to CodeWithRuben. I got your message and will reply right here within a day (usually sooner). If you think of anything else, just add it below.",
    hireMe: "Hi {name}! Thanks for your project inquiry. I'm looking it over and will reply here within a day with next steps. Want to talk it through sooner? Book a quick call: https://rubenjimenez.dev/schedule"
  };

  var DEFAULT_SAVED = [
    { id: 'thanks', title: 'Thanks, next steps', body: "Thanks {name}! Here's how this usually goes: a quick call to nail down what you need, then I send a clear quote and timeline. Want to pick a time? https://rubenjimenez.dev/schedule" },
    { id: 'pricing', title: 'Pricing overview', body: "Here's an overview of my packages: https://rubenjimenez.dev/services-pricing. Tell me which one looks closest and I'll tailor it to your business." },
    { id: 'call', title: 'Book a call', body: 'Easiest next step is a quick call. Pick any time that works for you: https://rubenjimenez.dev/schedule' },
    { id: 'details', title: 'Need more details', body: 'To give you an accurate quote, could you share: what the site or app needs to do, a couple of sites you like, and your ideal timeline?' },
    { id: 'followup', title: 'Follow-up', body: 'Hi {name}, just checking in on this. Any questions I can answer?' }
  ];

  var cache = { auto: null, saved: null, loaded: false };
  var loading = null;

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function firstName(name) {
    var first = String(name || '').trim().split(/\s+/)[0] || '';
    return /^customer$/i.test(first) ? '' : first;
  }

  /** {name} → first name, or "there". */
  function fill(template, name) {
    return String(template || '').replace(/\{name\}/g, firstName(name) || 'there');
  }

  function normalizeSaved(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var list = Object.keys(raw).map(function (id) {
      var r = raw[id] || {};
      return { id: id, title: String(r.title || '').trim(), body: String(r.body || '').trim(), order: Number(r.order) || 0 };
    }).filter(function (r) { return r.title && r.body; });
    list.sort(function (a, b) { return a.order - b.order; });
    return list;
  }

  function load(force) {
    if (cache.loaded && !force) return Promise.resolve(cache);
    if (loading && !force) return loading;
    if (!window.rtdb || !window.rtdbRef || !window.rtdbGet) return Promise.resolve(cache);
    loading = window.rtdbGet(window.rtdbRef(window.rtdb, PATH)).then(function (snap) {
      var val = (snap && snap.val()) || {};
      cache.auto = Object.assign({}, DEFAULT_AUTO, val.auto || {});
      cache.saved = normalizeSaved(val.saved);
      cache.loaded = true;
      return cache;
    }).catch(function (err) {
      console.warn('Inbox replies: using defaults', err);
      return cache;
    }).then(function (c) { loading = null; return c; });
    return loading;
  }

  function savedList() {
    return cache.saved && cache.saved.length ? cache.saved : DEFAULT_SAVED;
  }

  // ── Settings window ──

  function savedRowHtml(r) {
    return '<div class="ibr-saved" data-ibr-saved>' +
      '<div class="ibr-saved-top">' +
      '<input class="ibr-input" type="text" maxlength="60" placeholder="Name (e.g. Pricing overview)" aria-label="Saved reply name" value="' + esc(r.title) + '" data-ibr-title>' +
      '<button type="button" class="ibr-icon-btn" data-ibr-remove aria-label="Remove this saved reply"><ion-icon name="trash-outline" aria-hidden="true"></ion-icon></button>' +
      '</div>' +
      '<textarea class="ibr-textarea" rows="3" maxlength="1200" placeholder="Reply text. {name} = their first name." aria-label="Saved reply text" data-ibr-body>' + esc(r.body) + '</textarea>' +
      '</div>';
  }

  function close(root) {
    if (!root || !root.parentNode) return;
    document.removeEventListener('keydown', root._ibrKey, true);
    root.parentNode.removeChild(root);
    document.body.classList.remove('ibr-open');
  }

  function openSettings() {
    if (document.getElementById('ibr-root')) return;
    load(true).then(function () {
      var auto = cache.auto || DEFAULT_AUTO;
      var saved = savedList();
      var root = document.createElement('div');
      root.id = 'ibr-root';
      root.className = 'ibr';
      root.setAttribute('data-layer', 'modal');
      root.innerHTML =
        '<div class="ibr-backdrop" data-ibr-close></div>' +
        '<div class="ibr-panel" role="dialog" aria-modal="true" aria-labelledby="ibr-title">' +
        '<header class="ibr-head"><h3 class="ibr-title" id="ibr-title">Replies</h3>' +
        '<button type="button" class="ibr-icon-btn" data-ibr-close aria-label="Close"><ion-icon name="close-outline" aria-hidden="true"></ion-icon></button></header>' +
        '<div class="ibr-body has-scrollbar" data-lenis-prevent>' +
        '<section class="ibr-section">' +
        '<h4 class="ibr-h">Instant reply</h4>' +
        '<p class="ibr-help">Sent in their chat right after they use the form, once per conversation every 12 hours. <code>{name}</code> becomes their first name.</p>' +
        '<label class="ibr-check"><input type="checkbox" id="ibr-auto-on"' + (auto.enabled !== false ? ' checked' : '') + '> Send instant replies</label>' +
        '<label class="ibr-label" for="ibr-auto-contact">Contact form</label>' +
        '<textarea class="ibr-textarea" id="ibr-auto-contact" rows="4" maxlength="1200">' + esc(auto.contact) + '</textarea>' +
        '<label class="ibr-label" for="ibr-auto-hire">Hire Me form</label>' +
        '<textarea class="ibr-textarea" id="ibr-auto-hire" rows="4" maxlength="1200">' + esc(auto.hireMe) + '</textarea>' +
        '</section>' +
        '<section class="ibr-section">' +
        '<h4 class="ibr-h">Saved replies</h4>' +
        '<p class="ibr-help">Insert one from the <ion-icon name="chatbox-ellipses-outline" aria-hidden="true"></ion-icon> button in a conversation\'s reply bar, then edit before sending.</p>' +
        '<div class="ibr-saved-list" id="ibr-saved-list">' + saved.map(savedRowHtml).join('') + '</div>' +
        '<button type="button" class="ibr-add" id="ibr-add"><ion-icon name="add-outline" aria-hidden="true"></ion-icon> Add a saved reply</button>' +
        '</section>' +
        '</div>' +
        '<footer class="ibr-foot">' +
        '<button type="button" class="btn btn-secondary btn-sm" data-ibr-close>Cancel</button>' +
        '<button type="button" class="btn btn-primary btn-sm" id="ibr-save">Save</button>' +
        '</footer></div>';
      document.body.appendChild(root);
      document.body.classList.add('ibr-open');

      root._ibrKey = function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(root); } };
      document.addEventListener('keydown', root._ibrKey, true);

      root.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;
        if (t.closest('[data-ibr-close]')) { close(root); return; }
        var rm = t.closest('[data-ibr-remove]');
        if (rm) { var row = rm.closest('[data-ibr-saved]'); if (row) row.remove(); return; }
        if (t.closest('#ibr-add')) {
          var list = root.querySelector('#ibr-saved-list');
          list.insertAdjacentHTML('beforeend', savedRowHtml({ title: '', body: '' }));
          var last = list.lastElementChild && list.lastElementChild.querySelector('[data-ibr-title]');
          if (last) last.focus();
          return;
        }
        if (t.closest('#ibr-save')) save(root, t.closest('#ibr-save'));
      });

      var first = root.querySelector('#ibr-auto-contact');
      if (first) first.focus();
    });
  }

  function save(root, btn) {
    var contact = root.querySelector('#ibr-auto-contact').value.trim();
    var hireMe = root.querySelector('#ibr-auto-hire').value.trim();
    var enabled = root.querySelector('#ibr-auto-on').checked;
    if (enabled && (!contact || !hireMe)) {
      window.CwrUI.toast('Both instant replies need text (or switch instant replies off).', { tone: 'error' });
      return;
    }
    var saved = {};
    var order = 0;
    root.querySelectorAll('[data-ibr-saved]').forEach(function (row) {
      var title = row.querySelector('[data-ibr-title]').value.trim();
      var body = row.querySelector('[data-ibr-body]').value.trim();
      if (!title || !body) return;
      var id = 'r' + (order + 1) + '_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24);
      saved[id] = { title: title.slice(0, 60), body: body.slice(0, 1200), order: order++ };
    });
    var data = {
      auto: { enabled: enabled, contact: contact || DEFAULT_AUTO.contact, hireMe: hireMe || DEFAULT_AUTO.hireMe, updatedAt: Date.now() },
      saved: saved
    };
    btn.disabled = true;
    window.rtdbSet(window.rtdbRef(window.rtdb, PATH), data).then(function () {
      cache.auto = Object.assign({}, DEFAULT_AUTO, data.auto);
      cache.saved = normalizeSaved(saved);
      cache.loaded = true;
      close(root);
      window.CwrUI.toast('Replies saved.', { tone: 'success' });
    }).catch(function (err) {
      btn.disabled = false;
      window.CwrUI.toast('Could not save: ' + (err && err.message ? err.message : 'error'), { tone: 'error' });
    });
  }

  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('[data-inbox-replies-open]')) openSettings();
  });

  window.CWR_INBOX_REPLIES = {
    DEFAULT_AUTO: DEFAULT_AUTO,
    DEFAULT_SAVED: DEFAULT_SAVED,
    load: load,
    savedList: savedList,
    fill: fill,
    openSettings: openSettings
  };
  load();
})();
