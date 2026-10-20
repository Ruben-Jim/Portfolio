# Reviews Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin → Reviews lists form testimonials, emailed reviews and hand-added Google reviews, each with an "On site" switch, an Add/Edit review form and an "Ask for a Google review" email. The public site hides switched-off reviews, tags Google ones, and uses the new names.

**Architecture:** A new admin-bundle file, `assets/js/reviews-admin.js` (`window.CWR_REVIEWS`), holds the pure rules (exposed as `_test` for Node) and the tab UI. `loadTestimonialAdminPanel` in `script.js` keeps fetching and caching, then hands rendering to `CWR_REVIEWS.renderList`. Rows keep today's `data-*` attributes, so the existing View questionnaire, Delete link and Remove handlers keep working. The public changes stay inline in `script.js`, so public pages load no new file.

**Tech Stack:** Plain HTML/CSS/JS, Firebase Firestore v10 (window-exposed helpers), Node `vm` tests, WebKit (playwright-core) browser checks.

**Spec:** `docs/superpowers/specs/2026-10-20-reviews-tab-design.md`

## Global Constraints

- **Legacy shell:** edit only root `index.html`, then run `node scripts/sync-spa-shells.mjs`. Every `?v=` touched in this work becomes `reviews-tab-20261020`, and `testimonial.html` loads the same `style.css` version (guarded by a test).
- **Admin popups:** `window.CwrUI` only (`confirm`, `toast`), never browser popups. Overlays use `data-layer="modal"` with no z-index.
- **Public pages load nothing new.** `reviews-admin.js` goes in `CLASSIC` in `loadAdminBundle()`. Code in `script.js` that calls it must `typeof`-guard it.
- **Google ask everywhere:** "Ask for a Google review" shows on every form and email row, whatever the rating.
- **Names:**
  - nav `Reviews` / `Reseñas`
  - Home kicker and Testimonials page title `Reviews & Testimonials` / `Reseñas y testimonios`
  - SEO title `Reviews & Testimonials | CodeWithRuben`
  - admin tab and heading `Reviews`
  - the `/testimonials` web address doesn't change
- **Google links:**
  - review link `window.CWR_GOOGLE_REVIEW_URL`, already in `config.js`
  - listing link `window.CWR_GOOGLE_PROFILE_URL = "https://www.google.com/maps/place/?q=place_id:ChIJK4OmDZEA9EUREUdNK2vpLZE"`
- **Live data:** field names and counts only. **No `firebase deploy` and no git commits.** Ruben does both.

## Review Focus

1. A review whose photo was changed with the picker (a non-stock `avatar` path) must still save on Edit. `validAdminReview` checks `avatar` as a string of 1–500 characters, not `isAvatarFile`. → Task 1 test `rule: admin review avatar is any short string`.
2. Editing without touching "Date posted" keeps the original `createdAt`, so the list order doesn't jump. → Task 2 test `editPayload keeps createdAt when the date is unchanged`.
3. A `javascript:` or `http:` review link is refused in the form, and the public card only ever links to `https://`. → Task 2 test `validateReview refuses a non-https link` and Task 4 test `public Google link is https only`.
4. Old documents with no `hidden` or `source` count as form testimonials that are on the site. → Task 2 test `buildRows: old docs are form rows, on site`.
5. A failed switch save flips the switch back and shows a toast. → Task 3 browser check `switch failure reverts`.

---

### Task 1: Firestore rules for added reviews, the switch, and client spoofing

**Files:**
- Modify: `firestore.rules` (replace `validEmailTestimonial` and change the testimonials `create`/`update` rules)
- Create: `scripts/test-reviews.mjs` (rules section)
- Modify: `scripts/test-testimonial-form.mjs` (its email-rule checks now point at `validAdminReview`)
- Modify: `~/Dev/Apps/blueprints/portfolio-security.md` (testimonials row and deploy note)

