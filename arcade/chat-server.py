"""
chat-server.py — Global arcade chat + room sub-chats + server status
Run with:  python chat-server.py [--port PORT]
Requires:  pip install -r arcade/requirements.txt

Provides:
  - Global chat room for arcade visitors
  - Room sub-chats for multiplayer games (open to anyone with room code)
  - Per-room user lists + global user list with online presence
  - Typing indicators (global and room)
  - Auto-generated unique names for anonymous users
  - Name persistence and uniqueness checking
  - Server status pings (checks if game servers are responding)
  - In-memory message history (last 100 global, 50 per room)

Rate limiting, origin checking and client identification are shared with the
multiplayer game servers — see arcade/shared/multiplayer/server_base.py. This
server must be deployed together with that file.
"""

import argparse
import asyncio
import json
import logging
import os
import random
import re
import sys
import time
import websockets

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shared', 'multiplayer'))
from server_base import (  # noqa: E402
    client_ip,
    ip_limiter,
    limiter_janitor,
    make_reject_request,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s", datefmt="%H:%M:%S")
logging.getLogger("websockets").setLevel(logging.INFO)
logger = logging.getLogger("chat")


# ── Configuration ────────────────────────────────────────────────────────────

MAX_GLOBAL_MESSAGES = 100
MAX_ROOM_MESSAGES = 50
SESSION_TIMEOUT = 30  # seconds to remember a disconnected user's session
STATUS_INTERVAL = 10  # seconds between game-server status sweeps
SEND_TIMEOUT = 5      # seconds to wait on one client before giving up on it

# New sockets per client address per minute. Higher than the game servers' 10:
# the widget normally holds one SharedWorker-backed socket across the whole
# arcade, but browsers without SharedWorker support fall back to a socket per
# page, so a visitor clicking through games would otherwise lock themselves out.
MAX_CONNECTIONS_PER_MINUTE = 30

# Room codes come from server_base._generate_code (4 chars of A-Z0-9). Anything
# else is a client inventing its own, and every distinct code it invents costs a
# permanent entry in `rooms` and `room_messages`.
ROOM_CODE_RE = re.compile(r'^[A-Z0-9]{4,8}$')
MAX_ROOMS = 200

# Shared secret for `get_history`. Unset means the history dump is refused —
# fail closed, because that request returns every game room's private sub-chat.
# Set it for both arcade-chat and arcade-admin (see arcade/systemd/).
ADMIN_TOKEN = os.environ.get('ARCADE_ADMIN_TOKEN', '')

# Game servers to check status for — read from the shared manifest so this list
# cannot drift from start-all.sh, the health bot, and the nginx conf again. It
# had: Chess and Aggravation were running and proxied, and the status panel here
# had never heard of either.
SERVICES_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), 'shared', 'services.json'
)


def load_game_servers(path=SERVICES_PATH):
    """{display name: {host, port}} for every entry of kind 'game'."""
    with open(path, encoding='utf-8') as fh:
        manifest = json.load(fh)
    return {
        svc['name']: {'host': 'localhost', 'port': svc['port']}
        for svc in manifest['services']
        if svc.get('kind') == 'game'
    }


GAME_SERVERS = load_game_servers()

# ── State ────────────────────────────────────────────────────────────────────

connected_clients = set()       # all WebSocket connections
messages = []                   # global chat history (last MAX_GLOBAL_MESSAGES)
user_info = {}                  # websocket -> { name, color, rooms: set() }
rooms = {}                      # room_code -> set(websocket)
room_messages = {}              # room_code -> [messages] (last MAX_ROOM_MESSAGES)
typing_debounce = {}            # websocket -> last typing send time
recently_disconnected = {}      # session_token -> { name, color, rooms, timestamp }
server_statuses = {}            # display name -> bool, refreshed by status_broadcaster

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


def get_unique_name(desired, exclude_ws=None):
    """
    Return `desired`, or `desired` plus a random number if someone else has it.

    `exclude_ws` is the connection asking, so renaming yourself to the name you
    already hold is not treated as a collision. The old version compared against
    `ws != None`, which is true for every entry, so it never excluded anybody.
    """
    if not desired:
        desired = generate_name()
    taken = any(
        info['name'] == desired
        for ws, info in user_info.items()
        if ws is not exclude_ws
    )
    if taken:
        return f"{desired}{random.randint(1, 99)}"
    return desired


def drop_room(room_code):
    """Forget an empty room, history included."""
    rooms.pop(room_code, None)
    # room_messages used to be left behind here, so every room code the arcade
    # ever handed out kept its transcript in memory until the next restart.
    room_messages.pop(room_code, None)


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


