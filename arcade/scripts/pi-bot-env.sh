#!/bin/bash
# Shared environment for Pi cron bots.
# Sourced by individual bot scripts.
#
# After first setup, populate ~/arcade-config/.env with:
#   GITHUB_PAT=ghp_...        API only (issues, discussions) — NOT for push
#   TMDB_API_KEY=...
#   LASTFM_API_KEY=...
#   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
#
# Pushes go over SSH with a deploy key, not the PAT. See "Push credential"
# below.

set -euo pipefail

PI_HOME="/home/jake"
REPO_DIR="$PI_HOME/website"
LOG_DIR="$PI_HOME/arcade/logs"
ENV_FILE="$PI_HOME/arcade-config/.env"
LOCK_FILE="$PI_HOME/arcade-config/bots.lock"

# cron runs with PATH=/usr/local/bin:/usr/bin:/bin:/usr/games, which omits
# ~/.local/bin — where pip installs magmascript. bot-rebuild-search-index.sh
# died on "magmascript: command not found" every day while the same command
# worked fine in an interactive shell.
PATH="$PI_HOME/.local/bin:$PATH"
export PATH

mkdir -p "$LOG_DIR" "$(dirname "$LOCK_FILE")"

# Load .env if it exists
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
fi

cd "$REPO_DIR"

# ONE BOT IN THE CHECKOUT AT A TIME.
#
# Eight bots share this one clone, and cron fires several of them in the same
# minute: four weekly bots at Monday 06:00, and the half-hourly service check
# lands on every :00 and :30 — including the daily index rebuild at 07:00.
# Each of them fetched, merged, added, committed and pushed against the same
# .git with no coordination, and the failures were exactly what that
# predicts:
#
#   - 2026-09-06 07:00: the index bot and the service check both tried to
#     fast-forward in the same second, both failed, the index bot then
#     committed on the stale base, and the clone was diverged from origin
#     from that morning on (every push non-fast-forward until a human reset).
#   - 2026-09-07 06:00 and 06:30: each bot used to rewrite the remote URL on
#     startup, which takes .git/config.lock; the losers died under set -e
#     with "could not lock config file" before doing any work. The two backup
#     bots have never once run to completion on the Pi.
#
# The lock is held on fd 9 for the life of the sourcing script, so it covers
# the bot's own commit and push, not just the sync. Ten minutes is longer
# than any bot takes (the smoke test is the slowest at about a minute), so
# a waiting bot runs late rather than not at all.
exec 9>"$LOCK_FILE"
if ! flock -w 600 9; then
    echo "ERROR: could not take $LOCK_FILE within 10 minutes — another bot is stuck. Not running." >&2
    exit 1
fi

# Push credential: a deploy key, not a token in the URL.
#
# The remote was https://<PAT>@github.com/... and each bot re-set it on every
# run. That token expired 30 days after it was minted (2026-09-07), git
# printed the URL — token included — into the logs on every failed push, and
# the rewrite itself was the config-lock race above. The clone now has an
# SSH remote and core.sshCommand pointing at ~/.ssh/magmacrunch-com-deploy,
# a write deploy key on magmacrunch-media/magmacrunch.com. Deploy keys do
# not expire and never appear in a URL. Set once on the Pi; this only checks.
EXPECTED_REMOTE="git@github.com:magmacrunch-media/magmacrunch.com.git"
if [ "$(git remote get-url origin 2>/dev/null)" != "$EXPECTED_REMOTE" ]; then
    echo "WARNING: origin is not $EXPECTED_REMOTE — pushes will fail. Fix with:" >&2
    echo "  git remote set-url origin $EXPECTED_REMOTE" >&2
    echo "  git config core.sshCommand 'ssh -i ~/.ssh/magmacrunch-com-deploy -o IdentitiesOnly=yes'" >&2
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
#
# git's own stderr is kept, prefixed, rather than sent to /dev/null: the
# 2026-09-06 divergence could not be diagnosed from the log because the one
# line that said why the fast-forward failed had been thrown away.
sync_repo() {
    if ! git fetch --quiet origin main 2> >(sed 's/^/  git fetch: /' >&2); then
        echo "WARNING: git fetch failed — running against the current checkout." >&2
        return 0
    fi

    if git merge --ff-only --quiet origin/main 2> >(sed 's/^/  git merge: /' >&2); then
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
#
# This is the one remaining use of GITHUB_PAT: a deploy key can push but
# cannot call the API. Only the three reporting bots (links, services, smoke)
# need it. Without it they still run; their Issue/Discussion posts fail.
gh_api() {
    local method="$1"
    local endpoint="$2"
    local data="${3:-}"

    if [ -z "${GITHUB_PAT:-}" ]; then
        echo "GitHub API: no GITHUB_PAT in $ENV_FILE — cannot $method $endpoint" >&2
        return 1
    fi

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
