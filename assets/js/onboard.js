/**
 * onboard.js — First-visit language picker + cookie consent banners.
 *
 * Flow:
 *   1. If no lang preference saved → show language banner.
 *   2. Once lang is chosen → show cookie consent banner.
 *   3. Cookie choice is stored forever in localStorage.
 *   4. If GA consent was previously accepted → load GA on next visit.
 *
 * Keys used in localStorage:
 *   cwr-lang              → 'en' | 'es'   (shared with i18n.js)
 *   cwr-cookies-choice    → 'accepted' | 'declined'
 */

(function () {
  'use strict';

  var LANG_KEY   = 'cwr-lang';
  var COOKIE_KEY = 'cwr-cookies-choice';
  var SLIDE_MS   = 40; // ms before adding .is-visible (triggers CSS transition)

  /* ── GA Dynamic Loader ───────────────────────────────────────── */

  function loadGoogleAnalytics() {
    var id = window.CWR_GA_ID;
    if (!id || id === 'G-XXXXXXXXXX') return; // placeholder — no real ID yet
    if (document.getElementById('cwr-ga-script')) return; // already loaded

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', id);

    var s = document.createElement('script');
    s.id    = 'cwr-ga-script';
    s.async = true;
    s.src   = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(s);
  }

  /* ── Banner helpers ──────────────────────────────────────────── */

  function showBanner(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.hidden = false;
    // Delay so the browser paints the element before animating
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('is-visible');
      });
    });
  }

  function hideBanner(id, callback) {
    var el = document.getElementById(id);
    if (!el) { if (callback) callback(); return; }
    el.classList.remove('is-visible');
    el.addEventListener('transitionend', function done() {
      el.removeEventListener('transitionend', done);
      el.hidden = true;
      if (callback) callback();
    });
  }

  /* ── Step 1: Language pick ───────────────────────────────────── */

  window.cwrOnboardPickLang = function (lang) {
    // Use i18n.js setter if available, else fall back to localStorage
    if (typeof window.cwrSetLang === 'function') {
      window.cwrSetLang(lang);
    } else {
      localStorage.setItem(LANG_KEY, lang);
    }

    hideBanner('cwr-lang-banner', function () {
      var cookieChoice = localStorage.getItem(COOKIE_KEY);
      if (!cookieChoice) {
        // Re-apply translations so cookie banner text is in chosen lang
        if (typeof window.applyTranslations === 'function') {
          window.applyTranslations(lang);
        }
        setTimeout(function () { showBanner('cwr-cookie-banner'); }, 80);
      }
    });
  };

  /* ── Step 2: Cookie choice ───────────────────────────────────── */

  window.cwrOnboardCookieChoice = function (accepted) {
    localStorage.setItem(COOKIE_KEY, accepted ? 'accepted' : 'declined');
    hideBanner('cwr-cookie-banner');
    if (accepted) {
      loadGoogleAnalytics();
    }
  };

  /* ── Init on DOM ready ───────────────────────────────────────── */

  function init() {
    var savedLang   = localStorage.getItem(LANG_KEY);
    var cookieChoice = localStorage.getItem(COOKIE_KEY);

    // If GA was previously accepted, load it now
    if (cookieChoice === 'accepted') {
      loadGoogleAnalytics();
    }

    if (!savedLang) {
      // First visit — show language picker first
      showBanner('cwr-lang-banner');
    } else if (!cookieChoice) {
      // Lang already set but cookie choice never made
      // Re-apply translations so text matches saved lang
      if (typeof window.applyTranslations === 'function') {
        window.applyTranslations(savedLang);
      }
      showBanner('cwr-cookie-banner');
    }
    // If both are set — do nothing (returning visitor)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
