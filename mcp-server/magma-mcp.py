"""Magma MCP Server — exposes magmacrunch.com data and Pi management to AI assistants."""

import json
import os
import time
from pathlib import Path

import requests
from mcp.server.mcpserver import MCPServer
from magmascript import PIClient, MC1Client, GHClient

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

# GitHub API config (now handled by magmascript GHClient)

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
# Helpers — SSH (now handled by magmascript PIClient)
# ---------------------------------------------------------------------------


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
    pi = PIClient()
    services = pi.services()
    if not services:
        return "Pi service status:\n\n  (no services found — check if services are installed)"
    lines = ["Pi service status:\n"]
    for s in services:
        icon = "✓" if s.ok else "✗"
        lines.append(f"  {icon} {s.unit}: {s.status}")
    return "\n".join(lines)


@mcp.tool()
def get_service_logs(service: str, lines_count: int = 30) -> str:
    """Get recent logs for a Pi service.

    Args:
        service: Service name (e.g. arcade-chat, arcade-admin, arcade-sorry)
        lines_count: Number of log lines to return (default 30)
    """
    pi = PIClient()
    logs = pi.logs(service, lines_count)
    return f"Logs for {service} (last {lines_count} lines):\n\n{logs}"


@mcp.tool()
def restart_pi_service(service: str) -> str:
    """Restart a service on the Raspberry Pi.

    Args:
        service: Service name (e.g. arcade-chat, arcade-admin, arcade-sorry)
    """
    pi = PIClient()
    return pi.restart(service)


@mcp.tool()
def get_pi_system_info() -> str:
    """Get Raspberry Pi system info (uptime, memory, CPU temp, load)."""
    pi = PIClient()
    info = pi.info()
    lines = [
        "Pi system info:\n",
        f"  Uptime: {info.uptime or '(unavailable)'}",
        f"  Memory: {info.memory or '(unavailable)'}",
        f"  CPU Temp: {info.cpu_temp or '(unavailable)'}",
        f"  Load: {info.cpu_load or '(unavailable)'}",
    ]
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
    pi = PIClient()
    return pi.deploy(str(local), service)


# ---------------------------------------------------------------------------
# Tools — MC1 (Windows PC)
# ---------------------------------------------------------------------------


@mcp.tool()
def check_mc1_services() -> str:
    """Check status of services on MC1 (Windows PC)."""
    mc1 = MC1Client()
    services = mc1.services()
    if not services:
        return "MC1 service status:\n\n  (no services found)"
    lines = ["MC1 service status:\n"]
    for s in services:
        icon = "✓" if s.ok else "✗"
        lines.append(f"  {icon} {s.name}: {s.status}")
    return "\n".join(lines)


@mcp.tool()
def get_mc1_system_info() -> str:
    """Get MC1 system info (uptime, memory, CPU, disk)."""
    mc1 = MC1Client()
    info = mc1.info()
    lines = [
        "MC1 system info:\n",
        f"  Hostname: {info.hostname or '(unavailable)'}",
        f"  Uptime: {info.uptime or '(unavailable)'}",
        f"  Memory: {info.memory or '(unavailable)'}",
        f"  CPU: {info.cpu_load or '(unavailable)'}",
        f"  Disk: {info.disk_free or '(unavailable)'}",
    ]
    return "\n".join(lines)


@mcp.tool()
def restart_mc1_service(service: str) -> str:
    """Restart a service on MC1.

    Args:
        service: Windows service name (e.g. OllamaSvc)
    """
    mc1 = MC1Client()
    return mc1.restart(service)


@mcp.tool()
def get_mc1_processes() -> str:
    """Get top processes on MC1 by CPU usage."""
    mc1 = MC1Client()
    return mc1.processes()


@mcp.tool()
def reboot_mc1() -> str:
    """Reboot MC1 (Windows PC)."""
    mc1 = MC1Client()
    return mc1.reboot()


# ---------------------------------------------------------------------------
# Tools — bots
# ---------------------------------------------------------------------------


