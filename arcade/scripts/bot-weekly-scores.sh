#!/bin/bash
# Post weekly high score summary to GitHub Discussion and Discord.
# Cron: 0 6 * * 1 (Monday 6 AM UTC)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Generating weekly scores report"

# Use magmascript to generate report and post to GitHub Discussion + Discord
magmascript scores report --post-discussion --post-discord

# Push any updated score data
git add -A
git diff --cached --quiet || git commit -m "Update score data"
git push --quiet

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Weekly scores complete"
