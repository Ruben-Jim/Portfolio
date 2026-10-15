# Portfolio Skins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a platform's skins carry a short card label, an order and a home-page cover, and manage them from a Skins section on the platform's editor.

**Architecture:** Pure rules live in a new `assets/js/portfolio-skins.js` (browser global `window.PortfolioSkins`, Node `module.exports`) with Node tests. `assets/js/script.js` uses those rules for the public card rotator, popup tabs, cover validation, the sanitizer and the new admin section. Skins stay separate `portfolioProjects` records; the platform's Save writes partial updates to changed skins.

**Tech Stack:** Plain browser JS (classic scripts), Firebase Realtime Database (`window.rtdbUpdate`, `window.rtdbRef`, `window.rtdb`), Node test scripts in `scripts/test-*.mjs`, local test server + Playwright for browser checks.

**Spec:** `docs/superpowers/specs/2026-10-15-portfolio-skins-design.md`

## Global Constraints

- `skinLabel`: string, trimmed, max 40 chars. Missing → skins use `title`; the platform uses `"Platform"`.
- `skinOrder`: finite number or `null`. Missing → keep current relative order, after numbered skins.
- `coverImageUrl` may be a still in the record's `imageUrls`, or the poster (`portfolioVideoPosterUrlBest`) of one of its video slides. Anything else becomes `''` (auto).
- Skin saves from the platform editor are partial updates with only `skinLabel`, `skinOrder`, `coverImageUrl`.
- After any reorder, every skin gets `skinOrder` 10, 20, 30… in on-screen order.
- No Firebase deploy, no data migration, no rules change.
- Every changed file gets a new `?v=` in `index.html`, then `node scripts/sync-spa-shells.mjs`; `portal.html` gets its own bump.
- Never `git commit`/`git push` — Ruben commits.

## Review Focus

- A skin saved from its own editor right after its label was changed on the platform must keep the new label (in-memory records are patched after the skin save). Test in Task 5.
- A skin with no images still appears in the Skins section (with its chip) but never on the public card. Test in Task 4.
- A platform whose skins have no `skinLabel`/`skinOrder` renders the card and tabs exactly as before (labels = titles, "Platform", current order). Test in Task 2.
- Editing only skin rows (no other field) must count as unsaved changes, so closing prompts. Test in Task 4.
- A cover chosen for a skin that later loses that image falls back to auto instead of a broken image. Test in Task 1 (`isAllowedCover`) and Task 3 (sanitizer).

---

### Task 1: Pure skin rules module

**Files:**
- Create: `assets/js/portfolio-skins.js`
- Test: `scripts/test-portfolio-skins.mjs`

**Interfaces:**
- Produces (on `window.PortfolioSkins` and `module.exports`):
  - `isVideoUrl(url) → boolean` (`/\.(?:mp4|webm|mov)(?:\?|$)/i`, same as `portfolioIsVideoUrl`)
  - `isAllowedCover(urls: string[], cover: string, posterOf: (videoUrl) => string) → boolean`
  - `coverChoices(urls: string[], posterOf) → Array<{ value: string, label: string }>`
  - `labelFor(record, isPlatform: boolean) → string`
  - `orderSkins(skins: object[]) → object[]` (new array, stable)
  - `skinPatch(fields: object) → { skinLabel?: string, skinOrder?: number|null, coverImageUrl?: string }`
  - `MAX_LABEL = 40`

- [ ] **Step 1: Write the failing test**

```js
#!/usr/bin/env node
/**
 * Portfolio skin rules (assets/js/portfolio-skins.js). Run: node scripts/test-portfolio-skins.mjs
 * Guards: which covers are allowed (stills + own video posters only), the
 * card/tab label fallback, skin ordering, and that a skin save only ever
 * carries label, order and cover.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const S = require('../assets/js/portfolio-skins.js');

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const posterOf = (v) => v.replace(/\.(mp4|webm|mov)$/i, '-poster.webp');
const urls = ['/a/one.webp', '/a/demo.webm', '/a/guide.md', '/a/two.webp', '/a/admin-dashboard.webp'];

ok(S.isAllowedCover(urls, '/a/two.webp', posterOf), 'a still on the record is allowed');
ok(S.isAllowedCover(urls, '/a/demo-poster.webp', posterOf), "the record's own video poster is allowed");
ok(!S.isAllowedCover(urls, '/b/other.webp', posterOf), "another record's image is not");
ok(!S.isAllowedCover(urls, '/a/gone-poster.webp', posterOf), 'a poster of a video not on the record is not');
ok(!S.isAllowedCover(urls, '/a/guide.md', posterOf), 'a doc slide is not a cover');
ok(!S.isAllowedCover(urls, '', posterOf), 'empty is not a picked cover');
ok(!S.isAllowedCover(['/a/one.webp'], '/a/demo-poster.webp', posterOf), 'a cover whose video was removed falls back');

const choices = S.coverChoices(urls, posterOf);
ok(choices[0].value === '' && /Auto/.test(choices[0].label), 'Auto comes first');
ok(choices.map((c) => c.value).join() === ',/a/one.webp,/a/two.webp,/a/admin-dashboard.webp,/a/demo-poster.webp', 'stills in order, then posters');
ok(/Home page/.test(choices[choices.length - 1].label), 'poster choice is labelled Home page');
ok(S.coverChoices(['/a/x.webm'], () => '').length === 1, 'a video without a poster adds no choice');

ok(S.labelFor({ title: 'Ink & Needle', skinLabel: '  Tattoo Shop  ' }, false) === 'Tattoo Shop', 'label is trimmed');
ok(S.labelFor({ title: 'Ink & Needle', skinLabel: '' }, false) === 'Ink & Needle', 'skin falls back to its title');
ok(S.labelFor({ title: 'Chair & Studio Platform' }, true) === 'Platform', 'platform falls back to Platform');
ok(S.labelFor({ title: 'X', skinLabel: 'y'.repeat(60) }, false).length === 40, 'label capped at 40');
ok(S.labelFor({}, false) === 'Build', 'a skin with no title or label reads Build');

const order = (list) => S.orderSkins(list).map((s) => s.id).join();
ok(order([{ id: 'a' }, { id: 'b', skinOrder: 20 }, { id: 'c', skinOrder: 10 }, { id: 'd' }]) === 'c,b,a,d', 'numbered first by number, the rest keep their order');
ok(order([{ id: 'a', skinOrder: 10 }, { id: 'b', skinOrder: 10 }]) === 'a,b', 'ties keep their order');
ok(order([{ id: 'a', skinOrder: 'x' }, { id: 'b', skinOrder: 5 }]) === 'b,a', 'a non-number counts as unnumbered');
const src = [{ id: 'a' }]; ok(S.orderSkins(src) !== src, 'returns a new array');

const patch = S.skinPatch({ skinLabel: '  Barber Shop ', skinOrder: '20', coverImageUrl: '/a/one.webp', title: 'nope', imageUrls: [] });
ok(JSON.stringify(Object.keys(patch).sort()) === '["coverImageUrl","skinLabel","skinOrder"]', 'patch carries only the three fields');
ok(patch.skinLabel === 'Barber Shop' && patch.skinOrder === 20, 'patch cleans label and order');
ok(S.skinPatch({ skinOrder: 'abc' }).skinOrder === null, 'bad order becomes null');
ok(JSON.stringify(S.skinPatch({ skinLabel: 'x' })) === '{"skinLabel":"x"}', 'only fields that were passed come out');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-portfolio-skins.mjs`
Expected: FAIL — `Cannot find module '../assets/js/portfolio-skins.js'`

