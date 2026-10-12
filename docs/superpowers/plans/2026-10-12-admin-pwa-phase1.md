# Admin Home Screen App (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/admin` installable to the iPhone/Android Home Screen as "CWR Admin", always dark, running edge to edge under the clock, and fix the top-bar tint on every page.

**Architecture:** Static assets (icons + `assets/admin.webmanifest`), one inline `<head>` script in `index.html` that owns theme + tint + admin install tags (copied to the 19 route shells by `scripts/sync-spa-shells.mjs`), a hook in `showPage` for in-page navigation, and one standalone-only CSS rule. All behavior is tested by a new `scripts/test-admin-pwa.mjs`, which `scripts/preflight.mjs` runs automatically.

**Tech Stack:** Plain HTML/CSS/ES5-style JS (no build step), Node 20+ test scripts using `node:vm`, ImageMagick (`magick`) for icons.

**Spec:** `docs/superpowers/specs/2026-10-12-admin-pwa-phase1-design.md`

## Global Constraints

- App name: `CWR Admin` (both `name` and `short_name`, and `apple-mobile-web-app-title`).
- Dark color: `#121212` (= `--smoky-black` dark, `hsl(0, 0%, 7%)`). Light color: `#ffffff`.
- Manifest `id`, `start_url`, `scope`: `/admin`. `display`: `standalone`.
- Admin route test: `/^\/admin(\/|$)/` (same as `loadAdminBundle`).
- Installed app is always dark: `matchMedia('(display-mode: standalone)').matches || navigator.standalone === true` forces `dark`.
- Never edit the route shells by hand. Edit `index.html`, then run `node scripts/sync-spa-shells.mjs` (writes 19 `<route>/index.html` + `404.html` at the repo root).
- Banned (master context §4): hard-coded notch pixels, negative `env()` margins, `minimal-ui`, `scrollTo(0,1)`, disabling zoom.
- Match file style: `var`, function expressions, no ES modules in `assets/js/script.js` or inline scripts.
- No `firebase deploy`. Nothing here touches rules or functions.

## Review Focus

- **Reaching `/admin` without a reload** (tap from the homepage): install tags must appear, otherwise "Add to Home Screen" installs with no manifest. Tested in Task 2 (`cwrAdminAppTags(true)` after load on `/`) and wired in Task 3.
- **Leaving `/admin` without a reload:** tags must be removed so saving the homepage doesn't install the admin app. Tested in Task 2 (`cwrAdminAppTags(false)`).
- **Saved `light` preference inside the installed app:** must still render dark with a dark tint, or the white clock disappears. Tested in Task 2 and Task 3 (`toggleTheme` in standalone).
- **Calling the tag function twice** (route re-render): no duplicate `<link rel="manifest">`. Tested in Task 2.
- **iOS reading `apple-mobile-web-app-status-bar-style` added by script:** can't be unit tested. Manual check in Task 4; if the app does not go under the clock, report back before changing anything.

---

### Task 1: App icons + manifest

**Files:**
- Create: `scripts/build-app-icons.sh`
- Create: `assets/images/app-icons/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (generated)
- Create: `assets/admin.webmanifest`
- Create: `scripts/test-admin-pwa.mjs`

**Interfaces:**
- Produces: icon URLs `/assets/images/app-icons/{apple-touch-icon,icon-192,icon-512,icon-512-maskable}.png`; manifest URL `/assets/admin.webmanifest`. Test helpers `ok`, `read`, `pngInfo` in `scripts/test-admin-pwa.mjs` (Tasks 2–3 append to this file).

- [ ] **Step 1: Write the failing test**

Create `scripts/test-admin-pwa.mjs`:

```js
#!/usr/bin/env node
/**
 * Admin Home Screen app (Phase 1). Run from the repo root:
 *   node scripts/test-admin-pwa.mjs
 *
 * Guards: manifest + icons, the <head> theme/install script, the showPage
 * hook, toggleTheme, and the standalone CSS.
 */
import fs from 'node:fs';
import vm from 'node:vm';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const read = (p) => fs.readFileSync(p, 'utf8');
/** PNG width/height/colorType from the IHDR chunk (colorType 2 = RGB, 6 = RGBA). */
function pngInfo(p) {
  const b = fs.readFileSync(p);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), colorType: b[25] };
}

