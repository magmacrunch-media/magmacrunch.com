# Raspberry Pi deployment — one-shot setup, venv recovery, admin dashboard, systemd services and ports.

## Raspberry Pi deployment

### One-shot setup

```bash
# From Mac — copy files to Pi and run setup
rsync -avz arcade/ jake@100.74.172.4:~/arcade/
ssh jake@100.74.172.4 "sudo bash ~/arcade/scripts/setup-pi.sh"
```

This installs systemd services for all servers + dashboard, enables auto-start on boot, and places a desktop shortcut. The venv is created automatically by `setup-pi.sh` and dependencies are installed from `arcade/requirements.txt`.

### Venv recovery

If the Pi venv is lost, recreate it:

```bash
ssh jake@100.74.172.4
cd ~/arcade
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart 'arcade-*'
```

### Admin dashboard

 `arcade/admin/` — Web-based monitoring and management UI (v4.0).

- **Port**: 8780 (HTTP) + 8781 (WebSocket for live logs)
- **Desktop shortcut**: "MagmaCrunch Ops" — opens dashboard in Chromium
- **Config**: `arcade/admin/config.json` — set `auth: true` for password protection
- **Dependency**: Uses `magmascript` Python library for GitHub API (`GHClient`) and Pi management (`PIClient(local=True)`)

Commands:
```bash
ssh jake@100.74.172.4 "sudo systemctl restart arcade-admin"
ssh jake@100.74.172.4 "journalctl -u arcade-admin -f"
```

### Systemd services

All servers run as systemd services (auto-start on boot, auto-restart on crash).
The name/port/path mapping is `arcade/shared/services.json`; this table mirrors it.

| Service | Port |
|---|---|
| `arcade-sorry` | 8765 |
| `arcade-cribbage` | 8766 |
| `arcade-stud` | 8767 |
| `arcade-chat` | 8768 |
| `arcade-chess` | 8769 |
| `arcade-checkers` | 8770 |
| `arcade-backgammon` | 8771 |
| `arcade-chinese-checkers` | 8772 |
| `arcade-parchisi` | 8773 |
| `arcade-aggravation` | 8774 |
| `arcade-counter` | 8783 |
| `arcade-private` | 8782 |
| `arcade-admin` | 8780 |

Quick commands:
```bash
# Status
sudo systemctl status 'arcade-*'

# Restart one
sudo systemctl restart arcade-chat

# Logs
journalctl -u 'arcade-*' -f
journalctl -u arcade-chat -n 50
```

