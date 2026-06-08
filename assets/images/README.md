# Image workflow (assets-only)

Use local image files under `assets/images` for all portfolio content.

## Folder structure
- `assets/images/projects/` for project cards and gallery slides.
- `assets/images/blog/` for blog post cover images.
- `assets/images/logo/` for favicon, brand logos, and client logos.
- `assets/images/avatar/` for profile and testimonial avatars.
- `assets/images/icons/` for UI icon assets (SVG preferred).

## Path standard
- Always use root-relative paths: `/assets/images/...`
- Do not use `./assets/images/...` in new code.
- Keep exact file casing in references (`logo.svg` vs `Logo.svg`).

## Naming convention
- Projects: `project-<slug>.webp` (or `.png` if needed)
- Blog: `blog-<number>.jpg` (or `.webp`)
- Logos: `logo-<variant>.png` and `logo.svg`
- Avatars: `avatar-<number>.png` or descriptive names like `my-avatar.png`

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

Store MP4 demos alongside project screenshots under `assets/images/projects/`.

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
- Video: `project-<slug>-demo.mp4`
- Poster: `project-<slug>-demo-poster.webp`
- Admin path: `/assets/images/projects/project-<slug>-demo.mp4`

Add new `.mp4` paths to `PORTFOLIO_ASSET_IMAGES` in [`assets/js/portfolio-built-in-data.js`](../js/portfolio-built-in-data.js) so they appear in the admin asset picker.

## Upload checklist
1. Put the file in the correct subfolder.
2. Rename file to follow the naming pattern.
3. Compress/optimize before committing.
4. Reference with `/assets/images/...` path.
5. Verify media loads on:
   - `/` (public site)
   - `/admin/` (admin dashboard)
   - any standalone page using the same asset