@mcp.tool()
def list_bots() -> str:
    """List all GitHub Actions workflows with their last run status."""
    try:
        gh = GHClient()
        workflows = gh.workflows()
    except Exception as e:
        return f"GitHub API error: {e}"

    lines = ["# GitHub Actions Workflows", ""]
    lines.append("| Workflow | Status | Last Run | Trigger |")
    lines.append("|---|---|---|---|")
    for wf in workflows:
        status = wf.conclusion or wf.status
        icon = "✓" if status == "success" else "✗" if status == "failure" else "—"
        last_run = wf.last_run[:16] if wf.last_run else "never"
        lines.append(f"| {wf.name} | {icon} {status} | {last_run} | {wf.event} |")
    return "\n".join(lines)


@mcp.tool()
def get_bot_status(workflow_name: str) -> str:
    """Get detailed status of a specific workflow.

    Args:
        workflow_name: Name of the workflow (e.g. 'Deploy to Pi', 'Check Links')
    """
    try:
        gh = GHClient()
        runs = gh.workflow_runs(workflow_name, limit=5)
    except KeyError as e:
        return str(e)
    except Exception as e:
        return f"GitHub API error: {e}"

    if not runs:
        return f"No runs found for {workflow_name}"

    lines = [f"# {workflow_name} — Recent Runs", ""]
    lines.append("| Run | Status | Trigger | Started |")
    lines.append("|---|---|---|---|")
    for r in runs:
        status = r.conclusion or r.status
        icon = "✓" if status == "success" else "✗" if status == "failure" else "⏳"
        created = r.created_at[:16]
        lines.append(f"| [{r.id}]({r.html_url}) | {icon} {status} | {r.event} | {created} |")
    return "\n".join(lines)


@mcp.tool()
def trigger_bot(workflow_name: str) -> str:
    """Trigger a GitHub Actions workflow manually.

    Args:
        workflow_name: Name of the workflow (e.g. 'Deploy to Pi', 'Check Links')
    """
    try:
        gh = GHClient()
        return gh.trigger(workflow_name)
    except KeyError as e:
        return str(e)
    except Exception as e:
        return f"Failed to trigger {workflow_name}: {e}"


@mcp.tool()
def get_bot_runs(workflow_name: str, limit: int = 10) -> str:
    """Get recent run history for a workflow.

    Args:
        workflow_name: Name of the workflow (e.g. 'Deploy to Pi', 'Check Links')
        limit: Number of runs to return (default 10)
    """
    try:
        gh = GHClient()
        runs = gh.workflow_runs(workflow_name, limit)
    except KeyError as e:
        return str(e)
    except Exception as e:
        return f"GitHub API error: {e}"

    if not runs:
        return f"No runs found for {workflow_name}"

    lines = [f"# {workflow_name} — Last {len(runs)} Runs", ""]
    for r in runs:
        status = r.conclusion or r.status
        icon = "✓" if status == "success" else "✗" if status == "failure" else "⏳"
        created = r.created_at[:19].replace("T", " ")
        lines.append(f"- {icon} **{status}** — {r.event} — {created} ([#{r.id}]({r.html_url}))")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Tools — admin dashboard data
# ---------------------------------------------------------------------------


@mcp.tool()
def get_jukebox_songs() -> str:
    """Read the jukebox song list from the admin dashboard data."""
    songs_path = PROJECT_ROOT / "arcade" / "admin" / "jukebox-songs.json"
    if not songs_path.exists():
        # Fall back to canonical source
        songs_path = PROJECT_ROOT / "music" / "jukebox" / "songs.json"
    if not songs_path.exists():
        return "No jukebox songs found."

    try:
        songs = json.loads(songs_path.read_text())
        lines = [f"# Jukebox Songs ({len(songs)} tracks)", ""]
        for i, s in enumerate(songs, 1):
            hidden = " [hidden]" if s.get("hidden") else ""
            lines.append(f"{i}. **{s['title']}** — {s['artist']} ({s.get('duration', '?')}){hidden}")
        return "\n".join(lines)
    except Exception as e:
        return f"Error reading songs: {e}"


@mcp.tool()
def update_jukebox_songs(songs_json: str) -> str:
    """Update the jukebox song list. Writes to admin data and canonical source.

    Args:
        songs_json: JSON array of songs, e.g. '[{"title": "...", "artist": "...", "file": "...", "duration": "4:47", "hidden": false}]'
    """
    try:
        songs = json.loads(songs_json)
    except json.JSONDecodeError as e:
        return f"Invalid JSON: {e}"

    # Write to admin data
    admin_path = PROJECT_ROOT / "arcade" / "admin" / "jukebox-songs.json"
    admin_path.parent.mkdir(parents=True, exist_ok=True)
    admin_path.write_text(json.dumps(songs, indent=2) + "\n")

    # Also write to canonical source
    canonical_path = PROJECT_ROOT / "music" / "jukebox" / "songs.json"
    canonical_path.write_text(json.dumps(songs, indent=2) + "\n")

    return f"✓ Updated {len(songs)} songs in jukebox-songs.json and songs.json"


