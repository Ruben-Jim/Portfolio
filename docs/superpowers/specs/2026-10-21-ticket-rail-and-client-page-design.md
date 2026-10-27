# Ticket rail and live-client full page

Date: 2026-10-21 · Status: approved by Ruben in conversation (mockups `ticket-queue-v2`, layout B) · Builds on `2026-10-21-client-tickets-design.md`

## Why

Ruben's day is mostly tickets now, and admin makes that hard in two ways.

1. **There is no "what's next".** Tickets live inside each client's drawer, so seeing what's open means opening clients one by one. Nothing says which ticket to work first, even though the plan cards promise an order: Priority is "first in line, ahead of every other client", and Standard's "requests move ahead of Essential clients".
2. **The client drawer is a long scroll on desktop.** Its ten sections stack in a 600px column, so on desktop Ruben keeps scrolling up and down to open and collapse them.

## Goals

**Part 1: the Tickets rail.** Built first.

1. A new admin tab, **Tickets**, shows every open ticket from every client in one queue. That means every care plan in `agencyMaintenance`, whatever the client's stage.
2. The queue orders itself the way the plans promise. Ruben can override the order by dragging, and reset it to automatic.
3. One ticket at a time sits **on the pass** ("Working on now").
4. **Start timer** on the pass runs the existing planner timer, and the hours land on that ticket.
5. It keeps the ticket look: the cream Courier stubs, hung in order on a rail like a kitchen order rail.

**Part 2: the live client's full page.** Built second.

6. A client at stage `client` opens as a full page instead of the drawer. Layout B is a header, an always-visible summary strip, and tabs, with Tickets as the first tab.
7. The page works at every desktop width, on tablets, and on phones.

## Non-goals

- Billing (phase 2 of tickets).
- Changes for demo or converting clients. They keep today's drawer exactly as it is.
- Emailing clients when the queue changes.
- A ticket queue for anyone other than Ruben, such as assignees or teams.

## Anti-goals

- A queue that silently disagrees with the plan promises. With no manual moves, a Priority ticket must never sit behind an Essential one, and a down ticket must never sit behind one that isn't down.
- Hours from the timer that can't be traced back to a ticket.
- Breaking today's drawer for demo or converting clients, or the client-portal flows shipped earlier today.
- Anything that doesn't use the ticket stub style for tickets.

---

## Part 1: the Tickets rail

### Where it lives

There's a new tab button, `data-admin-tab="tickets"`, in the **Agency** nav group, right after **Clients** (`admin-tab-client-projects`). Its label is "Tickets" on desktop and phone, and its icon is the ticket outline used by the portal's "Report an issue" button. It shows a gold count of open tickets that aren't waiting on the client.

The panel is `admin-panel-tickets`. Markup goes in `index.html`, and then `node scripts/sync-spa-shells.mjs` copies it to all 20 shells.

### What's in it

Top to bottom:

1. **Header.** "Tickets" with three counts: open, waiting on client, and done this month (resolved since the 1st, Pacific time). Then filter chips: **All clients**, one chip per client that has open tickets, and **Done**.
2. **Working on now (the pass).** Holds at most one ticket, shown as a larger stub with a soft gold glow. Beside it:
   - "On the pass since {time}"
   - "{n} hrs logged on this ticket"
   - **Start timer** (reads "Stop timer" while running), **Open ticket**, and **Back on the rail**
   - When nothing is on the pass, an empty slot reads "Drag a ticket here or tap ▶".
3. **Up next.** A rail of stubs for every ticket with status `open` or `in-progress` that isn't on the pass, in queue order. Each stub hangs from a clip with its place in line (1, 2, 3…).
4. **Waiting on client.** A second, dimmed rail for tickets with status `check`. The clip shows "–", and the stub prints "Sent {n} days ago", measured from `updatedAt`. These stubs can't be dragged into Up next. A ticket leaves this rail when the client answers or when Ruben changes its status.
5. **Done** (filter only). Resolved tickets from the last 90 days, newest first, at the same stub size and dimmed.

### Stub contents

This is the same stub as the drawer's `cp-ticket-receipt`. Its meta rows are:

- **Client:** clientName
- **Plan:** tier label
- **Kind:** only when set
- **Due:** the reply deadline in words: "in 2 hrs", "in 3 days", "Overdue 1 hr". Shown in red ink when overdue.
- **Status**

A ticket with `down: true` gets a red rubber-stamp **DOWN** across the stub. Clicking a stub opens the full ticket view that exists today (`openTicketDetail`).

### Order

**Automatic order** sorts Up next by:

