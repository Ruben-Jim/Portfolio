/**
 * Admin on phones (≤767px): bottom tabs Overview · Inbox · CRM · Content · More.
 *
 * - Each tab is a group of admin sections, shown as chips pinned to the top of the
 *   content; a tab reopens the section you last used in it.
 * - More opens a grid sheet (Pricing, Referrals, Documents, Studio Costs, Ops).
 * - Badges: totals on tabs, split per chip (from the Overview's counts, 'cwrAdminBadges').
 * - One round + button per section runs that section's main "add" button.
 * - Wide admin tables become cards (cells get data-label from their column header).
 * - Long-press a tab to rearrange Inbox / CRM / Content.
 *
 * Desktop and tablet keep the side menu. The old phone bar (script.js
 * initAdminMobileTabBarOrder + the CRM/Content subtab bars) is hidden while this runs.
 * Navigation goes through window.adminActivateTab. Admin-only: loaded via loadAdminBundle.
 */
(function () {
  'use strict';
  if (window.CWR_ADMIN_MOBILE_NAV) return; // loaded once

  var MQ = '(max-width: 767px)';
  var LAST_KEY = 'adminMobileNavLast';
  var ORDER_KEY = 'adminMobileNavOrder';

  var GROUPS = {
    overview: { label: 'Overview', icon: 'grid-outline', iconOn: 'grid', tabs: [['overview', 'Overview']] },
    inbox: { label: 'Inbox', icon: 'chatbubbles-outline', iconOn: 'chatbubbles', tabs: [['messages', 'Messages'], ['email', 'Email']] },
    crm: {
      label: 'CRM', icon: 'people-outline', iconOn: 'people',
      tabs: [['pipeline', 'Pipeline'], ['prospects', 'Prospects'], ['outreach', 'Outreach'], ['client-projects', 'Clients'], ['planner', 'Planner']]
    },
    content: {
      label: 'Content', icon: 'folder-open-outline', iconOn: 'folder-open',
      tabs: [['portfolio', 'Portfolio'], ['testimonials', 'Reviews'], ['linktree', 'Link Tree'], ['instagram', 'Instagram'],
        ['post-builder', 'Post Builder'], ['blog', 'Blog'], ['social-proof', 'Social Proof']]
    },
    more: {
      label: 'More', icon: 'apps-outline', iconOn: 'apps',
      tabs: [['pricing', 'Pricing'], ['referrals', 'Referrals'], ['docs', 'Documents'], ['studio-costs', 'Studio Costs'], ['ops', 'Ops Manual']]
    }
  };
  var MORE_ICONS = { pricing: 'pricetags-outline', referrals: 'people-circle-outline', docs: 'document-text-outline', 'studio-costs': 'wallet-outline', ops: 'book-outline' };
  var MIDDLE_DEFAULT = ['inbox', 'crm', 'content'];

  // The section's main action. The + button clicks this (the original header button
  // is hidden on phones; see .amn-on rules in style.css).
  var ADD_ACTIONS = {
    email: { sel: '#admin-email-compose-btn', label: 'New email' },
    pipeline: { sel: '#admin-add-lead-btn', label: 'Add lead' },
    prospects: { sel: '#admin-panel-prospects [data-act="toggle-add"]', label: 'Add prospect' },
    'client-projects': { sel: '#client-projects-add-btn', label: 'Add client' },
    planner: { sel: '#tc-open-add-drawer', label: 'Add to planner' },
    docs: { sel: '#business-doc-create-btn', label: 'New document' },
    portfolio: { sel: '#admin-add-portfolio-btn', label: 'Add project' },
    blog: { sel: '#admin-add-blog-btn', label: 'New post' },
    testimonials: { sel: '#admin-review-add-btn', label: 'Add review' },
    'social-proof': { sel: '#admin-social-proof-add-btn', label: 'Add social proof' },
    'post-builder': { sel: '#admin-panel-post-builder [data-lib="new"]', label: 'New design' },
    referrals: { sel: '#referral-add-btn', label: 'Add partner' },
    'studio-costs': { sel: '#studio-cost-add-btn', label: 'Add cost' },
    ops: { sel: '#ops-doc-add-btn', label: 'Add document' }
  };

  // Admin tables that become cards on phones.
  var CARD_TABLES = '#admin-dashboard-content table.referral-table, #admin-dashboard-content table.outreach-stats-table';

  var state = { on: false, tab: 'overview', badges: {}, built: false };
  var els = {};

  function read(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function middleOrder() {
    var saved = read(ORDER_KEY, null);
    if (Array.isArray(saved) && saved.length === 3 && MIDDLE_DEFAULT.every(function (g) { return saved.indexOf(g) >= 0; })) return saved;
    return MIDDLE_DEFAULT.slice();
  }
  function barOrder() { return ['overview'].concat(middleOrder(), ['more']); }

  function groupOf(tabId) {
    var found = 'more';
    Object.keys(GROUPS).forEach(function (g) {
      if (GROUPS[g].tabs.some(function (t) { return t[0] === tabId; })) found = g;
    });
    return found;
  }

  function activeTabId() {
    var panel = document.querySelector('#admin-tabs .admin-tab-panel.is-active');
    return (panel && panel.getAttribute('data-admin-tab')) || 'overview';
  }

  function shouldRun() {
    if (!window.matchMedia(MQ).matches) return false;
    if (!document.body.classList.contains('admin-page-active')) return false;
    var article = document.querySelector('article.admin[data-page="admin"]');
    var dash = document.getElementById('admin-dashboard-content');
    return !!(article && article.getAttribute('data-admin-auth') === 'signed-in' && dash && dash.style.display !== 'none');
  }

  // ── Badges ──
  // detail: { messages, pipeline, prospects, tickets } from renderAdminOverview.
  function chipCount(tabId) {
    var b = state.badges || {};
    if (tabId === 'messages') return Number(b.messages) || 0;
    if (tabId === 'pipeline') return Number(b.pipeline) || 0;
    if (tabId === 'prospects') return Number(b.prospects) || 0;
    if (tabId === 'client-projects') return Number(b.tickets) || 0;
    return 0;
  }
  function groupCount(g) {
    return GROUPS[g].tabs.reduce(function (sum, t) { return sum + chipCount(t[0]); }, 0);
  }
  function badgeHtml(n) {
    return n > 0 ? '<span class="amn-badge">' + (n > 99 ? '99+' : n) + '</span>' : '';
  }

  // ── Build ──
  function build() {
    if (state.built) return;
    state.built = true;

    els.bar = document.createElement('nav');
    els.bar.className = 'amn-bar';
    els.bar.id = 'amn-bar';
    els.bar.setAttribute('aria-label', 'Admin sections');
    document.body.appendChild(els.bar);

    els.chips = document.createElement('div');
    els.chips.className = 'amn-chips';
    els.chips.id = 'amn-chips';
    els.chips.setAttribute('role', 'tablist');

    els.fab = document.createElement('button');
    els.fab.type = 'button';
    els.fab.className = 'amn-fab';
    els.fab.id = 'amn-fab';
    els.fab.setAttribute('data-float', '');
    els.fab.innerHTML = '<ion-icon name="add" aria-hidden="true"></ion-icon>';
    els.fab.hidden = true;
    document.body.appendChild(els.fab);

    els.bar.addEventListener('click', onBarClick);
    els.chips.addEventListener('click', onChipClick);
    els.fab.addEventListener('click', onFabClick);
    bindLongPress();
  }

  function renderBar() {
    var activeGroup = groupOf(state.tab);
    els.bar.innerHTML = barOrder().map(function (g) {
      var def = GROUPS[g];
      var on = g === activeGroup;
      return '<button type="button" class="amn-tab' + (on ? ' is-on' : '') + '" data-amn-group="' + g + '"' +
        (on ? ' aria-current="page"' : '') + '>' +
        '<span class="amn-tab-icon"><ion-icon name="' + (on ? def.iconOn : def.icon) + '" aria-hidden="true"></ion-icon>' +
        (g === 'more' ? '' : badgeHtml(groupCount(g))) + '</span>' +
        '<span class="amn-tab-label">' + def.label + '</span></button>';
    }).join('');
  }

  function renderChips() {
    var g = groupOf(state.tab);
    var def = GROUPS[g];
    var panels = document.querySelector('#admin-tabs .admin-tab-panels');
    if (!panels || !panels.parentNode) return;
    // Just above the panels (not inside: the panels container orders its children).
    if (els.chips.nextSibling !== panels) panels.parentNode.insertBefore(els.chips, panels);
    // Overview has a single section: no chip row.
    els.chips.hidden = def.tabs.length < 2;
    els.chips.innerHTML = def.tabs.map(function (t) {
      var on = t[0] === state.tab;
      return '<button type="button" class="amn-chip' + (on ? ' is-on' : '') + '" role="tab" aria-selected="' + on + '" data-amn-tab="' + t[0] + '">' +
        esc(t[1]) + badgeHtml(chipCount(t[0])) + '</button>';
    }).join('');
    var on = els.chips.querySelector('.is-on');
    if (on && on.scrollIntoView) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function renderFab() {
    var action = ADD_ACTIONS[state.tab];
    var target = action && document.querySelector(action.sel);
    els.fab.hidden = !target;
    if (target) {
      els.fab.setAttribute('aria-label', action.label);
      els.fab.title = action.label;
    }
  }

  function render() {
    if (!state.on) return;
    renderBar();
    renderChips();
    renderFab();
  }

  // ── Actions ──
  function go(tabId) {
    if (typeof window.adminActivateTab === 'function') window.adminActivateTab(tabId);
    window.scrollTo({ top: 0 });
  }

  function onBarClick(e) {
    if (Date.now() < (state.suppressUntil || 0)) return;
    var btn = e.target.closest('[data-amn-group]');
    if (!btn) return;
    var g = btn.getAttribute('data-amn-group');
    if (g === 'more') { openMoreSheet(); return; }
    var last = read(LAST_KEY, {});
    var tabs = GROUPS[g].tabs.map(function (t) { return t[0]; });
    var target = tabs.indexOf(last[g]) >= 0 ? last[g] : tabs[0];
    // Tapping the tab you're already in jumps back to its top.
    if (groupOf(state.tab) === g) { window.scrollTo({ top: 0, behavior: 'smooth' }); if (target === state.tab) return; }
    go(target);
  }

  function onChipClick(e) {
    var chip = e.target.closest('[data-amn-tab]');
    if (chip) go(chip.getAttribute('data-amn-tab'));
  }

  function onFabClick() {
    var action = ADD_ACTIONS[state.tab];
    var target = action && document.querySelector(action.sel);
    if (target) target.click();
  }

  // ── More sheet ──
  function openMoreSheet() {
    closeMoreSheet();
    var root = document.createElement('div');
    root.className = 'amn-sheet';
    root.id = 'amn-more';
    root.setAttribute('data-layer', 'drawer');
    root.innerHTML =
      '<div class="amn-sheet-backdrop" data-amn-close></div>' +
      '<div class="amn-sheet-panel" role="dialog" aria-modal="true" aria-label="More admin sections">' +
      '<span class="amn-sheet-grab" aria-hidden="true"></span>' +
      '<div class="amn-grid">' +
      GROUPS.more.tabs.map(function (t) {
        return '<button type="button" class="amn-app' + (t[0] === state.tab ? ' is-on' : '') + '" data-amn-tab="' + t[0] + '">' +
          '<span class="amn-app-icon"><ion-icon name="' + (MORE_ICONS[t[0]] || 'ellipse-outline') + '" aria-hidden="true"></ion-icon></span>' +
          '<span class="amn-app-label">' + esc(t[1]) + '</span></button>';
      }).join('') +
      '</div>' +
      '<p class="amn-sheet-hint">Tip: hold a tab in the bottom bar to rearrange Inbox, CRM and Content.</p>' +
      '</div>';
    document.body.appendChild(root);
    document.body.classList.add('cwr-overlay-open', 'amn-sheet-open');
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-amn-close]')) { closeMoreSheet(); return; }
      var app = e.target.closest('[data-amn-tab]');
      if (app) { closeMoreSheet(); go(app.getAttribute('data-amn-tab')); }
    });
    root._key = function (e) { if (e.key === 'Escape') closeMoreSheet(); };
    document.addEventListener('keydown', root._key);
    var first = root.querySelector('.amn-app');
    if (first) first.focus();
  }

  function closeMoreSheet() {
    var root = document.getElementById('amn-more') || document.getElementById('amn-arrange');
    if (!root) return;
    document.removeEventListener('keydown', root._key);
    root.remove();
    document.body.classList.remove('amn-sheet-open');
    if (!document.querySelector('[data-layer].is-open, .admin-contact-detail.is-open')) document.body.classList.remove('cwr-overlay-open');
  }

  // ── Rearrange (long-press a tab) ──
  function bindLongPress() {
    var timer = null;
    els.bar.addEventListener('pointerdown', function (e) {
      if (!e.target.closest('[data-amn-group]')) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.suppressUntil = Date.now() + 700;
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
        openArrangeSheet();
      }, 520);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      els.bar.addEventListener(ev, function () { clearTimeout(timer); });
    });
    els.bar.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function openArrangeSheet() {
    closeMoreSheet();
    var order = middleOrder();
    var root = document.createElement('div');
    root.className = 'amn-sheet';
    root.id = 'amn-arrange';
    root.setAttribute('data-layer', 'drawer');
    function rowsHtml() {
      return order.map(function (g, i) {
        return '<li class="amn-arrange-row"><ion-icon name="' + GROUPS[g].icon + '" aria-hidden="true"></ion-icon>' +
          '<span>' + GROUPS[g].label + '</span>' +
          '<button type="button" class="amn-arrow" data-amn-move="' + i + ':-1" aria-label="Move ' + GROUPS[g].label + ' left"' + (i === 0 ? ' disabled' : '') + '><ion-icon name="chevron-up" aria-hidden="true"></ion-icon></button>' +
          '<button type="button" class="amn-arrow" data-amn-move="' + i + ':1" aria-label="Move ' + GROUPS[g].label + ' right"' + (i === order.length - 1 ? ' disabled' : '') + '><ion-icon name="chevron-down" aria-hidden="true"></ion-icon></button></li>';
      }).join('');
    }
    root.innerHTML =
      '<div class="amn-sheet-backdrop" data-amn-close></div>' +
      '<div class="amn-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="amn-arrange-title">' +
      '<span class="amn-sheet-grab" aria-hidden="true"></span>' +
      '<h3 class="amn-sheet-title" id="amn-arrange-title">Arrange tabs</h3>' +
      '<p class="amn-sheet-hint">Overview stays first and More stays last. Top of this list = left on the bar.</p>' +
      '<ul class="amn-arrange">' + rowsHtml() + '</ul>' +
      '<button type="button" class="btn btn-primary amn-done" data-amn-close>Done</button>' +
      '</div>';
    document.body.appendChild(root);
    document.body.classList.add('cwr-overlay-open', 'amn-sheet-open');
    root.addEventListener('click', function (e) {
      var mv = e.target.closest('[data-amn-move]');
      if (mv) {
        var parts = mv.getAttribute('data-amn-move').split(':');
        var i = Number(parts[0]);
        var j = i + Number(parts[1]);
        if (j < 0 || j >= order.length) return;
        var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        write(ORDER_KEY, order);
        root.querySelector('.amn-arrange').innerHTML = rowsHtml();
        renderBar();
        return;
      }
      if (e.target.closest('[data-amn-close]')) closeMoreSheet();
    });
    root._key = function (e) { if (e.key === 'Escape') closeMoreSheet(); };
    document.addEventListener('keydown', root._key);
  }

  // ── Tables → cards ──
  function labelTables() {
    document.querySelectorAll(CARD_TABLES).forEach(function (table) {
      table.classList.add('amn-card-table');
      var heads = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
      if (!heads.length) return;
      table.querySelectorAll('tbody tr').forEach(function (tr) {
        Array.prototype.forEach.call(tr.children, function (td, i) {
          if (!td.hasAttribute('data-label') && heads[i]) td.setAttribute('data-label', heads[i]);
        });
      });
    });
  }

  // ── Wiring ──
  function sync() {
    var run = shouldRun();
    if (run !== state.on) {
      state.on = run;
      document.body.classList.toggle('amn-on', run);
      if (run) build();
      if (els.bar) els.bar.hidden = !run;
      if (els.chips) els.chips.hidden = !run;
      if (els.fab && !run) els.fab.hidden = true;
      if (!run) closeMoreSheet();
    }
    if (!run) return;
    var tab = activeTabId();
    var changed = tab !== state.tab || !state.rendered;
    if (tab !== state.tab) {
      state.tab = tab;
      var last = read(LAST_KEY, {});
      last[groupOf(tab)] = tab;
      write(LAST_KEY, last);
    }
    if (changed) {
      state.rendered = true;
      render();
      labelTables();
    } else {
      renderFab(); // a section's add button can appear after its data loads
    }
  }

  var labelTimer = null;
  function scheduleLabelTables() {
    if (!state.on) return;
    clearTimeout(labelTimer);
    labelTimer = setTimeout(labelTables, 200);
  }

  var scheduled = false;
  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(function () { scheduled = false; sync(); });
  }

  function init() {
    var panels = document.querySelector('#admin-tabs .admin-tab-panels');
    if (panels) {
      // Which section is active: only the panels' own class changes matter.
      var panelObserver = new MutationObserver(function (records) {
        if (records.some(function (r) { return r.target.classList && r.target.classList.contains('admin-tab-panel'); })) scheduleSync();
      });
      panelObserver.observe(panels, { attributes: true, attributeFilter: ['class'], subtree: true });
    }
    // Tables are re-rendered by their sections; re-label them shortly after.
    ['admin-panel-referrals', 'admin-panel-studio-costs', 'admin-panel-outreach', 'admin-panel-prospects'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) new MutationObserver(scheduleLabelTables).observe(el, { childList: true, subtree: true });
    });
    new MutationObserver(scheduleSync).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    var article = document.querySelector('article.admin[data-page="admin"]');
    if (article) new MutationObserver(scheduleSync).observe(article, { attributes: true, attributeFilter: ['data-admin-auth'] });
    var dash = document.getElementById('admin-dashboard-content');
    if (dash) new MutationObserver(scheduleSync).observe(dash, { attributes: true, attributeFilter: ['style'] });
    window.matchMedia(MQ).addEventListener('change', scheduleSync);
    document.addEventListener('cwrAdminBadges', function (e) {
      state.badges = (e && e.detail) || {};
      if (state.on) { renderBar(); renderChips(); }
    });
    if (window.CwrAdminBadges) state.badges = window.CwrAdminBadges;
    sync();
  }

  window.CWR_ADMIN_MOBILE_NAV = { GROUPS: GROUPS, ADD_ACTIONS: ADD_ACTIONS, groupOf: groupOf, sync: scheduleSync };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
