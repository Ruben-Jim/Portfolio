# Reviews tab: testimonials and Google reviews in one place

Date: 2026-10-20 · Status: draft for Ruben's review · Mockup: `.superpowers/brainstorm/8318-1792481292/content/reviews-tab.html` (local only)

## Why

Clients don't all leave feedback the same way. Some fill in the testimonial form, some reply by email (Shelton Springs did), and some post on Google. Ruben wants all of it in one admin list, and wants to choose what shows on rubenjimenez.dev.

Google reviews also help local search. The testimonial form already asks every client to post their words on Google too (built 2026-10-20). This tab is the other half: getting those Google reviews back onto the site, and asking past clients to post theirs.

## What Ruben decided

- **Google reviews are added by hand** in Admin (option 3). There is no automatic import: Google's listing API only returns 5 reviews and needs billing, and the Business Profile API needs Google's approval first.
- **The admin Testimonials tab becomes "Reviews."** One list shows form testimonials, emailed ones, and Google reviews, with an **Add review** button.
- **Every review has its own "On site" switch.** When a client has both a testimonial and a Google review, Ruben can show one, the other, or both as two separate slides.
- **He approved the mockup**, including the guesses in it, marked below as "my call."
- **Public names:** the nav says **Reviews**, and the Home page heading says **Reviews & Testimonials**.

## Goals

