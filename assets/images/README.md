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

## Upload checklist
1. Put the file in the correct subfolder.
2. Rename file to follow the naming pattern.
3. Compress/optimize before committing.
4. Reference with `/assets/images/...` path.
5. Verify image loads on:
   - `/` (public site)
   - `/admin/` (admin dashboard)
   - any standalone page using the same image
