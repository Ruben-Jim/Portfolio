# Instagram mockups

Reusable device posts for @codewithruben.

## Admin (recommended)

Sign in to **Admin → Content → Instagram posts**. Pick a project (or upload laptop + phone screenshots), generate feed/story PNGs, share via the native share sheet, and optionally save to Firebase for later.

## Local example page

Open `/examples/instagram/` locally (or `python3 -m http.server 8765` from the repo root), then screenshot the artboard — not the whole page:

- **Feed** `#feed` — 1080×1350 (4:5) — `?export=feed`
- **Story** `#story` — 1080×1920 (9:16) — `?export=story`

Trade Service examples: `tradeservice-feed.png` and `tradeservice-story.png`. Other live projects use the same names (`rosasalon-feed.png`, `rizo-story.png`, …).

Screens in the frames are live captures of the same homepage. Swap project with `?project=rosasalon` (see `projects.json`). Official App Store and Google Play badges sit in the footer; copy still says **Web + iOS + Android**.

Shared artboard styles live in `/assets/css/ig-mockup.css`.

To regenerate the posts after HTML or capture changes:

```sh
python3 -m http.server 8765   # from repo root
./examples/instagram/export.sh            # all live projects
./examples/instagram/export.sh rosasalon  # one project
```

## Services kit (any niche)

`services.html` is the "What $499 vs $1,500 vs $3,500 gets you" set: a 6-slide carousel (1080×1440, 3:4 so the profile grid doesn't crop it), a story / reel cover and 3 story frames (1080×1920), in English or Spanish (`?lang=es`). Each package gets one slide on real device mockups from `captures/`, in the same style as the project posts. Copy, prices and which capture each tier uses live in `TIERS` in `services.js`. The DM keyword is `DM_KEYWORD` (`APP`, which works in both languages). Story boards keep 250px top and 240px bottom clear for the story UI and the grid crop.

```sh
python3 -m http.server 8765                   # from repo root
./examples/instagram/export-services.sh       # en + es → services/<lang>/*.png
./examples/instagram/export-services.sh es    # one language
```

Post the carousel in order (`post-1-cover` … `post-6-cta`) and the stories in order (`story-1-499` → `story-3-3500`). `story-cover` works on its own or as a reel cover.

## Post builder (drag and drop)

**Admin → Content → Post builder** is a drag-and-drop editor for new posts and stories in this style. Start blank (3:4, 4:5, 1:1 or 9:16), from any services post (the whole set or one slide), or from a copy of a saved design. It saves to Firebase automatically and exports PNGs (one slide, all slides, or a .zip). On a phone it opens the share sheet with every slide.

- Code: `assets/js/post-builder/` (ES modules, no build step), with styles in `assets/css/post-builder.css` (editor) and `post-builder-elements.css` (what exports).
- Local, no sign-in: open `/examples/instagram/builder.html`. Designs save in that browser only.
- Firebase: `postDesigns/<id>` (full design) and `postDesignIndex/<id>` (library list) in RTDB, and uploads + thumbnails under `postDesigns/<id>/` in Storage. After changing rules, deploy them with `firebase deploy --only database,storage`.
- Starters: `assets/js/post-builder/starters.json` is generated from `services.html` by `services-dump.js`. Re-run it after changing the services posts:

```sh
python3 -m http.server 8765              # from repo root
node scripts/build-post-starters.mjs     # writes starters.json (EN + ES)
node scripts/test-post-builder.mjs       # model, history + starters checks
```

- Cache-busting: modules import each other with `?v=pb1`. After editing any builder file, bump it (`sed -i '' 's/?v=pb1/?v=pb2/g' assets/js/post-builder/*.js`), bump the `?v=` on the post-builder `<link>`/`<script>` tags in `index.html`, then run `node scripts/sync-spa-shells.mjs`.

To recapture the live demo (needs Chrome + `puppeteer-core`):

```sh
# from a folder where puppeteer-core is installed, with repo as OUT_DIR
OUT_DIR="$PWD/examples/instagram/captures" node examples/instagram/capture-demo.mjs
```
