# Social proof tab: every quote and outcome in one place

Date: 2026-10-17 · Status: draft for Ruben's review
Builds on: `docs/superpowers/specs/2026-10-17-social-proof-design.md` (the Social proof list, already shipped)

## Goal

One admin tab where Ruben sees all his proof per client:
- the homepage line (quote or number)
- what clients wrote in testimonials
- the Outcome on each portfolio project

One click turns a testimonial or an Outcome into a client's homepage quote, so the same story isn't typed in three places.

**Who it's for:** Ruben (admin only).

**Success:**
- Every published or draft homepage entry shows, with its linked project's Outcome and the testimonials from that business.
- Outcomes and testimonials that no entry uses yet are listed, with a way to add them to the homepage.
- Using one opens the editor already filled in, and nothing is saved until Save.
- Opening the tab adds no reads beyond the social proof list and the testimonials collection. Portfolio projects are already in memory.

## Decisions already made (with Ruben)

- **See + use, not edit-in-place.** Testimonial text and Outcomes are still edited in their own editors.
- **One card per client**, plus a "Not on the homepage yet" list.
- **A slide that uses a testimonial credits who said it:** the bottom line becomes "Name · Title, Business".
- **Approach A:** the Social proof section moves into its own tab, and `assets/js/social-proof-admin.js` grows to draw it (one lazy-loaded script, for performance).

## The tab

- **Tab bar:** a new Content sub-tab, **Social proof** (`data-admin-tab="social-proof"`), placed after Testimonials. It's added to both `CONTENT_SUB_TABS` maps in `script.js`, and the existing tab bar, "More" dropdown and mobile sub-tab bar pick it up from the button.
- **Move:** the `#social-proof-admin-section` markup moves from `#admin-panel-testimonials` into a new `#admin-panel-social-proof`. The Testimonials tab keeps requests, invites and submissions.
- **Opening:** `activate('social-proof')` calls `CWR_SOCIAL_PROOF.open()`; the old Testimonials hook is removed. The script's late-load auto-open checks `#admin-panel-social-proof`.

## Data (read once per tab open, refreshed after each save)

| Source | Read | Fields used |
|---|---|---|
| Social proof list | RTDB `socialProof` + `socialProofDetails` (existing) | as today |
| Testimonials | Firestore `testimonials` via `window.getDocs(window.collection(window.db, 'testimonials'))` | `name`, `title`, `company`, `text`, `rating`, `createdAt` (private answers are never shown here) |
| Portfolio | `window.portfolioProjectsAll` (already loaded) | `id`, `title`, `outcome`, `isTemplate`, `visibility` |

If the testimonials read fails, the cards still render without testimonials, and a status line says "Couldn't load testimonials". If the social proof read fails, the existing "saving is off" behaviour applies.

## Matching (pure rules in `assets/js/social-proof.js`)

- `nameKey(s)`: lowercase, strips accents, removes punctuation and a leading "the ", collapses spaces. "Rizo's Pizzeria" → "rizos pizzeria".
- **A testimonial belongs to an entry** when `nameKey(t.company) === nameKey(entry.client)`. All matches show, newest first.
- **An entry's Outcome** is the Outcome of the portfolio project with `id === entry.projectId`, when that Outcome isn't blank.
- `unusedProof(entries, testimonials, projects)` returns what no entry uses:
  - testimonials whose business matches no entry
  - non-template projects with a non-blank Outcome that no entry links to (by `projectId`)
- `quoteFromText(text)`: the first paragraph, whitespace collapsed, cut to 200 characters at a word with "…" (same rule as the summary limit).
- `creditFromTestimonial(t)`: "Name · Title, Business", skipping blank parts and capped at 60. Examples: "Roberto Rizo · Owner, Rizo's Pizzeria"; with no title, "Roberto Rizo · Rizo's Pizzeria".

## Cards

One card per row of the current list, in homepage order:
- **Header:** logo, client name, status chips (Published / Draft / Built-in / Check-in due), ▲▼, Edit, Check-in. The same controls as today's rows.
- **Homepage:** the current quote, or the number and what it measures, plus the bottom line. "No quote or number yet" when empty.
- **Outcome** (if any): the text, with **Use** (fills the quote) and **Edit** (`openPortfolioProjectEditor(projectId)`).
- **Testimonials** (if any): stars, the quote, and "Name · Title". Each has **Use** (fills the quote and the credit) and **Open in Testimonials** (clicks `#admin-tab-testimonials`).

**Not on the homepage yet** (below the cards, hidden when empty):
- **Testimonials:** "Name · Business" and the quote, with **Add to homepage**.
- **Outcomes:** the project title and the Outcome, with **Add to homepage**.

## Use / Add to homepage

Both open the existing editor drawer, already filled in. They never write directly.

- **Use on a card:**
  - **Testimonial:** quote = `quoteFromText(t.text)`, bottom line = `creditFromTestimonial(t)`.
  - **Outcome:** quote = `quoteFromText(project.outcome)`; the bottom line is unchanged.
- **Add to homepage:** opens a new entry.
  - **Client:** the testimonial's business, or the project title.
  - **Quote:** as above. **Credit:** for testimonials only.
  - **Project:** `projectId` for an Outcome.
  - **Publish:** off, so it starts as a Draft.
- **If the entry has a number,** a note above the quote says "This entry shows its number on the homepage; the quote shows when there's no number."
- **Saving:** the existing rules apply. Validation, the copy-on-first-save for built-ins, the failed/stale-load guard, and reload after save are unchanged.

## Testing

- **Node** (`scripts/test-social-proof.mjs`):
  - `nameKey` (apostrophes, accents, "The", spacing)
  - testimonial matching
  - `unusedProof` (templates left out, linked projects left out, matched testimonials left out, blank Outcomes left out)
  - `quoteFromText` (200 cut at a word, first paragraph only)
  - `creditFromTestimonial` (blank parts, 60 cap)
- **Node** (`scripts/test-social-proof-admin.mjs`): pure helpers that build the drawer prefill from a testimonial or an Outcome.
- **Wiring:**
  - the tab button and panel exist
  - `social-proof` is in both `CONTENT_SUB_TABS` maps
  - the section is no longer inside `#admin-panel-testimonials`
- **Browser (WebKit, fake data only):**
  - the tab opens and shows cards with an Outcome and a matched testimonial
  - the not-yet list shows
  - Use fills the drawer, and nothing is written before Save
  - Add to homepage creates a Draft on Save
  - a failed testimonials read still renders the cards
  - no overflow at 393px
- **Preflight** green.

## Out of scope

- Editing testimonial text or Outcomes in this tab.
- Linking a testimonial to an entry by id (business-name matching only).
- Showing private testimonial answers.
- The open decisions from the first spec (drafts are publicly readable; testimonial private answers shown publicly).
