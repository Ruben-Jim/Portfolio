# Client tickets: CWR-opened tickets and work write-ups

Date: 2026-10-21 · Status: approved by Ruben (mockups, 2026-10-21) · Phase 1 of 2

## Why

Clients report problems by text, email, or call as often as through the portal. Today only portal reports become tickets, and a ticket stops at "received". There is no record of what CWR found, what CWR fixed, or how long it took.

CWR needs that record for two reasons. The main one is a history of the work done for each client, to back up monthly billing. The other is an optional write-up the client can read. proCleaning's issue from 2026-10-19 is the first real case. Ruben will enter it himself, so no data gets seeded.

## Goals (phase 1)

1. Ruben can open a ticket for a client from admin, one question at a time.
2. Every ticket records how it came in, what the client reported, what CWR found, what CWR fixed, how the client can check it, private debug notes, screenshots, and the time spent (from planner logs).
3. A new status, **Ready for you to check**, means the fix is live and the client can try it.
4. The client sees the write-up in their portal (Ruben can switch that off per ticket) and can answer **Looks good** or **Still not working**.
5. Everything keeps the existing ticket look: the dark drawer, gold accents, the cream Courier receipt stub, and the printer.

## Non-goals (phase 1)

- **Billing.** Phase 2 adds Covered / Billed / Waived per ticket and the billing records. Phase 1 must not block it: the data has to carry what billing will need (kind, source, dates, linked hours).
- Emailing the client when a ticket moves to "Ready for you to check". Ruben tells them himself, as he does today.
- Clients attaching screenshots from the portal.
- Adding the "is something down?" question to the client's own portal form.
- Picking a ticket while logging time in the planner. Linking is done from the ticket.

## Anti-goals

- Debug notes or screenshots reaching the client's browser in any form, including the network payload.
- A ticket that CWR opened looking different from one the client printed. The reference number a client quotes must match what's on Ruben's screen line for line.
- Losing a ticket the client submits while Ruben is editing another one.

## Data

### Ticket (stays in `agencyMaintenance/{maintId}/tickets[]`, the existing array)

