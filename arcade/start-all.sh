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

# ── Game servers ─────────────────────────────────────────────────────────────
# Format: "directory:port:name"
# Add new games here as you create them

GAMES=(
    "SORRY:8765:SORRY"
    "cribbage:8766:Cribbage"
    "scandinavian-stud:8767:Scandinavian Stud"
    # Add more games below:
    # "newgame:8768:New Game"
)

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

# ── Summary ──────────────────────────────────────────────────────────────────
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo -e "${GREEN}All servers running!${NC}"
echo ""
echo "Press Ctrl+C to stop all servers."
echo ""

# ── Wait for all background processes ────────────────────────────────────────
wait
