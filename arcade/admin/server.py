"""
admin/server.py — MagmaCrunch Arcade dashboard
Provides a web UI for monitoring and managing all arcade servers.

Usage:
    python server.py [--config config.json]

Requires: websockets (already installed for game servers)
"""

import argparse
import asyncio
import concurrent.futures
import hmac
import json
import os
import re
import shutil
import subprocess
import sys
import threading
import time
from datetime import datetime
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread

import websockets

from magmascript import GHClient, MC1Client, PIClient

# ── Config ────────────────────────────────────────────────────────────────────

DEFAULT_CONFIG = {
    "port": 8780,
    "auth": False,
    "password": "changeme",
    "bind": "0.0.0.0",
}

CONFIG = {}

# ── GitHub token (stored separately, never in config.json) ──────────────────

ADMIN_DIR = os.path.dirname(os.path.abspath(__file__))
GITHUB_TOKEN_PATH = os.path.join(ADMIN_DIR, "github-token.json")


def load_github_token():
    """Load GitHub token from github-token.json or GITHUB_TOKEN env var."""
    # First try the file
    try:
        with open(GITHUB_TOKEN_PATH) as f:
            data = json.load(f)
            token = data.get("token", "")
            if token:
                return token
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    # Fall back to environment variable
    return os.environ.get("GITHUB_TOKEN", "")


def save_github_token(token):
    """Save GitHub token to github-token.json."""
    with open(GITHUB_TOKEN_PATH, "w") as f:
        json.dump({"token": token}, f, indent=2)

# ── magmascript client setup ────────────────────────────────────────────────

from magmascript.core.config import set_config as _set_magmascript_config, Config as _MagmascriptConfig

_gh_client = None
_pi_client = None
_mc1_client = None

def _init_gh_client():
    """Initialize GHClient with the admin dashboard's GitHub token."""
    global _gh_client, _pi_client, _mc1_client
    token = load_github_token()
    if token:
        cfg = _MagmascriptConfig()
        cfg.gh.token = token
        _set_magmascript_config(cfg)
    _gh_client = GHClient()
    _pi_client = PIClient(local=True)
    _mc1_client = MC1Client()

# ── Service definitions ──────────────────────────────────────────────────────

SERVICES = [
    {"name": "SORRY!", "unit": "arcade-sorry", "port": 8765, "icon": "🎲"},
    {"name": "Cribbage", "unit": "arcade-cribbage", "port": 8766, "icon": "🃏"},
    {"name": "Scandinavian Stud", "unit": "arcade-stud", "port": 8767, "icon": "🂡"},
    {"name": "Chat", "unit": "arcade-chat", "port": 8768, "icon": "💬"},
    {"name": "Chess", "unit": "arcade-chess", "port": 8769, "icon": "♟"},
    {"name": "Checkers", "unit": "arcade-checkers", "port": 8770, "icon": "⬛"},
    {"name": "Backgammon", "unit": "arcade-backgammon", "port": 8771, "icon": "🎯"},
    {"name": "Chinese Checkers", "unit": "arcade-chinese-checkers", "port": 8772, "icon": "✳"},
    {"name": "Parchisi", "unit": "arcade-parchisi", "port": 8773, "icon": "🎲"},
    {"name": "Aggravation", "unit": "arcade-aggravation", "port": 8774, "icon": "😤"},
    {"name": "Private Auth", "unit": "arcade-private", "port": 8782, "icon": "🔒"},
]

VALID_UNITS = {svc["unit"] for svc in SERVICES} | {"arcade-admin"}

def valid_unit(unit):
    return unit in VALID_UNITS

# ── Score storage ────────────────────────────────────────────────────────────

SCORES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scores")
STATS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "stats")
API_KEYS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "api-keys.json")
JUKEBOX_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jukebox-songs.json")
THEMES_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "themes.json")
TV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tv-channels.json")
TV_JS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "visual", "tv", "channels.js")
FAVICONS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "favicons.json")

# ── GitHub API ──────────────────────────────────────────────────────────────

GITHUB_PATHS = {
    "jukebox": "arcade/admin/jukebox-songs.json",
    "tv_json": "arcade/admin/tv-channels.json",
    "tv_js":   "visual/tv/channels.js",
    "themes":  "arcade/admin/themes.json",
}

def _repo_root():
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")

def load_game_scores(game_id):
    """Load scores for a specific game."""
    game_id = _sanitize_game_id(game_id)
    path = os.path.join(SCORES_DIR, f"{game_id}.json")
    if not os.path.exists(path):
        return {"game": game_id, "scores": []}
    with open(path) as f:
        return json.load(f)

def save_game_scores(game_id, data):
    """Save scores for a specific game (atomic write)."""
    game_id = _sanitize_game_id(game_id)
    os.makedirs(SCORES_DIR, exist_ok=True)
    path = os.path.join(SCORES_DIR, f"{game_id}.json")
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)

# ── Score locking ───────────────────────────────────────────────────────────

_score_locks = {}
_score_locks_lock = threading.Lock()

def _get_score_lock(game_id):
    with _score_locks_lock:
        if game_id not in _score_locks:
            _score_locks[game_id] = threading.Lock()
        return _score_locks[game_id]

def _sanitize_game_id(game_id):
    """Strip anything that isn't alphanumeric, hyphen, or underscore."""
    return re.sub(r'[^a-zA-Z0-9_-]', '', str(game_id))

def load_api_keys():
    """Load API keys from disk."""
    if os.path.exists(API_KEYS_PATH):
        with open(API_KEYS_PATH) as f:
            return json.load(f)
    return {}

def save_api_keys(keys):
    """Save API keys to disk."""
    with open(API_KEYS_PATH, "w") as f:
        json.dump(keys, f, indent=2)

def load_jukebox():
    """Load jukebox songs from disk."""
    if os.path.exists(JUKEBOX_PATH):
        with open(JUKEBOX_PATH) as f:
            return json.load(f)
    return []

def save_jukebox(songs):
    """Save jukebox songs to disk."""
    with open(JUKEBOX_PATH, "w") as f:
        json.dump(songs, f, indent=2)

