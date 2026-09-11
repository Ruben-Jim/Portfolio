# Demo templates on rubenjimenez.dev

Live **demo** apps ship under this site:

```text
https://rubenjimenez.dev/demos/{slug}
```

Examples: `/demos/tradeservice`, `/demos/pizza`.

**`.expo.app` is for production / client builds only** — not portfolio demos.

## Layout

```text
demos/
  tradeservice/     ← static Expo web export (committed or CI-copied)
  pizza/            ← same pattern later
  README.md
```

Each folder is a full static SPA (`index.html`, `_expo/`, assets). Source stays in the Expo template repo; this tree only holds the **built** web output.

## Firebase backends (best practice)

| Layer | Where it lives |
|-------|----------------|
| Portfolio site (this repo) | Firebase project `portfolio-2578e` — Hosting only for demos |
| Demo app data (orders, admin, RTDB) | **The demo’s own Firebase project** (e.g. Trade Service → `roof-cleaning-template`) |
| Real client / production app | **New** Firebase project + `.expo.app` or client domain |

Do **not** point demos at `portfolio-2578e` RTDB/Firestore. Keep demo seed data isolated so it never mixes with your agency admin or a paying client.

### Auth / authorized domains

In the **demo** Firebase console → Authentication → Settings → Authorized domains, add:

- `rubenjimenez.dev`
- `www.rubenjimenez.dev` (if used)
- `localhost` (local preview)

Hosting domain change does not require a new Firebase project if the existing demo project already has the data you want.

## GitHub Pages note

`rubenjimenez.dev` is served from this repo via GitHub Pages. Jekyll **skips** folders that start with `_` (including Expo’s `_expo/`) unless the repo root has an empty **`.nojekyll`** file. That file is required for demos to load CSS/JS.

From this Portfolio repo (after the template has `experiments.baseUrl` set for the export — see script):

```bash
./scripts/publish-demo-tradeservice.sh
```

That script:

1. Exports web from `~/Dev/Templates/Roof-Cleaner-Template` with base path `/demos/tradeservice`
2. Copies `dist/` → `demos/tradeservice/`
3. Reminds you to `firebase deploy --only hosting`

Then open: `https://rubenjimenez.dev/demos/tradeservice`

## Adding another demo (e.g. pizza)

1. In that Expo app, export with `experiments.baseUrl`: `"/demos/pizza"`
2. Copy export → `demos/pizza/`
3. Add Hosting rewrites in `firebase.json` / `serve.json` (same pattern as tradeservice)
4. Point portfolio / IG / hub links to `/demos/pizza`
