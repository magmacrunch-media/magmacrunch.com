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

logging.getLogger("websockets").setLevel(logging.WARNING)

# ── Configuration ────────────────────────────────────────────────────────────

MAX_GLOBAL_MESSAGES = 100
MAX_ROOM_MESSAGES = 50

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
        info = user_info.get(ws, {})
        user_rooms = list(info.get('rooms', set()))
        # Try to determine game name from room code
        game = None
        if user_rooms:
            # Map room codes to game names if available
            for room_code in user_rooms:
                if room_code in rooms:
                    # Room exists, but we don't store game names yet
                    # Just indicate they're in a game
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
    user_color = get_next_color()
    user_info[websocket] = {
        'name': 'Anonymous',
        'color': user_color,
        'rooms': set()
    }

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

        # Auto-generate a name and send it back
        auto_name = generate_name()
        user_info[websocket]['name'] = auto_name
        await websocket.send(json.dumps({
            'type': 'name_assigned',
            'name': auto_name
        }))

        # Broadcast updated user list to everyone
        await broadcast_user_list()

        # Main message loop
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get('type')

            if msg_type == 'set_name':
                # Set/update display name with uniqueness check
                new_name = msg.get('name', '')[:20]
                if not new_name:
                    new_name = generate_name()
                # Check if name is taken by someone else
                taken = any(
                    info['name'] == new_name and ws != websocket
                    for ws, info in user_info.items()
                )
                if taken:
                    new_name = f"{new_name}{random.randint(1, 99)}"
                user_info[websocket]['name'] = new_name
                # Send confirmed name back to client
                await websocket.send(json.dumps({
                    'type': 'name_assigned',
                    'name': new_name
                }))
                await broadcast_user_list()

            elif msg_type == 'set_color':
                # Set/update display color
                new_color = msg.get('color', '#fff')
                if new_color.startswith('#') and len(new_color) == 7:
                    user_info[websocket]['color'] = new_color
                    await broadcast_user_list()

            elif msg_type == 'join_room':
                # Join a room sub-chat
                room = msg.get('room', '').upper()
                if not room:
                    continue
                if room not in rooms:
                    rooms[room] = set()
                rooms[room].add(websocket)
                user_info[websocket]['rooms'].add(room)

                # Send room history
                await websocket.send(json.dumps({
                    'type': 'room_history',
                    'room': room,
                    'messages': room_messages.get(room, [])[-MAX_ROOM_MESSAGES:]
                }))

                # Broadcast updated user list to room
                await broadcast_room_users(room)
                # Broadcast updated user list to everyone (room status changed)
                await broadcast_user_list()

            elif msg_type == 'leave_room':
                # Leave a room sub-chat
                room = msg.get('room', '').upper()
                if room in rooms:
                    rooms[room].discard(websocket)
                    if not rooms[room]:
                        del rooms[room]
                if room in user_info.get(websocket, {}).get('rooms', set()):
                    user_info[websocket]['rooms'].discard(room)
                if room and room in rooms:
                    await broadcast_room_users(room)
                # Broadcast updated user list to everyone
                await broadcast_user_list()

            elif msg_type == 'chat':
                # Chat message (global or room)
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
                    # Room message
                    if room not in room_messages:
                        room_messages[room] = []
                    room_messages[room].append(chat_msg)
                    if len(room_messages[room]) > MAX_ROOM_MESSAGES:
                        room_messages[room].pop(0)
                    await broadcast_to_room(room, chat_msg, exclude=websocket)
                else:
                    # Global message
                    messages.append(chat_msg)
                    if len(messages) > MAX_GLOBAL_MESSAGES:
                        messages.pop(0)
                    await broadcast(chat_msg, exclude=websocket)

            elif msg_type == 'typing':
                # Typing indicator
                room = msg.get('room')
                now = time.time()
                last = typing_debounce.get(websocket, 0)
                if now - last < 2:  # Debounce: max once per 2 seconds
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
                # Status request
                statuses = await get_all_statuses()
                await websocket.send(json.dumps({
                    'type': 'status',
                    'statuses': statuses
                }))

    except websockets.ConnectionClosed:
        pass
    finally:
        # Cleanup: leave all rooms, remove from global
        for room in list(user_info.get(websocket, {}).get('rooms', set())):
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


# ── Main ────────────────────────────────────────────────────────────────────

async def main(port):
    print(f"[Chat] Starting chat server on port {port}")
    print(f"[Chat] Checking game servers: {', '.join(GAME_SERVERS.keys())}")

    # Start status broadcaster
    asyncio.create_task(status_broadcaster())

    # Start WebSocket server
    async def _health_check(connection, request):
        from websockets.http11 import Response
        return Response(426, "Upgrade Required", {"Upgrade": "websocket"}, b"")

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
