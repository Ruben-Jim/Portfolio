#!/bin/sh
# Export story-highlight covers (1080×1920 PNGs).
# Usage: ./examples/instagram/export-covers.sh
# Output: examples/instagram/highlight-covers/<id>.png
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
mkdir -p "$DIR/highlight-covers"

ids() {
  python3 -c "
import json, re, sys
src = open('$DIR/covers-data.js', encoding='utf-8').read()
for m in re.finditer(r\"$1: \[(.*?)\n  \]\", src, re.S):
    print(' '.join(re.findall(r\"\{ id: '([^']+)'\", m.group(1))))
"
}

shot() {
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --window-size=1080,1920 \
    --screenshot="$2" --virtual-time-budget=10000 "$1" 2>/dev/null
}

for ID in $(ids highlights); do
  shot "file://$DIR/highlight-cover.html?id=$ID" "$DIR/highlight-covers/$ID.png"
  echo "highlight-covers/$ID.png"
done
