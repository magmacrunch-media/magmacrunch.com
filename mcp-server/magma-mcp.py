"""Magma MCP Server — exposes magmacrunch.com data and Pi management to AI assistants."""

import json
import os
import subprocess
import time
from pathlib import Path

import requests
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

# Discogs API config
DISCOGS_TOKEN = os.environ.get("DISCOGS_TOKEN", "")
DISCOGS_BASE = "https://api.discogs.com"
DISCOGS_CACHE_DIR = CACHE_DIR / "discogs"
USER_AGENT = "MagmaCrunchMCP/1.0 +https://magmacrunch.com"

# GitHub API config
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_API = "https://api.github.com"
GITHUB_OWNER = "magmacrunchmedia"
GITHUB_REPO = "magmacrunch.com"

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
# Helpers — Discogs API
# ---------------------------------------------------------------------------


def _discogs_request(endpoint: str, params: dict | None = None) -> dict | None:
    """Make an authenticated request to the Discogs API."""
    if not DISCOGS_TOKEN:
        return None
    url = f"{DISCOGS_BASE}{endpoint}"
    headers = {
        "Authorization": f"Discogs token={DISCOGS_TOKEN}",
        "User-Agent": USER_AGENT,
    }
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=10)
        if resp.status_code == 404:
            return None
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return None


def _read_discogs_cache(discogs_type: str, discogs_id: str) -> dict | None:
    """Read a cached Discogs entity."""
    d = DISCOGS_CACHE_DIR / discogs_type
    if not d.is_dir():
        return None
    f = d / f"{discogs_id}.json"
    if f.is_file():
        return json.loads(f.read_text())
    return None


def _write_discogs_cache(discogs_type: str, discogs_id: str, data: dict) -> None:
    """Write a Discogs entity to cache."""
    d = DISCOGS_CACHE_DIR / discogs_type
    d.mkdir(parents=True, exist_ok=True)
    f = d / f"{discogs_id}.json"
    f.write_text(json.dumps(data, indent=2))


def _search_discogs(query: str, search_type: str = "release") -> list[dict]:
    """Search Discogs for releases, artists, or labels."""
    params = {"q": query, "type": search_type, "per_page": 10}
    data = _discogs_request("/database/search", params)
    if not data:
        return []
    return data.get("results", [])


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
# Tools — Discogs API
# ---------------------------------------------------------------------------


@mcp.tool()
def search_discogs(query: str, search_type: str = "release") -> str:
    """Search Discogs for releases, artists, or labels.

    Args:
        query: Search string (e.g. artist name, album title)
        search_type: One of: release, master, artist, label (default: release)
    """
    if not DISCOGS_TOKEN:
        return "DISCOGS_TOKEN not set. Add it to your environment to enable Discogs search."
    results = _search_discogs(query, search_type)
    if not results:
        return f"No Discogs results for '{query}' (type: {search_type})"
    lines = [f"Found {len(results)} Discogs results for '{query}':\n"]
    for r in results:
        title = r.get("title", "Unknown")
        rtype = r.get("type", "?")
        rid = r.get("id", "?")
        year = r.get("year", "")
        year_str = f" ({year})" if year else ""
        lines.append(f"- [{rtype}] {title}{year_str} [ID: {rid}]")
    return "\n".join(lines)


@mcp.tool()
def get_discogs_release(release_id: str) -> str:
    """Get full details for a Discogs release (ratings, stats, marketplace, tracklist).

    Args:
        release_id: Discogs release ID (numeric)
    """
    if not DISCOGS_TOKEN:
        return "DISCOGS_TOKEN not set. Add it to your environment to enable Discogs lookups."
    cached = _read_discogs_cache("release", release_id)
    if cached and cached.get("data"):
        data = cached["data"]
    else:
        data = _discogs_request(f"/releases/{release_id}")
        if not data:
            return f"Discogs release {release_id} not found."
        _write_discogs_cache("release", release_id, {"fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"), "discogsId": release_id, "type": "release", "data": data})

    title = data.get("title", "Unknown")
    artists = ", ".join(a.get("name", "?") for a in data.get("artists", []))
    year = data.get("year", "?")
    genres = ", ".join(data.get("genres", []))
    styles = ", ".join(data.get("styles", []))
    country = data.get("country", "?")

    lines = [f"{title} — {artists} ({year})\n"]
    lines.append(f"  Country: {country}")
    if genres:
        lines.append(f"  Genres: {genres}")
    if styles:
        lines.append(f"  Styles: {styles}")

    community = data.get("community", {})
    rating = community.get("rating", {})
    if rating:
        lines.append(f"  Rating: {rating.get('average', '?')}/5 ({rating.get('count', 0)} ratings)")
    lines.append(f"  Have: {community.get('have', '?')} | Want: {community.get('want', '?')}")

    marketplace = f"  For sale: {data.get('num_for_sale', '?')}"
    lowest = data.get("lowest_price")
    if lowest:
        marketplace += f" | Lowest: {lowest}"
    lines.append(marketplace)

    tracklist = data.get("tracklist", [])
    if tracklist:
        lines.append(f"\n  Tracklist ({len(tracklist)} tracks):")
        for t in tracklist[:15]:
            pos = t.get("position", "")
            dur = t.get("duration", "")
            lines.append(f"    {pos} {t.get('title', '?')} ({dur})")

    images = data.get("images", [])
    if images:
        lines.append(f"\n  Images: {len(images)} available")

    uri = data.get("uri", "")
    if uri:
        lines.append(f"  Discogs: {uri}")

    return "\n".join(lines)


