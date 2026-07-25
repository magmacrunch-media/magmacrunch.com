"""
server_base.py — Reusable WebSocket server for multiplayer card/board games
Provides: room management, lobby, chat, player lifecycle, spectator support.

Usage:
    from server_base import GameServer, Room

    class MyGame:
        def __init__(self):
            self.reset()
        def reset(self):
            ...
        def handle_action(self, player, action):
            # Process game action, return (broadcast_msg, exclude_player_or_None)
            ...
        def get_state(self):
            # Return serializable game state dict
            return {}

    server = GameServer(port=8765, game_factory=MyGame)
    server.run()
"""

import asyncio
import json
import logging
import random
import string
import time
import websockets


def copy_board_2d(board):
    """Deep-copy a 2D list (list of lists)."""
    return [row[:] for row in board]

logging.getLogger("websockets").setLevel(logging.WARNING)


# ── Color palette ────────────────────────────────────────────────────────────

PALETTE = [
    "#ff2d55",  # Cherry
    "#ff7c1e",  # Orange
    "#ffe135",  # Lemon
    "#39d353",  # Lime
    "#6cd4f5",  # Ice Blue
    "#4059c8",  # Blueberry
    "#9b30ff",  # Grape
    "#ff69b4",  # Bubblegum
    "#fff5e1",  # Cream
    "#00fa9a",  # Spearmint
    "#ff4f6d",  # Watermelon
    "#7b68ee",  # Bluebell
]

# Board slot colors (used by games with fixed board positions like SORRY)
SLOT_COLORS = ['red', 'blue', 'yellow', 'green']


# ── Room ─────────────────────────────────────────────────────────────────────

class Room:
    """A single game room with players, spectators, and game logic."""

    def __init__(self, code, game_logic, max_players=2):
        self.code = code
        self.game = game_logic
        self.max_players = max_players
        self.players = []          # [websocket, ...]
        self.player_names = {}     # websocket -> name
        self.player_colors = {}    # websocket -> hex color
        self.spectators = set()    # {websocket, ...}
        self.host = None           # websocket of host player
        self.game_started = False
        self.used_colors = set()

    @property
    def player_count(self):
        return len(self.players)

    def get_player_info(self):
        """Return list of player info dicts for lobby updates."""
        return [
            {
                "name": self.player_names.get(p, ""),
                "color": self.player_colors.get(p, ""),
                "isHost": p == self.host,
                "slot": SLOT_COLORS[i] if i < len(SLOT_COLORS) else None,
            }
            for i, p in enumerate(self.players)
        ]

    def get_taken_colors(self):
        return list(self.used_colors)

    def can_start(self):
        return self.player_count >= 2 and self.host is not None

    def assign_color(self, preferred=None):
        """Assign a color to a new player. Use preferred if available."""
        if preferred and preferred not in self.used_colors:
            self.used_colors.add(preferred)
            return preferred
        for c in PALETTE:
            if c not in self.used_colors:
                self.used_colors.add(c)
                return c
        return PALETTE[0]

    def remove_player(self, ws):
        if ws in self.players:
            self.players.remove(ws)
            color = self.player_colors.pop(ws, None)
            name = self.player_names.pop(ws, None)
            if color:
                self.used_colors.discard(color)
            if ws == self.host and self.players:
                self.host = self.players[0]
            return name, color
        self.spectators.discard(ws)
        return None, None

    async def broadcast(self, msg, exclude=None):
        """Send JSON message to all players and spectators."""
        data = json.dumps(msg)
        targets = [p for p in self.players if p != exclude] + list(self.spectators - {exclude})
        for ws in targets:
            try:
                await ws.send(data)
            except websockets.ConnectionClosed:
                pass


# ── Rate Limiter ──────────────────────────────────────────────────────────────

class RateLimiter:
    """Per-connection sliding window rate limiter."""

    def __init__(self):
        self._windows = {}  # key -> (window_start, count)

    def check(self, key, max_count, window_sec):
        """Return True if allowed, False if rate limited."""
        now = time.monotonic()
        window_start, count = self._windows.get(key, (now, 0))
        if now - window_start > window_sec:
            self._windows[key] = (now, 1)
            return True
        if count >= max_count:
            return False
        self._windows[key] = (window_start, count + 1)
        return True


