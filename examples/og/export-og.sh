#!/bin/sh
# Render link-preview cards (og:image) from og.html at 1200×630.
# Usage: ./examples/og/export-og.sh            # all cards
#        ./examples/og/export-og.sh services   # one card
# Output: assets/images/og/<card>.jpg
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/../../assets/images/og"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
CARDS="${1:-home linktree link-in-bio services portfolio hire-me}"
TMP="$(mktemp -d)"

for card in $CARDS; do
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files \
    --window-size=1200,630 \
    --screenshot="$TMP/$card.png" \
    --virtual-time-budget=8000 \
    "file://$DIR/og.html?card=$card" >/dev/null 2>&1
done

python3 - "$TMP" "$OUT" $CARDS <<'PY'
import os, sys
from PIL import Image
tmp, out, cards = sys.argv[1], sys.argv[2], sys.argv[3:]
for c in cards:
    img = Image.open(os.path.join(tmp, c + '.png')).convert('RGB')
    assert img.size == (1200, 630), (c, img.size)
    img.save(os.path.join(out, c + '.jpg'), 'JPEG', quality=88, optimize=True, progressive=True)
    print('wrote', os.path.join(out, c + '.jpg'))
PY
rm -rf "$TMP"