@mcp.tool()
def get_discogs_artist(artist_id: str) -> str:
    """Get artist profile, bio, and discography from Discogs.

    Args:
        artist_id: Discogs artist ID (numeric)
    """
    if not DISCOGS_TOKEN:
        return "DISCOGS_TOKEN not set. Add it to your environment to enable Discogs lookups."
    cached = _read_discogs_cache("artist", artist_id)
    if cached and cached.get("data"):
        data = cached["data"]
    else:
        data = _discogs_request(f"/artists/{artist_id}")
        if not data:
            return f"Discogs artist {artist_id} not found."
        _write_discogs_cache("artist", artist_id, {"fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"), "discogsId": artist_id, "type": "artist", "data": data})

    name = data.get("name", "Unknown")
    profile = data.get("profile", "No profile available.")
    namevariations = data.get("namevariations", [])
    members = data.get("members", [])

    lines = [f"{name}\n"]
    if profile:
        lines.append(f"  {profile[:500]}")
    if namevariations:
        lines.append(f"\n  Name variations: {', '.join(namevariations[:5])}")
    if members:
        active = [m.get("name", "?") for m in members if m.get("active")]
        inactive = [m.get("name", "?") for m in members if not m.get("active")]
        if active:
            lines.append(f"  Active members: {', '.join(active)}")
        if inactive:
            lines.append(f"  Former members: {', '.join(inactive)}")

    urls = data.get("urls", [])
    if urls:
        lines.append(f"\n  Links: {', '.join(urls[:3])}")

    uri = data.get("uri", "")
    if uri:
        lines.append(f"  Discogs: {uri}")

    return "\n".join(lines)


@mcp.tool()
def get_discogs_label(label_id: str) -> str:
    """Get label info and catalog from Discogs.

    Args:
        label_id: Discogs label ID (numeric)
    """
    if not DISCOGS_TOKEN:
        return "DISCOGS_TOKEN not set. Add it to your environment to enable Discogs lookups."
    cached = _read_discogs_cache("label", label_id)
    if cached and cached.get("data"):
        data = cached["data"]
    else:
        data = _discogs_request(f"/labels/{label_id}")
        if not data:
            return f"Discogs label {label_id} not found."
        _write_discogs_cache("label", label_id, {"fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ"), "discogsId": label_id, "type": "label", "data": data})

    name = data.get("name", "Unknown")
    profile = data.get("profile", "No profile available.")
    contact = data.get("contact_info", "")
    sublabels = [sl.get("name", "?") for sl in data.get("sublabels", [])]
    parent = data.get("parentLabel", {}).get("name", "")

    lines = [f"{name}\n"]
    if profile:
        lines.append(f"  {profile[:500]}")
    if parent:
        lines.append(f"  Parent label: {parent}")
    if sublabels:
        lines.append(f"  Sub-labels: {', '.join(sublabels)}")
    if contact:
        lines.append(f"\n  Contact: {contact[:300]}")

    uri = data.get("uri", "")
    if uri:
        lines.append(f"  Discogs: {uri}")

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
# Tools — bots
# ---------------------------------------------------------------------------


