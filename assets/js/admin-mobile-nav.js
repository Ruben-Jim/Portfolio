/**
 * Admin on phones (≤767px): bottom tabs Overview · Inbox · CRM · Content · More,
 * with a section dock right above them.
 *
 * - Each tab is a group of admin sections. The dock (icon + label buttons above the
 *   tabs) switches between the group's sections; a tab reopens the section last used.
 * - More opens a grid sheet (Pricing, Referrals, Documents, Studio Costs, Ops).
 * - Badges: totals on tabs, split per dock button (Overview's counts, 'cwrAdminBadges').
 * - Optional round + button above the dock runs the section's main "add" button.
 * - Wide admin tables become cards (cells get data-label from their column header).
 * - Long-press a tab → Tab bar settings: order of Inbox / CRM / Content, hide the dock
 *   while scrolling, + button on/off (off = each section's own button comes back).
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
  var SETTINGS_KEY = 'adminMobileNavSettings';

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
  var SECTION_ICONS = {
    messages: 'chatbubble-ellipses-outline', email: 'mail-outline',
    pipeline: 'trending-up-outline', prospects: 'search-outline', outreach: 'megaphone-outline',
    'client-projects': 'briefcase-outline', planner: 'calendar-outline',
    portfolio: 'images-outline', testimonials: 'star-outline', linktree: 'link-outline', instagram: 'logo-instagram',
    'post-builder': 'color-palette-outline', blog: 'newspaper-outline', 'social-proof': 'ribbon-outline',
    pricing: 'pricetags-outline', referrals: 'people-circle-outline', docs: 'document-text-outline',
    'studio-costs': 'wallet-outline', ops: 'book-outline'
  };
  var MIDDLE_DEFAULT = ['inbox', 'crm', 'content'];
  var DEFAULT_SETTINGS = { dockAutoHide: false, fab: true };

  // The section's main action. The + button clicks this; while the + is on, the
  // original button is hidden on phones (body.amn-fab-on rules in style.css).
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

  var state = { on: false, tab: 'overview', badges: {}, built: false, rendered: false };
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

  function settings() { return Object.assign({}, DEFAULT_SETTINGS, read(SETTINGS_KEY, {})); }
  function saveSetting(key, value) {
    var s = settings();
    s[key] = value;
    write(SETTINGS_KEY, s);
    applySettings();
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
  function sectionCount(tabId) {
    var b = state.badges || {};
    if (tabId === 'messages') return Number(b.messages) || 0;
    if (tabId === 'pipeline') return Number(b.pipeline) || 0;
    if (tabId === 'prospects') return Number(b.prospects) || 0;
    if (tabId === 'client-projects') return Number(b.tickets) || 0;
    return 0;
  }
  function groupCount(g) {
    return GROUPS[g].tabs.reduce(function (sum, t) { return sum + sectionCount(t[0]); }, 0);
  }
  /** Bottom tabs: Inbox shows its number; other tabs a dot (numbers are on the dock). */
  function tabBadgeHtml(g) {
    if (g === 'more') return '';
    var n = groupCount(g);
    if (!n) return '';
    return g === 'inbox' ? badgeHtml(n) : '<span class="amn-dot" aria-label="' + n + ' need you"></span>';
  }

  function badgeHtml(n) {
    return n > 0 ? '<span class="amn-badge">' + (n > 99 ? '99+' : n) + '</span>' : '';
  }

  // ── Build ──
  function build() {
    if (state.built) return;
    state.built = true;

    els.dock = document.createElement('nav');
    els.dock.className = 'amn-dock';
    els.dock.id = 'amn-dock';
    els.dock.setAttribute('aria-label', 'Sections');
    document.body.appendChild(els.dock);

    els.bar = document.createElement('nav');
    els.bar.className = 'amn-bar';
    els.bar.id = 'amn-bar';
    els.bar.setAttribute('aria-label', 'Admin sections');
    document.body.appendChild(els.bar);

    els.fab = document.createElement('button');
    els.fab.type = 'button';
    els.fab.className = 'amn-fab';
    els.fab.id = 'amn-fab';
    els.fab.setAttribute('data-float', '');
    els.fab.innerHTML = '<ion-icon name="add" aria-hidden="true"></ion-icon>';
    els.fab.hidden = true;
    document.body.appendChild(els.fab);

    els.bar.addEventListener('click', onBarClick);
    els.dock.addEventListener('click', onDockClick);
    els.fab.addEventListener('click', onFabClick);
    bindLongPress();
    bindScrollTuck();
  }

  function renderBar() {
    var activeGroup = groupOf(state.tab);
    els.bar.innerHTML = barOrder().map(function (g) {
      var def = GROUPS[g];
      var on = g === activeGroup;
      return '<button type="button" class="amn-tab' + (on ? ' is-on' : '') + '" data-amn-group="' + g + '"' +
        (on ? ' aria-current="page"' : '') + '>' +
        '<span class="amn-tab-icon"><ion-icon name="' + (on ? def.iconOn : def.icon) + '" aria-hidden="true"></ion-icon>' +
        tabBadgeHtml(g) + '</span>' +
        '<span class="amn-tab-label">' + def.label + '</span></button>';
    }).join('');
  }

  function renderDock(centerActive) {
    var def = GROUPS[groupOf(state.tab)];
    // Overview is a single section: no dock.
    var show = def.tabs.length > 1;
    els.dock.hidden = !show;
    document.body.classList.toggle('amn-has-dock', show);
    if (!show) { els.dock.innerHTML = ''; return; }
    els.dock.classList.toggle('is-scroll', def.tabs.length > 5);
    els.dock.classList.toggle('is-few', def.tabs.length <= 3);
    els.dock.innerHTML = '<div class="amn-dock-row">' + def.tabs.map(function (t) {
      var on = t[0] === state.tab;
      return '<button type="button" class="amn-dock-btn' + (on ? ' is-on' : '') + '" data-amn-tab="' + t[0] + '"' +
        (on ? ' aria-current="page"' : '') + '>' +
        '<span class="amn-dock-icon"><ion-icon name="' + (SECTION_ICONS[t[0]] || 'ellipse-outline') + '" aria-hidden="true"></ion-icon>' +
        badgeHtml(sectionCount(t[0])) + '</span>' +
        '<span class="amn-dock-label">' + esc(t[1]) + '</span></button>';
    }).join('') + '</div>';
    if (centerActive) {
      var onBtn = els.dock.querySelector('.is-on');
      if (onBtn && onBtn.scrollIntoView) onBtn.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }

  function renderFab() {
    var action = ADD_ACTIONS[state.tab];
    var target = action && document.querySelector(action.sel);
    els.fab.hidden = !settings().fab || !target;
    if (target) {
      els.fab.setAttribute('aria-label', action.label);
      els.fab.title = action.label;
    }
  }

  function render(centerActive) {
    if (!state.on) return;
    renderBar();
    renderDock(centerActive);
    renderFab();
  }

  function applySettings() {
    var s = settings();
    document.body.classList.toggle('amn-fab-on', !!s.fab);
    if (!s.dockAutoHide) document.body.classList.remove('amn-dock-tucked');
    if (state.on) renderFab();
  }

  // ── Dock tucks away while scrolling down (setting), back on scroll up ──
  function bindScrollTuck() {
    var lastY = window.scrollY;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        var y = window.scrollY;
        var dy = y - lastY;
        lastY = y;
        if (!state.on || !settings().dockAutoHide) return;
        if (y < 60 || dy < -6) document.body.classList.remove('amn-dock-tucked');
        else if (dy > 6) document.body.classList.add('amn-dock-tucked');
      });
    }, { passive: true });
  }

  // ── Actions ──
  function go(tabId) {
    if (typeof window.adminActivateTab === 'function') window.adminActivateTab(tabId);
    document.body.classList.remove('amn-dock-tucked');
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
    if (groupOf(state.tab) === g) {
      document.body.classList.remove('amn-dock-tucked');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (target === state.tab) return;
    }
    go(target);
  }

  function onDockClick(e) {
    var btn = e.target.closest('[data-amn-tab]');
    if (btn) go(btn.getAttribute('data-amn-tab'));
  }

  function onFabClick() {
    var action = ADD_ACTIONS[state.tab];
    var target = action && document.querySelector(action.sel);
    if (target) target.click();
  }

  // ── Sheets ──
  function openSheet(id, innerHtml, onClick) {
    closeSheet();
    var root = document.createElement('div');
    root.className = 'amn-sheet';
    root.id = id;
    root.setAttribute('data-layer', 'drawer');
    root.innerHTML = '<div class="amn-sheet-backdrop" data-amn-close></div>' +
      '<div class="amn-sheet-panel" role="dialog" aria-modal="true">' +
      '<span class="amn-sheet-grab" aria-hidden="true"></span>' + innerHtml + '</div>';
    document.body.appendChild(root);
    document.body.classList.add('cwr-overlay-open', 'amn-sheet-open');
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-amn-close]')) { closeSheet(); return; }
      onClick(e, root);
    });
    root._key = function (e) { if (e.key === 'Escape') closeSheet(); };
    document.addEventListener('keydown', root._key);
    return root;
  }

  function closeSheet() {
    var root = document.querySelector('.amn-sheet');
    if (!root) return;
    document.removeEventListener('keydown', root._key);
    root.remove();
    document.body.classList.remove('amn-sheet-open');
    if (!document.querySelector('[data-layer].is-open, .admin-contact-detail.is-open')) document.body.classList.remove('cwr-overlay-open');
  }

  function openMoreSheet() {
    var root = openSheet('amn-more',
      '<div class="amn-grid">' +
      GROUPS.more.tabs.map(function (t) {
        return '<button type="button" class="amn-app' + (t[0] === state.tab ? ' is-on' : '') + '" data-amn-tab="' + t[0] + '">' +
          '<span class="amn-app-icon"><ion-icon name="' + (SECTION_ICONS[t[0]] || 'ellipse-outline') + '" aria-hidden="true"></ion-icon></span>' +
          '<span class="amn-app-label">' + esc(t[1]) + '</span></button>';
      }).join('') +
      '</div>' +
      '<div class="amn-links">' +
      '<button type="button" class="amn-link" data-amn-link="site"><ion-icon name="home-outline" aria-hidden="true"></ion-icon><span>Back to site</span></button>' +
      '<button type="button" class="amn-link amn-link--out" data-amn-link="signout"><ion-icon name="log-out-outline" aria-hidden="true"></ion-icon><span>Sign out</span></button>' +
      '</div>' +
      '<p class="amn-sheet-hint">Tip: hold any tab in the bottom bar for tab bar settings.</p>',
      function (e) {
        var app = e.target.closest('[data-amn-tab]');
        if (app) { closeSheet(); go(app.getAttribute('data-amn-tab')); return; }
        var link = e.target.closest('[data-amn-link]');
        if (!link) return;
        closeSheet();
        if (link.getAttribute('data-amn-link') === 'site') {
          if (typeof window.switchToPage === 'function') window.switchToPage('home');
          else window.location.href = '/';
          return;
        }
        // Same sign-out as the site menu's button (that menu is hidden on phones).
        var out = document.getElementById('admin-logout-btn');
        if (out) out.click();
      });
    root.querySelector('.amn-sheet-panel').setAttribute('aria-label', 'More admin sections');
    var first = root.querySelector('.amn-app');
    if (first) first.focus();
  }

  // ── Tab bar settings (long-press a tab) ──
  function bindLongPress() {
    var timer = null;
    els.bar.addEventListener('pointerdown', function (e) {
      if (!e.target.closest('[data-amn-group]')) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.suppressUntil = Date.now() + 700;
        if (navigator.vibrate) { try { navigator.vibrate(10); } catch (err) {} }
        openSettingsSheet();
      }, 520);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      els.bar.addEventListener(ev, function () { clearTimeout(timer); });
    });
    els.bar.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }

  function openSettingsSheet() {
    var order = middleOrder();
    function rowsHtml() {
      return order.map(function (g, i) {
        return '<li class="amn-arrange-row"><ion-icon name="' + GROUPS[g].icon + '" aria-hidden="true"></ion-icon>' +
          '<span>' + GROUPS[g].label + '</span>' +
          '<button type="button" class="amn-arrow" data-amn-move="' + i + ':-1" aria-label="Move ' + GROUPS[g].label + ' left"' + (i === 0 ? ' disabled' : '') + '><ion-icon name="chevron-up" aria-hidden="true"></ion-icon></button>' +
          '<button type="button" class="amn-arrow" data-amn-move="' + i + ':1" aria-label="Move ' + GROUPS[g].label + ' right"' + (i === order.length - 1 ? ' disabled' : '') + '><ion-icon name="chevron-down" aria-hidden="true"></ion-icon></button></li>';
      }).join('');
    }
    var s = settings();
    var root = openSheet('amn-settings',
      '<h3 class="amn-sheet-title" id="amn-settings-title">Tab bar settings</h3>' +
      '<p class="amn-sheet-label">Tab order</p>' +
      '<p class="amn-sheet-hint amn-sheet-hint--tight">Overview stays first and More stays last. Top of this list = left on the bar.</p>' +
      '<ul class="amn-arrange">' + rowsHtml() + '</ul>' +
      '<label class="amn-switch"><span><b>Hide dock while scrolling</b><small>Scroll down to tuck the section dock away, up to bring it back.</small></span>' +
      '<input type="checkbox" data-amn-setting="dockAutoHide"' + (s.dockAutoHide ? ' checked' : '') + '></label>' +
      '<label class="amn-switch"><span><b>Round + button</b><small>Off brings back each section\'s own add button in the page.</small></span>' +
      '<input type="checkbox" data-amn-setting="fab"' + (s.fab ? ' checked' : '') + '></label>' +
      '<button type="button" class="btn btn-primary amn-done" data-amn-close>Done</button>',
      function (e, rootEl) {
        var mv = e.target.closest('[data-amn-move]');
        if (!mv) return;
        var parts = mv.getAttribute('data-amn-move').split(':');
        var i = Number(parts[0]);
        var j = i + Number(parts[1]);
        if (j < 0 || j >= order.length) return;
        var tmp = order[i]; order[i] = order[j]; order[j] = tmp;
        write(ORDER_KEY, order);
        rootEl.querySelector('.amn-arrange').innerHTML = rowsHtml();
        renderBar();
      });
    root.querySelector('.amn-sheet-panel').setAttribute('aria-labelledby', 'amn-settings-title');
    root.addEventListener('change', function (e) {
      var key = e.target.getAttribute && e.target.getAttribute('data-amn-setting');
      if (key) saveSetting(key, e.target.checked);
    });
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

  var labelTimer = null;
  function scheduleLabelTables() {
    if (!state.on) return;
    clearTimeout(labelTimer);
    labelTimer = setTimeout(labelTables, 200);
  }

  // ── Wiring ──
  function sync() {
    var run = shouldRun();
    if (run !== state.on) {
      state.on = run;
      document.body.classList.toggle('amn-on', run);
      if (run) { build(); applySettings(); }
      if (els.bar) els.bar.hidden = !run;
      if (els.dock && !run) els.dock.hidden = true;
      if (els.fab && !run) els.fab.hidden = true;
      if (!run) { closeSheet(); document.body.classList.remove('amn-has-dock', 'amn-dock-tucked'); }
      state.rendered = false;
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
      render(true);
      labelTables();
    } else {
      renderFab(); // a section's add button can appear after its data loads
    }
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
      new MutationObserver(function (records) {
        if (records.some(function (r) { return r.target.classList && r.target.classList.contains('admin-tab-panel'); })) scheduleSync();
      }).observe(panels, { attributes: true, attributeFilter: ['class'], subtree: true });
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
      if (state.on) { renderBar(); renderDock(false); }
    });
    if (window.CwrAdminBadges) state.badges = window.CwrAdminBadges;
    sync();
  }

  window.CWR_ADMIN_MOBILE_NAV = { GROUPS: GROUPS, ADD_ACTIONS: ADD_ACTIONS, groupOf: groupOf, sync: scheduleSync };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
