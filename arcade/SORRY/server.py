"""
WebSocket server — SORRY! multiplayer
Run with:  python server.py [--port PORT]
Requires:  pip install websockets
"""

import argparse
import asyncio
import json
import logging
import random
import websockets

logging.getLogger("websockets").setLevel(logging.WARNING)

# ── Global game state ──
connected_clients = set()
spectators    = set()   # websockets watching but not playing
player_order  = []    # stable insertion-order list of websockets
player_names  = {}    # websocket -> name string  (players + spectators)
player_colors = {}    # websocket -> chosen hex color string (players only)
host          = None
current_turn  = None  # websocket whose turn it is
game_started  = False

MIN_PLAYERS = 2
MAX_PLAYERS = 4

# ── Preset color palette ──────────────────────────────────────────────────────
# 12 perceptually distinct colors that look good on dark backgrounds.
PALETTE = [
    "#ff2d55",  # Cherry
    "#ff7c1e",  # Orange
    "#ffe135",  # Lemon
    "#39d353",  # Lime
    "#6cd4f5",  # Ice Blue   (N64 ice blue energy)
    "#4059c8",  # Blueberry  (N64 smoke blue)
    "#9b30ff",  # Grape      (N64 atomic purple)
    "#ff69b4",  # Bubblegum
    "#fff5e1",  # Cream
    "#00fa9a",  # Spearmint
    "#ff4f6d",  # Watermelon
    "#7b68ee",  # Bluebell
]

# Slot colors: the four fixed board positions (geometry is baked into board-config.js)
SLOT_COLORS = ['red', 'blue', 'yellow', 'green']

# ── Card deck ──────────────────────────────────────────────────────────────────
CARD_DEFINITIONS = [
    {"value": "1",      "label": "1",      "description": "Move out of Start, or move forward 1."},
    {"value": "2",      "label": "2",      "description": "Move out of Start, or move forward 2. Draw again!"},
    {"value": "3",      "label": "3",      "description": "Move forward 3."},
    {"value": "4",      "label": "4",      "description": "Move backward 4."},
    {"value": "5",      "label": "5",      "description": "Move forward 5."},
    {"value": "7",      "label": "7",      "description": "Move forward 7, or split between two pawns."},
    {"value": "8",      "label": "8",      "description": "Move forward 8."},
    {"value": "10",     "label": "10",     "description": "Move forward 10, or backward 1."},
    {"value": "11",     "label": "11",     "description": "Move forward 11, or swap with any opponent's pawn."},
    {"value": "12",     "label": "12",     "description": "Move forward 12."},
    {"value": "sorry",  "label": "Sorry!", "description": "Take a pawn from Start, place it on any opponent's square!"},
]

CARD_COUNTS = {
    "1": 5, "2": 4, "3": 4, "4": 4, "5": 4,
    "7": 4, "8": 4, "10": 4, "11": 4, "12": 4,
    "sorry": 4,
}

draw_pile    = []
discard_pile = []
current_card = None
pawn_positions = {}

def init_pawns():
    global pawn_positions
    pawn_positions = {c: [None, None, None, None] for c in SLOT_COLORS}

def build_deck():
    deck = []
    for card in CARD_DEFINITIONS:
        for _ in range(CARD_COUNTS[card["value"]]):
            deck.append(card.copy())
    random.shuffle(deck)
    return deck

def draw_card_from_deck():
    global draw_pile, discard_pile
    if not draw_pile:
        draw_pile = discard_pile[:]
        discard_pile = []
        random.shuffle(draw_pile)
        print(f"  [deck] Reshuffled ({len(draw_pile)} cards).")
    card = draw_pile.pop()
    discard_pile.append(card)
    return card


