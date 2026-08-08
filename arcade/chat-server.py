"""
chat-server.py — Global arcade chat + room sub-chats + server status
Run with:  python chat-server.py [--port PORT]
Requires:  pip install websockets

Provides:
  - Global chat room for arcade visitors
  - Room sub-chats for multiplayer games (open to anyone with room code)
  - Per-room user lists + global user list with online presence
  - Typing indicators (global and room)
  - Auto-generated unique names for anonymous users
  - Name persistence and uniqueness checking
  - Server status pings (checks if game servers are responding)
  - In-memory message history (last 100 global, 50 per room)
"""

import argparse
import asyncio
import json
import logging
import random
import time
import websockets
from websockets.datastructures import Headers

logging.getLogger("websockets").setLevel(logging.INFO)


# ── Rate Limiter ──────────────────────────────────────────────────────────────

class RateLimiter:
    """Per-connection sliding window rate limiter."""

    def __init__(self):
        self._windows = {}  # key -> (window_start, count)

    def check(self, key, max_count, window_sec):
        now = time.monotonic()
        window_start, count = self._windows.get(key, (now, 0))
        if now - window_start > window_sec:
            self._windows[key] = (now, 1)
            return True
        if count >= max_count:
            return False
        self._windows[key] = (window_start, count + 1)
        return True


# ── Configuration ────────────────────────────────────────────────────────────

MAX_GLOBAL_MESSAGES = 100
MAX_ROOM_MESSAGES = 50
SESSION_TIMEOUT = 30  # seconds to remember a disconnected user's session

# Game servers to check status for
GAME_SERVERS = {
    'SORRY':             {'host': 'localhost', 'port': 8765},
    'Cribbage':          {'host': 'localhost', 'port': 8766},
    'Scandinavian Stud': {'host': 'localhost', 'port': 8767},
    'Checkers':          {'host': 'localhost', 'port': 8770},
    'Backgammon':        {'host': 'localhost', 'port': 8771},
    'Chinese Checkers':  {'host': 'localhost', 'port': 8772},
    'Parchisi':          {'host': 'localhost', 'port': 8773},
}

# ── State ────────────────────────────────────────────────────────────────────

connected_clients = set()       # all WebSocket connections
messages = []                   # global chat history (last MAX_GLOBAL_MESSAGES)
user_info = {}                  # websocket -> { name, color, rooms: set() }
rooms = {}                      # room_code -> set(websocket)
room_messages = {}              # room_code -> [messages] (last MAX_ROOM_MESSAGES)
typing_debounce = {}            # websocket -> last typing send time
recently_disconnected = {}      # session_token -> { name, color, rooms, timestamp }

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


def generate_name():
    """Generate a unique auto-name like Player42."""
    return f"Player{random.randint(10, 99)}"


def get_unique_name(desired):
    """Check if name is taken, append random number if so."""
    if not desired:
        return generate_name()
    taken = any(
        info['name'] == desired and ws != None
        for ws, info in user_info.items()
    )
    if taken:
        return f"{desired}{random.randint(1, 99)}"
    return desired


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
    """Send JSON message to all connected clients (global)."""
    data = json.dumps(msg)
    for ws in list(connected_clients):
        if ws != exclude:
            try:
                await ws.send(data)
            except websockets.ConnectionClosed:
                pass


async def broadcast_to_room(room_code, msg, exclude=None):
    """Send to all clients in a specific room."""
    data = json.dumps(msg)
    for ws in list(rooms.get(room_code, set())):
        if ws != exclude:
            try:
                await ws.send(data)
            except websockets.ConnectionClosed:
                pass


async def broadcast_room_users(room_code):
    """Send updated user list to all room members."""
    users = []
    for ws in rooms.get(room_code, set()):
        info = user_info.get(ws, {})
        users.append({
            'name': info.get('name', '?'),
            'color': info.get('color', '#fff')
        })
    await broadcast_to_room(room_code, {
        'type': 'room_users',
        'room': room_code,
        'users': users,
        'count': len(users)
    })


async def broadcast_user_list():
    """Send the full online user list to all connected clients."""
    users = []
    for ws in connected_clients:
        if ws not in user_info:
            continue  # Skip clients that haven't set their name yet
        info = user_info[ws]
        user_rooms = list(info.get('rooms', set()))
        game = None
        if user_rooms:
            for room_code in user_rooms:
                if room_code in rooms:
                    game = 'In Game'
                    break
        users.append({
            'name': info.get('name', '?'),
            'color': info.get('color', '#fff'),
            'rooms': user_rooms,
            'game': game,
        })
    await broadcast({
        'type': 'user_list',
        'users': users,
        'count': len(users)
    })


