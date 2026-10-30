# Pricing tab and editable package prices

Date: 2026-10-29 · Status: approved by Ruben and built the same day (no separate plan, at his request) · See "As built" at the end

## Why

Ruben opens pricing to **set up offers before an outreach push, and to adjust prices when he needs to**. Two things get in the way today:

1. **The controls are buried.** "Pricing & offers" (care-plan yearly discount, new-client promo, limited-time package offers) sits at the bottom of the Clients tab, under the client board.
2. **Regular package prices can't be changed from the admin.** They're typed into the code and the site files: `care-pricing.js`, the Services page, Hire Me, `i18n.js`, `llms.txt`, meta tags, the Post builder templates and more. Changing one means a hunt through every file and a push.

It gets **its own tab, not a section of Studio Costs.** Studio Costs is what CWR pays. This is what clients pay, and it's used as a sales tool, not to check margins.

## Goals

1. **A new admin tab, Pricing.** It sits in the Agency nav group right after Outreach Scripts (`data-admin-tab="pricing"`). It holds the two sections that are under Clients today, moved there and working the same way:
   - **Package prices & offers**
   - **Care plan pricing** (yearly discount and new-client promo)
2. **Editable regular prices.** The package table gets a Regular price for every package, including Business Platform and Studio Build, which can't carry offers.
   - Packages sold as a range (Link Tree $99–$199, Business Platform $6,000–$12,000, Studio Build $15,000–$40,000) get a "from" and a "to".
3. **Saved prices are live at once.** A saved regular price shows up immediately, with no push, everywhere a visitor or prospect reads it as text:
   - the Services page (cards, buttons, FAQ copy)
   - Hire Me (package dropdown, copy)
   - the Link Tree / link-in-bio pages
   - page titles and descriptions set by `seo.js`
   - Outreach Scripts, Compose, the Post builder templates
   - new proposals and new pipeline values
   - English and Spanish alike
4. **Files catch up on push.** Typed copies in files (`llms.txt`, the HTML a crawler reads before scripts run, the share-preview meta tags, the defaults in `care-pricing.js`) are updated by `node scripts/sync-prices.mjs`. The pre-push gate (`scripts/preflight.mjs`) **refuses a push** while any typed copy disagrees with the live prices, and names the command to run.
5. **The tab says when files are behind.** It shows which packages' live prices differ from the prices the site files carry, and what to run before the next push.
6. **Saved content follows, from the dashboard.** Saved Outreach Scripts (`agencyOutreachScripts`) and email drafts (`agencyEmailDrafts`) are Ruben's own content in the database, so the file sync can't reach them.
   - **The search:** after a Save that changes any regular price, the tab looks through them for each old price as typed ("$3,500", "$3500"; for ranges, both ends).
   - **The review:** it lists every hit as a before → after line, with the script or draft name and a checkbox, all ticked by default. Ruben unticks anything that isn't that package's price, like an agency comparison.
   - **Applying it:** ticked hits are replaced with the new price, in one write per record. Unticked ones are left alone.
   - **The `[package]` token:** text that uses it already follows the live price, so it never shows up in the list.
   - **New scripts:** the built-in templates in `outreach-scripts-seed.js` use `[package]` where the sentence allows, and markers (covered by the file sync) where it doesn't. Scripts created from them start out current.

## Non-goals

- **Care-plan monthly prices** ($79 / $150 / $300) stay fixed in `care-pricing.js`. The yearly discount and promo stay editable, as today.
- **Images with prices baked in** (the share-preview PNGs, the Instagram example captures). They need re-rendering by hand. Their source pages can still read live prices.
- **Internal notes and docs:** `assets/docs/*.md`, READMEs, `docs/`.
- **Saved records keep the numbers they were saved with:** sent or saved proposals and invoices, stored pipeline lead values, Instagram posts already built. Outreach Scripts and email drafts are the exception (Goal 6). Their old prices are replaced only through the review list, never silently.
- **Offers stay where they show today.** The crossed-out price and badge on the Services cards, the CTA wording, Outreach and Compose phrases and the Hire Me dropdown are unchanged. New live spots show the regular price.
- **No automatic deploy.** Files change only when Ruben pushes.
- **No database rules change.** `/agencyPricing` is already public-read and admin-write.

## Anti-goals

- **A price on a loaded page that disagrees with the live price.** Before pricing loads, the page shows the code defaults, which the sync keeps equal to the live prices.
- **A push that ships a file whose typed price disagrees with the live price**, except when live prices can't be fetched (see "Calls made by Claude").
- **Rewriting dollar figures that aren't CWR package prices**, for example:
  - the matcher's budget brackets ("Under ~$1,500")
  - agency comparisons in scripts ("$15k–$40k")
  - the $149 middle tier in the Link Tree example
  - Turn-Key notes in the admin
  - client example prices
