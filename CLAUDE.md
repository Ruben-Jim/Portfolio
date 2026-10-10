@~/Dev/Apps/blueprints/cwr-master-context.md
@~/Dev/Apps/blueprints/portfolio-security.md

## This project: rubenjimenez.dev (CWR's own site)

CWR's marketing site, plus the admin hub (pipeline CRM, DM inbox, blog/portfolio admin, bookings) and the client portal. **Legacy stack: plain HTML/CSS/JS. Don't hold it to the Expo rules.** A migration is planned but not scheduled.

### Stack in this repo
- Static pages hosted on GitHub Pages (`CNAME`). SPA routes like `/admin` are served through `404.html`.
- Firebase project `portfolio-2578e`: Firestore (`firestore.rules`), RTDB (`database.rules.json`), and Storage (`storage.rules`)
- Cloud Functions (plain JS): `functions/index.js`, `dm-session.js`, `portal-api.js`, `inbound-leads.js`, `lead-match.js`, and the email templates. Email goes through Resend (`RESEND_SETUP.md`).
- The security model is the imported `portfolio-security.md`. **The README's admin section (`admin123`, open rules) is outdated.** Trust the security file.

### Traps (both have cost hours)
- **20 copies of one page shell** (`index.html` + `*/index.html`). Any markup or `?v=` cache-buster change must be applied to every copy in one scripted pass that checks each one matched. Find them with `grep -rl "script.js?v=" --include="*.html"`.
- **`/admin` is served by the root `index.html`, not `admin/index.html`.** If new markup returns null, check this first.
- `portal.html` is its own shell. It doesn't load `style.css` or ionicons, so use inline SVG there.
- **Admin JS is lazy-loaded.** Public pages don't load `agency-tools`, `post-builder`, `outreach-composer`, `prospects`, `ig-posts`, `blog-tiptap-editor`, `dm-migration`, or html2pdf. `loadAdminBundle()` (inline in `index.html`, holding their `?v=`) loads them on `/admin` or at admin sign-in. A new admin-only script goes in that list, not in a `<script>` tag. Public code must `typeof`-guard any admin global.
- **The landing marquee is pre-rendered** into `index.html` by `sync-spa-shells.mjs` from `LANDING_MARQUEE_PROJECTS` in `script.js`. Edit that list, then re-run the sync. Thumbnails live in `assets/images/landing-marquee/` (480px).

### Commands
- Local: `python3 -m http.server`, or `serve` with `serve.json`
- Tests: `node scripts/test-*.mjs` (9 suites)
- **Pre-push gate:** `.githooks/pre-push` runs `node scripts/preflight.mjs` (JS syntax, all shells in sync, tests, no secrets). Enable it on a fresh clone with `git config core.hooksPath .githooks`
- **Ask first:** any `firebase deploy` (follow the deploy order in the security file). The site goes live when Ruben pushes.

### Business
- Pricing source of truth: `services-pricing/` + `llms.txt`
- Portfolio entry copy: follow `.cursor/rules/portfolio-scan.mdc` (plain business language)
