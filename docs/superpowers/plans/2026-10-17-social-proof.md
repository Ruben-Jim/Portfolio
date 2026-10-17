# Social Proof List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The homepage "Trusted by local businesses" spotlight shows real clients with sourced results. The entries come from an admin-managed Social proof list, and the 3 real clients are built in.

**Architecture:**
- **Shared logic:** the pure rules (% math, labels, sanitizing, validation, which entries show, check-in due) live in a new UMD module, `assets/js/social-proof.js`. Every page loads it, and Node tests require it.
- **Homepage:** reads the public RTDB node `socialProof` once and renders through the module. While the read is pending, fails, or the node is empty, the module's built-ins show.
- **Admin:** a new lazy-loaded script, `assets/js/social-proof-admin.js`, drives a section in Admin → Testimonials and a numbered drawer. It writes `socialProof/{id}` (public) and `socialProofDetails/{id}` (admin-only) in one multi-path update.

**Tech Stack:**
- Plain HTML/CSS/JS (legacy SPA, 20 shell copies of `index.html`)
- Firebase RTDB (modular SDK exposed as `window.rtdb*`)
- Node test scripts (`node scripts/test-*.mjs`)
- `playwright-core` WebKit for browser checks

**Spec:** `docs/superpowers/specs/2026-10-17-social-proof-design.md`

## Global Constraints

- **No git commits or pushes.** Ruben commits. Every "Checkpoint" step only runs the tests and notes the state.
- **No `firebase deploy`.** Ruben deploys rules (`firebase deploy --only database`).
- **Production data:** never read its contents. Browser checks use fake data only.
- **Shell edits:** markup and `?v=` cache-buster changes go into `index.html`, then `node scripts/sync-spa-shells.mjs`. Then verify all 20 shells with `grep -rl "<marker>" --include=index.html . | grep -v node_modules | wc -l`, which must print `20`.
- **Admin-only code:** a new admin-only script goes in the `CLASSIC` list inside `loadAdminBundle()` in `index.html`, never in a `<script>` tag. Public code must `typeof`-guard admin globals.
- **Limits** (from the spec): client 1–80, logoUrl ≤ 500 (`/assets/…` or `https://`), stat ≤ 12, label ≤ 80, source `app`|`client`|`''`, asOf `YYYY-MM`|`''`, summary ≤ 200, projectId ≤ 64, note ≤ 500, MAX 6 slides, check-in due at 60+ days after launch.
- **Display rules:**
  - Percent uses U+2212 for minus and rounds to a whole number.
  - Source labels: EN "From the app" / "Client-reported", ES "Desde la app" / "Según el cliente".
- **Validation:** the plan adds two rules beyond the spec's list, both implied by the spec's slide layouts. A number needs "what it measures", and a published entry needs a number or a what-we-built line.
- **Built-in entries** (exact text):
  - `builtin-rizo`: "Rizo's Pizzeria", `/assets/images/logo/logo-2-color.png`, "Online ordering with real-time order tracking for customers and a kitchen dashboard that keeps every order moving."
  - `builtin-shelton`: "Shelton Springs HOA", `/assets/images/logo/logo-1-color.png`, "A resident portal and board tools built for how the neighborhood actually runs day to day."
  - `builtin-procleaning`: "ProCleaning Seattle", `/assets/images/logo/logo-3-color.png`, "Field service workflows that keep crews, schedules, and customers in sync from the job site."
- **Paths:**
  - `SCRATCH=/private/tmp/claude-501/-Users-ruben-Dev-Apps-Portfolio/50754f9c-b62d-454d-b72f-7050a00fbc90/scratchpad`
  - Local server: `node $SCRATCH/portal-server.mjs /Users/ruben/Dev/Apps/Portfolio` (port 5178)
  - WebKit: `require('/Users/ruben/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core').webkit.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/webkit-2370/pw_run.sh' })`
- **Starting state:** the working tree has uncommitted "spotlight2" changes (portfolio fields `homeSpotlight`, `clientLogoUrl`, `resultStat`, `resultLabel`, and the `landingSpotlight*` helpers). Task 3 removes them.

## Review Focus

1. **Deleting the last database entry** brings the built-ins back (spec rule: an empty list means built-ins). Ruben should be warned in the delete confirm. Covered by the `confirmDeleteText` test in Task 4.
2. **Before/after typed as `"1,200"`, `"$40"` or `" 55 "`** should parse as numbers, not fail validation. Covered by `num`/`percentChange` tests in Task 1.
3. **Opening a built-in and closing without Save** must write nothing, so the built-ins aren't copied by accident. Covered by the Task 4 browser check.
4. **Switching the homepage to Spanish** should redraw source and month labels in Spanish. Covered by the `cwr:langchange` check in the Task 3 browser check.
5. **Rules not deployed yet:**
   - The homepage keeps showing the built-ins.
   - An admin save shows the deploy message and keeps the drawer's edits.
   - Covered by the Task 3 browser check (read rejects) and the Task 4 browser check (update rejects).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `assets/js/social-proof.js` | Create | Pure rules + built-ins (`window.SocialProof` / `module.exports`). |
| `scripts/test-social-proof.mjs` | Create | Node tests for the module (Task 1) and homepage wiring checks (Task 3). |
| `database.rules.json` | Modify (end of file) | `socialProof` (public read, admin write, validated) and `socialProofDetails` (admin). |
| `scripts/test-social-proof-rules.mjs` | Create | Rules shape matches the sanitizer's fields. |
| `assets/js/script.js` | Modify | Remove portfolio-field spotlight; homepage reads `socialProof`; admin tab hook. |
| `assets/js/i18n.js` | Modify | Dispatch `cwr:langchange` after applying translations. |
| `index.html` (+19 shells via sync) | Modify | Load `social-proof.js`; remove portfolio-editor spotlight fields; admin section + drawer; admin bundle entry; cache-busters. |
| `assets/css/style.css` | Modify | Drop cover-thumb rule; admin list + drawer styles. |
| `assets/js/social-proof-admin.js` | Create | Admin list, drawer, save/delete/reorder, Results check-in. |
| `scripts/test-social-proof-admin.mjs` | Create | Node tests for the admin script's pure helpers. |
| `scripts/test-landing-spotlight.mjs` | Delete | Replaced by `test-social-proof.mjs`. |
| `~/Dev/Apps/blueprints/portfolio-security.md` | Modify | Document the two new nodes. |

---

### Task 1: Shared social proof module

**Files:**
- Create: `assets/js/social-proof.js`
- Test: `scripts/test-social-proof.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces `window.SocialProof` / `module.exports` with:
  - `BUILT_IN: Entry[]`
  - `MAX: 6`
  - `CHECK_IN_DAYS: 60`
  - `num(v) → number|null`
  - `percentChange(before, after) → string`
  - `formatCount(raw) → string`
  - `statFor(details) → string`
  - `sourceLabel(source, lang) → string`
  - `monthLabel(asOf, lang) → string`
  - `metaLine(entry, lang) → string`
  - `cleanLogoUrl(raw) → string`
  - `sanitizeEntry(raw) → Entry`
  - `sanitizeDetails(raw) → Details`
  - `validate(entry, details) → string[]`
  - `visibleEntries(dbList|null, builtIns) → Entry[]`
  - `checkInDue(details, entry, today: Date) → boolean`
- `Entry` = `{ client, logoUrl, stat, label, source, asOf, summary, projectId, published, order, updatedAt }`. Built-ins also carry `id`.
- `Details` = `{ kind: 'change'|'count'|'none', before: number|null, after: number|null, count: string, note, launchDate, createdAt }`.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-social-proof.mjs`:

```js
#!/usr/bin/env node
/**
 * Homepage social proof rules (assets/js/social-proof.js).
 *   node scripts/test-social-proof.mjs
 *
 * Guards: results are computed honestly (% from before/after, counts as typed),
 * every number carries a source and month, public entries only hold display
 * fields, drafts never show, the built-in clients show until the database has
 * entries, and "Check-in due" fires 60 days after launch.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SP = require('../assets/js/social-proof.js');

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const MINUS = '−';

// Numbers people type
ok(SP.num('1,200') === 1200 && SP.num('$40') === 40 && SP.num(' 55 ') === 55, 'num: commas, $ and spaces are fine');
ok(SP.num('') === null && SP.num('abc') === null && SP.num(null) === null && SP.num(NaN) === null, 'num: blank / text → null');
ok(SP.num(12.5) === 12.5 && SP.num('12.5') === 12.5, 'num: decimals');

// % change
ok(SP.percentChange(40, 55) === '+38%', '40 → 55 is +38%');
ok(SP.percentChange('40', '30') === MINUS + '25%', '40 → 30 is −25% (real minus sign)');
ok(SP.percentChange(10, 10) === '+0%', 'no change is +0%');
ok(SP.percentChange(10, 130) === '+1,200%', 'big % gets a thousands separator');
ok(SP.percentChange(0, 10) === '' && SP.percentChange(-5, 10) === '', 'before must be above 0');
ok(SP.percentChange(10, -1) === '' && SP.percentChange(10, '') === '' && SP.percentChange('x', 5) === '', 'bad after / text → no %');

// Counts
ok(SP.formatCount('1240') === '1,240' && SP.formatCount('1,240') === '1,240', 'digits get separators');
ok(SP.formatCount(' 86+ ') === '86+', 'other text kept as typed, trimmed');
ok(SP.formatCount('') === '', 'blank → blank');

// statFor
ok(SP.statFor({ kind: 'change', before: 40, after: 55 }) === '+38%', 'statFor change');
ok(SP.statFor({ kind: 'count', count: '86' }) === '86', 'statFor count');
ok(SP.statFor({ kind: 'none', count: '86' }) === '' && SP.statFor(null) === '', 'statFor none / missing');

// Labels
ok(SP.sourceLabel('app', 'en') === 'From the app' && SP.sourceLabel('client', 'en') === 'Client-reported', 'source labels EN');
ok(SP.sourceLabel('app', 'es') === 'Desde la app' && SP.sourceLabel('client', 'es') === 'Según el cliente', 'source labels ES');
ok(SP.sourceLabel('other', 'en') === '', 'unknown source → blank');
ok(SP.monthLabel('2026-09', 'en') === 'Sep 2026' && SP.monthLabel('2026-09', 'es') === 'sep 2026', 'month labels');
ok(SP.monthLabel('2026-13', 'en') === '' && SP.monthLabel('', 'en') === '', 'bad month → blank');
ok(SP.metaLine({ client: "Rizo's Pizzeria", source: 'app', asOf: '2026-09' }, 'en') === "Rizo's Pizzeria · From the app · Sep 2026", 'meta line');
ok(SP.metaLine({ client: 'Shop', source: '', asOf: '' }, 'en') === 'Shop', 'meta line skips blanks');

// Logo URLs (same rules the portfolio field had)
ok(SP.cleanLogoUrl('/assets/images/logo/logo-3-color.png') === '/assets/images/logo/logo-3-color.png', 'asset path kept');
ok(SP.cleanLogoUrl('./assets/a.png') === '/assets/a.png' && SP.cleanLogoUrl('assets/a.png') === '/assets/a.png', 'relative asset paths normalized');
ok(SP.cleanLogoUrl('https://cdn.example.com/l.png') === 'https://cdn.example.com/l.png', 'https kept');
for (const bad of ['javascript:alert(1)', 'http://x.com/l.png', 'data:image/png;base64,AA', '/assets/x" onerror="y', '//evil.com/x.png', 'https://x.com/a b.png', '/assets/' + 'a'.repeat(600)]) {
  ok(SP.cleanLogoUrl(bad) === '', `logo rejects ${JSON.stringify(bad.slice(0, 40))}`);
}

// sanitizeEntry: only display fields, all limits applied
const e = SP.sanitizeEntry({
  client: '  ' + 'C'.repeat(90), logoUrl: 'javascript:x', stat: '+38%-too-long-value', label: 'L'.repeat(90),
  source: 'friend', asOf: '2026-9', summary: 'S'.repeat(250), projectId: 'bad/id', published: 'true',
  order: 'x', updatedAt: -1, before: 40, note: 'secret',
});
ok(Object.keys(e).sort().join() === 'asOf,client,label,logoUrl,order,projectId,published,source,stat,summary,updatedAt', 'entry keeps only display fields (no before/after/note)');
ok(e.client.length === 80 && e.label.length === 80 && e.summary.length === 200 && e.stat.length === 12, 'lengths capped');
ok(e.logoUrl === '' && e.source === '' && e.asOf === '' && e.projectId === '', 'bad values dropped');
ok(e.published === false && e.order === 0 && e.updatedAt === 0, 'published only when true; numbers default to 0');
ok(SP.sanitizeEntry({ projectId: '-OaBc_12-x' }).projectId === '-OaBc_12-x', 'RTDB push ids allowed');

// sanitizeDetails
const d = SP.sanitizeDetails({ kind: 'change', before: '1,000', after: '$1,250', count: 'x', note: 'N'.repeat(600), launchDate: '2026-08-01', createdAt: 5 });
ok(d.kind === 'change' && d.before === 1000 && d.after === 1250 && d.count === '', 'change keeps before/after only');
ok(d.note.length === 500 && d.launchDate === '2026-08-01' && d.createdAt === 5, 'note capped, date + createdAt kept');
const dc = SP.sanitizeDetails({ kind: 'count', count: ' 86 ', before: 3 });
ok(dc.kind === 'count' && dc.count === '86' && dc.before === null, 'count keeps count only');
ok(SP.sanitizeDetails({ kind: 'weird', launchDate: 'soon' }).kind === 'none' && SP.sanitizeDetails({}).launchDate === '', 'unknown kind → none; bad date dropped');

// validate
const good = { client: 'Rizo', label: 'more online orders per week', source: 'app', asOf: '2026-09', published: true, summary: '' };
ok(SP.validate(good, { kind: 'change', before: 40, after: 55 }).length === 0, 'valid % entry');
ok(SP.validate({ ...good, client: ' ' }, { kind: 'none' }).includes("Add the client's name."), 'client required');
ok(SP.validate(good, { kind: 'change', before: 0, after: 5 }).includes('Before must be a number above 0.'), 'before > 0');
ok(SP.validate(good, { kind: 'change', before: 5, after: null }).includes('After must be a number, 0 or more.'), 'after required');
ok(SP.validate(good, { kind: 'count', count: '' }).includes('Add the count.'), 'count required');
ok(SP.validate(good, { kind: 'count', count: '1234567890123' }).includes('Keep the count to 12 characters or fewer.'), 'count length');
ok(SP.validate({ ...good, label: '' }, { kind: 'count', count: '86' }).includes('Say what the number measures.'), 'label required with a number');
ok(SP.validate({ ...good, source: '' }, { kind: 'count', count: '86' }).includes('Pick where the number came from.'), 'source required with a number');
ok(SP.validate({ ...good, asOf: '' }, { kind: 'count', count: '86' }).includes('Pick the month the number is from.'), 'month required with a number');
ok(SP.validate({ client: 'Shop', published: true, summary: '' }, { kind: 'none' }).includes('Add a number or a what-we-built line before publishing.'), 'published needs a number or summary');
ok(SP.validate({ client: 'Shop', published: false, summary: '' }, { kind: 'none' }).length === 0, 'drafts can be bare');

// visibleEntries
const db = [
  { id: 'b', client: 'B', published: true, order: 20 },
  { id: 'a', client: 'A', published: true, order: 10 },
  { id: 'd', client: 'Draft', published: false, order: 5 },
];
ok(SP.visibleEntries(db, SP.BUILT_IN).map((x) => x.id).join() === 'a,b', 'database: published only, by order');
ok(SP.visibleEntries(null, SP.BUILT_IN).length === 3 && SP.visibleEntries([], SP.BUILT_IN).length === 3, 'not loaded / empty → built-ins');
ok(SP.visibleEntries([{ id: 'd', client: 'D', published: false, order: 1 }], SP.BUILT_IN).length === 0, 'entries but none published → nothing (section hides)');
ok(SP.visibleEntries(Array.from({ length: 9 }, (_, i) => ({ id: 'x' + i, client: 'X', published: true, order: i })), SP.BUILT_IN).length === SP.MAX, `at most ${SP.MAX}`);

// Built-ins
ok(SP.BUILT_IN.map((b) => b.id).join() === 'builtin-rizo,builtin-shelton,builtin-procleaning', 'three built-ins in order');
ok(SP.BUILT_IN.every((b) => b.published === true && b.stat === '' && b.summary && b.logoUrl.startsWith('/assets/images/logo/')), 'built-ins: published, no invented numbers, logo + summary');
ok(SP.BUILT_IN.every(({ id, ...rest }) => JSON.stringify(SP.sanitizeEntry(rest)) === JSON.stringify(rest)), 'built-ins are already in sanitized shape');

// checkInDue (launch 2026-08-01; Aug 1 + 60 days = Sep 30)
const det = { launchDate: '2026-08-01' };
ok(SP.checkInDue(det, { stat: '' }, new Date(2026, 8, 29)) === false, '59 days: not due');
ok(SP.checkInDue(det, { stat: '' }, new Date(2026, 8, 30)) === true, '60 days: due');
ok(SP.checkInDue(det, { stat: '' }, new Date(2026, 9, 1)) === true, '61 days: due');
ok(SP.checkInDue(det, { stat: '+38%' }, new Date(2026, 9, 1)) === false, 'already has a number: not due');
ok(SP.checkInDue({ launchDate: '' }, { stat: '' }, new Date(2026, 9, 1)) === false, 'no launch date: not due');
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node scripts/test-social-proof.mjs`
Expected: FAIL with `Cannot find module '../assets/js/social-proof.js'`.

