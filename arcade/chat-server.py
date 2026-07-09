"""
chat-server.py — Global arcade chat + server status
Run with:  python chat-server.py
Requires:  pip install websockets

Provides:
  - Global chat room for arcade visitors
  - Server status pings (checks if game servers are responding)
  - In-memory message history (last 100 messages)
"""

import asyncio
import json
import time
import websockets

# ── Configuration ────────────────────────────────────────────────────────────

CHAT_PORT = 8768
MAX_MESSAGES = 100

# Game servers to check status for
GAME_SERVERS = {
    'SORRY':            {'host': 'localhost', 'port': 8765},
    'Cribbage':         {'host': 'localhost', 'port': 8766},
    'Scandinavian Stud': {'host': 'localhost', 'port': 8767},
}

# ── State ────────────────────────────────────────────────────────────────────

connected_clients = set()
messages = []  # Chat history (last MAX_MESSAGES)
user_colors = {}  # websocket -> color

# Color palette for chat users
PALETTE = [
    '#ff2d55', '#ff7c1e', '#ffe135', '#39d353',
    '#6cd4f5', '#4059c8', '#9b30ff', '#ff69b4',
    '#00fa9a', '#ff4f6d', '#7b68ee', '#ffd700',
]

color_index = 0


def get_next_color():
    global color_index
    color = PALETTE[color_index % len(PALETTE)]
    color_index += 1
    return color


# ── Server Status Check ─────────────────────────────────────────────────────

async def check_server_status(host, port, timeout=1):
    """Try to connect to a game server and report if it's online."""
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port),
            timeout=timeout
        )
        writer.close()
        await writer.wait_closed()
        return True
    except (asyncio.TimeoutError, ConnectionRefusedError, OSError):
        return False


async def get_all_statuses():
    """Check status of all game servers."""
    statuses = {}
    for name, config in GAME_SERVERS.items():
        online = await check_server_status(config['host'], config['port'])
        statuses[name] = online
    return statuses


# ── Broadcast ────────────────────────────────────────────────────────────────

async def broadcast(msg, exclude=None):
    """Send JSON message to all connected clients."""
    data = json.dumps(msg)
    targets = [ws for ws in connected_clients if ws != exclude]
    for ws in targets:
        try:
            await ws.send(data)
        except websockets.ConnectionClosed:
            pass


# ── Handler ──────────────────────────────────────────────────────────────────

async def handler(websocket):
    """Handle a new chat connection."""
    connected_clients.add(websocket)
    user_color = get_next_color()
    user_colors[websocket] = user_color

    try:
        # Send chat history
        await websocket.send(json.dumps({
            'type': 'history',
            'messages': messages[-MAX_MESSAGES:]
        }))

        # Send current server statuses
        statuses = await get_all_statuses()
        await websocket.send(json.dumps({
            'type': 'status',
            'statuses': statuses
        }))

        # Main message loop
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get('type')

            if msg_type == 'chat':
                # Chat message
                chat_msg = {
                    'type': 'chat',
                    'from': msg.get('name', 'Anonymous')[:20],
                    'text': msg.get('text', '')[:200],
                    'color': user_color,
                    'timestamp': time.time()
                }
                messages.append(chat_msg)
                if len(messages) > MAX_MESSAGES:
                    messages.pop(0)
                await broadcast(chat_msg)

            elif msg_type == 'status':
                # Status request
                statuses = await get_all_statuses()
                await websocket.send(json.dumps({
                    'type': 'status',
                    'statuses': statuses
                }))

    except websockets.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        user_colors.pop(websocket, None)


# ── Status Broadcast Loop ───────────────────────────────────────────────────

async def status_broadcaster():
    """Periodically broadcast server status to all clients."""
    while True:
        await asyncio.sleep(10)  # Check every 10 seconds
        if connected_clients:
            statuses = await get_all_statuses()
            await broadcast({'type': 'status', 'statuses': statuses})


# ── Main ────────────────────────────────────────────────────────────────────

async def main():
    print(f"[Chat] Starting chat server on port {CHAT_PORT}")
    print(f"[Chat] Checking game servers: {', '.join(GAME_SERVERS.keys())}")

    # Start status broadcaster
    asyncio.create_task(status_broadcaster())

    # Start WebSocket server
    async with websockets.serve(handler, '0.0.0.0', CHAT_PORT):
        print(f"[Chat] Chat server ready on ws://localhost:{CHAT_PORT}")
        await asyncio.Future()  # Run forever


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[Chat] Server stopped.")