**Interfaces:**
- Produces: the Firestore function `validAdminReview(d)`. Document fields: `source` (`'email'|'google'`), `hidden` (bool), `reviewUrl` (https string ≤500, Google only), and `createdAt` (a timestamp on admin docs).

- [ ] **Step 1: Write failing static rule tests** in `scripts/test-reviews.mjs`. Slice the `validAdminReview` body and the testimonials `match` block, then assert:
  - `validAdminReview`:
    - `rule: admin review sources are email or google`: has `d.source in ['email', 'google']`
    - `rule: Google needs stars`: has `(d.source != 'google' || d.keys().hasAny(['rating']))`
    - `rule: review link is Google-only https`: has `reviewUrl`, `matches('^https://`, and `d.source == 'google'`
    - `rule: hidden is a boolean`: has `d.hidden is bool`
    - `rule: admin review avatar is any short string`: has no `isAvatarFile`
    - `rule: createdAt is a timestamp`: has `d.createdAt is timestamp`
    - `hasOnly` lists exactly `name, title, company, product, text, rating, avatar, source, reviewUrl, hidden, createdAt`
  - Create:
    - `rule: admin can add a review`: has `(isPortfolioAdmin() && validAdminReview(request.resource.data))`
    - `rule: a client can't set source/hidden/reviewUrl`: the client branch has `!request.resource.data.keys().hasAny(['source', 'hidden', 'reviewUrl'])`
  - Update:
    - `rule: switch changes only hidden`: a branch with `affectedKeys().hasOnly(['hidden'])` and `request.resource.data.hidden is bool`
    - `rule: full edit only for added reviews, source unchanged`: has `resource.data.get('source', '') in ['email', 'google']`, `request.resource.data.source == resource.data.source`, and `validAdminReview(request.resource.data)`
    - `rule: avatar-only and text-only edits still allowed`: today's two branches are unchanged
  - `rule: old validEmailTestimonial is gone`

  In `test-testimonial-form.mjs`, point the three `validEmailTestimonial` checks at `validAdminReview(d)`. Keep their intent: name and words required, rating optional for email, admin only.

- [ ] **Step 2: Run** `node scripts/test-reviews.mjs` → the new checks FAIL. Run `node scripts/test-testimonial-form.mjs` → the three edited checks FAIL.

- [ ] **Step 3: Implement the rules.** `validAdminReview(d)` takes the data map as a parameter so the create and update rules can share it. Its body is fixed by the Step 1 assertions plus today's `name`/`text`/`title`/`company`/`product` limits (120/5000/120/160/200), and `avatar` is a string of 1–500 characters. Rewrite the security doc's testimonials row. In its deploy note, change "Add from an email" to "Admin → Reviews (add, edit, the On site switch)".

- [ ] **Step 4: Run both test files** → PASS. The rules are checked statically only, because this Mac has no Java runtime for the emulator. Extend `$SCRATCH/email-rule-check.mjs` into `$SCRATCH/review-rule-check.mjs` with Google, switch, edit and spoof cases, ready for when an emulator is available.

### Task 2: Pure review rules (`reviews-admin.js`, `_test`)

**Files:**
- Create: `assets/js/reviews-admin.js`. Same wrapper as `social-proof-admin.js`: `(function (global) { … })(typeof window !== 'undefined' ? window : globalThis)`, exporting `global.CWR_REVIEWS = { renderList, openAdd, _test }`. `renderList` and `openAdd` are stubs until Task 3.
- Modify: `scripts/test-reviews.mjs` (pure section, loaded with `vm` like `test-social-proof-admin.mjs`)

