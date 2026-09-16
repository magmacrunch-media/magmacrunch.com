#!/bin/bash
# Backup MusicBrainz data and commit to repo.
# Cron: 0 6 * * 1 (Monday, Pi local time -- see the crontab note in pi-bot-env.sh)
#
# Runs the repo's scripts/backup-musicbrainz.mjs, not `magmascript mb backup`.
# magmascript carries Python ports of these scripts; the search index port had
# drifted and re-added redirect stubs on 2026-09-16, and every magmascript
# release from 3.2.2 cannot run domain commands at all. The script in the
# checkout sync_repo has just updated cannot lag the site it works on.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Starting MusicBrainz backup"

node scripts/backup-musicbrainz.mjs --skip-existing

git add archive/_cache/
git diff --cached --quiet || git commit -m "Update MusicBrainz cache"
git push --quiet

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] MusicBrainz backup complete"