@mcp.tool()
def get_tv_channels() -> str:
    """Read the TV channel list from the admin dashboard data."""
    channels_path = PROJECT_ROOT / "arcade" / "admin" / "tv-channels.json"
    if not channels_path.exists():
        return "No TV channels found."

    try:
        channels = json.loads(channels_path.read_text())
        lines = [f"# TV Channels ({len(channels)} channels)", ""]
        for i, ch in enumerate(channels, 1):
            lines.append(f"{i}. **{ch['title']}** — {ch['artist']} ({ch.get('year', '?')})")
        return "\n".join(lines)
    except Exception as e:
        return f"Error reading channels: {e}"


@mcp.tool()
def update_tv_channels(channels_json: str) -> str:
    """Update the TV channel list.

    Args:
        channels_json: JSON array of channels, e.g. '[{"title": "...", "artist": "...", "id": "YouTubeID", "year": "2024"}]'
    """
    try:
        channels = json.loads(channels_json)
    except json.JSONDecodeError as e:
        return f"Invalid JSON: {e}"

    channels_path = PROJECT_ROOT / "arcade" / "admin" / "tv-channels.json"
    channels_path.parent.mkdir(parents=True, exist_ok=True)
    channels_path.write_text(json.dumps(channels, indent=2) + "\n")

    return f"✓ Updated {len(channels)} channels in tv-channels.json"


@mcp.tool()
def get_themes() -> str:
    """Read the theme catalog from the admin dashboard data."""
    themes_path = PROJECT_ROOT / "arcade" / "admin" / "themes.json"
    if not themes_path.exists():
        return "No themes found."

    try:
        themes = json.loads(themes_path.read_text())
        sections = {}
        for t in themes:
            sec = t.get("section", "other")
            if sec not in sections:
                sections[sec] = []
            sections[sec].append(t.get("name", "unnamed"))

        lines = [f"# Theme Catalog ({len(themes)} themes)", ""]
        for sec, names in sorted(sections.items()):
            lines.append(f"## {sec} ({len(names)})")
            for name in names:
                lines.append(f"- {name}")
            lines.append("")
        return "\n".join(lines)
    except Exception as e:
        return f"Error reading themes: {e}"


@mcp.tool()
def update_themes(themes_json: str) -> str:
    """Update the theme catalog.

    Args:
        themes_json: JSON array of theme objects with name, section, palette, nav fields
    """
    try:
        themes = json.loads(themes_json)
    except json.JSONDecodeError as e:
        return f"Invalid JSON: {e}"

    themes_path = PROJECT_ROOT / "arcade" / "admin" / "themes.json"
    themes_path.parent.mkdir(parents=True, exist_ok=True)
    themes_path.write_text(json.dumps(themes, indent=2) + "\n")

    return f"✓ Updated {len(themes)} themes in themes.json"


# ---------------------------------------------------------------------------
# Tools — Last.fm play counts
# ---------------------------------------------------------------------------


@mcp.tool()
def get_play_counts() -> str:
    """List all artists with their Last.fm play counts and listeners, sorted by popularity."""
    stats_dir = PROJECT_ROOT / "arcade" / "admin" / "stats" / "lastfm"
    if not stats_dir.exists():
        return "No play count data found. Run the Fetch Play Counts workflow first."

    artists = []
    for f in sorted(stats_dir.glob("*.json")):
        try:
            data = json.loads(f.read_text())
            artists.append({
                "name": data.get("name", f.stem),
                "listeners": data.get("stats", {}).get("listeners", 0),
                "playcount": data.get("stats", {}).get("playcount", 0),
                "topTrack": data.get("topTracks", [{}])[0].get("name", "") if data.get("topTracks") else "",
                "fetchedAt": data.get("fetchedAt", ""),
            })
        except Exception:
            continue

    # Sort by playcount descending
    artists.sort(key=lambda a: a["playcount"], reverse=True)

    lines = [f"# Last.fm Play Counts ({len(artists)} artists)", ""]
    lines.append("| Artist | Play Count | Listeners | Top Track |")
    lines.append("|---|---|---|---|")
    for a in artists:
        lines.append(f"| {a['name']} | {a['playcount']} | {a['listeners']} | {a['topTrack'][:40]} |")

    total_plays = sum(a["playcount"] for a in artists)
    total_listeners = sum(a["listeners"] for a in artists)
    lines.append("")
    lines.append(f"**Total:** {total_plays} plays across {total_listeners} listeners")

    return "\n".join(lines)