**Interfaces:**
- Produces (`CWR_REVIEWS._test`):
  - `sourceOf(d) → 'form'|'email'|'google'`
  - `buildRows(tokens: {id,data}[], testimonials: {id,data}[]) → Row[]`, where `Row = { kind: 'form'|'email'|'google'|'waiting', id: string /* testimonial id, '' for waiting */, tokenId: string, name, email, product, text, rating: 0-5, shown: bool, createdMs: number, reviewUrl: string, data: object }`
  - `countRows(rows) → { all, onSite, google, waiting }`
  - `filterRows(rows, 'all'|'on-site'|'google'|'waiting') → Row[]`
  - `validateReview(input) → { ok: true, fields } | { ok: false, error: string }`. `input = { source, name, title, company, product, text, rating: ''|'1'..'5', reviewUrl, date: ''|'YYYY-MM-DD' }`, and `fields` holds the trimmed strings, `rating` (number) only when set, `reviewUrl` only when Google and set, and `source`.
  - `editPayload(existing: object|null, fields, dateInput: string, today: Date) → object`, without `createdAt` when it should be server time (the caller adds `serverTimestamp()`)
  - `dateInputValue(createdMs) → 'YYYY-MM-DD'|''`
  - `googleAskEmail(row) → { subject, message }`
  - `inviteUrl(tokenId, origin) → string`

- [ ] **Step 1: Write failing tests**, each one `ok(...)` with these names and values:
  - `buildRows: one row per testimonial, newest first`
    - The form row takes `tokenId` and `email` from its token.
    - An email doc → kind `email`; a Google doc → kind `google`.
  - `buildRows: unused invite without a testimonial is waiting`: `kind 'waiting'`, `id ''`, `tokenId` set.
  - `buildRows: used invite whose testimonial was removed has no row`
  - `buildRows: old docs are form rows, on site`: a doc with no `source` and no `hidden` → `kind 'form'`, `shown true`. With `hidden: true` → `shown false`.
  - `countRows`: for 1 form shown, 1 email hidden, 1 google shown and 1 waiting → `{ all: 4, onSite: 2, google: 1, waiting: 1 }`
  - `filterRows`: each filter returns the matching rows; `on-site` leaves out waiting rows.
  - `validateReview` errors:
    - blank name → `'Add their name.'`
    - blank words → `'Add their words.'`
    - Google without stars → `'Pick their stars. Every Google review has them.'`
    - a future date → `"Date posted can't be in the future."`
  - `validateReview refuses a non-https link`: `javascript:alert(1)` and `http://x` → `'The review link must start with https://'`
  - `validateReview: email may skip stars, a link is dropped for email`: email + `reviewUrl` set → `fields` has no `reviewUrl`, no `rating`.
  - `editPayload` new review:
    - `avatar 'avatar-1.png'`; no `hidden` key, so it shows by default.
    - Date `'2026-05-04'` → `createdAt` is a `Date` at local noon on 2026-05-04.
  - `editPayload keeps createdAt when the date is unchanged`: the existing `createdAt` object passes through, and its `avatar` (a custom path) and `hidden` are kept.
  - `editPayload: changed date replaces createdAt`
  - `googleAskEmail`:
    - subject `'A quick favor: your review on Google'`
    - the message contains the name, their words inside `“ ”`, and `'The button below opens my Google review page.'`, and ends with `'Ruben Jimenez\nCodeWithRuben'`
    - their words containing `<b>` stay as plain text
  - `inviteUrl('Ab3dK9xQ', 'https://rubenjimenez.dev/') → 'https://rubenjimenez.dev/review/Ab3dK9xQ'`

- [ ] **Step 2: Run** `node scripts/test-reviews.mjs` → FAIL (`_test` missing).

- [ ] **Step 3: Implement the helpers.**
  - Sort by `createdMs` descending.
  - Waiting rows use the token's `createdAt`.
  - `editPayload` sets `title`/`company`/`product` to `''` when blank, so an edit can clear them. On edit it drops `rating`/`reviewUrl` keys absent from `fields`, because a full `setDoc` replaces the doc.
  - The email message copy:
    ```
    Hi {name},

    Thank you again for your kind words. They mean a lot.

    Would you be willing to post them on Google too? It helps other local businesses find me. Here’s what you wrote, so you can copy and paste it:

    “{text}”

    The button below opens my Google review page. It only takes a minute.

    Thank you,
    Ruben Jimenez
    CodeWithRuben
    ```

