"""
WebSocket server — Parchís multiplayer
Run with:  python server.py [--port PORT]
Requires:  pip install websockets
"""

import argparse
import asyncio
import json
import random
import websockets

# ── Constants ─────────────────────────────────────────────────────────────────

MIN_PLAYERS = 2
MAX_PLAYERS = 4
TRACK_SIZE = 68
HOME_SIZE = 8

SLOT_COLORS = ['red', 'blue', 'green', 'yellow']

PALETTE = [
    "#ff2d55", "#ff7c1e", "#ffe135", "#39d353",
    "#6cd4f5", "#4059c8", "#9b30ff", "#ff69b4",
    "#fff5e1", "#00fa9a", "#ff4f6d", "#7b68ee",
]

# Entry squares on the track for each color
COLOR_ENTRY = {'red': 5, 'blue': 22, 'green': 39, 'yellow': 56}

# Safe squares (entry squares + 4 before entry)
SAFE_SQUARES = [5, 1, 22, 18, 39, 35, 56, 52]

# ── Global game state ─────────────────────────────────────────────────────────

connected_clients = set()
spectators = set()
player_order = []       # websockets in turn order
player_names = {}       # websocket -> name
player_colors = {}      # websocket -> hex color
host = None
current_turn = None     # websocket whose turn it is
game_started = False

# Game state
slot_map = {}           # websocket -> slot color ('red', 'blue', etc.)
pawn_positions = {}     # slot -> [pos, pos, pos, pos]  (None = yard)
scores = {}             # slot -> int (finished pawns)
dice_values = [0, 0]
consecutive_doubles = 0


def init_game():
    """Initialize game state for a new game."""
    global pawn_positions, scores, dice_values, consecutive_doubles
    pawn_positions = {c: [None, None, None, None] for c in SLOT_COLORS[:len(player_order)]}
    scores = {c: 0 for c in SLOT_COLORS[:len(player_order)]}
    dice_values = [0, 0]
    consecutive_doubles = 0


def get_slot(websocket):
    """Get the board slot color for a player."""
    return slot_map.get(websocket)


# ── Position helpers ──────────────────────────────────────────────────────────

def is_null(pos):
    return pos is None


def is_track(pos):
    return isinstance(pos, dict) and 'track' in pos


def is_home(pos):
    return isinstance(pos, dict) and 'home' in pos


def is_finished(pos):
    return pos == 'finished'


def advance_position(color, from_pos, steps):
    """Advance a piece forward by steps. Returns new position or None if invalid."""
    if from_pos is None or from_pos == 'finished':
        return None

    entry = COLOR_ENTRY[color]

    if is_home(from_pos):
        new_home = from_pos['home'] + steps
        if new_home > HOME_SIZE:
            return None  # overshoot
        if new_home == HOME_SIZE:
            return 'finished'
        return {'home': new_home}

    # On main track
    cur = from_pos['track']

    # Distance to home entry
    if cur <= entry:
        dist_to_entry = entry - cur
    else:
        dist_to_entry = (TRACK_SIZE - cur) + entry

    if steps > dist_to_entry:
        # Enters home run
        home_steps = steps - dist_to_entry
        if home_steps > HOME_SIZE:
            return None  # overshoot
        if home_steps == HOME_SIZE:
            return 'finished'
        return {'home': home_steps}

    # Stays on track
    new_track = (cur + steps) % TRACK_SIZE
    return {'track': new_track}


def get_pawns_at_track(slot_color, track_pos, exclude_slot=None):
    """Get all pawns at a track position."""
    result = []
    for slot, pawns in pawn_positions.items():
        if slot == exclude_slot:
            continue
        for i, pos in enumerate(pawns):
            if is_track(pos) and pos['track'] == track_pos:
                result.append({'slot': slot, 'index': i})
    return result


def is_safe_square(track_pos):
    return track_pos in SAFE_SQUARES


def check_capture(moving_slot, track_pos):
    """Check if landing captures an opponent. Returns captured pawn or None."""
    if is_safe_square(track_pos):
        return None

    pawns_here = get_pawns_at_track(moving_slot, track_pos, exclude_slot=moving_slot)
    opponents = [p for p in pawns_here if p['slot'] != moving_slot]

    # Single opponent gets captured; blockade (2+) is safe
    if len(opponents) == 1:
        return opponents[0]
    return None


