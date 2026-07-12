"""
admin/server.py — MagmaCrunch Arcade dashboard
Provides a web UI for monitoring and managing all arcade servers.

Usage:
    python server.py [--config config.json]

Requires: websockets (already installed for game servers)
"""

import argparse
import asyncio
import json
import os
import subprocess
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread

import websockets

# ── Config ────────────────────────────────────────────────────────────────────

DEFAULT_CONFIG = {
    "port": 8780,
    "auth": False,
    "password": "changeme",
    "bind": "0.0.0.0"
}

CONFIG = {}

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
]

# ── Score storage ────────────────────────────────────────────────────────────

SCORES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scores")

def load_game_scores(game_id):
    """Load scores for a specific game."""
    path = os.path.join(SCORES_DIR, f"{game_id}.json")
    if not os.path.exists(path):
        return {"game": game_id, "scores": []}
    with open(path) as f:
        return json.load(f)

def save_game_scores(game_id, data):
    """Save scores for a specific game."""
    os.makedirs(SCORES_DIR, exist_ok=True)
    path = os.path.join(SCORES_DIR, f"{game_id}.json")
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def add_score(game_id, name, score, extra=None):
    """Add a score entry and return its rank (1-indexed)."""
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

# ── Auth sessions ────────────────────────────────────────────────────────────

authenticated_sessions = set()

def generate_session_token():
    import secrets
    return secrets.token_hex(16)

# ── System commands ──────────────────────────────────────────────────────────

import concurrent.futures

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

def get_service_status(unit):
    """Get status of a systemd service."""
    output = run_cmd(f"systemctl is-active {unit}")
    return output

def get_all_statuses():
    """Get status of all services in one command."""
    units = " ".join(svc["unit"] for svc in SERVICES)
    output = run_cmd(f"systemctl is-active {units}")
    statuses = {}
    lines = output.split("\n")
    for i, svc in enumerate(SERVICES):
        statuses[svc["unit"]] = lines[i].strip() if i < len(lines) else "unknown"
    return statuses

def get_logs(unit, lines=50):
    """Get recent logs for a service."""
    return run_cmd(f"journalctl -u {unit} -n {lines} --no-pager", timeout=15)

def get_logs_errors(lines=100):
    """Get error-level logs from all arcade services."""
    return run_cmd("journalctl -u 'arcade-*' -p err -n {lines} --no-pager".format(lines=lines), timeout=15)

def get_logs_today():
    """Get today's logs from all arcade services."""
    return run_cmd("journalctl -u 'arcade-*' --since today --no-pager", timeout=15)

def restart_service(unit):
    """Restart a systemd service."""
    return run_cmd(f"sudo systemctl restart {unit}", timeout=30)

def restart_all():
    """Restart all arcade services."""
    return run_cmd("sudo systemctl restart 'arcade-*'", timeout=60)