// ——— 1. manifest + icons ———
const manifest = JSON.parse(read('assets/admin.webmanifest'));
ok(manifest.name === 'CWR Admin' && manifest.short_name === 'CWR Admin', 'manifest is named CWR Admin');
ok(manifest.id === '/admin' && manifest.start_url === '/admin' && manifest.scope === '/admin', 'manifest opens and stays on /admin');
ok(manifest.display === 'standalone', 'manifest display is standalone');
ok(manifest.background_color === '#121212' && manifest.theme_color === '#121212', 'manifest colors are #121212');

const want = {
  'apple-touch-icon.png': 180,
  'icon-192.png': 192,
  'icon-512.png': 512,
  'icon-512-maskable.png': 512
};
for (const [file, size] of Object.entries(want)) {
  const p = 'assets/images/app-icons/' + file;
  const exists = fs.existsSync(p);
  ok(exists, `${file} exists`);
  if (!exists) continue;
  const info = pngInfo(p);
  ok(info.w === size && info.h === size, `${file} is ${size}x${size}`);
  ok(info.colorType === 2, `${file} has no alpha channel`);
}
const listed = manifest.icons.map((i) => i.src.replace('/assets/images/app-icons/', ''));
ok(['icon-192.png', 'icon-512.png', 'icon-512-maskable.png'].every((f) => listed.includes(f)), 'manifest lists the 192, 512 and maskable icons');
ok(manifest.icons.some((i) => i.purpose === 'maskable' && i.src.endsWith('icon-512-maskable.png')), 'maskable icon is marked purpose: maskable');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-admin-pwa.mjs`
Expected: crashes with `ENOENT ... assets/admin.webmanifest`.

- [ ] **Step 3: Write the icon script**

Create `scripts/build-app-icons.sh`:

```bash
#!/usr/bin/env bash
# Regenerate assets/images/app-icons/ from the logo. Needs ImageMagick 7 (`brew install imagemagick`).
#   ./scripts/build-app-icons.sh
set -euo pipefail
cd "$(dirname "$0")/.."

SRC=assets/images/logo/logo.png
OUT=assets/images/app-icons
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

# logo.png (1008x1024) has a fake checkerboard baked into its corners; keep only the gold circle.
magick -size 1008x1024 xc:black -fill white -draw "circle 504,508 504,12" "$TMP/mask.png"
magick "$SRC" "$TMP/mask.png" -alpha off -compose CopyOpacity -composite \
  -crop 1008x1008+0+4 +repage "$TMP/circle.png"

# icon <px> <circle diameter as % of the canvas> <file>
icon() {
  local d=$((1024 * $2 / 100))
  magick -size 1024x1024 xc:'#121212' \( "$TMP/circle.png" -resize "${d}x${d}" \) \
    -gravity center -compose over -composite -alpha off -resize "$1x$1" "PNG24:$OUT/$3"
}

icon 180 98 apple-touch-icon.png
icon 192 98 icon-192.png
icon 512 98 icon-512.png
# Maskable: Android may crop to a circle/squircle; keep the logo inside the central 80%.
icon 512 78 icon-512-maskable.png

echo "✓ app icons written to $OUT"
```

Run: `chmod +x scripts/build-app-icons.sh && ./scripts/build-app-icons.sh`
Expected: `✓ app icons written to assets/images/app-icons`

- [ ] **Step 4: Look at the icons**

Open `assets/images/app-icons/icon-512.png` and `icon-512-maskable.png`. Expected: gold "R" circle on a flat `#121212` square, no checkerboard, no light fringe at the circle edge. If a fringe shows, shrink the mask radius in the `-draw "circle 504,508 504,12"` call (raise `12` to `16`) and rerun.

- [ ] **Step 5: Write the manifest**

Create `assets/admin.webmanifest`:

