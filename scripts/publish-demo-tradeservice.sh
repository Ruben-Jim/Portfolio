#!/usr/bin/env bash
# Export Trade Service (Roof-Cleaner-Template) for rubenjimenez.dev/demos/tradeservice
# and copy the static build into this Portfolio repo.
set -euo pipefail

PORTFOLIO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE_ROOT="${TRADE_SERVICE_TEMPLATE:-$HOME/Dev/Templates/Roof-Cleaner-Template}"
DEST="$PORTFOLIO_ROOT/demos/tradeservice"
BASE_URL="/demos/tradeservice"
APP_JSON="$TEMPLATE_ROOT/app.json"

if [[ ! -d "$TEMPLATE_ROOT" ]]; then
  echo "Trade Service template not found at: $TEMPLATE_ROOT"
  echo "Set TRADE_SERVICE_TEMPLATE=/path/to/Roof-Cleaner-Template"
  exit 1
fi

if [[ ! -f "$APP_JSON" ]]; then
  echo "Missing app.json at $APP_JSON"
  exit 1
fi

echo "→ Template: $TEMPLATE_ROOT"
echo "→ Destination: $DEST"
echo "→ Base URL: $BASE_URL"

BACKUP="$(mktemp)"
cp "$APP_JSON" "$BACKUP"

restore_app_json() {
  cp "$BACKUP" "$APP_JSON"
  rm -f "$BACKUP"
}
trap restore_app_json EXIT

# Inject experiments.baseUrl for subdirectory hosting (Expo Router static export).
node -e '
const fs = require("fs");
const path = process.argv[1];
const base = process.argv[2];
const j = JSON.parse(fs.readFileSync(path, "utf8"));
j.expo = j.expo || {};
j.expo.experiments = Object.assign({}, j.expo.experiments || {}, { baseUrl: base });
fs.writeFileSync(path, JSON.stringify(j, null, 2) + "\n");
console.log("Set experiments.baseUrl =", base);
' "$APP_JSON" "$BASE_URL"

cd "$TEMPLATE_ROOT"
echo "→ expo export --platform web …"
npx expo export --platform web

if [[ ! -f "$TEMPLATE_ROOT/dist/index.html" ]]; then
  echo "Export failed: dist/index.html missing"
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$TEMPLATE_ROOT/dist/." "$DEST/"

# Pin root-absolute boot logos to the demo base path (safe quoting).
python3 "$PORTFOLIO_ROOT/scripts/fix-demo-tradeservice-html.py" "$DEST"

echo "✓ Copied export → demos/tradeservice/"
echo ""
echo "Next:"
echo "  1. Firebase console (roof-cleaning-template) → Auth → Authorized domains"
echo "     add: rubenjimenez.dev"
echo "  2. Commit .nojekyll + demos/tradeservice and push (GitHub Pages serves rubenjimenez.dev)."
echo "     Underscore folders like _expo are hidden by Jekyll unless .nojekyll exists."
echo "  3. Open https://rubenjimenez.dev/demos/tradeservice"
