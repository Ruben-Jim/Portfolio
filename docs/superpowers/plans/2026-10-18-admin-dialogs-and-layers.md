# Admin Dialogs and Layers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every admin confirm, notice and text question uses one shared popup kit (`window.CwrUI`). Admin overlays stack in one named order, and floating buttons hide while any overlay is open.

**Architecture:**
- **The kit:** a small plain-JS file, `assets/js/admin-ui.js`, loaded on every page before `script.js`. It builds one dialog (reusing the `.confirm-delete-modal` look) and one toast (the `.tc-timer-toast` look, renamed `.cwr-toast`).
- **Layers:** declared as CSS variables, and each admin overlay root gets a `data-layer` attribute.
- **Floating buttons:** a watcher keeps `body.cwr-overlay-open` in sync, and CSS hides `[data-float]` while it's set.
- **The guard:** a Node module scans admin JS for browser popups, and preflight runs it.

**Tech Stack:** plain HTML/CSS/JS (no build step), Node test scripts (`node scripts/test-*.mjs`), `playwright-core` WebKit for browser checks.

**Spec:** `docs/superpowers/specs/2026-10-18-admin-dialogs-and-layers-design.md`

## Global Constraints

- **No git commits, pushes or `firebase deploy`.** Ruben does those. Every "Checkpoint" step only runs tests. No reading production data; browser checks use fakes.
- **Shells:** markup and `?v=` changes go into `index.html`, then `node scripts/sync-spa-shells.mjs`. Each changed marker must appear in 20 shells.
- **Scope:** admin only. **Out of scope:**
  - `client-portal.js` and `hire-me-booking.js`
  - the public overlays `project-detail-modal` and `package-examples-modal`
  - `sales-` / `turnkey-` / `endtoend-` / `questions-` / `components-modal`
  - `private-post-modal`, the DM sheets, and the cookie banner
- **Kit API (exact):**
  - `CwrUI.confirm(opts) → Promise<boolean>`
  - `CwrUI.choose(opts) → Promise<value|null>`
  - `CwrUI.prompt(opts) → Promise<string|null>`
  - `CwrUI.toast(message, opts) → void`
  - `CwrUI.watchOverlays() → void`
- **Toast defaults:** 3200 ms, or 6000 ms with an action. One toast at a time.
- **Text:** all text goes in with `textContent`, never HTML.
- **Layer values, in this order:**

  | Variable | Value | Use |
  |---|---|---|
  | `--z-float` | 100 | floating buttons |
  | `--z-drawer` | 10000 | drawers, sheets |
  | `--z-modal` | 10100 | modals |
  | `--z-modal-raised` | 10150 | a modal opened from inside a modal |
  | banner | 99999 | unchanged |
  | `--z-fullscreen` | 100010 | the post builder |
  | `--z-confirm` | 100100 | the kit's dialog and kept confirm copies |
  | `--z-toast` | 100200 | notices |

- **Layer rules:** written as `body [data-layer="drawer"] { z-index: var(--z-drawer); }` (and the same for modal, modal-raised and confirm), placed at the end of `style.css`. Old numeric `z-index` declarations on in-scope overlay roots are deleted, not overridden.
- **Copy:** each migrated confirm keeps its old sentence as `message`, adds a short `title`, and names the action button for what it does. Destructive actions (delete, remove, discard, clear, revoke) use `tone: 'danger'`.
- **Toast tones:**
  - `error`: failures ("Could not…", "Couldn't…", "…failed", validation)
  - `success`: done ("…emailed…", "Saved…")
  - `info`: everything else

## Review Focus