async def handle_client(websocket):
    global host, current_turn, game_started

    # ── Send an immediate lobby snapshot so new visitors see the real player count
    # and game-in-progress state BEFORE they type their name and join. ──
    players_info = []
    for ws in player_order:
        if ws in player_names:
            slot = SLOT_COLORS[player_order.index(ws)] if player_order.index(ws) < len(SLOT_COLORS) else None
            players_info.append({
                "name":  player_names[ws],
                "color": player_colors.get(ws, "#aaa"),
                "slot":  slot,
            })
    try:
        await safe_send(websocket, {
            "type":        "lobby_update",
            "players":     [p["name"] for p in players_info],
            "playersInfo": players_info,
            "takenColors": list(player_colors.values()),
            "playerCount": len(player_order),
            "maxPlayers":  MAX_PLAYERS,
            "minPlayers":  MIN_PLAYERS,
            "canStart":    (not game_started and len(player_order) >= MIN_PLAYERS),
            "gameStarted": game_started,
        })
    except Exception:
        return  # client already gone

    # ── Wait for the first message (join or spectate) ──
    try:
        raw = await asyncio.wait_for(websocket.recv(), timeout=30)
        msg = json.loads(raw)
    except (asyncio.TimeoutError, websockets.exceptions.ConnectionClosed, json.JSONDecodeError):
        return

    msg_type = msg.get("type")

    if msg_type == "spectate":
        await _handle_spectate(websocket, msg)
        return

    if msg_type == "join_late":
        await _handle_late_join(websocket, msg)
        return

    if msg_type != "join":
        await safe_send(websocket, {"type": "error", "text": "First message must be a join or spectate."})
        return

    chosen_name  = (msg.get("name") or "Player").strip()[:20]
    chosen_color = (msg.get("color") or "").strip()

    if len(player_order) >= MAX_PLAYERS:
        # Game is full — offer spectating instead of a hard reject
        await safe_send(websocket, {
            "type":   "rejected",
            "reason": f"Game is full ({MAX_PLAYERS} players max). You can rejoin as a spectator.",
        })
        return

    if game_started:
        await safe_send(websocket, {
            "type":   "rejected",
            "reason": "Game has already started. You can rejoin as a spectator.",
        })
        return

    # ── Resolve color — auto-assign if not provided or already taken ──
    taken_colors = set(player_colors.values())
    if chosen_color not in PALETTE or chosen_color in taken_colors:
        available = [c for c in PALETTE if c not in taken_colors]
        chosen_color = available[0] if available else PALETTE[len(player_order) % len(PALETTE)]

    # ── Register player ──
    connected_clients.add(websocket)
    player_order.append(websocket)
    player_number = len(player_order)
    player_names[websocket]  = chosen_name
    player_colors[websocket] = chosen_color
    is_host = (player_number == 1)
    if is_host:
        host = websocket

    print(f"[join] '{chosen_name}' ({chosen_color}) → player {player_number}. Total: {len(connected_clients)}")

    await safe_send(websocket, {
        "type":         "welcome",
        "playerName":   chosen_name,
        "playerNumber": player_number,
        "slot":         SLOT_COLORS[player_number - 1] if player_number <= len(SLOT_COLORS) else None,
        "isHost":       is_host,
        "chosenColor":  chosen_color,   # the hex this player actually got assigned
    })
    await broadcast_lobby()
    await broadcast({"type": "system", "text": f"{chosen_name} joined the lobby!"}, exclude=websocket)

    # ── Main message loop ──
    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                print(f"[warn] Bad JSON from '{player_names.get(websocket, '?')}': {raw[:80]}")
                continue

            await handle_message(websocket, msg)

    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"[ERROR] Unexpected exception in handler for '{player_names.get(websocket, '?')}': {e!r}")
    finally:
        await _on_disconnect(websocket)


