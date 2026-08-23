# Client Link Tree templates

Reusable link-in-bio pages for CWR clients. Copy the folder that matches the sold tier, then rebrand.

| Path | Tier | Sample brand | What’s in it |
|------|------|----------------|--------------|
| `index.html` | Starter / ink.bio | Valley Green Lawn Care | Avatar, bio, socials, stacked links, CWR credit |
| `99/` | **$99 Foundation** | Ruiz Lawn Care | Hours, map, EN/ES, 2 reviews, action links, click count, CWR credit |
| `149/` | **$149 Enhanced** | Central Fades | Everything in $99, plus promo countdown, owner intro, video, before/after slider, FAQ, live chat, stats — no CWR credit |
| `199/` | **$199+ Premium** | ProCleaning Seattle | Everything in $149, plus team bios, IG grid, extra reviews, owner snapshot |

Plans comparison (not a live page): `/examples/linktree/`

Shared theme + widgets: `linktree.css` + `linktree.js`.

## Quick rebrand

1. Copy the matching folder (or start from `index.html` for a simple stacked list).
2. Update `:root` CSS variables (`--bg`, `--brand`, `--link-bg`, …).
3. Swap **name**, **bio**, **avatar**, **map**, **links**, and copy.
4. Update `<title>` and `<meta name="description">`.
5. Remove the footer credit for white-label / $149+ if needed.

## Deploy options

- **Subdomain:** `links.clientdomain.com`
- **Path:** `clientdomain.com/links`
- **Custom domain:** DNS A/CNAME at the host; HTTPS via the host

No build step — static HTML.

## Scope notes

- These are static demos / deliverables, not a multi-tenant CMS.
- Aim N Shoot–style Firebase Linktree admin is a separate pattern when the client needs self-serve link editing.