1. **A confirm opened from inside the post builder's full-screen editor** ("Delete slide?") must show above the editor. Covered in Task 5 (CSS value test: `--z-confirm` is greater than the post builder's z-index).
2. **A second confirm requested while one is open** waits, and both resolve in order. Covered in Task 1 (browser check).
3. **Escape in a prompt's text box** cancels (`null`); Enter submits; a `required` prompt can't submit blank. Covered in Task 1 (browser check).
4. **A notice fired while a drawer or modal is open** is visible above it. Covered in Task 5 (browser check).
5. **Floating buttons:** opening a drawer hides the timer chip. Opening and closing a confirm on top of that drawer keeps the chip hidden until the drawer closes. Covered in Task 5 (browser check).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `assets/js/admin-ui.js` | Create | `window.CwrUI`: dialog, toast, overlay watcher |
| `scripts/lib/native-dialogs.mjs` | Create | `findNativeDialogs(source)`, `adminDialogFiles(root)` for the guard |
| `scripts/test-admin-ui.mjs` | Create | Guard tests, inventory per file, removed confirm copies, layer coverage, CSS layer order |
| `scripts/preflight.mjs` | Modify | Run the guard (Task 6) |
| `assets/css/style.css` | Modify | `.cwr-toast`, `.cwr-dialog` bits, layer variables + rules, `[data-float]` hide rule; old overlay z-indexes removed |
| `assets/css/agency-tools.css` | Modify | `.tc-timer-toast` → uses `.cwr-toast`; timer chip hide list removed; chip uses `--z-float` |
| `assets/css/post-builder.css` | Modify | `.pb-editor`, `.pb-modal` use `var(--z-fullscreen)` |
| `index.html` (+19 shells) | Modify | `admin-ui.js` tag; 13 confirm copies removed; `data-layer` / `data-float` attributes; cache-busters |
| `assets/js/script.js` | Modify | Wrappers, migrated popups, removed confirm-copy functions, `data-layer` on built overlays |
| `assets/js/agency-tools.js` | Modify | `showTcTimerToast` wrapper, migrated popups, removed confirm-copy functions |
| `assets/js/post-builder/library.js`, `panel-slides.js`, `blog-tiptap-editor.js`, `outreach-composer.js`, `prospects.js`, `social-proof-admin.js` | Modify | Migrated popups |

---

### Task 1: The popup kit

**Files:**
- Create: `assets/js/admin-ui.js`
- Modify: `assets/css/style.css`, `index.html` (`<script src="/assets/js/admin-ui.js?v=admin-ui-20261018"></script>` right before the `script.js` tag), then sync
- Test: `$SCRATCH/ui-kit-check.cjs` (WebKit, run against `http://localhost:5178/`)

**Interfaces:**
- **Produces `window.CwrUI`:**
  - `confirm({ title, message, confirmLabel='Confirm', cancelLabel='Cancel', tone='primary'|'danger' }) → Promise<boolean>`
  - `choose({ title, message, actions: [{ label, value, tone }] }) → Promise<value|null>`
  - `prompt({ title, message, label, value='', placeholder='', confirmLabel='Save', cancelLabel='Cancel', required=false }) → Promise<string|null>`
  - `toast(message, { tone='info'|'success'|'error', action: { label, onClick }, duration })`
  - `watchOverlays()`: a stub here, built in Task 5
- **DOM (built on first use, appended to `<body>`):**
  - `#cwr-dialog.modal-container[data-layer="confirm"]`, containing `.overlay` and `section.confirm-delete-modal[role=alertdialog][aria-modal=true]`, with a title `#cwr-dialog-title`, a message `#cwr-dialog-message`, an optional `input#cwr-dialog-input`, and buttons in `.confirm-delete-modal__actions` (Cancel = `.btn.btn-secondary`; action = `.btn.btn-danger` or `.btn.btn-primary`)
  - `#cwr-toast.cwr-toast[role=status]` (`.is-visible`, `.is-error`, `.is-success`), with `.cwr-toast-msg` and an optional `.cwr-toast-action`
- **Behavior:**
  - **Opening:** adds `.active` and `aria-hidden="false"`. Focus goes to Cancel (or the input for `prompt`) after 40 ms.
  - **Closing:** focus returns to the element that was focused before.
  - **Dismissing:** Escape, the overlay or × resolve `false` (`confirm`) or `null` (`choose` / `prompt`).
  - **Queue:** requests made while the dialog is open wait and open in order.