def is_blockade(track_pos):
    """Check if a position has a blockade (2+ same-color pawns)."""
    pawns_here = get_pawns_at_track(None, track_pos)
    color_counts = {}
    for p in pawns_here:
        color_counts[p['slot']] = color_counts.get(p['slot'], 0) + 1
    return any(count >= 2 for count in color_counts.values())


# ── Message handlers ──────────────────────────────────────────────────────────

async def handle_client(websocket):
    global host, current_turn, game_started

    # Send lobby snapshot immediately
    players_info = []
    for ws in player_order:
        if ws in player_names:
            slot = get_slot(ws)
            players_info.append({
                "name": player_names[ws],
                "color": player_colors.get(ws, "#aaa"),
                "slot": slot,
            })
    try:
        await safe_send(websocket, {
            "type": "lobby_update",
            "players": [p["name"] for p in players_info],
            "playersInfo": players_info,
            "takenColors": list(player_colors.values()),
            "playerCount": len(player_order),
            "maxPlayers": MAX_PLAYERS,
            "minPlayers": MIN_PLAYERS,
            "canStart": (not game_started and len(player_order) >= MIN_PLAYERS),
            "gameStarted": game_started,
        })
    except Exception:
        return

    # Wait for first message
    try:
        raw = await asyncio.wait_for(websocket.recv(), timeout=30)
        msg = json.loads(raw)
    except (asyncio.TimeoutError, websockets.exceptions.ConnectionClosed, json.JSONDecodeError):
        return

    msg_type = msg.get("type")

    if msg_type == "spectate":
        await _handle_spectate(websocket, msg)
        return

    if msg_type != "join" and msg_type != "join_room" and msg_type != "create_room":
        await safe_send(websocket, {"type": "error", "text": "First message must be join, join_room, create_room, or spectate."})
        return

    chosen_name = (msg.get("name") or "Player").strip()[:20]
    chosen_color = (msg.get("color") or "").strip()

    if len(player_order) >= MAX_PLAYERS:
        await safe_send(websocket, {
            "type": "rejected",
            "reason": f"Game is full ({MAX_PLAYERS} players max). You can spectate.",
        })
        return

    if game_started:
        await safe_send(websocket, {
            "type": "rejected",
            "reason": "Game has already started. You can spectate.",
        })
        return

    # Resolve color
    taken_colors = set(player_colors.values())
    if chosen_color not in PALETTE or chosen_color in taken_colors:
        available = [c for c in PALETTE if c not in taken_colors]
        chosen_color = available[0] if available else PALETTE[len(player_order) % len(PALETTE)]

    # Register player
    connected_clients.add(websocket)
    player_order.append(websocket)
    player_number = len(player_order)
    player_names[websocket] = chosen_name
    player_colors[websocket] = chosen_color

    # Assign slot
    slot = SLOT_COLORS[player_number - 1]
    slot_map[websocket] = slot

    is_host = (player_number == 1)
    if is_host:
        host = websocket

    print(f"[join] '{chosen_name}' ({chosen_color}) → slot {slot}. Total: {len(connected_clients)}")

    await safe_send(websocket, {
        "type": "welcome",
        "playerName": chosen_name,
        "playerNumber": player_number,
        "slot": slot,
        "isHost": is_host,
        "chosenColor": chosen_color,
        "room": "MAIN",
    })
    await broadcast_lobby()
    await broadcast({"type": "system", "text": f"{chosen_name} joined the lobby!"}, exclude=websocket)

    # Main message loop
    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            await handle_message(websocket, msg)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        await _on_disconnect(websocket)


