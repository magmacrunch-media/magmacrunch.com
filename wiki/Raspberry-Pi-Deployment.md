All multiplayer servers, the admin dashboard, and shared services run on a Raspberry Pi.

---

## Server Info

- **Domain**: `magmacrunch.duckdns.org` (Dynamic DNS)
- **Desktop**: Chromium kiosk with "MagmaCrunch Ops" shortcut
- **Setup script**: `arcade/scripts/setup-pi.sh`

## One-Shot Setup

```bash
# From Mac — copy files to Pi and run setup
rsync -avz arcade/ jake@<pi>:~/arcade/
ssh jake@<pi> "sudo bash ~/arcade/scripts/setup-pi.sh"
```

This:
1. Copies all arcade files to the Pi
2. Installs systemd services for all servers
3. Enables auto-start on boot
4. Places desktop shortcuts

## Deploying with Makefile

```bash
# Deploy arcade/ to Pi and restart all services
make deploy-pi

# Check service status
make pi-status

# Tail service logs
make logs
```

`make deploy-pi` rsyncs `arcade/` to the Pi (excluding `node_modules`, `.git`, `__pycache__`, and score files), then restarts all `arcade-*` systemd services.

## Deploying Individual Services

```bash
# Copy specific files
rsync -avz arcade/chat-server.py jake@<pi>:~/arcade/chat-server.py

# Restart the service
ssh jake@<pi> "sudo systemctl restart arcade-chat"
```

## Systemd Services

All services auto-start on boot and auto-restart on crash.

| Service | Port | Purpose |
|---------|------|---------|
| `arcade-sorry` | 8765 | SORRY! multiplayer |
| `arcade-cribbage` | 8766 | Cribbage multiplayer |
| `arcade-stud` | 8767 | Söko (Scandinavian Stud) multiplayer |
| `arcade-chat` | 8768 | Global chat system |
| `arcade-chess` | 8769 | Chess multiplayer |
| `arcade-checkers` | 8770 | Checkers multiplayer |
| `arcade-backgammon` | 8771 | Backgammon multiplayer |
| `arcade-chinese-checkers` | 8772 | Chinese Checkers multiplayer |
| `arcade-parchisi` | 8773 | Parchis multiplayer |
| `arcade-aggravation` | 8774 | Aggravation multiplayer |
| `arcade-counter` | 8783 | Hit counter WebSocket |
| `arcade-admin` | 8780 | MAGMA//OPS admin dashboard |

## Service Files

Systemd service files are in `arcade/systemd/`. Each follows this pattern:

```ini
[Unit]
Description=Arcade Chat Server
After=network.target

[Service]
ExecStart=/usr/bin/python3 /home/jake/arcade/chat-server.py
WorkingDirectory=/home/jake/arcade
Restart=always
User=jake

[Install]
WantedBy=multi-user.target
```

## Quick Commands

```bash
# Check status of all arcade services
sudo systemctl status 'arcade-*'

# Restart a specific service
sudo systemctl restart arcade-chat

# View logs
journalctl -u 'arcade-*' -f
journalctl -u arcade-chat -n 50

# Stop a service
sudo systemctl stop arcade-chat
```

## Private Collection

Hosted separately at port 8782 — password-protected, not part of the public arcade.