- **Breaking today's offers:** crossed-out price, badge, end date, spots and the claimed count.
- **A blank or $0 price while `/agencyPricing` loads.** The defaults stay synchronous, as `care-pricing.js` does now.
- **A newly typed package price that slips past the sync**, so "everywhere" quietly stops being true.

---

## Data

- **New:** `/agencyPricing/packagePrices/<packageId> = { price: number, max?: number }`, written alongside `packageOffers`.
- **Fallbacks:** a missing package, or a missing field, falls back to the `PACKAGES` defaults in `care-pricing.js`.
- **Validation:**
  - Whole dollars, with `price ≥ 1`.
  - `max` only on packages that are ranges today, and it must be above `price`.
  - Every enabled offer must stay above $0 and below its package's *new* regular price. If a price change breaks a live offer, Save is blocked, with a message naming the package.
- **Saving:** one Save writes `packagePrices` and `packageOffers` together, in a single `update` to `/agencyPricing`.

## The Pricing tab

- **Sections:** Package prices & offers first (most used), then Care plan pricing.
- **Package table columns:** Package · Regular price (one input, or From and To for ranges) · On · Offer price · Ends · Spots · Claimed · Status. Rows for packages that can't carry an offer show the offer cells as not available.
- **Files-behind notice:** compares live prices with the `PACKAGES` defaults that shipped in `care-pricing.js`. The sync keeps those equal to every typed copy, so a difference means the files are behind. Example: "Site files still show Starter $499 (live: $599). Run `node scripts/sync-prices.mjs` before your next push."
- **Save feedback:** "Prices saved: live on the site, scripts and proposals now. Files update on your next push."
- **The Clients tab loses its Pricing & offers section.**
- **Wiring:** the new tab follows the existing tab plumbing in `script.js`: `VALID`, nav-group and mobile tab-order maps, and whatever a new tab under the Agency group needs. The markup goes in `index.html`, then `node scripts/sync-spa-shells.mjs`. The existing init (`initCarePricingSettings` / `initPackageOffersSettings` in `agency-tools.js`) keeps binding by id.

## Where prices appear today

This inventory is a starting point. The builder audits every hit. These are counts of the current package prices as written:

| Place | Hits | Notes |
|---|---|---|
| 20 page shells (`index.html` + copies) | ~45 each, ~52 on services-pricing | Services cards, buttons, Hire Me options, admin notes |
| `assets/js/i18n.js` | 32 | English and Spanish strings |
| `assets/js/script.js` | 35 | includes email templates and admin text |
| `assets/js/post-builder/starters.json` | 50 | Instagram post templates |
| `examples/instagram/services.js` | 22 | the "what $499 vs $1,500 vs $3,500 gets you" kit |
| `assets/js/outreach-scripts-seed.js` | 12 | mixes real prices with "$15k–$40k" comparisons |
| `llms.txt` | 11 | |
| `examples/linktree/index.html` | 9 | includes the $149 example tier (not a package) |
| `linktree.html`, `link-in-bio.html` | 6, 5 | includes `<title>` / `og:` meta ("from $99", "from $499") |
| `examples/og/og.html` | 5 | source for share images (the images themselves are a non-goal) |
| `outreach-composer.js`, `seo.js`, `agency-tools.js` | 4, 3, 3 | |

Each hit is one of three kinds:

- **(a) A CWR package price.** It follows that package.
- **(b) A derived phrase.** "packages from $499" follows the cheapest website package; "Link Tree from $99" follows Link Tree's "from" price.
- **(c) Not a package price.** It's left alone and allowlisted for the check.

## How prices reach each place

- **Live, at runtime.**
  - `care-pricing.js` loads `packagePrices` with the offers.
  - Its `notify()` already re-publishes i18n vars, re-renders the language and re-applies `[data-package-price]`.
  - Package tokens get added to `i18nVars()` (per package, plus "to" values and the derived "from" phrases), and typed prices in `i18n.js` become tokens.
  - `[data-package-cta]` follows regular-price changes, not only offers.
  - `seo.js`, Outreach, Compose and the Post builder templates read prices when they render.
  - HTML-only text that i18n doesn't cover gets a marker that runtime code fills.
