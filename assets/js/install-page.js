/* global window, document */
/**
 * Public app-install page: /get/<projectId>
 *
 * Sent by a client (e.g. proCleaning) to their own crew so they can install the
 * staff app. Deliberately NOT the client portal — that is token-gated and shows
 * invoices, contracts and milestones, none of which crew should see.
 *
 * Reads a PROJECTION node (agencyInstallPages/<id>) holding only the fields this
 * page needs. It falls back to agencyProjects/<id>, which is world-readable
 * today, so the page works before the projection rules are deployed — see the
 * security note in the README block at the bottom of this file.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function absoluteUrl(raw) {
    var url = String(raw || '').trim();
    if (!url) return '';
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url.replace(/^\/+/, '');
    try {
      var parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
      return parsed.href;
    } catch (e) {
      return '';
    }
  }

  var STORE_BADGES = [
    {
      key: 'appStoreUrl',
      name: 'App Store',
      src: 'https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg',
      cls: 'client-portal-store-badge--apple'
    },
    {
      key: 'playStoreUrl',
      name: 'Google Play',
      src: 'https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png',
      cls: 'client-portal-store-badge--play'
    }
  ];

  /** Same rule as the portal: both badges render, an unset one is disabled. */
  function renderStoreBadges(record) {
    return (
      '<div class="client-portal-store-badges install-page-badges">' +
      STORE_BADGES.map(function (badge) {
        var url = absoluteUrl(record && record[badge.key]);
        var img =
          '<img src="' +
          esc(badge.src) +
          '" alt="' +
          esc(url ? 'Get it on ' + badge.name : badge.name + ' — not published yet') +
          '">';
        if (!url) {
          return (
            '<span class="client-portal-store-badge ' +
            badge.cls +
            ' is-disabled" aria-disabled="true" title="' +
            esc(badge.name + ' — coming soon') +
            '">' +
            img +
            '</span>'
          );
        }
        return (
          '<a class="client-portal-store-badge ' +
          badge.cls +
          '" href="' +
          esc(url) +
          '" target="_blank" rel="noopener noreferrer">' +
          img +
          '</a>'
        );
      }).join('') +
      '</div>'
    );
  }

  function getProjectId() {
    var params = new URLSearchParams(location.search);
    var fromQuery = params.get('id');
    if (fromQuery) return fromQuery.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    var parts = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
    var idx = parts.indexOf('get');
    if (idx >= 0 && parts[idx + 1] && parts[idx + 1] !== 'get.html') {
      return parts[idx + 1].replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
    }
    return '';
  }

  function initFirebase() {
    var cfg = window.FIREBASE_CONFIG;
    if (!cfg || typeof window.initializeApp !== 'function' || typeof window.getDatabase !== 'function') {
      return false;
    }
    try {
      var app = window.initializeApp(cfg);
      window.rtdb = window.getDatabase(app);
      return !!window.rtdb;
    } catch (e) {
      console.error(e);
      return false;
    }
  }

  async function readRecord(id) {
    // Projection first — it exposes only what this page shows.
    try {
      var snap = await window.rtdbGet(
        window.rtdbRef(window.rtdb, 'agencyInstallPages/' + id)
      );
      if (snap.exists()) return snap.val();
    } catch (e) {
      /* projection not deployed yet — fall through */
    }
    var hub = await window.rtdbGet(window.rtdbRef(window.rtdb, 'agencyProjects/' + id));
    if (!hub.exists()) return null;
    var row = hub.val() || {};
    // Only lift the public-safe fields, whatever else the hub node contains.
    return {
      clientName: row.clientName || '',
      title: row.title || '',
      expoUrl: row.expoUrl || '',
      appStoreUrl: row.appStoreUrl || '',
      playStoreUrl: row.playStoreUrl || ''
    };
  }

  function renderError(inner, message) {
    inner.innerHTML =
      '<div class="install-page-card">' +
      '<h1 class="install-page-title">Link not found</h1>' +
      '<p class="install-page-lead">' +
      esc(message) +
      '</p></div>';
  }

  function render(inner, record) {
    var name = record.clientName || record.title || 'Your team app';
    var webUrl = absoluteUrl(record.expoUrl);
    inner.innerHTML =
      '<div class="install-page-card">' +
      '<p class="install-page-kicker">Install the app</p>' +
      '<h1 class="install-page-title">' +
      esc(name) +
      '</h1>' +
      '<p class="install-page-lead">Tap your device below to download and sign in with the account your manager set up.</p>' +
      renderStoreBadges(record) +
      (webUrl
        ? '<p class="install-page-web"><a href="' +
          esc(webUrl) +
          '" target="_blank" rel="noopener noreferrer">Or open the web version &rarr;</a></p>'
        : '') +
      '<div class="install-page-share">' +
      '<button type="button" class="btn btn-secondary" id="install-copy-btn">Copy this link</button>' +
      '<span class="install-page-share-status" id="install-copy-status" role="status" aria-live="polite"></span>' +
      '</div>' +
      '</div>';

    var copyBtn = document.getElementById('install-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var status = document.getElementById('install-copy-status');
        var done = function (msg) {
          if (status) status.textContent = msg;
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard
            .writeText(location.href)
            .then(function () {
              done('Copied');
            })
            .catch(function () {
              done('Press and hold the address bar to copy');
            });
        } else {
          done('Press and hold the address bar to copy');
        }
      });
    }
  }

  async function start() {
    var inner = document.getElementById('install-page-inner');
    if (!inner) return;
    var id = getProjectId();
    if (!id) {
      renderError(inner, 'This install link is missing its project reference.');
      return;
    }
    if (!initFirebase()) {
      renderError(inner, 'Could not connect. Try again in a moment.');
      return;
    }
    try {
      var record = await readRecord(id);
      if (!record) {
        renderError(inner, 'This install link is no longer active. Ask your manager for a new one.');
        return;
      }
      render(inner, record);
      document.title = (record.clientName || 'Install the app') + ' — Install';
    } catch (err) {
      console.error(err);
      renderError(inner, 'Could not load this page. Try again in a moment.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
