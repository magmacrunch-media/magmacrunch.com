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
STATUS_INTERVAL = 10  # seconds between game-server status sweeps
SEND_TIMEOUT = 5      # seconds to wait on one client before giving up on it

# How long a silent socket is given before it is declared dead. Stated rather
# than left to the library default so the relationship below is visible.
PING_INTERVAL = 20
PING_TIMEOUT = 20

# Seconds to remember a disconnected session so a returning socket can reclaim
# its name, color and rooms.
#
# Must comfortably exceed PING_INTERVAL + PING_TIMEOUT. A half-open socket is
# not reaped until the ping times out, and until then the session is still
# online and its timer has not started — so a window shorter than detection
# could expire before the disconnect it exists to cover was even noticed. This
# was 30, i.e. shorter than the 40s worst case.
SESSION_TIMEOUT = 90

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

# Identity is the session, not the socket. One person can hold several sockets
# at once — the widget falls back to a socket per page without SharedWorker, and
# the session token lives in localStorage, so every tab presents the same token —
# and a reconnect after a network blip arrives while the dead socket is still
# live server-side, because that is only reaped when the ping times out.
#
# Keying on the websocket made the roster count sockets instead of people: each
# of those paths produced a second entry, and since an unnamed client falls
# through to generate_name() the extras appeared as PlayerNN.
#
# A session with no sockets is a disconnected one, kept until SESSION_TIMEOUT
# passes so a returning socket can reclaim its name, color and rooms.
sessions = {}                   # token -> { name, color, rooms:set(), sockets:set(), last_seen }
socket_session = {}             # websocket -> token

rooms = {}                      # room_code -> set(websocket), the fan-out set
room_messages = {}              # room_code -> [messages] (last MAX_ROOM_MESSAGES)
typing_debounce = {}            # token -> last typing send time
server_statuses = {}            # display name -> bool, refreshed by status_broadcaster

_anon_counter = 0

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


def anon_token():
    """
    A private session id for a client that sent none.

    Never leaves the server: such a client cannot resume anyway, so this only
    exists so every socket has exactly one session to belong to. The real widget
    always sends a token (adenosine-chat.js keeps one in localStorage).
    """
    global _anon_counter
    _anon_counter += 1
    return f"\x00anon:{_anon_counter}"


def session_of(websocket):
    """The session this socket belongs to, or None before set_name."""
    token = socket_session.get(websocket)
    return sessions.get(token) if token else None


def get_unique_name(desired, exclude_token=None):
    """
    Return `desired`, or `desired` plus a random number if someone else has it.

    `exclude_token` is the session asking, so renaming yourself to the name you
    already hold is not treated as a collision — and neither is a second tab of
    your own session presenting the name you are already using. An earlier
    version compared against `ws != None`, which is true for every entry, so it
    never excluded anybody.

    Only sessions that still hold a socket count: a name should not stay
    reserved for the SESSION_TIMEOUT window after its owner has gone.
    """
    if not desired:
        desired = generate_name()
    taken = any(
        info['name'] == desired
        for token, info in sessions.items()
        if token != exclude_token and info['sockets']
    )
    if taken:
        return f"{desired}{random.randint(1, 99)}"
    return desired


def attach_socket(token, websocket):
    """
    Put a socket into a session, and into every room that session is in.

    `rooms` holds sockets because it is the fan-out set, so a session's rooms
    must gain the new socket or a second tab would never receive room traffic —
    and a reconnecting one would silently stop, which is the bug the room-restore
    path was written to fix in the first place.
    """
    previous = socket_session.get(websocket)
    if previous is not None and previous != token:
        # This socket already belonged to another session, and the old code left
        # it there: socket_session was overwritten, but the old session's
        # `sockets` set kept the socket forever. That set is the only thing
        # marking a session online, so the abandoned one never emptied, never
        # had `last_seen` stamped, was never swept by session_cleanup, and stayed
        # in the roster until the process restarted — an immortal phantom user.
        #
        # Reached by any socket that sends set_name twice under different tokens.
        # The widget does that when localStorage is unreadable on the first
        # connect and readable later: getSessionToken() returns null while
        # storage throws, so the server invents an anon token, and the next
        # set_name carries the real one.
        detach_socket(websocket)

    info = sessions[token]
    info['sockets'].add(websocket)
    socket_session[websocket] = token
    for room in info['rooms']:
        rooms.setdefault(room, set()).add(websocket)