async def _handle_spectate(websocket, msg):
    """Register a spectator."""
    chosen_name = (msg.get("name") or "Spectator").strip()[:20]
    spectators.add(websocket)
    player_names[websocket] = chosen_name
    print(f"[spectate] '{chosen_name}' joined as spectator.")

    await safe_send(websocket, {"type": "spectator_welcome", "playerName": chosen_name})
    await broadcast({"type": "system", "text": f"👁 {chosen_name} is watching."}, exclude=websocket)

    # Send current state if game in progress
    if game_started:
        color_map = {}
        for ws in player_order:
            slot = get_slot(ws)
            if slot:
                color_map[slot] = player_colors.get(ws, "")
        await safe_send(websocket, {"type": "game_started", "colorMap": color_map})
        if current_turn:
            await safe_send(websocket, {
                "type": "turn_update",
                "currentTurnName": player_names.get(current_turn, "?"),
            })

    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if msg.get("type") == "chat":
                name = player_names.get(websocket, "?")
                await broadcast({"type": "chat", "from": f"{name} 👁", "color": "", "text": msg.get("text", "")}, exclude=websocket)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        spectators.discard(websocket)
        player_names.pop(websocket, None)
        print(f"[spectate] '{chosen_name}' stopped watching.")


async def handle_message(websocket, msg):
    """Process one message from a connected player."""
    global current_turn, game_started, host, consecutive_doubles

    t = msg.get("type")
    name = player_names.get(websocket, "?")
    slot = get_slot(websocket)

    try:
        if t == "chat":
            await broadcast({
                "type": "chat",
                "from": name,
                "color": player_colors.get(websocket, ""),
                "text": msg.get("text", "")[:200],
            }, exclude=websocket)

        elif t == "start_game":
            if websocket is not host:
                await safe_send(websocket, {"type": "error", "text": "Only the host can start."})
            elif len(player_order) < MIN_PLAYERS:
                await safe_send(websocket, {"type": "error", "text": f"Need at least {MIN_PLAYERS} players."})
            elif game_started:
                await safe_send(websocket, {"type": "error", "text": "Game already started."})
            else:
                game_started = True
                current_turn = player_order[0]
                init_game()

                color_map = {}
                for ws in player_order:
                    s = get_slot(ws)
                    if s:
                        color_map[s] = player_colors.get(ws, "")

                print(f"[game] Started! colorMap={color_map}. First turn: '{player_names[current_turn]}'")
                await broadcast({"type": "game_started", "colorMap": color_map})
                await broadcast_turn()

        elif t == "game_action":
            action = msg.get("action", {})
            action_type = action.get("type")

            if not game_started:
                await safe_send(websocket, {"type": "error", "text": "Game hasn't started."})
                return

            if websocket is not current_turn:
                await safe_send(websocket, {"type": "error", "text": "It's not your turn!"})
                return

            if action_type == "roll_dice":
                dice = [random.randint(1, 6), random.randint(1, 6)]
                is_doubles = dice[0] == dice[1]

                if is_doubles:
                    consecutive_doubles += 1
                else:
                    consecutive_doubles = 0

                # Store dice for move_pawn to check doubles
                dice_values[0] = dice[0]
                dice_values[1] = dice[1]

                print(f"[dice] '{name}' rolled {dice[0]}+{dice[1]}{' (doubles!)' if is_doubles else ''}")
                await broadcast({
                    "type": "dice_rolled",
                    "playerName": name,
                    "dice": dice,
                })

            elif action_type == "move_pawn":
                pawn_idx = action.get("pawnIndex")
                new_pos = action.get("newPos")
                capture = action.get("capture")

                if pawn_idx is None or not (0 <= pawn_idx <= 3):
                    await safe_send(websocket, {"type": "error", "text": "Invalid pawn index."})
                    return

                # Convert new_pos from JSON
                if new_pos == 'yard':
                    new_pos = None
                elif new_pos == 'finished':
                    new_pos = 'finished'
                elif isinstance(new_pos, dict):
                    pass  # already correct format

                old_pos = pawn_positions[slot][pawn_idx]

                # Handle capture
                if capture and isinstance(capture, dict):
                    cap_slot = capture.get('slot') or capture.get('color')
                    cap_idx = capture.get('index')
                    if cap_slot and cap_idx is not None:
                        pawn_positions[cap_slot][cap_idx] = None
                        print(f"[capture] '{name}' captured {cap_slot} pawn {cap_idx}")

                # Move the pawn
                pawn_positions[slot][pawn_idx] = new_pos

                # Check for score
                if new_pos == 'finished':
                    scores[slot] = scores.get(slot, 0) + 1
                    print(f"[score] '{name}' finished a pawn! Score: {scores[slot]}")

                    if scores[slot] >= 4:
                        print(f"[win] '{name}' wins!")
                        await broadcast({
                            "type": "game_over",
                            "winner": name,
                            "winnerSlot": slot,
                        })
                        _reset_game_state()
                        return

                print(f"[move] '{name}' moved pawn {pawn_idx}: {old_pos} → {new_pos}")

                await broadcast({
                    "type": "pawn_moved",
                    "color": slot,
                    "pawnIndex": pawn_idx,
                    "newPosition": new_pos,
                    "capture": capture,
                })

                # Advance turn (unless doubles — player goes again)
                is_doubles = dice_values[0] == dice_values[1] and dice_values[0] != 0
                if not is_doubles:
                    advance_turn()
                await broadcast_turn()

            elif action_type == "penalty_pawn":
                # 3-doubles penalty
                pawn_idx = action.get("pawnIndex")
                if pawn_idx is None or not (0 <= pawn_idx <= 3):
                    await safe_send(websocket, {"type": "error", "text": "Invalid pawn index."})
                    return

                pawn_positions[slot][pawn_idx] = None
                consecutive_doubles = 0
                print(f"[penalty] '{name}' lost pawn {pawn_idx} to 3-doubles rule")

                await broadcast({
                    "type": "pawn_moved",
                    "color": slot,
                    "pawnIndex": pawn_idx,
                    "newPosition": None,
                    "capture": None,
                })

                advance_turn()
                await broadcast_turn()

            elif action_type == "skip_turn":
                print(f"[skip] '{name}' skipped turn — no legal moves")
                await broadcast({"type": "system", "text": f"{name} had no moves — skipping."})
                advance_turn()
                await broadcast_turn()

        elif t == "change_color":
            new_color = (msg.get("color") or "").strip()
            if new_color not in PALETTE:
                await safe_send(websocket, {"type": "error", "text": "Invalid color."})
            else:
                taken = set(player_colors.values()) - {player_colors.get(websocket)}
                if new_color in taken:
                    await safe_send(websocket, {"type": "error", "text": "Color already taken."})
                else:
                    old = player_colors.get(websocket)
                    player_colors[websocket] = new_color
                    print(f"[color] '{name}' changed: {old} → {new_color}")
                    color_map = {}
                    for ws in player_order:
                        s = get_slot(ws)
                        if s:
                            color_map[s] = player_colors.get(ws, "")
                    await broadcast({"type": "color_changed", "playerName": name, "colorMap": color_map})
                    await broadcast_lobby()

        elif t == "quit_game":
            quit_name = player_names.get(websocket, "Someone")
            quit_slot = get_slot(websocket)
            was_their_turn = (current_turn is websocket)

            player_names.pop(websocket, None)
            player_colors.pop(websocket, None)
            connected_clients.discard(websocket)
            slot_map.pop(websocket, None)
            if websocket in player_order:
                player_order.remove(websocket)

            await broadcast({"type": "player_quit", "playerName": quit_name, "color": quit_slot})

            if len(player_order) <= 1:
                if player_order:
                    survivor = player_names.get(player_order[0], "?")
                    await broadcast({"type": "system", "text": f"Only {survivor} remains — game over!"})
                _reset_game_state()
                return

            if websocket is host and player_order:
                host = player_order[0]
                await safe_send(host, {"type": "promoted_to_host"})
                new_host_name = player_names.get(host, "someone")
                await broadcast({"type": "system", "text": f"{quit_name} (host) left. {new_host_name} is now host."})

            if was_their_turn:
                advance_turn()
                await broadcast_turn()

            await broadcast_lobby()
            await websocket.close()

        else:
            print(f"[warn] Unknown message type '{t}' from '{name}'")

    except Exception as e:
        print(f"[ERROR] handle_message '{t}' from '{name}': {e!r}")


