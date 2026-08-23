#!/bin/bash
# start-all.sh — Launch all magmacrunch arcade servers
# Place in ~/arcade/ and run: chmod +x start-all.sh
#
# Usage:
#   ./start-all.sh        Start all servers listed in shared/services.json
#   ./start-all.sh --setup Install 'arcade' alias in ~/.bashrc

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Setup mode: install alias ────────────────────────────────────────────────
if [[ "$1" == "--setup" ]]; then
    ALIAS_LINE="alias arcade='$SCRIPT_DIR/start-all.sh'"
    if grep -q "alias arcade=" ~/.bashrc; then
        echo "✓ 'arcade' alias already exists in ~/.bashrc — no change needed."
    else
        echo "" >> ~/.bashrc
        echo "# magmacrunch arcade servers" >> ~/.bashrc
        echo "$ALIAS_LINE" >> ~/.bashrc
        echo "✓ Added 'arcade' alias to ~/.bashrc."
        echo "  Run: source ~/.bashrc   (or open a new terminal) to activate it."
    fi
    exit 0
fi

# ── Auto-setup venv if missing ───────────────────────────────────────────────
VENV_DIR="$SCRIPT_DIR/venv"

if [[ ! -d "$VENV_DIR" ]]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    echo "✓ Virtual environment created."
fi

# Activate venv
source "$VENV_DIR/bin/activate"

# Install all dependencies from requirements.txt
if [[ -f "$SCRIPT_DIR/requirements.txt" ]]; then
    pip install -r "$SCRIPT_DIR/requirements.txt" --quiet 2>/dev/null
fi

# ── Services ─────────────────────────────────────────────────────────────────
# Read from shared/services.json rather than keeping a copy of the list here.
# The copy that used to live in this file had gone stale — it never started
# Aggravation, which has had a systemd unit and an nginx route for a while — so
# a local run of the arcade did not match what the Pi actually serves.
#
# Add a game there, not here.

SERVICES_JSON="$SCRIPT_DIR/shared/services.json"

if [[ ! -f "$SERVICES_JSON" ]]; then
    echo "Missing $SERVICES_JSON — cannot tell which servers to start." >&2
    exit 1
fi

read_services() {
    python3 - "$SERVICES_JSON" <<'PY'
import json, sys
with open(sys.argv[1], encoding='utf-8') as fh:
    for svc in json.load(fh)['services']:
        print('\t'.join([svc['dir'], svc['exec'], str(svc['port']), svc['name']]))
PY
}

# ── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── Track PIDs ───────────────────────────────────────────────────────────────
PIDS=()

# ── Cleanup on exit ──────────────────────────────────────────────────────────
cleanup() {
    echo ""
    echo -e "${YELLOW}Shutting down all servers...${NC}"
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null
    done
    wait
    echo -e "${GREEN}All servers stopped. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# ── Banner ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     MAGMACRUNCH ARCADE — Game Servers       ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Get hostname ─────────────────────────────────────────────────────────────
HOSTNAME=$(hostname)
LOCAL_IP=$(ifconfig 2>/dev/null | grep -o 'inet [0-9.]*' | grep -v '127.0.0.1' | head -1 | awk '{print $2}')

# ── Start each server ───────────────────────────────────────────────────────
while IFS=$'\t' read -r dir entry port name; do
    [[ -z "$port" ]] && continue
    target="$SCRIPT_DIR/$dir"

    if [[ -f "$target/$entry" ]]; then
        echo -e "${GREEN}Starting ${name} server on port ${port}...${NC}"
        cd "$target"
        python3 "$entry" --port "$port" &
        PIDS+=($!)
        echo -e "  → ws://${HOSTNAME}.local:${port}"
        [[ -n "$LOCAL_IP" ]] && echo -e "  → ws://${LOCAL_IP}:${port}"
        echo ""
    else
        echo -e "${YELLOW}⚠ Not found: $dir/$entry — skipping ${name}${NC}"
    fi
done < <(read_services)

cd "$SCRIPT_DIR"

# ── Summary ──────────────────────────────────────────────────────────────────
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo -e "${GREEN}All servers running!${NC}"
echo ""
echo "Press Ctrl+C to stop all servers."
echo ""

# ── Wait for all background processes ────────────────────────────────────────
wait
