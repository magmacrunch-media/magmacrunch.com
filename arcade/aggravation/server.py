"""
WebSocket server — Aggravation multiplayer
Run with:  python server.py [--port PORT]
Requires:  pip install websockets
"""

import argparse
import asyncio
import json
import logging
import random
import signal
import string
import websockets

logging.getLogger("websockets").setLevel(logging.WARNING)

# ── Constants ─────────────────────────────────────────────────────────────────

TRACK_SIZE = 60
HOME_SIZE = 6
NUM_PAWNS = 4
MIN_PLAYERS = 2
MAX_PLAYERS = 6

COLORS = ['red', 'blue', 'green', 'yellow', 'purple', 'orange']

COLOR_CONFIG = {
    'red':    {'entry': 0,  'safe': [0, 5]},
    'blue':   {'entry': 10, 'safe': [10, 15]},
    'green':  {'entry': 20, 'safe': [20, 25]},
    'yellow': {'entry': 30, 'safe': [30, 35]},
    'purple': {'entry': 40, 'safe': [40, 45]},
    'orange': {'entry': 50, 'safe': [50, 55]},
}

SAFE_SQUARES = []
for c in COLORS:
    for s in COLOR_CONFIG[c]['safe']:
        if s not in SAFE_SQUARES:
            SAFE_SQUARES.append(s)

PALETTE = [
    "#ff3d6e", "#00f5ff", "#39ff6e",
    "#ffe03a", "#c45fff", "#ff7c1f",
    "#ff2d55", "#6cd4f5", "#9b30ff",
    "#ff69b4", "#fff5e1", "#00fa9a",
]

# ── Position helpers ──────────────────────────────────────────────────────────

def pos_is_null(pos):
    return pos is None

def pos_is_track(pos):
    return isinstance(pos, dict) and 'track' in pos

def pos_is_home(pos):
    return isinstance(pos, dict) and 'home' in pos

def pos_is_finished(pos):
    return pos == 'finished'


def advance_position(color, from_pos, steps):
    """Advance a piece by steps. Returns new position or None if invalid."""
    if from_pos is None or from_pos == 'finished':
        return None

    cfg = COLOR_CONFIG[color]

    if pos_is_home(from_pos):
        new_home = from_pos['home'] + steps
        if new_home > HOME_SIZE:
            return None
        if new_home == HOME_SIZE:
            return 'finished'
        return {'home': new_home}

    cur = from_pos['track']
    entry = cfg['entry']

    # Distance from cur to entry, going clockwise
    dist_to_entry = (entry - cur + TRACK_SIZE) % TRACK_SIZE
    crosses_entry = 0 < dist_to_entry <= steps

    if crosses_entry:
        home_steps = steps - dist_to_entry
        if home_steps > HOME_SIZE:
            return None
        if home_steps == HOME_SIZE:
            return 'finished'
        return {'home': home_steps}

    new_track = (cur + steps) % TRACK_SIZE
    return {'track': new_track}


def get_pawns_at_track(pawns, track_pos, exclude_color=None):
    """Get all pawns at a track position."""
    result = []
    for color in COLORS:
        if color not in pawns:
            continue
        if color == exclude_color:
            continue
        for i, pos in enumerate(pawns[color]):
            if pos_is_track(pos) and pos['track'] == track_pos:
                result.append({'color': color, 'index': i})
    return result


def is_safe_square(track_pos):
    return track_pos in SAFE_SQUARES


def check_capture(moving_color, track_pos, pawns):
    """Check if landing captures an opponent. Returns captured pawn or None."""
    if is_safe_square(track_pos):
        return None
    pawns_here = get_pawns_at_track(pawns, track_pos, exclude_color=moving_color)
    opponents = [p for p in pawns_here if p['color'] != moving_color]
    if len(opponents) == 1:
        return opponents[0]
    return None


def is_blockade(pawns, track_pos):
    """Check if a position has a blockade (2+ same-color pawns)."""
    pawns_here = get_pawns_at_track(pawns, track_pos)
    color_counts = {}
    for p in pawns_here:
        color_counts[p['color']] = color_counts.get(p['color'], 0) + 1
    return any(count >= 2 for count in color_counts.values())