async def _on_disconnect(websocket):
    """Clean up on disconnect."""
    global host, current_turn, game_started

    if websocket not in connected_clients and websocket not in player_order:
        return

    name = player_names.pop(websocket, "Someone")
    player_colors.pop(websocket, None)
    connected_clients.discard(websocket)
    was_current_turn = (current_turn is websocket)
    slot_map.pop(websocket, None)

    if websocket in player_order:
        player_order.remove(websocket)

    print(f"[disc] '{name}' disconnected. Remaining: {len(connected_clients)}")

    if was_current_turn:
        advance_turn()

    if websocket is host and connected_clients:
        host = list(connected_clients)[0]
        new_name = player_names.get(host, "someone")
        await safe_send(host, {"type": "promoted_to_host"})
        await broadcast({"type": "system", "text": f"{name} (host) left. {new_name} is now host."})
    elif connected_clients:
        await broadcast({"type": "system", "text": f"{name} left. ({len(connected_clients)} remaining)"})

    if connected_clients:
        await broadcast_lobby()
        if game_started:
            await broadcast_turn()
    else:
        _reset_game_state()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _reset_game_state():
    """Reset all game state."""
    global game_started, current_turn, host, consecutive_doubles
    game_started = False
    current_turn = None
    host = None
    consecutive_doubles = 0
    pawn_positions.clear()
    scores.clear()
    slot_map.clear()
    spectators.clear()
    print("[reset] Game state reset.")


