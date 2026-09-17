#!/usr/bin/env bash
# Sync GitHub Pages route shells from index.html, stamping per-route SEO.
# Thin wrapper kept for muscle memory — the real work is in sync-spa-shells.mjs.
# Run after editing index.html: ./scripts/sync-spa-shells.sh
set -euo pipefail
exec node "$(cd "$(dirname "$0")" && pwd)/sync-spa-shells.mjs" "$@"
