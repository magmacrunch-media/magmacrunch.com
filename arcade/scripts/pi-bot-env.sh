#!/bin/bash
# Shared environment for Pi cron bots.
# Sourced by individual bot scripts.
#
# After first setup, populate ~/arcade/.env with:
#   GITHUB_PAT=ghp_...
#   TMDB_API_KEY=...
#   LASTFM_API_KEY=...
#   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

set -euo pipefail

PI_HOME="/home/jake"
REPO_DIR="$PI_HOME/website"
LOG_DIR="$PI_HOME/arcade/logs"
ENV_FILE="$PI_HOME/arcade/.env"

mkdir -p "$LOG_DIR"

# Load .env if it exists
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

cd "$REPO_DIR"

# Configure git remote with PAT for push access
if [ -n "${GITHUB_PAT:-}" ]; then
    git remote set-url origin "https://${GITHUB_PAT}@github.com/magmacrunchmedia/magmacrunch.com.git"
fi

git pull --quiet

# GitHub helper — call GitHub REST API
# Usage: gh_api GET /repos/owner/repo/issues
#        gh_api POST /repos/owner/repo/issues '{"title":"..."}'
gh_api() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"

    local args=(-s -w "%{http_code}" \
        -X "$method" \
        -H "Authorization: Bearer $GITHUB_PAT" \
        -H "Accept: application/vnd.github+json" \
        -H "X-GitHub-Api-Version: 2022-11-28")

    if [ -n "$data" ]; then
        args+=(-d "$data")
    fi

    local response
    response=$(curl "${args[@]}" "https://api.github.com${endpoint}")
    local http_code="${response: -3}"
    local body="${response:0:${#response}-3}"

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo "$body"
    else
        echo "GitHub API error $http_code: $body" >&2
        return 1
    fi
}

# Discord webhook helper
# Usage: discord_post '{"embeds":[...]}'
discord_post() {
    local payload="$1"
    if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
        curl -s -H "Content-Type: application/json" \
            -d "$payload" \
            "$DISCORD_WEBHOOK_URL" > /dev/null 2>&1 || true
    fi
}
