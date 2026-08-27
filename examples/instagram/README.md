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

To recapture the live demo (needs Chrome + `puppeteer-core`):

```sh
# from a folder where puppeteer-core is installed, with repo as OUT_DIR
OUT_DIR="$PWD/examples/instagram/captures" node examples/instagram/capture-demo.mjs
```
