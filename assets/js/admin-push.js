/**
 * Admin → Overview → Phone notifications, and the home-screen admin app.
 *
 * - On /admin only: adds the "CWR Admin" manifest, so Share → Add to Home
 *   Screen installs admin full screen (the public site never offers it).
 * - Turn on for this device: asks permission, registers /admin-sw.js (scope
 *   /admin), gets an FCM Web Push token and saves it at
 *   adminPushDevices/<device id>. Cloud Functions (functions/admin-push.js)
 *   send to every saved device; adminPushPrefs holds the per-type switches.
 * - Tapping a notification lands on /admin?open=<kind>&id=… (or, with admin
 *   already open, admin-sw.js posts the link here) and openFromLink opens it.
 * Exposed as window.CwrAdminPush.
 */
(function (global) {
  'use strict';

  var doc = global.document;
  var nav = global.navigator;
  // Firebase console → Cloud Messaging → Web Push certificates (public half).
  var VAPID_KEY = 'BJNO4b9KxXdp_BeaZAu538bvjLUsgZKkgWJue0_8cZHbt7MQ3_NGZpeDOGomd7t6-UuP5746cz2gsqDWBPV5Vt0';
  var SDK = 'https://www.gstatic.com/firebasejs/10.7.1/';
  var SW_URL = '/admin-sw.js';
  var SCOPE = '/admin';
  var DEVICE_KEY = 'cwrAdminPushDevice';
  var PREFS = [
    { key: 'messages', label: 'Messages & email', hint: 'DMs, Hire Me, contact form, email to contact@, bounced emails' },
    { key: 'bookings', label: 'Bookings', hint: 'A call booked through Schedule' },
    { key: 'portal', label: 'Client portal', hint: 'New ticket, ticket reply, contract signed, care plan request' },
    { key: 'reviews', label: 'Reviews', hint: 'A review sent from the review form' },
    { key: 'daily', label: 'Morning reminder', hint: '8:00 AM: follow-ups due and renewals this week' }
  ];
  var TAB_FOR = {
    conversation: 'messages',
    email: 'email',
    booking: 'planner',
    client: 'client-projects',
    review: 'testimonials',
    overview: 'overview'
  };

  var state = { devices: {}, prefs: {}, busy: false, started: false, refreshed: false };

  // ── helpers ──

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function toast(msg, tone) {
    if (global.CwrUI) global.CwrUI.toast(msg, tone ? { tone: tone } : undefined);
  }

  function ref(path) {
    return global.rtdbRef(global.rtdb, path);
  }

  function isAdminPath() {
    return /^\/admin(\/|$)/.test(global.location.pathname);
  }

  function isIos() {
    return /iPhone|iPad|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  }

  function isStandalone() {
    return nav.standalone === true || !!(global.matchMedia && global.matchMedia('(display-mode: standalone)').matches);
  }

  /** 'ok' | 'ios-browser' (add to Home Screen first) | 'blocked' | 'unsupported' */
  function support() {
    if (!('serviceWorker' in nav) || !global.PushManager || !('Notification' in global)) {
      return isIos() && !isStandalone() ? 'ios-browser' : 'unsupported';
    }
    return global.Notification.permission === 'denied' ? 'blocked' : 'ok';
  }

  function deviceLabel() {
    var ua = nav.userAgent;
    var device = /iPhone/.test(ua) ? 'iPhone'
      : /iPad/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1) ? 'iPad'
      : /Android/.test(ua) ? 'Android'
      : /Mac/.test(ua) ? 'Mac'
      : /Windows/.test(ua) ? 'Windows'
      : 'Computer';
    var browser = /Edg\//.test(ua) ? 'Edge'
      : /Chrome\//.test(ua) ? 'Chrome'
      : /Firefox\//.test(ua) ? 'Firefox'
      : /Safari\//.test(ua) ? 'Safari'
      : 'Browser';
    return device + ' · ' + (isStandalone() ? 'Home Screen app' : browser);
  }

  function localDeviceId(create) {
    var id = '';
    try { id = global.localStorage.getItem(DEVICE_KEY) || ''; } catch (e) {}
    if (!id && create) {
      id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try { global.localStorage.setItem(DEVICE_KEY, id); } catch (e) {}
    }
    return id;
  }

  function forgetLocalDevice() {
    try { global.localStorage.removeItem(DEVICE_KEY); } catch (e) {}
  }

  function thisDeviceOn() {
    var id = localDeviceId(false);
    return !!(id && state.devices[id] && global.Notification && global.Notification.permission === 'granted');
  }

  function when(ms) {
    var n = Number(ms);
    if (!n) return '';
    return new Date(n).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  // ── home-screen app ──

  function ensureManifest() {
    if (!isAdminPath() || doc.querySelector('link[rel="manifest"]')) return;
    var link = doc.createElement('link');
    link.rel = 'manifest';
    link.href = '/admin.webmanifest';
    doc.head.appendChild(link);
    [
      ['apple-mobile-web-app-title', 'CWR Admin'],
      ['apple-mobile-web-app-capable', 'yes'],
      ['mobile-web-app-capable', 'yes'],
      ['apple-mobile-web-app-status-bar-style', 'black']
    ].forEach(function (m) {
      if (doc.querySelector('meta[name="' + m[0] + '"]')) return;
      var meta = doc.createElement('meta');
      meta.name = m[0];
      meta.content = m[1];
      doc.head.appendChild(meta);
    });
  }

  // ── push ──

  var messagingPromise = null;
  function messaging() {
    if (!messagingPromise) {
      messagingPromise = Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-messaging.js')])
        .then(function (m) {
          return { api: m[1], instance: m[1].getMessaging(m[0].getApp()) };
        });
    }
    return messagingPromise;
  }

  /** The /admin worker, once it's active (getToken needs an active worker). */
  function registerWorker() {
    return nav.serviceWorker.register(SW_URL, { scope: SCOPE }).then(function (reg) {
      var w = reg.installing || reg.waiting;
      if (reg.active || !w) return reg;
      return new Promise(function (resolve) {
        w.addEventListener('statechange', function () {
          if (w.state === 'activated') resolve(reg);
        });
        setTimeout(function () { resolve(reg); }, 8000);
      });
    });
  }

  function fetchToken(reg) {
    return messaging().then(function (m) {
      return m.api.getToken(m.instance, { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    });
  }

  function enable() {
    if (state.busy) return;
    // iOS only shows the prompt when it's asked straight from the tap.
    var asked = global.Notification.requestPermission();
    state.busy = true;
    render();
    Promise.resolve(asked)
      .then(function (perm) {
        if (perm !== 'granted') {
          toast(perm === 'denied' ? 'Notifications are blocked for this device.' : 'Notifications were not turned on.', 'error');
          return null;
        }
        return registerWorker().then(fetchToken).then(function (token) {
          if (!token) throw new Error('No push token');
          var id = localDeviceId(true);
          return global.rtdbSet(ref('adminPushDevices/' + id), {
            token: token,
            label: deviceLabel(),
            createdAt: global.rtdbServerTimestamp(),
            lastSeenAt: global.rtdbServerTimestamp()
          }).then(function () {
            state.refreshed = true;
            toast('Notifications are on for this device.', 'success');
          });
        });
      })
      .catch(function (err) {
        console.error('Turn on notifications failed', err);
        toast("Couldn't turn on notifications here. Try again, or check this device's notification settings.", 'error');
      })
      .then(function () {
        state.busy = false;
        render();
      });
  }

  function removeDevice(id) {
    var mine = id === localDeviceId(false);
    var done = global.rtdbRemove(ref('adminPushDevices/' + id)).then(function () {
      if (!mine) return;
      forgetLocalDevice();
      return messaging().then(function (m) { return m.api.deleteToken(m.instance); }).catch(function () {});
    });
    done.then(function () {
      toast(mine ? 'Notifications are off for this device.' : 'Device removed.');
    }, function (err) {
      console.error('Remove push device failed', err);
      toast("Couldn't remove that device.", 'error');
    });
  }

  function setPref(key, on) {
    var patch = {};
    patch[key] = !!on;
    global.rtdbUpdate(ref('adminPushPrefs'), patch).catch(function (err) {
      console.error('Save notification switch failed', err);
      toast("Couldn't save that switch. Deploy the database rules if this is the first time.", 'error');
    });
  }

  function sendTest() {
    var r = global.rtdbPush(ref('adminPushTest'));
    global.rtdbSet(r, { requestedAt: global.rtdbServerTimestamp(), from: deviceLabel() })
      .then(function () {
        toast('Test sent. It should arrive in a few seconds.', 'success');
      }, function (err) {
        console.error('Send test push failed', err);
        toast("Couldn't send the test.", 'error');
      });
  }

  /** Keep this device's token fresh: FCM can rotate it between visits. */
  function refreshThisDevice() {
    if (state.refreshed || !thisDeviceOn() || support() !== 'ok') return;
    state.refreshed = true;
    var id = localDeviceId(false);
    registerWorker().then(fetchToken).then(function (token) {
      var patch = { lastSeenAt: global.rtdbServerTimestamp() };
      if (token && token !== state.devices[id].token) patch.token = token;
      return global.rtdbUpdate(ref('adminPushDevices/' + id), patch);
    }).catch(function (err) {
      console.warn('Refresh push token failed', err);
    });
  }

  // ── card ──

  function statusHtml(s) {
    if (s === 'ios-browser') {
      return '<p class="admin-push-status">To get notifications on this iPhone, add admin to your Home Screen first:</p>' +
        '<ol class="admin-push-steps">' +
        '<li>Tap <strong>Share</strong> in Safari.</li>' +
        '<li>Tap <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>' +
        '<li>Open <strong>CWR Admin</strong> from your Home Screen and turn notifications on here.</li>' +
        '</ol>';
    }
    if (s === 'unsupported') {
      return '<p class="admin-push-status">This browser can’t get push notifications. On iPhone, use iOS 16.4 or later and the Home Screen app.</p>';
    }
    if (s === 'blocked') {
      return '<p class="admin-push-status is-warn">Notifications are blocked for this device. On iPhone: Settings → Notifications → CWR Admin → Allow Notifications. In a browser: site settings → Notifications → Allow.</p>';
    }
    if (thisDeviceOn()) {
      return '<p class="admin-push-status is-on">On for this device.</p>' +
        '<div class="admin-push-actions"><button type="button" class="btn btn-secondary btn-sm" data-push-action="disable">Turn off for this device</button></div>';
    }
    return '<p class="admin-push-status">Get a buzz on this device when something needs you.</p>' +
      '<div class="admin-push-actions"><button type="button" class="btn btn-primary btn-sm" data-push-action="enable"' +
      (state.busy ? ' disabled' : '') + '>' + (state.busy ? 'Turning on…' : 'Turn on for this device') + '</button></div>';
  }

  function prefsHtml() {
    return '<ul class="admin-push-prefs">' + PREFS.map(function (p) {
      var on = !(state.prefs && state.prefs[p.key] === false);
      return '<li><label class="custom-switch-label">' +
        '<input type="checkbox" class="custom-switch-input" data-push-pref="' + p.key + '"' + (on ? ' checked' : '') + '>' +
        '<span class="custom-switch" aria-hidden="true"></span>' +
        '<span class="admin-push-pref-text"><span class="admin-push-pref-label">' + esc(p.label) + '</span>' +
        '<span class="admin-push-pref-hint">' + esc(p.hint) + '</span></span>' +
        '</label></li>';
    }).join('') + '</ul>';
  }

  function devicesHtml() {
    var mine = localDeviceId(false);
    var ids = Object.keys(state.devices || {}).filter(function (id) { return state.devices[id] && state.devices[id].token; });
    if (!ids.length) return '<p class="admin-push-none">No devices yet.</p>';
    return '<ul class="admin-push-devices">' + ids.map(function (id) {
      var d = state.devices[id];
      var seen = when(d.lastSeenAt || d.createdAt);
      return '<li data-push-device="' + esc(id) + '">' +
        '<span class="admin-push-device-name">' + esc(d.label || 'Device') +
        (id === mine ? ' <span class="admin-push-chip">This device</span>' : '') + '</span>' +
        (seen ? '<span class="admin-push-device-meta">Last active ' + esc(seen) + '</span>' : '') +
        '<button type="button" class="btn btn-secondary btn-sm" data-push-remove="' + esc(id) + '">Remove</button>' +
        '</li>';
    }).join('') + '</ul>' +
      '<div class="admin-push-actions"><button type="button" class="btn btn-secondary btn-sm" data-push-action="test">Send test</button></div>';
  }

  function render() {
    var card = doc.getElementById('admin-push-card');
    var body = doc.getElementById('admin-push-body');
    if (!card || !body) return;
    body.innerHTML =
      '<div class="admin-push-grid">' +
      '<div class="admin-push-col">' + statusHtml(support()) +
      '<h5 class="admin-push-subhead">Devices</h5>' + devicesHtml() + '</div>' +
      '<div class="admin-push-col"><h5 class="admin-push-subhead">Notify me about</h5>' + prefsHtml() + '</div>' +
      '</div>';
    card.hidden = false;
  }

  function bindCard() {
    var body = doc.getElementById('admin-push-body');
    if (!body || body.dataset.bound === '1') return;
    body.dataset.bound = '1';
    body.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-push-action], [data-push-remove]');
      if (!btn) return;
      var action = btn.getAttribute('data-push-action');
      if (action === 'enable') enable();
      else if (action === 'disable') removeDevice(localDeviceId(false));
      else if (action === 'test') sendTest();
      else if (btn.hasAttribute('data-push-remove')) removeDevice(btn.getAttribute('data-push-remove'));
    });
    body.addEventListener('change', function (e) {
      var input = e.target.closest('[data-push-pref]');
      if (input) setPref(input.getAttribute('data-push-pref'), input.checked);
    });
  }

  function start() {
    if (state.started) return;
    state.started = true;
    bindCard();
    render();
    global.rtdbOnValue(ref('adminPushDevices'), function (snap) {
      state.devices = snap.val() || {};
      render();
      refreshThisDevice();
    }, function (err) { console.warn('Push devices unavailable', err); });
    global.rtdbOnValue(ref('adminPushPrefs'), function (snap) {
      state.prefs = snap.val() || {};
      render();
    }, function (err) { console.warn('Push switches unavailable', err); });
  }

  function adminReady() {
    return typeof global.isAdminSession === 'function' && global.isAdminSession() &&
      !!global.rtdb && typeof global.rtdbOnValue === 'function';
  }

  /** Run fn once admin is signed in and the database is up (polls; gives up after ~10 min). */
  function whenAdmin(fn) {
    var tries = 0;
    (function check() {
      if (adminReady()) return fn();
      if (++tries < 1200) setTimeout(check, 500);
    })();
  }

  // ── links from notifications ──

  function retry(fn) {
    var tries = 0;
    (function go() {
      if (fn() || ++tries > 24) return;
      setTimeout(go, 250);
    })();
  }

  function openFromLink(url) {
    var u;
    try { u = new URL(url, global.location.origin); } catch (e) { return; }
    var q = u.searchParams;
    var kind = q.get('open');
    if (!kind) return;
    var id = q.get('id') || '';
    var tab = TAB_FOR[kind] || 'overview';
    try { global.sessionStorage.setItem('adminActiveTab', tab); } catch (e) {}
    if (typeof global.adminActivateTab === 'function') global.adminActivateTab(tab);
    if (kind === 'conversation' && id) {
      retry(function () {
        if (typeof global.openAdminDmConversation !== 'function') return false;
        global.openAdminDmConversation(id);
        return true;
      });
    } else if (kind === 'client' && id) {
      retry(function () {
        if (!global.AgencyTools || typeof global.AgencyTools.openClientProject !== 'function') return false;
        global.AgencyTools.openClientProject(id);
        return true;
      });
    } else if (kind === 'email' && q.get('from')) {
      retry(function () {
        if (typeof global.selectAdminEmailThread !== 'function') return false;
        global.selectAdminEmailThread(q.get('from'));
        return true;
      });
    }
  }

  function openStartupLink() {
    // The shell's inline loader saves it: the router rewrites the URL first.
    var link = global.__adminPushLink ||
      (/[?&]open=/.test(global.location.search) ? global.location.pathname + global.location.search : '');
    global.__adminPushLink = '';
    if (!isAdminPath() || !link) return;
    // Drop the query so a refresh doesn't open it again.
    if (global.location.search) {
      try { global.history.replaceState(global.history.state, '', global.location.pathname); } catch (e) {}
    }
    whenAdmin(function () {
      // Let admin finish restoring its last tab first, then go to the item.
      setTimeout(function () { openFromLink(link); }, 600);
    });
  }

  ensureManifest();
  if (nav.serviceWorker) {
    nav.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.type === 'cwr-push-open') openFromLink(e.data.url);
    });
  }
  openStartupLink();
  whenAdmin(start);

  global.CwrAdminPush = { openFromLink: openFromLink, render: render, VAPID_KEY: VAPID_KEY };
})(window);
