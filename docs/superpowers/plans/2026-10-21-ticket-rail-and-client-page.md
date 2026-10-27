# Ticket Rail + Live-Client Full Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An admin **Tickets** tab: one queue of every open ticket across all care plans. It orders itself by the plan promises, accepts drag overrides, puts one ticket "on the pass", and sends Start-timer hours to that ticket. After that, live clients (`deliveryStage === 'client'`) open as a full page (layout B: header, summary strip, tabs) instead of the drawer.

**Architecture:**
- **Pure queue math** (deadlines, automatic order, merging in manual order, the time-entry merge key) goes in the existing `assets/js/ticket-shared.js` (`window.CwrTickets`), tested in Node.
- **The rail UI** is a new admin-only script, `assets/js/ticket-rail.js` (`window.CwrTicketRail`). It reads agency data and calls the ticket and timer functions through new `window.AgencyTools` methods.
- **The full page** reuses the drawer element and its renderer in a "page mode". The drawer moves into the Clients panel, shows one section at a time at every width, and gets a header, a summary strip and a full tab bar. All IDs, actions and save functions stay as they are.

**Tech Stack:** Plain ES5-style browser JS, Firebase RTDB (web SDK globals on `window`), Node test scripts (`node scripts/test-*.mjs`), Playwright for checking the in-memory harness.

**Spec:** `docs/superpowers/specs/2026-10-21-ticket-rail-and-client-page-design.md`. The earlier ticket work is in `docs/superpowers/specs/2026-10-21-client-tickets-design.md`.

## Global Constraints

- Ruben makes all commits. **Never run `git commit`, `git push` or `firebase deploy`.** Skip every commit step.
- Admin popups only go through `window.CwrUI` (preflight fails on `confirm`, `alert` and `prompt`). New overlays get `data-layer` and no z-index.
- Markup or `?v=` changes go in `index.html`, then run `node scripts/sync-spa-shells.mjs`. Preflight checks all shells.
- `script.js` is loaded on every page. Any edit to it means bumping its `?v=` in `index.html` and syncing the shells.
- The new admin-only script goes in `loadAdminBundle`'s `CLASSIC` list, not in a `<script>` tag. Public code must `typeof`-guard admin globals.
- The cache-buster for this work is `?v=rail-20261021`.
- **Queue order:**
  1. down first
  2. tier: priority=0, standard=1, essential=2, anything else=3
  3. deadline ascending, with no deadline last
  4. `createdAt` ascending
- **Business time:** Mon–Fri, 09:00–17:00, `America/Los_Angeles`, no holidays.
- **Deadlines when down:** priority = 2 clock hours, standard = 4 clock hours, essential = 1 business day.
- **1 business day = 8 business hours.** Starts outside business time roll to the next business moment first.
- **Deadlines when not down:**
  - `slaHours` < 24 means that many business hours.
  - A multiple of 24 means `slaHours/24` business days.
  - Any other value means that many clock hours.
  - 0 or missing means no deadline.
- **Queue keys** are `"{maintId}/{ref}"`. The path is `agencyTicketQueue = { order: string[], now: string|null, updatedAt }`, admin-only.

## Review Focus

1. **Deadlines across a weekend or after hours.** A ticket logged Friday 16:00 Pacific with a 3 business-hour SLA is due Monday 11:00. One logged Saturday with a 2 business-day SLA is due Tuesday 17:00. Task 1 tests both.
2. **A new down ticket after Ruben has dragged the queue** must still land at the top. Task 1 tests `mergeOrder` with a saved order that lacks the new key.
3. **Two tickets for one client timed on the same day** must stay two time entries with different `ticketRef`s, and untagged timer hours must still merge as today. Task 1 tests `sameLogBucket`, and Task 3 uses it.
4. **The pass pointing at a ticket that was resolved, marked check, or deleted** must clear itself and not break the render. Task 5 tests this in the harness.
5. **Page mode must not change demo or converting clients.** They open in the drawer exactly as before, and leaving page mode returns the drawer element to `<body>`. Task 7 tests this in the harness.

---

### Task 1: Queue math in `ticket-shared.js`