async def refresh_statuses():
    """
    Probe every game server at once and update the cache.

    The probes used to run one after another — up to one second of timeout each,
    so a sweep of a fully offline arcade took as long as there are games, and it
    ran again for every new connection.
    """
    names = list(GAME_SERVERS)
    results = await asyncio.gather(*(
        check_server_status(**GAME_SERVERS[name]) for name in names
    ))
    server_statuses.clear()
    server_statuses.update(zip(names, results))
    return server_statuses


def status_message():
    return {'type': 'status', 'statuses': dict(server_statuses)}


# ── Broadcast ────────────────────────────────────────────────────────────────

async def _send_one(ws, data):
    """Send to a single client, giving up rather than holding up the fan-out."""
    try:
        await asyncio.wait_for(ws.send(data), timeout=SEND_TIMEOUT)
    except (websockets.ConnectionClosed, asyncio.TimeoutError, OSError):
        pass


async def _fan_out(targets, msg, exclude=None):
    """
    Deliver to every target concurrently.

    Sequential awaits meant one client with a full send buffer delayed every
    client queued behind it, for the whole arcade on a global message.
    """
    data = json.dumps(msg)
    await asyncio.gather(*(
        _send_one(ws, data) for ws in list(targets) if ws is not exclude
    ))


async def broadcast(msg, exclude=None):
    """Send JSON message to all connected clients (global)."""
    await _fan_out(connected_clients, msg, exclude)


async def broadcast_to_room(room_code, msg, exclude=None):
    """Send to all clients in a specific room."""
    await _fan_out(rooms.get(room_code, set()), msg, exclude)


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


# ── Room membership ─────────────────────────────────────────────────────────

def join_room_state(websocket, room):
    """Add a connection to a room. False if the room code is not acceptable."""
    if not ROOM_CODE_RE.match(room):
        return False
    if room not in rooms and len(rooms) >= MAX_ROOMS:
        logger.warning("Room limit reached (%d); refused %s", MAX_ROOMS, room)
        return False
    rooms.setdefault(room, set()).add(websocket)
    user_info[websocket]['rooms'].add(room)
    return True


# ── Handler ──────────────────────────────────────────────────────────────────

