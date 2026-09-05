#!/bin/bash
# Shared environment for Pi cron bots.
# Sourced by individual bot scripts.
#
# After first setup, populate ~/arcade-config/.env with:
#   GITHUB_PAT=ghp_...
#   TMDB_API_KEY=...
#   LASTFM_API_KEY=...
#   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

set -euo pipefail

PI_HOME="/home/jake"
REPO_DIR="$PI_HOME/website"
LOG_DIR="$PI_HOME/arcade/logs"
ENV_FILE="$PI_HOME/arcade-config/.env"

# cron runs with PATH=/usr/local/bin:/usr/bin:/bin:/usr/games, which omits
# ~/.local/bin — where pip installs magmascript. bot-rebuild-search-index.sh
# died on "magmascript: command not found" every day while the same command
# worked fine in an interactive shell.
PATH="$PI_HOME/.local/bin:$PATH"
export PATH

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
    git remote set-url origin "https://${GITHUB_PAT}@github.com/magmacrunch-media/magmacrunch.com.git"
fi

# Sync to origin/main, but never let the state of this clone stop a bot.
#
# This was a bare `git pull`, and under `set -e` that single line was a
# fleet-wide kill switch. When the clone diverged from origin (a force-push
# upstream on 2026-07-25 left it 552 ahead / 718 behind), every pull died with
#
#     fatal: Need to specify how to reconcile divergent branches.
#
# and, because this file is sourced before any bot does its work, ALL EIGHT
# Pi bots exited at this line before running. They stayed dead from
# 2026-08-22 to 2026-09-05 — 276 consecutive silent failures of the service
# health check alone — because nothing reports a bot that never started.
#
# A stale checkout degrades one bot's output; a failed sync must not silence
# all of them. Fast-forward when we can, complain to the log when we cannot,
# and run either way. Divergence is left for a human to resolve deliberately
# rather than repaired unattended every thirty minutes.
sync_repo() {
    if ! git fetch --quiet origin main 2>/dev/null; then
        echo "WARNING: git fetch failed — running against the current checkout." >&2
        return 0
    fi

    if git merge --ff-only --quiet origin/main 2>/dev/null; then
        return 0
    fi

    echo "WARNING: clone has diverged from origin/main and was NOT updated." >&2
    echo "  ahead/behind: $(git rev-list --left-right --count HEAD...origin/main 2>/dev/null | tr '\t' '/')" >&2
    echo "  this bot is running against a stale checkout; resolve on the Pi." >&2
    return 0
}

sync_repo

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