- [ ] **Step 4: Run** `node scripts/test-reviews.mjs` → PASS.

### Task 3: Admin → Reviews tab UI

**Files:**
- Modify: `index.html`
  - The tab button at ~3602: desktop label `Reviews`, `aria-label="Reviews"`.
  - The testimonials panel at ~4290–4375:
    - heading `Reviews`, lead `Testimonials, Google reviews, and emailed ones. Switch on what shows on the site.`
    - the `#admin-testimonial-from-email-btn` button becomes `#admin-review-add-btn` ("Add review", `add-outline` icon)
    - the email modal becomes the review modal
    - the "Invites & submissions" h4 and lead are replaced by `<div class="admin-review-filters" id="admin-review-filters" role="toolbar" aria-label="Filter reviews"></div>` above the list
  - The `CLASSIC` list: add `{ src: '/assets/js/reviews-admin.js?v=reviews-tab-20261020' }` after social-proof-admin.
  - The `script.js` and `style.css` `?v=`: bump both.
- Modify: `assets/js/reviews-admin.js` (UI)
- Modify: `assets/js/script.js`
  - In `loadTestimonialAdminPanel`, after the cache fill, replace the row building (`appendActions`, both `forEach` loops, the empty state) with:
    ```js
    if (!window.CWR_REVIEWS && typeof window.loadAdminBundle === 'function') await window.loadAdminBundle();
    if (window.CWR_REVIEWS) window.CWR_REVIEWS.renderList(combined, tRows, pRows);
    ```
  - Delete the "Add a testimonial a client sent by email" block in `setupAdminEventListeners`. It moves to `reviews-admin.js`.
