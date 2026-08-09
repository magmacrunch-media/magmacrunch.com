#!/usr/bin/env python3
"""HTTP server for magma-mcp.py — runs on the Pi as a remote MCP endpoint.

Usage:
    python serve.py [--port 8785]

Requires MCP_API_KEY env var for auth.
"""

import importlib.util
import os
import sys
from pathlib import Path

# ── Fix paths for Pi ────────────────────────────────────────────────────────

PI_REPO = Path.home() / "website"
if PI_REPO.is_dir():
    os.chdir(PI_REPO)
    sys.path.insert(0, str(PI_REPO / "mcp-server"))

# ── Import the MCP server via importlib (filename has hyphen) ────────────────

MCP_SCRIPT = Path(__file__).parent / "magma-mcp.py"
if not MCP_SCRIPT.is_dir() and not MCP_SCRIPT.is_file():
    # Fallback: try ~/arcade/mcp-server/
    MCP_SCRIPT = Path.home() / "arcade" / "mcp-server" / "magma-mcp.py"

spec = importlib.util.spec_from_file_location("magma_mcp", MCP_SCRIPT)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

# Reconfigure paths to point to the Pi's repo clone
NEW_ROOT = Path.cwd()
if PI_REPO.is_dir():
    mod.PROJECT_ROOT = NEW_ROOT
    mod.CACHE_DIR = NEW_ROOT / "archive" / "_cache"
    mod.SCORES_DIR = NEW_ROOT / "arcade" / "admin" / "scores"
    mod.ARCHIVE_DIR = NEW_ROOT / "archive"
    mod.ARCADE_DIR = NEW_ROOT / "arcade"

mcp = mod.mcp

# ── Config ──────────────────────────────────────────────────────────────────

MCP_API_KEY = os.environ.get("MCP_API_KEY", "")
PORT = int(os.environ.get("MCP_PORT", "8785"))

# ── Main ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"MagmaCrunch MCP Server — port {PORT}")
    print(f"Repository: {NEW_ROOT}")
    print(f"Cache: {NEW_ROOT / 'archive' / '_cache'}")
    if MCP_API_KEY:
        print(f"Auth: enabled (MCP_API_KEY set)")
    else:
        print(f"Auth: DISABLED (MCP_API_KEY not set — only use for testing!)")
    print()

    mcp.run(
        transport="streamable-http",
        host="127.0.0.1",
        port=PORT,
        streamable_http_path="/mcp",
        stateless_http=True,
    )