- [ ] **Step 1: Write the failing browser check**

`$SCRATCH/ui-kit-check.cjs` loads the homepage in WebKit (393×852 and 1200×900), removes `#cwr-cookie-banner`, and asserts:
- `typeof CwrUI.confirm === 'function'`
- **Confirm:**
  - The action button resolves `true`.
  - Cancel, Escape and an overlay click each resolve `false`.
  - The action button has `.btn-danger` when `tone: 'danger'`.
  - `#cwr-dialog-title` and `#cwr-dialog-message` text equal the options passed.
- **Choose:** with `actions: [{label:'Set up project', value:'setup'}, {label:'Write anyway', value:'write'}]`, clicking "Write anyway" resolves `'write'`, and Escape resolves `null`.
- **Prompt:**
  - Typing "Hello" and pressing Enter resolves `'Hello'`; Escape resolves `null`.
  - With `required: true` and a blank box, the action button is `disabled`.
- **Queue:** two `confirm` calls made back to back open one after the other, and both resolve in order (confirm the first, cancel the second gives `[true, false]`).
- **Focus:** after the dialog closes, `document.activeElement` is the button that opened it (a test button added to the page).
- **Toast:**
  - `CwrUI.toast('Saved', { tone: 'success' })` shows `#cwr-toast.is-visible.is-success` with text "Saved", and it's gone after 3500 ms.
  - With an `action`, the button runs `onClick` and hides the toast.
- **Injection:** `CwrUI.toast('<b>x</b>')` renders the literal text, with no `<b>` element.
- **Fit:** at 393 px, the dialog's `section` and the toast fit inside the viewport.

Run: `node $SCRATCH/ui-kit-check.cjs $SCRATCH`
Expected: FAIL (`CwrUI is not defined`).

- [ ] **Step 2: Build `assets/js/admin-ui.js`**

Implement the API and behavior above as an IIFE assigning `window.CwrUI`.
- `confirm` is built on the same internal opener as `choose`, with two actions: Cancel = `false`, action = `true`, dismiss = `false`.
- **CSS in `style.css`:**
  - `.cwr-toast` takes the exact rules of `.tc-timer-toast` (`agency-tools.css` ~3618–3690), including the error colors and action button. Add a `.is-success` border of `hsla(140, 50%, 55%, 0.45)`.
  - Use `z-index: var(--z-toast, 100200)` and `#cwr-dialog { z-index: var(--z-confirm, 100100); }`. Task 5 declares the variables; the fallbacks keep this task working on its own.
  - Add `#cwr-dialog-input` styled like `.form-input`.

- [ ] **Step 3: Add the script tag before `script.js` in `index.html`, then sync**

Run: `node scripts/sync-spa-shells.mjs && grep -rl 'admin-ui.js?v=admin-ui-20261018' --include=index.html . | grep -v node_modules | wc -l`
Expected: `20`.

- [ ] **Step 4: Run the browser check**

Run: `node $SCRATCH/ui-kit-check.cjs $SCRATCH`
Expected: every line `✓`.

- [ ] **Step 5: Wrappers keep old callers working**

Extend the check: `showSuccessMessage('A')` shows `#cwr-toast.is-success` "A", and `showErrorMessage('B')` shows `.is-error` "B". Run it (FAIL). Then:
- In `script.js`, make `showSuccessMessage(m)` / `showErrorMessage(m)` call `CwrUI.toast(m, { tone })`. Keep their old inline-styled bodies only as a fallback when `window.CwrUI` is missing.
- In `agency-tools.js`, make `showTcTimerToast(m, isError, action)` call `CwrUI.toast(m, { tone: isError ? 'error' : 'info', action })`, and delete `.tc-timer-toast*` rules except the mobile `tc-timer-bar-active` offset, which moves to `.cwr-toast`.

