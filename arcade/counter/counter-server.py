"""
counter-server.py — Retro hit counter for magmacrunch.com
Run with:  python counter-server.py [--port PORT]
Requires:  pip install websockets

Provides:
  - WebSocket endpoint for getting and incrementing total page load count
  - Persists count to count.json on disk
  - Used by the counter-client.js widget on the guestbook page
"""

import argparse
import asyncio
import json
import os
import websockets
from websockets.datastructures import Headers

COUNT_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'count.json')


def load_count():
    try:
        with open(COUNT_FILE, 'r') as f:
            return json.load(f).get('count', 0)
    except (FileNotFoundError, json.JSONDecodeError):
        return 0


def save_count(count):
    with open(COUNT_FILE, 'w') as f:
        json.dump({'count': count}, f)


async def handler(websocket):
    count = load_count()

    try:
        async for message in websocket:
            try:
                data = json.loads(message)
            except json.JSONDecodeError:
                continue

            action = data.get('action')

            if action == 'get_count':
                await websocket.send(json.dumps({
                    'type': 'count',
                    'count': count
                }))

            elif action == 'increment':
                count += 1
                save_count(count)
                await websocket.send(json.dumps({
                    'type': 'count',
                    'count': count
                }))

    except websockets.ConnectionClosed:
        pass


async def main(port):
    async def _health_check(connection, request):
        from websockets.http11 import Response
        if request.headers.get("Upgrade", "").lower() == "websocket":
            return None
        return Response(426, "Upgrade Required", Headers([("Upgrade", "websocket")]), b"")

    async with websockets.serve(handler, '0.0.0.0', port, process_request=_health_check):
        print(f"[Counter] Hit counter ready on ws://localhost:{port}")
        await asyncio.Future()  # Run forever


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Magmacrunch Hit Counter Server')
    parser.add_argument('--port', type=int, default=8783, help='Port to listen on')
    args = parser.parse_args()
    try:
        asyncio.run(main(args.port))
    except KeyboardInterrupt:
        print("\n[Counter] Server stopped.")
