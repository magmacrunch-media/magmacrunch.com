# Magma MCP Server

MCP server for magmacrunch.com — exposes project data and Pi management to AI coding assistants.

## Setup

```bash
pip install -r mcp-server/requirements.txt
```

## Running

```bash
python mcp-server/magma-mcp.py
```

Or configure opencode to run it automatically (see `opencode.json` in project root).

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

### Deployment (SSH)
- `deploy_to_pi` — rsync files to the Pi and optionally restart a service

## Requirements

- Python 3.10+
- SSH access to `jake@192.168.1.16` (key-based auth)
