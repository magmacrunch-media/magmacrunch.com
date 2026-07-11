#!/bin/bash
# start-all.sh — Launch all magmacrunch arcade game servers
# Place in ~/arcade/ and run: chmod +x start-all.sh
#
# Usage:
#   ./start-all.sh        Start all game servers
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

# Install websockets if missing
if ! python3 -c "import websockets" 2>/dev/null; then
    echo "Installing websockets..."
    pip install websockets --quiet
    echo "✓ Websockets installed."
fi

# ── Game servers ─────────────────────────────────────────────────────────────
# Format: "directory:port:name"
# Add new games here as you create them

GAMES=(
    "SORRY:8765:SORRY"
    "cribbage:8766:Cribbage"
    "scandinavian-stud:8767:Scandinavian Stud"
    "chess:8769:Chess"
    "checkers:8770:Checkers"
    "backgammon:8771:Backgammon"
    "chinese-checkers:8772:Chinese Checkers"
    "parchisi:8773:Parchisi"
    # Add more games below:
)

# ── Chat server (special case) ───────────────────────────────────────────────
CHAT_SERVER="chat-server.py"
CHAT_PORT=8768

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

# ── Start each game server ──────────────────────────────────────────────────
for game in "${GAMES[@]}"; do
    IFS=':' read -r dir port name <<< "$game"
    
    if [[ -d "$SCRIPT_DIR/$dir" ]]; then
        echo -e "${GREEN}Starting ${name} server on port ${port}...${NC}"
        cd "$SCRIPT_DIR/$dir"
        python3 server.py --port "$port" &
        PIDS+=($!)
        echo -e "  → ws://${HOSTNAME}.local:${port}"
        [[ -n "$LOCAL_IP" ]] && echo -e "  → ws://${LOCAL_IP}:${port}"
        echo ""
    else
        echo -e "${YELLOW}⚠ Directory not found: $dir — skipping ${name}${NC}"
    fi
done

# ── Start chat server ────────────────────────────────────────────────────────
if [[ -f "$SCRIPT_DIR/$CHAT_SERVER" ]]; then
    echo -e "${GREEN}Starting Chat server on port ${CHAT_PORT}...${NC}"
    cd "$SCRIPT_DIR"
    python3 "$CHAT_SERVER" --port "$CHAT_PORT" &
    PIDS+=($!)
    echo -e "  → ws://${HOSTNAME}.local:${CHAT_PORT}"
    [[ -n "$LOCAL_IP" ]] && echo -e "  → ws://${LOCAL_IP}:${CHAT_PORT}"
    echo ""
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo -e "${GREEN}All servers running!${NC}"
echo ""
echo "Press Ctrl+C to stop all servers."
echo ""

# ── Wait for all background processes ────────────────────────────────────────
wait
