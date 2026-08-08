#!/bin/bash
# Backup TMDB data and commit to repo.
# Cron: 30 6 * * 1 (Monday 6:30 AM UTC)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Starting TMDB backup"

if [ -z "${TMDB_API_KEY:-}" ]; then
    echo "Error: TMDB_API_KEY not set in $ENV_FILE"
    exit 1
fi

node scripts/backup-tmdb.mjs

git add archive/_cache/tmdb/
git diff --cached --quiet || git commit -m "Update TMDB cache"
git push --quiet

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] TMDB backup complete"
