#!/bin/bash
# Post weekly high score summary to GitHub Discussion and Discord.
# Cron: 10 6 * * 1 (Monday, Pi local time -- see the crontab note in pi-bot-env.sh)
#
#   DRY_RUN=1 bot-weekly-scores.sh    print everything, post nothing
#
# Built with the repo's scripts/weekly-scores.mjs, not `magmascript scores
# report --post-discussion --post-discord`. That command never posted once
# from this Pi: the report printed and then magmascript died on
#
#     NameError: name 'datetime' is not defined
#
# in its Discussion step, every Monday, in every released version. The last
# High Scores Discussion is a manual one from 2026-08-08. (Its report also read
# a stale cache, showing the two newest games with no scores.)
#
# The script also used to end with `git add -A`, commit "Update score data" and
# push. The live scores are not in this checkout -- they are in
# ~/arcade/admin/scores -- so that commit could only ever have swept up
# whatever else happened to be lying in the shared bot clone, .lycheecache
# included. It never ran, because the crash came first. It is gone rather than
# repaired; this bot reads scores and posts, and has nothing to commit.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Generating weekly scores report"

# The live scores, not the stale copy committed under arcade/admin/scores.
export SCORES_DIR="$PI_HOME/arcade/admin/scores"

REPORT=$(node scripts/weekly-scores.mjs)
DISCORD_PAYLOAD=$(node scripts/weekly-scores.mjs --discord)
TITLE="Weekly High Scores — $(date +%Y-%m-%d)"

printf '%s\n' "$REPORT"

if [ -n "${DRY_RUN:-}" ]; then
    echo "DRY_RUN: would post Discussion \"$TITLE\" to High Scores, and this Discord payload:"
    printf '%s\n' "$DISCORD_PAYLOAD"
    exit 0
fi

# ── GitHub Discussion ──
# gh_create_discussion (pi-bot-env.sh) looks the category up by slug and checks
# the response; a failure is reported and does not stop the Discord post.
if url=$(gh_create_discussion high-scores "$TITLE" "$REPORT"); then
    echo "Posted Discussion: $url"
else
    echo "WARNING: Discussion not posted." >&2
fi

# ── Discord ──
if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
    discord_post "$DISCORD_PAYLOAD"
    echo "Posted to Discord"
else
    echo "WARNING: no DISCORD_WEBHOOK_URL — Discord not posted." >&2
fi

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Weekly scores complete"