async def broadcast_global_users():
    """Send total connected user count to all."""
    await broadcast({
        'type': 'global_users',
        'count': len(connected_clients)
    })


# ── Handler ──────────────────────────────────────────────────────────────────

async def handler(websocket):
    """Handle a new chat connection."""
    connected_clients.add(websocket)
    limiter = RateLimiter()

    try:
        # Send global history
        await websocket.send(json.dumps({
            'type': 'history',
            'messages': messages[-MAX_GLOBAL_MESSAGES:]
        }))

        # Send current server statuses
        statuses = await get_all_statuses()
        await websocket.send(json.dumps({
            'type': 'status',
            'statuses': statuses
        }))

        # Main message loop
        async for raw in websocket:
            # Global flood protection: 20 msgs/sec per connection
            if not limiter.check("global", 20, 1):
                continue

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get('type')

            if msg_type == 'set_name':
                if not limiter.check("set_name", 2, 10):
                    continue
                new_name = msg.get('name', '')[:20]
                if not new_name:
                    new_name = generate_name()
                session_token = msg.get('session_token')

                # Check if this session was recently disconnected — restore state
                if session_token and session_token in recently_disconnected:
                    restored = recently_disconnected.pop(session_token)
                    restored_name = restored['name']
                    restored_color = restored['color']
                    # Check if the restored name is taken by someone else
                    taken = any(
                        info['name'] == restored_name and ws != websocket
                        for ws, info in user_info.items()
                    )
                    if taken:
                        restored_name = f"{restored_name}{random.randint(1, 99)}"
                    user_info[websocket] = {
                        'name': restored_name,
                        'color': restored_color,
                        'rooms': set(),
                        'session_token': session_token
                    }
                    await websocket.send(json.dumps({
                        'type': 'name_assigned',
                        'name': restored_name
                    }))
                    await broadcast_user_list()
                elif websocket not in user_info:
                    # First time user — create entry now
                    # Check if name is taken by someone else
                    taken = any(
                        info['name'] == new_name and ws != websocket
                        for ws, info in user_info.items()
                    )
                    if taken:
                        new_name = f"{new_name}{random.randint(1, 99)}"
                    user_info[websocket] = {
                        'name': new_name,
                        'color': get_next_color(),
                        'rooms': set(),
                        'session_token': session_token or None
                    }
                    await websocket.send(json.dumps({
                        'type': 'name_assigned',
                        'name': new_name
                    }))
                    await broadcast_user_list()
                else:
                    # Existing user updating name
                    taken = any(
                        info['name'] == new_name and ws != websocket
                        for ws, info in user_info.items()
                    )
                    if taken:
                        new_name = f"{new_name}{random.randint(1, 99)}"
                    user_info[websocket]['name'] = new_name
                    if session_token:
                        user_info[websocket]['session_token'] = session_token
                    await websocket.send(json.dumps({
                        'type': 'name_assigned',
                        'name': new_name
                    }))
                    await broadcast_user_list()

            elif msg_type == 'set_color':
                if not limiter.check("set_color", 2, 10):
                    continue
                if websocket not in user_info:
                    continue
                new_color = msg.get('color', '#fff')
                if new_color.startswith('#') and len(new_color) == 7:
                    user_info[websocket]['color'] = new_color
                    await broadcast_user_list()

            elif msg_type == 'join_room':
                if websocket not in user_info:
                    continue
                room = msg.get('room', '').upper()
                if not room:
                    continue
                if room not in rooms:
                    rooms[room] = set()
                rooms[room].add(websocket)
                user_info[websocket]['rooms'].add(room)

                await websocket.send(json.dumps({
                    'type': 'room_history',
                    'room': room,
                    'messages': room_messages.get(room, [])[-MAX_ROOM_MESSAGES:]
                }))

                await broadcast_room_users(room)
                await broadcast_user_list()

            elif msg_type == 'leave_room':
                if websocket not in user_info:
                    continue
                room = msg.get('room', '').upper()
                if room in rooms:
                    rooms[room].discard(websocket)
                    if not rooms[room]:
                        del rooms[room]
                if room in user_info.get(websocket, {}).get('rooms', set()):
                    user_info[websocket]['rooms'].discard(room)
                if room and room in rooms:
                    await broadcast_room_users(room)
                await broadcast_user_list()

            elif msg_type == 'chat':
                if not limiter.check("chat", 5, 10):
                    continue
                if websocket not in user_info:
                    continue
                room = msg.get('room')
                text = msg.get('text', '')[:200]
                name = user_info[websocket]['name']
                color = user_info[websocket]['color']

                chat_msg = {
                    'type': 'room_chat' if room else 'chat',
                    'from': name,
                    'text': text,
                    'color': color,
                    'room': room,
                    'timestamp': time.time()
                }

                if room:
                    if room not in room_messages:
                        room_messages[room] = []
                    room_messages[room].append(chat_msg)
                    if len(room_messages[room]) > MAX_ROOM_MESSAGES:
                        room_messages[room].pop(0)
                    await broadcast_to_room(room, chat_msg, exclude=websocket)
                else:
                    messages.append(chat_msg)
                    if len(messages) > MAX_GLOBAL_MESSAGES:
                        messages.pop(0)
                    await broadcast(chat_msg, exclude=websocket)

            elif msg_type == 'typing':
                if websocket not in user_info:
                    continue
                room = msg.get('room')
                now = time.time()
                last = typing_debounce.get(websocket, 0)
                if now - last < 2:
                    continue
                typing_debounce[websocket] = now

                typing_msg = {
                    'type': 'typing',
                    'from': user_info[websocket]['name'],
                    'room': room
                }
                if room:
                    await broadcast_to_room(room, typing_msg, exclude=websocket)
                else:
                    await broadcast(typing_msg, exclude=websocket)

            elif msg_type == 'status':
                # Rate limit: 1 request per 10 seconds (matches status_broadcaster interval)
                if not limiter.check("status", 1, 10):
                    continue
                # Status request
                statuses = await get_all_statuses()
                await websocket.send(json.dumps({
                    'type': 'status',
                    'statuses': statuses
                }))

            elif msg_type == 'get_history':
                # Request full chat history (for admin dashboard)
                await websocket.send(json.dumps({
                    'type': 'history',
                    'messages': messages[-MAX_GLOBAL_MESSAGES:]
                }))
                # Also send room list with messages
                room_hist = {}
                for room_code, msgs in room_messages.items():
                    room_hist[room_code] = msgs[-MAX_ROOM_MESSAGES:]
                await websocket.send(json.dumps({
                    'type': 'room_histories',
                    'rooms': room_hist
                }))

    except websockets.ConnectionClosed:
        pass
    finally:
        # Store session for potential reconnection
        info = user_info.get(websocket, {})
        session_token = info.get('session_token')
        if session_token:
            recently_disconnected[session_token] = {
                'name': info.get('name', ''),
                'color': info.get('color', '#fff'),
                'rooms': list(info.get('rooms', set())),
                'timestamp': time.time()
            }
        # Cleanup: leave all rooms, remove from global
        for room in list(info.get('rooms', set())):
            if room in rooms:
                rooms[room].discard(websocket)
                if not rooms[room]:
                    del rooms[room]
                await broadcast_room_users(room)
        connected_clients.discard(websocket)
        user_info.pop(websocket, None)
        typing_debounce.pop(websocket, None)
        await broadcast_user_list()