def detach_socket(websocket):
    """Remove a socket from its session and from every room fan-out set."""
    token = socket_session.pop(websocket, None)
    info = sessions.get(token) if token else None
    if info is None:
        return None, None
    info['sockets'].discard(websocket)
    for room in info['rooms']:
        if room in rooms:
            rooms[room].discard(websocket)
    if not info['sockets']:
        info['last_seen'] = time.time()
    return token, info


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
    """
    Send updated member list to all room members — one entry per person.

    Deduplicated by session: `rooms` holds every socket of every member, so a
    member with two tabs open appears in it twice.
    """
    seen = {}
    for ws in rooms.get(room_code, set()):
        token = socket_session.get(ws)
        if token and token in sessions:
            seen[token] = sessions[token]
    users = [
        {'name': info['name'], 'color': info['color']}
        for info in seen.values()
    ]
    await broadcast_to_room(room_code, {
        'type': 'room_users',
        'room': room_code,
        'users': users,
        'count': len(users)
    })


def user_list_message():
    """
    The online user list — one entry per person.

    Iterates sessions rather than sockets, so the count is people. Sessions with
    no sockets are the recently disconnected, waiting out SESSION_TIMEOUT in case
    they come back; they are not online and are skipped.

    Built separately from the broadcast so a single arriving socket can be sent
    the roster directly. Without that a new connection saw no `user_list` at all
    until somebody else's set_name or disconnect happened to trigger one, and
    the widget has nothing else to draw the online count from — so it kept
    showing whatever number it last heard, indefinitely.
    """
    users = []
    for info in sessions.values():
        if not info['sockets']:
            continue
        user_rooms = list(info['rooms'])
        game = 'In Game' if any(code in rooms for code in user_rooms) else None
        users.append({
            'name': info['name'],
            'color': info['color'],
            'rooms': user_rooms,
            'game': game,
        })
    return {
        'type': 'user_list',
        'users': users,
        'count': len(users)
    }


async def broadcast_user_list():
    """Send the online user list to all connected clients."""
    await broadcast(user_list_message())


# There is deliberately no global_users broadcast. It counted len(connected_clients)
# — sockets, not people — and the widget feeds `global_users` into the same online
# counter as `user_list`, so whichever arrived last won. It was never called; wiring
# it up would reintroduce a count that double-counts anyone with two tabs open.


# ── Room membership ─────────────────────────────────────────────────────────

def join_room_state(websocket, room):
    """
    Put a session in a room. False if the room code is not acceptable.

    Every socket of the session joins the fan-out set, not just the one that
    asked: rooms belong to people, so a member's other tabs must see the room's
    traffic too.
    """
    info = session_of(websocket)
    if info is None:
        return False
    if not ROOM_CODE_RE.match(room):
        return False
    if room not in rooms and len(rooms) >= MAX_ROOMS:
        logger.warning("Room limit reached (%d); refused %s", MAX_ROOMS, room)
        return False
    info['rooms'].add(room)
    bucket = rooms.setdefault(room, set())
    bucket.update(info['sockets'])
    bucket.add(websocket)
    return True


