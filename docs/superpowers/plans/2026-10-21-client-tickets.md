# Client Tickets (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let CWR open tickets for clients from admin, one question at a time. Record the write-up (found / fixed / how to check), private debug notes, screenshots and linked planner hours on each ticket. Clients see the write-up in their portal and answer "Looks good" or "Still not working".

**Architecture:**
- Pure ticket rules live in a new shared file, `assets/js/ticket-shared.js` (`window.CwrTickets`). The admin and portal UIs both use it, and Node tests cover it.
- The server allow-lists what the portal sees (`publicTicket`) and adds one write action (`replyTicket`).
- Private notes and screenshots go in new admin-only paths that `portalApi` never reads.

**Tech Stack:** Plain browser JS (ES5 style, IIFEs), Firebase RTDB + Storage (web SDK v10 globals on `window`), Cloud Functions (Node, `functions/portal-api.js`), Node test scripts (`node scripts/test-*.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-21-client-tickets-design.md`

## Global Constraints

- Ruben makes all commits. **Never run `git commit` or `git push`**, and skip every commit step.
- **Never run `firebase deploy`.** Ruben runs `firebase deploy --only functions,database,storage` himself, before he pushes.
- Admin popups only go through `window.CwrUI`. Never use `confirm()`, `alert()` or `prompt()` (preflight fails on them).
- New overlays get `data-layer="modal"` and no `z-index`.
- `portal.html` doesn't load `style.css` or ionicons, so portal markup uses inline SVG and `client-portal.css`.
- Any `?v=` change in `index.html` must be followed by `node scripts/sync-spa-shells.mjs`. Preflight checks all 20 shells.
- Status keys are `open`, `in-progress`, `check` and `resolved`. Labels are `Open`, `In progress`, `Ready for you to check` and `Resolved`.
- Reply time when something is down: essential `Reply within 1 business day`, standard `Reply within 4 hours`, priority `Reply within 2 hours`.
- Text limits: title 120, area 60, details 1200, found / fixed / howToCheck 2000, debugNotes 4000, client reply note 1200.

## Review Focus

1. A ticket saved with **Print the write-up** switched off must never send `found`, `fixed` or `howToCheck` to the portal, including in the raw `load` payload. Task 2 has the test.
2. A client tapping "Looks good" twice, or on a ticket that's no longer `check`, must get a 409, not a double change. Task 2 has the test.
3. Old tickets (no `source`, `kind` or `down`, possibly stored as plain strings) must still render in both lists. Task 1 tests `normalizeTicket('plain string')` and `normalizeTicket({})`.
4. Admin saves address tickets by `ref`. Deleting ticket #1 while #3's panel is open must not save #3's work onto #2. Task 1 tests `findTicketIndex`, and Task 4 uses it for every write.
5. When the private-notes or screenshot write fails because the rules aren't deployed yet, the ticket still saves and a toast names the missing deploy. Task 4 has the manual check.

---

### Task 1: Shared ticket rules (`ticket-shared.js`)

**Files:**
- Create: `assets/js/ticket-shared.js`, using the same IIFE and export idiom as `assets/js/social-proof.js`
- Test: `scripts/test-tickets.mjs` (new; `require('../assets/js/ticket-shared.js')`)

**Interfaces (Produces; `window.CwrTickets` in the browser, `module.exports` in Node):**
- `STATUSES: string[]`, `statusKey(v) → string`, `statusLabel(v) → string`, `nextStatus(v) → { key, label }`
- `SOURCES: {key,label}[]` with keys `text`, `email`, `call`, `in-person`, `portal`; `sourceKey(v)` (default `portal`); `sourceLabel(v)`
- `KINDS: {key,label}[]` = bug / Bug fix, change / Change request, question / Question; `kindKey(v)` returns `''` when unknown; `kindLabel(v)`
- `AREAS: string[]`, moved from `client-portal.js` `TICKET_AREAS` with the same 7 values
- `slaWords(hours, fallback) → string`, which is today's logic (copied from `maintSlaWords` and `ticketSlaWords`)
- `responseWords(ticket, maint, fallback) → string`
- `makeRef(maint, existing) → string`, moved from `client-portal.js` (`ticketClientTag` + `makeTicketRef`), with identical output
- `normalizeTicket(raw) → { ref, title, area, details, status, createdAt, source, kind, down, found, fixed, howToCheck, shareWriteup, clientReply, loggedAt, resolvedAt, updatedAt }`
- `listRows(tickets) → normalized tickets each with an original index `i`, unresolved first, then newest `createdAt` first`
- `findTicketIndex(tickets, ref) → number` (-1 when missing)
- `writeupSections(t, { includeReport }) → { label, text }[]`, non-empty only, in this order: `You told us` (details, only when `includeReport`), `What we found`, `What we fixed`, `How to check it`
- `ticketHours(entries, maintId, ref) → number`, the sum of `loggedHours` over `kind==='maint'` entries matching both ids, rounded to 0.1 like `roundHours`

- [ ] **Step 1: Write the failing tests in `scripts/test-tickets.mjs`.** They use the `ok(cond, msg)` style of the other test scripts.
  - `statusKey('done') === 'resolved'`, `statusKey('progress') === 'in-progress'`, `statusKey('check') === 'check'`, `statusKey(undefined) === 'open'`
  - `statusLabel('check') === 'Ready for you to check'`
  - `nextStatus` maps open → `{in-progress,'Start'}`, in-progress → `{check,'Ready to check'}`, check → `{resolved,'Resolve'}`, resolved → `{open,'Reopen'}`
  - `sourceKey('') === 'portal'`, `sourceLabel('in-person') === 'In person'`, `kindKey('nope') === ''`, `kindLabel('bug') === 'Bug fix'`
  - `slaWords(48) === 'Reply within 2 business days'`, `slaWords(3) === 'Reply within 3 business hours'`, `slaWords(0, 'X') === 'X'`
  - `responseWords({down:true}, {planTier:'standard', slaHours:48}) === 'Reply within 4 hours'`; `responseWords({down:false}, {planTier:'standard', slaHours:48}) === 'Reply within 2 business days'`
  - `makeRef({clientName:'Pro Cleaning'}, [{ref:'CWR-PRC-003'}]) === 'CWR-PRC-004'` (same as the server's `makeTicketRef`; the test also requires `functions/portal-api.js` and compares the two over 3 names, including the empty one)
  - `normalizeTicket('Old string').title === 'Old string'` and its `status === 'open'`; `normalizeTicket({}).shareWriteup === true`; `normalizeTicket({shareWriteup:false}).shareWriteup === false`; title is clamped to 120 characters
  - `listRows` puts a resolved ticket after an open one even when the resolved one is newer, and keeps the original `i`
  - `findTicketIndex([{ref:'A'},{ref:'B'}], 'B') === 1`, and `=== -1` for `'Z'`
  - `writeupSections({details:'d', found:'f', howToCheck:''}, {includeReport:true})` gives the labels `['You told us','What we found']`
  - `ticketHours([{kind:'maint',maintenanceId:'M',ticketRef:'R',loggedHours:1.25},{kind:'maint',maintenanceId:'M',ticketRef:'R',loggedHours:0.3},{kind:'maint',maintenanceId:'M',ticketRef:'X',loggedHours:5},{kind:'build',maintenanceId:'M',ticketRef:'R',loggedHours:9}], 'M', 'R') === 1.6`
- [ ] **Step 2:** Run `node scripts/test-tickets.mjs` and expect it to fail with `Cannot find module`.
- [ ] **Step 3:** Implement `assets/js/ticket-shared.js`.
- [ ] **Step 4:** Run `node scripts/test-tickets.mjs` and expect all ✓.

### Task 2: Server: what the portal sees, plus `replyTicket`

**Files:**
- Modify: `functions/portal-api.js` (header doc comment, `load`, `submitTicket`, new `replyTicket`, exports)
- Test: `scripts/test-portal-api.mjs` (extend)

**Interfaces (Produces):** `publicTicket(t) → object`, `publicMaintenance(m) → object` (both exported). Action `replyTicket { token, ref, verdict: 'ok'|'not-working', note }` → `{ ticket }`, where the ticket has gone through `publicTicket`.

- [ ] **Step 1: Add the failing tests.** Seed `MA.tickets` with:
  - `{ref:'CWR-SHS-004', status:'check', found:'f', fixed:'x', howToCheck:'h', shareWriteup:true}`
  - `{ref:'CWR-SHS-003', status:'check', found:'secret-f', shareWriteup:false, debugNotes:'leak?'}`
  - Seed `MA.notes = 'admin only'`.

  Assert:
  - The `load` payload string contains neither `secret-f`, `leak?` nor `admin only`, while ticket 004 still has `found === 'f'`.
  - `submitTicket` stores `source === 'portal'` and a `loggedAt` string.
  - `replyTicket` with `ok` on 004 sets the stored status to `resolved`, sets `resolvedAt`, and sets `clientReply.verdict` to `'ok'`. A second identical call fails with a 409.
  - `replyTicket` with `not-working` and a note on 003 sets the status to `in-progress` and stores `clientReply.note`.
  - An unknown ref gives a 404, a bad verdict gives a 400, and token TB (Pro Cleaning) replying to `CWR-SHS-004` gives a 404 and leaves MA untouched.
- [ ] **Step 2:** Run `node scripts/test-portal-api.mjs` and expect the new lines to show ✗.
- [ ] **Step 3: Implement.**
  - `publicTicket` allow-lists `ref, title, area, details, status, createdAt, source, kind, down, resolvedAt, clientReply`, and adds `found, fixed, howToCheck` only when `shareWriteup !== false`. A string ticket becomes `{ title }`.
  - `publicMaintenance` copies the row, deletes `notes`, and maps `tickets`. `load` returns `[publicMaintenance(maint)]`.
  - `replyTicket` runs a `transaction` on `agencyMaintenance/{id}/tickets`. Inside, it finds the ref. If the ref is missing, the transaction aborts and the action throws 404. If the status isn't `check`, it throws 409. It sets `status`, `clientReply: { verdict, note: str(note, 1200), at: ISO }` and `updatedAt`, plus `resolvedAt` on `ok`. Then it sets the maintenance `updatedAt`.
  - Errors decided inside the transaction callback go into an outer variable and are thrown after the transaction. Return `undefined` from the callback to abort.
- [ ] **Step 4:** Run `node scripts/test-portal-api.mjs` and expect all ✓.

### Task 3: Rules for private notes and screenshots

**Files:**
- Modify: `database.rules.json` (add `agencyTicketNotes`, with the same `.read` and `.write` strings as `agencyMaintenance`)
- Modify: `storage.rules` (add `match /ticketFiles/{maintId}/{ref}/{fileName}`: read and delete if `isPortfolioAdmin()`, write if admin, `size < 12 * 1024 * 1024` and `contentType.matches('image/.*')`)
- Test: `scripts/test-ticket-rules.mjs` (new, static, in the style of `test-social-proof-rules.mjs`)

- [ ] **Step 1:** Write tests asserting:
  - `rules.agencyTicketNotes['.read'] === rules.agencyMaintenance['.read']`, and the same for `.write`
  - `storage.rules` text contains `match /ticketFiles/{maintId}/{ref}/{fileName}`, and that block contains `isPortfolioAdmin()`, `12 * 1024 * 1024` and `image/.*`, and no `if true`
- [ ] **Step 2:** Run it and expect ✗.
- [ ] **Step 3:** Edit both rules files.
- [ ] **Step 4:** Run it and expect ✓.
- [ ] **Step 5:** Add a ticket line under **Deploy order** in `~/Dev/Apps/blueprints/portfolio-security.md`, in the same style as the social-proof note: `functions,database,storage` before pushing, and what fails until then.

### Task 4: Admin: ticket list, full ticket, new-ticket flow

**Files:**
- Modify: `assets/js/agency-tools.js`:
  - the ticket section around lines 6761–6980: `ticketStatusLabel`, `ticketStatusKey`, `openTicketViewer`, `closeTicketViewer`, `updateMaintTicket`, `maintTicketsHtml`
  - the action delegation around 6254–6266
  - the Escape handling around 6480–6495
  - `normalizeTimeEntry` around 6983 (keep `ticketRef`)
  - `PATHS` (add `ticketNotes: 'agencyTicketNotes'`)
- Modify: `assets/css/agency-tools.css` (ticket block around lines 4859–5155)

**Interfaces:**
- Consumes `window.CwrTickets` (Task 1). Every status, label, ref, sort, response line and hours value comes from it. Delete the local `ticketStatusLabel` and `ticketStatusKey` and call `CwrTickets` instead.
- Produces these internal functions in `agency-tools.js`:
  - `openTicketWizard(maintId)`
  - `openTicketDetail(maintId, ref)` (replaces `openTicketViewer`)
  - `saveTicketDetail(maintId, ref) → Promise`
  - `writeTicketSlot(maintId, ref, patch) → Promise<ticket|null>`: re-reads, finds by ref, then `rtdbSet` on `.../tickets/{i}` only
  - `createTicket(maintId, fields, files) → Promise<ticket>`: re-reads, `makeRef`, `rtdbSet` on `.../tickets/{length}`, then uploads files
  - `deleteTicket(maintId, ref)`: confirms through CwrUI, then removes the slot (re-read, splice, set the `tickets` array), the `agencyTicketNotes/{maintId}/{ref}` entry, and the Storage files listed in the notes

- [ ] **Step 1: Drawer list (`maintTicketsHtml`).**
  - The header gets a `+ New ticket` button (`data-cp-action="ticket-new"`), and the empty state says `No tickets yet.` with the same button.
  - Rows come from `CwrTickets.listRows`.
  - Each stub adds a `Via` row when the source isn't `portal`, and uses `responseWords(t, m, 'No response time set')`.
  - The status button uses `nextStatus`, with `data-ticket-ref` in place of the index.
  - Add the CSS class `cp-ticket-status--check { color: hsl(265, 55%, 42%); }`.
- [ ] **Step 2: Full ticket (`openTicketDetail`).**
  - Reuse the `#cp-ticket-viewer` root, now with `data-layer="modal"`, and remove `z-index: 10120` from `.cp-ticket-viewer`.
  - Inner layout is a grid: the `cp-ticket-receipt--full` stub on the left and a `cp-ticket-work` panel on the right, stacking under 860px.
  - The stub's meta rows are Area, Kind, Opened (`createdAt` date, plus ` · via X` when not from the portal), Status, Response and Time. Below a rule come the `writeupSections(t, {includeReport:true})` blocks.
  - The panel holds:
    - textareas `found`, `fixed` and `howToCheck`
    - a dashed `debugNotes` box, loaded from `agencyTicketNotes`
    - a screenshot list and add button (`input type=file accept="image/*" multiple`)
    - status chips
    - the Time line with a **Link planner time** toggle that expands a checkbox list: this plan's `kind==='maint'` entries from the last 90 days, plus any older entry already linked; each shows its date, hours, and `on CWR-…` when linked elsewhere
    - the `shareWriteup` switch
    - the client's last reply, when there is one
    - Save and Close buttons
  - Typing in the panel re-renders the stub's write-up live.
- [ ] **Step 3: Save (`saveTicketDetail`).**
  - Write the slot with `writeTicketSlot`, setting `resolvedAt` when the new status is `resolved` and clearing it otherwise.
  - Then `rtdbUpdate` `agencyTicketNotes/{maintId}/{ref}` with `{ debugNotes, updatedAt }`.
  - Then update each changed time entry's `ticketRef` (set it, or set it to `null` to unlink), using `rtdbUpdate` on `agencyTimeEntries/{id}`.
  - If the notes or time write throws `PERMISSION_DENIED`, show `CwrUI.toast('Ticket saved. Debug notes need the database rules deployed (firebase deploy --only database).', { tone: 'warn' })`.
  - Uploads go to `ticketFiles/{maintId}/{ref}/{Date.now()}-{safeName}` and record `{path, url, name, contentType, size, addedAt}` under `files/{pushKey}`. A failure shows a toast naming `--only storage`.
- [ ] **Step 4: New-ticket flow (`openTicketWizard`).** This is a new root, `#cp-ticket-wizard` with `data-layer="modal"`. It shows one step at a time and keeps its state in a closure object. The steps and copy are in the spec under "New-ticket flow".
  - Enter advances on inputs. In the textarea, Enter adds a new line and the button advances.
  - Back keeps the values.
  - Title is required. Step 4's Next is disabled until it's filled.
  - Esc or the close button asks `CwrUI.confirm({ title: 'Discard this ticket?', confirmLabel: 'Discard', tone: 'danger' })` when anything has been entered.
  - Step 2 uses `<input type="datetime-local">` with now as the default. Its value is stored as an ISO string in `createdAt`.
  - **Print ticket** calls `createTicket`. It then shows the printer: port `.portal-printer*` and `.portal-receipt*` from `client-portal.css` lines 3106–3360 as `.cp-printer*`, using the stub's `cp-ticket-*` classes, and copy the phase timings from `printTicketReceipt`. The stub carries Area, Opened, Via and Response.
  - Then show **Open ticket**, which calls `openTicketDetail`.
- [ ] **Step 5:** Wire the actions `ticket-new`, `ticket-open` (now by ref), `ticket-status` (by ref) and `ticket-delete` (by ref) in the delegation block. Escape closes the wizard first, then the detail view.
- [ ] **Step 6:** Run `node --check assets/js/agency-tools.js`, `node scripts/test-admin-ui.mjs` and `node scripts/test-tickets.mjs`, and expect all to pass.

### Task 5: Portal: list, full receipt, reply

**Files:**
- Modify: `assets/js/client-portal.js`:
  - `normalizeMaintenanceRecord` (keep `tickets` as an array; this fixes the list never showing)
  - the ticket helpers at 340–475 (replace with `CwrTickets`; `TICKET_AREAS` becomes `CwrTickets.AREAS`)
  - `renderTicketHistoryHtml`
  - the sheet functions at 2690–2740
  - the click delegation in `bindTicketSheet`
- Modify: `assets/css/client-portal.css` (history badge `--check`, the `1 to check` pill, receipt write-up sections, reply buttons)
- Modify: `portal.html` (add `<script src="/assets/js/ticket-shared.js?v=tickets-20261021"></script>` before `client-portal.js`)

- [ ] **Step 1: History list.**
  - Each `<li>` becomes a `<button type="button" class="portal-ticket-history-item…" data-portal-ticket-view="REF">`.
  - Add a `portal-ticket-history-badge--check` badge.
  - The header gets a `N to check` pill when N > 0.
- [ ] **Step 2: `openTicketView(maint, ref, opener)`.**
  - It reuses the ticket sheet root, with the title set to the ticket ref.
  - The body is the `portal-receipt` stub, with meta Area, Opened, Status and Response, then `writeupSections(t, {includeReport:true})`.
  - When status is `check`, it shows **Looks good** and **Still not working** (`btn btn-primary btn-sm` / `btn btn-secondary btn-sm`).
  - "Still not working" reveals a textarea (`maxlength=1200`) and a **Send** button.
  - Both call `portalApi('replyTicket', { ref, verdict, note })`. On success, update the ticket in the cached maintenance, re-render the history, and show `Thanks — we’ve marked it done.` or `Got it — we’re back on it.` On error, show the error message in a feedback line.
  - The sheet title resets to `Need something fixed?` when the report form opens.
- [ ] **Step 3:** Run `node --check assets/js/client-portal.js` and expect it to pass.

### Task 6: Wiring, cache busters, full check

**Files:** `index.html` (CLASSIC list and `agency-tools.css` link), all shells (via the sync script), `portal.html`

- [ ] **Step 1:** In `index.html`:
  - Add `{ src: '/assets/js/ticket-shared.js?v=tickets-20261021' }` to `CLASSIC` right before `agency-tools.js`.
  - Bump `agency-tools.js` and `agency-tools.css` to `?v=tickets-20261021`.
- [ ] **Step 2:** In `portal.html`, bump `client-portal.js` and `client-portal.css` to `?v=tickets-20261021`.
- [ ] **Step 3:** Run `node scripts/sync-spa-shells.mjs`. Then `grep -rl "agency-tools.js?v=tickets-20261021" --include="*.html" . | grep -v _site | wc -l` must equal the shell count (20).
- [ ] **Step 4:** Run `node scripts/preflight.mjs` and expect exit code 0.
- [ ] **Step 5: Visual check.** Write a scratchpad harness page. It loads `assets/css/style.css`, `agency-tools.css`, `client-portal.css` and `ticket-shared.js`, and renders the admin stub list, full ticket, wizard step and portal receipt from fixture tickets (call the render functions through a test hook, or copy the produced HTML). Serve it with `python3 -m http.server` and screenshot it with Playwright at 1280px and 390px.
