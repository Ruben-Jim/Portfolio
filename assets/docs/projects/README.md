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
```

There is no file upload in admin — add each `.md` in the repo, then in Clients → **Docs & guides** add a row per file (path + section title) → **Save docs & guides**. Each guide appears in the portal as its own open section (not inside collapsed Project showcase). Up to 8 guides per client.
