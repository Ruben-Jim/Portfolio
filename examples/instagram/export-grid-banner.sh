#!/bin/sh
# Render grid-banner.html at 3240×1440 and cut it into three 1080×1440 posts.
# Usage: ./examples/instagram/export-grid-banner.sh
# Output: examples/instagram/grid-banner/post-1-right.png, post-2-middle.png, post-3-left.png
#         (post them in that order — the grid shows the newest post on the left)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
OUT="$DIR/grid-banner"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
mkdir -p "$OUT"

"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
  --allow-file-access-from-files \
  --window-size=3240,1440 \
  --screenshot="$OUT/full.png" \
  --virtual-time-budget=12000 \
  "file://$DIR/grid-banner.html"

python3 - "$OUT" <<'PY'
import os, sys
from PIL import Image

out = sys.argv[1]
full = Image.open(os.path.join(out, 'full.png')).convert('RGB')
assert full.size == (3240, 1440), full.size
names = ['left', 'middle', 'right']
for post, t in enumerate([2, 1, 0], start=1):
    full.crop((t * 1080, 0, (t + 1) * 1080, 1440)).save(os.path.join(out, 'post-%d-%s.png' % (post, names[t])))

# How the row looks on the profile: three tiles with Instagram's thin gaps.
gap = 8
preview = Image.new('RGB', (3240 + 2 * gap, 1440), (255, 255, 255))
for t in range(3):
    preview.paste(full.crop((t * 1080, 0, (t + 1) * 1080, 1440)), (t * (1080 + gap), 0))
preview.save(os.path.join(out, 'grid-preview.png'))
print('wrote', out)
PY