@mcp.tool()
def get_artist_play_counts(artist_name: str) -> str:
    """Get detailed Last.fm stats for a specific artist.

    Args:
        artist_name: Artist name or slug (e.g. "Jon McCoy" or "jon-mccoy")
    """
    stats_dir = PROJECT_ROOT / "arcade" / "admin" / "stats" / "lastfm"
    if not stats_dir.exists():
        return "No play count data found."

    # Try to find by slug first, then by name
    slug = artist_name.lower().replace(" ", "-").replace("'", "")
    candidates = [stats_dir / f"{slug}.json"]

    # Also try exact name match
    for f in stats_dir.glob("*.json"):
        try:
            data = json.loads(f.read_text())
            if data.get("name", "").lower() == artist_name.lower():
                candidates.append(f)
        except Exception:
            continue

    for path in candidates:
        if path.exists():
            data = json.loads(path.read_text())
            lines = [
                f"# {data.get('name', 'Unknown')}",
                "",
                f"- **Listeners:** {data.get('stats', {}).get('listeners', 0)}",
                f"- **Play Count:** {data.get('stats', {}).get('playcount', 0)}",
                f"- **Last Updated:** {data.get('fetchedAt', 'unknown')}",
                "",
                "## Top Tracks",
                "",
            ]
            for i, track in enumerate(data.get("topTracks", []), 1):
                lines.append(f"{i}. **{track['name']}** — {track.get('playcount', 0)} plays, {track.get('listeners', 0)} listeners")

            return "\n".join(lines)

    # List available artists
    available = []
    for f in stats_dir.glob("*.json"):
        try:
            data = json.loads(f.read_text())
            available.append(data.get("name", f.stem))
        except Exception:
            continue

    return f"Artist not found: {artist_name}. Available: {', '.join(available)}"


# ---------------------------------------------------------------------------
# Helpers — music rights
# ---------------------------------------------------------------------------


def _resolve_artist(name_or_uuid: str) -> tuple[str, str] | None:
    """Resolve an artist name or UUID to (uuid, name). Returns None if not found."""
    import re
    import uuid as _uuid
    # Check if it's already a UUID
    try:
        _uuid.UUID(name_or_uuid)
        artist_file = CACHE_DIR / "artists" / f"{name_or_uuid}.json"
        if artist_file.is_file():
            data = json.loads(artist_file.read_text())
            return (name_or_uuid, data.get("name", name_or_uuid))
        return None
    except ValueError:
        pass

    # Search by name (case-insensitive, strip punctuation for matching)
    artists_dir = CACHE_DIR / "artists"
    if not artists_dir.is_dir():
        return None
    query_lower = name_or_uuid.lower()
    query_clean = re.sub(r'[^a-z0-9]', '', query_lower)
    for f in artists_dir.glob("*.json"):
        try:
            data = json.loads(f.read_text())
            name = data.get("name", "")
            name_lower = name.lower()
            name_clean = re.sub(r'[^a-z0-9]', '', name_lower)
            # Exact match, substring match, or cleaned match
            if query_lower in name_lower or query_clean in name_clean:
                return (data.get("uuid", f.stem), name)
        except Exception:
            continue
    return None


def _extract_rights_from_artist_cache(data: dict) -> dict:
    """Extract ISRCs from an artist cache file's recordings subpage."""
    recordings = []
    subpages = data.get("subpages", {})
    rec_details = subpages.get("recordings", {}).get("details", {})
    for rec_id, rec_data in rec_details.items():
        isrcs = rec_data.get("isrcs", [])
        if not isrcs:
            continue
        title = rec_data.get("title", "unknown")
        artist = rec_data.get("artist-credit", [{}])[0].get("name", data.get("name", "unknown"))
        releases = [r.get("title", "") for r in rec_data.get("releases", []) if r.get("title")]
        recordings.append({
            "type": "recording",
            "uuid": rec_id,
            "title": title,
            "artist": artist,
            "identifiers": {"isrcs": isrcs},
            "releases": releases,
        })
    return {"recordings": recordings}