- [ ] **Step 3: Write the implementation**

```js
/**
 * Portfolio skins — pure rules shared by the public card, the popup tabs and
 * the admin Skins section. A platform is a template project; its skins are
 * projects with builtFromTemplateId pointing at it.
 * Browser: window.PortfolioSkins. Node (tests): module.exports.
 */
(function (root) {
  'use strict';

  var MAX_LABEL = 40;
  var VIDEO_RE = /\.(?:mp4|webm|mov)(?:\?|$)/i;
  var DOC_RE = /\.md(?:\?|$)/i;

  function isVideoUrl(url) {
    return VIDEO_RE.test(String(url || ''));
  }

  function stills(urls) {
    return (urls || []).filter(function (u) { return u && !isVideoUrl(u) && !DOC_RE.test(u); });
  }

  function posters(urls, posterOf) {
    var out = [];
    (urls || []).forEach(function (u) {
      if (!isVideoUrl(u)) return;
      var p = posterOf ? posterOf(u) : '';
      if (p && out.indexOf(p) < 0) out.push(p);
    });
    return out;
  }

  /** A card cover must be one of the record's stills, or the poster of one of its videos. */
  function isAllowedCover(urls, cover, posterOf) {
    if (!cover) return false;
    return stills(urls).indexOf(cover) >= 0 || posters(urls, posterOf).indexOf(cover) >= 0;
  }

  function fileName(u) {
    return String(u).split('?')[0].split('/').pop();
  }

  function coverChoices(urls, posterOf) {
    var out = [{ value: '', label: 'Auto (first screenshot)' }];
    stills(urls).forEach(function (u) { out.push({ value: u, label: 'Screenshot · ' + fileName(u) }); });
    posters(urls, posterOf).forEach(function (p) { out.push({ value: p, label: 'Home page (video poster) · ' + fileName(p) }); });
    return out;
  }

  function cleanLabel(v) {
    return String(v == null ? '' : v).trim().slice(0, MAX_LABEL);
  }

  function labelFor(record, isPlatform) {
    var own = cleanLabel(record && record.skinLabel);
    if (own) return own;
    if (isPlatform) return 'Platform';
    return (record && record.title) || 'Build';
  }

  function orderNumber(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  /** Numbered skins first (by number), then the rest in their incoming order. Stable. */
  function orderSkins(skins) {
    return (skins || [])
      .map(function (s, i) { return { s: s, i: i, n: orderNumber(s && s.skinOrder) }; })
      .sort(function (a, b) {
        if (a.n !== null && b.n !== null && a.n !== b.n) return a.n - b.n;
        if (a.n !== null && b.n === null) return -1;
        if (a.n === null && b.n !== null) return 1;
        return a.i - b.i;
      })
      .map(function (x) { return x.s; });
  }

  /** What a skin save may write — nothing else on the skin is ever touched. */
  function skinPatch(fields) {
    fields = fields || {};
    var out = {};
    if ('skinLabel' in fields) out.skinLabel = cleanLabel(fields.skinLabel);
    if ('skinOrder' in fields) out.skinOrder = orderNumber(fields.skinOrder);
    if ('coverImageUrl' in fields) out.coverImageUrl = String(fields.coverImageUrl || '');
    return out;
  }

  var api = {
    MAX_LABEL: MAX_LABEL,
    isVideoUrl: isVideoUrl,
    isAllowedCover: isAllowedCover,
    coverChoices: coverChoices,
    labelFor: labelFor,
    orderSkins: orderSkins,
    skinPatch: skinPatch
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.PortfolioSkins = api;
})(typeof window !== 'undefined' ? window : null);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node scripts/test-portfolio-skins.mjs`
Expected: every line `✓`, exit code 0.

- [ ] **Step 5: Add the suite to preflight and run it**

Check `scripts/preflight.mjs` runs `scripts/test-*.mjs` by glob; if it lists suites by name, add `test-portfolio-skins.mjs`. Run `node scripts/preflight.mjs` → `✓ preflight`. Leave uncommitted (Ruben commits).

---

### Task 2: Public card, popup tabs and covers use the rules

**Files:**
- Modify: `index.html` (load `portfolio-skins.js` before `script.js`), then `node scripts/sync-spa-shells.mjs`
- Modify: `portal.html` (load `portfolio-skins.js` before `portfolio-detail-shared.js`)
- Modify: `assets/js/script.js` — `portfolioExplicitCoverUrl`, `getPortfolioDerivedBuilds`, `portfolioRenderCardRotatorHtml`, `renderPortfolioVariantTabs`
- Modify: `assets/js/portfolio-detail-shared.js` — `renderBuiltWithTemplateHtml` order

**Interfaces:**
- Consumes: `window.PortfolioSkins` (Task 1).
- Produces:
  - `portfolioCardRotatorSlides(p) → Array<{ index, label, src }>` (platform first, then ordered skins with images)
  - `portfolioRenderRotatorFromSlides(slides, alt) → string` ('' when fewer than 2 slides)
  - `getPortfolioDerivedBuilds(record)` now returns skins in skin order.

- [ ] **Step 1: Write the failing browser check** — `.playwright-mcp/check-skins-public.js` (run with the local test server `node scratchpad/portal-server.mjs <repo>`; the page uses fake records, nothing is saved):

