# Portfolio skins: label, order, home-page cover, and an admin Skins section

Date: 2026-10-15
Status: approved in chat, awaiting spec review

## Goal

Make a platform with vertical skins (for example the Chair & Studio Platform with Barber Shop and Tattoo Shop skins) easy to edit as one thing, and make its portfolio card show each skin's home page.

Success looks like:

- In admin, one place on the platform's editor shows every skin with its card label, card cover and order, plus a live preview of the rotating card.
- Tattoo Shop's card slide can show its home page (the demo video's poster) instead of its first screenshot.
- Saving a skin from its own editor never erases its label, order or cover.

## Background (how it works today)

- A platform is a `portfolioProjects/{id}` record with `isTemplate: true`.
- A skin is a separate `portfolioProjects/{id}` record whose `builtFromTemplateId` is the platform's id. `getPortfolioDerivedBuilds()` in `assets/js/script.js` finds them.
- The public card rotates the platform's still, then each skin's still (`portfolioRenderCardRotatorHtml`). The platform slide is always labelled "Platform"; each skin slide is labelled with the skin's full title.
- The public popup shows the same items as tabs (`renderPortfolioVariantTabs`), in record order.
- A slide's still is `portfolioCardStillUrl()`: the cover picked in admin (`coverImageUrl`), else `portfolioAutoCoverStillUrl()` (first customer-facing screenshot, then a video poster).
- `coverImageUrl` must be one of the record's `imageUrls`. A video's poster is not a slide, so it can't be picked. That's why Tattoo Shop shows `inktattoo-1.webp` (Work & Sessions) rather than `inktattoo-demo-poster.webp` (the home page).
- Saving a project in admin overwrites the whole record with `portfolioSanitizeDocumentPayload()` output, which is an allow-list. Any field not on the list is dropped on save.

## Decisions made in chat

| Question | Choice |
|---|---|
| How to edit skins | A Skins section on the platform's editor (skins stay separate records) |
| Platform rename | "Chair & Studio Platform", portfolio only (done separately; not part of this spec) |

## Data model

New optional fields on any `portfolioProjects` record. Both default to today's behavior when missing.

| Field | Type | Meaning | When missing |
|---|---|---|---|
| `skinLabel` | string, trimmed, max 40 chars | Short label on the card slide and popup tab ("Tattoo Shop", "Beauty Salon") | Skins use their title. The platform uses "Platform" |
| `skinOrder` | number | Position among the platform's skins (lower first) | Skins without a number keep their current relative order, after numbered ones |

`coverImageUrl` gains one allowed value: the poster of one of the record's own video slides, as returned by `portfolioVideoPosterUrlBest(videoUrl)`. Anything else still clears to auto.

No database rules change. `portfolioProjects` is already admin-write, public-read, with no field validation.

## Pure helpers: `assets/js/portfolio-skins.js`

A new small file, written so both the browser (`window.PortfolioSkins`) and Node tests (`module.exports`) can load it. It has no DOM or Firebase access. The poster lookup is passed in.

- `isAllowedCover(record, url, posterOf)`: true when `url` is in `record.imageUrls`, or equals `posterOf(v)` for a video `v` in `record.imageUrls`.
- `coverChoices(record, posterOf)`: `[{ value: '', label: 'Auto' }]`, then one entry per screenshot, then one "Home page (video poster)" entry per video that has a poster.
- `labelFor(record, isPlatform)`: `skinLabel` trimmed, else `title` for a skin, else `"Platform"` for the platform.
- `orderSkins(skins)`: stable sort by `skinOrder`; records without a number keep their incoming order and come after numbered ones.
- `skinPatch(fields)`: returns only `skinLabel`, `skinOrder` and `coverImageUrl` from `fields`, cleaned (label trimmed and capped, order a finite number or `null`, cover a string).

## Public site changes

- Card rotator (`portfolioRenderCardRotatorHtml`): platform slide label is `labelFor(platform, true)`; skins come from `orderSkins(getPortfolioDerivedBuilds(p))` and use `labelFor(skin)`.
- Popup tabs (`renderPortfolioVariantTabs`): same labels and order, so the tab index still matches the card's `data-variant-index`.
- "Built with this template" list (`portfolio-detail-shared.js`): same order. It keeps full titles, since it describes businesses. It uses `window.PortfolioSkins` only when loaded (the portal loads this file too).
- `portfolioExplicitCoverUrl` accepts a video-poster cover via `isAllowedCover`.
- Nothing else on the public site changes.