@mcp.tool()
def list_bots() -> str:
    """List all GitHub Actions workflows with their last run status."""
    if not GITHUB_TOKEN:
        return "GITHUB_TOKEN not set. Add it to your environment to enable bot management."

    url = f"{GITHUB_API}/repos/{GITHUB_OWNER}/{GITHUB_REPO}/actions/runs?per_page=100"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MagmaCrunchMCP/1.0",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return f"GitHub API error: {resp.status_code} — {resp.text}"

        runs = resp.json().get("workflow_runs", [])

        # Define all workflows to track
        workflows = [
            {"name": "CI", "file": "ci.yml"},
            {"name": "Deploy to Pi", "file": "deploy-pi.yml"},
            {"name": "Check Links", "file": "check-links.yml"},
            {"name": "Check Archive Format", "file": "check-archive-format.yml"},
            {"name": "Check Pi Services", "file": "check-services.yml"},
            {"name": "Rebuild Search Index", "file": "rebuild-search-index.yml"},
            {"name": "Generate Archive Stubs", "file": "generate-stubs.yml"},
            {"name": "Bake Cache", "file": "bake-cache.yml"},
            {"name": "Weekly High Scores", "file": "weekly-scores.yml"},
            {"name": "Arcade Smoke Test", "file": "smoke-test.yml"},
            {"name": "MusicBrainz Backup", "file": "backup-musicbrainz.yml"},
            {"name": "TMDB Backup", "file": "backup-tmdb.yml"},
            {"name": "Bot Status Report", "file": "bot-status.yml"},
        ]

        # Map runs to workflows
        for wf in workflows:
            wf_runs = [r for r in runs if r.get("path", "").endswith(wf["file"])]
            if wf_runs:
                latest = wf_runs[0]
                wf["status"] = latest.get("conclusion") or latest.get("status", "unknown")
                wf["last_run"] = latest.get("created_at", "")
                wf["event"] = latest.get("event", "")
            else:
                wf["status"] = "never"
                wf["last_run"] = ""
                wf["event"] = ""

        # Format output
        lines = ["# GitHub Actions Workflows", ""]
        lines.append("| Workflow | Status | Last Run | Trigger |")
        lines.append("|---|---|---|---|")
        for wf in workflows:
            icon = "✓" if wf["status"] == "success" else "✗" if wf["status"] == "failure" else "—"
            lines.append(f"| {wf['name']} | {icon} {wf['status']} | {wf['last_run'][:16] if wf['last_run'] else 'never'} | {wf['event']} |")

        return "\n".join(lines)

    except requests.RequestException as e:
        return f"Request failed: {e}"


@mcp.tool()
def get_bot_status(workflow_name: str) -> str:
    """Get detailed status of a specific workflow.

    Args:
        workflow_name: Name of the workflow (e.g. 'Deploy to Pi', 'Check Links')
    """
    if not GITHUB_TOKEN:
        return "GITHUB_TOKEN not set. Add it to your environment to enable bot management."

    # Map friendly names to file names
    workflow_map = {
        "CI": "ci.yml", "Deploy to Pi": "deploy-pi.yml", "Check Links": "check-links.yml",
        "Check Archive Format": "check-archive-format.yml", "Check Pi Services": "check-services.yml",
        "Rebuild Search Index": "rebuild-search-index.yml", "Generate Archive Stubs": "generate-stubs.yml",
        "Bake Cache": "bake-cache.yml", "Weekly High Scores": "weekly-scores.yml",
        "Arcade Smoke Test": "smoke-test.yml", "MusicBrainz Backup": "backup-musicbrainz.yml",
        "TMDB Backup": "backup-tmdb.yml", "Bot Status Report": "bot-status.yml",
    }

    workflow_file = workflow_map.get(workflow_name)
    if not workflow_file:
        return f"Unknown workflow: {workflow_name}. Available: {', '.join(workflow_map.keys())}"

    url = f"{GITHUB_API}/repos/{GITHUB_OWNER}/{GITHUB_REPO}/actions/workflows/{workflow_file}/runs?per_page=5"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MagmaCrunchMCP/1.0",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return f"GitHub API error: {resp.status_code} — {resp.text}"

        runs = resp.json().get("workflow_runs", [])
        if not runs:
            return f"No runs found for {workflow_name}"

        lines = [f"# {workflow_name} — Recent Runs", ""]
        lines.append("| Run | Status | Trigger | Started |")
        lines.append("|---|---|---|---|")

        for run in runs:
            status = run.get("conclusion") or run.get("status", "unknown")
            icon = "✓" if status == "success" else "✗" if status == "failure" else "⏳"
            created = run.get("created_at", "")[:16]
            event = run.get("event", "")
            run_id = run.get("id", "")
            lines.append(f"| [{run_id}]({run.get('html_url', '')}) | {icon} {status} | {event} | {created} |")

        return "\n".join(lines)

    except requests.RequestException as e:
        return f"Request failed: {e}"