1. `down` true before false
2. plan tier: priority, then standard, then essential, then none
3. reply deadline, earliest first
4. `createdAt`, oldest first

**Reply deadline.** The clock starts at the ticket's `createdAt`. Business time is Monday to Friday, 9:00 to 17:00, America/Los_Angeles. US holidays are not skipped. One business day equals 8 business hours, and a start outside business time first rolls to the next business moment. So a weekday ticket is due at the same clock time N weekdays later, and a weekend ticket is due at the end of the Nth business day.

| Ticket | Deadline |
|---|---|
| down, Priority | `createdAt` + 2 clock hours |
| down, Standard | `createdAt` + 4 clock hours |
| down, Essential | `createdAt` + 1 business day (the next weekday at the same clock time) |
| not down, `slaHours` < 24 | `createdAt` + that many business hours |
| not down, `slaHours` a multiple of 24 | `createdAt` + `slaHours / 24` business days |
| not down, any other `slaHours` | `createdAt` + that many clock hours |
| no plan or no `slaHours` | no deadline. Sorts last within its tier, and the stub prints "—". |

**Manual order.** Dragging a stub, or tapping ↑ / ↓ on a phone, saves the whole current Up next order to `agencyTicketQueue/order` as a list of keys `"{maintId}/{ref}"`.

Merging the saved order with the automatic one:

1. Sort everything automatically.
2. Note the positions held by tickets that appear in the saved list.
3. Fill those same positions with those tickets, in saved order.

The result: tickets Ruben moved keep his order, and a new ticket lands where the automatic rule puts it. A new down ticket therefore still lands at the top. Keys for tickets that no longer exist are ignored, and they're dropped the next time the order is saved.

A **Reset to automatic order** link appears whenever a saved order exists, and it clears the saved order.

### The pass

`agencyTicketQueue/now` holds the key of the ticket on the pass, or null.

- **Putting a ticket on the pass** (dragging it onto the pass, or tapping ▶ on a phone) sets that ticket's status to `in-progress` if it was `open`. Any ticket already on the pass goes back to the head of Up next.
- **Back on the rail** clears the pass and leaves the status as it is.
- **The pass clears itself** when its ticket becomes `check` or `resolved`, or is deleted. If the timer is running for that ticket, it keeps running until Ruben stops it.

### Timer

**Start timer** calls the existing planner timer (`quickStartTcTimer`) with target `maint:{maintId}` and a new field, `ticketRef`.

| What happens | Result |
|---|---|
| The timer is running for a different target or ticket | It switches focus to this ticket the way the chip switches clients today (`switchTcFocusFromChip`: `pushCurrentSegment()`, then the new target). Pull that switch into a function both can call. The earlier segment keeps its own ticket. |
| A segment is logged | `addLoggedHoursForToday` gets `ticketRef`, and its merge key becomes date + kind + maintenanceId + ticketRef. Two tickets for one client on the same day stay as two entries. |
| A segment has no `ticketRef` | It merges the way it does today. |
| The timer is persisted (`persistTcTimerState`) | `ticketRef` is persisted and restored with each segment. |

The timer chip and review sheet show the ticket ref next to the client name. The hours count toward the plan's `hoursUsed` exactly as they do today.

### Data and rules

`agencyTicketQueue` is a new path, admin-only: `{ order: string[], now: string|null, updatedAt }`. Add it to `database.rules.json` with the same `.read`/`.write` as `agencyMaintenance`, and extend `scripts/test-ticket-rules.mjs`. It needs `firebase deploy --only database` before the push. Until then, the rail still shows the automatic order, and dragging or the pass shows a toast naming the deploy.

### Where the code goes