- **Files, on push.**
  - `scripts/sync-prices.mjs` reads `https://portfolio-2578e-default-rtdb.firebaseio.com/agencyPricing.json` (public read) and rewrites every marked typed copy: the `index.html` markers (then runs `sync-spa-shells.mjs` so all 20 shells match), the `PACKAGES` defaults, `llms.txt`, meta tags and JSON templates. It prints what it changed.
  - The exact marker convention is the builder's call. The constraint: the script finds every typed package price **without guessing**, and never touches a (c) figure.
- **Gate.**
  - `preflight.mjs` runs the same comparison in check mode. It fails with the list of stale spots and the command to run.
  - It also fails on any **unmarked** dollar figure in public files that equals a current package price and isn't on the allowlist, so a newly typed price can't slip past.

## Tests

- **Node** (a new `scripts/test-prices.mjs`, run by preflight):
  - resolving prices: defaults, partial overrides, ranges
  - validation, including an offer that a new price breaks
  - token rendering, English and Spanish
  - the sync script's rewrite and check against fixture files
  - leaving (c) figures alone
- **Harness** (the scratchpad Playwright harness with the in-memory RTDB):
  - The Pricing tab renders; Clients no longer has the section.
  - Saving a new regular price updates the Services card, the CTA, the Hire Me dropdown, a Spanish string, an Outreach `[package]` phrase and the `seo.js` title, with no reload.
  - A price change that breaks a live offer blocks Save.
  - The files-behind notice appears.
  - After a price change, a seeded script with "$3,500" is listed, and an "$15k–$40k" line isn't.
  - Applying the review updates only the ticked hits.
  - Checks run at 1440 and 390.
- **Gate:** `node scripts/preflight.mjs` stays green once the files are synced.

## Calls made by Claude (not discussed with Ruben)

- **Placement:** the tab goes in the Agency group, right after Outreach Scripts.
- **Ranges:** range packages get editable "from" and "to". The other packages get a single price.
- **Section order:** Package prices & offers comes first in the tab.
- **Offers don't spread:** derived phrases ("packages from $499") show regular prices even while an offer runs.
- **Offline push:** if live prices can't be fetched at push time, the gate warns and lets the push through rather than blocking.
- **Files-behind check:** it compares against the `PACKAGES` defaults in `care-pricing.js`, which the sync keeps equal to the files.
- **Matcher brackets stay put:** the budget brackets ("Under ~$1,500", "~$1,500 – $2,750") are left as they are. They're questions a visitor answers, not prices CWR quotes.
- **Names stay fixed:** package names and IDs aren't editable; only prices are.
- **Example pages:** `examples/` pages that don't already load `care-pricing.js` are kept current by the file sync on push, not live. They're marketing captures, rebuilt by hand anyway.
- **Saved content** (Goal 6; Ruben said "do whatever's best, edit from the admin dashboard"):
  - The tab offers a review list after a price change, rather than rewriting silently or not at all.
  - It covers Outreach Scripts and email drafts. Proposals, invoices and built posts stay as saved.
  - The list appears only right after a Save that changed a price. There's no standing "scan for old prices" button.

## As built (2026-10-29)

Calls made while building, beyond the ones above:

- **REST read.** `care-pricing.js` reads `/agencyPricing` over the database's public REST URL when the Firebase SDK isn't ready. That covers the Link Tree pages, the examples, and the SPA before Firebase boots, so live prices don't wait for the SDK.
- **Shell SEO tags.** `sync-spa-shells.mjs` stamps titles and descriptions with the prices filled in. Tags whose `seo.js` text has a `{pkg_*}` token also carry `data-price-template`, so the sync and the check treat them like any other typed copy.
- **Starters.** `starters.json` was rebuilt with `{pkg_*}` tokens; the Post builder fills them on every use. The kit is still measured with real prices, and the dump turns them back into tokens. Swapped back, the rebuild is identical to a fresh build of the last commit. It also brings in kit layout changes made since the 2026-09-19 build.
- **The Cloud Function** (`functions/inbound-leads.js`) reads `/agencyPricing/packagePrices` for each Hire Me lead and keeps its table as the fallback. Deploy it once (`firebase deploy --only functions`); after that, a price change needs no deploy.
- **The push gate** (`preflight.mjs`) does three things:
  - checks every typed copy against the `care-pricing.js` defaults
  - fails on any unmarked package price outside `scripts/price-allowlist.json`
  - compares the live prices with the files, warning instead of failing when offline
- **`test-reviews.mjs`** used to require an exact cache-buster string. It now accepts that buster or a newer one, so later bumps of the same files don't break it.
- **`PRICES_FILE=<json>`** makes `sync-prices.mjs` and preflight read prices from a file instead of the database, for dry runs and tests.
