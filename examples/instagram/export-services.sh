#!/bin/sh
# Screenshot the services kit (carousel + story boards) in English and Spanish.
# Usage: python3 -m http.server 8765   # from repo root
#        ./examples/instagram/export-services.sh         # en + es
#        ./examples/instagram/export-services.sh es      # one language
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/examples/instagram/services"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
BASE="${BASE_URL:-http://127.0.0.1:8765/examples/instagram/services.html}"

FEED="post-1-cover post-2-499 post-3-1500 post-4-3500 post-5-compare post-6-cta"
STORY="story-cover story-1-499 story-2-1500 story-3-3500"
LANGS="${1:-en es}"

shot() {
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size="$3" \
    --screenshot="$OUT/$1/$2.png" \
    --virtual-time-budget=12000 \
    "$BASE?export=$2&lang=$1" 2>/dev/null
}

for L in $LANGS; do
  rm -rf "$OUT/$L" && mkdir -p "$OUT/$L"
  for ID in $FEED; do shot "$L" "$ID" 1080,1440; done
  for ID in $STORY; do shot "$L" "$ID" 1080,1920; done
  echo "Wrote $OUT/$L/"
done