Existing fields are kept as they are: `ref`, `title`, `area`, `details` (the client's words), `status`, `createdAt`.

| Field | Values | Notes |
|---|---|---|
| `status` | `open` · `in-progress` · `check` · `resolved` | `check` is new. Old `done`/`closed` still read as resolved. |
| `createdAt` | ISO | **When the client sent it.** For an admin ticket this is the step-2 date, not the moment it was saved. "Opened" on the stub shows this. |
| `source` | `portal` · `text` · `email` · `call` · `in-person` | A missing value reads as `portal`, so old tickets need no migration. |
| `kind` | `bug` · `change` · `question` | Optional. Old tickets have none. |
| `down` | boolean | "Something is down right now". Picks the reply-time line. |
| `found`, `fixed`, `howToCheck` | text ≤ 2000 | The write-up. |
| `shareWriteup` | boolean, default `true` | When `false`, the portal gets no write-up fields at all. |
| `clientReply` | `{ verdict: 'ok' \| 'not-working', note, at }` | The last answer from the portal. |
| `loggedAt` | ISO | When the record was actually created. |
| `updatedAt`, `resolvedAt` | ISO | `resolvedAt` is set on the move to resolved and cleared on reopen. |

The reference number keeps the existing scheme (`CWR-{TAG}-{NNN}`, highest + 1 across the client's tickets), so admin tickets and portal tickets share one count.

New admin code addresses a ticket **by `ref`**, never by array index. It re-reads the array, finds the ref, and writes only that one slot (`tickets/{i}`), never the whole maintenance record. A new ticket is written to `tickets/{length}` right after a fresh read. Two writes landing at the same moment can still collide. That risk is accepted because there is one admin, and a portal submit goes through a server-side transaction.

### Private notes (new path: `agencyTicketNotes/{maintId}/{ref}`)

`{ debugNotes, files: { {pushId}: { path, url, name, contentType, size, addedAt } }, updatedAt }`, admin only.

These live outside `agencyMaintenance` on purpose. `portalApi` reads `agencyMaintenance`, and keeping private notes out of it means a future filtering bug still can't leak them.

### Screenshots (Storage: `ticketFiles/{maintId}/{ref}/{fileName}`)

Admin read, write and delete only. Images only, under 12 MB. Same pattern as `postDesigns`.

### Time (existing `agencyTimeEntries`)

A `kind: 'maint'` entry gains an optional `ticketRef`. A ticket's time is the sum of `loggedHours` over entries with the same `maintenanceId` and `ticketRef`. `normalizeTimeEntry` keeps the field. Existing writes already spread the raw row, so they keep it too.

A planner entry is one day's hours for a client, so linking happens per day. Timer hours added later that day land in an entry that's already linked. That's accepted for phase 1.

## Admin

### Drawer: Tickets

- **+ New ticket** sits in the Tickets header, and also in the empty state (which now says "No tickets yet.").
- The stub button cycles through **Start**, **Ready to check**, **Resolve** and **Reopen**. Delete stays.
- Tapping a stub opens the full ticket (below). That replaces today's read-only viewer.
- The stub shows `Via` when the source isn't the portal, and shows the right reply-time line when `down` is set.

### New-ticket flow: one question per screen

A sheet on `data-layer="modal"`, opened from the drawer with the client already set. Progress dots, **Back**, and **Next**. Enter moves forward on single-line steps. In the textarea step, Enter adds a new line and the Next button moves forward. Esc closes the sheet and asks first, through `CwrUI.confirm`, if anything has been typed.

1. **How did it come in?** Text · Email · Call · In person · Portal
2. **When did they send it?** A date and time, defaulting to now
3. **What did they say?** Their words, plus optional screenshots (images, several allowed)
4. **Give it a short title.** Required. It prints on the stub and shows in their list.
5. **What kind, and where?** Kind chips, then the same area list the portal uses (`TICKET_AREAS`)
6. **Is something down right now?** Yes / No, then **Print ticket**

Print writes the ticket, uploads the screenshots to their paths, prints the stub with the same printer and feed animation the portal uses (the stub adds a `Via` line), then shows **Open ticket**.

### Full ticket

The existing enlarged stub moves onto `data-layer="modal"` (it currently uses a hard-coded z-index). It sits next to a work panel. On narrow screens the two stack.

- **The stub** prints all the meta (Area, Kind, Opened · via, Status, Response, Time), then the sections that have content: You told us, What we found, What we fixed, How to check it. It never prints debug notes.
- **The work panel** has:
  - What we found, What we fixed, How to check it
  - Debug notes (dashed border, "only you see these")
  - Screenshots (add and remove)
  - Status chips
  - Time spent, with **Link planner time**: this plan's maint entries as checkboxes, each showing its date, hours, and the ticket it's already on, if any
  - "Print the write-up on their copy" switch
  - The client's last reply, if there is one
  - **Save**
- Saving writes the ticket slot and `agencyTicketNotes` separately. If the private-notes write fails because the rules aren't deployed, a `CwrUI.toast` names the fix.

## Client portal

- The ticket list gets a purple badge, "Ready for you to check", and a header pill such as "1 to check" next to the open count.
- Tapping a ticket opens it in the existing portal sheet as a full receipt, with the write-up if it's shared.
- While a ticket is `check`, the sheet shows **Looks good** and **Still not working**. "Still not working" asks for an optional note before sending.
- Labels stay the same as today: Open, In progress, Resolved, plus the new **Ready for you to check**.

## Server (`functions/portal-api.js`)

- `publicTicket(t)` is an allow-list. It passes `ref, title, area, details, status, createdAt, source, kind, down, resolvedAt, clientReply`, plus `found, fixed, howToCheck` only when `shareWriteup !== false`. Nothing else gets through.
- `publicMaintenance(m)` passes tickets through `publicTicket` and **drops `notes`**. That field is the admin's private care-plan notes, which today go out in `load` although the portal never shows them.
- `submitTicket` adds `source: 'portal'` and `loggedAt`.
- New action `replyTicket { token, ref, verdict, note }`:
  - It runs a transaction on that client's tickets.
  - It's only allowed while the ticket's status is `check`, and otherwise returns 409.
  - `ok` sets `resolved` and `resolvedAt`. `not-working` sets `in-progress`.
  - Both record `clientReply`, and the action returns the ticket through `publicTicket`.

## Rules and deploy

- `database.rules.json`: add `agencyTicketNotes`, admin read and write only.
- `storage.rules`: add `ticketFiles/{maintId}/{ref}/{fileName}`, admin only, images under 12 MB.
- **Deploy before pushing the site:** `firebase deploy --only functions,database,storage`. Ruben must OK it first. Until it runs:
  - The portal's "Looks good" fails with its usual error line.
  - Debug notes and screenshots fail with a toast that says which deploy is missing.
  - The rest of the feature works.

## Cache busters

Bump `?v=` for `agency-tools.js` (in `loadAdminBundle`, in every shell that holds it) and for `agency-tools.css`, `client-portal.js` and `client-portal.css` wherever they're linked. Do it in one scripted pass that checks each file matched.

## Tests

- `scripts/test-portal-api.mjs` covers:
  - `publicTicket` hides the write-up when the switch is off and drops unknown fields
  - `load` no longer returns `notes`
  - `replyTicket` handles ok, not-working, wrong status (409), unknown ref, and another client's ref
  - `submitTicket` sets `source`
- `node scripts/preflight.mjs` must pass.

## Calls made by Claude (not discussed with Ruben)

- Status labels stay **In progress / Resolved** as today, and the mockup's "Working on it / Done" was not used. Existing tickets keep their look.
- Private notes and screenshots sit in their own admin-only path and are never stored inside the ticket.
- Screenshots are images only. Ruben attaches them, and clients don't see them in phase 1.
- `createdAt` holds the date the client sent the issue, so the stub's "Opened" date and the reply clock follow the client's message.
- "Still not working" moves the ticket back to In progress.
- The reply-time line when something is down comes from the plan tier: Essential "Reply within 1 business day", Standard "Reply within 4 hours", Priority "Reply within 2 hours". These match the plan cards.
- Admin `notes` stop going to the portal.
- **Link planner time** lists this plan's maint entries from the last 90 days, plus any older entry already linked to this ticket. The newest are at the top.
- Deleting a ticket also deletes its `agencyTicketNotes` entry and its screenshots, after the existing confirm.

## Phase 2 (billing), for context only

Each ticket gets Covered / Billed (amount set by Ruben) / Waived. Waived tickets still show their hours and value. Billing will build on phase 1's `kind`, `source`, `createdAt`/`resolvedAt` and linked hours.