# ── Status Broadcast Loop ───────────────────────────────────────────────────

async def status_broadcaster():
    """Periodically broadcast server status to all clients."""
    while True:
        await asyncio.sleep(10)  # Check every 10 seconds
        if connected_clients:
            statuses = await get_all_statuses()
            await broadcast({'type': 'status', 'statuses': statuses})


# ── Session Cleanup ─────────────────────────────────────────────────────────

async def session_cleanup():
    """Periodically purge expired session tokens."""
    while True:
        await asyncio.sleep(10)
        now = time.time()
        expired = [
            token for token, info in recently_disconnected.items()
            if now - info['timestamp'] > SESSION_TIMEOUT
        ]
        for token in expired:
            del recently_disconnected[token]


# ── Main ────────────────────────────────────────────────────────────────────

async def main(port):
    print(f"[Chat] Starting chat server on port {port}")
    print(f"[Chat] Checking game servers: {', '.join(GAME_SERVERS.keys())}")

    # Start background tasks
    asyncio.create_task(status_broadcaster())
    asyncio.create_task(session_cleanup())

    # Start WebSocket server
    async def _health_check(connection, request):
        from websockets.http11 import Response
        if request.headers.get("Upgrade", "").lower() == "websocket":
            return None
        return Response(426, "Upgrade Required", Headers([("Upgrade", "websocket")]), b"")

    async with websockets.serve(handler, '0.0.0.0', port, process_request=_health_check):
        print(f"[Chat] Chat server ready on ws://localhost:{port}")
        await asyncio.Future()  # Run forever


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Magmacrunch Arcade Chat Server')
    parser.add_argument('--port', type=int, default=8768, help='Port to listen on')
    args = parser.parse_args()
    try:
        asyncio.run(main(args.port))
    except KeyboardInterrupt:
        print("\n[Chat] Server stopped.")