```json
{
  "name": "CWR Admin",
  "short_name": "CWR Admin",
  "id": "/admin",
  "start_url": "/admin",
  "scope": "/admin",
  "display": "standalone",
  "background_color": "#121212",
  "theme_color": "#121212",
  "icons": [
    { "src": "/assets/images/app-icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/assets/images/app-icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/assets/images/app-icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `node scripts/test-admin-pwa.mjs`
Expected: every line `✓`, exit code 0.

- [ ] **Step 7: Commit**

```bash
git add scripts/build-app-icons.sh scripts/test-admin-pwa.mjs assets/images/app-icons assets/admin.webmanifest
git commit -m "feat(admin-pwa): app icons and CWR Admin manifest"
```

---

### Task 2: `<head>` theme, tint, and admin install tags (all shells)

**Files:**
- Modify: `index.html` — line 35 (`theme-color`), after line 82 (favicon), lines 107–116 (theme script)
- Regenerate: the 19 `<route>/index.html` shells + `404.html` via `node scripts/sync-spa-shells.mjs`
- Test: `scripts/test-admin-pwa.mjs` (append)

**Interfaces:**
- Produces (globals defined by the inline script, used by Task 3):
  - `window.cwrSetTheme(theme: string|null): 'dark'|'light'`: applies `data-theme` and the `theme-color` meta; forces `'dark'` when installed or when `theme !== 'light'`; returns the applied theme.
  - `window.cwrAdminAppTags(on: boolean): void`: `true` adds the five install tags once (each marked `data-admin-app`); `false` removes them.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-admin-pwa.mjs`:

```js
// ——— 2. <head> theme / tint / admin install tags ———
const indexHtml = read('index.html');
const headScript = ((indexHtml.match(/<script>[\s\S]*?<\/script>/g) || []).find((s) => s.includes('cwrSetTheme')) || '')
  .replace(/^<script>/, '').replace(/<\/script>$/, '');
ok(headScript.length > 0, 'index.html has the theme/install <head> script');
ok(/<meta name="theme-color" content="#121212">/.test(indexHtml), 'theme-color default is #121212');
ok(indexHtml.includes('<link rel="apple-touch-icon" href="/assets/images/app-icons/apple-touch-icon.png">'), 'apple-touch-icon is linked');

/** Minimal DOM for the head script: a theme-color meta, head children, querySelector(All). */
function makePage({ path = '/', saved = null, standalone = false } = {}) {
  const attrs = {};
  const tint = { name: 'theme-color', attrs: { name: 'theme-color', content: '#121212' } };
  tint.setAttribute = (k, v) => { tint.attrs[k] = v; };
  const head = [tint];
  const mkEl = (tag) => {
    const el = { tag, attrs: {} };
    el.setAttribute = (k, v) => { el.attrs[k] = v; };
    el.remove = () => { const i = head.indexOf(el); if (i !== -1) head.splice(i, 1); };
    return el;
  };
  const matches = (el, sel) => {
    if (sel === 'meta[name="theme-color"]') return el.attrs.name === 'theme-color';
    if (sel === 'link[rel="manifest"]') return el.tag === 'link' && el.attrs.rel === 'manifest';
    if (sel === '[data-admin-app]') return 'data-admin-app' in el.attrs;
    throw new Error('unexpected selector ' + sel);
  };
  const document = {
    documentElement: { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: (k) => attrs[k] ?? null },
    head: { appendChild: (el) => head.push(el) },
    createElement: mkEl,
    querySelector: (sel) => head.find((el) => matches(el, sel)) || null,
    querySelectorAll: (sel) => head.filter((el) => matches(el, sel))
  };
  const store = saved ? { 'portfolio-theme': saved } : {};
  const window = {
    document,
    location: { pathname: path },
    navigator: { standalone: false },
    matchMedia: (q) => ({ matches: standalone && q === '(display-mode: standalone)' }),
    localStorage: { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } }
  };
  window.window = window;
  const ctx = vm.createContext(window);
  vm.runInContext(headScript, ctx);
  return {
    ctx, window, store,
    theme: () => attrs['data-theme'],
    tint: () => tint.attrs.content,
    tags: () => head.filter((el) => 'data-admin-app' in el.attrs),
    manifests: () => head.filter((el) => el.tag === 'link' && el.attrs.rel === 'manifest')
  };
}
const tagValue = (page, attr, key) => (page.tags().find((el) => el.attrs[attr] === key) || { attrs: {} }).attrs;

let pg = makePage({ path: '/' });
ok(pg.theme() === 'dark' && pg.tint() === '#121212', 'no saved theme → dark, dark tint');
ok(pg.tags().length === 0, 'homepage gets no install tags');

pg = makePage({ path: '/', saved: 'light' });
ok(pg.theme() === 'light' && pg.tint() === '#ffffff', 'saved light in a browser tab → light, white tint');

pg = makePage({ path: '/admin', saved: 'light', standalone: true });
ok(pg.theme() === 'dark' && pg.tint() === '#121212', 'installed app ignores saved light → dark, dark tint');

pg = makePage({ path: '/admin' });
ok(pg.tags().length === 5, '/admin gets 5 install tags on load');
ok(pg.manifests().length === 1 && pg.manifests()[0].attrs.href === '/assets/admin.webmanifest', '/admin links the admin manifest');
ok(tagValue(pg, 'name', 'apple-mobile-web-app-title').content === 'CWR Admin', 'iOS app title is CWR Admin');
ok(tagValue(pg, 'name', 'apple-mobile-web-app-status-bar-style').content === 'black-translucent', 'status bar is black-translucent');
ok(tagValue(pg, 'name', 'apple-mobile-web-app-capable').content === 'yes' && tagValue(pg, 'name', 'mobile-web-app-capable').content === 'yes', 'web-app-capable tags set');
ok(makePage({ path: '/admin/' }).tags().length === 5, '/admin/ (trailing slash) also gets the tags');
ok(makePage({ path: '/administrator' }).tags().length === 0, '/administrator does not');

pg.window.cwrAdminAppTags(true);
ok(pg.manifests().length === 1 && pg.tags().length === 5, 'calling cwrAdminAppTags(true) twice adds no duplicates');
pg.window.cwrAdminAppTags(false);
ok(pg.tags().length === 0 && pg.manifests().length === 0, 'cwrAdminAppTags(false) removes every install tag');

pg = makePage({ path: '/' });
pg.window.cwrAdminAppTags(true);
ok(pg.manifests().length === 1, 'in-page navigation to admin adds the manifest');

ok(pg.window.cwrSetTheme('light') === 'light' && pg.tint() === '#ffffff', 'cwrSetTheme(light) in a tab → light');
ok(pg.window.cwrSetTheme('nonsense') === 'dark' && pg.theme() === 'dark', 'cwrSetTheme(unknown) → dark');

// Every route shell carries the same head script and touch icon.
const shells = fs.readdirSync('.', { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== '_site')
  .map((d) => d.name + '/index.html')
  .filter((p) => fs.existsSync(p) && read(p).includes('script.js?v='));
ok(shells.length === 19, `found 19 route shells (got ${shells.length})`);
for (const s of shells) {
  const html = read(s);
  ok(html.includes(headScript) && html.includes('apple-touch-icon.png'), `${s} has the head script and touch icon`);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-admin-pwa.mjs`