def _extract_rights_from_work_cache(data: dict) -> dict:
    """Extract ISWCs and ASCAP IDs from a work cache file."""
    work_data = data.get("data", {})
    iswcs = work_data.get("iswcs", [])
    ascap_ids = []
    for attr in work_data.get("attributes", []):
        if attr.get("type") == "ASCAP ID":
            ascap_ids.append(attr.get("value", ""))

    if not iswcs and not ascap_ids:
        return {}

    composers = []
    for rel in work_data.get("relations", []):
        if rel.get("type") in ("composer", "lyricist", "writer"):
            artist = rel.get("artist", {})
            if artist.get("name"):
                composers.append(artist["name"])

    return {
        "type": "work",
        "uuid": data.get("uuid", ""),
        "title": data.get("name", "unknown"),
        "composers": composers,
        "identifiers": {"iswcs": iswcs, "ascap_ids": ascap_ids},
    }


def _build_rights_index() -> dict:
    """Build a reverse index of ISRC -> recording and ISWC/ASCAP -> work across all cached data."""
    isrc_index: dict[str, dict] = {}
    iswc_index: dict[str, dict] = {}
    ascap_index: dict[str, dict] = {}

    # Index artists (for ISRCs)
    artists_dir = CACHE_DIR / "artists"
    if artists_dir.is_dir():
        for f in artists_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                for rec in _extract_rights_from_artist_cache(data).get("recordings", []):
                    for isrc in rec["identifiers"].get("isrcs", []):
                        isrc_index[isrc] = rec
            except Exception:
                continue

    # Index works (for ISWCs and ASCAP IDs)
    works_dir = CACHE_DIR / "works"
    if works_dir.is_dir():
        for f in works_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                work = _extract_rights_from_work_cache(data)
                if not work:
                    continue
                for iswc in work["identifiers"].get("iswcs", []):
                    iswc_index[iswc] = work
                for ascap in work["identifiers"].get("ascap_ids", []):
                    ascap_index[ascap] = work
            except Exception:
                continue

    return {"isrc": isrc_index, "iswc": iswc_index, "ascap": ascap_index}


# ---------------------------------------------------------------------------
# Tools — music rights
# ---------------------------------------------------------------------------


@mcp.tool()
def search_rights(query: str, artist: str = "") -> str:
    """Search music rights data by title, ISRC, ISWC, or ASCAP ID.

    Searches across all cached recordings and works for matching identifiers
    or title substrings. Returns matching recordings (with ISRCs) and works
    (with ISWCs and ASCAP IDs).

    Args:
        query: Search string (title, ISRC, ISWC, or ASCAP ID)
        artist: Optional artist name to filter results
    """
    index = _build_rights_index()
    query_upper = query.upper().strip()
    query_lower = query.lower().strip()

    # Resolve artist filter to a name for matching
    artist_filter = ""
    if artist:
        resolved = _resolve_artist(artist)
        if resolved:
            artist_filter = resolved[1].lower()
        else:
            artist_filter = artist.lower()

    matches = []

    # Search ISRC index
    for isrc, rec in index["isrc"].items():
        if query_upper in isrc.upper() or query_lower in rec.get("title", "").lower():
            if artist_filter and artist_filter not in rec.get("artist", "").lower():
                continue
            matches.append(rec)

    # Search ISWC index
    for iswc, work in index["iswc"].items():
        if query_upper in iswc.upper() or query_lower in work.get("title", "").lower():
            if artist_filter and not any(artist_filter in c.lower() for c in work.get("composers", [])):
                continue
            matches.append(work)

    # Search ASCAP index
    for ascap, work in index["ascap"].items():
        if query_upper in ascap.upper() or query_lower in work.get("title", "").lower():
            if work not in matches:
                if artist_filter and not any(artist_filter in c.lower() for c in work.get("composers", [])):
                    continue
                matches.append(work)

    if not matches:
        return f"No rights data found for '{query}'"

    lines = [f"Found {len(matches)} match(es) for '{query}':\n"]
    for m in matches:
        kind = m.get("type", "recording")
        title = m.get("title", "unknown")
        uuid = m.get("uuid", "")
        ids = m.get("identifiers", {})

        if kind == "recording":
            isrcs = ", ".join(ids.get("isrcs", [])) or "n/a"
            artist = m.get("artist", "unknown")
            releases = ", ".join(m.get("releases", [])[:3]) or "none"
            lines.append(f"  [recording] {title}")
            lines.append(f"    artist:  {artist}")
            lines.append(f"    ISRC:    {isrcs}")
            lines.append(f"    releases: {releases}")
            lines.append(f"    mbid:    {uuid}")
        else:
            iswcs = ", ".join(ids.get("iswcs", [])) or "pending"
            ascap = ", ".join(ids.get("ascap_ids", [])) or "n/a"
            composers = ", ".join(m.get("composers", [])) or "unknown"
            lines.append(f"  [work] {title}")
            lines.append(f"    composers: {composers}")
            lines.append(f"    ISWC:   {iswcs}")
            lines.append(f"    ASCAP:  {ascap}")
            lines.append(f"    mbid:   {uuid}")
        lines.append("")

    return "\n".join(lines)