# ── Game Server ──────────────────────────────────────────────────────────────

class GameServer:
    """
    Reusable multiplayer game server.

    Subclass and override game_factory to provide game-specific logic.
    The factory should return an object with:
        - reset() -> dict or None (optional custom game_started data)
        - handle_action(player_name, action, room=None) -> dict, list, or None
        - get_state() -> dict
    """

    def __init__(self, port=8765, game_factory=None, min_players=2, max_players=2, game_name="Game"):
        self.port = port
        self.game_factory = game_factory
        self.min_players = min_players
        self.max_players = max_players
        self.game_name = game_name
        self.rooms = {}  # code -> Room

    def _generate_code(self):
        """Generate a random 4-character room code."""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            if code not in self.rooms:
                return code

    def _get_or_create_room(self, room_code=None):
        """Get existing room or create new one."""
        if room_code and room_code in self.rooms:
            return self.rooms[room_code]
        code = room_code or self._generate_code()
        game = self.game_factory() if self.game_factory else None
        room = Room(code, game, self.max_players)
        self.rooms[code] = room
        return room

    async def handler(self, websocket):
        """Main connection handler."""
        room = None
        player_name = None
        limiter = RateLimiter()

        try:
            # Send lobby snapshot immediately
            await self._send_lobby_snapshot(websocket)

            async for raw in websocket:
                # Global flood protection: 20 msgs/sec per connection
                if not limiter.check("global", 20, 1):
                    continue

                try:
                    msg = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                msg_type = msg.get("type")

                if msg_type == "join":
                    room, player_name = await self._handle_join(websocket, msg)

                elif msg_type == "spectate":
                    room, player_name = await self._handle_spectate(websocket, msg)

                elif msg_type == "create_room":
                    room, player_name = await self._handle_create_room(websocket, msg)

                elif msg_type == "join_room":
                    room, player_name = await self._handle_join_room(websocket, msg)

                elif msg_type == "start_game":
                    await self._handle_start_game(websocket, room)

                elif msg_type == "chat":
                    if limiter.check("chat", 5, 10):
                        await self._handle_chat(websocket, room, msg)

                elif msg_type == "game_action":
                    if limiter.check("game_action", 2, 3):
                        await self._handle_game_action(websocket, room, msg)

                elif msg_type == "quit":
                    await self._handle_quit(websocket, room)
                    room = None
                    player_name = None

        except websockets.ConnectionClosed:
            pass
        finally:
            if room and player_name:
                await self._on_disconnect(websocket, room)

    async def _send_lobby_snapshot(self, websocket):
        """Send current state to a newly connected client."""
        await websocket.send(json.dumps({
            "type": "lobby_snapshot",
            "rooms": [
                {"code": r.code, "players": r.player_count, "maxPlayers": r.max_players, "started": r.game_started}
                for r in self.rooms.values()
            ]
        }))

    async def _handle_join(self, websocket, msg):
        """Join a room (creates new room if none specified)."""
        name = msg.get("name", "Player")[:20]
        color = msg.get("color")
        room_code = msg.get("room")

        room = self._get_or_create_room(room_code)

        if room.player_count >= room.max_players:
            await websocket.send(json.dumps({"type": "rejected", "reason": "Room is full"}))
            return None, None

        if room.game_started:
            # Allow spectating instead
            room.spectators.add(websocket)
            room.player_names[websocket] = name
            await websocket.send(json.dumps({"type": "spectator_welcome", "playerName": name, "room": room.code}))
            await room.broadcast({"type": "system", "text": f"{name} is watching"}, exclude=websocket)
            return room, name

        assigned_color = room.assign_color(color)
        room.players.append(websocket)
        room.player_names[websocket] = name
        room.player_colors[websocket] = assigned_color

        if not room.host:
            room.host = websocket

        is_host = websocket == room.host
        await websocket.send(json.dumps({
            "type": "welcome",
            "playerName": name,
            "room": room.code,
            "isHost": is_host,
            "chosenColor": assigned_color,
            "playerCount": room.player_count,
            "maxPlayers": room.max_players,
        }))

        await room.broadcast({
            "type": "lobby_update",
            "players": room.get_player_info(),
            "takenColors": room.get_taken_colors(),
            "playerCount": room.player_count,
            "maxPlayers": room.max_players,
            "canStart": room.can_start(),
            "gameStarted": room.game_started,
        })

        return room, name

    async def _handle_spectate(self, websocket, msg):
        """Join as spectator."""
        name = msg.get("name", "Spectator")[:20]
        room_code = msg.get("room")

        room = self._get_or_create_room(room_code)
        room.spectators.add(websocket)
        room.player_names[websocket] = name

        await websocket.send(json.dumps({
            "type": "spectator_welcome",
            "playerName": name,
            "room": room.code,
        }))

        # Send current game state if in progress
        if room.game_started and room.game:
            await websocket.send(json.dumps({
                "type": "game_state",
                "state": room.game.get_state(),
            }))

        return room, name

    async def _handle_create_room(self, websocket, msg):
        """Create a new room with a specific code."""
        name = msg.get("name", "Player")[:20]
        color = msg.get("color")
        room_code = msg.get("room", "").upper()[:4]

        if not room_code:
            room_code = self._generate_code()

        if room_code in self.rooms:
            await websocket.send(json.dumps({"type": "rejected", "reason": "Room already exists"}))
            return None, None

        room = self._get_or_create_room(room_code)
        assigned_color = room.assign_color(color)
        room.players.append(websocket)
        room.player_names[websocket] = name
        room.player_colors[websocket] = assigned_color
        room.host = websocket

        await websocket.send(json.dumps({
            "type": "welcome",
            "playerName": name,
            "room": room.code,
            "isHost": True,
            "chosenColor": assigned_color,
            "playerCount": room.player_count,
            "maxPlayers": room.max_players,
        }))

        return room, name

    async def _handle_join_room(self, websocket, msg):
        """Join an existing room by code."""
        name = msg.get("name", "Player")[:20]
        color = msg.get("color")
        room_code = msg.get("room", "").upper()

        if room_code not in self.rooms:
            await websocket.send(json.dumps({"type": "rejected", "reason": "Room not found"}))
            return None, None

        room = self.rooms[room_code]

        if room.player_count >= room.max_players:
            await websocket.send(json.dumps({"type": "rejected", "reason": "Room is full"}))
            return None, None

        if room.game_started:
            room.spectators.add(websocket)
            room.player_names[websocket] = name
            await websocket.send(json.dumps({"type": "spectator_welcome", "playerName": name, "room": room.code}))
            return room, name

        assigned_color = room.assign_color(color)
        room.players.append(websocket)
        room.player_names[websocket] = name
        room.player_colors[websocket] = assigned_color

        is_host = websocket == room.host
        await websocket.send(json.dumps({
            "type": "welcome",
            "playerName": name,
            "room": room.code,
            "isHost": is_host,
            "chosenColor": assigned_color,
            "playerCount": room.player_count,
            "maxPlayers": room.max_players,
        }))

        await room.broadcast({
            "type": "lobby_update",
            "players": room.get_player_info(),
            "takenColors": room.get_taken_colors(),
            "playerCount": room.player_count,
            "maxPlayers": room.max_players,
            "canStart": room.can_start(),
            "gameStarted": room.game_started,
        }, exclude=websocket)

        return room, name

    async def _handle_start_game(self, websocket, room):
        """Start the game (host only)."""
        if not room or websocket != room.host:
            return
        if not room.can_start():
            return

        room.game_started = True
        if room.game:
            # Build ordered player name list for the game
            player_names = [room.player_names.get(p, "") for p in room.players]
            if hasattr(room.game, 'set_player_names'):
                room.game.set_player_names(player_names)
            # Store room ref so game can send targeted messages
            room.game.room = room
            reset_result = room.game.reset()

        # Build color map
        color_map = {}
        for p in room.players:
            name = room.player_names.get(p, "")
            color = room.player_colors.get(p, "")
            color_map[name] = color

        # If reset() returned a dict, use it as custom game_started data
        if isinstance(reset_result, dict):
            msg = {"type": "game_started", "colorMap": color_map}
            msg.update(reset_result)
            await room.broadcast(msg)
        else:
            await room.broadcast({
                "type": "game_started",
                "colorMap": color_map,
                "state": room.game.get_state() if room.game else {},
            })

    async def _handle_chat(self, websocket, room, msg):
        """Relay chat message."""
        if not room:
            return
        name = room.player_names.get(websocket, "???")
        color = room.player_colors.get(websocket, "")
        text = msg.get("text", "")[:200]

        is_spectator = websocket in room.spectators
        display_name = f"{name} \U0001f441" if is_spectator else name

        await room.broadcast({
            "type": "chat",
            "from": display_name,
            "color": color,
            "text": text,
        }, exclude=websocket)

    async def _handle_game_action(self, websocket, room, msg):
        """Forward game action to game logic and broadcast result."""
        if not room or not room.game:
            return

        name = room.player_names.get(websocket)
        if not name:
            return

        action = msg.get("action", {})

        # Pass room if game supports it (for targeted messaging)
        if getattr(room.game, '_accepts_room', None) is None:
            import inspect
            sig = inspect.signature(room.game.handle_action)
            room.game._accepts_room = 'room' in sig.parameters

        if room.game._accepts_room:
            result = room.game.handle_action(name, action, room=room)
        else:
            result = room.game.handle_action(name, action)

        if isinstance(result, list):
            for msg in result:
                if msg:
                    await room.broadcast(msg)
        elif result:
            await room.broadcast(result)

    async def _handle_quit(self, websocket, room):
        """Player leaves."""
        if not room:
            return
        name, color = room.remove_player(websocket)
        if name:
            await room.broadcast({
                "type": "player_quit",
                "playerName": name,
                "color": color,
            })
            await self._broadcast_lobby(room)
            if not room.players and not room.spectators:
                del self.rooms[room.code]

    async def _on_disconnect(self, websocket, room):
        """Handle disconnect cleanup."""
        if not room:
            return
        name, color = room.remove_player(websocket)
        if name:
            await room.broadcast({
                "type": "player_quit",
                "playerName": name,
                "color": color,
            })
            await self._broadcast_lobby(room)
            if not room.players and not room.spectators:
                del self.rooms[room.code]

    async def _broadcast_lobby(self, room):
        """Send lobby_update to all players in the room."""
        player_info = room.get_player_info()
        await room.broadcast({
            "type": "lobby_update",
            "players": player_info,
            "playersInfo": player_info,
            "takenColors": room.get_taken_colors(),
            "playerCount": room.player_count,
            "maxPlayers": room.max_players,
            "minPlayers": self.min_players,
            "canStart": room.can_start(),
            "gameStarted": room.game_started,
        })

    def run(self):
        """Start the server."""
        print(f"[{self.game_name}] Starting WebSocket server on port {self.port}")

        async def _health_check(connection, request):
            """Return 426 for plain HTTP requests, allow WebSocket upgrades."""
            from websockets.http11 import Response
            from websockets.datastructures import Headers
            if request.headers.get("Upgrade", "").lower() == "websocket":
                return None
            return Response(426, "Upgrade Required", Headers([("Upgrade", "websocket")]), b"")

        async def _run():
            async with websockets.serve(
                self.handler, "0.0.0.0", self.port,
                process_request=_health_check,
                ping_interval=None,
            ):
                await asyncio.Future()  # run forever
        try:
            asyncio.run(_run())
        except KeyboardInterrupt:
            print(f"\n[{self.game_name}] Server stopped.")


# ── CLI entry point for testing ──────────────────────────────────────────────

if __name__ == "__main__":
    server = GameServer(port=8765, game_name="Test")
    server.run()