**Files:**
- Modify: `assets/js/ticket-shared.js` (new functions, exported on `api`)
- Test: `scripts/test-tickets.mjs` (add a block)

**Produces** (on `window.CwrTickets` and `module.exports`):
- `tierRank(tier) → 0|1|2|3`
- `dueAt(ticket, maint) → number|null`, epoch ms. `ticket.createdAt` is an ISO string, and `maint` is `{ planTier, slaHours }`.
- `dueWords(dueMs, nowMs) → string`. Gives `'in 45 min'`, `'in 2 hrs'`, `'in 3 days'`, `'Overdue 1 hr'`, `'Overdue 2 days'`, or `'—'` for null. Rounding: under 60 min shows minutes, under 48 h shows whole hours, otherwise whole days, always rounded up for "in" and down for "Overdue".
- `queueKey(maintId, ref) → string`
- `autoOrder(items) → items sorted`. Each item is `{ key, ticket (normalized), maint, due }`.
- `mergeOrder(autoSorted, savedKeys) → items`. This is the slot algorithm from the spec: the positions that saved keys hold in the automatic order are refilled with those items in saved order, and unknown keys are ignored.
- `sameLogBucket(entry, opts) → boolean`. True when `entry.date === opts.date`, the kinds match, and the id for that kind matches (projectId for build, maintenanceId for maint, customKey for custom). For maint, `String(entry.ticketRef||'') === String(opts.ticketRef||'')` must also hold.

