#!/bin/bash
# Check Pi service health via TCP port checks.
# Posts to GitHub Discussions and Discord on failure.
# Cron: */30 * * * * (every 30 minutes)
#
#   DRY_RUN=1 bot-check-services.sh                  check, post nothing
#   SERVICES_JSON=/tmp/x.json DRY_RUN=1 ...          check a test service list

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

if [ -n "${DRY_RUN:-}" ]; then
    discord_post() { echo "DRY_RUN: Discord not posted"; }
fi

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Starting service health check"

PI=127.0.0.1
FAILED=""
HEALTHY=""

# Ports come from arcade/shared/services.json, the same file chat-server.py and
# start-all.sh read. This script keeping its own copy is how it ended up as the
# only one of the three that knew about all eleven services.
SERVICES_JSON="${SERVICES_JSON:-$SCRIPT_DIR/../shared/services.json}"

if [ ! -f "$SERVICES_JSON" ]; then
    echo "Missing $SERVICES_JSON — cannot tell which ports to probe" >&2
    exit 1
fi

# Names are squashed to one word: they are accumulated into $FAILED as a
# space-separated list, and the Discord payload splits on spaces.
while IFS=$'\t' read -r PORT NAME; do
    [ -z "$PORT" ] && continue
    if nc -z -w2 "$PI" "$PORT" 2>/dev/null; then
        HEALTHY="$HEALTHY $NAME"
        echo "  ✓ $NAME (:$PORT)"
    else
        FAILED="$FAILED $NAME"
        echo "  ✗ $NAME (:$PORT)"
    fi
done < <(node -e '
    const path = process.argv[1];
    for (const s of require(path).services) {
        console.log(s.port + "\t" + s.name.replace(/ /g, ""));
    }
' "$SERVICES_JSON")

# ONE DISCUSSION PER OUTAGE, NOT ONE PER RUN.
#
# This bot has never posted a Discussion. The payload sent `categorySlug`, which
# CreateDiscussionInput does not have (it takes a categoryId); the call's output
# and status were both thrown away, and GraphQL reports errors with HTTP 200
# anyway; and the body was built with "\n" inside double quotes, which bash
# leaves as a literal backslash-n. None of it ever showed, because no service
# has been down since the log began.
#
# Fixing only those would have produced a new public Discussion every thirty
# minutes for as long as a service stayed down. So a Discussion is posted when
# the SET of down services changes, and the set is remembered in DOWN_STAMP. A
# failed post leaves the stamp alone, so the next run tries again; recovery
# clears it, so the next outage posts. Discord keeps its every-run alert.
DOWN_STAMP="$PI_HOME/arcade-config/.services-down"

if [ -n "$FAILED" ]; then
    echo "Down services:$FAILED"

    DOWN_NOW=$(printf '%s\n' $FAILED | sort | tr '\n' ' ' | sed 's/ $//')
    DOWN_BEFORE=$(cat "$DOWN_STAMP" 2>/dev/null || true)

    REPORT=$(cat <<EOF
# Pi Service Health Check Failed

Some services on the Pi are not responding.

## Down services

$(printf -- '- %s\n' $FAILED)

## Quick diagnosis

\`\`\`bash
ssh jake@192.168.1.16 "sudo systemctl status 'arcade-*' --no-pager"
\`\`\`

## Restart a service

\`\`\`bash
ssh jake@192.168.1.16 "sudo systemctl restart arcade-<name>"
\`\`\`

---
*Created by Pi service health bot*
EOF
)

    if [ "$DOWN_NOW" = "$DOWN_BEFORE" ]; then
        echo "Discussion already posted for this outage ($DOWN_NOW) — not posting again"
    elif [ -n "${DRY_RUN:-}" ]; then
        echo "DRY_RUN: would post this Discussion to Service Health:"
        printf '%s\n' "$REPORT"
    elif url=$(gh_create_discussion service-health "Pi services down — $(date -u '+%Y-%m-%d %H:%M')" "$REPORT"); then
        echo "Posted Discussion: $url"
        printf '%s\n' "$DOWN_NOW" > "$DOWN_STAMP"
    else
        echo "WARNING: Discussion not posted — will try again next run." >&2
    fi

    # Post to Discord
    SERVICE_LIST=$(echo "$FAILED" | sed 's/^[[:space:]]*//' | sed 's/ /\\n- /g')
    discord_post "{
        \"embeds\": [{
            \"title\": \"⚠️ Arcade Services Down\",
            \"description\": \"**The following services are not responding:**\\n- ${SERVICE_LIST}\",
            \"fields\": [
                {
                    \"name\": \"Diagnose\",
                    \"value\": \"\`\`\`bash\nssh jake@192.168.1.16 'sudo systemctl status arcade-* --no-pager'\n\`\`\`\"
                },
                {
                    \"name\": \"Restart all\",
                    \"value\": \"\`\`\`bash\nssh jake@192.168.1.16 'sudo systemctl restart arcade-*'\n\`\`\`\"
                }
            ],
            \"color\": 16750848,
            \"footer\": {
                \"text\": \"Service Health Check · every 30 min (Pi bot)\"
            }
        }]
    }"
else
    echo "All services healthy"
    if [ -f "$DOWN_STAMP" ] && [ -z "${DRY_RUN:-}" ]; then
        echo "Recovered from: $(cat "$DOWN_STAMP")"
        rm -f "$DOWN_STAMP"
    fi
fi

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Service check complete"