- **Pure rules** go in `assets/js/ticket-shared.js`, tested in `scripts/test-tickets.mjs`: `dueAt(ticket, maint) → ms|null`, `dueWords(dueAt, now) → string`, `autoOrder(items)`, `mergeOrder(autoSorted, savedKeys)`, `tierRank(tier)`.
- **The rail UI** goes in a new admin-only script, `assets/js/ticket-rail.js`. Add it to `loadAdminBundle`'s `CLASSIC` list after `agency-tools.js`.
- **The bridge.** The rail reads agency data through new methods on `window.AgencyTools`:
  - `getMaintenance()` and `getTimeEntries()` return copies.
  - `onAgencyData(cb)` is called after any agency snapshot.
  - `openTicketDetail(maintId, ref)` and `startTicketTimer(maintId, ref)`.
  - `ticketStubHtml(t, m, opts)` (reuse, don't copy).
- **Styles** go in `agency-tools.css` under a "Ticket rail" block. The rail bar, clips and DOWN stamp come from the approved mockup.

### Small screens

- **Tablet (≥ 700px):** the same as desktop. The rails scroll sideways.
- **Phone (< 700px):** the rails become vertical stacks with stubs at 230px wide, centered. Each Up next stub gets ↑, ↓ and ▶ buttons below it, and there's no dragging. The pass stub shows its buttons stacked underneath.

Drag on desktop uses pointer events with a clear grab handle (the whole stub), and the drop position is shown as a gap in the rail. Keyboard users get the same ↑ / ↓ / ▶ controls, which on desktop appear when a stub is focused.

---

## Part 2: the live client's full page (layout B)

### When it shows

Clicking a client whose `deliveryStage` is `client`, from the Clients list, a pipeline link, the rail, or anywhere else that calls `openClientProjectWorkspace`, opens the full page. Demo and converting clients still open the drawer.

The page replaces the Clients panel's content inside the admin area, and the admin nav stays visible. **← Clients** returns to the list. The open client is remembered in sessionStorage (the same way admin tabs are), and a history entry is pushed so the browser's Back button returns to the list.

### Layout

1. **Header,** which sticks while scrolling: ← Clients, client name, plan pill, stage pill, **Open portal**, **+ New ticket** (the existing wizard).
2. **Summary strip** of five cards:
   - Hours this period: meter plus "1.5 / 2 hrs"
   - Tickets: open count, plus "{n} waiting on you" / "{n} to check"
   - Next milestone: title and date, or "No milestones"
   - Portal: link on or off and its expiry
   - Renews: date, plus paid or awaiting

   Clicking a card opens its tab.
3. **Tabs,** which stick under the header: Tickets (first, with a count), Maintenance, Milestones, Portal, Hub, Guides, Documents, Health, Pipeline, Portfolio, Email.

   Each tab shows only its own section's content, with no collapse chevrons. It reuses the existing section renderers and actions, but the full page lays them out wider: multi-column forms where the drawer had one column.

   The **Tickets** tab is the client's stub grid from `maintTicketsHtml`, at full width. If the client has no care plan, it says so and links to Maintenance.

### Sizes

| Width | Strip | Tabs | Content |
|---|---|---|---|
| ≥ 1200px | one row of 5 | one row | forms in 2–3 columns |
| 700–1199px (tablet) | 3 + 2 | scroll sideways | 2 columns |
| < 700px (phone) | sideways-scrolling row of compact cards | today's mobile strip: Tickets, Maintenance, Milestones, Portal + More | 1 column |

### Code

This lives in `agency-tools.js`, next to `renderClientProjectsWorkspace`.

- A new `renderClientFullPage(hub)` builds the header, strip and tab bar.
- The section bodies come from the same functions the drawer uses, so both share one renderer per section. The drawer stays for non-client stages.
- The existing `[data-cp-action]` delegation must work in both containers.

---

## Tests

- `scripts/test-tickets.mjs` gets `dueAt` across every row of the deadline table, including a ticket logged Friday 4pm Pacific with a 3 business hour SLA, which comes due Monday 11am. It also gets `autoOrder` (down beats tier, tier beats due date) and `mergeOrder` (moved tickets keep their order, a new down ticket goes to the top, missing keys are ignored).
- `scripts/test-ticket-rules.mjs` covers `agencyTicketQueue` as admin-only.
- The timer merge key gets a test if the merge logic is pulled into a pure function. Otherwise it's checked in the harness.
- Harness and Playwright walk-throughs at 1280, 900 and 390px, using the same in-memory RTDB harness as the tickets work:
  - the rail
  - dragging
  - ▶ and the pass
  - Start timer
  - the full page and its tabs

## Calls made by Claude (not discussed with Ruben)

- Business hours are 9:00 to 17:00 Pacific, Monday to Friday, with no holiday calendar.
- Waiting-on-client stubs show time since sent, not a deadline, and can't be reordered.
- "Done this month" counts from the 1st, Pacific time.
- Putting a ticket on the pass moves it from Open to In progress, and a ticket already on the pass goes back to the head of Up next.
- The rail code lives in its own `ticket-rail.js` and reads agency data through `window.AgencyTools`.
- The full page sits inside the admin area, with the nav still visible, rather than covering it.
- Phones reorder with ↑ / ↓ / ▶ buttons, not dragging.
- Client filters on the rail don't hide the pass: it always shows the ticket being worked on.
- "Done this month" counts tickets with a `resolvedAt` this month. Older tickets resolved before `resolvedAt` existed don't count.