def get_legal_moves(color, dice_value, pawns):
    """Return list of legal moves for a pawn."""
    moves = []
    cfg = COLOR_CONFIG[color]
    player_pawns = pawns.get(color, [None] * NUM_PAWNS)

    for pi in range(NUM_PAWNS):
        pos = player_pawns[pi]

        if pos is None:
            if dice_value in (1, 6):
                entry = cfg['entry']
                if not is_blockade(pawns, entry):
                    cap = check_capture(color, entry, pawns)
                    moves.append({
                        'pawnIndex': pi,
                        'newPos': {'track': entry},
                        'capture': cap,
                        'enterFromYard': True,
                    })
            continue

        if pos == 'finished':
            continue

        result = advance_position(color, pos, dice_value)
        if result is None:
            continue

        if pos_is_track(result) and is_blockade(pawns, result['track']):
            continue

        capture = None
        if not pos_is_home(result) and pos_is_track(result):
            capture = check_capture(color, result['track'], pawns)

        moves.append({
            'pawnIndex': pi,
            'newPos': result,
            'capture': capture,
        })

    return moves


# ── AI logic ──────────────────────────────────────────────────────────────────

def ai_choose_move(color, dice_value, pawns):
    """Simple AI: prioritize capture > finish > enter > advance."""
    moves = get_legal_moves(color, dice_value, pawns)
    if not moves:
        return None
    if len(moves) == 1:
        return moves[0]

    def score_move(move):
        s = 0
        if move.get('capture'):
            s += 1000
        if move.get('enterFromYard'):
            s += 500
        if move['newPos'] == 'finished':
            s += 800
        if pos_is_home(move['newPos']):
            s += 400 + move['newPos']['home'] * 10
        if pos_is_track(move['newPos']):
            s += move['newPos']['track']
        s += random.random() * 5
        return s

    return max(moves, key=score_move)


# ── Global game state ─────────────────────────────────────────────────────────

# Generate a room code on server start
ROOM_CODE = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))

connected_clients = set()
spectators = set()
player_order = []
player_names = {}
player_colors = {}
host = None
current_turn = None
game_started = False

slot_map = {}
pawns = {}
scores = {}
current_dice = 0
consecutive_sixes = 0
waiting_for_move = False


def init_game():
    """Initialize game state."""
    global pawns, scores, current_dice, consecutive_sixes, waiting_for_move
    pawns = {c: [None] * NUM_PAWNS for c in COLORS[:len(player_order)]}
    scores = {c: 0 for c in COLORS[:len(player_order)]}
    current_dice = 0
    consecutive_sixes = 0
    waiting_for_move = False


def get_slot(ws):
    return slot_map.get(ws)


def is_ai_player(slot_color):
    """Check if a slot is controlled by AI (not in player_order)."""
    return slot_color not in [slot_map.get(ws) for ws in player_order]


def get_next_human_ws():
    """Get the websocket of the next human player, or None if AI."""
    if not player_order:
        return None
    idx = player_order.index(current_turn) if current_turn in player_order else 0
    for _ in range(len(player_order)):
        idx = (idx + 1) % len(player_order)
        ws = player_order[idx]
        slot = slot_map.get(ws)
        if slot and not is_ai_player(slot):
            return ws
    return None


# ── Message handlers ──────────────────────────────────────────────────────────

async def safe_send(ws, msg):
    try:
        await ws.send(json.dumps(msg))
    except Exception:
        pass


async def broadcast(msg, exclude=None):
    all_recipients = connected_clients | spectators
    targets = all_recipients - {exclude} if exclude else all_recipients
    data = json.dumps(msg)
    for ws in list(targets):
        try:
            await ws.send(data)
        except Exception:
            pass


async def broadcast_lobby():
    players_info = []
    for ws in player_order:
        if ws in player_names:
            slot = get_slot(ws)
            players_info.append({
                'name': player_names[ws],
                'color': player_colors.get(ws, '#aaa'),
                'slot': slot,
            })
    await broadcast({
        'type': 'lobby_update',
        'players': [p['name'] for p in players_info],
        'playersInfo': players_info,
        'takenColors': list(player_colors.values()),
        'playerCount': len(player_order),
        'maxPlayers': MAX_PLAYERS,
        'minPlayers': MIN_PLAYERS,
        'canStart': (not game_started and len(player_order) >= MIN_PLAYERS),
        'gameStarted': game_started,
        'room': ROOM_CODE,
    })


async def broadcast_turn():
    if current_turn is None:
        return
    name = player_names.get(current_turn, '?')
    slot = get_slot(current_turn)
    await broadcast({'type': 'turn_update', 'currentTurnName': name, 'slot': slot})


