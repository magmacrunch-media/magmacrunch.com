#!/bin/bash
# Post weekly high score summary to GitHub Discussion and Discord.
# Cron: 0 6 * * 1 (Monday 6 AM UTC)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Generating weekly scores report"

# Generate markdown report
node scripts/weekly-scores.mjs > scores-report.md

# Generate Discord payload
node scripts/weekly-scores.mjs --discord > discord-payload.json

# Post to GitHub Discussion
REPORT=$(cat scores-report.md)
REPO_NODE_ID=$(gh_api GET /repos/magmacrunchmedia/magmacrunch.com | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d).node_id)")
DATE=$(date -u '+%Y-%m-%d')

PAYLOAD=$(node -e "
    const report = $(cat scores-report.md | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.stringify(d))");
    console.log(JSON.stringify({
        query: 'mutation (\$input: CreateDiscussionInput!) { createDiscussion(input: \$input) { discussion { url } } }',
        variables: {
            input: {
                repositoryId: '$REPO_NODE_ID',
                title: 'Weekly High Scores — $DATE',
                body: report,
                categorySlug: 'high-scores'
            }
        }
    }));
")

gh_api POST "/graphql" "$PAYLOAD" > /dev/null 2>&1 || echo "Failed to post Discussion"

# Post to Discord
discord_post "$(cat discord-payload.json)"

git add -A
git diff --cached --quiet || git commit -m "Update score data"
git push --quiet

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Weekly scores complete"
