#!/bin/bash
# start.sh — SORRY! game server launcher
# Place in ~/Documents/sorry/ and run: chmod +x start.sh
#
# First run: pass --setup to install the 'sorry' alias in ~/.bashrc
#   ./start.sh --setup
#
# Normal use:
#   ./start.sh        (from ~/Documents/sorry/)
#   sorry             (from anywhere, after --setup)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ── Setup mode: install alias ──────────────────────────────────────────────────
if [[ "$1" == "--setup" ]]; then
    ALIAS_LINE="alias sorry='$SCRIPT_DIR/start.sh'"
    if grep -q "alias sorry=" ~/.bashrc; then
        echo "✓ 'sorry' alias already exists in ~/.bashrc — no change needed."
    else
        echo "" >> ~/.bashrc
        echo "# SORRY! game server" >> ~/.bashrc
        echo "$ALIAS_LINE" >> ~/.bashrc
        echo "✓ Added 'sorry' alias to ~/.bashrc."
        echo "  Run: source ~/.bashrc   (or open a new terminal) to activate it."
    fi
    exit 0
fi

# ── Launch server ──────────────────────────────────────────────────────────────
cd "$SCRIPT_DIR"
source venv/bin/activate

echo "╔══════════════════════════════════╗"
echo "║       SORRY! Game Server         ║"
echo "╚══════════════════════════════════╝"
echo "  Directory : $SCRIPT_DIR"
echo "  Press Ctrl+C to stop."
echo ""

while true; do
    python server.py
    EXIT_CODE=$?
    if [[ $EXIT_CODE -eq 0 ]]; then
        # Clean exit (Ctrl+C) — don't restart
        echo ""
        echo "Server stopped cleanly. Goodbye!"
        break
    else
        echo ""
        echo "⚠ Server exited with code $EXIT_CODE — restarting in 3 seconds..."
        echo "  (Press Ctrl+C now to cancel restart)"
        sleep 3
    fi
done