Expected: Task 1 lines `✓`; `✗ index.html has the theme/install <head> script` (then a `vm` error on the empty script or further `✗` lines). Exit code non-zero.

- [ ] **Step 3: Change `theme-color` (index.html line 35)**

Replace:
```html
  <meta name="theme-color" content="#ceb15a">
```
with:
```html
  <meta name="theme-color" content="#121212">
```

- [ ] **Step 4: Add the touch icon (after the favicon on line 82)**

Replace:
```html
  <link rel="shortcut icon" href="/assets/images/logo/logo.jpg" type="image/x-icon">
```
with:
```html
  <link rel="shortcut icon" href="/assets/images/logo/logo.jpg" type="image/x-icon">
  <link rel="apple-touch-icon" href="/assets/images/app-icons/apple-touch-icon.png">
```

- [ ] **Step 5: Replace the theme script (index.html lines 107–116)**

Replace:
```html
  <script>
    (function() {
      var saved = localStorage.getItem('portfolio-theme');
      if (saved === 'light' || saved === 'dark') {
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    })();
  </script>
```
with:
```html
  <script>
    (function() {
      // Installed to the Home Screen, the status bar is black-translucent (white clock), so stay dark.
      var installed = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
        window.navigator.standalone === true;
      window.cwrSetTheme = function (theme) {
        if (installed || theme !== 'light') theme = 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        var tint = document.querySelector('meta[name="theme-color"]');
        if (tint) tint.setAttribute('content', theme === 'light' ? '#ffffff' : '#121212');
        return theme;
      };
      window.cwrAdminAppTags = function (on) {
        var current = document.querySelectorAll('[data-admin-app]');
        if (!on) {
          for (var i = 0; i < current.length; i++) current[i].remove();
          return;
        }
        if (current.length) return;
        [
          ['link', 'rel', 'manifest', 'href', '/assets/admin.webmanifest'],
          ['meta', 'name', 'apple-mobile-web-app-capable', 'content', 'yes'],
          ['meta', 'name', 'mobile-web-app-capable', 'content', 'yes'],
          ['meta', 'name', 'apple-mobile-web-app-title', 'content', 'CWR Admin'],
          ['meta', 'name', 'apple-mobile-web-app-status-bar-style', 'content', 'black-translucent']
        ].forEach(function (t) {
          var el = document.createElement(t[0]);
          el.setAttribute(t[1], t[2]);
          el.setAttribute(t[3], t[4]);
          el.setAttribute('data-admin-app', '');
          document.head.appendChild(el);
        });
      };
      window.cwrSetTheme(localStorage.getItem('portfolio-theme'));
      window.cwrAdminAppTags(/^\/admin(\/|$)/.test(location.pathname));
    })();
  </script>
```