- [ ] **Step 3: Write the module**

Create `assets/js/social-proof.js`:

```js
/**
 * Social proof — pure rules shared by the homepage spotlight and Admin →
 * Testimonials → Social proof. Public entries live in RTDB socialProof/{id};
 * the raw numbers behind them in admin-only socialProofDetails/{id}.
 * Browser: window.SocialProof. Node (tests): module.exports.
 */
(function (root) {
  'use strict';

  var MAX = 6;
  var CHECK_IN_DAYS = 60;
  var MINUS = '−';
  var LIMITS = { client: 80, logoUrl: 500, stat: 12, label: 80, summary: 200, note: 500, count: 24 };
  var MONTH_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;
  var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

  // Real clients, so the homepage is never empty. No numbers until Ruben has real ones.
  var BUILT_IN = [
    {
      id: 'builtin-rizo', client: "Rizo's Pizzeria", logoUrl: '/assets/images/logo/logo-2-color.png',
      stat: '', label: '', source: '', asOf: '',
      summary: 'Online ordering with real-time order tracking for customers and a kitchen dashboard that keeps every order moving.',
      projectId: '', published: true, order: 10, updatedAt: 0
    },
    {
      id: 'builtin-shelton', client: 'Shelton Springs HOA', logoUrl: '/assets/images/logo/logo-1-color.png',
      stat: '', label: '', source: '', asOf: '',
      summary: 'A resident portal and board tools built for how the neighborhood actually runs day to day.',
      projectId: '', published: true, order: 20, updatedAt: 0
    },
    {
      id: 'builtin-procleaning', client: 'ProCleaning Seattle', logoUrl: '/assets/images/logo/logo-3-color.png',
      stat: '', label: '', source: '', asOf: '',
      summary: 'Field service workflows that keep crews, schedules, and customers in sync from the job site.',
      projectId: '', published: true, order: 30, updatedAt: 0
    }
  ];

  var SOURCES = {
    app: { en: 'From the app', es: 'Desde la app' },
    client: { en: 'Client-reported', es: 'Según el cliente' }
  };
  var MONTHS = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  };

  function str(v, max) {
    return String(v == null ? '' : v).trim().slice(0, max);
  }

  /** A number from what someone typed ("1,200", "$40", " 55 "), else null. */
  function num(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var s = String(v == null ? '' : v).replace(/[\s,$]/g, '');
    if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
    return Number(s);
  }

  function percentChange(before, after) {
    var b = num(before);
    var a = num(after);
    if (b == null || a == null || !(b > 0) || a < 0) return '';
    var pct = Math.round(((a - b) / b) * 100);
    var abs = Math.abs(pct).toLocaleString('en-US');
    return (pct < 0 ? MINUS : '+') + abs + '%';
  }

  function formatCount(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (/^\d[\d,]*$/.test(s)) return Number(s.replace(/,/g, '')).toLocaleString('en-US');
    return s;
  }

  function statFor(details) {
    var d = details || {};
    if (d.kind === 'change') return percentChange(d.before, d.after);
    if (d.kind === 'count') return formatCount(d.count);
    return '';
  }

  function sourceLabel(source, lang) {
    var s = SOURCES[source];
    if (!s) return '';
    return lang === 'es' ? s.es : s.en;
  }

  function monthLabel(asOf, lang) {
    var m = MONTH_RE.exec(String(asOf || ''));
    if (!m) return '';
    return (lang === 'es' ? MONTHS.es : MONTHS.en)[Number(m[2]) - 1] + ' ' + m[1];
  }

  /** "Rizo's Pizzeria · From the app · Sep 2026" (blank parts skipped). */
  function metaLine(entry, lang) {
    var e = entry || {};
    return [String(e.client || ''), sourceLabel(e.source, lang), monthLabel(e.asOf, lang)]
      .filter(Boolean)
      .join(' · ');
  }

  /** A site asset path or an https URL, else ''. */
  function cleanLogoUrl(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (s.length > LIMITS.logoUrl) return '';
    if (/^\.?\/?assets\//i.test(s)) s = '/' + s.replace(/^\.?\//, '');
    if (/^\/assets\/[A-Za-z0-9._\/-]+$/.test(s)) return s;
    if (/^https:\/\/[^\s"'<>]+$/i.test(s)) return s;
    return '';
  }

  /** The public entry: display fields only, every limit applied. */
  function sanitizeEntry(raw) {
    var r = raw || {};
    var order = Number(r.order);
    var updatedAt = Number(r.updatedAt);
    return {
      client: str(r.client, LIMITS.client),
      logoUrl: cleanLogoUrl(r.logoUrl),
      stat: str(r.stat, LIMITS.stat),
      label: str(r.label, LIMITS.label),
      source: r.source === 'app' || r.source === 'client' ? r.source : '',
      asOf: MONTH_RE.test(String(r.asOf || '')) ? String(r.asOf) : '',
      summary: str(r.summary, LIMITS.summary),
      projectId: /^[A-Za-z0-9_-]{1,64}$/.test(String(r.projectId || '')) ? String(r.projectId) : '',
      published: r.published === true,
      order: isFinite(order) ? order : 0,
      updatedAt: updatedAt > 0 ? updatedAt : 0
    };
  }

  /** The admin-only inputs behind an entry. */
  function sanitizeDetails(raw) {
    var r = raw || {};
    var kind = r.kind === 'change' || r.kind === 'count' ? r.kind : 'none';
    var createdAt = Number(r.createdAt);
    return {
      kind: kind,
      before: kind === 'change' ? num(r.before) : null,
      after: kind === 'change' ? num(r.after) : null,
      count: kind === 'count' ? str(r.count, LIMITS.count) : '',
      note: str(r.note, LIMITS.note),
      launchDate: DATE_RE.test(String(r.launchDate || '')) ? String(r.launchDate) : '',
      createdAt: createdAt > 0 ? createdAt : 0
    };
  }

  function validate(entry, details) {
    var e = entry || {};
    var d = details || {};
    var errors = [];
    if (!String(e.client || '').trim()) errors.push("Add the client's name.");
    if (d.kind === 'change') {
      var b = num(d.before);
      var a = num(d.after);
      if (b == null || !(b > 0)) errors.push('Before must be a number above 0.');
      if (a == null || a < 0) errors.push('After must be a number, 0 or more.');
    }
    if (d.kind === 'count') {
      var c = formatCount(d.count);
      if (!c) errors.push('Add the count.');
      else if (c.length > LIMITS.stat) errors.push('Keep the count to 12 characters or fewer.');
    }
    if (d.kind === 'change' || d.kind === 'count') {
      if (!String(e.label || '').trim()) errors.push('Say what the number measures.');
      if (e.source !== 'app' && e.source !== 'client') errors.push('Pick where the number came from.');
      if (!MONTH_RE.test(String(e.asOf || ''))) errors.push('Pick the month the number is from.');
    }
    if (e.published === true && !statFor(d) && !String(e.summary || '').trim()) {
      errors.push('Add a number or a what-we-built line before publishing.');
    }
    return errors;
  }

  function byOrder(a, b) {
    return (Number(a.order) || 0) - (Number(b.order) || 0);
  }

  /**
   * What the homepage shows. dbList null = not loaded / unreadable; [] = empty.
   * Either way the built-ins show. Saved entries with none published → [].
   */
  function visibleEntries(dbList, builtIns) {
    var list = Array.isArray(dbList) && dbList.length ? dbList : (builtIns || BUILT_IN);
    return list
      .filter(function (x) { return x && x.published === true && x.client; })
      .sort(byOrder)
      .slice(0, MAX);
  }

  /** No number yet, and 60+ days since launch. */
  function checkInDue(details, entry, today) {
    if (entry && String(entry.stat || '')) return false;
    var m = DATE_RE.exec(String((details && details.launchDate) || ''));
    if (!m) return false;
    var launch = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var t = today instanceof Date ? today : new Date(today);
    var now = Date.UTC(t.getFullYear(), t.getMonth(), t.getDate());
    return (now - launch) / 86400000 >= CHECK_IN_DAYS;
  }

  var api = {
    BUILT_IN: BUILT_IN,
    MAX: MAX,
    CHECK_IN_DAYS: CHECK_IN_DAYS,
    num: num,
    percentChange: percentChange,
    formatCount: formatCount,
    statFor: statFor,
    sourceLabel: sourceLabel,
    monthLabel: monthLabel,
    metaLine: metaLine,
    cleanLogoUrl: cleanLogoUrl,
    sanitizeEntry: sanitizeEntry,
    sanitizeDetails: sanitizeDetails,
    validate: validate,
    visibleEntries: visibleEntries,
    checkInDue: checkInDue
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SocialProof = api;
})(typeof window !== 'undefined' ? window : null);
```