```js
async (page) => {
  const r = []; const ok = (c, n, d) => r.push((c ? 'PASS ' : 'FAIL ') + n + (c || d === undefined ? '' : ' :: ' + JSON.stringify(d)));
  await page.goto('http://localhost:5178/?nocache=' + Date.now()); await page.waitForTimeout(2500);
  const run = (records) => page.evaluate((recs) => {
    window.portfolioProjectsAll = recs; window.portfolioProjects = recs;
    const p = recs[0];
    const html = portfolioRenderCardRotatorHtml(p, 'alt');
    const d = document.createElement('div'); d.innerHTML = html;
    const slides = [...d.querySelectorAll('.project-cover-slide')].map((s) => [s.getAttribute('data-label'), s.getAttribute('src') || s.getAttribute('data-src')]);
    let tabs = [];
    if (!document.getElementById('project-detail-variant-tabs')) { const w = document.createElement('div'); w.id = 'project-detail-variant-tabs'; document.body.appendChild(w); }
    renderPortfolioVariantTabs(p);
    tabs = [...document.querySelectorAll('#project-detail-variant-tabs [data-variant-index]')].map((b) => b.textContent);
    return { slides, tabs };
  }, records);
  const base = [
    { id: 'P', title: 'Chair & Studio Platform', isTemplate: true, imageUrls: ['/assets/images/projects/rosasalon/rosasalon.webp'] },
    { id: 'B', title: 'Barber Shop', builtFromTemplateId: 'P', imageUrls: ['/assets/images/projects/barbershop/barbershop.webp'] },
    { id: 'T', title: 'Tattoo Shop', builtFromTemplateId: 'P', imageUrls: ['/assets/images/projects/inktattoo/inktattoo-1.webp', '/assets/images/projects/inktattoo/inktattoo-demo.webm'] },
    { id: 'E', title: 'Empty skin', builtFromTemplateId: 'P', imageUrls: [] }
  ];
  let out = await run(base);
  ok(out.slides.map((s) => s[0]).join() === 'Platform,Barber Shop,Tattoo Shop', 'no new fields → same labels and order as before', out.slides);
  ok(out.tabs.join() === 'Platform,Barber Shop,Tattoo Shop', 'tabs match the card', out.tabs);
  ok(/inktattoo-1\.webp/.test(out.slides[2][1]), 'no cover → first screenshot (old behavior)');
  const labelled = JSON.parse(JSON.stringify(base));
  labelled[0].skinLabel = 'Beauty Salon';
  labelled[1].skinOrder = 20; labelled[2].skinOrder = 10; labelled[2].skinLabel = 'Tattoo';
  labelled[2].coverImageUrl = '/assets/images/projects/inktattoo/inktattoo-demo-poster.webp';
  out = await run(labelled);
  ok(out.slides.map((s) => s[0]).join() === 'Beauty Salon,Tattoo,Barber Shop', 'labels and order applied', out.slides);
  ok(out.tabs.join() === 'Beauty Salon,Tattoo,Barber Shop', 'tabs follow the same order and labels', out.tabs);
  ok(/inktattoo-demo-poster\.webp/.test(out.slides[1][1]), 'video poster cover is used for the card');
  return r;
}
```

- [ ] **Step 2: Run it to verify it fails** — expected FAIL on "labels and order applied" and "video poster cover is used" (labels are titles, order is record order, poster cover is rejected).

- [ ] **Step 3: Load the module.** In `index.html`, directly before the `<script src="/assets/js/script.js?v=…">` tag add:

```html
  <script src="/assets/js/portfolio-skins.js?v=skins-20261015"></script>
```

In `portal.html`, directly before the `portfolio-detail-shared.js` tag add the same line. Run `node scripts/sync-spa-shells.mjs`.

- [ ] **Step 4: Cover validation.** Replace `portfolioExplicitCoverUrl` in `assets/js/script.js`:

```js
/** The cover the admin picked in Portfolio Projects, if it is still one of the record's slides or its video's poster. */
function portfolioExplicitCoverUrl(row) {
  if (!row || !row.coverImageUrl) return '';
  var cover = portfolioNormalizeAssetImageUrl(row.coverImageUrl);
  return window.PortfolioSkins.isAllowedCover(portfolioImageUrlsFromRecord(row), cover, portfolioVideoPosterUrlBest)
    ? cover
    : '';
}
```

- [ ] **Step 5: Order skins once, at the source.** In `getPortfolioDerivedBuilds`, wrap the filtered list:

```js
  return window.PortfolioSkins.orderSkins(all.filter(function (p) {
    if (!p || String(p.builtFromTemplateId || '') !== String(record.id)) return false;
    return portfolioImageUrlsFromRecord(p).length > 0;
  }));
```

- [ ] **Step 6: Split the rotator so the admin preview can reuse it.** Replace `portfolioRenderCardRotatorHtml` with:

```js
/** Platform still first, then each skin's still, in skin order, with card labels. */
function portfolioCardRotatorSlides(p) {
  return [{ index: 0, label: window.PortfolioSkins.labelFor(p, true), src: portfolioCardStillUrl(p) }].concat(
    getPortfolioDerivedBuilds(p).map(function (b, k) {
      return { index: k + 1, label: window.PortfolioSkins.labelFor(b, false), src: portfolioCardStillUrl(b) };
    })
  ).filter(function (s) { return !!s.src; });
}

function portfolioRenderCardRotatorHtml(p, alt) {
  return portfolioRenderRotatorFromSlides(portfolioCardRotatorSlides(p), alt);
}

function portfolioRenderRotatorFromSlides(slides, alt) {
  if (slides.length < 2) return '';
  return (
    /* …the existing body of portfolioRenderCardRotatorHtml from `'<div class="project-cover-rotator"…'`
       through the closing `'</div>'`, unchanged… */
  );
}
```

(Move the existing return expression verbatim into `portfolioRenderRotatorFromSlides`; it already reads `slides`, `alt`.)

- [ ] **Step 7: Tabs use the same labels.** In `renderPortfolioVariantTabs` replace the `tabs` construction:

```js
  var tabs = [{ label: window.PortfolioSkins.labelFor(record, true), record: record }].concat(
    builds.map(function (p) { return { label: window.PortfolioSkins.labelFor(p, false), record: p }; })
  );
```

- [ ] **Step 8: Built-with list order** in `assets/js/portfolio-detail-shared.js`, `renderBuiltWithTemplateHtml`, after `var builds = all.filter(…);` add:

```js
    // Same order as the card and tabs (portfolio-skins.js); the portal may not load it.
    if (typeof window !== 'undefined' && window.PortfolioSkins) builds = window.PortfolioSkins.orderSkins(builds);
```

(`builds` must be declared with `var`, not `const`.)

- [ ] **Step 9: Bump versions and re-run.** Bump `?v=` for `script.js` and `portfolio-detail-shared.js` in `index.html` and `portal.html`, sync shells, run the check → all PASS. Run `node scripts/preflight.mjs` → PASS.

---

### Task 3: Saving keeps label, order and poster covers

**Files:**
- Modify: `assets/js/script.js` — `portfolioSanitizeDocumentPayload`, `renderPortfolioFormImagesList`, `openPortfolioProjectModal`, the portfolio form submit payload, `serializePortfolioProjectFormState`, slides-list click handling