def leave_room_state(websocket, room):
    """Take a session out of a room, all of its sockets with it."""
    info = session_of(websocket)
    if info is None:
        return
    info['rooms'].discard(room)
    if room in rooms:
        for ws in info['sockets']:
            rooms[room].discard(ws)
        rooms[room].discard(websocket)


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

        # Send the roster. The widget's own set_name normally provokes one a
        # moment later, but not reliably: set_name is rate limited per IP and a
        # refusal is silent, and the SharedWorker's cached user_list survives an
        # automatic reconnect. Either way the count on screen would keep its
        # stale value. This socket has asked for nothing yet, so it is not in
        # the roster it is being sent.
        await websocket.send(json.dumps(user_list_message()))

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
                token = (msg.get('session_token')
                         or socket_session.get(websocket)
                         or anon_token())
                info = sessions.get(token)

                if info is None:
                    # A session this server has not seen, or one already swept.
                    sessions[token] = {
                        'name': get_unique_name(new_name, token),
                        'color': get_next_color(),
                        'rooms': set(),
                        'sockets': set(),
                        'last_seen': time.time(),
                    }
                    attach_socket(token, websocket)
                    await websocket.send(json.dumps({
                        'type': 'name_assigned',
                        'name': sessions[token]['name']
                    }))
                    await broadcast_user_list()

                elif websocket not in info['sockets']:
                    # Another socket for a session that already exists: a second
                    # tab, or a reconnect. Either way it is the same person, so
                    # the session keeps its name, color and rooms and simply
                    # gains a socket — no second roster entry, and no race with
                    # whether the old socket has been reaped yet.
                    #
                    # attach_socket puts it back in the session's rooms. That
                    # matters for a reconnect: the room list used to be dropped
                    # on restore, so a player whose socket blipped mid-game
                    # stopped receiving their game's sub-chat while the widget
                    # still believed it was in the room. No room_history is
                    # replayed — the widget never cleared the pane, so resending
                    # it would duplicate every message already on screen.
                    attach_socket(token, websocket)
                    await websocket.send(json.dumps({
                        'type': 'name_assigned',
                        'name': info['name']
                    }))
                    for room in info['rooms']:
                        await broadcast_room_users(room)
                    # Unconditional: the roster's contents may not have changed,
                    # but the arriving socket has never received one.
                    await broadcast_user_list()

                else:
                    # Existing socket renaming itself.
                    info['name'] = get_unique_name(new_name, token)
                    await websocket.send(json.dumps({
                        'type': 'name_assigned',
                        'name': info['name']
                    }))
                    await broadcast_user_list()

            elif msg_type == 'set_color':
                if not ip_limiter.check((ip, "set_color"), 10, 10):
                    logger.warning("Rate limited: set_color from %s", ip)
                    continue
                info = session_of(websocket)
                if info is None:
                    continue
                new_color = msg.get('color', '#fff')
                if new_color.startswith('#') and len(new_color) == 7:
                    info['color'] = new_color
                    await broadcast_user_list()

            elif msg_type == 'join_room':
                if session_of(websocket) is None:
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
                if session_of(websocket) is None:
                    continue
                room = msg.get('room', '').upper()
                leave_room_state(websocket, room)
                if room in rooms:
                    if rooms[room]:
                        await broadcast_room_users(room)
                    else:
                        drop_room(room)
                await broadcast_user_list()

            elif msg_type == 'chat':
                if not ip_limiter.check((ip, "chat_say"), 5, 10):
                    logger.warning("Rate limited: chat from %s", ip)
                    continue
                info = session_of(websocket)
                if info is None:
                    continue
                # Normalised the same way join_room does, so a client that
                # sends the code back in a different case still lands in the room
                # it actually joined.
                room = (msg.get('room') or '').upper() or None
                text = msg.get('text', '')[:200]
                name = info['name']
                color = info['color']

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
                    if room not in info['rooms']:
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
                info = session_of(websocket)
                if info is None:
                    continue
                room = (msg.get('room') or '').upper() or None
                now = time.time()
                # Debounced per person, not per socket: someone with two tabs
                # open should not be able to emit twice the typing traffic.
                token = socket_session[websocket]
                last = typing_debounce.get(token, 0)
                if now - last < 2:
                    continue
                typing_debounce[token] = now

                typing_msg = {
                    'type': 'typing',
                    'from': info['name'],
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
        connected_clients.discard(websocket)
        # detach_socket drops this socket from the session and from every room
        # fan-out set, and stamps last_seen if it was the session's last. The
        # session itself stays — holding the name, color and room list — until
        # session_cleanup sweeps it, so a reconnect inside SESSION_TIMEOUT
        # reclaims all of it. Nothing is copied into a parallel store, which is
        # what let the old code lose the room list on restore.
        token, info = detach_socket(websocket)
        if info is not None:
            gone = not info['sockets']
            for room in list(info['rooms']):
                if room not in rooms:
                    continue
                if rooms[room]:
                    await broadcast_room_users(room)
                elif gone:
                    # Empty, and its last member has no sockets left anywhere.
                    drop_room(room)
            if gone:
                typing_debounce.pop(token, None)
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
    """
    Forget sessions that have held no socket for longer than SESSION_TIMEOUT.

    A session with sockets is online and is never swept, however old it is —
    `last_seen` is only stamped when the last socket goes.
    """
    while True:
        await asyncio.sleep(10)
        now = time.time()
        expired = [
            token for token, info in sessions.items()
            if not info['sockets'] and now - info['last_seen'] > SESSION_TIMEOUT
        ]
        for token in expired:
            for room in sessions[token]['rooms']:
                if room in rooms and not rooms[room]:
                    drop_room(room)
            del sessions[token]
            typing_debounce.pop(token, None)


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
    async with websockets.serve(handler, '0.0.0.0', port, process_request=gate,
                                ping_interval=PING_INTERVAL,
                                ping_timeout=PING_TIMEOUT):
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
