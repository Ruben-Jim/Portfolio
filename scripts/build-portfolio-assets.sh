#!/usr/bin/env bash
# Scan project media and write a manifest the admin image picker reads.
# Run after adding, moving, or converting project media:  ./scripts/build-portfolio-assets.sh
#
# Sources:
#   assets/images/projects/<folder>/...   → one group per folder (slideshow media)
#   assets/docs/projects/<project>/...    → one group per project (guide screenshots)
#
# Exists because the picker used to read hardcoded path lists that went stale the
# moment any file was renamed or moved.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/assets/images/projects"
DOCS="$ROOT/assets/docs/projects"
OUT="$ROOT/assets/js/portfolio-assets.js"

if [[ ! -d "$DIR" ]]; then
  echo "Missing $DIR" >&2
  exit 1
fi

python3 - "$DIR" "$DOCS" "$OUT" <<'PY'
import json, os, shutil, struct, subprocess, sys

src, docs, out = sys.argv[1], sys.argv[2], sys.argv[3]
IMG = {'.webp', '.png', '.jpg', '.jpeg', '.svg', '.gif'}
VID = {'.webm', '.mp4'}
FFPROBE = shutil.which('ffprobe')


def image_size(path):
    """(width, height) from a webp/png/gif/jpeg header, or None."""
    try:
        with open(path, 'rb') as fh:
            head = fh.read(1 << 20)
    except OSError:
        return None
    if head[:4] == b'RIFF' and head[8:12] == b'WEBP':
        chunk = head[12:16]
        if chunk == b'VP8 ' and len(head) >= 30:
            w, h = struct.unpack('<HH', head[26:30])
            return w & 0x3FFF, h & 0x3FFF
        if chunk == b'VP8L' and len(head) >= 25:
            b = head[21:25]
            return 1 + (b[0] | (b[1] & 0x3F) << 8), 1 + (b[1] >> 6 | b[2] << 2 | (b[3] & 0x0F) << 10)
        if chunk == b'VP8X' and len(head) >= 30:
            return 1 + int.from_bytes(head[24:27], 'little'), 1 + int.from_bytes(head[27:30], 'little')
        return None
    if head[:8] == b'\x89PNG\r\n\x1a\n' and len(head) >= 24:
        return struct.unpack('>II', head[16:24])
    if head[:6] in (b'GIF87a', b'GIF89a'):
        return struct.unpack('<HH', head[6:10])
    if head[:2] == b'\xff\xd8':
        i = 2
        while i + 9 < len(head):
            if head[i] != 0xFF:
                i += 1
                continue
            marker = head[i + 1]
            if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                h, w = struct.unpack('>HH', head[i + 5:i + 9])
                return w, h
            i += 2 + struct.unpack('>H', head[i + 2:i + 4])[0]
    return None


def video_size(path, poster):
    """The poster's size when there is one (same frame), else ffprobe's, else None."""
    if poster:
        size = image_size(poster)
        if size:
            return size
    if not FFPROBE:
        return None
    try:
        res = subprocess.run(
            [FFPROBE, '-v', 'error', '-select_streams', 'v:0',
             '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path],
            capture_output=True, text=True, timeout=20)
        w, h = res.stdout.strip().split(',')[:2]
        return int(w), int(h)
    except (OSError, ValueError, subprocess.SubprocessError):
        return None


def is_portrait(size):
    """A phone-screen capture (phones are 16:9 or taller). Phone portfolio cards use these.
    Old card thumbnails around 5:7 are tall too, but they aren't phone screens."""
    return bool(size) and size[1] >= size[0] * 1.6


def walk(base, url_prefix, group_for):
    """Yield (group, folder, entry) for every media file under base."""
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = sorted(d for d in dirnames if not d.startswith('.'))
        for name in sorted(filenames):
            if name.startswith('.'):
                continue
            ext = os.path.splitext(name)[1].lower()
            if ext not in IMG and ext not in VID:
                continue
            stem = os.path.splitext(name)[0]
            # A *-poster.webp is a video thumbnail, not a slide in its own right.
            if stem.endswith('-poster'):
                continue
            rel = os.path.relpath(os.path.join(dirpath, name), base).replace(os.sep, '/')
            grouped = group_for(rel)
            if not grouped:
                continue
            group, folder = grouped
            entry = {
                'path': url_prefix + rel,
                'name': name,
                'kind': 'video' if ext in VID else 'image',
            }
            if folder:
                entry['folder'] = folder
            full = os.path.join(dirpath, name)
            if ext in VID:
                poster = os.path.join(dirpath, stem + '-poster.webp')
                if not os.path.isfile(poster):
                    poster = None
                if poster:
                    entry['poster'] = url_prefix + os.path.relpath(poster, base).replace(os.sep, '/')
                size = video_size(full, poster)
            else:
                size = image_size(full)
            if is_portrait(size):
                entry['portrait'] = True
            yield group, entry


def images_group(rel):
    return (os.path.dirname(rel) or 'general', '')


def docs_group(rel):
    parts = rel.split('/')
    if len(parts) < 2:
        return None
    return ('docs/' + parts[0], '/'.join(parts[1:-1]))


groups = {}
labels = {}
sources = {}
for group, entry in walk(src, '/assets/images/projects/', images_group):
    groups.setdefault(group, []).append(entry)
    labels[group] = group
    sources[group] = 'images'

if os.path.isdir(docs):
    for group, entry in walk(docs, '/assets/docs/projects/', docs_group):
        groups.setdefault(group, []).append(entry)
        labels[group] = group[len('docs/'):] + ' — guide screenshots'
        sources[group] = 'docs'

for files in groups.values():
    files.sort(key=lambda f: (f.get('folder', ''), f['name']))

# Slideshow folders first, guide screenshots after.
order = sorted(groups, key=lambda g: (sources[g] != 'images', g))
payload = [
    {'group': g, 'label': labels[g], 'source': sources[g], 'files': groups[g]}
    for g in order
]
total = sum(len(g['files']) for g in payload)

with open(out, 'w', encoding='utf-8') as fh:
    fh.write('/* GENERATED by scripts/build-portfolio-assets.sh — do not edit by hand. */\n')
    fh.write('/* Re-run that script whenever project media is added, moved, or renamed. */\n')
    fh.write('window.PORTFOLIO_ASSET_GROUPS = ')
    json.dump(payload, fh, indent=2, ensure_ascii=False)
    fh.write(';\n\n')
    fh.write('window.PORTFOLIO_ASSET_IMAGES = window.PORTFOLIO_ASSET_GROUPS.reduce(\n')
    fh.write('  function (acc, g) { return acc.concat(g.files.map(function (f) { return f.path; })); },\n')
    fh.write('  []\n);\n')

print('wrote %s — %d groups, %d files' % (os.path.relpath(out, os.path.dirname(os.path.dirname(out))), len(payload), total))
PY
