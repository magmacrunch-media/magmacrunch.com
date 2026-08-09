#!/bin/bash
# setup-pi.sh — One-shot installer for MagmaCrunch Arcade servers + dashboard
#
# Usage:
#   sudo bash scripts/setup-pi.sh
#
# This script:
#   1. Installs systemd service files for all game servers
#   2. Installs the admin dashboard service
#   3. Enables and starts all services
#   4. Installs desktop shortcut on the Pi
#   5. Prints a summary

set -e

# ── Colors ───────────────────────────────────────────────────────────────────

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
err()  { echo -e "${RED}✗ $1${NC}"; }

# ── Check root ───────────────────────────────────────────────────────────────

if [[ $EUID -ne 0 ]]; then
    err "This script must be run as root (use sudo)"
    exit 1
fi

# ── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARCADE_DIR="$(dirname "$SCRIPT_DIR")"
SYSTEMD_DIR="$ARCADE_DIR/systemd"
ADMIN_DIR="$ARCADE_DIR/admin"

# ── Banner ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   MAGMACRUNCH ARCADE — Server Setup         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ── Ensure venv exists ──────────────────────────────────────────────────────

VENV_DIR="$ARCADE_DIR/venv"

if [[ ! -d "$VENV_DIR" ]]; then
    warn "Virtual environment not found, creating..."
    sudo -u jake python3 -m venv "$VENV_DIR"
    ok "Virtual environment created"
fi

# Install websockets if missing
if ! sudo -u jake "$VENV_DIR/bin/python3" -c "import websockets" 2>/dev/null; then
    warn "Installing websockets..."
    sudo -u jake "$VENV_DIR/bin/pip" install websockets --quiet
    ok "Websockets installed"
fi

# ── Install game server services ─────────────────────────────────────────────

echo -e "${CYAN}Installing game server services...${NC}"