@mcp.tool()
def get_recording_rights(recording_uuid: str) -> str:
    """Get ISRC and release info for a specific recording by MusicBrainz UUID.

    Args:
        recording_uuid: MusicBrainz recording UUID
    """
    # Search all artist caches for this recording
    artists_dir = CACHE_DIR / "artists"
    if not artists_dir.is_dir():
        return f"Artist cache not found"

    for f in artists_dir.glob("*.json"):
        try:
            data = json.loads(f.read_text())
            rec_details = data.get("subpages", {}).get("recordings", {}).get("details", {})
            if recording_uuid in rec_details:
                rec = rec_details[recording_uuid]
                isrcs = rec.get("isrcs", [])
                title = rec.get("title", "unknown")
                artist = data.get("name", "unknown")
                releases = [r.get("title", "") for r in rec.get("releases", []) if r.get("title")]

                lines = [
                    f"Recording: {title}",
                    f"Artist:    {artist}",
                    f"ISRC:      {', '.join(isrcs) if isrcs else 'none'}",
                    f"Releases:  {', '.join(releases[:5]) if releases else 'none'}",
                    f"MusicBrainz: https://musicbrainz.org/recording/{recording_uuid}",
                ]
                return "\n".join(lines)
        except Exception:
            continue

    return f"Recording {recording_uuid} not found in cache"


@mcp.tool()
def get_work_rights(work_uuid: str) -> str:
    """Get ISWC, ASCAP ID, and composer info for a specific work by MusicBrainz UUID.

    Args:
        work_uuid: MusicBrainz work UUID
    """
    # Check works cache first
    work_file = CACHE_DIR / "works" / f"{work_uuid}.json"
    if work_file.is_file():
        data = json.loads(work_file.read_text())
        work = _extract_rights_from_work_cache(data)
        if work:
            lines = [
                f"Work:      {work['title']}",
                f"Composers: {', '.join(work['composers']) or 'unknown'}",
                f"ISWC:      {', '.join(work['identifiers']['iswcs']) or 'pending'}",
                f"ASCAP ID:  {', '.join(work['identifiers']['ascap_ids']) or 'n/a'}",
                f"MusicBrainz: https://musicbrainz.org/work/{work_uuid}",
            ]
            return "\n".join(lines)
        return f"Work {work_uuid} found but has no rights data (ISWCs/ASCAP IDs not yet assigned)"

    # Also check artist caches (works subpage details)
    artists_dir = CACHE_DIR / "artists"
    if artists_dir.is_dir():
        for f in artists_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text())
                work_details = data.get("subpages", {}).get("works", {}).get("details", {})
                if work_uuid in work_details:
                    wd = work_details[work_uuid]
                    work_data = wd.get("data", wd)
                    iswcs = work_data.get("iswcs", [])
                    ascap_ids = [
                        a.get("value", "")
                        for a in work_data.get("attributes", [])
                        if a.get("type") == "ASCAP ID"
                    ]
                    composers = [
                        r.get("artist", {}).get("name", "")
                        for r in work_data.get("relations", [])
                        if r.get("type") in ("composer", "lyricist", "writer")
                        and r.get("artist", {}).get("name")
                    ]
                    title = wd.get("title") or work_data.get("title", "unknown")

                    lines = [
                        f"Work:      {title}",
                        f"Composers: {', '.join(composers) or 'unknown'}",
                        f"ISWC:      {', '.join(iswcs) or 'pending'}",
                        f"ASCAP ID:  {', '.join(ascap_ids) or 'n/a'}",
                        f"MusicBrainz: https://musicbrainz.org/work/{work_uuid}",
                    ]
                    return "\n".join(lines)
            except Exception:
                continue

    return f"Work {work_uuid} not found in cache"


