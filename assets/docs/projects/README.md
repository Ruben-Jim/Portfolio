# Portfolio canvas / case study files

## Public vs client-only

| Setting | Location | Audience |
|---------|----------|----------|
| **Canvas / case study file** | Portfolio project admin | Public portfolio modal (and portal if no hub override) |
| **Client portal guide (private)** | Project Hub → Portfolio section | That client’s portal only |

Use two `.md` files when the public site gets a short case study and the client gets a full feature guide.

## Formats

| Format | Site behavior |
|--------|----------------|
| **`.md`** | Renders inline (default) |
| **`.pdf`** | Embed + download |
| **`.canvas.tsx`** | Download note only — Cursor IDE source |

See [CANVAS-TO-MARKDOWN.md](./CANVAS-TO-MARKDOWN.md) for converting canvas → markdown.

## Naming

- Public: `project-<slug>.md`
- Client-only: `project-<slug>-client.md` or `project-<slug>-guide.md`
- Screenshots: `assets/images/projects/<slug>-features/*.png`

## Admin paths

```
/assets/docs/projects/project-rizopizzeria.md          ← public
/assets/docs/projects/project-rizopizzeria-client.md   ← hub private guide
```
