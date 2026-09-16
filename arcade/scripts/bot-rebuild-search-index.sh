#!/bin/bash
# Rebuild search index and commit to repo.
# Cron: 5 7 * * * (daily, Pi local time -- see the crontab note in pi-bot-env.sh)
#
# Built with the repo's own scripts/build-search-index.js -- the same builder
# as `make search-index` and `npm run build-search` -- not with
# `magmascript search build-index`.
#
# magmascript carries a separate Python port of that builder, and the two had
# drifted. On 2026-09-16 this bot, running magmascript 2.3.0, rebuilt the index
# with ten redirect stubs in it as results titled "moved" (six artist
# music-videos.html pages, four under tools/), undoing the noindex skip the JS
# builder had gained the day before. The checkout was current; the indexer was
# not. The JS builder lives in the checkout sync_repo has just fast-forwarded,
# so it cannot lag the site it indexes. A pip-installed copy always can.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Rebuilding search index"

node scripts/build-search-index.js

git add search-index.json
git diff --cached --quiet || git commit -m "Rebuild search index"
git push --quiet

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Search index rebuilt"
