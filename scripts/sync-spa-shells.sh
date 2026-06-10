#!/usr/bin/env bash
# Copy canonical index.html to GitHub Pages SPA entry points (404 fallback + per-route shells).
# Run after editing index.html: ./scripts/sync-spa-shells.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/index.html"

if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC" >&2
  exit 1
fi

ROUTES=(
  about
  admin
  resume
  portfolio
  blog
  services-pricing
  service-pricing
  business-systems
  hire-me
  contact
  messages
)

cp "$SRC" "$ROOT/404.html"
echo "Synced 404.html"

for route in "${ROUTES[@]}"; do
  mkdir -p "$ROOT/$route"
  cp "$SRC" "$ROOT/$route/index.html"
  echo "Synced $route/index.html"
done

echo "SPA shells synced from index.html"
