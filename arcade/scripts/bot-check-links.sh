#!/bin/bash
# Check links with lychee and create a GitHub Issue if broken links found.
# Cron: 0 6 * * 1 (Monday 6 AM UTC)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Starting link check"

LYCHEE_OUT="/tmp/lychee-out.md"

lychee \
    --verbose \
    --no-progress \
    --cache \
    --max-cache-age 1d \
    --exclude-all-private \
    --accept 200,202,204,403,429 \
    --max-retries 2 \
    --retry-wait-time 2 \
    --timeout 30 \
    --max-concurrency 32 \
    --format markdown \
    --output "$LYCHEE_OUT" \
    './**/*.html' \
    './**/*.md' \
    2>&1 | tail -20

EXIT_CODE=${PIPESTATUS[0]}

if [ "$EXIT_CODE" -ne 0 ]; then
    echo "Broken links found (exit code $EXIT_CODE)"

    # Check for existing open issue
    EXISTING=$(gh_api GET "/repos/magmacrunch-media/magmacrunch.com/issues?labels=broken-links&state=open&per_page=1" 2>/dev/null || echo "[]")
    ISSUE_NUMBER=$(echo "$EXISTING" | node -e "
        const d = require('fs').readFileSync('/dev/stdin','utf8');
        const a = JSON.parse(d);
        console.log(a[0]?.number || '');
    " 2>/dev/null || echo "")

    BODY=$(cat "$LYCHEE_OUT")
    PAYLOAD=$(node -e "
        const body = $(printf '%s' "$BODY" | node -e "
            const d = require('fs').readFileSync('/dev/stdin','utf8');
            console.log(JSON.stringify(d));
        ");
        console.log(JSON.stringify({
            title: 'Broken links detected (Pi bot)',
            body: body + '\n\n---\n*Created by Pi link checker bot*',
            labels: ['automated issue', 'broken-links']
        }));
    ")

    if [ -n "$ISSUE_NUMBER" ]; then
        echo "Updating existing issue #$ISSUE_NUMBER"
        gh_api PATCH "/repos/magmacrunch-media/magmacrunch.com/issues/$ISSUE_NUMBER" "$PAYLOAD" > /dev/null
    else
        echo "Creating new issue"
        gh_api POST "/repos/magmacrunch-media/magmacrunch.com/issues" "$PAYLOAD" > /dev/null
    fi
else
    echo "No broken links found"

    # Close existing issue if present
    EXISTING=$(gh_api GET "/repos/magmacrunch-media/magmacrunch.com/issues?labels=broken-links&state=open&per_page=1" 2>/dev/null || echo "[]")
    ISSUE_NUMBER=$(echo "$EXISTING" | node -e "
        const d = require('fs').readFileSync('/dev/stdin','utf8');
        const a = JSON.parse(d);
        console.log(a[0]?.number || '');
    " 2>/dev/null || echo "")

    if [ -n "$ISSUE_NUMBER" ]; then
        echo "Closing issue #$ISSUE_NUMBER — all links clean"
        gh_api PATCH "/repos/magmacrunch-media/magmacrunch.com/issues/$ISSUE_NUMBER" '{"state":"closed"}' > /dev/null
    fi
fi

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Link check complete"