def load_themes():
    """Load themes from disk."""
    if os.path.exists(THEMES_PATH):
        with open(THEMES_PATH) as f:
            return json.load(f)
    return []

def save_themes(themes):
    """Save themes to disk."""
    with open(THEMES_PATH, "w") as f:
        json.dump(themes, f, indent=2)

def load_tv():
    """Load TV channels from disk."""
    if os.path.exists(TV_PATH):
        with open(TV_PATH) as f:
            return json.load(f)
    return []

def save_tv(channels):
    """Save TV channels to disk and generate channels.js for the TV page."""
    with open(TV_PATH, "w") as f:
        json.dump(channels, f, indent=2)
    # Generate the JS file that visual/tv/index.html includes
    lines = []
    for ch in channels:
        lines.append(
            '    { title: ' + json.dumps(ch.get("title", "")) +
            ', artist: ' + json.dumps(ch.get("artist", "")) +
            ', id: ' + json.dumps(ch.get("id", "")) +
            ', year: ' + json.dumps(ch.get("year", "")) + ' }'
        )
    js = 'window.TV_CHANNELS = [\n' + ',\n'.join(lines) + '\n];\n'
    os.makedirs(os.path.dirname(TV_JS_PATH), exist_ok=True)
    with open(TV_JS_PATH, "w") as f:
        f.write(js)

def load_favicons():
    """Load saved favicon designs from disk."""
    if os.path.exists(FAVICONS_PATH):
        with open(FAVICONS_PATH) as f:
            return json.load(f)
    return {}

def save_favicons(designs):
    """Save favicon designs to disk."""
    with open(FAVICONS_PATH, "w") as f:
        json.dump(designs, f, indent=2)

def generate_favicon_files(pixels):
    """Generate favicon.ico, favicon-32.png, and apple-touch-icon.png from pixel data.
    Returns dict with ok, files (list of local paths), and error if failed.
    """
    try:
        from PIL import Image
    except ImportError:
        return {"ok": False, "error": "Pillow not installed on server"}

    try:
        GRID = 16
        # Create 16x16 image
        img16 = Image.new('RGBA', (GRID, GRID), (8, 8, 8, 255))
        for y in range(GRID):
            row = pixels[y] if y < len(pixels) else []
            for x in range(GRID):
                color = row[x] if x < len(row) else None
                if color and color != "null":
                    # Parse hex color
                    c = color.lstrip('#')
                    if len(c) == 6:
                        r, g, b = int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16)
                        img16.putpixel((x, y), (r, g, b, 255))

        # Create 32x32 image
        img32 = img16.resize((32, 32), Image.NEAREST)

        # Create 180x180 apple touch icon
        img180 = img16.resize((180, 180), Image.NEAREST)

        # Paths
        repo_root = _repo_root()
        ico_path = os.path.join(repo_root, "favicon.ico")
        png32_path = os.path.join(repo_root, "favicon-32.png")
        apple_path = os.path.join(repo_root, "apple-touch-icon.png")

        # Save files locally
        img16.save(ico_path, format='ICO', sizes=[(16, 16), (32, 32)])
        img32.save(png32_path, format='PNG')
        img180.save(apple_path, format='PNG')

        return {
            "ok": True,
            "files": [
                {"path": "favicon.ico", "local": ico_path},
                {"path": "favicon-32.png", "local": png32_path},
                {"path": "apple-touch-icon.png", "local": apple_path},
            ]
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}

