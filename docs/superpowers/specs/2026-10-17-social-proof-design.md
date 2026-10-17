# Social proof: real clients, real results

Date: 2026-10-17 · Status: draft for Ruben's review

## Goal

The homepage "Trusted by local businesses" section shows real clients with
real, sourced results ("+38% online orders/week", "86 residents on the portal")
instead of placeholder copy. Adding the next client takes a minute, and there's
a repeatable way to collect the numbers.

**Who it's for:** local small-business owners deciding whether to hire CWR.

**Success:**
- On push day, Rizo's Pizzeria, Shelton Springs HOA and ProCleaning Seattle
  show on the homepage without any admin step.
- Every number shown says where it came from and when.
- A new client's proof can be started at kickoff and published after the
  results check-in, all from Admin.

## Decisions already made (with Ruben)

- Results come from **both** the apps Ruben built and the clients, and each one
  is **labeled by source**.
- Only Rizo's has a "before" number today, so Rizo's gets a %. Shelton Springs
  and ProCleaning get counts since launch, or the what-we-built line until
  there's a number.
- Results are managed in a **Social proof list**, not on portfolio projects.
- Raw before/after numbers stay **admin-only**. Only the computed result is public.
- Slides lead with the **big number**.
- Client-only (private) portfolio projects never get a "View project" link.

## Data

### Public: `socialProof/{id}` (RTDB, anyone can read, admin writes)

| Field | Type | Notes |
|---|---|---|
| `client` | string, 1–80 | Required. Shown on the slide. |
| `logoUrl` | string, ≤ 500 | `/assets/…` path or `https://` link; anything else is dropped. |
| `stat` | string, ≤ 12 | The display number, computed at save: `+38%`, `−25%`, `1,240`. `''` = no number. |
| `label` | string, ≤ 80 | What the number measures: "more online orders per week". |
| `source` | `'app'` \| `'client'` \| `''` | Required when `stat` is set. |
| `asOf` | `'YYYY-MM'` \| `''` | Month the number is from. Required when `stat` is set. |
| `summary` | string, ≤ 200 | What we built. Shown when there's no number. |
| `projectId` | string, ≤ 64 | Optional portfolio project id. |
| `published` | boolean | `false` = draft, never shown. |
| `order` | number | Ascending. |
| `updatedAt` | number | ms. |

No other fields are allowed (`$other: false`).

### Admin-only: `socialProofDetails/{id}`

| Field | Type | Notes |
|---|---|---|
| `kind` | `'change'` \| `'count'` \| `'none'` | Result type picked in the editor. |
| `before`, `after` | number \| null | For `change`. |
| `count` | string | For `count`, as typed. |
| `note` | string, ≤ 500 | How it was measured ("Rizo's order dashboard, Jul vs Sep"). |
| `launchDate` | `'YYYY-MM-DD'` \| `''` | Drives "Check-in due". |
| `createdAt` | number | ms. |

The public entry and its details are written together in one multi-path update,
and deleted together.

### Built-in entries

`SocialProof.BUILT_IN` ships three published entries, with no numbers yet:

| Client | Logo | What we built |
|---|---|---|
| Rizo's Pizzeria | `/assets/images/logo/logo-2-color.png` | Online ordering with real-time order tracking for customers and a kitchen dashboard that keeps every order moving. |
| Shelton Springs HOA | `/assets/images/logo/logo-1-color.png` | A resident portal and board tools built for how the neighborhood actually runs day to day. |
| ProCleaning Seattle | `/assets/images/logo/logo-3-color.png` | Field service workflows that keep crews, schedules, and customers in sync from the job site. |

**Which list shows:** if `socialProof` has at least one entry (any status), the
homepage uses the database: published entries only, by `order`, at most 6. If
it's empty or can't be read, the built-ins show. If the database has entries
but none are published, the section is hidden (that's Ruben's choice, not an
error).

## Shared logic: `assets/js/social-proof.js`

A UMD module, `window.SocialProof` in the browser and `module.exports` in Node,
modelled on `portfolio-skins.js`. Pure functions, no DOM, no Firebase:

- `percentChange(before, after)` → `'+38%'` / `'−25%'` / `''`. Rounded to a
  whole number; `''` unless `before > 0` and `after ≥ 0`. Uses U+2212 for minus.
- `formatCount(raw)` → digits get thousands separators (`'1240'` → `'1,240'`).
  Other text is kept as typed, trimmed, up to 12 characters.
- `statFor(details)` → the public `stat` for a details object.
- `sourceLabel(source, lang)` → From the app / Client-reported (EN), Desde la
  app / Según el cliente (ES).
- `monthLabel(asOf, lang)` → `Sep 2026` / `sep 2026`.
- `sanitizeEntry(raw)` → a public entry with every rule from the table applied.
- `validate(entry, details)` → a list of errors for the editor: client
  required; for `change`, before > 0 and after ≥ 0; for `count`, a value;
  when there's a number, source and month are required.
- `visibleEntries(dbList, builtIns)` → what the homepage shows, per the rule
  above.
