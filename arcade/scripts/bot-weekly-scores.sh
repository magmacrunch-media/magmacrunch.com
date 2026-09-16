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
#
# createDiscussion takes a category *id*, so look it up by slug first. GraphQL
# answers HTTP 200 with an "errors" array when a call fails, which gh_api counts
# as success -- so the response body is checked too, not just the status.
# A failure here is reported and does not stop the Discord post.
post_discussion() {
    local lookup ids repo_id category_id payload response url

    lookup=$(node -e 'console.log(JSON.stringify({ query:
        "{ repository(owner: \"magmacrunch-media\", name: \"magmacrunch.com\") {" +
        " id discussionCategories(first: 25) { nodes { id slug } } } }" }))')

    if ! response=$(gh_api POST /graphql "$lookup"); then
        echo "WARNING: could not look up the High Scores category — Discussion not posted." >&2
        return 0
    fi

    if ! ids=$(RESPONSE="$response" node -e '
        const d = JSON.parse(process.env.RESPONSE);
        const repo = d.data && d.data.repository;
        const cat = repo && repo.discussionCategories.nodes.find(c => c.slug === "high-scores");
        if (!repo || !cat) { console.error(JSON.stringify(d.errors || d)); process.exit(1); }
        console.log(repo.id + " " + cat.id);'); then
        echo "WARNING: High Scores category not found — Discussion not posted." >&2
        return 0
    fi
    read -r repo_id category_id <<< "$ids"

    payload=$(REPO_ID="$repo_id" CATEGORY_ID="$category_id" TITLE="$TITLE" BODY="$REPORT" node -e '
        console.log(JSON.stringify({
            query: "mutation ($input: CreateDiscussionInput!) { createDiscussion(input: $input) { discussion { url } } }",
            variables: { input: {
                repositoryId: process.env.REPO_ID,
                categoryId: process.env.CATEGORY_ID,
                title: process.env.TITLE,
                body: process.env.BODY,
            } },
        }));')

    if ! response=$(gh_api POST /graphql "$payload"); then
        echo "WARNING: Discussion post failed." >&2
        return 0
    fi

    if url=$(RESPONSE="$response" node -e '
        const d = JSON.parse(process.env.RESPONSE);
        const disc = d.data && d.data.createDiscussion && d.data.createDiscussion.discussion;
        if (!disc) { console.error(JSON.stringify(d.errors || d)); process.exit(1); }
        console.log(disc.url);'); then
        echo "Posted Discussion: $url"
    else
        echo "WARNING: GitHub refused the Discussion." >&2
    fi
}

post_discussion

# ── Discord ──
if [ -n "${DISCORD_WEBHOOK_URL:-}" ]; then
    discord_post "$DISCORD_PAYLOAD"
    echo "Posted to Discord"
else
    echo "WARNING: no DISCORD_WEBHOOK_URL — Discord not posted." >&2
fi

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Weekly scores complete"
