# Blog covers

Every rubenjimenez.dev post gets its cover from its **category** (decided 2026-10-15). There is one house-style cover per category, made with Higgsfield.
This file is private. `docs/` is not in `PUBLIC` in `scripts/build-site.mjs`.

## How it works

- Files: `assets/images/blog/category/<slug>.webp`, 1344×752, cwebp q82, about 6–16 KB each. `assets/` ships with the site.
- Code: `assets/js/blog-covers.js` (`window.BlogCovers`), loaded on every page before `script.js`. Tested by `scripts/test-blog-covers.mjs`.
- A post with an **empty image**, or a leftover template placeholder (`blog-1.jpg` to `blog-6.jpg`, `project-comingsoon.svg`), shows its category cover on the card and in the popup. An unknown category falls back to Web Development.
- The image field is still an optional **override**. In admin, the 9 covers sit under the Image URL field: click one to pick it, click it again to clear. A pasted URL, including an embedded `data:` image, always wins.
- Saving with an empty image field stores `''`, not `blog-1.jpg`, so the cover follows the category if the category changes.
- **New category:** add it to the admin category list in `index.html`, add `{ name, slug }` to `CATEGORIES` in `blog-covers.js`, make a cover in the house style below, then run `node scripts/test-blog-covers.mjs`. The test fails if any category is missing its cover file.
- **Custom per-post cover:** save it as `assets/images/blog/<post-slug>.webp`. **Push first, then paste the link** in admin, because the admin change goes live right away. Don't hotlink Higgsfield's CDN.

| Category | File | Object |
|---|---|---|
| Web Development | `web-development.webp` | Laptop with a yellow browser frame floating above it |
| Software Engineering | `software-engineering.webp` | Three meshing gears, one yellow |
| Full-Stack | `full-stack.webp` | Three stacked slabs, yellow on top |
| Frontend | `frontend.webp` | Phone with a yellow cursor arrow |
| Backend | `backend.webp` | Database cylinders with yellow status rings |
| Learning Journey | `learning-journey.webp` | Stair-step blocks, yellow top step |
| Projects | `projects.webp` | Yellow rocket lifting off a phone (first made for the ProCleaning post) |
| Tutorial | `tutorial.webp` | Yellow lightbulb on an open notebook |
| Tech Stack | `tech-stack.webp` | Toolbox with yellow-handled tools |

## Crops to design for

| Where | Box | Ratio |
|---|---|---|
| Blog card (`.blog-banner-box`) | full card width × 200px, `object-fit: cover` | about 2:1 |
| Post popup (`.blog-modal-img-wrapper`) | full popup width × 300px (200px on mobile) | about 2.7:1 |

Generate at 16:9 and keep the subject inside the middle half of the height. No text: it gets cropped, and the models garble it.

## House style

Model: **GPT Image 2.5** (`gpt_image_2_5`), 16:9, 1k. Drafts at `low` (0.25 credits). So far the low drafts have been good enough to use as-is. If one isn't, re-make it at `high` (1.5 credits) with the draft as a reference image. Price every job and get Ruben's yes first (master context, Higgsfield rules).

Prompt prefix (keep it word for word, then add one `Subject:` line per cover):

> Dark minimalist 3D render. Matte charcoal background (#1E1E1F) with a soft vignette. One subject centered, kept within the middle half of the frame height, with generous empty space on the left and right. Soft studio key light and a thin warm rim light. Warm yellow (#FFD970) is the only accent color; everything else is charcoal, graphite and soft gray. Clean matte and glossy materials, shallow depth of field, premium tech-editorial look.

Prompt suffix:

> No text, no letters, no numbers, no logos, no app UI, no people.

The colors are the site's `--eerie-black-1` and `--orange-yellow-crayola`. Use one object as a metaphor for the category. Never show a fake app screen standing in for a real client app.

## Log

| Date | Cover | Subject line | Draft job ids | Result |
|---|---|---|---|---|
| 2026-10-14 | Shipping a Staff-Only App to the App Store: Our ProCleaning Team Preflight QA Playbook (Jul 30, 2026) | 1 shield: upright phone + floating yellow check shield · 2 rocket: phone lying flat as a launch pad, small yellow rocket before liftoff · 3 badge: phone + blank yellow staff keycard on a lanyard + graphite padlock | 1 `083b4414-dc3f-4cfd-9ffb-9bc446de2b6c` · 2 `130edd99-524e-40cf-9997-4d46d0fd1e69` · 3 `ac48af49-2bb6-4a5e-9bac-fb0ff7a48dc3` | **Draft 2 (rocket), used as-is.** The high-quality re-make was skipped. Became the Projects cover, `assets/images/blog/category/projects.webp` (1344×752, cwebp q82, 10 KB). Alt text: "Yellow rocket lifting off from a smartphone, for a pre-launch QA checklist." Total: 0.75 credits |
| 2026-10-15 | 8 category covers (Web Development, Software Engineering, Full-Stack, Frontend, Backend, Learning Journey, Tutorial, Tech Stack) | See the table above; the prompts are the house prefix and suffix plus that object | `410640e2-e43a-4033-86b8-945eb1bd65d3` · `b31e8ecd-f22f-48cd-b27b-8b8bd9b70970` · `5c4b450f-4627-4d1a-8aef-2d95279470d4` · `b6803efd-a2ea-403c-91c1-7b88b303e628` · `9be36a8d-0a33-4329-81f8-962859b5e81f` · `e4bfafac-5b72-4dce-9c13-87ae4ad59cd9` · `8a8a20a9-c5f7-40b5-b194-ecaedf11c902` · `54f48bb6-3b8a-45ce-934f-2bf60a3b5ff8` (same order) | All 8 low drafts used as-is. All fit the card and popup crops. Total: 2.0 credits |
