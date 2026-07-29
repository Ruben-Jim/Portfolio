# Image workflow (assets-only)

Use local image files under `assets/images` for all portfolio content.

## Folder structure
- `assets/images/projects/` for project cards and gallery slides.
- `assets/images/projects/<slug>/` optional per-project folder (screenshots + demos for one app).
- `assets/images/blog/` for blog post cover images.
- `assets/images/logo/` for favicon, brand logos, and client logos.
- `assets/images/avatar/` for profile and testimonial avatars.
- `assets/images/icons/` for UI icon assets (SVG preferred).

## Path standard
- Always use root-relative paths: `/assets/images/...`
- Do not use `./assets/images/...` in new code.
- Keep exact file casing in references (`logo.svg` vs `Logo.svg`).

## Naming convention
- Projects (flat): `project-<slug>.webp` (or `.png` if needed)
- Projects (folder): `assets/images/projects/<slug>/<screen>.png` — e.g. `realtor-template/login.png`, `dls/dls-video.mp4`
- Blog: `blog-<number>.jpg` (or `.webp`)
- Logos: `logo-<variant>.png` and `logo.svg`
- Avatars: `avatar-<number>.png` or descriptive names like `my-avatar.png`

## Admin “From repo” picker (required step)

Putting files on disk is **not** enough for the Portfolio admin dropdown. Register each path in `PORTFOLIO_ASSET_IMAGES` inside [`assets/js/portfolio-built-in-data.js`](../js/portfolio-built-in-data.js).

Example for a new folder `assets/images/projects/my-app/`:

```js
'/assets/images/projects/my-app/home.webp',
'/assets/images/projects/my-app/admin.webp',
'/assets/images/projects/my-app/demo.mp4',
```

Then hard-refresh `/admin/`, open **Add / Edit portfolio project**, and pick files under **From repo** (or paste the same path in **Custom URL**).

## Optimization targets
- Card/thumb images: aim for `150-400 KB`
- Large hero images: keep under `700 KB` when possible
- Prefer WebP/AVIF for photos, SVG for icons/logos
- Use dimensions close to render size (avoid huge originals)

## Accessibility + UX
- Add meaningful `alt` text for non-decorative images.
- Use `loading="lazy"` on non-critical images.
- Keep a fallback image for missing project images:
  `/assets/images/projects/project-comingsoon.svg`

## Screen recordings (portfolio slideshow)

Store MP4 demos alongside project screenshots under `assets/images/projects/` or `assets/images/projects/<slug>/`.

### Record on Mac
- **Cmd+Shift+5 → Record Selected Portion** — crop to the browser window, not full Retina desktop.
- Keep clips **10–30 seconds**. macOS saves `.mov` (often HEVC) — convert before committing.

### Export for web
| Setting | Target |
|--------|--------|
| Container | `.mp4` |
| Codec | H.264 (AVC), `yuv420p` |
| Resolution | 1920×1200 or 1600×1000 (16:10) |
| Frame rate | 30 fps |
| Audio | Remove for UI walkthroughs |
| Size | **2–8 MB** per clip |

**ffmpeg example** (from repo root):

```bash
ffmpeg -i ~/Desktop/recording.mov \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 23 -preset slow \
  -movflags +faststart -an \
  assets/images/projects/project-<slug>-demo.mp4
```

**Poster frame** (optional, for card thumbnail + admin preview):

```bash
ffmpeg -i assets/images/projects/project-<slug>-demo.mp4 \
  -frames:v 1 assets/images/projects/project-<slug>-demo-poster.webp
```

### Naming
- Video: `project-<slug>-demo.mp4` (or any clear name, e.g. `video-home.mp4`)
- Poster (pick **one** convention — both work in the portfolio player):
  - **Sibling still:** `dls-video.mp4` → `dls-video.webp` (good when the still is also a slide by itself)
  - **Classic poster:** `video-home.mp4` → `video-home-poster.webp` (prefer WebP; `.jpg` still works as fallback)
- Admin path: `/assets/images/projects/...`

If you only need a still (no playback), add just the `.webp` / `.jpg` and skip the `.mp4`.

Add new image/video paths to `PORTFOLIO_ASSET_IMAGES` in [`assets/js/portfolio-built-in-data.js`](../js/portfolio-built-in-data.js) so they appear in the admin asset picker.

## Upload checklist
1. Put the file in `assets/images/projects/` or `assets/images/projects/<slug>/`.
2. Rename file to follow the naming pattern.
3. Compress/optimize before committing.
4. Add the `/assets/images/...` path to `PORTFOLIO_ASSET_IMAGES` in `portfolio-built-in-data.js`.
5. Verify media loads on:
   - `/` (public site)
   - `/admin/` (admin dashboard)
   - any standalone page using the same asset
