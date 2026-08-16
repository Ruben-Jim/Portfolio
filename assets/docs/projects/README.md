# Portfolio canvas / case study files

## Public vs client-only

| Setting | Location | Audience |
|---------|----------|----------|
| **Canvas / case study file** | Portfolio project admin | Public portfolio modal (and portal if no hub override) |
| **Client portal guides (private)** | Clients → Docs & guides | That client’s portal only — multiple guides supported |

Use separate `.md` files when the public site gets a short case study and the client gets one or more private guides (admin walkthrough, features, onboarding, etc.).

## Formats

| Format | Site behavior |
|--------|----------------|
| **`.md`** | Renders inline (default) |
| **`.pdf`** | Embed + download |
| **`.canvas.tsx`** | Download note only — Cursor IDE source |

See [CANVAS-TO-MARKDOWN.md](./CANVAS-TO-MARKDOWN.md) for converting canvas → markdown.

## Naming

- Public: `project-<slug>.md`
- Client-only: `project-<slug>-client.md`, `project-<slug>-guide.md`, or a folder per project with several guides
- Screenshots: `assets/images/projects/<slug>-features/*.png`

## Admin paths

```
/assets/docs/projects/project-rizopizzeria.md              ← public portfolio
/assets/docs/projects/lawncare/admin-guide.md              ← hub Docs & guides
/assets/docs/projects/rizo-pizzeria/rizo-features-guide.md ← hub Docs & guides
/assets/docs/projects/aimnshootrecords/admin-guide.md      ← hub Docs & guides
/assets/docs/projects/procleaning-team/android-access-guide.md   ← hub Docs & guides
/assets/docs/projects/procleaning-team/tap-to-pay-guide.md       ← hub Docs & guides
/assets/docs/projects/procleaning-team/admin-app-walkthrough.md  ← hub Docs & guides
```

### ProCleaning Team (client portal)

Add up to three **Docs & guides** rows for the ProCleaning client:

| Section title (example) | Path |
|-------------------------|------|
| Android access | `/assets/docs/projects/procleaning-team/android-access-guide.md` |
| Tap to Pay | `/assets/docs/projects/procleaning-team/tap-to-pay-guide.md` |
| App walkthrough | `/assets/docs/projects/procleaning-team/admin-app-walkthrough.md` |

WebP screenshots live next to the guides under `procleaning-team/screenshots/` (see `SCREENSHOT-CHECKLIST.md`).

There is no file upload in admin — add each `.md` in the repo, then in Clients → **Docs & guides** add a row per file (path + section title) → **Save docs & guides**. Guides open from **View guides** in the client portal. While a guide is open, the client can **download** the file or **share** it (system share sheet, or copy link).