- [ ] **Step 4: Run the test to make sure it passes**

Run: `node scripts/test-social-proof.mjs`
Expected: every line `✓`, exit code 0.

- [ ] **Step 5: Checkpoint (no commit; Ruben commits)**

Run: `node scripts/preflight.mjs 2>&1 | tail -1`
Expected: `✓ preflight: …`

---

### Task 2: Database rules for the two new nodes

**Files:**
- Modify: `database.rules.json` (insert before the final `  }\n}`)
- Test: `scripts/test-social-proof-rules.mjs`
- Modify: `~/Dev/Apps/blueprints/portfolio-security.md`

**Interfaces:**
- Consumes: `SocialProof.sanitizeEntry({})` keys (Task 1).
- Produces:
  - `socialProof/{id}`: public read, admin write, validated, no extra fields.
  - `socialProofDetails/{id}`: admin read and write.

- [ ] **Step 1: Write the failing test**

Create `scripts/test-social-proof-rules.mjs`:

```js
#!/usr/bin/env node
/**
 * RTDB rules for social proof (database.rules.json).
 *   node scripts/test-social-proof-rules.mjs
 *
 * Guards: anyone can read socialProof (the homepage needs it) but only the
 * admin writes it; its fields match exactly what SocialProof.sanitizeEntry
 * writes, so a save is never rejected and nothing extra can be stored;
 * socialProofDetails (raw before/after numbers, notes) is admin-only.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const SP = require('../assets/js/social-proof.js');

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const rules = JSON.parse(fs.readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8')).rules;
const ADMIN = rules.agencyInstallPages['.write'];

const pub = rules.socialProof;
ok(!!pub, 'socialProof node exists');
if (!pub) process.exit();
ok(pub['.read'] === true, 'socialProof: anyone can read (homepage)');
ok(pub['.write'] === ADMIN, 'socialProof: only the admin writes');
const item = pub.$id || {};
ok(/hasChildren\(\['client', 'published', 'order'\]\)/.test(item['.validate'] || ''), 'entry needs client, published, order');
const ruleFields = Object.keys(item).filter((k) => !k.startsWith('.') && k !== '$other').sort();
const writtenFields = Object.keys(SP.sanitizeEntry({})).sort();
ok(ruleFields.join() === writtenFields.join(), `rule fields match sanitizeEntry (${writtenFields.join(', ')})`);
ok(ruleFields.every((k) => typeof item[k]['.validate'] === 'string'), 'every field is validated');
ok(item.$other && item.$other['.validate'] === false, 'no other fields allowed');
ok(/<= 80/.test(item.client['.validate']) && /length > 0/.test(item.client['.validate']), 'client 1–80');
ok(/<= 12/.test(item.stat['.validate']) && /<= 200/.test(item.summary['.validate']) && /<= 500/.test(item.logoUrl['.validate']), 'stat / summary / logo limits');
ok(/app\|client/.test(item.source['.validate']), 'source is app | client | blank');
ok(/isBoolean/.test(item.published['.validate']) && /isNumber/.test(item.order['.validate']), 'published boolean, order number');

const det = rules.socialProofDetails;
ok(!!det && det['.read'] === ADMIN && det['.write'] === ADMIN, 'socialProofDetails: admin only');
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node scripts/test-social-proof-rules.mjs`
Expected: `✗ socialProof node exists`, exit code 1.

- [ ] **Step 3: Add the rules**

Run from the repo root:

```bash
python3 - <<'EOF'
import pathlib
p = pathlib.Path('database.rules.json'); s = p.read_text()
ADMIN = "auth != null && (auth.token.admin === true || (auth.token.email == 'ruben.jim.co@gmail.com' && auth.token.email_verified === true))"
anchor = '''      "$projectId": {
        ".read": true
      }
    }
  }
}'''
assert s.endswith(anchor + '\n') or s.endswith(anchor), 'unexpected end of database.rules.json'
new = '''      "$projectId": {
        ".read": true
      }
    },
    "socialProof": {
      ".read": true,
      ".write": "ADMIN",
      "$id": {
        ".validate": "newData.hasChildren(['client', 'published', 'order'])",
        "client": { ".validate": "newData.isString() && newData.val().length > 0 && newData.val().length <= 80" },
        "logoUrl": { ".validate": "newData.isString() && newData.val().length <= 500" },
        "stat": { ".validate": "newData.isString() && newData.val().length <= 12" },
        "label": { ".validate": "newData.isString() && newData.val().length <= 80" },
        "source": { ".validate": "newData.isString() && newData.val().matches(/^(app|client)?$/)" },
        "asOf": { ".validate": "newData.isString() && newData.val().matches(/^([0-9]{4}-(0[1-9]|1[0-2]))?$/)" },
        "summary": { ".validate": "newData.isString() && newData.val().length <= 200" },
        "projectId": { ".validate": "newData.isString() && newData.val().length <= 64" },
        "published": { ".validate": "newData.isBoolean()" },
        "order": { ".validate": "newData.isNumber()" },
        "updatedAt": { ".validate": "newData.isNumber()" },
        "$other": { ".validate": false }
      }
    },
    "socialProofDetails": {
      ".read": "ADMIN",
      ".write": "ADMIN"
    }
  }
}'''.replace('ADMIN', ADMIN)
s = s.rstrip('\n')
s = s[: len(s) - len(anchor)] + new + '\n'
p.write_text(s)
print('ok')
EOF
node -e "JSON.parse(require('fs').readFileSync('database.rules.json','utf8')); console.log('valid JSON')"
```

Expected: `ok` then `valid JSON`.

- [ ] **Step 4: Run the test to make sure it passes**

Run: `node scripts/test-social-proof-rules.mjs`
Expected: every line `✓`.

- [ ] **Step 5: Document the nodes in the security file**

In `~/Dev/Apps/blueprints/portfolio-security.md`, in the "Where each thing is enforced" table, add these two rows after the `agencyInstallPages/{id}` row:

```markdown
| `socialProof/{id}` | Public read (homepage "Trusted by local businesses"); admin write. Fields validated, nothing extra allowed |
| `socialProofDetails/{id}` | Admin only: raw before/after numbers and "how measured" notes behind each social proof entry |
```

In "Deploy order", under step 6, add this line:

```markdown
   Social proof (2026-10-17) needs `firebase deploy --only database`. Until then the homepage shows the built-in clients and Admin → Social proof saves fail with a "deploy the database rules" message.
```

- [ ] **Step 6: Checkpoint (no commit; Ruben commits)**

Run: `node scripts/preflight.mjs 2>&1 | tail -1`
Expected: `✓ preflight: …`

---

### Task 3: Homepage reads the Social proof list (and the portfolio fields come out)

**Files:**
- Modify: `assets/js/script.js`
  - the `// "Trusted by local businesses"` helper block, ending before `var landingSpotlightTimers`
  - `initLandingSocialProofSpotlight`
  - the `portfolioProjectsLoaded` listener
  - the portfolio sanitizer, editor fill, save payload and unsaved-changes check
- Modify: `assets/js/i18n.js` (end of `applyTranslations`)
- Modify: `index.html` (portfolio editor block; `social-proof.js` script tag; cache-busters), then sync
- Modify: `assets/css/style.css` (drop `.cwr-landing-spotlight-logo.is-cover img`)
- Delete: `scripts/test-landing-spotlight.mjs`
- Test: append wiring checks to `scripts/test-social-proof.mjs`; browser check `$SCRATCH/sp-home-check.cjs`

**Interfaces:**
- Consumes: `window.SocialProof.{visibleEntries, sanitizeEntry, metaLine, BUILT_IN}` (Task 1); `escapeLandingSpotlightText`, `cwrText`, `prefersReducedMotion`, `setLandingSpotlightSlide`, `startLandingSocialProofSpotlight`, `stopLandingSocialProofSpotlight`, `window.openPortfolioProjectDetail` (existing in script.js).
- Produces:
  - `loadLandingSocialProof()`: one RTDB read per page load.
  - `landingSocialProofDb`: `null` until read, then `Entry[]` with `id`.
  - A `cwr:langchange` document event dispatched by i18n.js.

- [ ] **Step 1: Write the failing wiring test**

Append to `scripts/test-social-proof.mjs`:

```js
// ── Homepage wiring (Task 3) ──
import fs from 'node:fs';
const read = (p) => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const script = read('assets/js/script.js');
const shell = read('index.html');
ok(!/homeSpotlight|clientLogoUrl|resultStat|resultLabel|landingSpotlightProjects|portfolioSanitizeLogoUrl/.test(script), 'script.js: portfolio-field spotlight is gone');
ok(!/portfolio-project-home-spotlight|portfolio-project-client-logo|portfolio-project-result-stat/.test(shell), 'index.html: portfolio-editor spotlight fields are gone');
ok(/SocialProof\.visibleEntries\(landingSocialProofDb/.test(script), 'homepage renders through SocialProof.visibleEntries');
ok(/rtdbRef\(window\.rtdb, 'socialProof'\)/.test(script), 'homepage reads socialProof');
const spTag = shell.indexOf('/assets/js/social-proof.js?v=');
ok(spTag > 0 && spTag < shell.indexOf('/assets/js/script.js?v='), 'index.html loads social-proof.js before script.js');
ok(/cwr:langchange/.test(read('assets/js/i18n.js')) && /'cwr:langchange'/.test(script), 'language switch redraws the spotlight');
ok(!fs.existsSync(new URL('../scripts/test-landing-spotlight.mjs', import.meta.url)), 'old landing-spotlight test removed');
```

Move the `import fs from 'node:fs';` line to the top of the file, next to the other import (ES module imports must be top-level, and keeping them together reads better). Keep the rest of the block where it is.

- [ ] **Step 2: Run it to make sure it fails**

Run: `node scripts/test-social-proof.mjs 2>&1 | grep '✗'`
Expected: the six Task 3 wiring lines show `✗`. Task 1 lines still pass.

- [ ] **Step 3: Remove the portfolio-field spotlight from script.js**

```bash
python3 - <<'EOF'
import pathlib, re
p = pathlib.Path('assets/js/script.js'); s = p.read_text()

def cut(start_marker, end_marker, keep_end=True):
    global s
    a = s.index(start_marker); b = s.index(end_marker, a)
    s = s[:a] + (s[b:] if keep_end else s[b + len(end_marker):])

# 1. Logo sanitizer (moved to SocialProof.cleanLogoUrl).
cut('/** Client logo for the homepage spotlight: a site asset path or an https URL, else \'\'. */\nfunction portfolioSanitizeLogoUrl(', 'function portfolioSanitizeDocumentPayload(data) {')

# 2. Sanitizer fields.
old = """    homeSpotlight: data.homeSpotlight === true,
    clientLogoUrl: portfolioSanitizeLogoUrl(data.clientLogoUrl),
    resultStat: data.resultStat != null ? String(data.resultStat).trim().slice(0, 12) : '',
    resultLabel: data.resultLabel != null ? String(data.resultLabel).trim().slice(0, 80) : '',
"""
assert s.count(old) == 1; s = s.replace(old, '')

# 3. Unsaved-changes check.
for old in ["    'portfolio-project-client-logo',\n", "    'portfolio-project-result-stat',\n", "    'portfolio-project-result-label',\n",
            """      homeSpotlight: !!(document.getElementById('portfolio-project-home-spotlight') &&
        document.getElementById('portfolio-project-home-spotlight').checked),
"""]:
    assert s.count(old) == 1, old; s = s.replace(old, '')

# 4. Editor fill.
old = """    const homeSpotlightEl = document.getElementById('portfolio-project-home-spotlight');
    if (homeSpotlightEl) homeSpotlightEl.checked = project.homeSpotlight === true;
    const clientLogoEl = document.getElementById('portfolio-project-client-logo');
    if (clientLogoEl) clientLogoEl.value = project.clientLogoUrl || '';
    const resultStatEl = document.getElementById('portfolio-project-result-stat');
    if (resultStatEl) resultStatEl.value = project.resultStat || '';
    const resultLabelEl = document.getElementById('portfolio-project-result-label');
    if (resultLabelEl) resultLabelEl.value = project.resultLabel || '';
"""
assert s.count(old) == 1; s = s.replace(old, '')

# 5. Save payload.
old = re.search(r"        homeSpotlight: document\.getElementById\('portfolio-project-home-spotlight'\)\n.*?        resultLabel: document\.getElementById\('portfolio-project-result-label'\)\n          \? document\.getElementById\('portfolio-project-result-label'\)\.value\n          : '',\n", s, re.S)
assert old; s = s[:old.start()] + s[old.end():]

p.write_text(s); print('ok')
EOF
```

