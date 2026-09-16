#!/bin/bash
# Fetch Last.fm play counts and commit to repo.
# Cron: 5 6 * * 1 (Monday, Pi local time -- see the crontab note in pi-bot-env.sh)
#
# Runs the repo's scripts/fetch-play-counts.mjs, not `magmascript lastfm fetch`.
# magmascript carries Python ports of these scripts; the search index port had
# drifted and re-added redirect stubs on 2026-09-16, and every magmascript
# release from 3.2.2 cannot run domain commands at all. The script in the
# checkout sync_repo has just updated cannot lag the site it works on.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Fetching Last.fm play counts"

if [ -z "${LASTFM_API_KEY:-}" ]; then
    echo "Error: LASTFM_API_KEY not set in $ENV_FILE"
    exit 1
fi

node scripts/fetch-play-counts.mjs --skip-existing

git add arcade/admin/stats/lastfm/ scripts/play-counts.json
git diff --cached --quiet || git commit -m "Update Last.fm play counts"
git push --quiet

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Play counts complete"