Run again. Expected: all `✓`. Then run `node scripts/preflight.mjs 2>&1 | tail -1` and expect `✓ preflight: …`.

---

### Task 2: The guard module

**Files:**
- Create: `scripts/lib/native-dialogs.mjs`, `scripts/test-admin-ui.mjs`

**Interfaces:**
- **Produces:**
  - `findNativeDialogs(source: string) → Array<{ line: number, call: 'confirm'|'alert'|'prompt', text: string }>`
  - `adminDialogFiles(root: string) → string[]` (repo-relative)
- **Rules:**
  - **Matches** a bare call, or a call through `window.` / `global.` / `self.` / `globalThis.`. The character before must not be a word character, `.` or `$`, unless the dot is part of those four prefixes.
  - **Ignores** `//` line comments, `/* */` blocks, and other method calls (`CwrUI.confirm(`, `x.alert(`).
  - **For HTML files,** only inline `<script>` blocks without `src` are scanned.
- **Files:** `assets/js/*.js` except `client-portal.js`, `hire-me-booking.js` and `admin-ui.js`; plus `assets/js/post-builder/*.js` and `index.html`.

- [ ] **Step 1: Write failing tests in `scripts/test-admin-ui.mjs`**

Use the `ok(c, m)` style of the other `scripts/test-*.mjs` files. Assertions:
- `findNativeDialogs("if (!confirm('x')) return;")` gives one `confirm` on line 1.
- `findNativeDialogs("window.alert('a');\nglobal.prompt('b');\nself.confirm('c');\nglobalThis.alert('d');")` gives 4 results, on lines 1–4.
- `findNativeDialogs("CwrUI.confirm({});\nx.alert(1);\nisConfirmed();\nconfirmDelete();")` gives `[]`.
- `findNativeDialogs("// confirm('x')\n/* alert('y') */\nvar s = 'ok';")` gives `[]`.
- `adminDialogFiles(repoRoot)` includes `assets/js/script.js`, `assets/js/agency-tools.js`, `assets/js/post-builder/library.js` and `index.html`, and excludes `assets/js/client-portal.js` and `assets/js/hire-me-booking.js`.

Run: `node scripts/test-admin-ui.mjs`
Expected: FAIL (`Cannot find module './lib/native-dialogs.mjs'`).

- [ ] **Step 2: Implement `scripts/lib/native-dialogs.mjs`**

- [ ] **Step 3: Run the tests**

Run: `node scripts/test-admin-ui.mjs`
Expected: all `✓`. Then `node scripts/preflight.mjs 2>&1 | tail -1` gives `✓ preflight: …`. The guard is not wired into preflight yet.

---

### Task 3: The 13 plain confirm copies move to `CwrUI.confirm`

**Files:**
- Modify: `index.html` (remove the 13 `modal-container` blocks below, then sync), `assets/js/script.js`, `assets/js/agency-tools.js`
- Test: `scripts/test-admin-ui.mjs` (append), browser spot checks in `$SCRATCH/ui-migrate-check.cjs`

**Interfaces:**
- **Consumes:** `CwrUI.confirm` (Task 1).
- **The 13 copies:**
  - `delete-contact-confirm-modal`, `delete-dm-conversation-confirm-modal`, `delete-blog-confirm-modal`, `delete-portfolio-confirm-modal`, `delete-document-confirm-modal`, `delete-hub-confirm-modal`, `delete-maint-confirm-modal`, `delete-time-entry-confirm-modal`, `email-clear-day-confirm-modal`, `delete-lead-confirm-modal`, `cancel-booking-confirm-modal`, `delete-referral-confirm-modal`, `delete-testimonial-confirm-modal`
  - Each keeps its current title, sentence (including any dynamic text its open function sets) and button labels ("Delete", "Hide", "Cancel booking" / "Keep booking").