- Modify: `assets/css/style.css` (filter chips, source tags, switch, dimmed rows, the Google/Email toggle in the modal)
- Modify: `scripts/test-reviews.mjs`, `scripts/test-testimonial-form.mjs` (yesterday's email-form markup checks now point at the review modal)

**Interfaces:**
- Consumes: Task 2 `_test` helpers; the existing `confirmDeleteTestimonialItem`; the delegated handler on `#admin-testimonials-combined-list` (attributes `data-action="view-testimonial"`, `data-view-testimonial`, `data-view-testimonial-token`, `data-view-invite-only`, `data-delete-testimonial-token`, `data-delete-published-testimonial`, `.admin-testimonial-combined-row--interactive`, `.admin-testimonial-combined-main`); `window.openAdminClientEmailCompose({ name, email, link, templateId: 'outreach-script', portalButton: true, buttonLabel, subject, message })`; `window.addDoc/setDoc/updateDoc/doc/collection/serverTimestamp/db`.
- Produces:
  - `CWR_REVIEWS.renderList(container, tokens, testimonials)` renders the chips into `#admin-review-filters` and the rows into `container`.
  - `CWR_REVIEWS.openAdd()` and `openEdit(id)`.
  - Modal ids:
    - shell: `admin-review-modal`, `admin-review-form`, `admin-review-heading`
    - source buttons: `[data-review-source="google"|"email"]` plus a hidden `admin-review-source`
    - fields: `admin-review-name`, `-title`, `-company`, `-product`, `-text`, `-rating`, `-url` (inside `admin-review-url-wrap`), `-date`
    - status and save: `admin-review-status`, `admin-review-save`
  - Row controls: `[data-review-toggle="<id>"][role=switch][aria-checked]`, `[data-review-edit]`, `[data-review-ask-google]`, `[data-review-copy-link]`, `[data-review-open-google]`.

- [ ] **Step 1: Write failing static tests** in `test-reviews.mjs`:
  - `admin tab says Reviews`
  - `Add review button replaces Add from an email`
  - `review modal on the modal layer with all fields and unique ids`: reuse the unique-id check from `test-testimonial-form.mjs`
  - `reviews-admin.js is in the admin bundle, not a public script tag`
  - `loadTestimonialAdminPanel hands rendering to CWR_REVIEWS`
  - `old email block removed from script.js`: no `admin-testimonial-from-email-btn` anywhere
  - `no browser popups`: preflight covers this
  - `rows keep the View/Delete link/Remove attributes`: `reviews-admin.js` contains each `data-*` name listed above

  Update `test-testimonial-form.mjs`: drop the email-form markup checks; `test-reviews.mjs` now holds them.

- [ ] **Step 2: Run** `node scripts/test-reviews.mjs` → FAIL.

- [ ] **Step 3: Implement the UI in `reviews-admin.js`.**
  - Rows keep the `admin-testimonial-combined-row` classes. Only form rows (and waiting rows) get `--interactive`, so clicking an added review doesn't open the questionnaire.
  - **Row content:** escaped name, source tag (`Testimonial form` / `Email` / `Google` / `Waiting on them`), stars or `no stars given`, the first 220 characters of the words, and the switch with its `On site`/`Hidden` caption. Hidden rows get `.is-hidden`.
  - **Actions per kind**, as in the spec. Remove reuses `data-delete-published-testimonial`; Delete link reuses `data-delete-testimonial-token`.
  - **Switch:** flips its state first, then `updateDoc(doc(db,'testimonials',id), { hidden: !on })`. On failure it flips back and calls `CwrUI.toast("Couldn't change it. If this is the first time, deploy the Firestore rules.", { tone: 'error' })`. On success it updates the cached row, the counts, and `window.loadDynamicTestimonials()`.
  - **Modal:** Add uses `addDoc`. Edit uses `setDoc(doc(db,'testimonials',id), editPayload(...))`, with `createdAt: serverTimestamp()` only on Add when there's no date. Choosing Email hides the link field and adds the `No rating` option; choosing Google removes it. Escape, backdrop and Cancel close it, as yesterday. Errors go in `admin-review-status`; the success toast says `Review added.` or `Review saved.`.
  - **Ask for a Google review:** `openAdminClientEmailCompose` with `link: window.CWR_GOOGLE_REVIEW_URL`, `buttonLabel: 'Post on Google →'`, and `googleAskEmail(row)`.
  - **Copy link:** `navigator.clipboard.writeText(inviteUrl(...))`, then `CwrUI.toast('Link copied.')`.
  - **Filter chip state** lives in memory only.

- [ ] **Step 4: Run** `node scripts/test-reviews.mjs` and `node scripts/test-testimonial-form.mjs` → PASS. Then run `node scripts/sync-spa-shells.mjs` and `node scripts/preflight.mjs` → ✓.

- [ ] **Step 5: WebKit check** `$SCRATCH/reviews-tab-check.cjs`. Fake Firestore as in `email-testimonial-check.cjs`: `isAdmin` patched in the routed `script.js`; recorder `addDoc`/`setDoc`/`updateDoc`/`getDocs`. Rows: a used token with a form testimonial (with email), an email doc, a Google doc with `hidden: true`, and an unused token. At 1200 and 393 wide, check:
  - the four rows and their tags
  - chips `All 4 · On site 2 · Google 1 · Waiting on 1`, and that each chip filters
  - the switch saves `{hidden:false}`
  - `switch failure reverts` (a rejecting `updateDoc`), with an error toast
  - Add Google without stars shows an error
  - Add Google saves `source 'google'`, `rating`, and `reviewUrl`
  - Edit prefills, keeps `createdAt`, and saves through `setDoc`
  - Ask for a Google review calls a stubbed `openAdminClientEmailCompose` with the token's email and the review link
  - View questionnaire still opens the existing drawer on the form row
  - Remove opens the CwrUI confirm
  - the modal fits the screen and scrolls on a phone
  - no sideways overflow

  Expected: all ✓.

### Task 4: Public site, names, social proof tag, versions

**Files:**
- Modify: `assets/js/script.js` `loadDynamicTestimonials`:
  - Leave out `hidden === true` docs before the sort, the 40 cut, the Home 2 and `fillHeroQuote`.
  - Google card: `<span class="testimonials-google-tag">Google</span>` in `.testimonials-card-header`, plus `<a class="testimonials-google-link" href="…" target="_blank" rel="noopener">Posted on Google ↗</a>` after the quote. The href is `reviewUrl` when it matches `^https://`, otherwise `window.CWR_GOOGLE_PROFILE_URL`, otherwise no link.
- Modify: `assets/js/config.js`: add `GOOGLE_PROFILE_URL` and `window.CWR_GOOGLE_PROFILE_URL`.
- Modify: `assets/js/i18n.js`: `nav.testimonials`, `home.testimonials_kicker` and `testimonials.title`, in en and es, per Global Constraints.
- Modify: `assets/js/seo.js`: the testimonials `title`.
- Modify: `index.html`:
  - the default text of every `data-i18n="nav.testimonials"`, `home.testimonials_kicker` and `testimonials.title` element
  - `?v=` of `config.js`, `i18n.js`, `seo.js`, `script.js`, `style.css` and `social-proof-admin.js` → `reviews-tab-20261020`
  - then run sync, which also rewrites `testimonials/index.html`'s `<title>`
- Modify: `testimonial.html`: `style.css` and `config.js` `?v=` → `reviews-tab-20261020`.
- Modify: `assets/js/social-proof-admin.js`:
  - `testimonialFromDoc` adds `hidden: x.hidden === true`
  - `testimonialBlock` kicker appends ` · Hidden` when hidden
  - `Open in Testimonials` becomes `Open in Reviews`
- Modify: `assets/css/style.css` (`.testimonials-google-tag`, `.testimonials-google-link`)
- Modify: `scripts/test-reviews.mjs`, `scripts/test-social-proof-admin.mjs` (the Hidden tag)

- [ ] **Step 1: Write failing tests**:
  - `public list leaves out hidden reviews before slicing`: in `loadDynamicTestimonials`, a `hidden === true` filter appears before `rows.slice(0, 40)`
  - `public Google link is https only`: the href helper tests `^https:\/\/`
  - `config holds the Google listing link`
  - `i18n names en/es`
  - `SEO title Reviews & Testimonials`
  - `index default texts renamed`
  - `testimonials route shell title updated` (after sync)
  - `testimonialFromDoc carries hidden; block says Hidden`: in `test-social-proof-admin.mjs`
  - `Open in Reviews`

- [ ] **Step 2: Run** the tests → FAIL.

- [ ] **Step 3: Implement**, then run `node scripts/sync-spa-shells.mjs`.

- [ ] **Step 4: Run** `node scripts/preflight.mjs` → ✓, and every `node scripts/test-*.mjs` → PASS.

- [ ] **Step 5: WebKit check** `$SCRATCH/reviews-public-check.cjs`, with a fake `getDocs` like yesterday's check. At 1200 and 393 wide, check:
  - a hidden form testimonial doesn't show on Home, on the Testimonials page, or in the hero quote
  - a Google card shows the tag and its link opens `reviewUrl`; without one, the link opens the listing
  - an `http:` reviewUrl falls back to the listing
  - the nav says `Reviews`
  - the Home kicker says `Reviews & Testimonials`
  - the Spanish toggle shows `Reseñas` and `Reseñas y testimonios`
  - the email card from yesterday still shows no stars
  - re-run `email-testimonial-check.cjs` (expect the button-id failures to be gone, since it moved) and `google-ask-check.cjs` → all ✓

### Finish

- [ ] Fresh review of the whole change on the most capable model (the approved Native method), with this plan's Review Focus. Then one fix pass for Critical and Important findings, each fix RED→GREEN.
- [ ] Update the memory `project_social_proof.md`: the Reviews tab is built, and the rules deploy is needed before push.
- [ ] Stop the visual companion server.
- [ ] Report to Ruben:
  - the deploy order: `firebase deploy --only firestore:rules --project portfolio-2578e`, then push
  - the files to commit, including `assets/js/reviews-admin.js` and `scripts/test-reviews.mjs`
  - the rulings and deferred minors
