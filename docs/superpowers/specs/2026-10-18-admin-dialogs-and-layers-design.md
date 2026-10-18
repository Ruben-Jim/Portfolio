# Admin dialogs and layers: one popup kit, one stacking order

Date: 2026-10-18 · Status: draft for Ruben's review
Repo: rubenjimenez.dev (legacy plain HTML/CSS/JS SPA; 20 copies of the page shell, synced from `index.html` by `scripts/sync-spa-shells.mjs`)

## Intent

New admin buttons keep reaching for the browser's own `confirm()` / `alert()` / `prompt()`. The site already has a custom confirm look and a slide-in message, but no shared helper, so the browser popup is always the easy path.

Separately, every drawer, modal and sheet picks its own z-index number. That's how a custom confirm once ended up under content and "froze" the site, and why the timer button still floats over some open drawers.

Ruben wants three things:
- every "are you sure?", notice and text question in the admin to use the site's own UI
- everything to stack in a predictable order
- floating buttons to get out of the way while something is open

## Goals

- **One shared popup kit** for the admin:
  - **Confirm:** yes/no, styled like the existing `.confirm-delete-modal`.
  - **Notice:** a small message that slides in and disappears by itself (Ruben's choice), styled like the timer's existing slide-up toast (`.tc-timer-toast`).
  - **Ask:** the confirm popup with one text box, replacing `prompt()`.
- **Every browser popup in admin code moves to the kit:** 13 `confirm()`, 48 `alert()`, 5 `prompt()`. The 17 hand-copied confirm popups in `index.html` collapse into the shared confirm wherever they're plain yes/no.
- **The existing notice helpers keep working but use the kit:**
  - `showSuccessMessage` / `showErrorMessage` in `script.js` (61 call sites; today top-right, z-index 1000, hidden under drawers)
  - `showTcTimerToast` in `agency-tools.js` (z-index 140)
- **A fixed, named stacking order.** Every admin overlay sits on one step. A confirm is always above any drawer or modal, and a notice is always visible.
- **Floating buttons step aside on their own.** The timer chip and the mobile timer bar hide whenever any drawer, modal, sheet or confirm is open, with no hard-coded list of overlays to maintain.
- **A guard so it stays fixed.** The pre-push gate (`scripts/preflight.mjs`) fails when browser popups appear in admin code.

## Non-goals (this round)

- **The client portal** (`client-portal.js`, 6 browser popups) and **the public booking page** (`hire-me-booking.js`, 4). Ruben left them for later.
- **Public-page overlays** (project detail popup, "See examples" sheet, DM sheets, cookie banner): they keep their current numbers, except where a rule below says otherwise.
- **Redesigning any drawer or modal's look,** beyond the stacking fixes.
- **Undo-style deletes.** The notice keeps support for one action button, but this round doesn't turn confirms into Undo.

## Anti-goals (would make this a failure even if it "works")

- **A popup that opens invisibly or under something,** leaving the page stuck until refresh. The kit must never show behind content.
- **Changed behaviour for any existing action.** Every delete still deletes the same thing after confirming, with the same wording (title, sentence, button labels). Every notice still says the same thing.
- **A bigger public page.** The kit is small (target under 4 KB minified-equivalent of plain JS + CSS), and public pages don't get noticeably heavier.
- **A popup that keyboard or screen-reader users can't use.** Escape cancels, focus goes into the popup, focus returns to the button that opened it, and the existing ARIA roles stay (`alertdialog`, `aria-modal`, `role="status"` for notices).

## Current state (inventory, 2026-10-18)

- **Browser popups in admin code:**
  - Also called through `global.`: `outreach-composer.js` (one confirm, one alert, one prompt), `prospects.js` (one confirm) and `social-proof-admin.js` (one confirm). The counts below include two comments that aren't calls (`index.html` and one in `script.js`).
  - `script.js`: 41
  - `agency-tools.js`: 20
  - `post-builder/library.js`: 2
  - `post-builder/panel-slides.js`: 1
  - `blog-tiptap-editor.js`: 1
  - `index.html` inline script: 1
  - **By kind:** 13 confirm, 48 alert, 5 prompt.
- **Custom confirm copies:**
  - 17 `<div class="modal-container" id="…-confirm-modal">` blocks in `index.html`, each with a `.confirm-delete-modal` section (header, close, body sentence, Cancel + action button).
  - They open by adding `.active` and `aria-hidden="false"` to the container, then focus Cancel after 40 ms.
  - Each has its own open/close/handler functions (15 `open…Confirm…` functions across `script.js` and `agency-tools.js`).
  - A few are not plain yes/no and must be checked one by one: `graduate-client-confirm-modal`, the portfolio and blog "unsaved changes" confirms, and `email-clear-day-confirm-modal`.
- **Stacking:**
  - Overlay roots use hand-picked z-index values from 9998 to 10150, with outliers `.private-post-modal` 20000 and `.cwr-onboard-banner` 99999.
  - Each confirm copy has its own number (10030–10150).
  - Notices sit at 1000 (`showErrorMessage`) and 140 (`.tc-timer-toast`).
- **Timer chip:** `.tc-timer-chip` is z-index 10060 on desktop. A fixed list in `agency-tools.css` (about line 3714) pushes it to 10035 while certain overlays are open. Some drawers are lower than 10035 (`.lead-drawer` 9999, `.admin-contact-detail` and `.admin-testimonial-detail` 9998), so the chip still shows over them, and overlays missing from the list aren't covered.

## Design

### 1. The popup kit: `assets/js/admin-ui.js` → `window.CwrUI`

A small plain-JS file, loaded on every page **before** `script.js` (through `index.html`, then synced to all shells). It's on every page because `script.js`, which loads everywhere, calls the notice helpers.

- `CwrUI.confirm(opts) → Promise<boolean>`
  - opts: `title`, `message`, `confirmLabel` (default "Confirm"), `cancelLabel` (default "Cancel"), `tone` (`'danger'` → `btn-danger`, otherwise `btn-primary`)
  - Resolves `true` on the action button and `false` on Cancel, the close (×) button, the overlay or Escape.
- `CwrUI.choose(opts) → Promise<value|null>`, for questions where both buttons do something.
  - opts: `title`, `message`, `actions: [{ label, value, tone }]`
  - Resolves the clicked action's `value`. ×, the overlay and Escape resolve `null`, meaning do nothing.
  - `confirm` is `choose` with Cancel/action buttons, where dismissing resolves `false`.
- `CwrUI.prompt(opts) → Promise<string|null>`
  - opts: the confirm options plus `label`, `value`, `placeholder`, `required`
  - Resolves the trimmed text, or `null` on cancel. Enter submits. With `required`, the action button is disabled while the box is blank.
- `CwrUI.toast(message, opts)`
  - opts: `tone` (`'error' | 'success' | 'info'`), `action` (`{ label, onClick }`), `duration` (default 3200 ms, or 6000 ms with an action)
  - One notice shows at a time; a new one replaces the current one, as `showTcTimerToast` does today.
- **Markup:** one dialog root, built on first use and appended to `<body>`, reusing the existing `.modal-container` / `.overlay` / `.confirm-delete-modal` classes and their look. Text is set with `textContent` (never HTML) so messages can't inject markup.
- **One confirm at a time:** a second `confirm`/`prompt` while one is open waits in a queue and opens after the first resolves.
- **Focus:** on open, focus goes to Cancel (as today), or to the text box for `prompt`. On close, it returns to the element that had focus before.
- **Wrappers, so existing callers keep working unchanged:**
  - `showSuccessMessage(m)` → `CwrUI.toast(m, { tone: 'success' })`
  - `showErrorMessage(m)` → `CwrUI.toast(m, { tone: 'error' })`
  - `showTcTimerToast(m, isError, action)` → `CwrUI.toast(m, { tone: isError ? 'error' : 'info', action })`
- **Notice styling** moves from `.tc-timer-toast` to shared `.cwr-toast` classes in `style.css`, with the same look: bottom-center, slide up, error variant, optional action button. It keeps the mobile offset above the timer bar.

### 2. Migrating the call sites

- **Each `confirm()`** becomes `if (!(await CwrUI.confirm({...}))) return;`. The enclosing function becomes `async` if needed. The title and sentence come from the old confirm text.
  - **Wording (my call):** a browser confirm has no title and says OK/Cancel. The migrated version keeps the old sentence as its message, adds a short title, and names the action button for what it does ("Delete", "Discard"). Same meaning, and the old wording wherever it still fits.
  - **Either/or confirms (my call):** three confirms in `script.js` use OK and Cancel as two different actions. They become `CwrUI.choose` with two labeled buttons, and closing the box does nothing:
    - the email-compose "set up the client project" question (OK sets up the project, Cancel writes the email anyway)
    - "pick up the saved draft" (OK resumes the draft, Cancel starts fresh)
    - `confirmAdminClientEmailOverwrite`, OK discards unsaved edits
  - Their text is rewritten so it no longer mentions "OK"/"Cancel".
  - **Destructive wording uses `tone: 'danger'`:** delete, remove, discard, clear, revoke.
- **Each `alert()`** becomes `CwrUI.toast(...)`.
  - Failures ("Could not…", "Couldn't…", "…failed", validation messages like "Name is required.") use `tone: 'error'`.
  - Confirmations of success ("…emailed to…", "Saved") use `tone: 'success'`.
  - Anything else uses `info`.
  - A validation message that today blocks progress with `alert` stays blocking in effect: the function still returns early, it just shows a notice instead.
- **Each `prompt()`** becomes `await CwrUI.prompt({...})`, with the same default value and the same handling of cancel and blank.
- **The 17 confirm copies:**
  - Plain yes/no copies (title + sentence + Cancel + one action) are replaced by `CwrUI.confirm`. Their markup is removed from `index.html`, and their open/close/setup functions and overlay listeners are removed. The trigger calls `CwrUI.confirm` and then runs the existing handler body.
  - Copies with anything more (extra fields, a third button such as Save / Discard / Cancel, or custom content) stay as their own modal but move onto the layer system (section 3).
- **Behaviour parity:** each migrated action keeps its guard checks (`isAdmin()`, pending ids), its success path and its error path. The only thing that changes is which UI asks.

### 3. Stacking order

Named layers as CSS custom properties on `:root` in `style.css`. Each admin overlay root gets one layer through a `data-layer` attribute (in markup, or set by the script that builds it). The numbers below are the builder's call, as long as the order holds:

| Layer | Variable | Example value | Who |
|---|---|---|---|
| Floating | `--z-float` | 100 | timer chip, mobile timer bar, admin floating buttons |
| Drawer | `--z-drawer` | 10000 | lead drawer, client drawer, email drawer, contact/testimonial detail, timer drawer, ops doc sheet, add-time drawer |
| Modal | `--z-modal` | 10100 | business-doc drawer-modals (documents, social proof, lead modal), blog add/edit, portfolio project editor, email preview, reply / sent / testimonial-request modals, login |
| Modal over modal | `--z-modal-raised` | 10150 | an overlay that opens from inside a modal (e.g. the blog image modal from the blog editor, the private-post modal) |
| Banner | (unchanged) | 99999 | cookie / onboarding banner |
| Full-screen editor | `--z-fullscreen` | 100010 | post builder `.pb-editor` and its `.pb-modal` (kept above the banner on purpose, as today) |
| Confirm | `--z-confirm` | 100100 | the kit's confirm/choose/ask, and any confirm copies kept as their own modal |
| Notice | `--z-toast` | 100200 | the kit's notices |

- **My call:** confirm and notices sit at the very top, above the banner and the post builder. The post builder's "Delete slide?" confirm opens from inside the full-screen editor, and a first-visit notice must not hide under the bottom cookie banner.

- **Rule:** an overlay that opens from inside another overlay sits on a higher layer than its parent.
- The old per-id z-index rules for admin overlays are **removed**, not overridden with `!important`, so there's one source of truth.
- The loading screen (`.loading-screen`, 9999) keeps covering everything on first load. It's the builder's call where it sits, as long as it covers the page while it loads and is gone afterwards.

### 4. Floating buttons step aside

- **Marking:** floating admin elements get `data-float`: the timer chip, the mobile timer bar, and any other fixed admin button the builder finds.
- **Tracking:** a small watcher in `admin-ui.js` keeps `body.cwr-overlay-open` up to date while any `[data-layer]` element is actually visible. It only runs once the admin is open, so public pages don't do the extra work. Overlays that hide with `opacity: 0` alone count as hidden. It runs on DOM changes (class, style, `hidden`, `aria-hidden`, nodes added/removed), checked at most once per animation frame.
  - "Visible" means: not `display: none`, not `visibility: hidden`, not `hidden`, not `aria-hidden="true"`, and a non-zero size.
- **CSS:** `body.cwr-overlay-open [data-float] { visibility: hidden; pointer-events: none; }`. The old hard-coded hide list in `agency-tools.css` (the `body.admin-email-drawer-open > .tc-timer-chip, …` block) is removed.
- **Why this works for new overlays:** anything on a layer counts automatically, with no list to update.

### 5. Guard

- **Check:** `scripts/preflight.mjs` gains a check that fails, with file:line, when `confirm(`, `alert(` or `prompt(` is called as the browser's own function in admin code:
  - every `assets/js/*.js` except `client-portal.js` and `hire-me-booking.js`
  - `assets/js/post-builder/*.js`
  - the inline scripts in `index.html`
- **Flagged:** bare calls, and calls through `window.`, `global.`, `self.` or `globalThis.`.
- **Not flagged:** other method calls like `CwrUI.confirm(`, words that only contain those names (like `isConfirmed(`), and comments.
- **Test:** a Node test for the guard (`scripts/test-admin-ui.mjs`) checks that it catches a fixture with `window.confirm(` and a bare `alert(`, and ignores `CwrUI.confirm(`.

## Testing

- **Node:**
  - the guard (above)
  - an inventory test: no browser popups left in admin files
  - a test that every overlay root id in `index.html` (`…-modal`, `…-drawer`, `…-sheet` roots) has a `data-layer`
- **Browser (WebKit, fake data only, as in the earlier social proof checks):**
  - **Confirm:** resolves true/false, Escape cancels, focus returns, and it shows above an open drawer and above an open modal.
  - **Prompt:** returns the text, blocks blank when `required`, Enter submits.
  - **Notice:** visible above an open drawer, disappears by itself, error style, action button.
  - **Wrappers:** `showErrorMessage` / `showSuccessMessage` show as notices.
  - **Floating buttons:** the timer chip hides while a drawer, modal or confirm is open and comes back when it closes.
  - **Spot checks of migrated actions:** at least one delete from each main area (blog, portfolio, documents, hub, lead, referral, time entry, testimonial, social proof) opens the shared confirm, Cancel leaves the data alone, and confirming runs the delete (against fakes).
  - **Phone width (393 px):** the confirm and notices fit.
- **Preflight:** green, including the new guard.

## Constraints

- **Stack:** plain JS (no build step, no frameworks), the same style as the surrounding code.
- **Shells:** markup and `?v=` cache-buster changes go into `index.html`, then `node scripts/sync-spa-shells.mjs`. All 20 shells must match.
- **Admin bundle:** admin-only scripts load lazily via `loadAdminBundle()`. The kit is not admin-only (see 1), so it gets a normal `<script>` tag before `script.js`.
- **Ownership:** no git commits or pushes and no `firebase deploy`. Ruben does those. No reading production data.

## Left to the builder

- Exact layer numbers (keep the order).
- Toast tone per call site, following the rules in 2.
- Which confirm copies are "plain yes/no", checking each one.
- File layout inside `admin-ui.js`, and how the watcher is throttled.
- Whether `admin-ui.js` styles live in `style.css` (preferred, one stylesheet) or alongside the script.