async def _handle_spectate(websocket, msg):
    """Register a spectator and run their message loop (chat only)."""
    chosen_name = (msg.get("name") or "Spectator").strip()[:20]

    spectators.add(websocket)
    player_names[websocket] = chosen_name
    print(f"[spectate] '{chosen_name}' joined as spectator. Spectators: {len(spectators)}")

    await safe_send(websocket, {
        "type":       "spectator_welcome",
        "playerName": chosen_name,
    })
    await broadcast({"type": "system", "text": f"👁 {chosen_name} is now spectating."}, exclude=websocket)

    # Send current game state summary so they can see the board
    if game_started:
        # Rebuild colorMap for the spectator
        color_map = {}
        for i, ws in enumerate(player_order):
            slot = SLOT_COLORS[i] if i < len(SLOT_COLORS) else None
            if slot:
                color_map[slot] = player_colors[ws]
        await safe_send(websocket, {"type": "game_started", "colorMap": color_map})
        if current_turn:
            await safe_send(websocket, {
                "type":            "turn_update",
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
                await broadcast({"type": "chat", "from": f"{name} 👁", "color": "", "text": msg.get("text", "")},
                                exclude=websocket)
            # Spectators are silently ignored for all other message types

    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        spectators.discard(websocket)
        name = player_names.pop(websocket, "Spectator")
        print(f"[spectate] '{name}' stopped watching.")


async def _handle_late_join(websocket, msg):
    """Let a player join a game already in progress.
    They get an empty pawn set (all pawns at Start) and join at the end of turn order.
    The server sends them a full game_started + pawn_sync + turn_update so they can render.
    """
    global host

    if len(player_order) >= MAX_PLAYERS:
        await safe_send(websocket, {
            "type": "rejected",
            "reason": f"Game is full ({MAX_PLAYERS} players max). Try spectating!"
        })
        return

    chosen_name  = (msg.get("name") or "Player").strip()[:20]
    chosen_color = (msg.get("color") or "").strip()

    taken_colors = set(player_colors.values())
    if chosen_color not in PALETTE or chosen_color in taken_colors:
        available = [c for c in PALETTE if c not in taken_colors]
        chosen_color = available[0] if available else PALETTE[len(player_order) % len(PALETTE)]

    connected_clients.add(websocket)
    player_order.append(websocket)
    player_number = len(player_order)
    player_names[websocket]  = chosen_name
    player_colors[websocket] = chosen_color

    # Initialise pawns at Start for the new player's slot
    slot = SLOT_COLORS[player_order.index(websocket)] if player_order.index(websocket) < len(SLOT_COLORS) else None
    if slot and slot not in pawn_positions:
        pawn_positions[slot] = [None, None, None, None]

    print(f"[late-join] '{chosen_name}' joined mid-game as player {player_number} ({chosen_color})")

    # Rebuild colorMap with new player included
    color_map = {}
    for i, ws in enumerate(player_order):
        s = SLOT_COLORS[i] if i < len(SLOT_COLORS) else None
        if s:
            color_map[s] = player_colors[ws]

    # Welcome the new player — include colorMap so they can theme immediately
    await safe_send(websocket, {
        "type":         "welcome",
        "playerName":   chosen_name,
        "playerNumber": player_number,
        "slot":         slot,
        "isHost":       False,
        "chosenColor":  chosen_color,   # hex this player actually got assigned
    })
    # Send full game state so they can render the board
    await safe_send(websocket, {"type": "game_started", "colorMap": color_map})

    # Replay all current pawn positions
    for pawn_color, positions in pawn_positions.items():
        for idx, pos in enumerate(positions):
            await safe_send(websocket, {
                "type":        "pawn_moved",
                "color":       pawn_color,
                "pawnIndex":   idx,
                "pawnId":      f"{pawn_color}-{idx}",
                "newPosition": pos,
                "lapped":      False,
            })

    # Send current turn
    if current_turn:
        await safe_send(websocket, {
            "type":            "turn_update",
            "currentTurnName": player_names.get(current_turn, "?"),
        })

    # Tell everyone else
    await broadcast({
        "type": "system",
        "text": f"⚡ {chosen_name} joined the game late!"
    }, exclude=websocket)
    # Broadcast updated colorMap so existing players see the new slot color
    await broadcast({"type": "game_started", "colorMap": color_map}, exclude=websocket)
    await broadcast_lobby()

    # Main message loop — same as a normal player
    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                print(f"[warn] Bad JSON from '{chosen_name}': {raw[:80]}")
                continue
            await handle_message(websocket, msg)
    except websockets.exceptions.ConnectionClosed:
        pass
    except Exception as e:
        print(f"[ERROR] Late-join handler for '{chosen_name}': {e!r}")
    finally:
        await _on_disconnect(websocket)


async def handle_message(websocket, msg):
    """Process one message from a connected player. Never raises."""
    global current_turn, current_card, game_started, host
    # (host is declared here so the quit_game branch can reassign it)

    t    = msg.get("type")
    name = player_names.get(websocket, "?")

    try:
        if t == "chat":
            await broadcast({
                "type": "chat",
                "from": name,
                "color": player_colors.get(websocket, ""),
                "text": msg.get("text", ""),
            }, exclude=websocket)

        elif t == "start_game":
            if websocket is not host:
                await safe_send(websocket, {"type": "error", "text": "Only the host can start."})
            elif len(connected_clients) < MIN_PLAYERS:
                await safe_send(websocket, {"type": "error", "text": f"Need at least {MIN_PLAYERS} players."})
            elif game_started:
                await safe_send(websocket, {"type": "error", "text": "Game already started."})
            else:
                game_started = True
                current_turn = player_order[0]
                current_card = None
                draw_pile[:] = build_deck()
                discard_pile.clear()
                init_pawns()

                # Build colorMap: slot ('red','blue',...) → chosen hex
                color_map = {}
                for i, ws in enumerate(player_order):
                    slot = SLOT_COLORS[i] if i < len(SLOT_COLORS) else None
                    if slot:
                        color_map[slot] = player_colors[ws]

                print(f"[game] Started! colorMap={color_map}. First turn: '{player_names[current_turn]}'")
                await broadcast({"type": "game_started", "colorMap": color_map})
                await broadcast_turn()

        elif t == "draw_card":
            if not game_started:
                await safe_send(websocket, {"type": "error", "text": "Game hasn't started yet."})
            elif websocket is not current_turn:
                ct_name = player_names.get(current_turn, "?")
                print(f"[warn] '{name}' tried to draw but it's {ct_name}'s turn.")
                await safe_send(websocket, {"type": "error", "text": "It's not your turn!"})
            elif current_card is not None:
                await safe_send(websocket, {"type": "error", "text": "You already drew a card — move a pawn first."})
            else:
                current_card = draw_card_from_deck()
                print(f"[draw] '{name}' drew: {current_card['label']} ({len(draw_pile)} left)")
                await broadcast({
                    "type":  "card_drawn",
                    "from":  name,
                    "card":  current_card,
                    "cardsRemaining": len(draw_pile),
                })

        elif t == "move_pawn":
            if not game_started:
                await safe_send(websocket, {"type": "error", "text": "Game hasn't started."})
            elif websocket is not current_turn:
                await safe_send(websocket, {"type": "error", "text": "It's not your turn!"})
            elif current_card is None:
                await safe_send(websocket, {"type": "error", "text": "Draw a card first."})
            else:
                color        = msg.get("color")
                pawn_idx     = msg.get("pawnIndex")
                new_pos      = msg.get("newPosition")
                lapped       = msg.get("lapped", False)
                player_color = _color_for_player(websocket)

                if color != player_color:
                    await safe_send(websocket, {"type": "error", "text": "That's not your pawn."})
                elif pawn_idx is None or not isinstance(pawn_idx, int) or not (0 <= pawn_idx <= 3):
                    await safe_send(websocket, {"type": "error", "text": "Invalid pawn index."})
                else:
                    pawn_positions[color][pawn_idx] = new_pos
                    card_value = current_card["value"]
                    print(f"[move] '{name}' moved {color} pawn {pawn_idx} → {new_pos} (card {card_value})")
                    await broadcast({
                        "type":        "pawn_moved",
                        "color":       color,
                        "pawnIndex":   pawn_idx,
                        "pawnId":      f"{color}-{pawn_idx}",
                        "newPosition": new_pos,
                        "lapped":      lapped,
                    })
                    current_card = None
                    if card_value != "2":
                        advance_turn()
                    print(f"  → turn: '{player_names.get(current_turn, '?')}'")
                    await broadcast_turn()

        elif t == "move_pawn_partial":
            # Card 7 split — first pawn moves without consuming the card or ending turn.
            if not game_started:
                await safe_send(websocket, {"type": "error", "text": "Game hasn't started."})
            elif websocket is not current_turn:
                await safe_send(websocket, {"type": "error", "text": "It's not your turn!"})
            elif current_card is None:
                await safe_send(websocket, {"type": "error", "text": "Draw a card first."})
            elif current_card.get("value") != "7":
                await safe_send(websocket, {"type": "error", "text": "move_pawn_partial is only for card 7."})
            else:
                color        = msg.get("color")
                pawn_idx     = msg.get("pawnIndex")
                new_pos      = msg.get("newPosition")
                lapped       = msg.get("lapped", False)
                player_color = _color_for_player(websocket)

                if color != player_color:
                    await safe_send(websocket, {"type": "error", "text": "That's not your pawn."})
                elif pawn_idx is None or not isinstance(pawn_idx, int) or not (0 <= pawn_idx <= 3):
                    await safe_send(websocket, {"type": "error", "text": "Invalid pawn index."})
                else:
                    pawn_positions[color][pawn_idx] = new_pos
                    print(f"[split] '{name}' partial move {color} pawn {pawn_idx} → {new_pos}")
                    await broadcast({
                        "type":        "pawn_moved",
                        "color":       color,
                        "pawnIndex":   pawn_idx,
                        "pawnId":      f"{color}-{pawn_idx}",
                        "newPosition": new_pos,
                        "lapped":      lapped,
                    })
                    # Card is NOT consumed — the second move_pawn will end the turn

        elif t == "bump_pawn":
            if not game_started:
                await safe_send(websocket, {"type": "error", "text": "Game hasn't started."})
            elif websocket is not current_turn:
                await safe_send(websocket, {"type": "error", "text": "It's not your turn!"})
            elif current_card is None:
                await safe_send(websocket, {"type": "error", "text": "Draw a card first."})
            else:
                bump_color = msg.get("color")
                bump_idx   = msg.get("pawnIndex")
                if bump_color is None or bump_idx is None:
                    await safe_send(websocket, {"type": "error", "text": "Invalid bump_pawn message."})
                elif bump_color == _color_for_player(websocket):
                    await safe_send(websocket, {"type": "error", "text": "Cannot bump your own pawn."})
                else:
                    pawn_positions[bump_color][bump_idx] = None
                    print(f"[bump] '{name}' bumped {bump_color} pawn {bump_idx} back to Start")
                    await broadcast({
                        "type":        "pawn_moved",
                        "color":       bump_color,
                        "pawnIndex":   bump_idx,
                        "pawnId":      f"{bump_color}-{bump_idx}",
                        "newPosition": None,
                        "lapped":      False,
                    })

        elif t == "swap_pawn":
            if not game_started:
                await safe_send(websocket, {"type": "error", "text": "Game hasn't started."})
            elif websocket is not current_turn:
                await safe_send(websocket, {"type": "error", "text": "It's not your turn!"})
            elif current_card is None:
                await safe_send(websocket, {"type": "error", "text": "Draw a card first."})
            else:
                swap_color = msg.get("color")
                swap_idx   = msg.get("pawnIndex")
                new_pos    = msg.get("newPosition")
                opp_lapped = msg.get("oppLapped", False)
                player_color = _color_for_player(websocket)
                if swap_color is None or swap_idx is None or new_pos is None:
                    await safe_send(websocket, {"type": "error", "text": "Invalid swap_pawn message."})
                elif swap_color == player_color:
                    await safe_send(websocket, {"type": "error", "text": "Cannot swap with your own pawn."})
                else:
                    pawn_positions[swap_color][swap_idx] = new_pos
                    print(f"[swap] '{name}' swapped {swap_color} pawn {swap_idx} → {new_pos}")
                    await broadcast({
                        "type":        "pawn_moved",
                        "color":       swap_color,
                        "pawnIndex":   swap_idx,
                        "pawnId":      f"{swap_color}-{swap_idx}",
                        "newPosition": new_pos,
                        "lapped":      opp_lapped,
                    })

        elif t == "change_color":
            # Allow a joined player to switch their display color at any time.
            new_color = (msg.get("color") or "").strip()
            if new_color not in PALETTE:
                await safe_send(websocket, {"type": "error", "text": "Invalid color."})
            else:
                taken = set(player_colors.values()) - {player_colors.get(websocket)}
                if new_color in taken:
                    await safe_send(websocket, {"type": "error", "text": "That color is already taken."})
                else:
                    old_color = player_colors.get(websocket)
                    player_colors[websocket] = new_color
                    print(f"[color] '{name}' changed color: {old_color} → {new_color}")
                    # Rebuild colorMap and broadcast to everyone
                    color_map = {}
                    for i, ws in enumerate(player_order):
                        slot = SLOT_COLORS[i] if i < len(SLOT_COLORS) else None
                        if slot:
                            color_map[slot] = player_colors[ws]
                    await broadcast({
                        "type":      "color_changed",
                        "playerName": name,
                        "colorMap":  color_map,
                    })
                    # Always broadcast lobby so player-list pip colors stay current
                    await broadcast_lobby()

        elif t == "skip_turn":
            if websocket is not current_turn:
                await safe_send(websocket, {"type": "error", "text": "It's not your turn!"})
            elif current_card is None:
                await safe_send(websocket, {"type": "error", "text": "No card drawn to skip."})
            else:
                skipped_label = current_card["label"]
                current_card = None
                print(f"[skip] '{name}' skipped — no moves on {skipped_label}")
                await broadcast({"type": "system", "text": f"{name} drew {skipped_label} but had no moves — skipping."})
                advance_turn()
                print(f"  → turn: '{player_names.get(current_turn, '?')}'")
                await broadcast_turn()

        elif t == "quit_game":
            # Player voluntarily leaves mid-game.
            # We handle cleanup here (before the websocket actually closes) so we
            # can send a tidy player_quit broadcast with the player's color.
            quit_name  = player_names.get(websocket, "Someone")
            quit_color = _color_for_player(websocket)
            print(f"[quit] '{quit_name}' ({quit_color}) quit the game.")

            was_their_turn = (current_turn is websocket)

            # Remove from active structures (mirrors _on_disconnect, but we
            # broadcast player_quit instead of the generic system message)
            player_names.pop(websocket, None)
            player_colors.pop(websocket, None)
            connected_clients.discard(websocket)
            if websocket in player_order:
                player_order.remove(websocket)

            # Notify everyone — client will remove pawns from the board
            await broadcast({
                "type":       "player_quit",
                "playerName": quit_name,
                "color":      quit_color,
            })

            # If only one player remains, end the game
            if len(player_order) <= 1:
                if player_order:
                    survivor_name = player_names.get(player_order[0], "?")
                    await broadcast({"type": "system",
                                     "text": f"Only {survivor_name} remains — game over!"})
                _reset_game_state()
                return

            # Reassign host if needed
            if websocket is host:
                host = player_order[0]
                new_host_name = player_names.get(host, "someone")
                await safe_send(host, {"type": "promoted_to_host"})
                await broadcast({"type": "system",
                                 "text": f"{quit_name} (host) left. {new_host_name} is now the host."})

            if was_their_turn:
                advance_turn()
                await broadcast_turn()

            await broadcast_lobby()
            # Close the websocket cleanly — _on_disconnect will see it's already
            # removed from player_order and skip the double-cleanup.
            await websocket.close()

        else:
            print(f"[warn] Unknown message type '{t}' from '{name}'")

    except Exception as e:
        print(f"[ERROR] handle_message '{t}' from '{name}': {e!r}")


async def _on_disconnect(websocket):
    """Clean up when a player's websocket closes."""
    global host, current_turn, game_started

    # If already removed by quit_game handler, nothing more to do
    if websocket not in connected_clients and websocket not in player_order:
        return

    name = player_names.pop(websocket, "Someone")
    player_colors.pop(websocket, None)
    connected_clients.discard(websocket)
    was_current_turn = (current_turn is websocket)

    if websocket in player_order:
        player_order.remove(websocket)

    print(f"[disc] '{name}' disconnected. Remaining: {len(connected_clients)}")

    if was_current_turn:
        advance_turn()

    if websocket is host and connected_clients:
        host = list(connected_clients)[0]
        new_name = player_names.get(host, "someone")
        await safe_send(host, {"type": "promoted_to_host"})
        await broadcast({"type": "system", "text": f"{name} (host) left. {new_name} is now the host."})
    elif connected_clients:
        await broadcast({"type": "system", "text": f"{name} left. ({len(connected_clients)} player(s) remaining)"})

    if connected_clients:
        await broadcast_lobby()
        if game_started:
            await broadcast_turn()
    else:
        # All players gone — reset game state so a new game can start fresh
        _reset_game_state()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _reset_game_state():
    """Reset all mutable game state so a new game can start after everyone leaves."""
    global game_started, current_turn, current_card, host
    game_started  = False
    current_turn  = None
    current_card  = None
    host          = None
    draw_pile.clear()
    discard_pile.clear()
    pawn_positions.clear()
    spectators.clear()
    # player_order, player_names, player_colors are already cleared by _on_disconnect
    print("[reset] Game state reset — ready for new players.")


def advance_turn():
    global current_turn
    if not player_order:
        current_turn = None
        return
    if current_turn not in player_order:
        current_turn = player_order[0]
        return
    idx = player_order.index(current_turn)
    current_turn = player_order[(idx + 1) % len(player_order)]


def _color_for_player(websocket):
    """Returns the board slot color ('red','blue','yellow','green') for this player."""
    try:
        idx = player_order.index(websocket)
        return SLOT_COLORS[idx] if idx < len(SLOT_COLORS) else None
    except ValueError:
        return None


async def safe_send(websocket, msg_dict):
    """Send to a single client; swallow errors if the connection is gone."""
    try:
        await websocket.send(json.dumps(msg_dict))
    except Exception as e:
        print(f"[warn] safe_send failed: {e!r}")


async def broadcast(msg_dict, exclude=None):
    """Send to all connected players AND spectators; individual failures are logged, not raised."""
    all_recipients = connected_clients | spectators
    if not all_recipients:
        return
    data    = json.dumps(msg_dict)
    targets = all_recipients - {exclude} if exclude else set(all_recipients)
    if not targets:
        return
    results = await asyncio.gather(*[c.send(data) for c in targets], return_exceptions=True)
    for ws, result in zip(targets, results):
        if isinstance(result, Exception):
            print(f"[warn] broadcast failed to '{player_names.get(ws, '?')}': {result!r}")


async def broadcast_lobby():
    """Broadcast current lobby state including each player's chosen color and slot."""
    players_info = []
    for ws in player_order:
        if ws in player_names:
            slot = SLOT_COLORS[player_order.index(ws)] if player_order.index(ws) < len(SLOT_COLORS) else None
            players_info.append({
                "name":  player_names[ws],
                "color": player_colors.get(ws, "#aaa"),
                "slot":  slot,
            })

    await broadcast({
        "type":        "lobby_update",
        "players":     [p["name"] for p in players_info],
        "playersInfo": players_info,   # name + chosen color hex + slot for each player
        "takenColors": list(player_colors.values()),  # which hex values are taken
        "playerCount": len(player_order),
        "maxPlayers":  MAX_PLAYERS,
        "minPlayers":  MIN_PLAYERS,
        "canStart":    (not game_started and len(player_order) >= MIN_PLAYERS),
        "gameStarted": game_started,
    })


async def broadcast_turn():
    if current_turn is None:
        return
    name = player_names.get(current_turn, "?")
    await broadcast({"type": "turn_update", "currentTurnName": name})


async def main(port):
    import signal
    print(f"WebSocket server on ws://0.0.0.0:{port}")
    print(f"Waiting for {MIN_PLAYERS}–{MAX_PLAYERS} players (+ spectators)…")
    print("Ctrl+C to stop.\n")

    async def _health_check(connection, request):
        from websockets.http11 import Response
        if request.headers.get("Upgrade", "").lower() == "websocket":
            return None
        return Response(426, "Upgrade Required", {"Upgrade": "websocket"}, b"")

    loop = asyncio.get_running_loop()
    stop = loop.create_future()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, lambda: (stop.set_result(None) if not stop.done() else None))

    async with websockets.serve(handle_client, "0.0.0.0", port, process_request=_health_check):
        await stop

    print("\nServer stopped cleanly.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Multiplayer SORRY! Server')
    parser.add_argument('--port', type=int, default=8765, help='Port to listen on')
    args = parser.parse_args()
    asyncio.run(main(args.port))