Expected: `ok`.

- [ ] **Step 4: Replace the spotlight helpers, the renderer, and the listener**

```bash
python3 - <<'EOF'
import pathlib
p = pathlib.Path('assets/js/script.js'); s = p.read_text()

# Helpers: from the "Trusted by local businesses" comment up to the timers WeakMap.
a = s.index('// "Trusted by local businesses": real client projects Ruben ticks')
b = s.index('var landingSpotlightTimers = new WeakMap();')
s = s[:a] + '''// "Trusted by local businesses": entries from Admin → Testimonials → Social
// proof (RTDB socialProof). Until that list loads, or when it's empty or
// unreadable (rules not deployed, offline), the built-ins in social-proof.js show.
var landingSocialProofDb = null; // null = not loaded; Entry[] (with id) once read
var landingSocialProofRequested = false;

/** One read per page load, once the RTDB client exists. Redraws the home spotlight. */
function loadLandingSocialProof() {
  if (landingSocialProofRequested || !window.SocialProof) return;
  if (!window.rtdb || !window.rtdbRef || !window.rtdbGet) return;
  landingSocialProofRequested = true;
  window.rtdbGet(window.rtdbRef(window.rtdb, 'socialProof'))
    .then(function (snap) {
      var val = snap.val();
      landingSocialProofDb = val && typeof val === 'object'
        ? Object.keys(val).map(function (id) {
            return Object.assign(window.SocialProof.sanitizeEntry(val[id]), { id: id });
          })
        : [];
      var home = document.querySelector('article.home');
      if (home && home.classList.contains('active')) initLandingSocialProofSpotlight(home);
    })
    .catch(function (err) {
      console.warn('Social proof read failed; showing the built-in clients.', err);
    });
}

''' + s[b:]

# Renderer: replace the whole function.
a = s.index('function initLandingSocialProofSpotlight(homeArticle) {')
b = s.index('window.initLandingSocialProofSpotlight = initLandingSocialProofSpotlight;')
s = s[:a] + r'''function initLandingSocialProofSpotlight(homeArticle) {
  if (!homeArticle) homeArticle = document.querySelector('article.home');
  if (!homeArticle) return;

  var root = homeArticle.querySelector('[data-landing-spotlight]');
  if (!root || !window.SocialProof) return;

  stopLandingSocialProofSpotlight(root);
  loadLandingSocialProof();

  var SP = window.SocialProof;
  var entries = SP.visibleEntries(landingSocialProofDb, SP.BUILT_IN);
  // Saved entries but none published: Ruben hid the section on purpose.
  var band = root.closest('section');
  if (band) band.hidden = !entries.length;
  root.innerHTML = '';
  if (!entries.length) return;

  var staticMode = prefersReducedMotion();
  root.classList.toggle('is-static', staticMode);

  var lang = typeof window.cwrGetLang === 'function' ? window.cwrGetLang() : 'en';
  // Public projects only, so a client-only project never gets a link.
  var publicProjects = window.portfolioProjects || [];
  var stage = document.createElement('div');
  stage.className = 'cwr-landing-spotlight-stage';
  var esc = escapeLandingSpotlightText;

  entries.forEach(function (entry, index) {
    var project = entry.projectId
      ? publicProjects.filter(function (p) { return p && p.id === entry.projectId; })[0] || null
      : null;

    // A div, not <article>: site-wide article rules turn it into a fixed-width page card.
    var slide = document.createElement('div');
    slide.className = 'cwr-landing-spotlight-slide' + (index === 0 ? ' is-active' : '');
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', (index + 1) + ' of ' + entries.length + ': ' + entry.client);

    var logoHtml = entry.logoUrl
      ? '<div class="cwr-landing-spotlight-logo">' +
        '<img src="' + esc(entry.logoUrl) + '" alt="' + esc(entry.client) + ' logo" loading="' + (index === 0 ? 'eager' : 'lazy') + '">' +
        '</div>'
      : '';
    var bodyHtml = entry.stat
      // Result first: the number, what it measures, then whose it is and where it came from.
      ? '<p class="cwr-landing-spotlight-stat">' + esc(entry.stat) + '</p>' +
        (entry.label ? '<p class="cwr-landing-spotlight-stat-label">' + esc(entry.label) + '</p>' : '') +
        '<p class="cwr-landing-spotlight-meta">' + esc(SP.metaLine(entry, lang)) + '</p>'
      : '<p class="cwr-landing-spotlight-meta">' + esc(cwrText('home.proof_project', 'Client project')) + '</p>' +
        '<h3 class="cwr-landing-spotlight-name">' + esc(entry.client) + '</h3>' +
        (entry.summary ? '<p class="cwr-landing-spotlight-summary">' + esc(entry.summary) + '</p>' : '');
    var ctaHtml = project
      ? '<button type="button" class="cwr-landing-spotlight-cta">' +
        esc(cwrText('home.proof_view', 'View project')) + ' <span aria-hidden="true">&rarr;</span></button>'
      : '';
    slide.innerHTML = logoHtml + bodyHtml + ctaHtml;

    var cta = slide.querySelector('.cwr-landing-spotlight-cta');
    if (cta) {
      cta.addEventListener('click', function () {
        if (typeof window.openPortfolioProjectDetail === 'function') {
          window.openPortfolioProjectDetail(project);
        } else if (typeof switchToPage === 'function') {
          switchToPage('portfolio');
        }
      });
    }

    stage.appendChild(slide);
  });

  root.appendChild(stage);
  root.dataset.spotlightIndex = '0';

  // Dots even with reduced motion (it just doesn't auto-rotate); none for one entry.
  if (entries.length > 1) {
    var dots = document.createElement('div');
    dots.className = 'cwr-landing-spotlight-dots';
    dots.setAttribute('role', 'tablist');
    dots.setAttribute('aria-label', 'Choose featured client');

    entries.forEach(function (entry, index) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'cwr-landing-spotlight-dot' + (index === 0 ? ' is-active' : '');
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', entry.client);
      dot.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
      dot.setAttribute('tabindex', index === 0 ? '0' : '-1');
      dot.addEventListener('click', function () {
        setLandingSpotlightSlide(root, index);
        stopLandingSocialProofSpotlight(root);
        startLandingSocialProofSpotlight(root);
      });
      dots.appendChild(dot);
    });

    root.appendChild(dots);

    if (!root.dataset.spotlightBound) {
      root.dataset.spotlightBound = '1';
      root.addEventListener('mouseenter', function () {
        root.dataset.spotlightPaused = '1';
      });
      root.addEventListener('mouseleave', function () {
        root.dataset.spotlightPaused = '0';
      });
      root.addEventListener('focusin', function () {
        root.dataset.spotlightPaused = '1';
      });
      root.addEventListener('focusout', function (event) {
        if (!root.contains(event.relatedTarget)) {
          root.dataset.spotlightPaused = '0';
        }
      });
    }

    startLandingSocialProofSpotlight(root);
  }

  root.dataset.spotlightReady = '1';
}

''' + s[b:]

old = """document.addEventListener('portfolioProjectsLoaded', function () {
  var home = document.querySelector('article.home');
  if (home && home.classList.contains('active')) initLandingSocialProofSpotlight(home);
});
"""
new = """// Portfolio data (and the RTDB client) arrive after first paint, and again after admin edits.
document.addEventListener('portfolioProjectsLoaded', function () {
  loadLandingSocialProof();
  var home = document.querySelector('article.home');
  if (home && home.classList.contains('active')) initLandingSocialProofSpotlight(home);
});

// Source and month labels are translated, so redraw on a language switch.
document.addEventListener('cwr:langchange', function () {
  var home = document.querySelector('article.home');
  if (home && home.classList.contains('active')) initLandingSocialProofSpotlight(home);
});
"""
assert s.count(old) == 1; s = s.replace(old, new)
p.write_text(s); print('ok')
EOF
```

Expected: `ok`.

- [ ] **Step 5: Dispatch the language event in i18n.js**

In `assets/js/i18n.js`, inside `applyTranslations(lang)`, replace:

```js
    var hirePackageInput = document.querySelector('[data-page="hire-me"] [data-hire-package-input]');
    if (hirePackageInput && typeof window.syncBusinessDocSelectUI === 'function') {
      window.syncBusinessDocSelectUI(hirePackageInput);
    }
  }
```

with:

```js
    var hirePackageInput = document.querySelector('[data-page="hire-me"] [data-hire-package-input]');
    if (hirePackageInput && typeof window.syncBusinessDocSelectUI === 'function') {
      window.syncBusinessDocSelectUI(hirePackageInput);
    }

    // Script-rendered text (e.g. the homepage spotlight) redraws in the new language.
    try {
      document.dispatchEvent(new CustomEvent('cwr:langchange', { detail: { lang: lang } }));
    } catch (e) {}
  }
```

- [ ] **Step 6: index.html: remove the editor fields, load the module, bump cache-busters, sync**

```bash
python3 - <<'EOF'
import pathlib, re
p = pathlib.Path('index.html'); s = p.read_text()
# Editor block: from the "Show on homepage" switch through the Result hint.
m = re.search(r'              <div class="form-group form-group-checkbox-row">\n                <label class="portfolio-project-checkbox">\n                  <input type="checkbox" id="portfolio-project-home-spotlight".*?<p class="form-hint">The big number on the homepage spotlight\.[^\n]*\n', s, re.S)
assert m, 'editor block not found'
s = s[:m.start()] + s[m.end():]
# Module tag next to portfolio-skins.js.
old = re.search(r'  <script src="/assets/js/portfolio-skins\.js\?v=[^"]*"></script>\n', s).group(0)
s = s.replace(old, old + '  <script src="/assets/js/social-proof.js?v=social-proof-20261017"></script>\n', 1)
s = re.sub(r'(/assets/js/script\.js\?v=)[^"]*', r'\1social-proof-20261017', s)
s = re.sub(r'(/assets/css/style\.css\?v=)[^"]*', r'\1social-proof-20261017', s)
s = re.sub(r'(/assets/js/i18n\.js\?v=)[^"]*', r'\1social-proof-20261017', s)
p.write_text(s); print('ok')
EOF
node scripts/sync-spa-shells.mjs 2>&1 | tail -1
for f in social-proof.js script.js style.css i18n.js; do echo "$f: $(grep -rl "$f?v=social-proof-20261017" --include=index.html . | grep -v node_modules | wc -l | tr -d ' ')"; done
grep -rl 'portfolio-project-home-spotlight' --include=index.html . | grep -v node_modules | wc -l
```

Expected:
- `ok` and `All shells synced and stamped.`
- each of the four lines prints `20`
- the last line prints `0`

- [ ] **Step 7: CSS: drop the cover-thumb rule; delete the old test**

```bash
python3 - <<'EOF'
import pathlib
p = pathlib.Path('assets/css/style.css'); s = p.read_text()
old = """/* No logo: the project's cover image as a rounded thumbnail. */
.cwr-landing-spotlight-logo.is-cover img {
  width: min(220px, 60vw);
  max-width: none;
  max-height: none;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 14px;
  border: 1px solid var(--jet);
}

"""
assert s.count(old) == 1; p.write_text(s.replace(old, '')); print('ok')
EOF
rm scripts/test-landing-spotlight.mjs
```

- [ ] **Step 8: Run the tests to make sure they pass**

Run: `node scripts/test-social-proof.mjs | grep -c '✗'; node scripts/preflight.mjs 2>&1 | tail -1`
Expected: `0`, then `✓ preflight: …`

- [ ] **Step 9: Browser check (WebKit, fake data)**

