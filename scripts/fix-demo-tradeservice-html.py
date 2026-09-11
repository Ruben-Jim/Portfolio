#!/usr/bin/env python3
"""Fix demo HTML after Expo export for /demos/tradeservice on GitHub Pages."""
from pathlib import Path
import re
import sys

root = Path(sys.argv[1] if len(sys.argv) > 1 else "demos/tradeservice")

# Bad post-process left literal backslash-quotes: href=\"/path\"
logos = re.compile(r'(href|src)="/(masters-logo\.png|squirrel-logo\.png|favicon\.ico)"')

fixed = 0
for path in root.rglob("*.html"):
    text = path.read_text(encoding="utf-8")
    new = text.replace('\\"', '"')
    new = logos.sub(r'\1="/demos/tradeservice/\2"', new)
    if new != text:
        path.write_text(new, encoding="utf-8")
        fixed += 1
        print("fixed", path.relative_to(root))

print("files_updated", fixed)

sample = (root / "index.html").read_text(encoding="utf-8")
if '\\"' in sample:
    raise SystemExit("still has escaped quotes")
print("masters ok", 'src="/demos/tradeservice/masters-logo.png"' in sample)
print("css ok", 'href="/demos/tradeservice/_expo/static/css/' in sample)
print("js ok", '/demos/tradeservice/_expo/static/js/web/entry-' in sample)