@mcp.tool()
def artist_rights_catalog(artist: str) -> str:
    """Get full rights catalog (all ISRCs, ISWCs, ASCAP IDs) for an artist.

    Args:
        artist: Artist name or MusicBrainz UUID
    """
    resolved = _resolve_artist(artist)
    if not resolved:
        return f"Artist '{artist}' not found in cache"
    artist_uuid, artist_name = resolved

    artist_file = CACHE_DIR / "artists" / f"{artist_uuid}.json"
    if not artist_file.is_file():
        return f"Artist {artist_uuid} not found in cache"

    data = json.loads(artist_file.read_text())

    # Collect recordings with ISRCs
    rec_data = _extract_rights_from_artist_cache(data)
    recordings = rec_data.get("recordings", [])

    # Collect works with ISWCs/ASCAP IDs
    works = []
    work_details = data.get("subpages", {}).get("works", {}).get("details", {})
    for work_id, wd in work_details.items():
        work_info = _extract_rights_from_work_cache({"uuid": work_id, "name": wd.get("title", "unknown"), "data": wd.get("data", {})})
        if work_info:
            works.append(work_info)

    lines = [f"# Rights Catalog: {artist_name}", f"MusicBrainz: https://musicbrainz.org/artist/{artist_uuid}", ""]

    if recordings:
        lines.append(f"## Recordings ({len(recordings)} with ISRCs)")
        lines.append("")
        for rec in sorted(recordings, key=lambda r: r["title"]):
            isrcs = ", ".join(rec["identifiers"]["isrcs"])
            lines.append(f"  {rec['title']}: {isrcs}")
        lines.append("")

    if works:
        lines.append(f"## Works ({len(works)} with ISWCs/ASCAP IDs)")
        lines.append("")
        for w in sorted(works, key=lambda w: w["title"]):
            iswcs = ", ".join(w["identifiers"]["iswcs"]) or "pending"
            ascap = ", ".join(w["identifiers"]["ascap_ids"]) or "n/a"
            lines.append(f"  {w['title']}:")
            lines.append(f"    ISWC:  {iswcs}")
            lines.append(f"    ASCAP: {ascap}")
        lines.append("")

    if not recordings and not works:
        lines.append("No rights data found for this artist.")

    return "\n".join(lines)