- One list, newest first, of everything clients have said, each tagged with where it came from: **Testimonial form**, **Email**, or **Google**.
- Unused invites stay in the same list as **Waiting on them**, with Copy link and Delete link (today's behavior).
- Ruben can add a Google review or an emailed one in under a minute.
- Ruben can hide any review from the site without deleting it.
- Ruben can ask any past client to post their words on Google with one button that writes the email.

## Non-goals

- No automatic Google import, and no Google API key or billing.
- No posting to Google for a client. Every Google review is posted by the client from their own Google account.
- The `/testimonials` web address stays the same, so old links keep working. *(My call.)*
- No change to what a form testimonial shows publicly (stars, quote, badges, notes). The open question about the two testimonials submitted under the old "only Ruben sees this" wording is separate.
- Nothing changes in the client portal or the booking page.

## Anti-goals (failure even if it works)

- **Review gating.** "Ask for a Google review" appears on every testimonial and email row, whatever the rating. The tool never filters by stars. Google forbids asking only happy clients.
- **Anything that looks like a fake review.** A Google review is only added if it really exists on Google, with the client's name and words exactly as posted.
- **Breaking the client form.** A client submitting through an invite must work exactly as today, including blank job title and business.
- **A client spoofing the labels.** A client's form submission must not be able to set `source`, `hidden`, or `reviewUrl`.

## The Reviews tab (admin)

- **Rename:** the desktop tab label becomes **Reviews** (the mobile label already says Reviews), including its `aria-label`. The section heading "Testimonial requests" becomes **Reviews**, with the lead: "Testimonials, Google reviews, and emailed ones. Switch on what shows on the site."
- **Buttons:** **Request a testimonial** (unchanged) and **Add review**. Add review replaces yesterday's "Add from an email" button. *(My call, shown in the mockup.)*
- **Filter chips with counts:** All · On site · Google · Waiting on. *(My call.)*
- **One row per review**, newest first. Each row shows the name, a source tag, the stars (or "no stars given"), the start of their words, and the **On site** switch. Hidden rows are dimmed.
- **Row actions:**
  - Testimonial form: View questionnaire · Ask for a Google review · Remove
  - Email: Ask for a Google review · Edit · Remove
  - Google: Open on Google (only when a link was saved) · Edit · Remove
  - Waiting on them: Copy link · Delete link (no switch)
- **Remove** deletes the review for good, after a `CwrUI.confirm` (danger tone). The switch is the way to hide one without losing it.
- **A used invite whose testimonial was removed** no longer gets a row. *(My call.)*
- **The switch** saves straight away. If the save fails, it flips back and shows a `CwrUI.toast` error.

## Add review form

A popup on the modal layer, built the same way as yesterday's "Add from an email" form, which it replaces. The same form opens prefilled for **Edit**.

- **Where's it from?** Google / Email (two buttons; Google selected first). *(My call.)*
- **Their name** (required)
- **Job title, Business, Product / service** (optional)
- **Stars:** required for Google, since every Google review has stars. Optional for Email ("No rating").
- **Their words** (required for both). A Google review with stars but no words isn't added. *(My call.)*
- **Link to the review** (Google only, optional). On Google, the ⋮ menu on a review has "Share review."
- **Date posted** (optional, defaults to today). It is saved as `createdAt`, so the card shows when they posted it and sorts correctly. *(My call.)*

## Ask for a Google review

The button opens Compose (`openAdminClientEmailCompose`) with:

- **To:** the invite's email if one was saved, otherwise blank.
- **Button:** "Post on Google →", linking to `window.CWR_GOOGLE_REVIEW_URL`.
- **Subject:** "A quick favor: your review on Google"
- **Message:** a short thank-you, then their own words quoted so they can copy and paste them, and a note that the button opens Google. It is written in Ruben's voice, the same tone as the testimonial request, and editable in Compose before sending.

## On the site

- **Names (Ruben's decision):** the nav says **Reviews**, which is shorter than "Testimonials." The Home page section's small heading says **Reviews & Testimonials**. Through `i18n.js`:
  - `nav.testimonials`: Reviews / Reseñas
  - `home.testimonials_kicker`: Reviews & Testimonials / Reseñas y testimonios
- **The Testimonials page title** (`testimonials.title`, and the page's browser-tab title) also becomes **Reviews & Testimonials**, so the nav and the page match. *(My call.)*
- Hidden reviews are left out **before** the newest-40 cut, the Home page's 2 cards, and the hero quote (`fillHeroQuote`).
- A Google review uses the same card, plus a small **Google** tag next to the name and a **Posted on Google ↗** link. The link goes to the saved review link, or else to Ruben's Google listing (`https://www.google.com/maps/place/?q=place_id:ChIJK4OmDZEA9EUREUdNK2vpLZE`, kept in `config.js` beside the review link). *(My call.)*
- Avatars work as today: the default avatar, changeable with the existing photo picker.
- In Admin → Social proof, hidden reviews still appear on the client cards, tagged **Hidden**, and can still be used. *(My call.)*

## Data and rules (`firestore.rules`)

Collection `testimonials`. All new fields are optional, so existing documents need no migration.

| Field | Meaning |
|---|---|
| `hidden` | `true` = not shown on the site. Missing = shown. |
| `source` | `'email'` or `'google'` for reviews Ruben adds. Missing = testimonial form. |
| `reviewUrl` | Google only: `https://` link to the review, ≤ 500 characters |
| `rating` | Required for Google, optional for email, required for the form (unchanged) |

- **Create, admin:** generalize `validEmailTestimonial()` into `validAdminReview()`. It requires `source` to be `'email'` or `'google'`, a name, and their words, and allows nothing extra. Google also needs a 1–5 rating, and `reviewUrl` is allowed only for Google. `hidden` is allowed as a boolean.
- **Create, client (invite):** unchanged, plus it may not include `source`, `hidden`, or `reviewUrl`.
- **Update, admin:** keep today's avatar-only and text-only branches, and add two more:
  - a branch where only `hidden` changes (a boolean, any review);
  - a full edit for reviews Ruben added: `resource.data.source` is `'email'` or `'google'`, `source` is unchanged, and the result passes `validAdminReview()`.
- **Delete:** admin, unchanged.
- **Deploy order:** `firebase deploy --only firestore:rules` before pushing, as in `portfolio-security.md`. Until then, adds, edits and the switch fail with the existing "deploy the Firestore rules" message.

## Constraints

- **Legacy stack:** plain HTML/CSS/JS. Markup goes in root `index.html`, then run `sync-spa-shells.mjs`. Bump the `?v=` of `script.js`, `style.css` and `config.js` in every shell copy, and match `testimonial.html` to the same `style.css` version (a test guards this).
- **Admin popups and overlays:** use `window.CwrUI` only, never browser popups; overlays use `data-layer` with no z-index.
- **Public pages load nothing new.** The admin code stays where the testimonials admin code lives today.
- **Live data:** read field names and counts only, never contents.
- **Tests:** extend `scripts/test-testimonial-form.mjs`, or add `scripts/test-reviews.mjs` if it grows. Add a WebKit check with fake Firestore for the admin tab, the switch, Add/Edit, the Google card, and hidden filtering, at desktop and phone widths. Preflight must pass.

## Left to the builder

- Whether the list code is reworked inside `loadTestimonialAdminPanel` or split into a small helper; it renders rows per invite today.
- Exact wording of the Compose message and the empty states.
- Exact switch styling, reusing the Social proof drawer's switch if it fits.
- How the filter chips remember their choice. Not remembering is fine.

## Already built (2026-10-20, not part of this work)

The testimonial form's finish screen says "Your testimonial has been sent" and asks every client to post on Google. Its "Copy my words & open Google" button uses `window.CWR_GOOGLE_REVIEW_URL` from `config.js`.