Make sure the local server is up: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5178/`. If it isn't 200, start it in the background with `node $SCRATCH/portal-server.mjs /Users/ruben/Dev/Apps/Portfolio`.

Create `$SCRATCH/sp-home-check.cjs`:

```js
// Homepage social proof, WebKit, fake data only.
const { webkit } = require('/Users/ruben/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await webkit.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/webkit-2370/pw_run.sh' });
  const ctx = await browser.newContext({ viewport: { width: 1061, height: 900 } });
  const page = await ctx.newPage();
  await page.goto('http://localhost:5178/'); await page.waitForTimeout(3500);

  // Built-ins on first paint (production socialProof is empty / not deployed).
  let s = await page.evaluate(() => ({
    names: [...document.querySelectorAll('.cwr-landing-spotlight-slide')].map((x) => x.getAttribute('aria-label')),
    hidden: document.querySelector('[data-landing-spotlight]').closest('section').hidden,
  }));
  ok(!s.hidden && s.names.length === 3 && /Rizo/.test(s.names[0]) && /Shelton/.test(s.names[1]) && /ProCleaning/.test(s.names[2]), `built-ins show: ${s.names.join(' | ')}`);

  // Fake database list: one % entry linked to a public project, one draft, one linked to a non-public id.
  s = await page.evaluate(() => {
    window.portfolioProjects = [{ id: 'pub1', title: 'Public sample' }];
    landingSocialProofDb = [
      Object.assign(SocialProof.sanitizeEntry({ client: "Rizo's Pizzeria", logoUrl: '/assets/images/logo/logo-2-color.png', stat: '+38%', label: 'more online orders per week', source: 'app', asOf: '2026-09', projectId: 'pub1', published: true, order: 10 }), { id: 'a' }),
      Object.assign(SocialProof.sanitizeEntry({ client: 'Draft Co', published: false, order: 5 }), { id: 'b' }),
      Object.assign(SocialProof.sanitizeEntry({ client: 'Shelton Springs HOA', summary: 'Resident portal.', projectId: 'privateOnly', published: true, order: 20 }), { id: 'c' }),
    ];
    initLandingSocialProofSpotlight(document.querySelector('article.home'));
    return [...document.querySelectorAll('.cwr-landing-spotlight-slide')].map((x) => ({
      label: x.getAttribute('aria-label'),
      stat: (x.querySelector('.cwr-landing-spotlight-stat') || {}).textContent || '',
      meta: (x.querySelector('.cwr-landing-spotlight-meta') || {}).textContent || '',
      cta: !!x.querySelector('.cwr-landing-spotlight-cta'),
    }));
  });
  ok(s.length === 2, 'draft hidden');
  ok(s[0].stat === '+38%' && s[0].meta === "Rizo's Pizzeria · From the app · Sep 2026" && s[0].cta, '% slide: number, source line, View project (public link)');
  ok(s[1].stat === '' && !s[1].cta, 'no-number slide, non-public project → no link');

  // Spanish redraw.
  const es = await page.evaluate(() => { window.cwrSetLang('es'); return document.querySelector('.cwr-landing-spotlight-slide .cwr-landing-spotlight-meta').textContent; });
  ok(es === "Rizo's Pizzeria · Desde la app · sep 2026", `ES labels after language switch (${es})`);
  await page.evaluate(() => window.cwrSetLang('en'));

  // Widths: no overflow.
  for (const w of [393, 1061, 1300]) {
    await page.setViewportSize({ width: w, height: 900 }); await page.waitForTimeout(200);
    const over = await page.evaluate(() => { const r = document.querySelector('[data-landing-spotlight]').getBoundingClientRect(); return Math.max(...[...document.querySelectorAll('.cwr-landing-spotlight-slide')].map((x) => x.scrollWidth - r.width)) <= 0 && document.documentElement.scrollWidth <= innerWidth; });
    ok(over, `no overflow at ${w}px`);
  }

  // All entries unpublished → section hidden.
  const hid = await page.evaluate(() => { landingSocialProofDb = [Object.assign(SocialProof.sanitizeEntry({ client: 'X', published: false }), { id: 'x' })]; initLandingSocialProofSpotlight(document.querySelector('article.home')); return document.querySelector('[data-landing-spotlight]').closest('section').hidden; });
  ok(hid === true, 'saved entries with none published → section hidden');

  // Read failure keeps built-ins (fresh page, rtdbGet rejects).
  const p2 = await ctx.newPage();
  await p2.addInitScript(() => { Object.defineProperty(window, 'rtdbGet', { configurable: true, set() {}, get() { return () => Promise.reject(new Error('PERMISSION_DENIED')); } }); });
  await p2.goto('http://localhost:5178/'); await p2.waitForTimeout(3500);
  const n = await p2.evaluate(() => document.querySelectorAll('.cwr-landing-spotlight-slide').length);
  ok(n === 3, 'unreadable socialProof (rules not deployed) → built-ins stay');

  await page.setViewportSize({ width: 393, height: 852 });
  await page.evaluate(() => { landingSocialProofDb = null; initLandingSocialProofSpotlight(document.querySelector('article.home')); document.querySelector('[data-landing-spotlight]').scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(400);
  await page.locator('section:has([data-landing-spotlight])').screenshot({ path: process.argv[2] + '/sp-home-phone.png', timeout: 15000 });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
```

Run: `node $SCRATCH/sp-home-check.cjs $SCRATCH`
Expected: every line `✓`. Then read `$SCRATCH/sp-home-phone.png`: the Rizo's built-in should show its logo, "Client project", the name and the summary, centered, with dots.

Note: `landingSocialProofDb` is a top-level `var` in a classic script, so it lives on `window` and the check can assign it. If the `rtdbGet` override in the read-failure test is defeated because the page sets `window.rtdbGet` through plain assignment, the getter keeps returning the rejecting function. If it's still not exercised, report that and verify instead by temporarily running `landingSocialProofRequested = false; window.rtdbGet = () => Promise.reject(new Error('x')); loadLandingSocialProof();` and confirming that 3 slides remain.

- [ ] **Step 10: Checkpoint (no commit; Ruben commits)**

Run: `node scripts/preflight.mjs 2>&1 | tail -1`
Expected: `✓ preflight: …`

---

### Task 4: Admin Social proof section and editor

**Files:**
- Create: `assets/js/social-proof-admin.js`
- Modify: `index.html` (section in the Testimonials panel; drawer after `#business-doc-modal`; `CLASSIC` list entry), then sync
- Modify: `assets/js/script.js` (`activate(tabId)`: call `CWR_SOCIAL_PROOF.open()` on the testimonials tab)
- Modify: `assets/css/style.css` (admin list + drawer)
- Test: `scripts/test-social-proof-admin.mjs`; browser check `$SCRATCH/sp-admin-check.cjs`

**Interfaces:**
- Consumes:
  - `window.SocialProof` (Task 1)
  - `window.rtdb`, `rtdbRef`, `rtdbGet`, `rtdbUpdate`, `rtdbPush`, `isAdminSession`, `portfolioProjectsAll`, `openAdminClientEmailCompose(prefill)` (existing; prefill keys `name, email, link, templateId, portalButton, subject, message`)
- Produces `window.CWR_SOCIAL_PROOF = { open, _test: { rowsFrom, writePaths, builtInCopyPaths, reorder, checkInEmail, confirmDeleteText, deletePaths } }`

- [ ] **Step 1: Write the failing test**

Create `scripts/test-social-proof-admin.mjs`:

```js
#!/usr/bin/env node
/**
 * Admin → Testimonials → Social proof (assets/js/social-proof-admin.js), pure parts.
 *   node scripts/test-social-proof-admin.mjs
 *
 * Guards: the list shows the built-ins until the database has entries; a save
 * writes the public entry and its private details together; saving from the
 * built-ins copies all of them in order; reordering renumbers cleanly; deleting
 * the last entry warns that the built-ins come back; the check-in email asks
 * for one number and the client's OK to share it.
 */
import fs from 'node:fs';
import vm from 'node:vm';

const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
const win = { document: { getElementById: () => null, addEventListener() {} } };
win.window = win;
vm.runInNewContext(fs.readFileSync(new URL('../assets/js/social-proof.js', import.meta.url), 'utf8'), { window: win });
vm.runInNewContext(fs.readFileSync(new URL('../assets/js/social-proof-admin.js', import.meta.url), 'utf8'), { window: win, document: win.document, setTimeout, console });
const T = win.CWR_SOCIAL_PROOF && win.CWR_SOCIAL_PROOF._test;
ok(!!T, 'CWR_SOCIAL_PROOF._test is exposed');
if (!T) process.exit();

// rowsFrom
let rows = T.rowsFrom(null, null);
ok(rows.length === 3 && rows.every((r) => r.builtIn) && rows[0].id === 'builtin-rizo', 'empty database → the 3 built-ins');
rows = T.rowsFrom({ b: { client: 'B', order: 20, published: true }, a: { client: 'A', order: 10, published: false } }, { a: { kind: 'count', count: '86' } });
ok(rows.map((r) => r.id).join() === 'a,b' && !rows[0].builtIn, 'database rows sorted by order');
ok(rows[0].details.kind === 'count' && rows[1].details.kind === 'none', 'details joined by id (missing → none)');

// writePaths
const wp = T.writePaths('x1', { client: 'X' }, { kind: 'none' });
ok(Object.keys(wp).sort().join() === 'socialProof/x1,socialProofDetails/x1', 'save writes public + private together');

// builtInCopyPaths
const built = T.rowsFrom(null, null);
const copy = T.builtInCopyPaths(built, 1000);
ok(Object.keys(copy).length === 6, 'built-in copy writes 3 entries + 3 details');
ok(copy['socialProof/builtin-rizo'].order === 10 && copy['socialProof/builtin-procleaning'].order === 30, 'order kept');
ok(copy['socialProof/builtin-shelton'].updatedAt === 1000 && copy['socialProofDetails/builtin-shelton'].createdAt === 1000, 'timestamps set');
ok(!('id' in copy['socialProof/builtin-rizo']), 'no id field in the stored entry (rules forbid extras)');

// reorder
const re = T.reorder(built, 2, -1);
ok(re.map((r) => r.id).join() === 'builtin-rizo,builtin-procleaning,builtin-shelton', 'move ProCleaning up one');
ok(re.map((r) => r.entry.order).join() === '10,20,30', 'orders renumbered 10, 20, 30');
ok(T.reorder(built, 0, -1).map((r) => r.id).join() === built.map((r) => r.id).join(), 'moving the first row up does nothing');

// deletePaths + confirm text
const dp = T.deletePaths('a');
ok(dp['socialProof/a'] === null && dp['socialProofDetails/a'] === null, 'delete removes both');
ok(/built-in clients will show again/i.test(T.confirmDeleteText({ id: 'a', entry: { client: 'A' } }, [{ id: 'a', builtIn: false }])), 'last entry: warns built-ins come back');
ok(!/built-in/i.test(T.confirmDeleteText({ id: 'a', entry: { client: 'A' } }, [{ id: 'a', builtIn: false }, { id: 'b', builtIn: false }])), 'not last: plain confirm');

// checkInEmail
const m = T.checkInEmail({ client: "Rizo's Pizzeria" });
ok(m.subject === "Quick check-in on Rizo's Pizzeria", 'subject names the client');
ok(/rough number is perfect/i.test(m.message) && /only share it on my site with your OK/i.test(m.message), 'asks for one number and consent');
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `node scripts/test-social-proof-admin.mjs`
Expected: FAIL with `ENOENT … social-proof-admin.js`.

- [ ] **Step 3: Write the admin script**

Create `assets/js/social-proof-admin.js`:

```js
/**
 * Admin → Testimonials → Social proof. Lists socialProof entries (public) with
 * their socialProofDetails (admin-only), edits them in a numbered drawer, and
 * opens a Results check-in email in Compose. Pure rules live in social-proof.js.
 * While the database list is empty the built-in clients show; the first save
 * copies all of them in, so their order survives.
 */
(function (global) {
  'use strict';

  var SP = global.SocialProof;
  var doc = global.document;
  var els = {};
  var rows = [];
  var bound = false;
  var loading = null;

  // ── pure helpers (tested in scripts/test-social-proof-admin.mjs) ──

  function rowsFrom(pubVal, detVal) {
    var pub = pubVal && typeof pubVal === 'object' ? pubVal : {};
    var det = detVal && typeof detVal === 'object' ? detVal : {};
    var ids = Object.keys(pub);
    if (!ids.length) {
      return SP.BUILT_IN.map(function (b) {
        return { id: b.id, entry: SP.sanitizeEntry(b), details: SP.sanitizeDetails({}), builtIn: true };
      });
    }
    return ids
      .map(function (id) {
        return { id: id, entry: SP.sanitizeEntry(pub[id]), details: SP.sanitizeDetails(det[id]), builtIn: false };
      })
      .sort(function (a, b) { return a.entry.order - b.entry.order; });
  }

  /** One multi-path update: the public entry and its private details together. */
  function writePaths(id, entry, details) {
    var out = {};
    out['socialProof/' + id] = entry;
    out['socialProofDetails/' + id] = details;
    return out;
  }

  /** Saving while the built-ins show copies every row, in its current order. */
  function builtInCopyPaths(list, now) {
    var out = {};
    list.forEach(function (r) {
      var entry = SP.sanitizeEntry(Object.assign({}, r.entry, { updatedAt: now }));
      var details = SP.sanitizeDetails(Object.assign({}, r.details, { createdAt: r.details.createdAt || now }));
      Object.assign(out, writePaths(r.id, entry, details));
    });
    return out;
  }

  /** Rows with one moved by delta, orders renumbered 10, 20, 30… */
  function reorder(list, index, delta) {
    var next = list.slice();
    var to = index + delta;
    if (to >= 0 && to < next.length) {
      var moved = next.splice(index, 1)[0];
      next.splice(to, 0, moved);
    }
    return next.map(function (r, i) {
      return Object.assign({}, r, { entry: Object.assign({}, r.entry, { order: (i + 1) * 10 }) });
    });
  }

  function deletePaths(id) {
    var out = {};
    out['socialProof/' + id] = null;
    out['socialProofDetails/' + id] = null;
    return out;
  }

  function confirmDeleteText(row, list) {
    var text = 'Delete “' + row.entry.client + '” from social proof? This can’t be undone.';
    var others = list.filter(function (r) { return r.id !== row.id && !r.builtIn; });
    if (!others.length) text += '\n\nIt’s the last entry, so the built-in clients will show again on the homepage. To hide the section instead, turn off “Show on the homepage”.';
    return text;
  }

  function checkInEmail(entry) {
    return {
      subject: 'Quick check-in on ' + entry.client,
      message:
        'Hi,\n\n' +
        'I hope everything’s running smoothly. Quick question for my records: since launch, has anything measurable changed, like orders, calls, bookings, or time saved?\n\n' +
        'A rough number is perfect, and I’ll only share it on my site with your OK.\n\n' +
        'Thanks,\nRuben'
    };
  }

  // ── DOM ──

  function $(id) { return doc.getElementById(id); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function cache() {
    els = {
      panel: $('admin-panel-testimonials'),
      list: $('admin-social-proof-list'),
      status: $('admin-social-proof-status'),
      add: $('admin-social-proof-add-btn'),
      modal: $('social-proof-modal'),
      form: $('social-proof-form'),
      title: $('social-proof-modal-title'),
      id: $('social-proof-id'),
      client: $('social-proof-client'),
      logo: $('social-proof-logo'),
      project: $('social-proof-project'),
      kind: $('social-proof-kind'),
      before: $('social-proof-before'),
      after: $('social-proof-after'),
      count: $('social-proof-count'),
      preview: $('social-proof-stat-preview'),
      label: $('social-proof-label'),
      source: $('social-proof-source'),
      asOf: $('social-proof-as-of'),
      launch: $('social-proof-launch'),
      note: $('social-proof-note'),
      summary: $('social-proof-summary'),
      published: $('social-proof-published'),
      del: $('social-proof-delete-btn'),
      errors: $('social-proof-errors'),
      checkin: $('social-proof-checkin-btn')
    };
  }

  function ready() {
    if (!global.rtdb || !global.rtdbRef || !global.rtdbGet || !global.rtdbUpdate || !global.rtdbPush) return false;
    return typeof global.isAdminSession === 'function' ? !!global.isAdminSession() : true;
  }

  function waitReady(ms) {
    return new Promise(function (resolve) {
      var waited = 0;
      (function tick() {
        if (ready()) return resolve(true);
        if (waited >= ms) return resolve(false);
        waited += 250;
        setTimeout(tick, 250);
      })();
    });
  }

  function rootRef() { return global.rtdbRef(global.rtdb); }

  function status(msg, isError) {
    if (!els.status) return;
    els.status.textContent = msg || '';
    els.status.hidden = !msg;
    els.status.classList.toggle('is-error', !!isError);
  }

  function chipHtml(r) {
    var label = r.builtIn ? 'Built-in' : (r.entry.published ? 'Published' : 'Draft');
    var html = '<span class="admin-social-proof-chip is-' + label.toLowerCase().replace(/[^a-z]/g, '') + '">' + label + '</span>';
    if (!r.builtIn && SP.checkInDue(r.details, r.entry, new Date())) {
      html += '<span class="admin-social-proof-chip is-due">Check-in due</span>';
    }
    return html;
  }

  function render() {
    if (!els.list) return;
    els.list.innerHTML = rows.map(function (r, i) {
      var e = r.entry;
      var result = e.stat
        ? '<strong>' + esc(e.stat) + '</strong> ' + esc(e.label)
        : '<span class="admin-social-proof-muted">No number yet</span>';
      var meta = [SP.sourceLabel(e.source, 'en'), SP.monthLabel(e.asOf, 'en')].filter(Boolean).join(' · ');
      return '<li class="admin-social-proof-row" data-index="' + i + '">' +
        (e.logoUrl
          ? '<img class="admin-social-proof-logo" src="' + esc(e.logoUrl) + '" alt="">'
          : '<span class="admin-social-proof-logo is-empty" aria-hidden="true"></span>') +
        '<div class="admin-social-proof-main">' +
          '<p class="admin-social-proof-name">' + esc(e.client) + '</p>' +
          '<p class="admin-social-proof-result">' + result + '</p>' +
          (meta ? '<p class="admin-social-proof-meta">' + esc(meta) + '</p>' : '') +
          '<p class="admin-social-proof-chips">' + chipHtml(r) + '</p>' +
        '</div>' +
        '<div class="admin-social-proof-actions">' +
          '<button type="button" class="admin-social-proof-move" data-move="-1" aria-label="Move ' + esc(e.client) + ' up"' + (i === 0 ? ' disabled' : '') + '>▲</button>' +
          '<button type="button" class="admin-social-proof-move" data-move="1" aria-label="Move ' + esc(e.client) + ' down"' + (i === rows.length - 1 ? ' disabled' : '') + '>▼</button>' +
          '<button type="button" class="btn btn-secondary admin-social-proof-checkin" data-checkin>Check-in</button>' +
          '<button type="button" class="btn btn-secondary admin-social-proof-edit" data-edit>Edit</button>' +
        '</div></li>';
    }).join('');
  }

  async function load() {
    if (loading) return loading;
    loading = (async function () {
      status('Loading social proof…');
      try {
        var both = await Promise.all([
          global.rtdbGet(global.rtdbRef(global.rtdb, 'socialProof')),
          global.rtdbGet(global.rtdbRef(global.rtdb, 'socialProofDetails'))
        ]);
        rows = rowsFrom(both[0].val(), both[1].val());
        status(rows[0] && rows[0].builtIn ? 'Showing the built-in clients. Your first save copies them into the database.' : '');
      } catch (err) {
        console.warn('Social proof load failed', err);
        rows = rowsFrom(null, null);
        status('Couldn’t read the social proof list (deploy the database rules first). Showing the built-in clients.', true);
      }
      render();
    })();
    try { await loading; } finally { loading = null; }
  }

  async function write(paths) {
    await global.rtdbUpdate(rootRef(), paths);
  }

  // ── drawer ──

  function fillProjects(selected) {
    if (!els.project) return;
    var all = Array.isArray(global.portfolioProjectsAll) ? global.portfolioProjectsAll : [];
    els.project.innerHTML = '<option value="">None</option>' + all.map(function (p) {
      var isPublic = String(p.visibility || 'public').toLowerCase() !== 'private';
      return '<option value="' + esc(p.id) + '">' + esc(p.title || 'Untitled') + (isPublic ? '' : ' (client-only, no link)') + '</option>';
    }).join('');
    els.project.value = selected || '';
  }

  function readDetails() {
    return {
      kind: els.kind.value,
      before: els.before.value,
      after: els.after.value,
      count: els.count.value,
      launchDate: els.launch.value,
      note: els.note.value
    };
  }

  function readEntry() {
    return {
      client: els.client.value,
      logoUrl: els.logo.value,
      projectId: els.project.value,
      label: els.label.value,
      source: els.source.value,
      asOf: els.asOf.value,
      summary: els.summary.value,
      published: els.published.checked
    };
  }

  function syncKind() {
    var kind = els.kind.value;
    els.modal.querySelectorAll('[data-social-proof-kind]').forEach(function (n) {
      n.hidden = n.getAttribute('data-social-proof-kind') !== kind;
    });
    els.modal.querySelectorAll('[data-social-proof-has-number]').forEach(function (n) {
      n.hidden = kind === 'none';
    });
    var stat = SP.statFor(SP.sanitizeDetails(readDetails()));
    els.preview.hidden = !stat;
    els.preview.innerHTML = stat ? 'Shows on the homepage as <strong>' + esc(stat) + '</strong>' : '';
  }

  function showErrors(list) {
    els.errors.hidden = !list.length;
    els.errors.innerHTML = list.map(esc).join('<br>');
  }

  function openDrawer(index) {
    var r = index != null ? rows[index] : null;
    els.form.reset();
    showErrors([]);
    els.id.value = r ? r.id : '';
    els.title.textContent = r ? 'Edit ' + r.entry.client : 'Add client';
    fillProjects(r ? r.entry.projectId : '');
    if (r) {
      var e = r.entry;
      var d = r.details;
      els.client.value = e.client;
      els.logo.value = e.logoUrl;
      els.kind.value = d.kind;
      els.before.value = d.before == null ? '' : String(d.before);
      els.after.value = d.after == null ? '' : String(d.after);
      els.count.value = d.count;
      els.label.value = e.label;
      els.source.value = e.source;
      els.asOf.value = e.asOf;
      els.launch.value = d.launchDate;
      els.note.value = d.note;
      els.summary.value = e.summary;
      els.published.checked = e.published;
    }
    els.del.hidden = !r || r.builtIn;
    els.checkin.hidden = !r;
    syncKind();
    if (els.modal.parentElement !== doc.body) doc.body.appendChild(els.modal);
    els.modal.style.display = 'flex';
    els.modal.classList.add('active');
    els.client.focus({ preventScroll: true });
  }

  function closeDrawer() {
    els.modal.classList.remove('active');
    els.modal.style.display = 'none';
  }

  function currentRow() {
    var id = els.id.value;
    return rows.filter(function (r) { return r.id === id; })[0] || null;
  }

  async function save(ev) {
    ev.preventDefault();
    var row = currentRow();
    var now = Date.now();
    var details = SP.sanitizeDetails(Object.assign({}, row ? row.details : {}, readDetails()));
    var stat = SP.statFor(details);
    var raw = Object.assign({}, row ? row.entry : {}, readEntry(), { stat: stat, updatedAt: now });
    if (!row) raw.order = rows.length ? rows[rows.length - 1].entry.order + 10 : 10;
    if (!stat) { raw.label = ''; raw.source = ''; raw.asOf = ''; }
    var entry = SP.sanitizeEntry(raw);
    var errors = SP.validate(entry, details);
    if (errors.length) { showErrors(errors); return; }
    if (!details.createdAt) details.createdAt = now;

    var id = row ? row.id : global.rtdbPush(global.rtdbRef(global.rtdb, 'socialProof')).key;
    var others = rows.filter(function (r) { return r.id !== id; });
    var paths = rows.length && rows[0].builtIn ? builtInCopyPaths(others, now) : {};
    Object.assign(paths, writePaths(id, entry, details));
    try {
      await write(paths);
      closeDrawer();
      await load();
    } catch (err) {
      console.error('Social proof save failed', err);
      showErrors(['Couldn’t save. If this is the first save, deploy the database rules first.']);
    }
  }

  async function remove() {
    var row = currentRow();
    if (!row || row.builtIn) return;
    if (!global.confirm(confirmDeleteText(row, rows))) return;
    try {
      await write(deletePaths(row.id));
      closeDrawer();
      await load();
    } catch (err) {
      console.error('Social proof delete failed', err);
      showErrors(['Couldn’t delete. Try again.']);
    }
  }

  async function move(index, delta) {
    var next = reorder(rows, index, delta);
    var paths = {};
    if (rows[0] && rows[0].builtIn) {
      paths = builtInCopyPaths(next, Date.now());
    } else {
      next.forEach(function (r) { paths['socialProof/' + r.id + '/order'] = r.entry.order; });
    }
    try {
      await write(paths);
      await load();
    } catch (err) {
      console.error('Social proof reorder failed', err);
      status('Couldn’t save the new order (deploy the database rules first).', true);
    }
  }

  function checkIn(row) {
    if (typeof global.openAdminClientEmailCompose !== 'function') return;
    var m = checkInEmail(row.entry);
    closeDrawer();
    global.openAdminClientEmailCompose({
      name: row.entry.client,
      email: '',
      link: '',
      templateId: 'outreach-script',
      portalButton: false,
      subject: m.subject,
      message: m.message
    });
  }

  function bind() {
    if (bound || !els.list || !els.modal) return;
    bound = true;
    els.add.addEventListener('click', function () { openDrawer(null); });
    els.list.addEventListener('click', function (ev) {
      var li = ev.target.closest('.admin-social-proof-row');
      if (!li) return;
      var i = Number(li.getAttribute('data-index'));
      var mv = ev.target.closest('[data-move]');
      if (mv && !mv.disabled) { move(i, Number(mv.getAttribute('data-move'))); return; }
      if (ev.target.closest('[data-checkin]')) { checkIn(rows[i]); return; }
      if (ev.target.closest('[data-edit]')) openDrawer(i);
    });
    els.form.addEventListener('submit', save);
    els.form.addEventListener('input', function (ev) {
      if (ev.target === els.before || ev.target === els.after || ev.target === els.count) syncKind();
    });
    els.kind.addEventListener('change', syncKind);
    els.del.addEventListener('click', remove);
    els.checkin.addEventListener('click', function () { var r = currentRow(); if (r) checkIn(r); });
    els.modal.querySelectorAll('[data-social-proof-close]').forEach(function (n) {
      n.addEventListener('click', closeDrawer);
    });
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && els.modal.classList.contains('active')) closeDrawer();
    });
  }

  async function open() {
    cache();
    if (!els.list) return;
    bind();
    status('Loading social proof…');
    if (!(await waitReady(30000))) {
      status('Couldn’t reach the database. Make sure you’re signed in, then reopen this tab.', true);
      return;
    }
    await load();
  }

  global.CWR_SOCIAL_PROOF = {
    open: open,
    _test: {
      rowsFrom: rowsFrom,
      writePaths: writePaths,
      builtInCopyPaths: builtInCopyPaths,
      reorder: reorder,
      checkInEmail: checkInEmail,
      confirmDeleteText: confirmDeleteText,
      deletePaths: deletePaths
    }
  };

  // The admin can reopen straight onto this tab before this file loads.
  var panel = doc && doc.getElementById('admin-panel-testimonials');
  if (panel && !panel.hidden) open();
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Run the test to make sure it passes**

Run: `node scripts/test-social-proof-admin.mjs`
Expected: every line `✓`.

- [ ] **Step 5: index.html markup (section, drawer, bundle entry), tab hook, CSS, sync**

```bash
python3 - <<'EOF'
import pathlib, re
p = pathlib.Path('index.html'); s = p.read_text()

section = '''          <section class="service admin-collapsible-section admin-collapsible-open" id="social-proof-admin-section">
            <div class="admin-panel-heading">
              <div class="admin-panel-heading-main">
                <h3 class="h3 admin-panel-title">Social proof</h3>
                <p class="admin-panel-lead">Real clients and real results for “Trusted by local businesses” on the homepage. Start a draft at kickoff with the before number. When <strong>Check-in due</strong> shows (60 days after launch), add the result from the app or the client’s reply, then publish.</p>
              </div>
            </div>
            <div class="admin-collapsible-content">
              <div class="admin-collapsible-inner-content">
                <div class="admin-social-proof-bar">
                  <button type="button" class="btn btn-primary" id="admin-social-proof-add-btn">
                    <ion-icon name="add-outline" aria-hidden="true"></ion-icon>
                    Add client
                  </button>
                </div>
                <p class="admin-social-proof-status" id="admin-social-proof-status" hidden></p>
                <ul class="admin-social-proof-list" id="admin-social-proof-list" aria-label="Social proof entries"></ul>
              </div>
            </div>
          </section>
'''
anchor = '          </div><!-- /admin-panel-testimonials -->'
assert s.count(anchor) == 1
s = s.replace(anchor, section + anchor)

drawer = '''        <div class="business-doc-modal" id="social-proof-modal" style="display: none;" role="dialog" aria-modal="true" aria-labelledby="social-proof-modal-title">
          <div class="business-doc-modal-overlay" data-social-proof-close></div>
          <div class="business-doc-modal-content">
            <div class="business-doc-modal-header">
              <div class="business-doc-modal-heading">
                <h3 class="h3" id="social-proof-modal-title">Add client</h3>
                <p class="business-doc-modal-subtitle">Only numbers you can back up. Before/after numbers and notes stay private.</p>
              </div>
              <button type="button" class="business-doc-modal-close" data-social-proof-close aria-label="Close">
                <ion-icon name="close-outline"></ion-icon>
              </button>
            </div>
            <div class="business-doc-modal-body has-scrollbar">
              <form id="social-proof-form" class="business-doc-form" novalidate>
                <input type="hidden" id="social-proof-id">

                <section class="business-doc-section" aria-labelledby="social-proof-sec-client">
                  <div class="business-doc-section-head">
                    <h4 class="business-doc-section-title" id="social-proof-sec-client">Client</h4>
                  </div>
                  <div class="form-group">
                    <label for="social-proof-client">Client name</label>
                    <input type="text" id="social-proof-client" class="form-input" maxlength="80" placeholder="Rizo’s Pizzeria" autocomplete="off">
                  </div>
                  <div class="form-group">
                    <label for="social-proof-logo">Logo</label>
                    <input type="text" id="social-proof-logo" class="form-input" maxlength="500" list="social-proof-logo-options" placeholder="/assets/images/logo/logo-2-color.png" autocomplete="off">
                    <datalist id="social-proof-logo-options">
                      <option value="/assets/images/logo/logo-1-color.png">Shelton Springs HOA</option>
                      <option value="/assets/images/logo/logo-2-color.png">Rizo’s Pizzeria</option>
                      <option value="/assets/images/logo/logo-3-color.png">ProCleaning Seattle</option>
                    </datalist>
                    <p class="form-hint">A /assets/… path or an https link.</p>
                  </div>
                  <div class="form-group">
                    <label for="social-proof-project">Portfolio project (optional)</label>
                    <select id="social-proof-project" class="form-input"><option value="">None</option></select>
                    <p class="form-hint">Adds “View project” when the project is public.</p>
                  </div>
                </section>

                <section class="business-doc-section" aria-labelledby="social-proof-sec-result">
                  <div class="business-doc-section-head">
                    <h4 class="business-doc-section-title" id="social-proof-sec-result">Result</h4>
                  </div>
                  <div class="form-group">
                    <label for="social-proof-kind">Type</label>
                    <select id="social-proof-kind" class="form-input">
                      <option value="none">No number yet</option>
                      <option value="change">% change (before → after)</option>
                      <option value="count">Count</option>
                    </select>
                  </div>
                  <div class="form-row" data-social-proof-kind="change" hidden>
                    <div class="form-group form-group-half">
                      <label for="social-proof-before">Before</label>
                      <input type="text" inputmode="decimal" id="social-proof-before" class="form-input" placeholder="40" autocomplete="off">
                    </div>
                    <div class="form-group form-group-half">
                      <label for="social-proof-after">After</label>
                      <input type="text" inputmode="decimal" id="social-proof-after" class="form-input" placeholder="55" autocomplete="off">
                    </div>
                  </div>
                  <div class="form-group" data-social-proof-kind="count" hidden>
                    <label for="social-proof-count">Count</label>
                    <input type="text" id="social-proof-count" class="form-input" maxlength="24" placeholder="1,240" autocomplete="off">
                  </div>
                  <p class="social-proof-stat-preview" id="social-proof-stat-preview" aria-live="polite" hidden></p>
                  <div data-social-proof-has-number hidden>
                    <div class="form-group">
                      <label for="social-proof-label">What it measures</label>
                      <input type="text" id="social-proof-label" class="form-input" maxlength="80" placeholder="more online orders per week" autocomplete="off">
                    </div>
                    <div class="form-row">
                      <div class="form-group form-group-half">
                        <label for="social-proof-source">Source</label>
                        <select id="social-proof-source" class="form-input">
                          <option value="">Pick one…</option>
                          <option value="app">From the app</option>
                          <option value="client">Client-reported</option>
                        </select>
                      </div>
                      <div class="form-group form-group-half">
                        <label for="social-proof-as-of">Month</label>
                        <input type="month" id="social-proof-as-of" class="form-input">
                      </div>
                    </div>
                  </div>
                  <div class="form-group">
                    <label for="social-proof-launch">Launch date</label>
                    <input type="date" id="social-proof-launch" class="form-input">
                    <p class="form-hint">“Check-in due” shows 60 days after this.</p>
                  </div>
                  <div class="form-group">
                    <label for="social-proof-note">How you measured (private)</label>
                    <textarea id="social-proof-note" class="form-input" rows="2" maxlength="500" placeholder="Rizo’s order dashboard: weekly online orders, Jul vs Sep"></textarea>
                  </div>
                </section>

                <section class="business-doc-section" aria-labelledby="social-proof-sec-built">
                  <div class="business-doc-section-head">
                    <h4 class="business-doc-section-title" id="social-proof-sec-built">What we built</h4>
                  </div>
                  <div class="form-group">
                    <label for="social-proof-summary">One line</label>
                    <textarea id="social-proof-summary" class="form-input" rows="2" maxlength="200" placeholder="Online ordering with live order tracking and a kitchen dashboard."></textarea>
                    <p class="form-hint">Shows when there’s no number.</p>
                  </div>
                </section>

                <section class="business-doc-section" aria-labelledby="social-proof-sec-publish">
                  <div class="business-doc-section-head">
                    <h4 class="business-doc-section-title" id="social-proof-sec-publish">Publish</h4>
                  </div>
                  <div class="form-group form-group-checkbox-row">
                    <label class="portfolio-project-checkbox">
                      <input type="checkbox" id="social-proof-published" class="custom-switch-input">
                      <span class="custom-switch" aria-hidden="true"></span>
                      <span>Show on the homepage</span>
                    </label>
                    <p class="form-hint">Off = draft. Drafts never show.</p>
                  </div>
                  <button type="button" class="btn btn-secondary social-proof-delete" id="social-proof-delete-btn" hidden>Delete entry</button>
                </section>

                <p class="social-proof-errors" id="social-proof-errors" role="alert" hidden></p>
              </form>
            </div>
            <div class="business-doc-modal-footer">
              <button type="button" class="btn btn-secondary" id="social-proof-checkin-btn" hidden>
                <ion-icon name="mail-outline"></ion-icon>
                Results check-in
              </button>
              <button type="submit" form="social-proof-form" class="btn btn-primary" id="social-proof-save-btn">
                <ion-icon name="save-outline"></ion-icon>
                Save
              </button>
            </div>
          </div>
        </div>
'''
m = re.search(r'        <div class="business-doc-modal" id="business-doc-modal"', s)
assert m
s = s[:m.start()] + drawer + s[m.start():]

old = re.search(r"        \{ src: '/assets/js/prospects\.js\?v=[^']*' \},\n", s).group(0)
s = s.replace(old, old + "        { src: '/assets/js/social-proof-admin.js?v=social-proof-20261017' },\n", 1)
s = re.sub(r'(/assets/js/script\.js\?v=)[^"]*', r'\1social-proof-admin-20261017', s)
s = re.sub(r'(/assets/css/style\.css\?v=)[^"]*', r'\1social-proof-admin-20261017', s)
p.write_text(s)

p = pathlib.Path('assets/js/script.js'); s = p.read_text()
old = """      if (tabId === 'testimonials' && typeof window.loadTestimonialAdminPanel === 'function') {
        window.loadTestimonialAdminPanel();
      }
"""
new = old + """      if (tabId === 'testimonials' && window.CWR_SOCIAL_PROOF) {
        window.CWR_SOCIAL_PROOF.open();
      }
"""
assert s.count(old) == 1; p.write_text(s.replace(old, new))

p = pathlib.Path('assets/css/style.css'); s = p.read_text()
s += '''
/* =============================================
   ADMIN — SOCIAL PROOF (Testimonials tab)
   ============================================= */
.admin-social-proof-bar {
  margin-bottom: 16px;
}

.admin-social-proof-status {
  margin: 0 0 12px;
  font-size: var(--fs-7);
  color: var(--light-gray-70);
}

.admin-social-proof-status.is-error {
  color: var(--bittersweet-shimmer);
}

.admin-social-proof-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.admin-social-proof-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--jet);
  border-radius: 14px;
  background: var(--eerie-black-2);
}

.admin-social-proof-logo {
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 10px;
  background: hsla(0, 0%, 100%, 0.04);
}

.admin-social-proof-main {
  min-width: 0;
}

.admin-social-proof-name {
  margin: 0;
  font-weight: var(--fw-600);
  color: var(--white-1);
}

.admin-social-proof-result {
  margin: 2px 0 0;
  font-size: var(--fs-7);
  color: var(--light-gray);
}

.admin-social-proof-result strong {
  color: var(--orange-yellow-crayola);
}

.admin-social-proof-muted {
  display: inline;
  color: var(--light-gray-70);
}

.admin-social-proof-meta {
  margin: 2px 0 0;
  font-size: var(--fs-8);
  color: var(--light-gray-70);
}

.admin-social-proof-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 6px 0 0;
}

.admin-social-proof-chip {
  display: inline-block;
  padding: 2px 8px;
  border: 1px solid var(--jet);
  border-radius: 999px;
  font-size: 11px;
  font-weight: var(--fw-600);
  color: var(--light-gray);
}

.admin-social-proof-chip.is-published {
  color: hsl(140, 50%, 60%);
  border-color: hsla(140, 50%, 60%, 0.35);
}

.admin-social-proof-chip.is-due {
  color: var(--orange-yellow-crayola);
  border-color: hsla(45, 100%, 72%, 0.35);
}

.admin-social-proof-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.admin-social-proof-move {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 1px solid var(--jet);
  border-radius: 8px;
  background: none;
  color: var(--light-gray);
  cursor: pointer;
}

.admin-social-proof-move:disabled {
  opacity: 0.35;
  cursor: default;
}

@media (max-width: 580px) {
  .admin-social-proof-row {
    grid-template-columns: 40px minmax(0, 1fr);
  }

  .admin-social-proof-logo {
    width: 40px;
    height: 40px;
  }

  .admin-social-proof-actions {
    grid-column: 1 / -1;
    justify-content: flex-end;
  }
}

/* Drawer: same numbered sections as the document drawer. */
#social-proof-modal .business-doc-modal-header {
  align-items: flex-start;
  gap: 16px;
  padding: 16px 24px;
}

#social-proof-modal .business-doc-modal-body {
  padding: 4px 24px 24px;
}

#social-proof-modal .form-group label {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: var(--fw-600);
  text-transform: none;
  color: var(--white-2);
}

#social-proof-modal [hidden] {
  display: none !important;
}

#social-proof-modal select.form-input {
  background: var(--onyx);
  color: var(--white-1);
}

#social-proof-modal select.form-input option {
  background: var(--eerie-black-2);
  color: var(--white-1);
}

#social-proof-modal input[type="month"],
#social-proof-modal input[type="date"] {
  color-scheme: dark;
}

.social-proof-stat-preview {
  margin: 0 0 16px;
  font-size: var(--fs-6);
  color: var(--light-gray);
}

.social-proof-stat-preview strong {
  font-size: var(--fs-4);
  color: var(--orange-yellow-crayola);
}

.social-proof-delete {
  margin-top: 8px;
}

.social-proof-errors {
  margin: 16px 0 0;
  padding: 10px 14px;
  border: 1px solid hsla(0, 43%, 51%, 0.25);
  border-radius: 10px;
  background: hsla(0, 43%, 51%, 0.1);
  font-size: var(--fs-7);
  color: var(--bittersweet-shimmer);
}
'''
p.write_text(s); print('ok')
EOF
node scripts/sync-spa-shells.mjs 2>&1 | tail -1
for m in 'id="social-proof-modal"' 'id="admin-social-proof-list"' 'social-proof-admin.js?v=social-proof-20261017' 'script.js?v=social-proof-admin-20261017' 'style.css?v=social-proof-admin-20261017'; do echo "$m: $(grep -rl "$m" --include=index.html . | grep -v node_modules | wc -l | tr -d ' ')"; done
```

Expected:
- `ok` and `All shells synced and stamped.`
- each of the five lines prints `20`

- [ ] **Step 6: Browser check (WebKit, fake in-page database)**

Create `$SCRATCH/sp-admin-check.cjs`:

```js
// Admin Social proof, WebKit, fake in-page RTDB. No production reads or writes.
const { webkit } = require('/Users/ruben/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core');
const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) process.exitCode = 1; };
(async () => {
  const browser = await webkit.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/webkit-2370/pw_run.sh' });
  const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  page.on('dialog', (d) => d.accept());
  // Homepage, not /admin: /admin auto-loads the real admin bundle, which would try live database calls.
  await page.goto('http://localhost:5178/'); await page.waitForTimeout(3000);
  await page.evaluate(() => {
    // Fake RTDB at window level (overrides the real SDK helpers for this page only).
    const store = {};
    const get = (path) => path.split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), store);
    const set = (path, v) => { const ks = path.split('/').filter(Boolean); let o = store; ks.slice(0, -1).forEach((k) => { o[k] = o[k] || {}; o = o[k]; }); if (v === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); };
    let n = 0;
    window.__store = store; window.__writes = 0; window.__failWrites = false;
    window.rtdb = {}; window.rtdbRef = (db, path) => ({ path: path || '' });
    window.rtdbGet = async (r) => ({ val: () => { const v = get(r.path); return v === undefined ? null : JSON.parse(JSON.stringify(v)); } });
    window.rtdbUpdate = async (r, obj) => { if (window.__failWrites) throw new Error('PERMISSION_DENIED'); window.__writes++; Object.keys(obj).forEach((k) => set((r.path ? r.path + '/' : '') + k, obj[k])); };
    window.rtdbPush = () => ({ key: 'k' + (++n) });
    window.isAdminSession = () => true;
    window.portfolioProjectsAll = [{ id: 'pub1', title: 'Public sample' }, { id: 'priv1', title: "Rizo's Pizzeria", visibility: 'private' }];
    window.openAdminClientEmailCompose = (p) => { window.__compose = p; return true; };
    // Show the Testimonials panel and its ancestors.
    let el = document.getElementById('admin-panel-testimonials');
    while (el && el !== document.body) { el.hidden = false; if (getComputedStyle(el).display === 'none') el.style.display = 'block'; el = el.parentElement; }
  });
  await page.addScriptTag({ url: '/assets/js/social-proof-admin.js?v=check' });
  await page.evaluate(() => window.CWR_SOCIAL_PROOF.open()); await page.waitForTimeout(500);

  const rowNames = () => page.evaluate(() => [...document.querySelectorAll('.admin-social-proof-row .admin-social-proof-name')].map((x) => x.textContent));
  ok((await rowNames()).join() === "Rizo's Pizzeria,Shelton Springs HOA,ProCleaning Seattle", 'built-ins listed');
  ok(await page.evaluate(() => [...document.querySelectorAll('.admin-social-proof-chip')].every((c) => c.textContent === 'Built-in')), 'Built-in chips');

  // Open a built-in and close without saving → nothing written.
  await page.click('.admin-social-proof-row:nth-child(1) [data-edit]');
  await page.click('#social-proof-modal .business-doc-modal-close');
  ok(await page.evaluate(() => window.__writes === 0), 'open + close without Save writes nothing');

  // Edit Rizo's: % change, live preview, validation, save → copies all 3.
  await page.click('.admin-social-proof-row:nth-child(1) [data-edit]');
  await page.selectOption('#social-proof-kind', 'change');
  await page.fill('#social-proof-before', '40'); await page.fill('#social-proof-after', '55');
  ok(await page.evaluate(() => document.getElementById('social-proof-stat-preview').textContent.includes('+38%')), 'live preview shows +38%');
  await page.click('#social-proof-save-btn');
  ok(await page.evaluate(() => /Say what the number measures/.test(document.getElementById('social-proof-errors').textContent)), 'validation blocks save');
  await page.fill('#social-proof-label', 'more online orders per week');
  await page.selectOption('#social-proof-source', 'app');
  await page.fill('#social-proof-as-of', '2026-09');
  await page.fill('#social-proof-note', 'Rizo dashboard, Jul vs Sep');
  await page.selectOption('#social-proof-project', 'priv1');
  await page.click('#social-proof-save-btn'); await page.waitForTimeout(400);
  const st = await page.evaluate(() => ({ pub: Object.keys(window.__store.socialProof || {}).sort(), rizo: window.__store.socialProof['builtin-rizo'], det: window.__store.socialProofDetails['builtin-rizo'] }));
  ok(st.pub.join() === 'builtin-procleaning,builtin-rizo,builtin-shelton', 'first save copies all 3 built-ins');
  ok(st.rizo.stat === '+38%' && st.rizo.source === 'app' && st.rizo.asOf === '2026-09' && !('before' in st.rizo) && !('note' in st.rizo), 'public entry has the % but no raw numbers or note');
  ok(st.det.before === 40 && st.det.after === 55 && st.det.note === 'Rizo dashboard, Jul vs Sep', 'raw numbers + note in details');
  ok(await page.evaluate(() => [...document.querySelectorAll('.admin-social-proof-chip')].some((c) => c.textContent === 'Published')), 'rows now show Published');

  // Add a draft with a launch date 90 days ago → Check-in due.
  await page.click('#admin-social-proof-add-btn');
  await page.fill('#social-proof-client', 'New Client');
  const d = new Date(Date.now() - 90 * 86400000); const iso = d.toISOString().slice(0, 10);
  await page.fill('#social-proof-launch', iso);
  await page.click('#social-proof-save-btn'); await page.waitForTimeout(400);
  ok((await rowNames()).slice(-1)[0] === 'New Client', 'new draft added at the end');
  ok(await page.evaluate(() => [...document.querySelectorAll('.admin-social-proof-row:last-child .admin-social-proof-chip')].map((c) => c.textContent).join() === 'Draft,Check-in due'), 'draft shows Check-in due');

  // Reorder: move the last row up.
  await page.click('.admin-social-proof-row:last-child [data-move="-1"]'); await page.waitForTimeout(400);
  ok((await rowNames())[2] === 'New Client', 'moved up one');

  // Results check-in opens Compose with the prefilled email.
  await page.click('.admin-social-proof-row:nth-child(3) [data-checkin]');
  const c = await page.evaluate(() => window.__compose);
  ok(c && c.subject === 'Quick check-in on New Client' && /with your OK/.test(c.message) && c.portalButton === false, 'check-in opens Compose, prefilled');

  // Save failure keeps the drawer open with edits and shows the deploy message.
  await page.evaluate(() => { window.__failWrites = true; });
  await page.click('.admin-social-proof-row:nth-child(1) [data-edit]');
  await page.fill('#social-proof-summary', 'Edited line');
  await page.click('#social-proof-save-btn'); await page.waitForTimeout(300);
  const fail = await page.evaluate(() => ({ open: document.getElementById('social-proof-modal').classList.contains('active'), kept: document.getElementById('social-proof-summary').value, msg: document.getElementById('social-proof-errors').textContent }));
  ok(fail.open && fail.kept === 'Edited line' && /deploy the database rules/.test(fail.msg), 'failed save keeps edits + shows deploy message');
  await page.evaluate(() => { window.__failWrites = false; });
  await page.screenshot({ path: process.argv[2] + '/sp-admin-drawer.png' });
  await page.click('#social-proof-modal .business-doc-modal-close');

  // Phone width: list rows don't overflow.
  await page.setViewportSize({ width: 393, height: 852 }); await page.waitForTimeout(200);
  ok(await page.evaluate(() => [...document.querySelectorAll('.admin-social-proof-row')].every((r) => r.scrollWidth <= r.clientWidth + 1)), 'rows fit at 393px');
  await page.locator('#social-proof-admin-section').screenshot({ path: process.argv[2] + '/sp-admin-list-phone.png', timeout: 15000 });
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
```

Run: `node $SCRATCH/sp-admin-check.cjs $SCRATCH`
Expected: every line `✓`. Then read `$SCRATCH/sp-admin-drawer.png` and `$SCRATCH/sp-admin-list-phone.png`. Check that the drawer shows numbered sections 1–4 with dark selects, and the list rows are readable on a phone.

The check runs on `/` because `/admin` auto-loads the real admin bundle. The admin panel markup is in every shell, and the drawer moves itself to `<body>` when it opens.

- [ ] **Step 7: Run all tests**

Run: `for t in social-proof social-proof-rules social-proof-admin; do node scripts/test-$t.mjs | grep -c '✗'; done; node scripts/preflight.mjs 2>&1 | tail -1`
Expected: `0` three times, then `✓ preflight: …`

- [ ] **Step 8: Checkpoint (no commit; Ruben commits)**

Note the changed files for Ruben: `git status --short`.

---

### Task 5: Final pass

**Files:** none new.

- [ ] **Step 1: Full checks**

```bash
node scripts/preflight.mjs 2>&1 | tail -1
node $SCRATCH/sp-home-check.cjs $SCRATCH
node $SCRATCH/sp-admin-check.cjs $SCRATCH
```

Expected: preflight `✓`, and every browser line `✓`.

- [ ] **Step 2: Clean up artifacts**

```bash
git status --short | grep '^??'
```

Expected: only `assets/js/social-proof.js`, `assets/js/social-proof-admin.js`, the three new `scripts/test-social-proof*.mjs`, and the spec/plan docs. Delete any `.playwright-mcp/` files this work created.

- [ ] **Step 3: Hand-off note for Ruben**

Tell him:
1. **Push.** The homepage shows the 3 built-ins right away.
2. **Deploy the database rules** with `firebase deploy --only database --project portfolio-2578e`, either before or after the push. Admin saves work only after this.
3. **Add Rizo's result:** in Admin → Testimonials → Social proof, edit Rizo's and set % change with the real before/after numbers, what it measures, From the app, the month, and a note.
4. **Shelton and ProCleaning:** add counts when you have them, and set launch dates so check-ins come due.
5. **Each new client:** add a draft at kickoff with the before number.
