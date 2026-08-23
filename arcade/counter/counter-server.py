"""
counter-server.py — Retro hit counter for magmacrunch.com
Run with:  python counter-server.py [--port PORT]
Requires:  pip install -r arcade/requirements.txt

Provides:
  - WebSocket endpoint for getting and incrementing total page load count
  - Persists count to count.json on disk
  - Used by assets/counter-client.js, which nav.js loads on every page

Shares its handshake gate and rate limiting with the arcade's other servers —
see arcade/shared/multiplayer/server_base.py. Deploy the two together.
"""

import argparse
import asyncio
import json
import os
import sys

import websockets

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shared', 'multiplayer'))
from server_base import (  # noqa: E402
    client_ip,
    ip_limiter,
    limiter_janitor,
    make_reject_request,
)

COUNT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'count.json')

# Seconds between disk flushes. The count used to be written on every increment,
# which is one SD-card write per visitor once this is actually reachable.
FLUSH_INTERVAL = 30

# ── State ────────────────────────────────────────────────────────────────────

# One count for the process, not one per connection. Each handler used to read
# its own local copy at connect time, so two visitors overlapping would both read
# N and both write N+1 — an undercount that has never fired only because nothing
# has ever reached this server (see the nginx /counter route).
count = 0
_dirty = False


def load_count():
    try:
        with open(COUNT_FILE, 'r') as f:
            return json.load(f).get('count', 0)
    except (FileNotFoundError, json.JSONDecodeError):
        return 0


def save_count(value=None):
    global _dirty
    with open(COUNT_FILE, 'w') as f:
        json.dump({'count': count if value is None else value}, f)
    _dirty = False


async def flusher(interval=FLUSH_INTERVAL):
    """Write the count out periodically, and only when it has moved."""
    while True:
        await asyncio.sleep(interval)
        if _dirty:
            save_count()


# ── Handler ──────────────────────────────────────────────────────────────────

async def handler(websocket):
    global count, _dirty

    # make_reject_request has already turned away bad origins and floods; ip is
    # what the per-action caps below are keyed on, so that dropping the socket and
    # redialling no longer resets the budget.
    ip = client_ip(websocket)

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                continue

            action = data.get('action')

            if action == 'get_count':
                if not ip_limiter.check((ip, 'counter_get'), 10, 10):
                    continue
                await websocket.send(json.dumps({
                    'type': 'count',
                    'count': count
                }))

            elif action == 'increment':
                if not ip_limiter.check((ip, 'counter_increment'), 3, 10):
                    continue
                count += 1
                _dirty = True
                await websocket.send(json.dumps({
                    'type': 'count',
                    'count': count
                }))

    except websockets.ConnectionClosed:
        pass


# ── Main ─────────────────────────────────────────────────────────────────────

async def main(port):
    global count
    count = load_count()
    print(f"[Counter] Loaded count: {count}")

    asyncio.create_task(flusher())
    asyncio.create_task(limiter_janitor())

    # Shared with the game and chat servers: 426 for plain HTTP (the health bot
    # and nginx both need the port to answer), 403 for a cross-origin browser,
    # 429 for a connection flood.
    gate = make_reject_request()

    async with websockets.serve(handler, '0.0.0.0', port, process_request=gate):
        print(f"[Counter] Hit counter ready on ws://localhost:{port}")
        await asyncio.Future()  # Run forever


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Magmacrunch Hit Counter Server')
    parser.add_argument('--port', type=int, default=8783, help='Port to listen on')
    args = parser.parse_args()
    try:
        asyncio.run(main(args.port))
    except KeyboardInterrupt:
        if _dirty:
            save_count()
        print("\n[Counter] Server stopped.")
