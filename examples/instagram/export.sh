#!/bin/sh
# Screenshot native Instagram artboards.
# Usage: python3 -m http.server 8765   # from repo root
#        ./examples/instagram/export.sh              # all projects
#        ./examples/instagram/export.sh tradeservice # one project
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/examples/instagram"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE_URL:-http://127.0.0.1:8765/examples/instagram/index.html}"

if [ -n "$1" ]; then
  IDS="$1"
else
  IDS=$(python3 -c "import json; print(' '.join(p['id'] for p in json.load(open('$OUT/projects.json'))))")
fi

for ID in $IDS; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1080,1350 \
    --screenshot="$OUT/${ID}-feed.png" \
    --virtual-time-budget=12000 \
    "$BASE?export=feed&project=$ID"

  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1080,1920 \
    --screenshot="$OUT/${ID}-story.png" \
    --virtual-time-budget=12000 \
    "$BASE?export=story&project=$ID"

  echo "Wrote $OUT/${ID}-feed.png and $OUT/${ID}-story.png"
done