- [ ] **Step 6: Regenerate the route shells**

Run: `node scripts/sync-spa-shells.mjs`
Expected: it reports writing 19 shells + `404.html` with no "miss" errors.

Then: `grep -L "cwrAdminAppTags" $(grep -rl "script.js?v=" --include="index.html" . | grep -v _site)`
Expected: no output (every shell has the script).

- [ ] **Step 7: Run test to verify it passes**

Run: `node scripts/test-admin-pwa.mjs`
Expected: every line `✓`, exit code 0.

- [ ] **Step 8: Commit**

`_site/` is gitignored, so don't glob `*/index.html`. Check `git status` shows only `index.html`, the 19 shells, `404.html`, and the test, then:

```bash
git add -u
git commit -m "feat(admin-pwa): head script for theme tint and admin install tags"
```

---

### Task 3: In-page navigation hook, `toggleTheme`, standalone CSS, cache-busters

**Files:**
- Modify: `assets/js/script.js:8917-8922` (`showPage`, page-switch block)
- Modify: `assets/js/script.js:24455-24461` (`toggleTheme`)
- Modify: `assets/css/style.css:207-211` (`html` rule) and append the standalone rule after the `body.admin-page-active .main-content` block (~line 22872)
- Modify: `index.html` cache-busters (`style.css?v=` line 87, `script.js?v=` ~line 8553), then re-sync shells
- Test: `scripts/test-admin-pwa.mjs` (append)

**Interfaces:**
- Consumes: `window.cwrSetTheme`, `window.cwrAdminAppTags` from Task 2.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-admin-pwa.mjs`:

```js
// ——— 3. showPage hook, toggleTheme, CSS, cache-busters ———
const scriptJs = read('assets/js/script.js');
ok(/typeof window\.cwrAdminAppTags === 'function'\) window\.cwrAdminAppTags\(pageName === 'admin'\)/.test(scriptJs),
  'showPage toggles the install tags for the admin page');

const toggleSrc = (scriptJs.match(/function toggleTheme\(\) \{[\s\S]*?\n\}/) || [''])[0];
ok(toggleSrc.includes('cwrSetTheme'), 'toggleTheme goes through cwrSetTheme');
pg = makePage({ path: '/' });
vm.runInContext(toggleSrc + '\ntoggleTheme();', pg.ctx);
ok(pg.theme() === 'light' && pg.tint() === '#ffffff' && pg.store['portfolio-theme'] === 'light', 'toggleTheme in a tab → light + white tint, saved');
pg = makePage({ path: '/admin', standalone: true });
vm.runInContext(toggleSrc + '\ntoggleTheme();', pg.ctx);
ok(pg.theme() === 'dark' && pg.tint() === '#121212', 'toggleTheme in the installed app stays dark');

