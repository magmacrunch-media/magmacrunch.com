#!/bin/bash
# Backup MusicBrainz data and commit to repo.
# Cron: 0 6 * * 1 (Monday 6 AM UTC)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Starting MusicBrainz backup"

node scripts/backup-musicbrainz.mjs --skip-existing

git add archive/_cache/
git diff --cached --quiet || git commit -m "Update MusicBrainz cache"
git push --quiet

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] MusicBrainz backup complete"
