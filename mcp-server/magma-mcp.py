"""Magma MCP Server — exposes magmacrunch.com data and Pi management to AI assistants."""

import json
import subprocess
from pathlib import Path

from mcp.server.mcpserver import MCPServer

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = PROJECT_ROOT / "archive" / "_cache"
SCORES_DIR = PROJECT_ROOT / "arcade" / "admin" / "scores"
ARCHIVE_DIR = PROJECT_ROOT / "archive"
ARCADE_DIR = PROJECT_ROOT / "arcade"

PI_HOST = "192.168.1.16"
PI_USER = "jake"

ENTITY_TYPES = ["artists", "places", "contributors", "labels", "works", "collectives"]

mcp = MCPServer("magma-mcp")

# ---------------------------------------------------------------------------
# Helpers — cache
# ---------------------------------------------------------------------------


def _list_cache_files(entity_type: str) -> list[dict]:
    """List JSON files in a cache subdirectory."""
    d = CACHE_DIR / entity_type
    if not d.is_dir():
        return []
    results = []
    for f in sorted(d.glob("*.json")):
        try:
            data = json.loads(f.read_text())
            results.append({
                "name": data.get("name") or data.get("slug") or f.stem,
                "uuid": data.get("uuid") or data.get("slug") or f.stem,
                "type": entity_type,
                "file": str(f.relative_to(PROJECT_ROOT)),
                "size_kb": round(f.stat().st_size / 1024, 1),
            })
        except Exception:
            results.append({"name": f.stem, "uuid": f.stem, "type": entity_type, "file": str(f.relative_to(PROJECT_ROOT))})
    return results


def _read_cache_file(entity_type: str, key: str) -> dict | None:
    """Read a specific cache file by UUID or slug."""
    d = CACHE_DIR / entity_type
    if not d.is_dir():
        return None
    f = d / f"{key}.json"
    if f.is_file():
        return json.loads(f.read_text())
    return None


def _search_cache(query: str) -> list[dict]:
    """Search all cached entity names for a substring match."""
    query_lower = query.lower()
    results = []
    for entity_type in ENTITY_TYPES:
        for item in _list_cache_files(entity_type):
            if query_lower in item["name"].lower():
                results.append(item)
    return results


# ---------------------------------------------------------------------------
# Helpers — scores
# ---------------------------------------------------------------------------


def _list_score_files() -> list[dict]:
    """List all score JSON files."""
    if not SCORES_DIR.is_dir():
        return []
    results = []
    for f in sorted(SCORES_DIR.glob("*.json")):
        try:
            data = json.loads(f.read_text())
            scores = data.get("scores", [])
            top = scores[0] if scores else None
            if top:
                top = {"initials": top.get("initials", "?"), "score": top.get("score") or top.get("totalScore", "?")}
            results.append({
                "game": data.get("game", f.stem),
                "game_id": data.get("gameId", f.stem),
                "entries": len(scores),
                "top_score": top,
                "file": str(f.relative_to(PROJECT_ROOT)),
            })
        except Exception:
            pass
    return results


def _read_scores(game: str, limit: int = 10) -> dict | None:
    """Read scores for a specific game."""
    f = SCORES_DIR / f"{game}.json"
    if not f.is_file():
        return None
    data = json.loads(f.read_text())
    data["scores"] = data.get("scores", [])[:limit]
    return data


# ---------------------------------------------------------------------------
# Helpers — archive pages
# ---------------------------------------------------------------------------


def _scan_archive_pages(subdir: str) -> list[dict]:
    """Scan an archive subdirectory for page folders."""
    d = ARCHIVE_DIR / subdir
    if not d.is_dir():
        return []
    results = []
    for entry in sorted(d.iterdir()):
        if not entry.is_dir() or entry.name.startswith("_"):
            continue
        index = entry / "index.html"
        if index.is_file():
            results.append({"name": entry.name, "path": str(entry.relative_to(PROJECT_ROOT))})
    return results


# ---------------------------------------------------------------------------
# Helpers — arcade games
# ---------------------------------------------------------------------------


def _scan_arcade_games() -> list[dict]:
    """Scan arcade/ for game folders (ones with index.html and optionally server.py)."""
    results = []
    for entry in sorted(ARCADE_DIR.iterdir()):
        if not entry.is_dir() or entry.name.startswith("_") or entry.name.startswith("."):
            continue
        index = entry / "index.html"
        if not index.is_file():
            continue
        has_server = (entry / "server.py").is_file()
        port = None
        if has_server:
            try:
                server_text = (entry / "server.py").read_text()
                for line in server_text.splitlines():
                    if "port" in line.lower() and "=" in line:
                        for part in line.split("="):
                            part = part.strip().rstrip(")")
                            if part.isdigit():
                                port = int(part)
                                break
            except Exception:
                pass
        results.append({
            "name": entry.name,
            "path": str(entry.relative_to(PROJECT_ROOT)),
            "has_server": has_server,
            "port": port,
        })
    return results


