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

# ── Auth sessions ────────────────────────────────────────────────────────────

authenticated_sessions = set()

def generate_session_token():
    import secrets
    return secrets.token_hex(16)

# ── System commands ──────────────────────────────────────────────────────────

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

def get_service_status(unit):
    """Get status of a systemd service."""
    output = run_cmd(f"systemctl is-active {unit}")
    return output

def get_all_statuses():
    """Get status of all services."""
    statuses = {}
    for svc in SERVICES:
        statuses[svc["unit"]] = get_service_status(svc["unit"])
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
    """Get Pi system information."""
    info = {}
    info["uptime"] = run_cmd("uptime -p")
    info["hostname"] = run_cmd("hostname")
    info["memory"] = run_cmd("free -h | awk '/^Mem:/ {print $3\"/\"$2}'")
    info["cpu_temp"] = run_cmd("vcgencmd measure_temp 2>/dev/null | cut -d= -f2 | cut -d'\"' -f1 || echo 'N/A'")
    info["cpu_load"] = run_cmd("uptime | awk -F'load average:' '{print $2}'")
    return info

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
                statuses = get_all_statuses()
                await websocket.send(json.dumps({
                    "type": "status",
                    "services": SERVICES,
                    "statuses": statuses
                }))

            elif action == "logs":
                unit = msg.get("service", "arcade-chat")
                lines = msg.get("lines", 50)
                logs = get_logs(unit, lines)
                await websocket.send(json.dumps({
                    "type": "logs",
                    "service": unit,
                    "text": logs
                }))

            elif action == "logs_errors":
                logs = get_logs_errors()
                await websocket.send(json.dumps({
                    "type": "logs",
                    "service": "errors",
                    "text": logs
                }))

            elif action == "logs_today":
                logs = get_logs_today()
                await websocket.send(json.dumps({
                    "type": "logs",
                    "service": "today",
                    "text": logs
                }))

            elif action == "restart":
                unit = msg.get("service")
                if unit:
                    result = restart_service(unit)
                    await websocket.send(json.dumps({
                        "type": "restart_result",
                        "service": unit,
                        "result": result
                    }))
                    # Send updated status
                    statuses = get_all_statuses()
                    await websocket.send(json.dumps({
                        "type": "status",
                        "services": SERVICES,
                        "statuses": statuses
                    }))

            elif action == "restart_all":
                result = restart_all()
                await websocket.send(json.dumps({
                    "type": "restart_result",
                    "service": "all",
                    "result": result
                }))
                # Send updated status
                await asyncio.sleep(2)
                statuses = get_all_statuses()
                await websocket.send(json.dumps({
                    "type": "status",
                    "services": SERVICES,
                    "statuses": statuses
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
                info = get_system_info()
                await websocket.send(json.dumps({
                    "type": "system_info",
                    "info": info
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
