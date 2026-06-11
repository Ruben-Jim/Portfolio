#!/usr/bin/env bash
# Copy browser email templates into functions/ so Cloud Functions deploy includes them.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cp "$ROOT/assets/js/email-templates-client.js" "$ROOT/functions/email-templates-client.js"
echo "Synced functions/email-templates-client.js from assets/js/email-templates-client.js"