async def handle_client(websocket):
    global host, current_turn, game_started

    await safe_send(websocket, {
        'type': 'lobby_snapshot',
        'rooms': [],
    })

    try:
        raw = await asyncio.wait_for(websocket.recv(), timeout=30)
        msg = json.loads(raw)
    except (asyncio.TimeoutError, websockets.ConnectionClosed, json.JSONDecodeError):
        return

    msg_type = msg.get('type')

    if msg_type == 'spectate':
        await _handle_spectate(websocket, msg)
        return

    if msg_type not in ('join', 'join_room', 'create_room'):
        await safe_send(websocket, {'type': 'error', 'text': 'First message must be join, create_room, or spectate.'})
        return

    chosen_name = (msg.get('name') or 'Player').strip()[:20]
    chosen_color = (msg.get('color') or '').strip()

    if len(player_order) >= MAX_PLAYERS:
        await safe_send(websocket, {'type': 'rejected', 'reason': f'Game is full ({MAX_PLAYERS} max). You can spectate.'})
        return

    if game_started:
        await safe_send(websocket, {'type': 'rejected', 'reason': 'Game already started. You can spectate.'})
        return

    taken_colors = set(player_colors.values())
    if chosen_color not in PALETTE or chosen_color in taken_colors:
        available = [c for c in PALETTE if c not in taken_colors]
        chosen_color = available[0] if available else PALETTE[len(player_order) % len(PALETTE)]

    connected_clients.add(websocket)
    player_order.append(websocket)
    player_number = len(player_order)
    player_names[websocket] = chosen_name
    player_colors[websocket] = chosen_color

    slot = COLORS[player_number - 1]
    slot_map[websocket] = slot

    is_host_player = (player_number == 1)
    if is_host_player:
        host = websocket

    print(f"[join] '{chosen_name}' ({chosen_color}) -> slot {slot}. Total: {len(connected_clients)}")

    await safe_send(websocket, {
        'type': 'welcome',
        'playerName': chosen_name,
        'playerNumber': player_number,
        'slot': slot,
        'isHost': is_host_player,
        'chosenColor': chosen_color,
        'room': ROOM_CODE,
    })
    await broadcast_lobby()
    await broadcast({'type': 'system', 'text': f'{chosen_name} joined the lobby!'}, exclude=websocket)

    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            await handle_message(websocket, msg)
    except websockets.ConnectionClosed:
        pass
    finally:
        await _on_disconnect(websocket)


async def _handle_spectate(websocket, msg):
    chosen_name = (msg.get('name') or 'Spectator').strip()[:20]
    spectators.add(websocket)
    player_names[websocket] = chosen_name
    print(f"[spectate] '{chosen_name}' watching.")

    await safe_send(websocket, {'type': 'spectator_welcome', 'playerName': chosen_name})

    if game_started:
        color_map = {}
        for ws in player_order:
            s = get_slot(ws)
            if s:
                color_map[s] = player_colors.get(ws, '')
        await safe_send(websocket, {'type': 'game_started', 'colorMap': color_map})
        if current_turn:
            await safe_send(websocket, {'type': 'turn_update', 'currentTurnName': player_names.get(current_turn, '?')})

    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if msg.get('type') == 'chat':
                name = player_names.get(websocket, '?')
                await broadcast({'type': 'chat', 'from': f'{name}', 'color': '', 'text': msg.get('text', '')[:200]}, exclude=websocket)
    except websockets.ConnectionClosed:
        pass
    finally:
        spectators.discard(websocket)
        player_names.pop(websocket, None)