- **Kept as their own modals** (they get `data-layer="confirm"` in Task 5): `graduate-client-confirm-modal`, `portfolio-unsaved-confirm-modal`, `blog-unsaved-confirm-modal`.

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-admin-ui.mjs`:
- None of the 13 ids appear in `index.html`.
- `script.js` and `agency-tools.js` contain none of `openDeleteBlogConfirmModal`, `openDeleteContactConfirmModal`, `openDeleteDmConversationConfirmModal`, `openDeleteDocumentConfirmModal`, `openDeleteHubConfirmModal`, `openDeleteLeadConfirmModal`, `openDeleteMaintConfirmModal`, `openDeletePortfolioConfirmModal`, `openDeleteReferralConfirmModal`, `openDeleteTestimonialConfirmModal`, `openDeleteTimeEntryConfirmModal`, `openCancelBookingConfirmModal`, `openEmailClearDayConfirm`.
- `graduate-client-confirm-modal`, `portfolio-unsaved-confirm-modal` and `blog-unsaved-confirm-modal` are still in `index.html`.

Run: `node scripts/test-admin-ui.mjs | grep ✗`
Expected: the new lines fail.

- [ ] **Step 2: Migrate each copy**

For each copy:
- The trigger calls `CwrUI.confirm({ title, message, confirmLabel, cancelLabel, tone })` with that copy's texts.
- On `true`, it runs the existing handler body (guards, delete, re-render, notices). On `false`, nothing happens.
- Remove the copy's markup, its open/close/setup functions, its overlay and Escape listeners, and any `dataset.pending…` plumbing.
- Remove per-id CSS for the removed ids, in both `style.css` and `agency-tools.css`.
- Sync the shells.

- [ ] **Step 3: Browser spot checks (fakes only)**

`$SCRATCH/ui-migrate-check.cjs` stubs the data layer (fake `rtdb*`, `window.db` / `getDocs` / `deleteDoc` with an in-memory store), shows the admin panel, then for blog, portfolio, document, hub, lead, referral, time entry and testimonial (one delete each):
- Clicking delete shows `#cwr-dialog` with that area's title.
- Cancel leaves the store unchanged.
- Confirming removes the item.

Any area that can't be faked cheaply gets a note in the ledger and a code-read check instead.

Run: `node $SCRATCH/ui-migrate-check.cjs $SCRATCH`
Expected: all `✓`. Then `node scripts/test-admin-ui.mjs | grep -c ✗` gives `0`, and preflight passes.

---

### Task 4: Every browser popup in admin code moves to the kit

**Files:**
- Modify:
  - `assets/js/script.js` (incl. the 3 either/or confirms → `CwrUI.choose`)
  - `index.html` inline script
  - `assets/js/agency-tools.js`
  - `assets/js/post-builder/library.js`, `assets/js/post-builder/panel-slides.js`
  - `assets/js/blog-tiptap-editor.js`, `assets/js/outreach-composer.js`, `assets/js/prospects.js`, `assets/js/social-proof-admin.js`
- Test: `scripts/test-admin-ui.mjs` (append)

**Interfaces:**
- **Consumes:** `CwrUI.confirm`, `CwrUI.choose`, `CwrUI.prompt`, `CwrUI.toast` (Task 1).
- **The either/or confirms in `script.js`:**
  - **The "set up the client project" question** in the email compose flow (around line 22841): actions "Set up project" → `'setup'` / "Write anyway" → `'write'`. `null` does nothing.
  - **"Pick up the saved draft"** (around 22854): "Resume draft" → `'resume'` / "Start fresh" → `'fresh'`. `null` does nothing.
  - **`confirmAdminClientEmailOverwrite`** (around 13314): "Discard edits" → `'discard'` / "Keep editing" → `'keep'`. `null` is the same as `'keep'`.
  - Their sentences are rewritten so they no longer say "OK" or "Cancel".

- [ ] **Step 1: Write the failing test**

