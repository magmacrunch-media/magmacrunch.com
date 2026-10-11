# MCP Server

Remote MCP server that exposes magmacrunch.com data and Pi/MC1 management to AI coding assistants. Runs on MC1 (WSL2), accessible via HTTPS through the Pi's nginx reverse proxy.

---

## Architecture

```
Internet ──HTTPS──> Pi (nginx:443) ──Tailscale──> MC1 (WSL2:8785) ──SSH──> Pi (game servers)
                                        └─SSH──> MC1 (local services)
```

- **Server** (`mcp-server/magma-mcp.py`) — MCP tool definitions and logic
- **HTTP wrapper** (`mcp-server/serve.py`) — runs on MC1 WSL2, port 8785; loads `magma-mcp.py` via importlib and exposes it over HTTP
- **Proxy** — Pi nginx reverse proxy at `https://magmacrunch.duckdns.org/mcp`
- **Auth** — API key in `Authorization: Bearer <key>` header (validated by nginx)
- **Config** (`opencode.json`) — opencode connects as `"type": "remote"`

## Setup

### MC1 (WSL2)

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

### Pi (nginx proxy)

```bash
# nginx proxy_pass points to MC1 via Tailscale
# In /etc/nginx/sites-available/magmacrunch:
#   proxy_pass http://<mc1-tailscale-ip>:8785/mcp;
#   proxy_set_header Host <mc1-tailscale-ip>:8785;
sudo nginx -t && sudo systemctl reload nginx
```

## Tools

### MusicBrainz Cache
- `list_cached_entities` — list all cached entities (artists, places, contributors, labels, works, collectives)
- `get_entity` — get full data for a specific entity by type and UUID/slug
- `search_cache` — search cached entity names by substring

### High Scores
- `list_scoreboards` — list all game leaderboards with entry counts and top scores
- `get_scores` — get leaderboard for a specific game

### Project Structure
- `list_archive_pages` — list all archive pages (artists, places, contributors, labels)
- `list_arcade_games` — list all arcade games with server info

### Pi Services (SSH)
- `check_pi_services` — check status of all arcade services
- `get_service_logs` — get recent logs for a service
- `restart_pi_service` — restart a service
- `get_pi_system_info` — get uptime, memory, CPU temp, load
- `deploy_to_pi` — rsync files to the Pi and optionally restart a service

### MC1 Services (SSH)
- `check_mc1_services` — check status of Windows services
- `get_mc1_system_info` — get uptime, memory, CPU, disk
- `restart_mc1_service` — restart a Windows service
- `get_mc1_processes` — get top processes by CPU usage
- `reboot_mc1` — reboot MC1

### Discogs
- `search_discogs` — search Discogs for artists/labels/releases

### GitHub
- `list_bots` — list all workflows with last run status
- `get_bot_status` — get detailed status of a specific workflow
- `trigger_bot` — trigger a workflow manually
- `get_bot_runs` — get recent run history for a workflow

## Service Management

### MC1 (WSL2)

```bash
# SSH into MC1 first
ssh magma@<mc1>

# Then run WSL2 commands:
wsl -d Ubuntu -u root -- systemctl status mcp-server
wsl -d Ubuntu -u root -- systemctl restart mcp-server
wsl -d Ubuntu -u root -- journalctl -u mcp-server -f
wsl -d Ubuntu -u root -- journalctl -u mcp-server -n 50
```

### Pi (nginx)

```bash
# Reload nginx after config changes
sudo nginx -t && sudo systemctl reload nginx
```

## opencode.json Config

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

## Troubleshooting

- **401 Unauthorized** — check `MCP_API_KEY` in `~/.zshrc` (Mac) and `~/website/mcp-server/.env` (MC1)
- **502 Bad Gateway** — MCP server not running on MC1; SSH in and check `wsl -d Ubuntu -u root -- systemctl status mcp-server`
- **Connection refused** — port 443 not forwarded from router; check router config
- **MC1 unreachable** — check Tailscale status: `tailscale status | grep mc1`

## Running It Locally

The sections above cover the hosted server on MC1, which is what `opencode`
connects to. The entrypoint also runs directly, which is the quickest way to
exercise a tool while changing it:

```bash
python mcp-server/magma-mcp.py
```

Configured through `opencode.json` rather than the Pi's `.env`:

```json
{
  "mcp": {
    "magma": {
      "env": {
        "DISCOGS_TOKEN": "${DISCOGS_TOKEN}",
        "GITHUB_TOKEN": "${GITHUB_TOKEN}",
        "LASTFM_API_KEY": "${LASTFM_API_KEY}"
      }
    }
  }
}
```