async def handle_message(websocket, msg):
    global current_turn, game_started, consecutive_sixes, current_dice, waiting_for_move

    t = msg.get('type')
    name = player_names.get(websocket, '?')
    slot = get_slot(websocket)

    try:
        if t == 'chat':
            await broadcast({'type': 'chat', 'from': name, 'color': player_colors.get(websocket, ''), 'text': msg.get('text', '')[:200]}, exclude=websocket)

        elif t == 'start_game':
            if websocket is not host:
                await safe_send(websocket, {'type': 'error', 'text': 'Only the host can start.'})
            elif len(player_order) < MIN_PLAYERS:
                await safe_send(websocket, {'type': 'error', 'text': f'Need at least {MIN_PLAYERS} players.'})
            elif game_started:
                await safe_send(websocket, {'type': 'error', 'text': 'Game already started.'})
            else:
                game_started = True
                current_turn = player_order[0]
                init_game()

                color_map = {}
                for ws in player_order:
                    s = get_slot(ws)
                    if s:
                        color_map[s] = player_colors.get(ws, '')

                print(f"[game] Started! Players: {list(color_map.keys())}")

                # Build player info for clients
                turn_order_slots = []
                player_info_map = {}
                for ws in player_order:
                    s = get_slot(ws)
                    if s:
                        turn_order_slots.append(s)
                        player_info_map[s] = player_names.get(ws, s)

                await broadcast({
                    'type': 'game_started',
                    'colorMap': color_map,
                    'turnOrder': turn_order_slots,
                    'playerNames': player_info_map,
                })
                await broadcast_turn()

        elif t == 'game_action':
            action = msg.get('action', {})
            action_type = action.get('type')

            if not game_started:
                await safe_send(websocket, {'type': 'error', 'text': 'Game hasn\'t started.'})
                return

            if websocket is not current_turn:
                await safe_send(websocket, {'type': 'error', 'text': 'It\'s not your turn!'})
                return

            if action_type == 'roll_dice':
                dice_value = random.randint(1, 6)

                if dice_value == 6:
                    consecutive_sixes += 1
                else:
                    consecutive_sixes = 0

                current_dice = dice_value
                waiting_for_move = True

                print(f"[dice] '{name}' rolled {dice_value}")
                await broadcast({'type': 'dice_rolled', 'playerName': name, 'dice': dice_value, 'slot': slot})

                # Check if there are legal moves
                moves = get_legal_moves(slot, dice_value, pawns)
                if not moves:
                    waiting_for_move = False
                    print(f"[skip] '{name}' has no legal moves")
                    await broadcast({'type': 'system', 'text': f'{name} has no legal moves'})
                    await _advance_turn()

            elif action_type == 'move_pawn':
                if not waiting_for_move:
                    await safe_send(websocket, {'type': 'error', 'text': 'Roll the dice first.'})
                    return

                pawn_idx = action.get('pawnIndex')
                if pawn_idx is None or not (0 <= pawn_idx < NUM_PAWNS):
                    await safe_send(websocket, {'type': 'error', 'text': 'Invalid pawn index.'})
                    return

                new_pos = action.get('newPos')

                # Validate the move
                moves = get_legal_moves(slot, current_dice, pawns)
                valid_move = None
                for m in moves:
                    if m['pawnIndex'] == pawn_idx:
                        if m['newPos'] == new_pos or (
                            isinstance(m['newPos'], dict) and isinstance(new_pos, dict) and m['newPos'] == new_pos
                        ):
                            valid_move = m
                            break

                if not valid_move:
                    await safe_send(websocket, {'type': 'error', 'text': 'Invalid move.'})
                    return

                old_pos = pawns[slot][pawn_idx]
                capture = valid_move.get('capture')

                if capture:
                    cap_color = capture['color']
                    cap_idx = capture['index']
                    pawns[cap_color][cap_idx] = None
                    print(f"[capture] '{name}' captured {cap_color} pawn {cap_idx}")

                pawns[slot][pawn_idx] = new_pos

                if new_pos == 'finished':
                    scores[slot] = scores.get(slot, 0) + 1
                    print(f"[score] '{name}' finished! Score: {scores[slot]}/{NUM_PAWNS}")

                    if scores[slot] >= NUM_PAWNS:
                        print(f"[win] '{name}' WINS!")
                        await broadcast({'type': 'game_over', 'winner': name, 'winnerSlot': slot})
                        _reset_game_state()
                        return

                print(f"[move] '{name}' pawn {pawn_idx}: {old_pos} -> {new_pos}")
                await broadcast({
                    'type': 'pawn_moved',
                    'color': slot,
                    'pawnIndex': pawn_idx,
                    'newPos': new_pos,
                    'capture': capture,
                })

                waiting_for_move = False
                await _advance_turn()

            elif action_type == 'skip_turn':
                if not waiting_for_move:
                    return
                waiting_for_move = False
                print(f"[skip] '{name}' skipped")
                await broadcast({'type': 'system', 'text': f'{name} skipped turn'})
                await _advance_turn()

        elif t == 'quit':
            quit_name = player_names.get(websocket, 'Someone')
            quit_slot = get_slot(websocket)
            was_turn = (current_turn is websocket)

            player_names.pop(websocket, None)
            player_colors.pop(websocket, None)
            connected_clients.discard(websocket)
            slot_map.pop(websocket, None)
            if websocket in player_order:
                player_order.remove(websocket)

            print(f"[quit] '{quit_name}' left.")
            await broadcast({'type': 'player_quit', 'playerName': quit_name, 'color': quit_slot})

            if len(player_order) <= 1:
                if player_order:
                    survivor = player_names.get(player_order[0], '?')
                    await broadcast({'type': 'system', 'text': f'Only {survivor} remains'})
                _reset_game_state()
                return

            if websocket is host and player_order:
                host_ws = player_order[0]
                await safe_send(host_ws, {'type': 'promoted_to_host'})
                new_name = player_names.get(host_ws, '?')
                await broadcast({'type': 'system', 'text': f'{quit_name} left. {new_name} is now host.'})

            if was_turn:
                await _advance_turn()

            await broadcast_lobby()

        else:
            print(f"[warn] Unknown type '{t}' from '{name}'")

    except Exception as e:
        print(f"[ERROR] '{name}' {t}: {e!r}")