def get_system_info():
    """Get Pi system information in one command."""
    output = run_cmd("""
        echo "UPTIME:$(uptime -p)"
        echo "HOSTNAME:$(hostname)"
        echo "MEMORY:$(free -h | awk '/^Mem:/ {print $3"/"$2}')"
        echo "TEMP:$(vcgencmd measure_temp 2>/dev/null | cut -d= -f2 | cut -d'\"' -f1 || echo N/A)"
        echo "LOAD:$(uptime | awk -F'load average:' '{print $2}')"
    """)
    info = {}
    for line in output.split("\n"):
        if ":" in line:
            key, val = line.split(":", 1)
            info[key.lower()] = val.strip()
    # Map to expected keys
    return {
        "uptime": info.get("uptime", "N/A"),
        "hostname": info.get("hostname", "N/A"),
        "memory": info.get("memory", "N/A"),
        "cpu_temp": info.get("temp", "N/A"),
        "cpu_load": info.get("load", "N/A"),
    }

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
                        if msg.get("password") == CONFIG.get("password"):
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
                statuses = await run_cmd_async(
                    f"systemctl is-active {' '.join(svc['unit'] for svc in SERVICES)}"
                )
                status_map = {}
                lines = statuses.split("\n")
                for i, svc in enumerate(SERVICES):
                    status_map[svc["unit"]] = lines[i].strip() if i < len(lines) else "unknown"
                await websocket.send(json.dumps({
                    "type": "status",
                    "services": SERVICES,
                    "statuses": status_map
                }))

            elif action == "logs":
                unit = msg.get("service", "arcade-chat")
                lines = msg.get("lines", 50)
                logs = await run_cmd_async(f"journalctl -u {unit} -n {lines} --no-pager", timeout=15)
                await websocket.send(json.dumps({
                    "type": "logs",
                    "service": unit,
                    "text": logs
                }))

            elif action == "logs_errors":
                logs = await run_cmd_async("journalctl -u 'arcade-*' -p err -n 100 --no-pager", timeout=15)
                await websocket.send(json.dumps({
                    "type": "logs",
                    "service": "errors",
                    "text": logs
                }))

            elif action == "logs_today":
                logs = await run_cmd_async("journalctl -u 'arcade-*' --since today --no-pager", timeout=15)
                await websocket.send(json.dumps({
                    "type": "logs",
                    "service": "today",
                    "text": logs
                }))

            elif action == "restart":
                unit = msg.get("service")
                if unit:
                    result = await run_cmd_async(f"sudo systemctl restart {unit}", timeout=30)
                    await websocket.send(json.dumps({
                        "type": "restart_result",
                        "service": unit,
                        "result": result
                    }))
                    # Send updated status
                    statuses = await run_cmd_async(
                        f"systemctl is-active {' '.join(svc['unit'] for svc in SERVICES)}"
                    )
                    status_map = {}
                    lines = statuses.split("\n")
                    for i, svc in enumerate(SERVICES):
                        status_map[svc["unit"]] = lines[i].strip() if i < len(lines) else "unknown"
                    await websocket.send(json.dumps({
                        "type": "status",
                        "services": SERVICES,
                        "statuses": status_map
                    }))

            elif action == "restart_all":
                result = await run_cmd_async("sudo systemctl restart 'arcade-*'", timeout=60)
                await websocket.send(json.dumps({
                    "type": "restart_result",
                    "service": "all",
                    "result": result
                }))
                # Send updated status
                await asyncio.sleep(2)
                statuses = await run_cmd_async(
                    f"systemctl is-active {' '.join(svc['unit'] for svc in SERVICES)}"
                )
                status_map = {}
                lines = statuses.split("\n")
                for i, svc in enumerate(SERVICES):
                    status_map[svc["unit"]] = lines[i].strip() if i < len(lines) else "unknown"
                await websocket.send(json.dumps({
                    "type": "status",
                    "services": SERVICES,
                    "statuses": status_map
                }))

            elif action == "stream_start":
                if stream_task and not stream_task.done():
                    stream_task.cancel()
                service_filter = msg.get("service", "all")
                stream_task = asyncio.create_task(stream_logs(websocket, service_filter))

            elif action == "stream_stop":
                if stream_task and not stream_task.done():
                    stream_task.cancel()
                    stream_task = None

            elif action == "system_info":
                info_raw = await run_cmd_async("""
                    echo "UPTIME:$(uptime -p)"
                    echo "HOSTNAME:$(hostname)"
                    echo "MEMORY:$(free -h | awk '/^Mem:/ {print $3"/"$2}')"
                    echo "TEMP:$(vcgencmd measure_temp 2>/dev/null | cut -d= -f2 | cut -d'\"' -f1 || echo N/A)"
                    echo "LOAD:$(uptime | awk -F'load average:' '{print $2}')"
                """)
                parsed = {}
                for line in info_raw.split("\n"):
                    if ":" in line:
                        key, val = line.split(":", 1)
                        parsed[key.lower()] = val.strip()
                info = {
                    "uptime": parsed.get("uptime", "N/A"),
                    "hostname": parsed.get("hostname", "N/A"),
                    "memory": parsed.get("memory", "N/A"),
                    "cpu_temp": parsed.get("temp", "N/A"),
                    "cpu_load": parsed.get("load", "N/A"),
                }
                await websocket.send(json.dumps({
                    "type": "system_info",
                    "info": info
                }))

            elif action == "restart_pi":
                result = await run_cmd_async("sudo reboot", timeout=10)
                await websocket.send(json.dumps({
                    "type": "pi_restart",
                    "result": result or "Rebooting..."
                }))

            elif action == "poweroff_pi":
                result = await run_cmd_async("sudo poweroff", timeout=10)
                await websocket.send(json.dumps({
                    "type": "pi_poweroff",
                    "result": result or "Shutting down..."
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
                game_id = msg.get("game")
                if game_id:
                    data = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: load_game_scores(game_id)
                    )
                    await websocket.send(json.dumps({
                        "type": "scores",
                        "game": game_id,
                        "scores": data.get("scores", [])
                    }))

            elif action == "score_save":
                game_id = msg.get("game")
                name = msg.get("name", "").upper()[:3]
                score_val = msg.get("score")
                extra = msg.get("extra")
                if game_id and name and score_val is not None:
                    rank = await asyncio.get_event_loop().run_in_executor(
                        _executor, lambda: add_score(game_id, name, score_val, extra)
                    )
                    await websocket.send(json.dumps({
                        "type": "score_saved",
                        "game": game_id,
                        "rank": rank
                    }))

            elif action == "scores_all":
                def _load_all():
                    result = {}
                    if os.path.isdir(SCORES_DIR):
                        for fn in os.listdir(SCORES_DIR):
                            if fn.endswith(".json"):
                                gid = fn[:-5]
                                result[gid] = load_game_scores(gid)
                    return result
                all_scores = await asyncio.get_event_loop().run_in_executor(
                    _executor, _load_all
                )
                await websocket.send(json.dumps({
                    "type": "scores_all",
                    "games": all_scores
                }))

            elif action == "score_reset":
                game_id = msg.get("game")
                if game_id:
                    await asyncio.get_event_loop().run_in_executor(
                        _executor,
                        lambda: save_game_scores(game_id, {"game": game_id, "scores": []})
                    )
                    await websocket.send(json.dumps({
                        "type": "score_reset",
                        "game": game_id,
                        "ok": True
                    }))

    except websockets.ConnectionClosed:
        pass
    finally:
        if stream_task and not stream_task.done():
            stream_task.cancel()

# ── HTTP server ──────────────────────────────────────────────────────────────

class AdminHTTPHandler(SimpleHTTPRequestHandler):
    """Serve static files from the admin/static directory."""

    def __init__(self, *args, **kwargs):
        static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
        super().__init__(*args, directory=static_dir, **kwargs)

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

    port = CONFIG.get("port", 8780)
    bind = CONFIG.get("bind", "0.0.0.0")

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
