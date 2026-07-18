"""
private/server.py — Password-protected HTTP server for private game pages
Serves static files from mapped directories after authentication.

Usage:
    python server.py [--config config.json]

Requires: no external dependencies (uses stdlib only)
"""

import argparse
import hashlib
import json
import os
import secrets
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

# ── Config ────────────────────────────────────────────────────────────────────

DEFAULT_CONFIG = {
    "port": 8782,
    "password": "changeme",
    "bind": "0.0.0.0",
    "session_ttl_hours": 24,
    "routes": {}
}

CONFIG = {}

# ── Session management ────────────────────────────────────────────────────────

sessions = {}  # token -> {"created": timestamp, "last_access": timestamp}

def generate_session_token():
    return secrets.token_hex(16)

def is_session_valid(token):
    if token not in sessions:
        return False
    session = sessions[token]
    ttl = CONFIG.get("session_ttl_hours", 24) * 3600
    if time.time() - session["created"] > ttl:
        del sessions[token]
        return False
    session["last_access"] = time.time()
    return True

def cleanup_expired_sessions():
    ttl = CONFIG.get("session_ttl_hours", 24) * 3600
    now = time.time()
    expired = [t for t, s in sessions.items() if now - s["created"] > ttl]
    for t in expired:
        del sessions[t]

# ── HTTP Handler ──────────────────────────────────────────────────────────────

class PrivateHTTPHandler(BaseHTTPRequestHandler):
    """Serve static files with password authentication."""

    def log_message(self, format, *args):
        pass  # Suppress HTTP request logs

    def _get_cookie(self, name):
        cookie_header = self.headers.get("Cookie", "")
        for part in cookie_header.split(";"):
            part = part.strip()
            if part.startswith(f"{name}="):
                return part[len(name) + 1:]
        return None

    def _send_response(self, code, content_type, body, no_cache=False):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        if no_cache:
            self.send_header("Cache-Control", "no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
        self.end_headers()
        self.wfile.write(body)

    def _send_redirect(self, location):
        self.send_response(302)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.end_headers()

    def _set_session_cookie(self, token):
        # Set cookie for 24 hours, HTTP-only, path=/
        max_age = CONFIG.get("session_ttl_hours", 24) * 3600
        self.send_header(
            "Set-Cookie",
            f"private_session={token}; Max-Age={max_age}; Path=/; HttpOnly"
        )

    def _is_authenticated(self):
        token = self._get_cookie("private_session")
        return is_session_valid(token)

    def _resolve_path(self, path):
        """Resolve a request path to a file path based on route mappings."""
        routes = CONFIG.get("routes", {})

        # Check exact route match
        if path in routes:
            return routes[path], True

        # Check prefix route match (e.g., /sorry/anything -> SORRY directory)
        for route_prefix, local_dir in routes.items():
            if path.startswith(route_prefix + "/") or path == route_prefix:
                relative = path[len(route_prefix):].lstrip("/")
                if not relative:
                    relative = "index.html"
                return os.path.join(local_dir, relative), True

        return None, False

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Root path -> serve login page
        if path == "/" or path == "":
            if self._is_authenticated():
                # Authenticated at root -> show private index (list of games)
                self._serve_private_index()
            else:
                self._serve_login_page()
            return

        # Check if path maps to a private route
        file_path, is_route = self._resolve_path(path)
        if is_route and file_path:
            if self._is_authenticated():
                self._serve_file(file_path)
            else:
                self._send_redirect("/")
            return

        # Static files (style.css, etc.)
        if path == "/style.css":
            style_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "style.css")
            self._serve_file(style_path)
            return

        if path == "/favicon.svg":
            # Serve a lock icon for the private area
            self._send_response(200, "image/svg+xml", '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><text y="14" font-size="14">🔒</text></svg>')
            return

        # 404
        self._send_response(404, "text/plain", "Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/login":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8")
            params = parse_qs(body)
            password = params.get("password", [""])[0]

            if password == CONFIG.get("password"):
                token = generate_session_token()
                sessions[token] = {"created": time.time(), "last_access": time.time()}
                self.send_response(302)
                self._set_session_cookie(token)
                self.send_header("Location", "/")
                self.send_header("Cache-Control", "no-store, must-revalidate")
                self.send_header("Pragma", "no-cache")
                self.end_headers()
            else:
                # Wrong password -> serve login page with error
                self._serve_login_page(error="ACCESS DENIED — INCORRECT PASSWORD")
            return

        self._send_response(404, "text/plain", "Not Found")

    def _serve_login_page(self, error=None):
        html_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "index.html")
        try:
            with open(html_path, "r") as f:
                html = f.read()
            if error:
                html = html.replace("<!--ERROR_PLACEHOLDER-->", f'<div class="error">{error}</div>')
            self._send_response(200, "text/html", html, no_cache=True)
        except FileNotFoundError:
            self._send_response(500, "text/plain", "Login page not found")

    def _serve_private_index(self):
        """Serve a page listing available private games."""
        routes = CONFIG.get("routes", {})
        game_list = ""
        for route, local_dir in routes.items():
            game_name = route.lstrip("/").replace("-", " ").upper()
            game_list += f'<li><a href="{route}/">{game_name}</a></li>\n'

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PRIVATE ARCADE</title>
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <a href="http://magmacrunch.duckdns.org/arcade/" class="mc-back">magmacrunch arcade</a>
  <div class="scanlines"></div>
  <div class="container">
    <h1 class="title">PRIVATE ARCADE</h1>
    <p class="subtitle">// authenticated //</p>
    <div class="divider"></div>
    <ul class="game-list">
      {game_list}
    </ul>
    <div class="divider"></div>
    <p class="footer-text">SESSION ACTIVE — ACCESS GRANTED</p>
  </div>
</body>
</html>"""
        self._send_response(200, "text/html", html, no_cache=True)

    def _serve_file(self, file_path):
        """Serve a static file with proper MIME types."""
        if not os.path.exists(file_path) or not os.path.isfile(file_path):
            self._send_response(404, "text/plain", "File not found")
            return

        # Determine MIME type
        ext = os.path.splitext(file_path)[1].lower()
        mime_types = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "application/javascript",
            ".json": "application/json",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".gif": "image/gif",
            ".ico": "image/x-icon",
            ".woff": "font/woff",
            ".woff2": "font/woff2",
            ".ttf": "font/ttf",
        }
        content_type = mime_types.get(ext, "application/octet-stream")

        try:
            with open(file_path, "rb") as f:
                content = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.send_header("Cache-Control", "no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self._send_response(500, "text/plain", f"Error reading file: {e}")

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="MagmaCrunch Private Arcade Server")
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

    port = CONFIG.get("port", 8782)
    bind = CONFIG.get("bind", "0.0.0.0")

    print(f"")
    print(f"  ╔══════════════════════════════════════════════╗")
    print(f"  ║     MAGMACRUNCH PRIVATE — Auth Server        ║")
    print(f"  ╚══════════════════════════════════════════════╝")
    print(f"")
    print(f"  Server:   http://localhost:{port}")
    print(f"  Auth:     ENABLED")
    print(f"  Routes:   {', '.join(CONFIG.get('routes', {}).keys())}")
    print(f"")

    # Session cleanup every 10 minutes
    import threading
    def cleanup_loop():
        while True:
            time.sleep(600)
            cleanup_expired_sessions()
    cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
    cleanup_thread.start()

    # Start HTTP server
    server = HTTPServer((bind, port), PrivateHTTPHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()

if __name__ == "__main__":
    main()
