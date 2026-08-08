#!/bin/bash
# Rebuild search index and commit to repo.
# Cron: 0 7 * * * (daily at 7 AM UTC, or triggered after content changes)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Rebuilding search index"

node scripts/build-search-index.js

git add search-index.json
git diff --cached --quiet || git commit -m "Rebuild search index"
git push --quiet

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Search index rebuilt"