- `checkInDue(details, entry, today)` → true for an entry with no number yet
  whose `launchDate` was 60 or more days before `today`.
- `BUILT_IN`, `MAX = 6`.

## Homepage

- `initLandingSocialProofSpotlight` reads `socialProof` once per page load,
  through the same RTDB client the portfolio uses, then renders
  `visibleEntries(...)`. While the read is pending or after it fails, it shows
  the built-ins. No blank flash, no hidden section.
- **Slide with a number:** logo, the big `stat`, then `label`, then a small line:
  `client · source · month`.
- **Slide without a number:** logo, "Client project", `client`, then `summary`.
- **"View project →"** shows only when `projectId` matches a **public**
  portfolio project, and opens it with `openPortfolioProjectDetail`.
- **Kept as they are:** the slide `div` (not `<article>`) and the grid-stacked
  stage, the dots, auto-rotation (none with reduced motion), and the
  `prefers-reduced-motion` handling.
- **Removed:** the portfolio-editor fields from the previous round
  (`homeSpotlight`, `clientLogoUrl`, `resultStat`, `resultLabel`), from the
  markup, fill, save, unsaved-changes check, sanitizer and renderer. No live data
  uses them. `scripts/test-landing-spotlight.mjs` is replaced by the new test.

## Admin: Social proof section

A new admin-only script, `assets/js/social-proof-admin.js`, is added to
`loadAdminBundle()`. Its section goes in Admin → Testimonials, under
"Testimonial requests", using the same `admin-collapsible-section` markup.

**List:** one row per entry showing:
- logo, client name
- `stat` and `label`, or "No number yet"
- `source · month`
- a status chip: Published / Draft / Built-in
- a **Check-in due** chip (from `checkInDue`)
- ▲▼ order buttons and **Edit**

A **+ Add client** button sits on top. While the database list is empty, the list
shows the three built-ins with a "Built-in" chip.

**Editor:** a drawer with numbered sections and a sticky Save, styled like the
business-document drawer.
1. **Client:** name, logo (a text field with a datalist of the three logos), and
   linked portfolio project (a dropdown of all projects, with client-only ones
   marked "(client-only, no link)").
2. **Result:** type (% change / Count / No number yet).
   - **% change:** before and after, with the computed `+38%` shown live.
   - **Count:** the value.

   Then what it measures, source, month (`<input type="month">`), launch date,
   and a private "How you measured" note.
3. **What we built:** one line.
4. **Publish:** a switch, plus Delete (with a confirm).

**Built-ins:** saving any built-in entry copies all three into the database in
the same multi-path update, so the order is kept and the database takes over.

**Results check-in:** a button on each row (and in the drawer) calls
`openAdminClientEmailCompose` with an editable plain email (the "None" template,
no portal button). The subject is "Quick check-in on {client}". The body says,
roughly: "Since launch, has anything measurable changed (orders, calls, bookings,
time saved)? A rough number is perfect, and I'll only share it on my site with
your OK." It's prefilled only; Ruben edits and sends it from Compose. That "with
your OK" line is the client's consent to publish a client-reported number.

**Errors:** validation errors show inline and block Save. A failed write keeps
the drawer open with the user's edits and shows "Couldn't save. If this is the
first save, deploy the database rules first."

## Process (how results get made)

1. **Kickoff:** add the client as a Draft with the before number, the launch date
   once known, and a note on how it was measured.
2. **60+ days after launch:** the row shows Check-in due. Read the number from
   the app (source: From the app), or send the Results check-in email and use the
   client's reply (source: Client-reported).
3. **Publish.**

## Rules (`database.rules.json`)

Add `socialProof` (`.read: true`, admin `.write`, per-field `.validate` as in
the table, `$other` false) and `socialProofDetails` (admin read and write). The
admin expression is the same one the other nodes use (claim, or the verified
email fallback).

**Deploy:** Ruben runs it (`firebase deploy --only database`). Either order with
the site push is safe. Before the deploy, the homepage shows the built-ins, and
admin saves fail with the message above.

## Testing

- **`scripts/test-social-proof.mjs`** (Node, runs in preflight):
  - `percentChange` rounding, negative values, `before` of 0, and non-numbers
  - `formatCount`
  - `sourceLabel` and `monthLabel` in EN and ES
  - `sanitizeEntry`: the lengths, the logo URL cases already covered by the old
    test (`javascript:`, `http:`, quotes, `//`), unknown fields dropped
  - `validate` for every rule
  - `visibleEntries`: database vs built-ins, drafts hidden, order, max 6
  - `checkInDue` boundaries (59, 60 and 61 days; has a number; no launch date)
- **Browser, with fake data only:**
  - homepage built-ins at 393, 1061 and 1300 px, with no overflow
  - a published DB entry with a % slide and source line
  - View project only for a public linked project
  - admin: add, edit, live %, publish, order, built-in copy, check-in due chip,
    Results check-in opening Compose
- **Preflight** green before handoff.

## Out of scope

- Pulling numbers automatically from client apps.
- Tying an entry to a testimonial.
- A live slide preview in the editor.
- The testimonial private-answers issue. That's a separate decision, still open.
