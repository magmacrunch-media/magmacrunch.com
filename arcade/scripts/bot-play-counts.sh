#!/bin/bash
# Fetch Last.fm play counts and commit to repo.
# Cron: 0 6 * * 1 (Monday 6 AM UTC)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Fetching Last.fm play counts"

if [ -z "${LASTFM_API_KEY:-}" ]; then
    echo "Error: LASTFM_API_KEY not set in $ENV_FILE"
    exit 1
fi

magmascript lastfm fetch --skip-existing

git add arcade/admin/stats/lastfm/ scripts/play-counts.json
git diff --cached --quiet || git commit -m "Update Last.fm play counts"
git push --quiet

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Play counts complete"
