/*
 * Kit store gate: while the store runs on the Stripe TEST key (CWR_KITS.isOpen() false),
 * the /kits pages show only to the signed-in admin (same Google sign-in as /admin, same
 * browser). Everyone else sees a short "coming soon" page. Switching the catalog to the
 * pk_live_ key opens the store with no other change.
 *
 * Load order in each kit page's <head>: config.js, kits-catalog.js, then this file, so the
 * page is hidden before it paints. createKitCheckout enforces the same rule on the server.
 */
(function () {
  var C = window.CWR_KITS;
  var html = document.documentElement;
  if (!C || C.isOpen()) return;

  html.classList.add('kits-locked');
  var settled = false;

  var style = document.createElement('style');
  style.textContent =
    'html.kits-locked body > *:not(.kits-soon){visibility:hidden}' +
    'html.kits-soon-on body > *:not(.kits-soon){display:none!important}' +
    '.kits-soon{min-height:100vh;display:grid;place-items:center;padding:24px max(20px,env(safe-area-inset-left,0px));' +
    'font-family:Poppins,system-ui,sans-serif;color:#f4f7fb;background:#07090e;' +
    'background-image:radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px);background-size:22px 22px}' +
    '.kits-soon[hidden]{display:none}' +
    '.kits-soon-card{max-width:520px;display:grid;gap:14px}' +
    '.kits-soon a.home{color:#9aa3b2;text-decoration:none;font-size:14px}' +
    '.kits-soon b.label{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:hsl(45,54%,58%)}' +
    '.kits-soon h1{margin:0;font-size:clamp(28px,6vw,40px);line-height:1.15;letter-spacing:-.02em}' +
    '.kits-soon p{margin:0;color:#9aa3b2;line-height:1.6}' +
    '.kits-soon a.cta{justify-self:start;display:inline-flex;align-items:center;min-height:50px;padding:0 22px;border-radius:999px;' +
    'background:hsl(45,54%,58%);color:#12100a;font-weight:600;text-decoration:none;margin-top:6px}' +
    '.kits-soon a:focus-visible{outline:2px solid hsl(45,54%,58%);outline-offset:3px}';
  document.head.appendChild(style);

  /** The kit this page is about: /kits/<page> or ?kit=<id>; null on /kits. */
  function currentKit() {
    var q = new URLSearchParams(location.search).get('kit');
    if (q && C.get(q)) return C.get(q);
    var path = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '');
    for (var id in C.kits) {
      if (Object.prototype.hasOwnProperty.call(C.kits, id) && C.kits[id].page === path) return C.kits[id];
    }
    return null;
  }

  function open(user) {
    if (settled) return;
    settled = true;
    // The checkout sends this to createKitCheckout, which only takes admin calls in test mode.
    window.CWR_KITS_ADMIN_TOKEN = function () { return user.getIdToken(); };
    html.classList.remove('kits-locked');
  }

  function comingSoon() {
    if (settled) return;
    settled = true;
    var kit = currentKit();
    var box = document.createElement('main');
    box.className = 'kits-soon';
    box.innerHTML =
      '<div class="kits-soon-card">' +
      '<a class="home" href="/">← CodeWithRuben</a>' +
      '<b class="label">Template kits</b>' +
      '<h1></h1><p></p>' +
      '<a class="cta" href="/contact">Message me to get it early</a>' +
      '</div>';
    box.querySelector('h1').textContent = kit ? kit.name + ' is coming soon.' : 'Template kits are coming soon.';
    box.querySelector('p').textContent = kit
      ? (kit.tagline ? kit.tagline + '. ' : '') + 'The store opens shortly. Send me a message and I\'ll let you know the day it does.'
      : 'Finished app templates for iOS, Android and web. Send me a message and I\'ll let you know the day the store opens.';
    var title = (kit ? kit.name : 'Template kits') + ' · Coming soon | CodeWithRuben';
    document.title = title;
    // Page scripts that set their own title run later (the checkout): set it again after them.
    window.addEventListener('load', function () { document.title = title; });
    var place = function () {
      document.body.insertBefore(box, document.body.firstChild);
      html.classList.add('kits-soon-on');
      html.classList.remove('kits-locked');
    };
    if (document.body) place(); else document.addEventListener('DOMContentLoaded', place);
  }

  // No answer in 6 s (offline, blocked scripts): guests get the coming-soon page.
  setTimeout(comingSoon, 6000);

  var cfg = window.FIREBASE_CONFIG;
  if (!cfg) { comingSoon(); return; }
  var V = 'https://www.gstatic.com/firebasejs/10.7.1/';
  Promise.all([import(V + 'firebase-app.js'), import(V + 'firebase-auth.js')]).then(function (mods) {
    var A = mods[0];
    var Au = mods[1];
    var app = A.getApps().length ? A.getApp() : A.initializeApp(cfg);
    var auth = Au.getAuth(app);
    // Fires once the saved sign-in (if any) is restored.
    Au.onAuthStateChanged(auth, function (user) {
      if (settled) return;
      if (!user) { comingSoon(); return; }
      user.getIdTokenResult().then(function (t) {
        var email = String(user.email || '').toLowerCase();
        var list = (window.ADMIN_ALLOWLIST_EMAILS || []).map(function (e) { return String(e).toLowerCase(); });
        var admin = t.claims.admin === true || (user.emailVerified && list.indexOf(email) !== -1);
        if (admin) open(user); else comingSoon();
      }).catch(comingSoon);
    });
  }).catch(comingSoon);
})();