def github_commit_files(files, message, token):
    """Commit multiple files to GitHub. Returns dict with ok, commit sha, error."""
    import base64 as b64

    repo = f"{GITHUB_OWNER}/{GITHUB_REPO}"
    ref = "heads/main"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "MagmaCrunch-Ops/4.0",
    }

    # Get current commit SHA
    req = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/git/ref/{ref}",
        headers=headers
    )
    try:
        with urllib.request.urlopen(req) as resp:
            ref_data = json.loads(resp.read())
            commit_sha = ref_data["object"]["sha"]
    except Exception as e:
        return {"ok": False, "error": f"Failed to get ref: {e}"}

    # Get tree SHA
    req = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/git/commits/{commit_sha}",
        headers=headers
    )
    try:
        with urllib.request.urlopen(req) as resp:
            commit_data = json.loads(resp.read())
            base_tree = commit_data["tree"]["sha"]
    except Exception as e:
        return {"ok": False, "error": f"Failed to get commit: {e}"}

    # Create blobs for each file
    blob_shas = {}
    for f in files:
        with open(f["local"], "rb") as fh:
            content = fh.read()
        blob_data = json.dumps({
            "content": b64.b64encode(content).decode("utf-8"),
            "encoding": "base64"
        }).encode("utf-8")
        req = urllib.request.Request(
            f"{GITHUB_API}/repos/{repo}/git/blobs",
            data=blob_data,
            headers={**headers, "Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req) as resp:
                blob_info = json.loads(resp.read())
                blob_shas[f["path"]] = blob_info["sha"]
        except Exception as e:
            return {"ok": False, "error": f"Failed to create blob for {f['path']}: {e}"}

    # Create tree
    tree_items = [{"path": p, "mode": "100644", "type": "blob", "sha": s} for p, s in blob_shas.items()]
    tree_data = json.dumps({
        "base_tree": base_tree,
        "tree": tree_items
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/git/trees",
        data=tree_data,
        headers={**headers, "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            tree_info = json.loads(resp.read())
            new_tree_sha = tree_info["sha"]
    except Exception as e:
        return {"ok": False, "error": f"Failed to create tree: {e}"}

    # Create commit
    commit_data = json.dumps({
        "message": message,
        "tree": new_tree_sha,
        "parents": [commit_sha]
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/git/commits",
        data=commit_data,
        headers={**headers, "Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            new_commit = json.loads(resp.read())
            new_commit_sha = new_commit["sha"]
    except Exception as e:
        return {"ok": False, "error": f"Failed to create commit: {e}"}

    # Update ref
    ref_data = json.dumps({"sha": new_commit_sha}).encode("utf-8")
    req = urllib.request.Request(
        f"{GITHUB_API}/repos/{repo}/git/refs/{ref}",
        data=ref_data,
        headers={**headers, "Content-Type": "application/json"},
        method="PATCH"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return {"ok": True, "commit": new_commit_sha}
    except Exception as e:
        return {"ok": False, "error": f"Failed to update ref: {e}"}

def add_score(game_id, name, score, extra=None):
    """Add a score entry and return its rank (1-indexed)."""
    game_id = _sanitize_game_id(game_id)
    lock = _get_score_lock(game_id)
    with lock:
        data = load_game_scores(game_id)
        scores = data.get("scores", [])
        entry = {"initials": name, "score": score}
        if extra:
            entry.update(extra)
        scores.append(entry)
        scores.sort(key=lambda s: s.get("score", 0), reverse=True)
        scores = scores[:100]  # keep top 100
        data["scores"] = scores
        save_game_scores(game_id, data)
        for i, s in enumerate(scores):
            if s is entry:
                return i + 1
        return len(scores)


def _format_score_entry(entry):
    """Format a score entry as a human-readable string."""
    s = entry.get("score", 0)
    parts = [str(s)]
    if entry.get("level"):
        parts.append(f"L{entry['level']}")
    if entry.get("difficulty"):
        parts.append(f"D{entry['difficulty']}")
    if entry.get("time"):
        parts.append(entry["time"])
    if entry.get("moves"):
        parts.append(f"{entry['moves']} moves")
    if entry.get("won") is False:
        parts.append("lost")
    return " \u00b7 ".join(parts)


_last_notifications = {}  # {(game_id, name, score): timestamp}


def _notify_discord_high_score(game_id, name, score, extra):
    """Send a Discord webhook when a new #1 score is set."""
    webhook_url = CONFIG.get("discord_webhook_url")
    if not webhook_url:
        return
    key = (game_id, name, score)
    now = time.time()
    if key in _last_notifications and now - _last_notifications[key] < 60:
        return  # skip duplicate within 60s
    _last_notifications[key] = now
    try:
        data = load_game_scores(game_id)
        game_name = data.get("game", game_id)
        entry = {"initials": name, "score": score}
        if extra:
            entry.update(extra)
        formatted = _format_score_entry(entry)
        total = len(data.get("scores", []))

        payload = json.dumps({
            "embeds": [{
                "title": "\U0001f3c6 New #1 Score!",
                "description": f"**{name}** just took the top spot in **{game_name}**!",
                "fields": [
                    {"name": "Score", "value": formatted, "inline": True},
                    {"name": "Total scores", "value": str(total), "inline": True},
                ],
                "color": 0xFFE03A,
                "footer": {"text": "arcade-updates"},
            }],
        }).encode()

        req = urllib.request.Request(
            webhook_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"Discord webhook failed: {e}", file=sys.stderr)

# ── Auth sessions ────────────────────────────────────────────────────────────

authenticated_sessions = set()

def generate_session_token():
    import secrets
    return secrets.token_hex(16)

# ── System commands ──────────────────────────────────────────────────────────

_executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

def run_cmd(cmd, timeout=10):
    """Run a shell command and return stdout."""
    try:
        result = subprocess.run(
            cmd, shell=True, capture_output=True, text=True, timeout=timeout
        )
        return result.stdout.strip()
    except subprocess.TimeoutExpired:
        return "[command timed out]"
    except Exception as e:
        return f"[error: {e}]"

async def run_cmd_async(cmd, timeout=10):
    """Run a shell command in a thread pool to avoid blocking the event loop."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, lambda: run_cmd(cmd, timeout))

# ── Log streaming ────────────────────────────────────────────────────────────

async def stream_logs(websocket, service_filter="all"):
    """Stream logs from journalctl -f."""
    cmd = f"journalctl -u 'arcade-*' -f -o cat"
    if service_filter != "all":
        cmd = f"journalctl -u {service_filter} -f -o cat"

    proc = await asyncio.create_subprocess_shell(
        cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )

    try:
        async for line in proc.stdout:
            text = line.decode().rstrip()
            if text:
                await websocket.send(json.dumps({"type": "log", "text": text}))
    except asyncio.CancelledError:
        pass
    finally:
        proc.terminate()
        try:
            await proc.wait()
        except ProcessLookupError:
            pass

# ── WebSocket handler ────────────────────────────────────────────────────────

async def ws_handler(websocket):
    """Handle WebSocket connections."""
    stream_task = None

    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            action = msg.get("action")

            # Auth check
            if CONFIG.get("auth"):
                token = msg.get("token")
                if token not in authenticated_sessions:
                    if action == "login":
                        if hmac.compare_digest(str(msg.get("password", "")), str(CONFIG.get("password", ""))):
                            token = generate_session_token()
                            authenticated_sessions.add(token)
                            await websocket.send(json.dumps({
                                "type": "login_ok",
                                "token": token
                            }))
                        else:
                            await websocket.send(json.dumps({
                                "type": "login_fail",
                                "error": "Wrong password"
                            }))
                        continue
                    else:
                        await websocket.send(json.dumps({
                            "type": "auth_required"
                        }))
                        continue

            if action == "status":
                services = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.services()
                )
                # Convert to the format the frontend expects
                statuses = {}
                for svc in services:
                    statuses[svc.unit] = svc.status
                await websocket.send(json.dumps({
                    "type": "status",
                    "services": SERVICES,
                    "statuses": statuses
                }))

            elif action == "logs":
                unit = msg.get("service", "arcade-chat")
                if not valid_unit(unit):
                    await websocket.send(json.dumps({"type": "error", "text": f"invalid service: {unit}"}))
                    continue
                lines_count = min(int(msg.get("lines", 50)), 500)
                logs = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.logs(unit, lines_count)
                )
                await websocket.send(json.dumps({
                    "type": "logs",
                    "service": unit,
                    "text": logs
                }))

            elif action == "logs_errors":
                logs = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.logs_errors()
                )
                await websocket.send(json.dumps({
                    "type": "logs",
                    "service": "errors",
                    "text": logs
                }))

            elif action == "logs_today":
                logs = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.logs_today()
                )
                await websocket.send(json.dumps({
                    "type": "logs",
                    "service": "today",
                    "text": logs
                }))

            elif action == "restart":
                unit = msg.get("service")
                if not unit or not valid_unit(unit):
                    await websocket.send(json.dumps({"type": "error", "text": f"invalid service: {unit}"}))
                    continue
                result = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.restart(unit)
                )
                await websocket.send(json.dumps({
                    "type": "restart_result",
                    "service": unit,
                    "result": result
                }))
                # Send updated status
                services = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.services()
                )
                statuses = {svc.unit: svc.status for svc in services}
                await websocket.send(json.dumps({
                    "type": "status",
                    "services": SERVICES,
                    "statuses": statuses
                }))

            elif action == "restart_all":
                result = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.restart_all()
                )
                await websocket.send(json.dumps({
                    "type": "restart_result",
                    "service": "all",
                    "result": result
                }))
                # Send updated status
                await asyncio.sleep(2)
                services = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.services()
                )
                statuses = {svc.unit: svc.status for svc in services}
                await websocket.send(json.dumps({
                    "type": "status",
                    "services": SERVICES,
                    "statuses": statuses
                }))

            elif action == "stream_start":
                service_filter = msg.get("service", "all")
                if service_filter != "all" and not valid_unit(service_filter):
                    await websocket.send(json.dumps({"type": "error", "text": f"invalid service: {service_filter}"}))
                    continue
                if stream_task and not stream_task.done():
                    stream_task.cancel()
                stream_task = asyncio.create_task(stream_logs(websocket, service_filter))

            elif action == "stream_stop":
                if stream_task and not stream_task.done():
                    stream_task.cancel()
                    stream_task = None

            elif action == "system_info":
                info = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.info()
                )
                await websocket.send(json.dumps({
                    "type": "system_info",
                    "info": {
                        "uptime": info.uptime,
                        "hostname": info.hostname,
                        "memory": info.memory,
                        "cpu_temp": info.cpu_temp,
                        "cpu_load": info.cpu_load,
                    }
                }))

            elif action == "restart_pi":
                result = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.reboot()
                )
                await websocket.send(json.dumps({
                    "type": "pi_restart",
                    "result": result or "Rebooting..."
                }))

            elif action == "poweroff_pi":
                result = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.shutdown()
                )
                await websocket.send(json.dumps({
                    "type": "pi_poweroff",
                    "result": result or "Shutting down..."
                }))

            # ── MC1 actions ──────────────────────────────────────────────

            elif action == "mc1_info":
                try:
                    info = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: _mc1_client.info()
                    )
                    await websocket.send(json.dumps({
                        "type": "mc1_info",
                        "info": {
                            "hostname": info.hostname,
                            "uptime": info.uptime,
                            "memory": info.memory,
                            "cpu_load": info.cpu_load,
                            "disk_free": info.disk_free,
                        }
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "mc1_info",
                        "error": str(e)
                    }))

            elif action == "mc1_services":
                try:
                    services = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: _mc1_client.services()
                    )
                    await websocket.send(json.dumps({
                        "type": "mc1_services",
                        "services": [{"name": s.name, "status": s.status, "ok": s.ok} for s in services]
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "mc1_services",
                        "error": str(e)
                    }))

            elif action == "mc1_restart_service":
                service_name = msg.get("service", "")
                if service_name:
                    try:
                        result = await asyncio.get_event_loop().run_in_executor(
                            _executor, lambda: _mc1_client.restart(service_name)
                        )
                        await websocket.send(json.dumps({
                            "type": "mc1_restart_result",
                            "service": service_name,
                            "result": result
                        }))
                    except Exception as e:
                        await websocket.send(json.dumps({
                            "type": "mc1_restart_result",
                            "service": service_name,
                            "error": str(e)
                        }))

            elif action == "mc1_reboot":
                try:
                    result = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: _mc1_client.reboot()
                    )
                    await websocket.send(json.dumps({
                        "type": "mc1_reboot",
                        "result": result or "Rebooting MC1..."
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "mc1_reboot",
                        "error": str(e)
                    }))

            elif action == "chat_history":
                # Connect to chat server and fetch history
                try:
                    async with websockets.connect(f"ws://localhost:8768") as chat_ws:
                        await chat_ws.send(json.dumps({"type": "get_history"}))
                        # Receive history responses
                        for _ in range(2):  # history + room_histories
                            resp = await asyncio.wait_for(chat_ws.recv(), timeout=5)
                            data = json.loads(resp)
                            await websocket.send(json.dumps({
                                "type": data.get("type", "chat_history"),
                                "messages": data.get("messages", []),
                                "rooms": data.get("rooms", {})
                            }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "chat_error",
                        "error": str(e)
                    }))

            elif action == "score_load":
                game_id = _sanitize_game_id(msg.get("game", ""))
                if game_id:
                    try:
                        data = await asyncio.get_event_loop().run_in_executor(
                            _executor, lambda: load_game_scores(game_id)
                        )
                        await websocket.send(json.dumps({
                            "type": "scores",
                            "game": game_id,
                            "scores": data.get("scores", [])
                        }))
                    except Exception as e:
                        await websocket.send(json.dumps({
                            "type": "error", "action": "score_load", "error": str(e)
                        }))

            elif action == "score_save":
                game_id = _sanitize_game_id(msg.get("game", ""))
                name = msg.get("name", "").upper()[:3]
                score_val = msg.get("score")
                extra = msg.get("extra")
                if game_id and name and score_val is not None:
                    try:
                        rank = await asyncio.get_event_loop().run_in_executor(
                            _executor, lambda: add_score(game_id, name, score_val, extra)
                        )
                        if rank == 1:
                            asyncio.ensure_future(asyncio.get_event_loop().run_in_executor(
                                _executor, lambda: _notify_discord_high_score(game_id, name, score_val, extra)
                            ))
                        await websocket.send(json.dumps({
                            "type": "score_saved",
                            "game": game_id,
                            "rank": rank
                        }))
                    except Exception as e:
                        await websocket.send(json.dumps({
                            "type": "error", "action": "score_save", "error": str(e)
                        }))

            elif action == "scores_all":
                def _load_all():
                    result = {}
                    if os.path.isdir(SCORES_DIR):
                        for fn in os.listdir(SCORES_DIR):
                            if fn.endswith(".json") and fn != "backup":
                                gid = fn[:-5]
                                result[gid] = load_game_scores(gid)
                    return result
                try:
                    all_scores = await asyncio.get_event_loop().run_in_executor(
                        _executor, _load_all
                    )
                    await websocket.send(json.dumps({
                        "type": "scores_all",
                        "games": all_scores
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "error", "action": "scores_all", "error": str(e)
                    }))

            elif action == "score_reset":
                game_id = _sanitize_game_id(msg.get("game", ""))
                if game_id:
                    def _reset_with_backup():
                        src = os.path.join(SCORES_DIR, f"{game_id}.json")
                        if os.path.exists(src):
                            backup_dir = os.path.join(SCORES_DIR, "backup")
                            os.makedirs(backup_dir, exist_ok=True)
                            ts = datetime.now().strftime("%Y%m%d-%H%M%S")
                            shutil.copy2(src, os.path.join(backup_dir, f"{game_id}-{ts}.json"))
                        save_game_scores(game_id, {"game": game_id, "scores": []})
                    try:
                        await asyncio.get_event_loop().run_in_executor(
                            _executor, _reset_with_backup
                        )
                        await websocket.send(json.dumps({
                            "type": "score_reset",
                            "game": game_id,
                            "ok": True
                        }))
                    except Exception as e:
                        await websocket.send(json.dumps({
                            "type": "error", "action": "score_reset", "error": str(e)
                        }))

            elif action == "plays_load":
                def _load_plays():
                    result = []
                    lastfm_dir = os.path.join(STATS_DIR, "lastfm")
                    if os.path.isdir(lastfm_dir):
                        for fn in os.listdir(lastfm_dir):
                            if fn.endswith(".json"):
                                path = os.path.join(lastfm_dir, fn)
                                try:
                                    with open(path) as f:
                                        result.append(json.load(f))
                                except Exception:
                                    pass
                    # sort by playcount descending
                    result.sort(key=lambda a: a.get("stats", {}).get("playcount", 0), reverse=True)
                    return result
                try:
                    artists = await asyncio.get_event_loop().run_in_executor(
                        _executor, _load_plays
                    )
                    await websocket.send(json.dumps({
                        "type": "plays_load",
                        "artists": artists
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "error", "action": "plays_load", "error": str(e)
                    }))

            elif action == "api_keys_load":
                keys = await asyncio.get_event_loop().run_in_executor(
                    _executor, load_api_keys
                )
                await websocket.send(json.dumps({
                    "type": "api_keys",
                    "keys": keys
                }))

            elif action == "api_keys_save":
                keys = msg.get("keys", {})
                await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: save_api_keys(keys)
                )
                await websocket.send(json.dumps({
                    "type": "api_keys_saved",
                    "ok": True
                }))

            elif action == "change_password":
                current = msg.get("current", "")
                new_pw = msg.get("new_password", "")
                if hmac.compare_digest(str(current), str(CONFIG.get("password", ""))):
                    if new_pw and len(new_pw) >= 4:
                        CONFIG["password"] = new_pw
                        # Save to config file
                        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
                        with open(config_path, "w") as f:
                            json.dump(CONFIG, f, indent=2)
                        await websocket.send(json.dumps({
                            "type": "password_changed",
                            "ok": True
                        }))
                    else:
                        await websocket.send(json.dumps({
                            "type": "password_changed",
                            "ok": False,
                            "error": "New password must be at least 4 characters"
                        }))
                else:
                    await websocket.send(json.dumps({
                        "type": "password_changed",
                        "ok": False,
                        "error": "Current password is incorrect"
                    }))

            elif action == "change_private_password":
                current = msg.get("current", "")
                new_pw = msg.get("new_password", "")
                private_config_path = os.path.join(
                    os.path.dirname(os.path.abspath(__file__)), "..", "private", "config.json"
                )
                try:
                    with open(private_config_path) as f:
                        private_config = json.load(f)
                except Exception:
                    await websocket.send(json.dumps({
                        "type": "private_password_changed",
                        "ok": False,
                        "error": "Could not read private server config"
                    }))
                    continue

                if not hmac.compare_digest(str(current), str(private_config.get("password", ""))):
                    await websocket.send(json.dumps({
                        "type": "private_password_changed",
                        "ok": False,
                        "error": "Current password is incorrect"
                    }))
                    continue

                if not new_pw or len(new_pw) < 4:
                    await websocket.send(json.dumps({
                        "type": "private_password_changed",
                        "ok": False,
                        "error": "New password must be at least 4 characters"
                    }))
                    continue

                private_config["password"] = new_pw
                try:
                    with open(private_config_path, "w") as f:
                        json.dump(private_config, f, indent=2)
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "private_password_changed",
                        "ok": False,
                        "error": f"Could not write config: {e}"
                    }))
                    continue

                # Restart the private auth service
                await run_cmd_async("sudo systemctl restart arcade-private", timeout=15)
                await websocket.send(json.dumps({
                    "type": "private_password_changed",
                    "ok": True
                }))

            elif action == "get_current_private_password":
                private_config_path = os.path.join(
                    os.path.dirname(os.path.abspath(__file__)), "..", "private", "config.json"
                )
                try:
                    with open(private_config_path) as f:
                        private_config = json.load(f)
                except Exception:
                    await websocket.send(json.dumps({
                        "type": "current_private_password",
                        "ok": False,
                        "error": "Could not read private server config"
                    }))
                    continue

                if private_config.get("password_mode") == "auto":
                    from datetime import datetime
                    today = datetime.now()
                    current_pw = f"lava{today.strftime('%m%d')}"
                    mode = "auto"
                else:
                    current_pw = "(set in config — not shown for security)"
                    mode = "manual"

                await websocket.send(json.dumps({
                    "type": "current_private_password",
                    "ok": True,
                    "password": current_pw,
                    "mode": mode
                }))

            elif action == "jukebox_load":
                songs = await asyncio.get_event_loop().run_in_executor(
                    _executor, load_jukebox
                )
                await websocket.send(json.dumps({
                    "type": "jukebox_songs",
                    "songs": songs
                }))

            elif action == "jukebox_save":
                songs = msg.get("songs", [])
                await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: save_jukebox(songs)
                )
                await websocket.send(json.dumps({
                    "type": "jukebox_saved",
                    "ok": True
                }))

            elif action == "themes_load":
                themes = await asyncio.get_event_loop().run_in_executor(
                    _executor, load_themes
                )
                await websocket.send(json.dumps({
                    "type": "themes_data",
                    "themes": themes
                }))

            elif action == "themes_save":
                themes = msg.get("themes", [])
                await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: save_themes(themes)
                )
                await websocket.send(json.dumps({
                    "type": "themes_saved",
                    "ok": True
                }))

            elif action == "tv_load":
                channels = await asyncio.get_event_loop().run_in_executor(
                    _executor, load_tv
                )
                await websocket.send(json.dumps({
                    "type": "tv_channels",
                    "channels": channels
                }))

            elif action == "tv_save":
                channels = msg.get("channels", [])
                await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: save_tv(channels)
                )
                await websocket.send(json.dumps({
                    "type": "tv_saved",
                    "ok": True
                }))

            # ── Favicon editor actions ──────────────────────────────────────

            elif action == "favicon_load_all":
                designs = await asyncio.get_event_loop().run_in_executor(
                    _executor, load_favicons
                )
                await websocket.send(json.dumps({
                    "type": "favicon_list",
                    "designs": designs
                }))

            elif action == "favicon_save":
                name = msg.get("name", "").strip()
                pixels = msg.get("pixels", [])
                if not name:
                    await websocket.send(json.dumps({
                        "type": "favicon_saved",
                        "ok": False,
                        "error": "Name is required"
                    }))
                    continue
                designs = await asyncio.get_event_loop().run_in_executor(
                    _executor, load_favicons
                )
                designs[name] = pixels
                await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: save_favicons(designs)
                )
                await websocket.send(json.dumps({
                    "type": "favicon_saved",
                    "ok": True,
                    "name": name
                }))

            elif action == "favicon_delete":
                name = msg.get("name", "").strip()
                if not name:
                    continue
                designs = await asyncio.get_event_loop().run_in_executor(
                    _executor, load_favicons
                )
                if name in designs:
                    del designs[name]
                    await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: save_favicons(designs)
                    )
                await websocket.send(json.dumps({
                    "type": "favicon_deleted",
                    "ok": True
                }))

            elif action == "favicon_deploy":
                pixels = msg.get("pixels", [])
                token = load_github_token()
                if not token:
                    await websocket.send(json.dumps({
                        "type": "favicon_deploy_result",
                        "ok": False,
                        "error": "No GitHub token configured"
                    }))
                    continue
                # Generate favicon files using Python
                try:
                    result = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: generate_favicon_files(pixels)
                    )
                    if not result["ok"]:
                        await websocket.send(json.dumps({
                            "type": "favicon_deploy_result",
                            "ok": False,
                            "error": result["error"]
                        }))
                        continue
                    # Commit to GitHub
                    commit_msg = msg.get("message", "Update favicon via MAGMA//OPS")
                    files_to_commit = result["files"]
                    commit_result = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: github_commit_files(files_to_commit, commit_msg, token)
                    )
                    await websocket.send(json.dumps({
                        "type": "favicon_deploy_result",
                        "ok": commit_result["ok"],
                        "error": commit_result.get("error"),
                        "commit": commit_result.get("commit")
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "favicon_deploy_result",
                        "ok": False,
                        "error": str(e)
                    }))

            # ── GitHub deploy actions ──────────────────────────────────────

            elif action == "github_test":
                token = msg.get("github_token") or load_github_token()
                if not token:
                    await websocket.send(json.dumps({
                        "type": "github_test_result", "ok": False, "error": "No token configured"
                    }))
                    continue
                try:
                    info = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: _gh_client.repo_info()
                    )
                    await websocket.send(json.dumps({
                        "type": "github_test_result", "ok": True,
                        "repo": info.get("full_name", ""),
                        "private": info.get("private", False),
                        "default_branch": info.get("default_branch", ""),
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "github_test_result", "ok": False,
                        "error": str(e)
                    }))

            elif action == "github_deploy_jukebox":
                songs = msg.get("songs", [])
                token = load_github_token()
                commit_msg = msg.get("message", "Update jukebox songs via MAGMA//OPS")
                await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: save_jukebox(songs)
                )
                if not token:
                    await websocket.send(json.dumps({
                        "type": "github_jukebox_result", "ok": False, "error": "No GitHub token configured"
                    }))
                    continue
                content = json.dumps(songs, indent=2) + "\n"
                try:
                    result = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: _gh_client.put_file(GITHUB_PATHS["jukebox"], content, commit_msg)
                    )
                    await websocket.send(json.dumps({
                        "type": "github_jukebox_result", "ok": True,
                        "commit_url": None, "songs_count": len(songs),
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "github_jukebox_result", "ok": False, "error": str(e),
                    }))

            elif action == "github_deploy_tv":
                channels = msg.get("channels", [])
                token = load_github_token()
                commit_msg = msg.get("message", "Update TV channels via MAGMA//OPS")
                await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: save_tv(channels)
                )
                if not token:
                    await websocket.send(json.dumps({
                        "type": "github_tv_result", "ok": False, "error": "No GitHub token configured"
                    }))
                    continue
                # Generate JS
                lines = []
                for ch in channels:
                    lines.append(
                        '    { title: ' + json.dumps(ch.get("title", "")) +
                        ', artist: ' + json.dumps(ch.get("artist", "")) +
                        ', id: ' + json.dumps(ch.get("id", "")) +
                        ', year: ' + json.dumps(ch.get("year", "")) + ' }'
                    )
                js_content = 'window.TV_CHANNELS = [\n' + ',\n'.join(lines) + '\n];\n'
                json_content = json.dumps(channels, indent=2) + "\n"

                files_to_commit = [
                    {"path": GITHUB_PATHS["tv_json"], "content": json_content},
                    {"path": GITHUB_PATHS["tv_js"], "content": js_content},
                ]

                try:
                    result = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: _gh_client.commit_multiple(files_to_commit, commit_msg)
                    )
                    await websocket.send(json.dumps({
                        "type": "github_tv_result", "ok": True,
                        "commit_url": None, "channels_count": len(channels),
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "github_tv_result", "ok": False, "error": str(e),
                    }))

            elif action == "github_deploy_themes":
                themes = msg.get("themes", [])
                token = load_github_token()
                commit_msg = msg.get("message", "Update themes via MAGMA//OPS")
                await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: save_themes(themes)
                )
                if not token:
                    await websocket.send(json.dumps({
                        "type": "github_themes_result", "ok": False, "error": "No GitHub token configured"
                    }))
                    continue
                content = json.dumps(themes, indent=2) + "\n"
                try:
                    result = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: _gh_client.put_file(GITHUB_PATHS["themes"], content, commit_msg)
                    )
                    await websocket.send(json.dumps({
                        "type": "github_themes_result", "ok": True,
                        "commit_url": None, "themes_count": len(themes),
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "github_themes_result", "ok": False, "error": str(e),
                    }))

            elif action == "github_sync_all":
                token = load_github_token()
                commit_msg = msg.get("message", "Bulk sync from MAGMA//OPS dashboard")
                if not token:
                    await websocket.send(json.dumps({
                        "type": "github_sync_result", "ok": False, "error": "No GitHub token configured"
                    }))
                    continue

                files_to_commit = []
                files_changed = []

                def _check_file(local_path, gh_path, label):
                    if not os.path.exists(local_path):
                        return
                    with open(local_path) as f:
                        local = f.read()
                    try:
                        remote, _ = _gh_client.get_file(gh_path)
                    except Exception:
                        remote = None
                    if remote is None or local.strip() != remote.strip():
                        files_to_commit.append({"path": gh_path, "content": local})
                        files_changed.append(label)

                await asyncio.get_event_loop().run_in_executor(_executor, lambda: (
                    _check_file(JUKEBOX_PATH, GITHUB_PATHS["jukebox"], "jukebox-songs.json"),
                    _check_file(TV_PATH, GITHUB_PATHS["tv_json"], "tv-channels.json"),
                    _check_file(THEMES_PATH, GITHUB_PATHS["themes"], "themes.json"),
                ))

                # Also check TV JS if TV JSON changed
                if "tv-channels.json" in files_changed and os.path.exists(TV_JS_PATH):
                    with open(TV_JS_PATH) as f:
                        tv_js = f.read()
                    try:
                        remote, _ = _gh_client.get_file(GITHUB_PATHS["tv_js"])
                    except Exception:
                        remote = None
                    if remote is None or tv_js.strip() != remote.strip():
                        files_to_commit.append({"path": GITHUB_PATHS["tv_js"], "content": tv_js})
                        files_changed.append("channels.js")

                # Check scores
                if os.path.isdir(SCORES_DIR):
                    for fn in sorted(os.listdir(SCORES_DIR)):
                        if fn.endswith(".json"):
                            local_path = os.path.join(SCORES_DIR, fn)
                            gh_path = f"arcade/admin/scores/{fn}"
                            with open(local_path) as f:
                                local = f.read()
                            try:
                                remote, _ = _gh_client.get_file(gh_path)
                            except Exception:
                                remote = None
                            if remote is None or local.strip() != remote.strip():
                                files_to_commit.append({"path": gh_path, "content": local})
                                files_changed.append(fn)

                if not files_to_commit:
                    await websocket.send(json.dumps({
                        "type": "github_sync_result", "ok": True,
                        "message": "Everything is already in sync", "files_changed": [],
                    }))
                    continue

                try:
                    await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: _gh_client.commit_multiple(files_to_commit, commit_msg)
                    )
                    await websocket.send(json.dumps({
                        "type": "github_sync_result", "ok": True,
                        "files_changed": files_changed,
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "github_sync_result", "ok": False, "error": str(e),
                    }))

            elif action == "github_backup":
                token = load_github_token()
                commit_msg = msg.get("message", "Update cache via MAGMA//OPS")
                backup_type = msg.get("backup_type", "musicbrainz")

                await websocket.send(json.dumps({
                    "type": "github_backup_progress", "status": f"Running {backup_type} backup..."
                }))

                script_name = "backup-musicbrainz.mjs" if backup_type == "musicbrainz" else "backup-tmdb.mjs"
                script_path = os.path.join(_repo_root(), "scripts", script_name)
                backup_output = await run_cmd_async(f"node {script_path} --skip-existing", timeout=600)

                await websocket.send(json.dumps({
                    "type": "github_backup_progress", "status": "Backup complete. Committing to GitHub..."
                }))

                if not token:
                    await websocket.send(json.dumps({
                        "type": "github_backup_result", "ok": False,
                        "error": "Backup ran but no GitHub token — changes saved locally only",
                        "backup_output": backup_output,
                    }))
                    continue

                # Scan cache dir
                cache_dir = os.path.join(_repo_root(), "archive", "_cache")
                files_to_commit = []
                files_changed = []
                if os.path.isdir(cache_dir):
                    for root, dirs, fnames in os.walk(cache_dir):
                        for fn in fnames:
                            if fn.endswith(".json"):
                                local_path = os.path.join(root, fn)
                                rel_path = os.path.relpath(local_path, _repo_root())
                                with open(local_path) as f:
                                    local = f.read()
                                try:
                                    remote, _ = _gh_client.get_file(rel_path)
                                except Exception:
                                    remote = None
                                if remote is None or local.strip() != remote.strip():
                                    files_to_commit.append({"path": rel_path, "content": local})
                                    files_changed.append(rel_path)

                if files_to_commit:
                    try:
                        await asyncio.get_event_loop().run_in_executor(
                            _executor, lambda: _gh_client.commit_multiple(files_to_commit, commit_msg)
                        )
                        ok = True
                    except Exception as e:
                        ok = False
                        files_changed = [str(e)]
                else:
                    ok = True

                await websocket.send(json.dumps({
                    "type": "github_backup_result", "ok": ok,
                    "files_changed": files_changed,
                }))

            elif action == "github_config_save":
                github_token = msg.get("github_token", "")
                save_github_token(github_token)
                _init_gh_client()
                await websocket.send(json.dumps({"type": "github_config_saved", "ok": True}))

            elif action == "github_config_load":
                token = load_github_token()
                masked = ("*" * (len(token) - 4) + token[-4:]) if token else ""
                await websocket.send(json.dumps({
                    "type": "github_config_loaded",
                    "ok": bool(token),
                    "masked": masked,
                }))

            # ── Bot status actions ──────────────────────────────────────────

            elif action == "bots_list":
                token = load_github_token()
                if not token:
                    await websocket.send(json.dumps({
                        "type": "bots_list_result", "workflows": [], "error": "No GitHub token — configure in GITHUB tab"
                    }))
                    continue

                try:
                    workflows = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: _gh_client.workflows()
                    )
                    # Convert to the format the frontend expects
                    wf_list = []
                    for w in workflows:
                        wf_list.append({
                            "name": w.name,
                            "file": w.file,
                            "status": w.status,
                            "conclusion": w.conclusion,
                            "createdAt": w.last_run,
                            "event": w.event,
                            "htmlUrl": w.html_url,
                        })
                    await websocket.send(json.dumps({
                        "type": "bots_list_result", "workflows": wf_list
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "bots_list_result", "workflows": [], "error": str(e)
                    }))

            elif action == "bots_trigger":
                token = load_github_token()
                workflow_id = msg.get("workflow_id", "")
                if not token or not workflow_id:
                    await websocket.send(json.dumps({
                        "type": "bots_trigger_result", "ok": False,
                        "error": "Missing token or workflow_id"
                    }))
                    continue

                try:
                    await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: _gh_client.trigger(workflow_id)
                    )
                    await websocket.send(json.dumps({
                        "type": "bots_trigger_result", "ok": True, "workflow_id": workflow_id,
                    }))
                except Exception as e:
                    await websocket.send(json.dumps({
                        "type": "bots_trigger_result", "ok": False, "workflow_id": workflow_id,
                        "error": str(e)
                    }))

            elif action == "nginx_traffic":
                lines = min(int(msg.get("lines", 1000)), 10000)
                traffic = await asyncio.get_event_loop().run_in_executor(
                    _executor, lambda: _pi_client.traffic(lines)
                )
                await websocket.send(json.dumps({
                    "type": "nginx_traffic",
                    "top_ips": traffic.top_ips,
                    "status_codes": traffic.status_codes,
                    "user_agents": traffic.user_agents,
                    "total": traffic.total_requests
                }))

    except websockets.ConnectionClosed:
        pass
    finally:
        if stream_task and not stream_task.done():
            stream_task.cancel()

# ── HTTP server ──────────────────────────────────────────────────────────────

class AdminHTTPHandler(SimpleHTTPRequestHandler):
    """Serve static files from the admin/static directory.
    Also serves api-keys.json from the admin directory (public, no auth)."""

    def __init__(self, *args, **kwargs):
        self._admin_dir = os.path.dirname(os.path.abspath(__file__))
        static_dir = os.path.join(self._admin_dir, "static")
        super().__init__(*args, directory=static_dir, **kwargs)

    def do_GET(self):
        # Serve api-keys.json from admin dir (not static dir)
        if self.path == "/api-keys.json" or self.path.startswith("/api-keys.json?"):
            keys_path = os.path.join(self._admin_dir, "api-keys.json")
            if os.path.exists(keys_path):
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                with open(keys_path, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b"{}")
        else:
            super().do_GET()

    def log_message(self, format, *args):
        pass  # Suppress HTTP request logs

# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MagmaCrunch Arcade Dashboard")
    parser.add_argument("--config", default="config.json", help="Config file path")
    args = parser.parse_args()

    # Load config
    global CONFIG
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), args.config)
    if os.path.exists(config_path):
        with open(config_path) as f:
            CONFIG = json.load(f)
    else:
        CONFIG = DEFAULT_CONFIG.copy()

    # Migrate github_token from config.json → github-token.json (one-time)
    if "github_token" in CONFIG and CONFIG["github_token"]:
        save_github_token(CONFIG["github_token"])
        del CONFIG["github_token"]
        with open(config_path, "w") as f:
            json.dump(CONFIG, f, indent=2)

    port = CONFIG.get("port", 8780)
    bind = CONFIG.get("bind", "0.0.0.0")

    # Initialize magmascript clients
    _init_gh_client()

    print(f"")
    print(f"  ╔══════════════════════════════════════════════╗")
    print(f"  ║     MAGMACRUNCH OPERATIONS — Dashboard       ║")
    print(f"  ╚══════════════════════════════════════════════╝")
    print(f"")
    print(f"  Dashboard:  http://localhost:{port}")
    print(f"  WebSocket:  ws://localhost:{port}")
    print(f"  Auth:       {'enabled' if CONFIG.get('auth') else 'disabled'}")
    print(f"")

    # Start HTTP server in a thread
    http_server = HTTPServer((bind, port), AdminHTTPHandler)
    http_thread = Thread(target=http_server.serve_forever, daemon=True)
    http_thread.start()

    # Start WebSocket server
    async def run_ws():
        async with websockets.serve(ws_handler, bind, port + 1):
            await asyncio.Future()

    try:
        asyncio.run(run_ws())
    except KeyboardInterrupt:
        print("\nShutting down...")
        http_server.shutdown()

if __name__ == "__main__":
    main()
