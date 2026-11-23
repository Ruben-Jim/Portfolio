// Firebase App Check with reCAPTCHA v3: each request carries a token that proves it came
// from this site in a real browser, not a bot script. Visitors see nothing.
//
// Off until APP_CHECK_SITE_KEY is set. Turning it on only ATTACHES tokens; nothing is
// blocked until enforcement is switched on per product in Firebase console → App Check.
// Watch the metrics there for about a week first.
//
// Do not enforce the Realtime Database while public pages still read it over plain REST
// (care-pricing.js loadFromRest, linktree.html, scripts/lib/prices.mjs): those requests
// carry no token and would start failing. Same for Storage: project videos
// (media-url.js) play through plain <video src> URLs, which can't carry a token.
// Safe to enforce: Cloud Firestore.
//
// Every page that starts Firebase wraps initializeApp with this:
//   import { withAppCheck } from '/assets/js/app-check.js?v=…';
//   window.initializeApp = withAppCheck(initializeApp);
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js';

/**
 * reCAPTCHA v3 SITE key "reCAPTCHA CodeWithRuben" (public, safe in the page; '' = App Check off).
 * Its SECRET key never goes in code: it lives only in Firebase console → App Check →
 * Apps → web app → reCAPTCHA. Not the "Identity Platform reCAPTCHA integration" keys:
 * those belong to Auth Fraud Defense.
 */
export const APP_CHECK_SITE_KEY = '6LfHNi4uAAAAAJXHCccwP3fqJI1nJDo4HFi5cbc9';

let appCheck = null;

function start(app) {
  if (appCheck || !APP_CHECK_SITE_KEY) return;
  // Only on the real site. While a token can't be had (unregistered debug token, or
  // the web app not yet registered in Firebase → App Check), Firestore stops connecting
  // altogether, so localhost runs without App Check. Once Firestore is ENFORCED, local
  // Firestore writes need a debug token: set self.FIREBASE_APPCHECK_DEBUG_TOKEN = true
  // here, copy the token the console prints, and add it under App Check → Manage debug tokens.
  if (!/(^|\.)rubenjimenez\.dev$/.test(location.hostname)) return;
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
    // style.css hides reCAPTCHA's floating badge, so the forms show Google's notice instead.
    document.querySelectorAll('[data-recaptcha-note]').forEach((el) => { el.hidden = false; });
  } catch (err) {
    console.warn('App Check not started:', err);
  }
}

/** initializeApp that also starts App Check on the first app. */
export function withAppCheck(initializeApp) {
  return function (options, name) {
    const app = name === undefined ? initializeApp(options) : initializeApp(options, name);
    start(app);
    return app;
  };
}

/**
 * Header for calls to our own HTTPS functions (they verify it themselves).
 * Resolves to {} when App Check is off or a token can't be had, so callers never break.
 */
window.cwrAppCheckHeaders = async function () {
  if (!appCheck) return {};
  try {
    const res = await getToken(appCheck, false);
    return res && res.token ? { 'X-Firebase-AppCheck': res.token } : {};
  } catch (err) {
    return {};
  }
};
