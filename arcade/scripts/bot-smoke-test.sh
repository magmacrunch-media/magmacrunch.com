#!/bin/bash
# Run Playwright smoke tests and create GitHub Issue on failure.
# Cron: 0 10 * * 1 (Monday 10 AM UTC)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/pi-bot-env.sh"

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Starting smoke tests"

# Start local server
python3 -m http.server 8080 --directory "$REPO_DIR" &
SERVER_PID=$!
sleep 2

# Run tests
cd "$REPO_DIR/arcade/tests"
node smoke-test.mjs 2>&1 | tee /tmp/smoke-test-output.txt
TEST_EXIT=${PIPESTATUS[0]}

kill $SERVER_PID 2>/dev/null || true

if [ "$TEST_EXIT" -ne 0 ]; then
    echo "Smoke tests failed (exit code $TEST_EXIT)"

    RESULTS=""
    if [ -f "$REPO_DIR/arcade/tests/results.md" ]; then
        RESULTS=$(cat "$REPO_DIR/arcade/tests/results.md")
    else
        RESULTS=$(cat /tmp/smoke-test-output.txt)
    fi

    DATE=$(date -u '+%Y-%m-%d')
    PAYLOAD=$(node -e "
        const body = $(printf '%s' "$RESULTS" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8');console.log(JSON.stringify(d))");
        console.log(JSON.stringify({
            title: 'Smoke test failed — $DATE',
            body: body + '\n\n---\n*Created by Pi smoke test bot*',
            labels: ['automated issue', 'bug']
        }));
    ")

    gh_api POST "/repos/magmacrunchmedia/magmacrunch.com/issues" "$PAYLOAD" > /dev/null
else
    echo "All smoke tests passed"
fi

echo "[$(date -u '+%Y-%m-%d %H:%M UTC')] Smoke tests complete"