def advance_turn():
    """Advance to the next player's turn."""
    global current_turn
    if not player_order:
        current_turn = None
        return
    if current_turn not in player_order:
        current_turn = player_order[0]
        return
    idx = player_order.index(current_turn)
    current_turn = player_order[(idx + 1) % len(player_order)]


async def safe_send(websocket, msg_dict):
    try:
        await websocket.send(json.dumps(msg_dict))
    except Exception as e:
        print(f"[warn] safe_send failed: {e!r}")


async def broadcast(msg_dict, exclude=None):
    all_recipients = connected_clients | spectators
    if not all_recipients:
        return
    data = json.dumps(msg_dict)
    targets = all_recipients - {exclude} if exclude else set(all_recipients)
    if not targets:
        return
    results = await asyncio.gather(*[c.send(data) for c in targets], return_exceptions=True)
    for ws, result in zip(targets, results):
        if isinstance(result, Exception):
            print(f"[warn] broadcast failed to '{player_names.get(ws, '?')}': {result!r}")


async def broadcast_lobby():
    players_info = []
    for ws in player_order:
        if ws in player_names:
            slot = get_slot(ws)
            players_info.append({
                "name": player_names[ws],
                "color": player_colors.get(ws, "#aaa"),
                "slot": slot,
            })
    await broadcast({
        "type": "lobby_update",
        "players": [p["name"] for p in players_info],
        "playersInfo": players_info,
        "takenColors": list(player_colors.values()),
        "playerCount": len(player_order),
        "maxPlayers": MAX_PLAYERS,
        "minPlayers": MIN_PLAYERS,
        "canStart": (not game_started and len(player_order) >= MIN_PLAYERS),
        "gameStarted": game_started,
    })


async def broadcast_turn():
    if current_turn is None:
        return
    name = player_names.get(current_turn, "?")
    await broadcast({"type": "turn_update", "currentTurnName": name})


# ── Main ──────────────────────────────────────────────────────────────────────

async def main(port):
    import signal
    print(f"Parchís WebSocket server on ws://0.0.0.0:{port}")
    print(f"Waiting for {MIN_PLAYERS}–{MAX_PLAYERS} players (+ spectators)…")
    print("Ctrl+C to stop.\n")

    loop = asyncio.get_running_loop()
    stop = loop.create_future()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: (stop.set_result(None) if not stop.done() else None))

    async with websockets.serve(handle_client, "0.0.0.0", port):
        await stop

    print("\nServer stopped cleanly.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Multiplayer Parchís Server')
    parser.add_argument('--port', type=int, default=8773, help='Port to listen on')
    args = parser.parse_args()
    asyncio.run(main(args.port))
