# Converting `.canvas.tsx` → Markdown for the portfolio site

Cursor Canvas (`.canvas.tsx`) does not run on your static site. Publish a **`.md`** file (with separate image files) for visitors and clients.

## Best workflow (recommended)

### 1. Keep the canvas as your draft

- Author in Cursor: `assets/rizo-features-guide.canvas.tsx` or `canvases/<name>.canvas.tsx`
- Structured data like `STEPS[]` + `IMAGES{}` is ideal for conversion

### 2. Export screenshots to real image files

**Do not** paste base64 into Markdown — your Rizo canvas is ~2.6 MB because images are embedded in `IMAGES{}`.

For each `imageKey` in the canvas:

1. Decode base64 to PNG (one-time script or manual export from canvas previews)
2. Save under e.g. `assets/images/projects/rizo-features/home.png`
3. Reference in MD: `![Home](/assets/images/projects/rizo-features/home.png)`

### 3. Generate Markdown from `STEPS` + headings

Use the text already in the canvas (`H1`, `Callout`, `STEPS[].title`, `STEPS[].caption`). Example structure:

```markdown
# Rizo Pizza — New Features Guide

*Updated May 2026*

> Note from Ruben: …

## Step-by-step

### 1. Home page
What customers see on first load…

![Home](/assets/images/projects/rizo-features/home.png)

### 2. Menu + pop-up event
…
```

**Fastest in Cursor:** open the `.canvas.tsx` and ask:

> Export this canvas to `assets/docs/projects/project-rizopizzeria.md`. Write each STEPS title as `###`, caption as body text, save each IMAGES key as PNG under `assets/images/projects/rizo-features/`, and link images in the md. Do not embed base64.

### 4. Two files when you need public + private guides

| File | Who sees it | Where to configure |
|------|-------------|-------------------|
| `project-rizopizzeria.md` | Public portfolio visitors | Portfolio project → **Canvas / case study file** |
| `project-rizopizzeria-client.md` | This client’s portal only | Project Hub → **Client portal guide (private)** |

Same project can use a shorter public case study and a longer private walkthrough for the client.

## Where docs appear

```text
.canvas.tsx     → Cursor IDE only (source)
.md on portfolio → Public site modal + client portal (unless overridden)
.md on hub      → Client portal only (overrides portfolio canvas for that client)
```

## Checklist

- [ ] Images exported to `/assets/images/projects/...` (not base64 in md)
- [ ] `.md` committed under `assets/docs/projects/`
- [ ] Public path set on portfolio project (if public)
- [ ] Private path set on Project Hub (if client-specific)
- [ ] Hard-refresh portal after save