for service_file in "$SYSTEMD_DIR"/*.service; do
    if [[ -f "$service_file" ]]; then
        name=$(basename "$service_file")
        cp "$service_file" /etc/systemd/system/
        ok "Installed $name"
    fi
done

# ── Install admin dashboard service ──────────────────────────────────────────

echo ""
echo -e "${CYAN}Installing admin dashboard...${NC}"

if [[ -f "$ADMIN_DIR/systemd/arcade-admin.service" ]]; then
    cp "$ADMIN_DIR/systemd/arcade-admin.service" /etc/systemd/system/
    ok "Installed arcade-admin.service"
fi

# ── Install private server service ───────────────────────────────────────────

echo ""
echo -e "${CYAN}Installing private server...${NC}"

PRIVATE_DIR="$ARCADE_DIR/private"
if [[ -f "$PRIVATE_DIR/systemd/arcade-private.service" ]]; then
    cp "$PRIVATE_DIR/systemd/arcade-private.service" /etc/systemd/system/
    ok "Installed arcade-private.service"
fi

# ── Install MCP server service ──────────────────────────────────────────────

echo ""
echo -e "${CYAN}Installing MCP server...${NC}"

MCP_DIR="$ARCADE_DIR/mcp-server"
if [[ -f "$MCP_DIR/serve.py" ]]; then
    # Install mcp[cli] into venv if not present
    if ! sudo -u jake "$VENV_DIR/bin/python3" -c "import mcp" 2>/dev/null; then
        warn "Installing mcp[cli]..."
        sudo -u jake "$VENV_DIR/bin/pip" install "mcp[cli]" --quiet
        ok "mcp[cli] installed"
    fi

    if [[ -f "$ARCADE_DIR/systemd/arcade-mcp.service" ]]; then
        cp "$ARCADE_DIR/systemd/arcade-mcp.service" /etc/systemd/system/
        ok "Installed arcade-mcp.service"
    fi
else
    warn "MCP server not found — skipping"
fi

# ── Install magmascript ───────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}Installing magmascript...${NC}"

MAGMASCRIPT_WHEEL="/tmp/magmascript-*.whl"
if ls $MAGMASCRIPT_WHEEL 1>/dev/null 2>&1; then
    sudo -u jake "$VENV_DIR/bin/pip" install --upgrade $MAGMASCRIPT_WHEEL --quiet
    mkdir -p /home/jake/bin
    ln -sf "$VENV_DIR/bin/magmascript" /home/jake/bin/magmascript
    ok "magmascript installed"
else
    warn "magmascript wheel not found in /tmp — skipping (deploy workflow will install it)"
fi

# ── Install Node.js and lychee for cron bots ────────────────────────────────

echo ""
echo -e "${CYAN}Installing cron bot dependencies...${NC}"

# Node.js
if ! command -v node &>/dev/null; then
    warn "Installing Node.js..."
    apt-get install -y -qq nodejs npm > /dev/null 2>&1
    ok "Node.js $(node --version) installed"
else
    ok "Node.js $(node --version) already installed"
fi

# lychee (link checker)
if ! command -v lychee &>/dev/null; then
    warn "Installing lychee..."
    LYCHEE_VERSION="v0.24.2"
    ARCH=$(uname -m)
    if [ "$ARCH" = "aarch64" ]; then
        LYCHEE_ARCH="aarch64-unknown-linux-gnu"
    else
        LYCHEE_ARCH="x86_64-unknown-linux-gnu"
    fi
    cd /tmp
    curl -sLO "https://github.com/lycheeverse/lychee/releases/download/lychee-${LYCHEE_VERSION}/lychee-${LYCHEE_ARCH}.tar.gz"
    tar xzf "lychee-${LYCHEE_ARCH}.tar.gz"
    mv "lychee-${LYCHEE_ARCH}/lychee" /usr/local/bin/
    rm -rf "lychee-${LYCHEE_ARCH}" "lychee-${LYCHEE_ARCH}.tar.gz"
    ok "lychee $(lychee --version) installed"
else
    ok "lychee $(lychee --version) already installed"
fi

# Clone website repo for cron bots
WEBSITE_DIR="/home/jake/website"
if [[ ! -d "$WEBSITE_DIR/.git" ]]; then
    warn "Cloning website repo..."
    sudo -u jake git clone --depth 1 https://github.com/magmacrunchmedia/magmacrunch.com.git "$WEBSITE_DIR"
    sudo -u jake git config --global user.name "Pi Bot" --global user.email "pi@magmacrunch.com"
    ok "Website repo cloned"
else
    ok "Website repo already exists"
fi

# Create .env template if missing (outside rsync path)
ENV_DIR="/home/jake/arcade-config"
ENV_FILE="$ENV_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
    mkdir -p "$ENV_DIR"
    cat > "$ENV_FILE" << 'ENVEOF'
# Pi Bot Environment — fill in before enabling cron jobs
# GITHUB_PAT=ghp_...
# TMDB_API_KEY=...
# LASTFM_API_KEY=...
# DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
# MCP_API_KEY=...  (for remote MCP server — see AGENTS.md)
ENVEOF
    chmod 600 "$ENV_FILE"
    ok "Created .env template"
fi

# Create logs directory
mkdir -p /home/jake/arcade/logs
chown -R jake:jake /home/jake/arcade/logs

# ── Reload systemd ──────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}Reloading systemd...${NC}"
systemctl daemon-reload
ok "Systemd reloaded"

# ── Enable and start services ───────────────────────────────────────────────

echo ""
echo -e "${CYAN}Enabling and starting services...${NC}"

SERVICES=(
    "arcade-sorry"
    "arcade-cribbage"
    "arcade-stud"
    "arcade-chat"
    "arcade-chess"
    "arcade-checkers"
    "arcade-backgammon"
    "arcade-chinese-checkers"
    "arcade-parchisi"
    "arcade-aggravation"
    "arcade-counter"
    "arcade-admin"
    "arcade-private"
    "arcade-mcp"
)

for svc in "${SERVICES[@]}"; do
    systemctl enable "$svc" 2>/dev/null
    systemctl restart "$svc" 2>/dev/null
    ok "Started $svc"
done

# ── Install desktop shortcut ────────────────────────────────────────────────

echo ""
echo -e "${CYAN}Installing desktop shortcut...${NC}"

DESKTOP_DIR="/home/jake/Desktop"
DESKTOP_FILE="$ADMIN_DIR/MagmaCrunch-Ops.desktop"

if [[ -d "$DESKTOP_DIR" ]] && [[ -f "$DESKTOP_FILE" ]]; then
    cp "$DESKTOP_FILE" "$DESKTOP_DIR/MagmaCrunch-Ops.desktop"
    chmod +x "$DESKTOP_DIR/MagmaCrunch-Ops.desktop"
    chown jake:jake "$DESKTOP_DIR/MagmaCrunch-Ops.desktop"
    ok "Desktop shortcut installed"
else
    warn "Desktop directory not found — skipping shortcut"
fi

# Also install to applications menu
APP_DIR="/home/jake/.local/share/applications"
if [[ -f "$DESKTOP_FILE" ]]; then
    mkdir -p "$APP_DIR"
    cp "$DESKTOP_FILE" "$APP_DIR/MagmaCrunch-Ops.desktop"
    chown -R jake:jake "$APP_DIR"
    ok "Application menu entry installed"
fi

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo -e "${GREEN}Setup complete!${NC}"
echo ""
echo "  Dashboard:   http://localhost:8780"
echo "  Dashboard:   http://$(hostname -I | awk '{print $1}'):8780"
echo "  MCP Server:  https://magmacrunch.duckdns.org/mcp"
echo ""
echo "  Desktop:     Double-click 'MagmaCrunch Ops' icon"
echo ""
echo "  Service management:"
echo "    sudo systemctl status 'arcade-*'"
echo "    sudo systemctl restart arcade-chat"
echo "    journalctl -u 'arcade-*' -f"
echo ""
echo -e "${CYAN}────────────────────────────────────────────────${NC}"
echo ""