## Saving rules

- `portfolioSanitizeDocumentPayload` adds `skinLabel` and `skinOrder` to its allow-list and validates `coverImageUrl` with `isAllowedCover`.
- The project editor keeps the loaded record's `skinLabel` and `skinOrder` and writes them back unchanged, so saving a skin from its own editor never erases them.
- The media list (Slides) shows a "Set poster as cover" action on video slides that have a poster, next to the existing "Set as cover" on stills.

## Admin: the Skins section

A new collapsible section in the project editor, "Skins", placed after "Starter template". Shown only when "Starter template" is on and the project is already saved (has an id).

Rows, top to bottom:

1. **The platform itself**: thumbnail of its card cover, its title, a Card label box (placeholder "Platform"), and a Cover dropdown. Its cover is the same value as the Slides list's card cover, so the two stay in sync. No reorder buttons; the platform is always first.
2. **One row per skin**, in `orderSkins` order:
   - thumbnail of its current card cover
   - full title, and **Edit full skin →** (goes through the existing unsaved-changes prompt, then opens that skin in the editor)
   - **Card label** box (placeholder: the skin's title)
   - **Cover** dropdown from `coverChoices`
   - **↑ / ↓** buttons
   - chips: "Private" when the skin is private; "No images yet — not on the card" when it has no media

Below the rows:

- **+ Add skin**: goes through the same unsaved-changes prompt as Edit full skin, then opens a new-project form with "Built from starter template" already set to this platform. Nothing is created until that form is saved.
- **Card preview**: a small card cover rendered with `portfolioRenderCardRotatorHtml` from the in-form values (labels, covers, order), rotating like the public card. It updates as fields change.

### Saving the Skins section

- The platform's normal **Save** saves everything. The platform's own `skinLabel` and cover go in its record as usual.
- For each skin whose label, order or cover changed, one partial update: `rtdbUpdate(portfolioProjects/{skinId}, skinPatch(...))`. Other fields on the skin are never touched.
- Order is saved as `skinOrder` 10, 20, 30… for every skin once any reorder happens, so later inserts don't collide.
- If any skin update fails, the error names that skin and the editor stays open; already-saved skins are not rolled back. Saving again retries.

## Files

- New: `assets/js/portfolio-skins.js`, loaded before `script.js` in `index.html` (then `node scripts/sync-spa-shells.mjs`), and in `portal.html` before `portfolio-detail-shared.js`.
- `assets/js/script.js`: rotator, tabs, explicit cover, sanitizer, editor carry-through, media list poster action, Skins section.
- `assets/js/portfolio-detail-shared.js`: built-with list order.
- `index.html`: Skins section markup, then sync.
- `assets/css/style.css`: Skins section styles.
- New test: `scripts/test-portfolio-skins.mjs` (runs in preflight with the other suites).
- Cache-buster bumps for every changed file, across all shells.

## Testing

- `scripts/test-portfolio-skins.mjs`:
  - `isAllowedCover`: a still and a video's poster are allowed; a random URL, another record's image, and a poster of a video not on the record are not.
  - `coverChoices`: Auto first, then stills, then one poster entry per video with a poster.
  - `labelFor`: label trimmed and capped at 40; falls back to title, and to "Platform" for the platform.
  - `orderSkins`: numbered first by number; missing numbers keep their order after them; stable for ties.
  - `skinPatch`: only the three fields come out; bad order becomes `null`.
- Browser check (local server, fake portfolio data, saving blocked):
  - Skins section appears only for a saved template.
  - Reorder, label and cover changes update the card preview.
  - Save sends one partial update per changed skin with only the three fields, and none for unchanged skins.
  - A failing skin update shows its name and keeps the editor open.
  - Public card and popup tabs use the labels and order; picking Tattoo Shop's video poster shows its home page.
  - Saving a skin from its own editor keeps its label, order and cover.
- `node scripts/preflight.mjs`.

## Rollout

- No Firebase deploy and no data migration. Existing records have no new fields and render exactly as today.
- After the push, in admin: open the Chair & Studio Platform, set Tattoo Shop's cover to "Home page (video poster)", and optionally set labels (for example the platform's label to "Beauty Salon").

## Out of scope

- Merging skins into the platform record.
- Renaming the live demo app or its address.
- Creating skin records from the Skins section directly (Add skin uses the normal new-project form).