async def _advance_turn():
    """Advance to next player. If next is AI, process AI turns."""
    global current_turn, consecutive_sixes, current_dice, waiting_for_move

    if not player_order:
        current_turn = None
        return

    if current_turn not in player_order:
        current_turn = player_order[0]
    else:
        idx = player_order.index(current_turn)
        current_turn = player_order[(idx + 1) % len(player_order)]

    consecutive_sixes = 0
    current_dice = 0
    waiting_for_move = False

    name = player_names.get(current_turn, '?')
    slot = get_slot(current_turn)
    print(f"[turn] '{name}' ({slot})")

    await broadcast({'type': 'turn_update', 'currentTurnName': name, 'slot': slot})

    # Check if next player is a local player or AI
    # For now, we don't have AI players in multiplayer — all players are human
    # AI handling will be added when we integrate local AI with the server


async def _on_disconnect(websocket):
    global current_turn, game_started, host

    if websocket not in connected_clients and websocket not in player_order:
        return

    name = player_names.pop(websocket, 'Someone')
    player_colors.pop(websocket, None)
    connected_clients.discard(websocket)
    was_turn = (current_turn is websocket)
    quit_slot = slot_map.pop(websocket, None)

    if websocket in player_order:
        player_order.remove(websocket)

    print(f"[disc] '{name}' disconnected.")

    # Broadcast player_quit so clients can update state
    await broadcast({'type': 'player_quit', 'playerName': name, 'color': quit_slot})

    if was_turn:
        await _advance_turn()

    if websocket is host and player_order:
        host = player_order[0]
        new_name = player_names.get(host, '?')
        await safe_send(host, {'type': 'promoted_to_host'})
        await broadcast({'type': 'system', 'text': f'{name} (host) left. {new_name} is now host.'})
    elif connected_clients:
        await broadcast({'type': 'system', 'text': f'{name} disconnected.'})

    if connected_clients:
        await broadcast_lobby()
    else:
        _reset_game_state()


def _reset_game_state():
    global game_started, current_turn, host, consecutive_sixes, current_dice, waiting_for_move
    game_started = False
    current_turn = None
    host = None
    consecutive_sixes = 0
    current_dice = 0
    waiting_for_move = False
    pawns.clear()
    scores.clear()
    slot_map.clear()
    spectators.clear()
    player_order.clear()
    player_names.clear()
    player_colors.clear()
    connected_clients.clear()
    print("[reset] Game state reset.")


# ── Main ──────────────────────────────────────────────────────────────────────

async def main(port):
    print(f"Aggravation WebSocket server on ws://0.0.0.0:{port}")
    print(f"Waiting for {MIN_PLAYERS}-{MAX_PLAYERS} players (+ spectators)...")
    print("Ctrl+C to stop.\n")

    async def _health_check(connection, request):
        from websockets.http11 import Response
        return Response(426, "Upgrade Required", {"Upgrade": "websocket"}, b"")

    loop = asyncio.get_running_loop()
    stop = loop.create_future()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: (stop.set_result(None) if not stop.done() else None))

    async with websockets.serve(handle_client, "0.0.0.0", port, process_request=_health_check):
        await stop

    print("\nServer stopped.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Multiplayer Aggravation Server')
    parser.add_argument('--port', type=int, default=8774, help='Port to listen on')
    args = parser.parse_args()
    asyncio.run(main(args.port))