@mcp.tool()
def trigger_bot(workflow_name: str) -> str:
    """Trigger a GitHub Actions workflow manually.

    Args:
        workflow_name: Name of the workflow (e.g. 'Deploy to Pi', 'Check Links')
    """
    if not GITHUB_TOKEN:
        return "GITHUB_TOKEN not set. Add it to your environment to enable bot management."

    # Map friendly names to file names
    workflow_map = {
        "CI": "ci.yml", "Deploy to Pi": "deploy-pi.yml", "Check Links": "check-links.yml",
        "Check Archive Format": "check-archive-format.yml", "Check Pi Services": "check-services.yml",
        "Rebuild Search Index": "rebuild-search-index.yml", "Generate Archive Stubs": "generate-stubs.yml",
        "Bake Cache": "bake-cache.yml", "Weekly High Scores": "weekly-scores.yml",
        "Arcade Smoke Test": "smoke-test.yml", "MusicBrainz Backup": "backup-musicbrainz.yml",
        "TMDB Backup": "backup-tmdb.yml", "Bot Status Report": "bot-status.yml",
    }

    workflow_file = workflow_map.get(workflow_name)
    if not workflow_file:
        return f"Unknown workflow: {workflow_name}. Available: {', '.join(workflow_map.keys())}"

    url = f"{GITHUB_API}/repos/{GITHUB_OWNER}/{GITHUB_REPO}/actions/workflows/{workflow_file}/dispatches"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MagmaCrunchMCP/1.0",
        "Content-Type": "application/json",
    }
    data = {"ref": "main"}

    try:
        resp = requests.post(url, headers=headers, json=data, timeout=10)
        if resp.status_code == 204:
            return f"✓ Triggered {workflow_name}. Check the Actions tab for status."
        else:
            return f"Failed to trigger {workflow_name}: {resp.status_code} — {resp.text}"

    except requests.RequestException as e:
        return f"Request failed: {e}"


@mcp.tool()
def get_bot_runs(workflow_name: str, limit: int = 10) -> str:
    """Get recent run history for a workflow.

    Args:
        workflow_name: Name of the workflow (e.g. 'Deploy to Pi', 'Check Links')
        limit: Number of runs to return (default 10)
    """
    if not GITHUB_TOKEN:
        return "GITHUB_TOKEN not set. Add it to your environment to enable bot management."

    # Map friendly names to file names
    workflow_map = {
        "CI": "ci.yml", "Deploy to Pi": "deploy-pi.yml", "Check Links": "check-links.yml",
        "Check Archive Format": "check-archive-format.yml", "Check Pi Services": "check-services.yml",
        "Rebuild Search Index": "rebuild-search-index.yml", "Generate Archive Stubs": "generate-stubs.yml",
        "Bake Cache": "bake-cache.yml", "Weekly High Scores": "weekly-scores.yml",
        "Arcade Smoke Test": "smoke-test.yml", "MusicBrainz Backup": "backup-musicbrainz.yml",
        "TMDB Backup": "backup-tmdb.yml", "Bot Status Report": "bot-status.yml",
    }

    workflow_file = workflow_map.get(workflow_name)
    if not workflow_file:
        return f"Unknown workflow: {workflow_name}. Available: {', '.join(workflow_map.keys())}"

    url = f"{GITHUB_API}/repos/{GITHUB_OWNER}/{GITHUB_REPO}/actions/workflows/{workflow_file}/runs?per_page={limit}"
    headers = {
        "Authorization": f"token {GITHUB_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MagmaCrunchMCP/1.0",
    }

    try:
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code != 200:
            return f"GitHub API error: {resp.status_code} — {resp.text}"

        runs = resp.json().get("workflow_runs", [])
        if not runs:
            return f"No runs found for {workflow_name}"

        lines = [f"# {workflow_name} — Last {len(runs)} Runs", ""]
        for run in runs:
            status = run.get("conclusion") or run.get("status", "unknown")
            icon = "✓" if status == "success" else "✗" if status == "failure" else "⏳"
            created = run.get("created_at", "")[:19].replace("T", " ")
            event = run.get("event", "")
            run_id = run.get("id", "")
            duration = run.get("run_started_at", "")
            lines.append(f"- {icon} **{status}** — {event} — {created} ([#{run_id}]({run.get('html_url', '')}))")

        return "\n".join(lines)

    except requests.RequestException as e:
        return f"Request failed: {e}"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
