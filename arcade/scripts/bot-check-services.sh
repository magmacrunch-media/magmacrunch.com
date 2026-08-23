#!/bin/bash
# Check Pi service health via TCP port checks.
# Posts to GitHub Discussions and Discord on failure.
# Cron: */30 * * * * (every 30 minutes)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Starting service health check"

PI=127.0.0.1
FAILED=""
HEALTHY=""

# Ports come from arcade/shared/services.json, the same file chat-server.py and
# start-all.sh read. This script keeping its own copy is how it ended up as the
# only one of the three that knew about all eleven services.
SERVICES_JSON="$SCRIPT_DIR/../shared/services.json"

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

if [ -n "$FAILED" ]; then
    echo "Down services:$FAILED"

    # Post to GitHub Discussion
    REPORT="# Pi Service Health Check Failed\n\nSome services on the Pi are not responding.\n\n## Down services:$FAILED\n\n## Quick diagnosis\n\n\`\`\`bash\nssh jake@192.168.1.16 \"sudo systemctl status 'arcade-*' --no-pager\"\n\`\`\`\n\n## Restart a service\n\n\`\`\`bash\nssh jake@192.168.1.16 \"sudo systemctl restart arcade-<name>\"\n\`\`\`\n\n---\n*Created by Pi service health bot*"

    PAYLOAD=$(node -e "
        console.log(JSON.stringify({
            query: 'mutation (\$input: CreateDiscussionInput!) { createDiscussion(input: \$input) { discussion { url } } }',
            variables: {
                input: {
                    repositoryId: '$(gh_api GET /repos/magmacrunchmedia/magmacrunch.com | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.parse(d).node_id)")',
                    title: 'Pi services down — $(date -u '+%Y-%m-%d %H:%M')',
                    body: $(printf '%s' "$REPORT" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.stringify(d))"),
                    categorySlug: 'service-health'
                }
            }
        }));
    ")

    gh_api POST "/graphql" "$PAYLOAD" > /dev/null 2>&1 || echo "Failed to post Discussion"

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
fi

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Service check complete"
