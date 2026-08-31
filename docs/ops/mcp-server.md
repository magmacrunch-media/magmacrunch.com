# MCP server — remote MCP server on MC1: architecture, setup, tools, service management, troubleshooting.

## MCP server

Remote MCP server that exposes magmacrunch.com data and Pi/MC1 management to AI coding assistants. Runs on MC1 (WSL2), accessible via HTTPS through Pi's nginx reverse proxy.

### Architecture

```
Internet ──HTTPS──> Pi (nginx:443) ──Tailscale──> MC1 (WSL2:8785) ──SSH──> Pi (game servers)
                                        └─SSH──> MC1 (local services)
```

- **Server** (`mcp-server/serve.py`) — runs on MC1 WSL2, port 8785
- **Proxy** — Pi nginx at `https://magmacrunch.duckdns.org/mcp` → MC1 via Tailscale
- **Auth** — API key in `Authorization: Bearer <key>` header (validated by nginx)
- **Config** (`opencode.json`) — opencode connects as `"type": "remote"`
- **Service** — systemd on MC1 WSL2 (`mcp-server.service`) + Windows scheduled task for auto-start on boot

### SSH access

Windows host: `ssh magma@100.75.220.87`
WSL2 commands: `wsl -d Ubuntu -u root -- <command>`

### Setup

**MC1 (WSL2):**
```bash
# Clone repos
cd ~
git clone https://github.com/magmacrunch-media/magmacrunch.com.git website
git clone https://github.com/magmacrunch-media/magmascript.git

# Create Python venv
cd ~/website/mcp-server
python3 -m venv venv
source venv/bin/activate
pip install -r ~/website/mcp-server/requirements.txt
cd ~/magmascript && pip install -e .

# Configure
mkdir -p ~/.config/magmascript
# Add config.toml with [pi], [mc1], [gh] sections
# Add .env with MCP_API_KEY, GITHUB_PAT, DISCOGS_TOKEN

# Enable systemd service
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
```

**Pi (nginx proxy):**
```bash
# nginx proxy_pass points to MC1 via Tailscale
# In /etc/nginx/sites-available/magmacrunch:
#   proxy_pass http://100.75.220.87:8785/mcp;
#   proxy_set_header Host 100.75.220.87:8785;
sudo nginx -t && sudo systemctl reload nginx
```

### Tools

| Category | Tool | Description |
|---|---|---|
| MusicBrainz cache | `list_cached_entities` | List all cached entities (artists, places, contributors, labels, works, collectives) |
| | `get_entity` | Get full data for a specific entity by type and UUID/slug |
| | `search_cache` | Search cached entity names by substring |
| High scores | `list_scoreboards` | List all game leaderboards with entry counts and top scores |
| | `get_scores` | Get leaderboard for a specific game |
| Project structure | `list_archive_pages` | List all archive pages (artists, places, contributors, labels) |
| | `list_arcade_games` | List all arcade games with server info |
| Pi services | `check_pi_services` | Check status of all arcade services |
| | `get_service_logs` | Get recent logs for a service |
| | `restart_pi_service` | Restart a service |
| | `get_pi_system_info` | Get uptime, memory, CPU temp, load |
| | `deploy_to_pi` | rsync files to the Pi and optionally restart a service |
| MC1 services | `check_mc1_services` | Check status of Windows services |
| | `get_mc1_system_info` | Get uptime, memory, CPU, disk |
| | `restart_mc1_service` | Restart a Windows service |
| | `get_mc1_processes` | Get top processes by CPU usage |
| | `reboot_mc1` | Reboot MC1 |
| Discogs | `search_discogs` | Search Discogs for artists/labels/releases |
| GitHub | `github_*` | Repository and workflow management |

### Service management

**MC1 (WSL2):**
```bash
# SSH into MC1 first
ssh magma@100.75.220.87

# Then run WSL2 commands:
wsl -d Ubuntu -u root -- systemctl status mcp-server
wsl -d Ubuntu -u root -- systemctl restart mcp-server
wsl -d Ubuntu -u root -- journalctl -u mcp-server -f
wsl -d Ubuntu -u root -- journalctl -u mcp-server -n 50
```

**Pi (nginx):**
```bash
# Reload nginx after config changes
sudo nginx -t && sudo systemctl reload nginx
```

### opencode.json config

```json
{
  "mcp": {
    "magma": {
      "type": "remote",
      "url": "https://magmacrunch.duckdns.org/mcp",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer ${MCP_API_KEY}"
      }
    }
  }
}
```

### Troubleshooting

- **401 Unauthorized** — check `MCP_API_KEY` in `~/.zshrc` (Mac) and `~/website/mcp-server/.env` (MC1)
- **502 Bad Gateway** — MCP server not running on MC1; SSH in (`ssh magma@100.75.220.87`) then check `wsl -d Ubuntu -u root -- systemctl status mcp-server`
- **Connection refused** — port 443 not forwarded from router; check router config
- **MC1 unreachable** — check Tailscale status: `tailscale status | grep mc1`
- **Pi fallback** — if MC1 is down, change nginx proxy_pass back to `http://127.0.0.1:8785/mcp` and reload nginx

### Legacy (local subprocess)

Before the remote server, the MCP ran as a local subprocess on the Mac:

```json
{
  "mcp": {
    "magma": {
      "type": "local",
      "command": ["/opt/homebrew/bin/python3.14", "mcp-server/magma-mcp.py"],
      "cwd": ".",
      "enabled": true,
      "env": {
        "DISCOGS_TOKEN": "${DISCOGS_TOKEN}",
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

This only works when the laptop is awake. The remote server is always available.