- [ ] **Step 1: Write failing tests.** Use real Pacific times, built with `Date.UTC`. PDT is UTC−7 and PST is UTC−8, so pick October dates (PDT).
  - **Clock hours when down:** `dueAt({createdAt:'2026-10-23T23:00:00Z' /*Fri 16:00 PDT*/, down:true}, {planTier:'priority', slaHours:3})` equals created + 2 h, and the standard tier gives + 4 h.
  - **Essential down:** Fri 16:00 PDT gives Mon 16:00 PDT (`'2026-10-26T23:00:00Z'`).
  - **Business hours:** not down with `slaHours:3`, Fri 16:00 PDT gives Mon 11:00 PDT (`'2026-10-26T18:00:00Z'`).
  - **Business days:** not down with `slaHours:48`, Sat `'2026-10-24T18:00:00Z'` gives Tue 17:00 PDT (`'2026-10-28T00:00:00Z'`). The rule: **N business days = N × 8 business hours.** A start on a weekend or after hours first rolls to the next business moment (Mon 09:00). For a start during business hours this lands at the same clock time N weekdays later.
  - **Odd hours:** `slaHours:30` gives created + 30 clock hours.
  - **No deadline:** `slaHours:0` gives `null`.
  - **`dueWords`:** `dueWords(now+2*3600e3, now)==='in 2 hrs'`, `dueWords(now-3600e3, now)==='Overdue 1 hr'`, `dueWords(now+3*86400e3, now)==='in 3 days'`, `dueWords(null)==='—'`.
  - **`autoOrder`:** a down Essential ticket beats a Priority one. Priority beats Standard even when Standard's deadline is sooner. With equal tier and down-state, the earlier deadline wins. A null deadline goes last within its tier.
  - **`mergeOrder`:** with automatic order `[A,B,C,D]` and saved `['M/C','M/A']`, the result is `[C,B,A,D]`. A new down item X with automatic order `[X,A,B,C]` and saved `['M/B','M/A']` gives `[X,B,A,C]`. Saved keys that aren't present are ignored.
  - **`sameLogBucket`:**
    - matches when date, maint and ticketRef are the same
    - false when the ticketRef differs (`'CWR-PRO-004'` vs `'CWR-PRO-005'`)
    - entry `{ticketRef:''}` and opts with no ticketRef match (today's behavior)
    - build entries ignore ticketRef
- [ ] **Step 2:** Run `node scripts/test-tickets.mjs`. Expect ✗ on the new lines with `T.dueAt is not a function`.
- [ ] **Step 3:** Implement. Do business-time math in Pacific wall-clock time: convert with `Intl.DateTimeFormat('en-US', { timeZone:'America/Los_Angeles', ... })` parts, step through business days and hours, and convert back by finding the offset for that date. Keep it a small helper, `pacificParts(ms)`, plus `fromPacific(y,m,d,h,mi)`.
- [ ] **Step 4:** Run `node scripts/test-tickets.mjs`. Expect all ✓.

### Task 2: `agencyTicketQueue` rule

**Files:** `database.rules.json`, `scripts/test-ticket-rules.mjs`, `~/Dev/Apps/blueprints/portfolio-security.md`

- [ ] **Step 1:** Add tests: `rules.agencyTicketQueue['.read'] === rules.agencyMaintenance['.read']`, and the same for `.write`. Run them and expect ✗.
- [ ] **Step 2:** Add the node after `agencyTicketNotes`, using the same admin strings.
- [ ] **Step 3:** Run `node scripts/test-ticket-rules.mjs` and expect all ✓. In the security doc, add `agencyTicketQueue` to the ticket row of the path table, and append to the 2026-10-21 deploy note: "The ticket rail (agencyTicketQueue) needs `--only database` before its push. Until then the rail shows the automatic order, and dragging or the pass shows a toast naming the deploy."

### Task 3: Timer carries a ticket

**Files:** `assets/js/agency-tools.js`:
- `cloneTcSegments` around line 8181
- `persistTcTimerState` / `loadPersistedTcTimer`, 8191–8245
- `resetTcTimerState` / `pushCurrentSegment`, 9095–9125
- `quickStartTcTimer`, 9127
- `switchTcFocusFromChip`, 9149
- `commitTcFocusLog`, 9178
- `logTcTimerReviewSegments`, 9330
- `addLoggedHoursForToday`, around 8669
- review-list rendering (where `tcTimerReviewSegments` rows are drawn)

**Produces:**
- `tcTimerState.ticketRef: string`, and each segment `{ target, clientName, ticketRef, ms }`
- `startTicketTimer(maintId, ref)` (internal, exposed in Task 4)
- `timerTicket() → { maintId, ref, status } | null`

- [ ] **Step 1:** Thread `ticketRef` through state, clone, persist and load, push, and reset, with `''` as the default.
- [ ] **Step 2:** `addLoggedHoursForToday(opts)` takes `opts.ticketRef`. Its duplicate lookup becomes `agencyTimeEntries.find(e => CwrTickets.sameLogBucket(e, {date, kind, projectId, maintenanceId, customKey, ticketRef}))`, and a new entry's payload includes `ticketRef: opts.ticketRef || ''`. `commitTcFocusLog` passes `tcTimerState.ticketRef`, and `logTcTimerReviewSegments` passes `seg.ticketRef`. Notes become `'Focus · {duration}' + (ticketRef ? ' · ' + ticketRef : '')`.
- [ ] **Step 3:** Pull the body of `switchTcFocusFromChip` that runs after the target is resolved into `switchTcFocus(target, clientName, ticketRef)`, and keep the chip calling it. Then `startTicketTimer(maintId, ref)`:
  - **Timer idle:** `quickStartTcTimer('maint:' + maintId)`, then set `tcTimerState.ticketRef = ref` and persist.
  - **Running or paused on another target or ticket:** call `switchTcFocus('maint:' + maintId, clientName, ref)`.
  - **Already on this ticket:** do nothing.

  The toast reads `'Timer started for {client} · {ref}.'`.
- [ ] **Step 4:** Each segment in the review list shows `· {ref}` after the client name, and the running chip label shows the ref when one is set.
- [ ] **Step 5:** Run `node --check assets/js/agency-tools.js && node scripts/test-tickets.mjs && node scripts/test-admin-ui.mjs`. Expect all to pass.

### Task 4: `AgencyTools` bridge

**Files:** `assets/js/agency-tools.js`:
- the `window.AgencyTools` object around line 10078
- the snapshot handlers (`applyTimeEntriesFromVal`, plus the maintenance and projects `rtdbOnValue` callbacks in `subscribeAgencyData`)

**Produces** on `window.AgencyTools`:
- `getMaintenance() → array` (shallow copies of the normalized rows)
- `getTimeEntries() → array`
- `getHub(projectId) → hub|null`
- `onAgencyData(cb) → unsubscribe`, where `cb()` is called after any maintenance, time-entry or projects snapshot is applied
- `openTicketDetail(maintId, ref)`
- `ticketStubHtml(t, m, opts)`. Its `opts.rail` adds the rows Client, Plan, Kind, Due (with `opts.due` / `opts.dueLate`) and Status, and drops Area, Opened, Via and Response, to match the spec's stub contents.
- `setTicketStatus(maintId, ref, status) → Promise`
- `startTicketTimer(maintId, ref)`
- `timerTicket()`
- `openClient(projectId)`, an alias of `openClientProjectWorkspace`

- [ ] **Step 1:** Add the listener set and call `notifyAgencyData()` at the end of those three snapshot handlers, wrapping each callback in try/catch.
- [ ] **Step 2:** Add `opts.rail` to `ticketStubHtml`, plus a `opts.stamp` option that appends `<span class="cp-ticket-stamp">DOWN</span>` inside the receipt.
- [ ] **Step 3:** Expose the methods. Run `node --check assets/js/agency-tools.js` and expect it to pass.

### Task 5: The rail (`ticket-rail.js`, markup, styles, tab wiring)

**Files:**
- Create: `assets/js/ticket-rail.js` (IIFE, `window.CwrTicketRail = { render, mount }`)
- Modify: `index.html`. Add the tab button after `admin-tab-client-projects` (`id="admin-tab-tickets" data-admin-tab="tickets" data-admin-crm-sub`, icon `ticket-outline`, labels "Tickets", plus a `<span class="admin-tab-count" id="admin-tab-tickets-count" hidden></span>`). Add the panel `<div id="admin-panel-tickets" class="admin-tab-panel" role="tabpanel" aria-labelledby="admin-tab-tickets" data-admin-tab="tickets" hidden><div id="ticket-rail-root"></div></div>` next to the clients panel. Add `{ src: '/assets/js/ticket-rail.js?v=rail-20261021' }` to `CLASSIC` after `agency-tools.js`.
- Modify: `assets/js/script.js`:
  - add `tickets: 1` to `VALID` (21332), `CRM_SUB_TABS` (21336) and `AGENCY_TABS` (21337)
  - add `tickets` to `CRM_SUB_TAB_IDS` and both META maps (21191–21210) as `{ label: 'Tickets', icon: 'ticket-outline' }`, placed after `client-projects`
  - add `tickets` to `VALID_TAB` at 20518 if that map also needs it for the tab-order customizer, and add `'tickets'` to the `CRM_SUB_TABS` copy there
  - in `activate`, add `if (tabId === 'tickets' && window.CwrTicketRail) window.CwrTicketRail.render();`
- Modify: `assets/css/agency-tools.css`. Add a "Ticket rail" block for the rail bar, clip, stamp, pass, waiting rail, phone stack and drag gap, ported from the approved mockup `.superpowers/brainstorm/93972-1792639317/content/ticket-queue-v2.html`.

**Behavior** (from the spec, Part 1):
- `mount()` runs once. It subscribes through `AgencyTools.onAgencyData(render)` and listens to `agencyTicketQueue` with `rtdbOnValue`.
- `render()` builds items from every maintenance row's tickets (`CwrTickets.normalizeTicket`), splitting them into now, next (`open`/`in-progress`), waiting (`check`) and done (`resolved` within 90 days).
  - The order is `mergeOrder(autoOrder(next), queue.order)`.
  - Due text comes from `dueWords(dueAt(t, m), Date.now())`.
  - The header shows counts and client chips. Filters are kept in module state.
  - The nav count (`#admin-tab-tickets-count`) shows the next count plus 1 if something is on the pass.
- **The pass:**
  - **Drop or ▶:** write `agencyTicketQueue/now`. If the ticket was `open`, call `AgencyTools.setTicketStatus(..., 'in-progress')`. The previous now key gets unshifted into the saved order.
  - **Back on the rail:** write `now: null`.
  - **Auto-clear:** if the now key's ticket is missing, `check` or `resolved`, write `now: null` once, then render it as empty.
- **Drag** uses pointer events on stubs in Up next, with a gap shown at the drop position and drops on the pass. A drop writes `agencyTicketQueue/order` as the keys in their new visual order. ↑ / ↓ / ▶ buttons show on phones (< 700px) and on keyboard focus. "Reset to automatic order" writes `order: null`.
- A write failing with a permission error gives `CwrUI.toast('Deploy the database rules first (firebase deploy --only database).', { tone: 'error' })`.
- Clicking a stub, when it wasn't a drag, calls `AgencyTools.openTicketDetail`.
- On the pass, **Start timer** calls `AgencyTools.startTicketTimer`. The button reads "Stop timer" when `timerTicket()` matches, and stopping calls the existing chip stop (`window.AgencyTools.openTimerPanel` path, which opens the review). "Hours logged on this ticket" comes from `CwrTickets.ticketHours`.

- [ ] **Step 1:** Markup, script.js wiring, and the CLASSIC entry. Then run `node scripts/sync-spa-shells.mjs`.
- [ ] **Step 2:** `ticket-rail.js` and the CSS.
- [ ] **Step 3:** Bump `?v=rail-20261021` on `agency-tools.js`, `agency-tools.css`, `ticket-shared.js` (CLASSIC and portal.html) and `script.js` in `index.html`. Then sync, then check that each new `?v=` appears in all 20 shells (`grep -rl … | wc -l`).
- [ ] **Step 4:** Run `node scripts/preflight.mjs` and expect exit 0.

### Task 6: Harness check, part 1

- [ ] Extend the scratchpad admin harness (`admin.html`) with `#ticket-rail-root`, two maintenance rows on different tiers, tickets in every state including one `down`, and time entries. Load `ticket-rail.js` and call `CwrTicketRail.mount(); render()`. Then check in Playwright:
  - [ ] **Order:** down first, then by tier.
  - [ ] **Drag:** saves the order, and a new down ticket added to the fake DB still goes to the top.
  - [ ] **▶ and the pass:** sets in-progress. Marking the ticket `check` from the detail view clears the pass.
  - [ ] **Start timer:** sets `ticketRef` in sessionStorage state. A logged segment creates an entry with `ticketRef`, and a second ticket on the same day creates a second entry.
  - [ ] **Phone:** screenshots at 1280, 900 and 390, with no console errors.

### Task 7: Live-client page mode

**Files:**
- `index.html`: inside `#admin-panel-client-projects`, before the first `<section>`, add `<div id="cp-client-page-host" hidden></div>`
- `assets/js/agency-tools.js`: `selectClientProject` (4237), `openCpClientDrawer` (4169), `closeCpClientDrawer` (4190), `mountCpClientDrawerToBody` (4153), `buildCpMobileTabsHtml` (4714), `applyCpMobileTab` (4765), `renderClientProjectsWorkspace` (4853), plus the maintenance body's `maintTicketsHtml(maint)` call (around 5255)
- `assets/css/agency-tools.css`

**Produces:** `cpPageMode: boolean` and `isCpPageModeHub(hub) → deliveryStageOf(hub) === 'client'`.

- [ ] **Step 1: Open and close.**
  - **Opening in page mode:** when the hub is in page mode, `openCpClientDrawer` moves `#cp-client-drawer` into `#cp-client-page-host` and un-hides the host. It adds `cp-client-drawer--page` and `body.cp-client-page-open`, and doesn't show the overlay or initialize the sheet drag. It pushes `history.pushState({ cpClient: id }, '')` and stores `sessionStorage['cpOpenClient'] = id`.
  - **Opening a non-client hub** works exactly as today: `mountCpClientDrawerToBody` returns the element to `<body>` first and removes the page class.
  - **Closing in page mode** happens immediately, with no transition. It hides the host, removes the classes, moves the element back to body (hidden), clears `cpOpenClient`, and renders the picker. A `popstate` with page mode open closes it.
  - **Restoring:** after the first projects snapshot, if `cpOpenClient` is set and the active admin tab is `client-projects`, reopen that client.
  - **Escape** doesn't close page mode.
- [ ] **Step 2: Header.** In page mode, the drawer header (`.cp-client-drawer-header`) becomes:
  - **← Clients** (the existing close button, labelled)
  - name, plan pill, stage pill
  - **Open portal** (an `<a target="_blank">` to `clientPortalUrl(hub)` when a link is active, otherwise left out)
  - **+ New ticket** (`data-cp-action="ticket-new"`, only when the client has a maintenance row)

  The delete button stays. The header and tab bar use `position: sticky` (the header at `top: 0`, the tabs right under it).
- [ ] **Step 3: Summary strip.** Add `buildCpSummaryStripHtml(ctx)`, rendered at the top of the workspace in page mode only. It has five `button.cp-summary-card[data-cp-action="mobile-tab"][data-cp-tab=…]` cards:

  | Card | Opens tab | Shows |
  |---|---|---|
  | Hours | maintenance | meter + `'{used} / {inc} hrs'`, or "No care plan" |
  | Tickets | tickets | open count, plus `'{n} to check'` |
  | Milestones | milestones | the first unfinished milestone's label, plus `'{done}/{total}'`, or "No milestones" |
  | Portal | portal | `cpSectionSummary('portal', ctx)` |
  | Renews | maintenance | `maint.renewalDate`, formatted, plus `paymentStatus`, or "—" |

  *Ruling: milestones have no dates, so the card shows the next unfinished one.*
- [ ] **Step 4: Tickets tab and full tab bar.**
  - Add `'tickets'` to the front of `CP_SECTION_ORDER`, with `CP_SECTION_LABELS.tickets = 'Tickets'`. In page mode `renderClientProjectsWorkspace` adds `buildCpCollapsibleSection('tickets', 'Tickets', null, maintTicketsHtml(maint) or the no-plan prompt, …)` first, and leaves `maintTicketsHtml` out of the maintenance body.
  - In drawer mode the tickets section isn't built, and the order without it is unchanged. `CP_PRIMARY_TABS` is unchanged for the drawer.
  - In page mode the first tab is `tickets`, and `buildCpMobileTabsHtml(pageMode)` renders every section as a tab with no More menu at ≥ 700px. Below 700px it uses `['tickets','maintenance','milestones','portal']` + More.
  - `applyCpMobileTab` scrolls the window to the page top in page mode.
- [ ] **Step 5: CSS** (`.cp-client-drawer--page`, ported from the mockup's B layout):
  - **Container:** static position, full width of the panel, no transform or shadow, the panel's background, `hidden` respected.
  - **Sections:** at all widths, only `.cp-section--collapsible.is-mobile-active` shows, and section toggles and chevrons are hidden (the content is always expanded).
  - **Tabs:** `.cp-mobile-tabs-wrap` shows at all widths.
  - **Forms:** `.cp-form-grid` uses `repeat(auto-fit, minmax(240px, 1fr))` at ≥ 900px.
  - **Strip:** `grid-template-columns: repeat(5, 1fr)` at ≥ 1200px, `repeat(3, 1fr)` at 700–1199px, and a horizontal scroll row of 160px cards below 700px.
  - **Ticket list:** `.cp-maint-ticket-list` uses `minmax(230px, 1fr)` columns, which already exist.
- [ ] **Step 6:** Run `node --check` and `node scripts/preflight.mjs`. Expect both to pass.

### Task 8: Harness check, part 2

- [ ] In the harness, add a stage-`client` hub and a `demo` hub. Then check in Playwright:
  - [ ] **The client opens as a page:** host visible, no overlay, strip and tabs present, Tickets tab active.
  - [ ] **Tabs and cards:** each tab shows exactly one section, and the cards switch tabs.
  - [ ] **New ticket:** + New ticket opens the wizard, and saving shows the ticket in the Tickets tab.
  - [ ] **Leaving:** ← Clients returns to the board, and the drawer element is back in `<body>`.
  - [ ] **Demo client:** opens in the drawer exactly as before.
  - [ ] **Back button:** browser Back closes the page.
  - [ ] **Sizes:** screenshots at 1440, 1024, 768 and 390, with no console errors.
- [ ] Run `node scripts/preflight.mjs` and `node scripts/build-site.mjs`. Both should pass with no private paths.