**Interfaces:**
- Consumes: `PortfolioSkins.isAllowedCover`, `PortfolioSkins.skinPatch` (Task 1).
- Produces:
  - `var portfolioFormSkinOrder = null;` (loaded record's `skinOrder`, written back unchanged)
  - `var portfolioFormSkinLabel = '';` (the edited record's own `skinLabel`; Task 4's platform row edits it)
  - Sanitizer outputs `skinLabel` (string) and `skinOrder` (number|null).

- [ ] **Step 1: Write the failing check** — `.playwright-mcp/check-skins-save.js`:

```js
async (page) => {
  const r = []; const ok = (c, n, d) => r.push((c ? 'PASS ' : 'FAIL ') + n + (c || d === undefined ? '' : ' :: ' + JSON.stringify(d)));
  await page.goto('http://localhost:5178/admin?nocache=' + Date.now()); await page.waitForTimeout(2500);
  const out = await page.evaluate(() => {
    const vids = ['/assets/images/projects/inktattoo/inktattoo-1.webp', '/assets/images/projects/inktattoo/inktattoo-demo.webm'];
    const poster = '/assets/images/projects/inktattoo/inktattoo-demo-poster.webp';
    const a = portfolioSanitizeDocumentPayload({ title: 'T', imageUrls: vids, coverImageUrl: poster, skinLabel: '  Tattoo Shop ', skinOrder: '10' });
    const b = portfolioSanitizeDocumentPayload({ title: 'T', imageUrls: vids, coverImageUrl: '/assets/images/projects/barbershop/barbershop.webp' });
    const c = portfolioSanitizeDocumentPayload({ title: 'T', imageUrls: vids });
    return { a: [a.coverImageUrl, a.skinLabel, a.skinOrder], b: b.coverImageUrl, c: [c.skinLabel, c.skinOrder] };
  });
  ok(/inktattoo-demo-poster/.test(out.a[0]), 'sanitizer keeps a poster cover', out.a);
  ok(out.a[1] === 'Tattoo Shop' && out.a[2] === 10, 'sanitizer keeps label and order', out.a);
  ok(out.b === '', 'foreign cover cleared', out.b);
  ok(out.c[0] === '' && out.c[1] === null, 'missing fields default', out.c);
  // Editor round-trip: open a skin, save, payload keeps its label/order/cover.
  const rt = await page.evaluate(async () => {
    window.isAdmin = () => true; let saved = null;
    window.rtdbSet = async (ref, v) => { saved = v; };
    window.rtdbRef = (db, path) => ({ path });
    window.rtdb = window.rtdb || {};
    loadPortfolioProjectsFromRtdb = async () => {};
    const skin = { id: 'T', title: 'Tattoo Shop', builtFromTemplateId: 'P', skinLabel: 'Tattoo', skinOrder: 10,
      imageUrls: ['/assets/images/projects/inktattoo/inktattoo-1.webp', '/assets/images/projects/inktattoo/inktattoo-demo.webm'],
      coverImageUrl: '/assets/images/projects/inktattoo/inktattoo-demo-poster.webp' };
    portfolioProjectsRtdb.length = 0; portfolioProjectsRtdb.push(skin);
    openPortfolioProjectModal(false, skin);
    document.getElementById('portfolio-project-form').requestSubmit();
    await new Promise((res) => setTimeout(res, 400));
    return saved && [saved.skinLabel, saved.skinOrder, saved.coverImageUrl];
  });
  ok(rt && rt[0] === 'Tattoo' && rt[1] === 10 && /poster/.test(rt[2]), "saving a skin from its own editor keeps label, order, cover", rt);
  // Slides list offers "Set poster as cover" on the video row.
  const btn = await page.evaluate(() => !!document.querySelector('#portfolio-project-images-list [data-portfolio-image-poster-cover]'));
  ok(btn || /poster/.test(rt && rt[2]), 'video row offers poster cover (or poster already the cover)');
  return r;
}
```

- [ ] **Step 2: Run it to verify it fails** — expected FAIL on poster cover kept, label/order kept, and round-trip.

- [ ] **Step 3: Sanitizer.** In `portfolioSanitizeDocumentPayload`, replace the `coverImageUrl` IIFE and add two fields after it:

```js
    // Card cover picked in admin: a slide still or one of its videos' posters; empty means auto.
    coverImageUrl: (function () {
      var cover = portfolioNormalizeAssetImageUrl(data.coverImageUrl || '');
      return window.PortfolioSkins.isAllowedCover(imageUrls, cover, portfolioVideoPosterUrlBest) ? cover : '';
    })(),
    // Short label on the card slide / popup tab, and position among a platform's skins.
    skinLabel: window.PortfolioSkins.skinPatch({ skinLabel: data.skinLabel }).skinLabel,
    skinOrder: window.PortfolioSkins.skinPatch({ skinOrder: data.skinOrder }).skinOrder,
```

- [ ] **Step 4: Editor carry-through.** Near `var portfolioFormCoverUrl = '';` add `var portfolioFormSkinOrder = null;`. In `openPortfolioProjectModal`, after `portfolioFormCoverUrl = …` add:

```js
  portfolioFormSkinOrder = !isNew && project ? window.PortfolioSkins.skinPatch({ skinOrder: project.skinOrder }).skinOrder : null;
  portfolioFormSkinLabel = !isNew && project ? String(project.skinLabel || '') : '';
```

(Declare `var portfolioFormSkinLabel = '';` next to `portfolioFormSkinOrder`.)

In the submit `payload` object add:

```js
        skinLabel: portfolioFormSkinLabel,
        skinOrder: portfolioFormSkinOrder,
```

In `serializePortfolioProjectFormState`, add to `state`: `skinLabel: portfolioFormSkinLabel,`

- [ ] **Step 5: Slides list accepts poster covers.** In `renderPortfolioFormImagesList`:

```js
  if (portfolioFormCoverUrl && !window.PortfolioSkins.isAllowedCover(parsed, portfolioFormCoverUrl, portfolioVideoPosterUrlBest)) portfolioFormCoverUrl = '';
```

and in the per-row badge logic, before `else if (isStill)`, add a video branch:

```js
      } else if (portfolioIsVideoUrl(url) && portfolioVideoPosterUrlBest(url)) {
        coverBadge = portfolioVideoPosterUrlBest(url) === portfolioFormCoverUrl
          ? '<button type="button" class="portfolio-slides-cover-badge" data-portfolio-image-cover-auto' +
            ' title="Its home-page poster is the card cover. Click to go back to auto.">Card cover · poster</button>'
          : '<button type="button" class="portfolio-slides-cover-set" data-portfolio-image-poster-cover="' + i + '">Set poster as cover</button>';
```

In the slides list click handler (the one handling `[data-portfolio-image-cover]`), add:

```js
    var posterBtn = e.target.closest('[data-portfolio-image-poster-cover]');
    if (posterBtn) {
      var urlsNow = getPortfolioFormImageUrlsFromDom();
      var vid = urlsNow[Number(posterBtn.getAttribute('data-portfolio-image-poster-cover'))];
      portfolioFormCoverUrl = vid ? portfolioVideoPosterUrlBest(vid) : '';
      renderPortfolioFormImagesList(urlsNow);
      if (typeof renderPortfolioSkinsSection === 'function') renderPortfolioSkinsSection();
      return;
    }
```

- [ ] **Step 6: Bump `script.js` version, sync, run the check → all PASS; `node scripts/preflight.mjs` → PASS.**

---

### Task 4: The Skins section (rows, preview, dirty tracking, navigation)

**Files:**
- Modify: `index.html` — new `<details>` section after `#portfolio-editor-section-template`, move `#portfolio-project-skin-label` into it as a visible text input; sync
- Modify: `assets/js/script.js` — Skins state, render, events, preview, pending-after-close hook, prefilled `builtFromTemplateId` for new projects
- Modify: `assets/css/style.css` — Skins section styles

**Interfaces:**
- Consumes: `portfolioRenderRotatorFromSlides`, `portfolioObserveCoverRotators(root)` (existing), `PortfolioSkins.*`.
- Produces:
  - `var portfolioSkinsForm = { platformId: '', rows: [] }` — row: `{ id, title, label, order, cover, urls, isPrivate, original: { label, order, cover } }`
  - `renderPortfolioSkinsSection()`
  - `portfolioSkinsChangedRows() → row[]` (rows whose label, order or cover differ from `original`; after a reorder every row's `order` is 10, 20, 30…)
  - `portfolioRunAfterEditorCloses(fn)`

- [ ] **Step 1: Write the failing check** — `.playwright-mcp/check-skins-section.js`:

```js
async (page) => {
  const r = []; const ok = (c, n, d) => r.push((c ? 'PASS ' : 'FAIL ') + n + (c || d === undefined ? '' : ' :: ' + JSON.stringify(d)));
  await page.goto('http://localhost:5178/admin?nocache=' + Date.now()); await page.waitForTimeout(2500);
  const setup = () => page.evaluate(() => {
    window.isAdmin = () => true;
    const recs = [
      { id: 'P', title: 'Chair & Studio Platform', isTemplate: true, imageUrls: ['/assets/images/projects/rosasalon/rosasalon.webp'] },
      { id: 'B', title: 'Barber Shop', builtFromTemplateId: 'P', imageUrls: ['/assets/images/projects/barbershop/barbershop.webp'] },
      { id: 'T', title: 'Tattoo Shop', builtFromTemplateId: 'P', visibility: 'private', imageUrls: ['/assets/images/projects/inktattoo/inktattoo-1.webp', '/assets/images/projects/inktattoo/inktattoo-demo.webm'] },
      { id: 'E', title: 'Empty skin', builtFromTemplateId: 'P', imageUrls: [] },
      { id: 'X', title: 'Unrelated', imageUrls: ['/a.webp'] }
    ];
    portfolioProjectsRtdb.length = 0; recs.forEach((x) => portfolioProjectsRtdb.push(x));
    window.portfolioProjectsAll = recs.slice(); window.portfolioProjects = recs.slice();
    openPortfolioProjectModal(false, recs[0]);
  });
  await setup(); await page.waitForTimeout(300);
  const st = () => page.evaluate(() => {
    const sec = document.getElementById('portfolio-editor-section-skins');
    const rows = [...document.querySelectorAll('[data-skin-row]')].map((el) => ({ id: el.getAttribute('data-skin-row'), text: el.innerText.replace(/\s+/g, ' ') }));
    const prev = [...document.querySelectorAll('#portfolio-skins-preview .project-cover-slide')].map((s) => s.getAttribute('data-label'));
    return { shown: !!(sec && !sec.hidden), rows, prev, dirty: isPortfolioProjectFormDirty() };
  });
  let s = await st();
  ok(s.shown, 'Skins section shows for a saved template');
  ok(s.rows.map((x) => x.id).join() === 'P,B,T,E', 'platform first, then skins (unrelated excluded)', s.rows.map((x) => x.id));
  ok(/Private/.test(s.rows[2].text) && /No images yet/.test(s.rows[3].text), 'private and no-images chips', s.rows.map((x) => x.text));
  ok(s.prev.join() === 'Platform,Barber Shop,Tattoo Shop', 'preview mirrors the card (empty skin not on it)', s.prev);
  ok(!s.dirty, 'not dirty right after opening');
  await page.fill('[data-skin-row="T"] [data-skin-label]', 'Tattoo');
  await page.click('[data-skin-row="T"] [data-skin-up]');
  await page.selectOption('[data-skin-row="T"] [data-skin-cover]', '/assets/images/projects/inktattoo/inktattoo-demo-poster.webp');
  await page.fill('#portfolio-project-skin-label', 'Beauty Salon');
  await page.waitForTimeout(200);
  s = await st();
  ok(s.rows.map((x) => x.id).join() === 'P,T,B,E', 'up moves Tattoo above Barber', s.rows.map((x) => x.id));
  ok(s.prev.join() === 'Beauty Salon,Tattoo,Barber Shop', 'preview follows label, order', s.prev);
  ok(s.dirty, 'skin edits count as unsaved changes');
  const changed = await page.evaluate(() => portfolioSkinsChangedRows().map((x) => [x.id, x.label, x.order, x.cover]));
  ok(changed.length === 3 && changed[0][0] === 'T' && changed[0][2] === 10 && changed[1][0] === 'B' && changed[1][2] === 20 && changed[2][0] === 'E', 'reorder renumbers all skins 10,20,30', changed);
  // Non-template: section hidden.
  await page.evaluate(() => { closePortfolioProjectModal({ force: true }); openPortfolioProjectModal(false, portfolioProjectsRtdb[1]); });
  ok(!(await st()).shown, 'hidden for a skin');
  // Add skin → new form prefilled with Built from = platform.
  await setup(); await page.waitForTimeout(200);
  await page.click('#portfolio-skins-add'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.getElementById('portfolio-project-edit-id').value === '' && document.getElementById('portfolio-project-built-from').value === 'P'), 'Add skin opens a new project built from the platform');
  // Edit full skin with unsaved edits → prompt; discard → opens the skin.
  await page.evaluate(() => closePortfolioProjectModal({ force: true })); await setup(); await page.waitForTimeout(200);
  await page.fill('[data-skin-row="B"] [data-skin-label]', 'Barber');
  await page.click('[data-skin-row="B"] [data-skin-edit]'); await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.getElementById('portfolio-unsaved-confirm-modal').classList.contains('active')), 'unsaved prompt before leaving');
  await page.click('#portfolio-unsaved-confirm-discard'); await page.waitForTimeout(400);
  ok(await page.evaluate(() => document.getElementById('portfolio-project-edit-id').value === 'B'), 'discard then opens the skin');
  return r;
}
```

- [ ] **Step 2: Run it to verify it fails** — expected FAIL from "Skins section shows" onward (no section).

- [ ] **Step 3: Markup.** In `index.html`, add after the closing `</details>` of `#portfolio-editor-section-template`:

```html
          <details class="portfolio-editor-section" data-portfolio-editor-section="skins" id="portfolio-editor-section-skins" hidden>
            <summary class="portfolio-editor-summary">
              <span class="portfolio-editor-summary-title">Skins</span>
              <span class="portfolio-editor-summary-hint">Card label, cover and order</span>
            </summary>
            <div class="portfolio-editor-section-body">
              <p class="form-hint">The portfolio card rotates through these in this order. Changes save with this project.</p>
              <ul class="portfolio-skins-list" id="portfolio-skins-list"></ul>
              <button type="button" class="btn btn-secondary btn-sm" id="portfolio-skins-add">
                <ion-icon name="add-outline" aria-hidden="true"></ion-icon> Add skin
              </button>
              <div class="portfolio-skins-preview-wrap">
                <p class="form-hint">Card preview</p>
                <div class="project-img portfolio-skins-preview" id="portfolio-skins-preview"></div>
              </div>
            </div>
          </details>
```

The platform row (rendered by JS) contains `<input type="text" id="portfolio-project-skin-label">`, filled from and writing back to `portfolioFormSkinLabel`.

- [ ] **Step 4: State and render** in `assets/js/script.js`, after `capturePortfolioProjectFormBaseline`:

```js
/**
 * Skins section: a template's skins (projects built from it) with their card
 * label, cover and order. Edits stay here until the platform is saved.
 */
var portfolioSkinsForm = { platformId: '', reordered: false, rows: [] };

function portfolioSkinsLoad(platform) {
  var id = platform && platform.id ? String(platform.id) : '';
  var skins = id
    ? window.PortfolioSkins.orderSkins(portfolioProjectsRtdb.filter(function (p) {
        return p && String(p.builtFromTemplateId || '') === id;
      }))
    : [];
  portfolioSkinsForm = {
    platformId: id,
    reordered: false,
    rows: skins.map(function (p) {
      var urls = portfolioImageUrlsFromRecord(p);
      var row = {
        id: String(p.id),
        title: p.title || 'Build',
        label: String(p.skinLabel || ''),
        order: window.PortfolioSkins.skinPatch({ skinOrder: p.skinOrder }).skinOrder,
        cover: portfolioExplicitCoverUrl(p),
        urls: urls,
        isPrivate: !isPortfolioPublic(p)
      };
      row.original = { label: row.label, order: row.order, cover: row.cover };
      return row;
    })
  };
}

function portfolioSkinsChangedRows() {
  return portfolioSkinsForm.rows.filter(function (r) {
    return r.label !== r.original.label || r.order !== r.original.order || r.cover !== r.original.cover;
  });
}

function portfolioSkinCoverOptionsHtml(urls, current) {
  return window.PortfolioSkins.coverChoices(urls, portfolioVideoPosterUrlBest)
    .map(function (c) {
      return '<option value="' + portfolioEscapeHtml(c.value) + '"' + (c.value === current ? ' selected' : '') + '>' +
        portfolioEscapeHtml(c.label) + '</option>';
    })
    .join('');
}

function portfolioSkinThumbHtml(src) {
  return src
    ? '<img src="' + portfolioEscapeHtml(portfolioDisplayImageSrc(src)) + '" alt="" loading="lazy">'
    : '<span class="portfolio-skin-thumb-empty" aria-hidden="true"></span>';
}

function renderPortfolioSkinsSection() {
  var section = document.getElementById('portfolio-editor-section-skins');
  var list = document.getElementById('portfolio-skins-list');
  if (!section || !list) return;
  var isTemplateEl = document.getElementById('portfolio-project-is-template');
  var editId = document.getElementById('portfolio-project-edit-id').value.trim();
  section.hidden = !(isTemplateEl && isTemplateEl.checked && editId);

  var platformLabel = portfolioFormSkinLabel;
  var formUrls = getPortfolioFormImageUrlsFromDom();
  var platformCover = portfolioFormCoverUrl || portfolioAutoCoverStillUrl({ imageUrls: formUrls });

  var html =
    '<li class="portfolio-skin-row is-platform" data-skin-row="' + portfolioEscapeHtml(editId) + '">' +
    '<div class="portfolio-skin-thumb">' + portfolioSkinThumbHtml(platformCover) + '</div>' +
    '<div class="portfolio-skin-body">' +
    '<p class="portfolio-skin-title">This platform</p>' +
    '<label class="portfolio-skin-field">Card label' +
    '<input type="text" class="form-input" id="portfolio-project-skin-label" maxlength="40" placeholder="Platform" value="' +
    portfolioEscapeHtml(platformLabel) + '"></label>' +
    '<label class="portfolio-skin-field">Cover' +
    '<select class="form-input" data-skin-platform-cover>' + portfolioSkinCoverOptionsHtml(formUrls, portfolioFormCoverUrl) + '</select></label>' +
    '</div></li>';

  html += portfolioSkinsForm.rows.map(function (r, i) {
    var src = r.cover || portfolioAutoCoverStillUrl({ imageUrls: r.urls });
    var chips =
      (r.isPrivate ? '<span class="portfolio-skin-chip">Private</span>' : '') +
      (!r.urls.length ? '<span class="portfolio-skin-chip is-warn">No images yet — not on the card</span>' : '');
    return (
      '<li class="portfolio-skin-row" data-skin-row="' + portfolioEscapeHtml(r.id) + '">' +
      '<div class="portfolio-skin-thumb">' + portfolioSkinThumbHtml(src) + '</div>' +
      '<div class="portfolio-skin-body">' +
      '<p class="portfolio-skin-title">' + portfolioEscapeHtml(r.title) + chips +
      ' <button type="button" class="portfolio-skin-edit" data-skin-edit>Edit full skin →</button></p>' +
      '<label class="portfolio-skin-field">Card label' +
      '<input type="text" class="form-input" data-skin-label maxlength="40" placeholder="' + portfolioEscapeHtml(r.title) + '" value="' +
      portfolioEscapeHtml(r.label) + '"></label>' +
      '<label class="portfolio-skin-field">Cover' +
      '<select class="form-input" data-skin-cover>' + portfolioSkinCoverOptionsHtml(r.urls, r.cover) + '</select></label>' +
      '</div>' +
      '<div class="portfolio-skin-move">' +
      '<button type="button" class="btn-icon" data-skin-up aria-label="Move up"' + (i === 0 ? ' disabled' : '') + '><ion-icon name="chevron-up-outline"></ion-icon></button>' +
      '<button type="button" class="btn-icon" data-skin-down aria-label="Move down"' + (i === portfolioSkinsForm.rows.length - 1 ? ' disabled' : '') + '><ion-icon name="chevron-down-outline"></ion-icon></button>' +
      '</div></li>'
    );
  }).join('');
  list.innerHTML = html;
  renderPortfolioSkinsPreview();
}

function renderPortfolioSkinsPreview() {
  var box = document.getElementById('portfolio-skins-preview');
  if (!box) return;
  var formUrls = getPortfolioFormImageUrlsFromDom();
  var slides = [{
    index: 0,
    label: window.PortfolioSkins.labelFor({ skinLabel: portfolioFormSkinLabel }, true),
    src: portfolioFormCoverUrl || portfolioAutoCoverStillUrl({ imageUrls: formUrls })
  }].concat(portfolioSkinsForm.rows.filter(function (r) { return r.urls.length; }).map(function (r, k) {
    return { index: k + 1, label: window.PortfolioSkins.labelFor({ skinLabel: r.label, title: r.title }, false), src: r.cover || portfolioAutoCoverStillUrl({ imageUrls: r.urls }) };
  })).filter(function (s) { return !!s.src; });
  box.innerHTML = portfolioRenderRotatorFromSlides(slides, 'Card preview') || '<p class="form-hint">Add a skin with images to see the card rotate.</p>';
  portfolioObserveCoverRotators(box);
}
```

- [ ] **Step 5: Events** (bind once, e.g. in the same setup that binds the portfolio form; guard with `dataset.bound`):

```js
function bindPortfolioSkinsSection() {
  var list = document.getElementById('portfolio-skins-list');
  if (!list || list.dataset.bound === '1') return;
  list.dataset.bound = '1';
  function rowOf(el) {
    var li = el.closest('[data-skin-row]');
    if (!li) return null;
    var id = li.getAttribute('data-skin-row');
    return portfolioSkinsForm.rows.find(function (r) { return r.id === id; }) || null;
  }
  list.addEventListener('input', function (e) {
    if (e.target.id === 'portfolio-project-skin-label') {
      portfolioFormSkinLabel = e.target.value;
      renderPortfolioSkinsPreview();
      return;
    }
    var row = rowOf(e.target);
    if (row && e.target.hasAttribute('data-skin-label')) row.label = e.target.value;
    renderPortfolioSkinsPreview();
  });
  list.addEventListener('change', function (e) {
    if (e.target.hasAttribute('data-skin-platform-cover')) {
      portfolioFormCoverUrl = e.target.value;
      renderPortfolioFormImagesList(getPortfolioFormImageUrlsFromDom());
      renderPortfolioSkinsSection();
      return;
    }
    var row = rowOf(e.target);
    if (row && e.target.hasAttribute('data-skin-cover')) {
      row.cover = e.target.value;
      renderPortfolioSkinsSection();
    }
  });
  list.addEventListener('click', function (e) {
    var row = rowOf(e.target);
    if (!row) return;
    var rows = portfolioSkinsForm.rows;
    var i = rows.indexOf(row);
    if (e.target.closest('[data-skin-up]') && i > 0) {
      rows.splice(i - 1, 0, rows.splice(i, 1)[0]);
    } else if (e.target.closest('[data-skin-down]') && i < rows.length - 1) {
      rows.splice(i + 1, 0, rows.splice(i, 1)[0]);
    } else if (e.target.closest('[data-skin-edit]')) {
      var skin = portfolioProjectsRtdb.find(function (p) { return String(p.id) === row.id; });
      portfolioRunAfterEditorCloses(function () { if (skin) openPortfolioProjectModal(false, skin); });
      return;
    } else {
      return;
    }
    portfolioSkinsForm.reordered = true;
    rows.forEach(function (r, k) { r.order = (k + 1) * 10; });
    renderPortfolioSkinsSection();
  });
  var addBtn = document.getElementById('portfolio-skins-add');
  if (addBtn) addBtn.addEventListener('click', function () {
    var platformId = portfolioSkinsForm.platformId;
    portfolioRunAfterEditorCloses(function () {
      openPortfolioProjectModal(true, { builtFromTemplateId: platformId, showQuoteButton: true });
    });
  });
  var isTemplateEl = document.getElementById('portfolio-project-is-template');
  if (isTemplateEl) isTemplateEl.addEventListener('change', renderPortfolioSkinsSection);
}
```

Call `portfolioSkinsLoad(isNew ? null : project); bindPortfolioSkinsSection(); renderPortfolioSkinsSection();` in `openPortfolioProjectModal` **before** the baseline is captured (find the existing `capturePortfolioProjectFormBaseline()` call for the modal and place these three calls just before it).

- [ ] **Step 6: Dirty tracking.** In `serializePortfolioProjectFormState`, add to `state`:

```js
    skins: portfolioSkinsForm.rows.map(function (r) { return [r.id, r.label, r.order, r.cover]; }),
```

- [ ] **Step 7: Pending action after the editor closes.**

```js
/** Runs fn once the editor actually closes (now, or after the unsaved prompt is resolved). */
var portfolioAfterEditorClose = null;
function portfolioRunAfterEditorCloses(fn) {
  portfolioAfterEditorClose = fn;
  closePortfolioProjectModal();
}
```

In `closePortfolioProjectModal`, at the very end of the real-close path (after the styles are reset), add:

```js
  var next = portfolioAfterEditorClose;
  portfolioAfterEditorClose = null;
  if (next) setTimeout(next, 0);
```

In `setupPortfolioUnsavedConfirmModal`, make `keepEditing` clear it: first line `portfolioAfterEditorClose = null;`.

- [ ] **Step 8: New project keeps a prefilled "Built from".** In `openPortfolioProjectModal`'s `else if (isNew && project)` branch add:

```js
    fillPortfolioBuiltFromSelect(project.builtFromTemplateId || '', '');
```

- [ ] **Step 9: Styles** (append to `assets/css/style.css` near the portfolio editor rules):

```css
/* Portfolio editor — Skins section */
.portfolio-skins-list { list-style: none; margin: 8px 0 12px; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.portfolio-skin-row { display: grid; grid-template-columns: 96px 1fr auto; gap: 12px; align-items: start; padding: 10px; border: 1px solid var(--jet); border-radius: 10px; }
.portfolio-skin-row.is-platform { grid-template-columns: 96px 1fr; border-color: hsla(45, 100%, 72%, 0.3); }
.portfolio-skin-thumb { width: 96px; aspect-ratio: 16 / 10; border-radius: 6px; overflow: hidden; background: var(--onyx); }
.portfolio-skin-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.portfolio-skin-body { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; min-width: 0; }
.portfolio-skin-title { grid-column: 1 / -1; margin: 0; font-weight: var(--fw-600); color: var(--white-2); display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.portfolio-skin-field { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--light-gray-70); }
.portfolio-skin-chip { font-size: 11px; font-weight: var(--fw-500); padding: 1px 7px; border: 1px solid var(--jet); border-radius: 6px; color: var(--light-gray-70); }
.portfolio-skin-chip.is-warn { border-color: hsla(35, 90%, 60%, 0.5); color: hsl(35, 90%, 70%); }
.portfolio-skin-edit { margin-left: auto; background: none; border: 0; color: var(--orange-yellow-crayola); font-size: 12px; cursor: pointer; }
.portfolio-skin-move { display: flex; flex-direction: column; gap: 4px; }
.portfolio-skins-preview-wrap { margin-top: 14px; }
.portfolio-skins-preview { position: relative; max-width: 360px; aspect-ratio: 16 / 10; border-radius: 10px; overflow: hidden; }
@media (max-width: 579px) {
  .portfolio-skin-row { grid-template-columns: 72px 1fr; }
  .portfolio-skin-thumb { width: 72px; }
  .portfolio-skin-body { grid-template-columns: 1fr; }
  .portfolio-skin-move { grid-column: 1 / -1; flex-direction: row; justify-content: flex-end; }
}
```

- [ ] **Step 10: Bump `script.js` and `style.css` versions, sync, run the check → all PASS; preflight → PASS.**

---

### Task 5: Saving the Skins section

**Files:**
- Modify: `assets/js/script.js` — portfolio form submit handler

**Interfaces:**
- Consumes: `portfolioSkinsChangedRows()`, `PortfolioSkins.skinPatch`, `window.rtdbUpdate(ref, patch)`.
- Produces: `async function savePortfolioSkinRows() → { failed: string[] }` (titles of skins whose update failed).

- [ ] **Step 1: Write the failing check** — `.playwright-mcp/check-skins-persist.js`:

```js
async (page) => {
  const r = []; const ok = (c, n, d) => r.push((c ? 'PASS ' : 'FAIL ') + n + (c || d === undefined ? '' : ' :: ' + JSON.stringify(d)));
  await page.goto('http://localhost:5178/admin?nocache=' + Date.now()); await page.waitForTimeout(2500);
  const run = (failId) => page.evaluate(async (failId) => {
    window.isAdmin = () => true;
    const writes = { set: [], update: [] };
    window.rtdb = window.rtdb || {}; window.rtdbRef = (db, path) => ({ path });
    window.rtdbSet = async (ref, v) => { writes.set.push(ref.path); };
    window.rtdbUpdate = async (ref, v) => { if (ref.path.endsWith('/' + failId)) throw new Error('denied'); writes.update.push([ref.path, v]); };
    loadPortfolioProjectsFromRtdb = async () => {};
    const recs = [
      { id: 'P', title: 'Chair & Studio Platform', isTemplate: true, imageUrls: ['/assets/images/projects/rosasalon/rosasalon.webp'] },
      { id: 'B', title: 'Barber Shop', builtFromTemplateId: 'P', imageUrls: ['/assets/images/projects/barbershop/barbershop.webp'], description: 'keep me' },
      { id: 'T', title: 'Tattoo Shop', builtFromTemplateId: 'P', imageUrls: ['/assets/images/projects/inktattoo/inktattoo-1.webp', '/assets/images/projects/inktattoo/inktattoo-demo.webm'] }
    ];
    portfolioProjectsRtdb.length = 0; recs.forEach((x) => portfolioProjectsRtdb.push(x));
    window.portfolioProjectsAll = recs.slice();
    openPortfolioProjectModal(false, recs[0]);
    const tRow = '[data-skin-row="T"]';
    const label = document.querySelector(tRow + ' [data-skin-label]'); label.value = 'Tattoo'; label.dispatchEvent(new Event('input', { bubbles: true }));
    const cover = document.querySelector(tRow + ' [data-skin-cover]'); cover.value = '/assets/images/projects/inktattoo/inktattoo-demo-poster.webp'; cover.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('portfolio-project-form').requestSubmit();
    await new Promise((res) => setTimeout(res, 500));
    return { writes, open: document.getElementById('portfolio-project-modal').classList.contains('active'), err: (document.querySelector('.error-message, .toast-error, [data-error-message]') || {}).textContent || '', memT: portfolioProjectsRtdb.find((x) => x.id === 'T') };
  }, failId);
  let o = await run('');
  ok(o.writes.set.join() === 'portfolioProjects/P', 'platform saved in full', o.writes.set);
  ok(o.writes.update.length === 1 && o.writes.update[0][0] === 'portfolioProjects/T', 'only the changed skin updated', o.writes.update.map((w) => w[0]));
  ok(JSON.stringify(Object.keys(o.writes.update[0][1]).sort()) === '["coverImageUrl","skinLabel","skinOrder"]' && o.writes.update[0][1].skinLabel === 'Tattoo' && /poster/.test(o.writes.update[0][1].coverImageUrl), 'skin update has only label, order, cover', o.writes.update[0]);
  ok(o.memT.skinLabel === 'Tattoo' && /poster/.test(o.memT.coverImageUrl), 'in-memory skin record patched (so its own editor saves the new label)', o.memT);
  ok(!o.open, 'editor closes on success');
  o = await run('T');
  ok(o.open, 'editor stays open when a skin fails');
  ok(/Tattoo Shop/.test(o.err), 'error names the skin', o.err);
  return r;
}
```

(If `showErrorMessage` renders elsewhere, adjust the selector in the check to read its text; the requirement is that the message contains the skin's title.)

- [ ] **Step 2: Run it to verify it fails** — expected FAIL on "only the changed skin updated" onward.

- [ ] **Step 3: Implement.** Add near the Skins functions:

```js
/** Writes each changed skin's label, order and cover only. Returns the titles that failed. */
async function savePortfolioSkinRows() {
  var failed = [];
  var rows = portfolioSkinsChangedRows();
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    var patch = window.PortfolioSkins.skinPatch({ skinLabel: r.label, skinOrder: r.order, coverImageUrl: r.cover });
    try {
      await window.rtdbUpdate(window.rtdbRef(window.rtdb, 'portfolioProjects/' + r.id), patch);
      // Keep the loaded copy current: the skin's own editor saves from it.
      var rec = portfolioProjectsRtdb.find(function (p) { return String(p.id) === r.id; });
      if (rec) Object.assign(rec, patch);
      r.original = { label: r.label, order: r.order, cover: r.cover };
    } catch (err) {
      console.error('Skin save failed', r.id, err);
      failed.push(r.title);
    }
  }
  return { failed: failed };
}
```

In the submit handler, inside `if (editId) { … }` right after `await updatePortfolioProjectDoc(editId, payload);`:

```js
          var skinResult = await savePortfolioSkinRows();
          if (skinResult.failed.length) {
            capturePortfolioProjectFormBaseline();
            showErrorMessage('Saved the platform, but these skins did not save: ' + skinResult.failed.join(', ') + '. Save again to retry.');
            return;
          }
```

(`capturePortfolioProjectFormBaseline` after a partial failure makes the saved rows clean and leaves only failed rows dirty, because their `original` was not updated.)

- [ ] **Step 4: Bump `script.js`, sync, run all four browser checks + `node scripts/test-portfolio-skins.mjs` + `node scripts/preflight.mjs` → all PASS.**

---

### Task 6: Final pass

**Files:** none new.

- [ ] **Step 1:** Run all browser checks again from a fresh page load (public, save, section, persist) and confirm PASS.
- [ ] **Step 2:** Screenshot the Skins section (desktop 1440×900 and 390×844) with the fake records; confirm no horizontal scroll and rows read cleanly.
- [ ] **Step 3:** `node scripts/preflight.mjs` → PASS. Confirm every changed file's `?v=` is bumped in all 20 shells (`grep -rho "portfolio-skins.js?v=[^\"']*" --include="*.html" . | sort | uniq -c` shows 20 + portal).
- [ ] **Step 4:** Remove `.playwright-mcp/`, stop the local server. Leave all changes uncommitted for Ruben.