const css = read('assets/css/style.css');
ok(/html \{[^}]*background: var\(--smoky-black\);/.test(css), 'html background matches body');
ok(/@media \(display-mode: standalone\) \{\s*body\.admin-page-active \.navbar \{\s*top: env\(safe-area-inset-top, 0px\);/.test(css),
  'installed admin app moves the navbar below the clock');

ok(indexHtml.includes('/assets/css/style.css?v=admin-pwa-20261012'), 'style.css cache-buster bumped');
ok(indexHtml.includes('/assets/js/script.js?v=admin-pwa-20261012'), 'script.js cache-buster bumped');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-admin-pwa.mjs`
Expected: Task 1–2 lines `✓`; the new section `✗` (showPage hook, toggleTheme, CSS, cache-busters). Exit code non-zero.

- [ ] **Step 3: Hook `showPage` (script.js ~line 8917)**

Replace:
```js
  document.body.classList.remove("admin-page-active");
  document.body.classList.remove("home-page-active");
  document.body.classList.toggle(
    'site-footer-hidden',
    HIDE_SITE_FOOTER_PAGES.indexOf(pageName) !== -1
  );
```
with:
```js
  document.body.classList.remove("admin-page-active");
  document.body.classList.remove("home-page-active");
  document.body.classList.toggle(
    'site-footer-hidden',
    HIDE_SITE_FOOTER_PAGES.indexOf(pageName) !== -1
  );
  if (typeof window.cwrAdminAppTags === 'function') window.cwrAdminAppTags(pageName === 'admin');
```

- [ ] **Step 4: Route `toggleTheme` through `cwrSetTheme` (script.js ~line 24455)**

Replace:
```js
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme') || 'dark';
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('portfolio-theme', next);
}
```
with:
```js
function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme') || 'dark';
  var next = window.cwrSetTheme(current === 'dark' ? 'light' : 'dark');
  localStorage.setItem('portfolio-theme', next);
}
```

- [ ] **Step 5: CSS (style.css)**

Replace the `html` rule at line 207:
```css
html {
  font-family: var(--ff-poppins);
  scrollbar-width: none;
  -ms-overflow-style: none;
}
```
with:
```css
html {
  font-family: var(--ff-poppins);
  background: var(--smoky-black);
  scrollbar-width: none;
  -ms-overflow-style: none;
}
```

Directly after the `body.admin-page-active .main-content { ... }` block (~line 22866–22872), add:
```css
/* Installed admin app is black-translucent: the page runs under the clock, so the nav must clear it. */
@media (display-mode: standalone) {
  body.admin-page-active .navbar {
    top: env(safe-area-inset-top, 0px);
  }
}
```

- [ ] **Step 6: Bump cache-busters and re-sync**

In `index.html`, replace `/assets/css/style.css?v=leads-flow-20261010` with `/assets/css/style.css?v=admin-pwa-20261012`, and `/assets/js/script.js?v=admin-lazy-20261010` with `/assets/js/script.js?v=admin-pwa-20261012`. Leave `testimonial.html` alone (it pins its own version).

Run: `node scripts/sync-spa-shells.mjs`

- [ ] **Step 7: Run tests to verify they pass**

Run: `node scripts/test-admin-pwa.mjs`
Expected: every line `✓`, exit code 0.

Run: `node scripts/preflight.mjs`
Expected: `✓ preflight: JS syntax, 19 shells in sync, tests, no secrets`

- [ ] **Step 8: Commit**

Check `git status` shows only `script.js`, `style.css`, `index.html`, the 19 shells, `404.html`, and the test, then:

```bash
git add -u
git commit -m "feat(admin-pwa): in-page install tags, dark-locked toggle, under-the-clock nav"
```

---

### Task 4: Build and device verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: Build the publish folder**

Run: `npm run build`
Expected: succeeds with no "private file" leak errors. Then:
`ls _site/assets/admin.webmanifest _site/assets/images/app-icons/` lists the manifest and four PNGs; `ls _site/scripts 2>/dev/null` prints nothing.

- [ ] **Step 2: Desktop Chrome check**

Run: `python3 -m http.server 8080` from the repo root, open `http://localhost:8080/admin`.
DevTools → Application → Manifest: name "CWR Admin", start URL `/admin`, three icons load, no installability errors. Open `http://localhost:8080/` in a fresh tab: Application → Manifest shows no manifest. From `/`, use the site nav to open Admin: the manifest appears; navigate back home: it disappears.

- [ ] **Step 3: Hand off to Ruben for the iPhone check** (after he pushes / deploys; the installed-app look only shows on a physical device)

Checklist to send:
1. Delete the old Home Screen icon from the sign-in test.
2. Safari → `rubenjimenez.dev/admin` → Share → Add to Home Screen. Name prefilled "CWR Admin", gold R icon.
3. Open it: dark splash, sign in once, dashboard loads.
4. Background runs under the clock; the top nav sits just below the clock; the bottom tab bar sits above the home indicator.
5. Clock text readable (white on dark).
6. Close and reopen: still signed in.
7. In regular Safari on `rubenjimenez.dev`, the top strip matches the page (dark).

If step 4 fails (app does not go under the clock), stop and report: iOS may not honor the script-added status-bar tag, and the fallback needs a design decision.

- [ ] **Step 4: Android check (if a device is available)**

Chrome → `rubenjimenez.dev/admin` → Install app. Icon shows the gold R inside the system shape with no clipping; app opens to `/admin`.