# ---------------------------------------------------------------------------
# Helpers — SSH
# ---------------------------------------------------------------------------


def _ssh_run(cmd: str, timeout: int = 15) -> dict:
    """Run a command on the Pi via SSH."""
    try:
        result = subprocess.run(
            ["ssh", "-o", "ConnectTimeout=5", "-o", "StrictHostKeyChecking=no",
             f"{PI_USER}@{PI_HOST}", cmd],
            capture_output=True, text=True, timeout=timeout,
        )
        return {"ok": True, "stdout": result.stdout.strip(), "stderr": result.stderr.strip(), "code": result.returncode}
    except subprocess.TimeoutExpired:
        return {"ok": False, "error": "SSH connection timed out"}
    except Exception as e:
        return {"ok": False, "error": str(e)}


# ---------------------------------------------------------------------------
# Tools — MusicBrainz cache
# ---------------------------------------------------------------------------


@mcp.tool()
def list_cached_entities(entity_type: str = "") -> str:
    """List all cached MusicBrainz entities.

    Args:
        entity_type: Filter by type — artists, places, contributors, labels, works, collectives. Leave empty for all.
    """
    types = [entity_type] if entity_type and entity_type in ENTITY_TYPES else ENTITY_TYPES
    all_items = []
    for t in types:
        all_items.extend(_list_cache_files(t))
    if not all_items:
        return "No cached entities found."
    lines = [f"Found {len(all_items)} cached entities:\n"]
    for item in all_items:
        size = f" ({item['size_kb']} KB)" if "size_kb" in item else ""
        lines.append(f"- [{item['type']}] {item['name']} ({item['uuid']}){size}")
    return "\n".join(lines)


@mcp.tool()
def get_entity(entity_type: str, key: str) -> str:
    """Get full cache data for a specific MusicBrainz entity.

    Args:
        entity_type: One of: artists, places, contributors, labels, works, collectives
        key: The UUID (or slug for collectives) of the entity
    """
    data = _read_cache_file(entity_type, key)
    if not data:
        return f"No cache file found for {entity_type}/{key}"
    return json.dumps(data, indent=2)


@mcp.tool()
def search_cache(query: str) -> str:
    """Search cached MusicBrainz entity names by substring.

    Args:
        query: Search string (case-insensitive substring match)
    """
    results = _search_cache(query)
    if not results:
        return f"No results for '{query}'"
    lines = [f"Found {len(results)} matches for '{query}':\n"]
    for item in results:
        lines.append(f"- [{item['type']}] {item['name']} ({item['uuid']})")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Tools — high scores
# ---------------------------------------------------------------------------


@mcp.tool()
def list_scoreboards() -> str:
    """List all game leaderboards with entry counts and top scores."""
    boards = _list_score_files()
    if not boards:
        return "No score files found."
    lines = [f"Found {len(boards)} scoreboards:\n"]
    for b in boards:
        top = ""
        if b["top_score"]:
            top = f" — Top: {b['top_score'].get('initials', '?')} with {b['top_score'].get('score', '?')}"
        lines.append(f"- {b['game']} ({b['entries']} entries){top}")
    return "\n".join(lines)


