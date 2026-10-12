# Admin Home Screen app — Phase 1 design

Date: 2026-10-12 · Status: approved in chat, awaiting spec review

## Goal

Ruben installs the admin hub (`/admin`) to his iPhone and Android Home Screen as **CWR Admin**. It opens full screen with no browser bar, the background runs under the clock / Dynamic Island, and all UI stays clear of the clock and home indicator. Public visitors are unaffected. Phase 2 (push alerts) builds on this.

Source standard: `~/Dev/Apps/blueprints/cwr-master-context.md` §4 (viewport, safe areas, iOS 26 tinting) and §6 (Home Screen web apps).

## What Ruben asked for vs. assumptions

Asked for:
- Installable admin hub, named "CWR Admin".
- Full use of the screen, including under the clock / status bar.
- Push alerts for DMs, leads, bookings, and portal activity — **Phase 2, separate spec**.
- Two phases; Phase 1 needs no `firebase deploy`.

Assumptions:
- Under-the-clock layout is only possible in the **installed** app. In a normal Safari tab the strip belongs to Safari (see Photographer `reports/Safari tab hero top edge.md`); there we only fix its tint.
- Installing does not widen access. `/admin` is already reachable by URL; all admin data stays behind the `admin` custom claim in the Firestore / RTDB / Storage rules (`portfolio-security.md`).

## Gate: sign-in inside the installed app

The installed app has its own storage (not shared with Safari), so Ruben signs in once inside it. Admin sign-in uses `signInWithPopup`, which is unreliable in iOS standalone web apps.

Probe (no code): on iOS 26, Safari → `rubenjimenez.dev/admin` → Share → Add to Home Screen ("Open as Web App" on) → open the icon → Google sign-in.
- **Works** → build Phase 1 as below.
- **Fails** → stop; choose a fallback (email sign-in link for the admin account is the likely one) and amend this spec before building.

## Design

### 1. Icons — `assets/images/app-icons/`

Generated once from `assets/images/logo/logo.png` (1008×1024), padded to square and flattened onto `#121212` so iOS never fills transparency on its own:

| File | Size | Use |
|---|---|---|
| `apple-touch-icon.png` | 180×180 | iOS Home Screen (all pages) |
| `icon-192.png` | 192×192 | Manifest |
| `icon-512.png` | 512×512 | Manifest, splash |
| `icon-512-maskable.png` | 512×512, logo inside the central 80% safe zone | Manifest, `purpose: "maskable"` (Android shapes) |

`assets/` is already in `PUBLIC` in `scripts/build-site.mjs`, so no build change is needed.

### 2. Manifest — `assets/admin.webmanifest`

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

### 3. Page shell `<head>` — all 20 shells, one scripted pass

Applied to `index.html` + every `*/index.html` (find with `grep -rl "script.js?v=" --include="*.html"`), with the script asserting each file matched exactly once.

- **Every page:** `<link rel="apple-touch-icon" href="/assets/images/app-icons/apple-touch-icon.png">`.
- **`theme-color`:** change `#ceb15a` → `#121212`.
- **Existing inline theme script** (the one that reads `portfolio-theme`, ~line 111 of `index.html`): also set the `theme-color` meta to `#ffffff` for light, `#121212` for dark, so there's no flash of the wrong tint.
- **`/admin` only** — inside that same early inline script, when `/^\/admin(\/|$)/.test(location.pathname)` (same test `loadAdminBundle` uses), append:
  - `<link rel="manifest" href="/assets/admin.webmanifest">`
  - `<meta name="apple-mobile-web-app-capable" content="yes">`
  - `<meta name="mobile-web-app-capable" content="yes">`
  - `<meta name="apple-mobile-web-app-title" content="CWR Admin">`
  - `<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">`

  Public pages never get the manifest, so "Add to Home Screen" from the homepage is a plain bookmark with the logo icon.

`portal.html` is out of scope (not selected).

### 4. Full screen under the clock — `assets/css/style.css`

Already in place: `article` pads its top with `env(safe-area-inset-top)`; the admin mobile tab bar root and dock pad with `env(safe-area-inset-bottom)`. With `viewport-fit=cover` + `black-translucent`, those insets become non-zero in the installed app and the existing rules do the work.

New, scoped to `@media (display-mode: standalone)` and `body.admin-page-active`:
- `.navbar` (`position: absolute; top: 0`) → `top: env(safe-area-inset-top, 0px)` so the nav sits below the clock.
- **Light theme:** `black-translucent` always draws a white clock, which disappears on the white light-theme background. Add a fixed strip of height `env(safe-area-inset-top)` behind the clock, colored `#121212`, shown only for `[data-theme="light"]` in standalone. Dark theme stays fully edge to edge.

Any other admin element pinned to the top edge that turns up during device testing gets the same `env(safe-area-inset-top)` offset — no hard-coded notch pixels, no negative `env()` margins (master context §4 banned list).

### 5. Top-bar tint (all pages, Safari tab)

- `html { background: var(--smoky-black); }` so `html` matches `body` (iOS 26 samples the page; Android / older iOS read `theme-color`).
- `toggleTheme()` in `assets/js/script.js` updates the `theme-color` meta alongside `data-theme`.

### 6. Cache-busters

`style.css` and `script.js` `?v=` bumped in the same 20-shell pass.

## Testing

- `node scripts/preflight.mjs` (syntax, shells in sync, 9 test suites, secrets) and `npm run build` (confirms `_site/` contains the manifest and icons, nothing private).
- Desktop Chrome: on `/admin`, DevTools → Application → Manifest shows CWR Admin, icons load, installable. On `/`, no manifest.
- **Physical iPhone (required — the clock area only shows on a real device):** install from `/admin`; check icon, name, splash, nav below the clock, tab bar above the home indicator, light and dark theme, sign-in persists after closing the app.
- Physical Android Chrome: install prompt appears on `/admin`; maskable icon looks right.
- Safari tab on `/`: top strip tint matches the page in both themes.

## Out of scope

- Push alerts (Phase 2: service worker, FCM, admin-only token storage, Cloud Function triggers for DM / lead / booking / portal activity; needs `firebase deploy`).
- Custom install prompt UI (Ruben installs once by hand).
- `portal.html` viewport, `100vh` → `svh`/`dvh` cleanup, Instagram in-app browser hint.