Append to `scripts/test-admin-ui.mjs`: for every file in `adminDialogFiles(root)`, `findNativeDialogs(source)` is empty. Report each failing file with its line numbers.

Run: `node scripts/test-admin-ui.mjs | grep ✗`
Expected: one failure line per file that still has popups.

- [ ] **Step 2: Migrate, file by file**

- **`confirm`:** becomes `await CwrUI.confirm(...)` (or `choose` for the three above). Make the enclosing function `async` where needed, and make sure its callers don't rely on a synchronous return. Where one does, the caller awaits it.
- **`alert`:** becomes `CwrUI.toast(msg, { tone })` using the tone rules. Validation returns stay where they are.
- **`prompt`:** becomes `await CwrUI.prompt(...)` with the same default value and the same handling of blank and cancel.
- **`social-proof-admin.js`:** its `global.confirm(confirmDeleteText(...))` becomes `CwrUI.confirm` with `title: 'Delete from social proof?'`, the same text as `message`, `confirmLabel: 'Delete'` and `tone: 'danger'`.
- **The browser checks** in `$SCRATCH/sp-admin-check.cjs` and `$SCRATCH/sp-tab-check.cjs` accept native dialogs today. Update them to click the `#cwr-dialog` action button instead.

- [ ] **Step 3: Run everything**

Run: `node scripts/test-admin-ui.mjs | grep -c ✗; for t in social-proof social-proof-rules social-proof-admin; do node scripts/test-$t.mjs | grep -c ✗; done; node scripts/preflight.mjs 2>&1 | tail -1`
Expected: `0` four times, then `✓ preflight: …`. Then run the social proof browser checks, plus the Task 1 and Task 3 checks: all `✓`.

---

### Task 5: Layers and floating buttons

**Files:**
- Modify:
  - `assets/css/style.css` (variables on `:root`, the layer rules at the end, the `[data-float]` rule; delete old z-index on in-scope overlay roots)
  - `assets/css/agency-tools.css` (delete the `body.admin-email-drawer-open > .tc-timer-chip …` hide list; chip and timer bar use `var(--z-float)`)
  - `assets/css/post-builder.css` (`.pb-editor` and `.pb-modal` use `var(--z-fullscreen)`)
  - `index.html` (`data-layer` / `data-float`; sync)
  - `assets/js/script.js` (`data-layer` on the overlays it builds)
  - `assets/js/blog-tiptap-editor.js`
  - `assets/js/admin-ui.js` (the `watchOverlays` body)
- Test: `scripts/test-admin-ui.mjs` (append), `$SCRATCH/ui-layers-check.cjs`

**Interfaces:**
- **Layer assignments:**
  - **drawer:** `tc-timer-drawer`, `tc-add-drawer`, `cp-client-drawer`, `lead-detail-drawer`, `admin-contact-detail`, `admin-testimonial-detail`, `ops-doc-sheet-root`, and the email drawer `script.js` builds (`.admin-email-drawer`)
  - **modal:** `admin-client-email-preview-modal`, `admin-testimonial-request-modal`, `admin-login-modal`, `reply-modal`, `lead-modal`, `social-proof-modal`, `business-doc-modal`, `add-blog-modal`, `edit-blog-modal`, `portfolio-project-modal`, `template-matcher-modal`, `new-client-modal`, `project-hub-editor-modal`, `case-study-modal`, `maintenance-editor-modal`, `content-repurpose-modal`, `referral-editor-modal`, `studio-cost-editor-modal`, `studio-cost-paid-modal`, `ops-doc-editor-modal`, and `reschedule-booking-modal` (built by `script.js`)
  - **modal-raised:** `snippet-edit-modal`, and `.blog-tiptap-image-modal` (built by `blog-tiptap-editor.js`)
  - **confirm:** `admin-email-reply-confirm-modal`, `admin-client-email-sent-modal`, `graduate-client-confirm-modal`, `portfolio-unsaved-confirm-modal`, `blog-unsaved-confirm-modal`
  - **Rule:** if code reading shows an overlay opening from inside a same-layer parent, move it up one layer and note it in the ledger.
