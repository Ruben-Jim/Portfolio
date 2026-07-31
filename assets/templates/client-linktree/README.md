# Client Link Tree template

Reusable ink.bio-style link-in-bio page for CWR clients. Used as the deliverable for:

- Standalone **Link Tree** ($99–$199)
- Included bio link on Starter / Growth / Business / Studio builds

## Quick rebrand

1. Copy this folder for the client (or open `index.html` and edit in place).
2. Update `:root` CSS variables at the top of `index.html`:

| Variable | Purpose |
|----------|---------|
| `--bg` / `--bg-accent` | Page background |
| `--text` / `--text-muted` | Copy colors |
| `--brand` / `--brand-soft` | Accent + soft glow |
| `--link-bg` / `--link-bg-hover` / `--link-border` | Link button surfaces |

3. Swap **name**, **bio**, **avatar** (img or initials), **social URLs**, and **stacked links**.
4. Update `<title>` and `<meta name="description">`.
5. Remove the footer credit for white-label / buyout if needed.

## Deploy options

- **Subdomain:** `links.clientdomain.com` → host `index.html` on Firebase Hosting, Netlify, or Cloudflare Pages
- **Path:** `clientdomain.com/links` or a CWR-hosted path during launch
- **Custom domain:** point DNS A/CNAME at the host; HTTPS via the host

No build step — one static HTML file.

## Scope notes

- Not a multi-tenant SaaS (no owner CMS, scheduling, or analytics dashboard in this template).
- Aim N Shoot–style Firebase Linktree admin is a separate product pattern when the client needs self-serve link editing.