@mcp.tool()
def get_scores(game: str, limit: int = 10) -> str:
    """Get leaderboard for a specific game.

    Args:
        game: Game ID (e.g. tetris, george-boole, solitaire, moonlight-drift)
        limit: Number of entries to return (default 10)
    """
    data = _read_scores(game, limit)
    if not data:
        available = [b["game_id"] for b in _list_score_files()]
        return f"Unknown game '{game}'. Available: {', '.join(available)}"
    scores = data.get("scores", [])
    lines = [f"{data.get('game', game)} — Top {len(scores)}:\n"]
    for i, s in enumerate(scores, 1):
        display_score = s.get("score") or s.get("totalScore", "?")
        extras = []
        if "level" in s:
            extras.append(f"level {s['level']}")
        if "difficulty" in s:
            extras.append(f"diff {s['difficulty']}")
        if "time" in s:
            extras.append(s["time"])
        extra_str = f" ({', '.join(extras)})" if extras else ""
        lines.append(f"  {i}. {s.get('initials', '?')} — {display_score}{extra_str}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Tools — project structure
# ---------------------------------------------------------------------------


@mcp.tool()
def list_archive_pages() -> str:
    """List all archive pages (artists, places, contributors, labels)."""
    sections = {
        "artists": "by-artist",
        "places": "by-place",
        "contributors": "by-contributor",
        "labels": "by-label",
    }
    all_pages = []
    for label, subdir in sections.items():
        pages = _scan_archive_pages(subdir)
        for p in pages:
            p["category"] = label
        all_pages.extend(pages)
    if not all_pages:
        return "No archive pages found."
    lines = [f"Found {len(all_pages)} archive pages:\n"]
    for p in all_pages:
        lines.append(f"- [{p['category']}] {p['name']} ({p['path']})")
    return "\n".join(lines)


@mcp.tool()
def list_arcade_games() -> str:
    """List all arcade games with their paths and server status."""
    games = _scan_arcade_games()
    if not games:
        return "No arcade games found."
    lines = [f"Found {len(games)} arcade games:\n"]
    for g in games:
        server_info = f" [server port {g['port']}]" if g["has_server"] else ""
        lines.append(f"- {g['name']} ({g['path']}){server_info}")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Tools — Pi services (SSH)
# ---------------------------------------------------------------------------


@mcp.tool()
def check_pi_services() -> str:
    """Check status of all arcade services on the Raspberry Pi."""
    result = _ssh_run("systemctl is-active arcade-* 2>/dev/null || true")
    if not result["ok"]:
        return f"SSH failed: {result['error']}"
    lines = ["Pi service status:\n"]
    for line in result["stdout"].splitlines():
        if ":" in line:
            name, status = line.split(":", 1)
            icon = "✓" if status.strip() == "active" else "✗"
            lines.append(f"  {icon} {name.strip()}: {status.strip()}")
    if len(lines) == 1:
        lines.append("  (no services found — check if services are installed)")
    return "\n".join(lines)


@mcp.tool()
def get_service_logs(service: str, lines_count: int = 30) -> str:
    """Get recent logs for a Pi service.

    Args:
        service: Service name (e.g. arcade-chat, arcade-admin, arcade-sorry)
        lines_count: Number of log lines to return (default 30)
    """
    result = _ssh_run(f"journalctl -u {service} -n {lines_count} --no-pager 2>&1")
    if not result["ok"]:
        return f"SSH failed: {result['error']}"
    if result["code"] != 0:
        return f"Error: {result['stderr'] or result['stdout']}"
    return f"Logs for {service} (last {lines_count} lines):\n\n{result['stdout']}"


@mcp.tool()
def restart_pi_service(service: str) -> str:
    """Restart a service on the Raspberry Pi.

    Args:
        service: Service name (e.g. arcade-chat, arcade-admin, arcade-sorry)
    """
    result = _ssh_run(f"sudo systemctl restart {service}", timeout=20)
    if not result["ok"]:
        return f"SSH failed: {result['error']}"
    if result["code"] == 0:
        return f"✓ {service} restarted successfully."
    return f"Failed to restart {service}:\n{result['stderr'] or result['stdout']}"


@mcp.tool()
def get_pi_system_info() -> str:
    """Get Raspberry Pi system info (uptime, memory, CPU temp, load)."""
    cmds = [
        ("Uptime", "uptime -p"),
        ("Memory", "free -h | grep Mem"),
        ("CPU Temp", "vcgencmd measure_temp 2>/dev/null || cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null"),
        ("Load", "cat /proc/loadavg"),
        ("Disk", "df -h / | tail -1"),
    ]
    lines = ["Pi system info:\n"]
    for label, cmd in cmds:
        result = _ssh_run(cmd)
        if result["ok"] and result["code"] == 0:
            lines.append(f"  {label}: {result['stdout']}")
        else:
            lines.append(f"  {label}: (unavailable)")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Tools — deployment
# ---------------------------------------------------------------------------


@mcp.tool()
def deploy_to_pi(local_path: str, service: str = "") -> str:
    """Deploy files to the Raspberry Pi via rsync.

    Args:
        local_path: Local file or directory to sync (relative to project root, e.g. 'arcade/chat-server.py')
        service: Optional service name to restart after deploy (e.g. 'arcade-chat')
    """
    local = PROJECT_ROOT / local_path
    if not local.exists():
        return f"Path not found: {local_path}"

    remote = f"{PI_USER}@{PI_HOST}:~/arcade/"
    if local.is_file():
        remote = f"{PI_USER}@{PI_HOST}:~/arcade/{local.name}"

    result = subprocess.run(
        ["rsync", "-avz", "--delete", str(local) + ("/" if local.is_dir() else ""), remote],
        capture_output=True, text=True, timeout=30,
    )
    if result.returncode != 0:
        return f"rsync failed:\n{result.stderr}"

    output = f"✓ Deployed {local_path} to Pi.\n{result.stdout}"

    if service:
        restart = restart_pi_service(service)
        output += f"\n\n{restart}"

    return output


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