- **`data-float`:** the timer chip (`#tc-timer-chip`) and the mobile timer bar (`.tc-timer-bar`), plus any other fixed admin button found while editing.
- **`watchOverlays()`:**
  - Starts once `body.admin-page-active` exists, checked at load and on `body` class changes.
  - Then observes `document.body` (subtree; `class`, `style`, `hidden`, `aria-hidden`; added/removed nodes), checking at most once per animation frame.
  - It sets `body.cwr-overlay-open` when any `[data-layer]` element is visible: not `display: none`, `visibility: hidden`, `hidden` or `aria-hidden="true"`, `opacity` not 0, and a non-zero size.
  - `script.js` calls `CwrUI.watchOverlays()` once at startup.

- [ ] **Step 1: Write the failing tests**

Append to `scripts/test-admin-ui.mjs`:
- Every id listed above appears in `index.html` with the matching `data-layer`. The script-built ones are covered by a `data-layer` assignment next to their creation in the source (`script.js` for the email drawer and reschedule popup, `blog-tiptap-editor.js` for the image modal).
- `style.css` `:root` declares the 7 variables with the values in Global Constraints, and `--z-confirm` is greater than every numeric `z-index` in `post-builder.css` and greater than 99999.
- `style.css` has `body [data-layer="drawer"]`, `="modal"`, `="modal-raised"` and `="confirm"` rules using the variables, plus `body.cwr-overlay-open [data-float]` with `visibility: hidden` and `pointer-events: none`.
- `agency-tools.css` no longer contains `body.admin-email-drawer-open > .tc-timer-chip`.
- `#tc-timer-chip` has `data-float` in `index.html`.

`$SCRATCH/ui-layers-check.cjs` (WebKit, fakes, admin panel shown) checks:
- Opening `#lead-detail-drawer` makes the chip `visibility: hidden`.
- With the drawer open, `CwrUI.confirm` puts `#cwr-dialog` on top (`elementFromPoint` at the dialog center is inside it). Closing the confirm leaves the chip hidden, and closing the drawer brings it back.
- `CwrUI.toast` while `#business-doc-modal` is open is on top at its center.
- `#portfolio-project-modal` opened over `#cp-client-drawer` is on top of it.

Run both. Expected: FAIL.

- [ ] **Step 2: Implement the variables, rules, attributes and watcher; remove the old numbers and the timer hide list; sync**

- [ ] **Step 3: Run everything**

Run: `node scripts/test-admin-ui.mjs | grep -c ✗; node scripts/preflight.mjs 2>&1 | tail -1; node $SCRATCH/ui-layers-check.cjs $SCRATCH`
Expected: `0`, `✓ preflight: …`, and all `✓`. Re-run every earlier browser check (`ui-kit-check`, `ui-migrate-check`, `sp-home-check`, `sp-admin-check`, `sp-admin-fixes`, `sp-tab-check`): all `✓`.

---

### Task 6: The guard runs on every push

**Files:**
- Modify: `scripts/preflight.mjs`

- [ ] **Step 1:** In `preflight.mjs`, add a check that imports `findNativeDialogs` and `adminDialogFiles` and fails with `file:line call` when any are found. Put it next to the other checks, in the same output style.
- [ ] **Step 2:** Prove it fails. Temporarily add `alert('x');` to `assets/js/prospects.js` and run `node scripts/preflight.mjs 2>&1 | tail -3`. Expected: a failure naming `assets/js/prospects.js:<line> alert`. Then remove the line.
- [ ] **Step 3:** Run `node scripts/preflight.mjs 2>&1 | tail -1`. Expected: `✓ preflight: …`.
- [ ] **Step 4: Hand-off.** Tell Ruben which files changed, that nothing needs a deploy, and that the client portal and booking page are next round.