@mcp.tool()
def export_rights_catalog() -> str:
    """Export all cached rights data as TSV for pasting into ASCAP forms or spreadsheets.

    Output format: Title, Type, Artist/Composer, ISRC, ISWC, ASCAP ID
    """
    index = _build_rights_index()

    lines = ["Title\tType\tArtist/Composer\tISRC\tISWC\tASCAP ID"]

    seen = set()

    for isrc, rec in sorted(index["isrc"].items()):
        key = ("recording", rec.get("uuid", ""))
        if key in seen:
            continue
        seen.add(key)
        title = rec.get("title", "unknown")
        artist = rec.get("artist", "unknown")
        releases = ", ".join(rec.get("releases", [])[:2])
        lines.append(f"{title}\trecording\t{artist}\t{isrc}\t\t")

    for iswc, work in sorted(index["iswc"].items()):
        key = ("work", work.get("uuid", ""))
        if key in seen:
            continue
        seen.add(key)
        title = work.get("title", "unknown")
        composers = ", ".join(work.get("composers", []))
        ascap = ", ".join(work.get("identifiers", {}).get("ascap_ids", []))
        lines.append(f"{title}\twork\t{composers}\t\t{iswc}\t{ascap}")

    for ascap_id, work in sorted(index["ascap"].items()):
        key = ("work", work.get("uuid", ""))
        if key in seen:
            continue
        seen.add(key)
        title = work.get("title", "unknown")
        composers = ", ".join(work.get("composers", []))
        iswc = ", ".join(work.get("identifiers", {}).get("iswcs", []))
        lines.append(f"{title}\twork\t{composers}\t\t{iswc}\t{ascap_id}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Tools — corrections (anti-hallucination)
# ---------------------------------------------------------------------------

# Corrections live in the historian-tui repo, not this one: they are personal
# knowledge curation rather than website content, and that repo is versioned
# with a remote so the correction history is backed up. Nothing on the website
# reads this data — only these MCP tools and the historian TUI do.
# Override with MAGMA_CORRECTIONS_DIR if the historian-tui checkout moves.
CORRECTIONS_DIR = Path(
    os.environ.get(
        "MAGMA_CORRECTIONS_DIR",
        Path.home() / "historian-tui" / "data" / "corrections",
    )
)


@mcp.tool()
def submit_correction(entity_type: str, entity_key: str, field: str,
                      incorrect_value: str, correct_value: str, source: str = "") -> str:
    """Submit a correction for false information the model generated.
    
    Args:
        entity_type: artists, places, works, collectives, contributors, labels
        entity_key: UUID or slug of the entity
        field: The field that was wrong (e.g. "name", "area", "date", "description")
        incorrect_value: What the model incorrectly stated
        correct_value: The correct information
        source: Where the correct info came from (e.g. "verified by user", "MusicBrainz API")
    """
    CORRECTIONS_DIR.mkdir(parents=True, exist_ok=True)
    correction_file = CORRECTIONS_DIR / f"{entity_type}_{entity_key}.json"
    
    corrections = []
    if correction_file.exists():
        try:
            corrections = json.loads(correction_file.read_text())
        except Exception:
            corrections = []
    
    corrections.append({
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "field": field,
        "incorrect": incorrect_value,
        "correct": correct_value,
        "source": source,
    })
    
    correction_file.write_text(json.dumps(corrections, indent=2))
    return f"Correction recorded for {entity_type}/{entity_key}: {field}"


@mcp.tool()
def get_corrections(entity_type: str, entity_key: str) -> str:
    """Get all recorded corrections for an entity to avoid repeating mistakes.
    
    Args:
        entity_type: artists, places, works, collectives, contributors, labels
        entity_key: UUID or slug of the entity
    """
    correction_file = CORRECTIONS_DIR / f"{entity_type}_{entity_key}.json"
    if not correction_file.exists():
        return f"No corrections recorded for {entity_type}/{entity_key}"
    
    try:
        corrections = json.loads(correction_file.read_text())
    except Exception:
        return f"Error reading corrections for {entity_type}/{entity_key}"
    
    lines = [f"Corrections for {entity_type}/{entity_key} ({len(corrections)} total):\n"]
    for c in corrections:
        lines.append(f"  [{c.get('timestamp', 'unknown')}] {c.get('field', 'unknown')}:")
        lines.append(f"    WRONG:  {c.get('incorrect', 'unknown')}")
        lines.append(f"    CORRECT: {c.get('correct', 'unknown')}")
        if c.get('source'):
            lines.append(f"    Source: {c['source']}")
        lines.append("")
    
    return "\n".join(lines)


@mcp.tool()
def get_known_errors(entity_type: str, entity_key: str) -> str:
    """MUST be called before making any claims about an entity. Returns known errors to avoid repeating past hallucinations.
    
    Args:
        entity_type: artists, places, works, collectives, contributors, labels
        entity_key: UUID or slug of the entity
    """
    correction_file = CORRECTIONS_DIR / f"{entity_type}_{entity_key}.json"
    if not correction_file.exists():
        return "No known errors for this entity."
    
    try:
        corrections = json.loads(correction_file.read_text())
    except Exception:
        return "Error reading corrections."
    
    lines = [f"KNOWN ERRORS to avoid (from {len(corrections)} past corrections):\n"]
    for c in corrections:
        lines.append(f"- DO NOT say \"{c.get('incorrect', 'unknown')}\" about {c.get('field', 'unknown')}")
        lines.append(f"  The correct value is: \"{c.get('correct', 'unknown')}\"")
    
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    mcp.run()