async def handler(websocket):
    """Handle a new chat connection."""
    # reject_request has already turned away bad origins and flooding addresses;
    # ip is what the per-action limits below are keyed on, so that dropping the
    # socket and redialling no longer resets anybody's budget.
    ip = client_ip(websocket)
    connected_clients.add(websocket)
    logger.info("Connect: %s", ip)

    try:
        # Send global history
        await websocket.send(json.dumps({
            'type': 'history',
            'messages': messages[-MAX_GLOBAL_MESSAGES:]
        }))

        # Send current server statuses (cached; refreshed by status_broadcaster)
        await websocket.send(json.dumps(status_message()))

        # Main message loop
        async for raw in websocket:
            # Global flood protection: 20 msgs/sec per IP
            if not ip_limiter.check((ip, "chat_global"), 20, 1):
                logger.warning("Rate limited: global from %s", ip)
                continue

            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get('type')

            if msg_type == 'set_name':
                # Deliberately looser than the old per-connection 2-per-10s:
                # the widget sends set_name on every socket open, and a browser
                # without SharedWorker support opens one per page. At 2 the third
                # arcade page in ten seconds would be silently refused a name and
                # the visitor would never appear online at all.
                if not ip_limiter.check((ip, "set_name"), 10, 10):
                    logger.warning("Rate limited: set_name from %s", ip)
                    continue
                new_name = msg.get('name', '')[:20]
                session_token = msg.get('session_token')

                # Check if this session was recently disconnected — restore state
                if session_token and session_token in recently_disconnected:
                    restored = recently_disconnected.pop(session_token)
                    user_info[websocket] = {
                        'name': get_unique_name(restored['name'], websocket),
                        'color': restored['color'],
                        'rooms': set(),
                        'session_token': session_token
                    }
                    # Put them back in the rooms they were in. The saved room list
                    # was written on disconnect and then thrown away here, so a
                    # player whose socket blipped mid-game silently stopped
                    # receiving their game's sub-chat while the widget still
                    # believed it was in the room. No room_history is replayed:
                    # the widget never cleared the pane, so resending it would
                    # duplicate every message already on screen.
                    for room in restored.get('rooms', []):
                        if join_room_state(websocket, room):
                            await broadcast_room_users(room)
                    await websocket.send(json.dumps({
                        'type': 'name_assigned',
                        'name': user_info[websocket]['name']
                    }))
                    await broadcast_user_list()
                elif websocket not in user_info:
                    # First time user — create entry now
                    user_info[websocket] = {
                        'name': get_unique_name(new_name, websocket),
                        'color': get_next_color(),
                        'rooms': set(),
                        'session_token': session_token or None
                    }
                    await websocket.send(json.dumps({
                        'type': 'name_assigned',
                        'name': user_info[websocket]['name']
                    }))
                    await broadcast_user_list()
                else:
                    # Existing user updating name
                    user_info[websocket]['name'] = get_unique_name(new_name, websocket)
                    if session_token:
                        user_info[websocket]['session_token'] = session_token
                    await websocket.send(json.dumps({
                        'type': 'name_assigned',
                        'name': user_info[websocket]['name']
                    }))
                    await broadcast_user_list()

            elif msg_type == 'set_color':
                if not ip_limiter.check((ip, "set_color"), 10, 10):
                    logger.warning("Rate limited: set_color from %s", ip)
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
                if not join_room_state(websocket, room):
                    continue

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
                user_info[websocket]['rooms'].discard(room)
                if room in rooms:
                    rooms[room].discard(websocket)
                    if rooms[room]:
                        await broadcast_room_users(room)
                    else:
                        drop_room(room)
                await broadcast_user_list()

            elif msg_type == 'chat':
                if not ip_limiter.check((ip, "chat_say"), 5, 10):
                    logger.warning("Rate limited: chat from %s", ip)
                    continue
                if websocket not in user_info:
                    continue
                # Normalised the same way join_room does, so a client that
                # sends the code back in a different case still lands in the room
                # it actually joined.
                room = (msg.get('room') or '').upper() or None
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
                    # Posting to a room you are not in is not a thing the widget
                    # does, and allowing it let anyone with a room code write into
                    # a game's private sub-chat without ever appearing in it.
                    if room not in user_info[websocket]['rooms']:
                        continue
                    room_messages.setdefault(room, []).append(chat_msg)
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
                room = (msg.get('room') or '').upper() or None
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
                if not ip_limiter.check((ip, "status"), 1, 10):
                    logger.warning("Rate limited: status from %s", ip)
                    continue
                await websocket.send(json.dumps(status_message()))

            elif msg_type == 'get_history':
                # Full history dump for the admin dashboard (admin/server.py).
                # This returns every room's sub-chat, not just the global one, so
                # until it was gated any visitor could read every private game
                # room in the arcade by sending four words of JSON.
                #
                # Ignored rather than refused when the token is missing or wrong:
                # chat-worker.js still sends this on every socket open, and an
                # error frame there would surface as a broken widget.
                if not ADMIN_TOKEN or msg.get('token') != ADMIN_TOKEN:
                    continue
                await websocket.send(json.dumps({
                    'type': 'history',
                    'messages': messages[-MAX_GLOBAL_MESSAGES:]
                }))
                await websocket.send(json.dumps({
                    'type': 'room_histories',
                    'rooms': {
                        code: msgs[-MAX_ROOM_MESSAGES:]
                        for code, msgs in room_messages.items()
                    }
                }))

    except websockets.ConnectionClosed:
        pass
    finally:
        logger.info("Disconnect: %s", ip)
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
                if rooms[room]:
                    await broadcast_room_users(room)
                else:
                    drop_room(room)
        connected_clients.discard(websocket)
        user_info.pop(websocket, None)
        typing_debounce.pop(websocket, None)
        await broadcast_user_list()


# ── Status Broadcast Loop ───────────────────────────────────────────────────

async def status_broadcaster():
    """Refresh game-server status, and tell clients when it actually changes."""
    while True:
        await asyncio.sleep(STATUS_INTERVAL)
        previous = dict(server_statuses)
        await refresh_statuses()
        if connected_clients and server_statuses != previous:
            await broadcast(status_message())


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
    logger.info("[Chat] Starting chat server on port %d", port)
    logger.info("[Chat] Checking game servers: %s", ', '.join(GAME_SERVERS.keys()))
    if not ADMIN_TOKEN:
        logger.warning("[Chat] ARCADE_ADMIN_TOKEN unset — get_history will be refused")

    # Populate the cache before the first client can ask for it.
    await refresh_statuses()

    # Start background tasks
    asyncio.create_task(status_broadcaster())
    asyncio.create_task(session_cleanup())
    asyncio.create_task(limiter_janitor())

    # Start WebSocket server. The handshake gate is shared with the game servers:
    # 426 for plain HTTP, 403 for a cross-origin browser, 429 for a flood.
    gate = make_reject_request(max_connections=MAX_CONNECTIONS_PER_MINUTE)
    async with websockets.serve(handler, '0.0.0.0', port, process_request=gate):
        logger.info("[Chat] Chat server ready on ws://localhost:%d", port)
        await asyncio.Future()  # Run forever


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Magmacrunch Arcade Chat Server')
    parser.add_argument('--port', type=int, default=8768, help='Port to listen on')
    args = parser.parse_args()
    try:
        asyncio.run(main(args.port))
    except KeyboardInterrupt:
        logger.info("[Chat] Server stopped.")
