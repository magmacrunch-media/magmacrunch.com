"""
WebSocket server — Parchís multiplayer
Run with:  python server.py [--port PORT]
Requires:  pip install websockets
"""

import argparse
import os
import sys
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared', 'multiplayer'))
from server_base import GameServer

# ── Constants ─────────────────────────────────────────────────────────────────

TRACK_SIZE = 68
HOME_SIZE = 8
NUM_PAWNS = 4

SLOT_COLORS = ['red', 'blue', 'green', 'yellow']

# Entry squares on the track for each color
COLOR_ENTRY = {'red': 5, 'blue': 22, 'green': 39, 'yellow': 56}

# Safe squares (entry squares + 4 before entry)
SAFE_SQUARES = [5, 1, 22, 18, 39, 35, 56, 52]


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
    if from_pos is None or from_pos == 'finished':
        return None

    entry = COLOR_ENTRY[color]

    if is_home(from_pos):
        new_home = from_pos['home'] + steps
        if new_home > HOME_SIZE:
            return None
        if new_home == HOME_SIZE:
            return 'finished'
        return {'home': new_home}

    cur = from_pos['track']

    if cur <= entry:
        dist_to_entry = entry - cur
    else:
        dist_to_entry = (TRACK_SIZE - cur) + entry

    if steps > dist_to_entry:
        home_steps = steps - dist_to_entry
        if home_steps > HOME_SIZE:
            return None
        if home_steps == HOME_SIZE:
            return 'finished'
        return {'home': home_steps}

    new_track = (cur + steps) % TRACK_SIZE
    return {'track': new_track}


def get_pawns_at_track(pawn_positions, track_pos, exclude_slot=None):
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


def check_capture(moving_slot, track_pos, pawn_positions):
    if is_safe_square(track_pos):
        return None
    pawns_here = get_pawns_at_track(pawn_positions, track_pos, exclude_slot=moving_slot)
    opponents = [p for p in pawns_here if p['slot'] != moving_slot]
    if len(opponents) == 1:
        return opponents[0]
    return None


def is_blockade(pawn_positions, track_pos):
    pawns_here = get_pawns_at_track(pawn_positions, track_pos)
    color_counts = {}
    for p in pawns_here:
        color_counts[p['slot']] = color_counts.get(p['slot'], 0) + 1
    return any(count >= 2 for count in color_counts.values())


# ── Game Class ────────────────────────────────────────────────────────────────

class ParchisiGame:
    def __init__(self):
        self.player_names = []
        self.room = None
        self.reset()

    def set_player_names(self, names):
        self.player_names = names

    def reset(self):
        num_players = len(self.player_names)
        self.sides = {}
        self.pawn_positions = {}
        self.scores = {}
        self.dice_values = [0, 0]
        self.consecutive_doubles = 0
        self.waiting_for_move = False
        self.phase = 'playing'
        self.current_turn_idx = 0

        for i, name in enumerate(self.player_names):
            if i < len(SLOT_COLORS):
                slot = SLOT_COLORS[i]
                self.sides[name] = slot
                self.pawn_positions[slot] = [None] * NUM_PAWNS
                self.scores[slot] = 0

        return None

    def handle_action(self, player_name, action, room=None):
        action_type = action.get('type')

        # change_color is always allowed
        if action_type == 'change_color':
            return self._handle_change_color(player_name, action)

        # Other actions require it to be the player's turn
        if action_type != 'roll_dice' and action_type != 'resign':
            if self.phase != 'playing':
                return None
            if self.current_turn_idx < len(self.player_names):
                current_name = self.player_names[self.current_turn_idx]
                if player_name != current_name:
                    return None

        if action_type == 'roll_dice':
            return self._handle_roll(player_name)
        elif action_type == 'move_pawn':
            return self._handle_move(player_name, action)
        elif action_type == 'penalty_pawn':
            return self._handle_penalty(player_name, action)
        elif action_type == 'skip_turn':
            return self._handle_skip(player_name)
        elif action_type == 'resign':
            return self._handle_resign(player_name)

        return None

    def _handle_roll(self, player_name):
        if self.phase != 'playing':
            return None
        slot = self._get_slot(player_name)
        if slot is None:
            return None

        dice = [random.randint(1, 6), random.randint(1, 6)]
        is_doubles = dice[0] == dice[1]

        if is_doubles:
            self.consecutive_doubles += 1
        else:
            self.consecutive_doubles = 0

        self.dice_values = dice
        self.waiting_for_move = True

        return [{
            'type': 'dice_rolled',
            'playerName': player_name,
            'dice': dice,
        }]

    def _handle_move(self, player_name, action):
        if self.phase != 'playing':
            return None
        if not self.waiting_for_move:
            return None

        slot = self._get_slot(player_name)
        if slot is None:
            return None

        pawn_idx = action.get('pawnIndex')
        if pawn_idx is None or not (0 <= pawn_idx < NUM_PAWNS):
            return None

        new_pos = action.get('newPos')
        capture = action.get('capture')

        # Handle capture
        if capture and isinstance(capture, dict):
            cap_slot = capture.get('slot') or capture.get('color')
            cap_idx = capture.get('index')
            if cap_slot and cap_idx is not None and cap_slot in self.pawn_positions:
                if cap_idx < len(self.pawn_positions[cap_slot]):
                    self.pawn_positions[cap_slot][cap_idx] = None

        # Move the pawn
        self.pawn_positions[slot][pawn_idx] = new_pos

        msgs = [{
            'type': 'pawn_moved',
            'color': slot,
            'pawnIndex': pawn_idx,
            'newPosition': new_pos,
            'capture': capture,
        }]

        # Check for score
        if new_pos == 'finished':
            self.scores[slot] = self.scores.get(slot, 0) + 1
            if self.scores[slot] >= NUM_PAWNS:
                self.phase = 'game_over'
                msgs.append({
                    'type': 'game_over',
                    'winner': player_name,
                    'winnerSlot': slot,
                })
                return msgs

        # Advance turn (unless doubles — player goes again)
        is_doubles = self.dice_values[0] == self.dice_values[1] and self.dice_values[0] != 0
        self.waiting_for_move = False
        if not is_doubles:
            msgs.extend(self._advance_turn())

        return msgs

    def _handle_penalty(self, player_name, action):
        if self.phase != 'playing':
            return None

        slot = self._get_slot(player_name)
        if slot is None:
            return None

        pawn_idx = action.get('pawnIndex')
        if pawn_idx is None or not (0 <= pawn_idx < NUM_PAWNS):
            return None

        self.pawn_positions[slot][pawn_idx] = None
        self.consecutive_doubles = 0
        self.waiting_for_move = False

        msgs = [{
            'type': 'pawn_moved',
            'color': slot,
            'pawnIndex': pawn_idx,
            'newPosition': None,
            'capture': None,
        }]

        msgs.extend(self._advance_turn())
        return msgs

    def _handle_skip(self, player_name):
        if not self.waiting_for_move:
            return None
        self.waiting_for_move = False
        msgs = [{'type': 'system', 'text': f'{player_name} had no moves — skipping.'}]
        msgs.extend(self._advance_turn())
        return msgs

    def _handle_resign(self, player_name):
        slot = self._get_slot(player_name)
        if slot is None or self.phase != 'playing':
            return None

        winner_name = None
        for name, s in self.sides.items():
            if s != slot:
                winner_name = name
                break

        self.phase = 'game_over'
        return [{
            'type': 'game_over',
            'winner': winner_name or player_name,
            'winnerSlot': self.sides.get(winner_name, slot) if winner_name else slot,
        }]

    def _handle_change_color(self, player_name, action):
        """Handle hex color change (lobby preference, not game logic)."""
        room = self.room
        if not room:
            return None

        new_color = (action.get('color') or '').strip()
        if not new_color:
            return None

        # Find this player's websocket
        player_ws = None
        for ws, name in room.player_names.items():
            if name == player_name:
                player_ws = ws
                break
        if not player_ws:
            return None

        # Check color is valid and not taken
        taken = set(room.player_colors.values()) - {room.player_colors.get(player_ws)}
        if new_color in taken:
            return None

        room.player_colors[player_ws] = new_color

        # Build color map for broadcast
        color_map = {}
        for ws in room.players:
            name = room.player_names.get(ws, '')
            slot = self.sides.get(name)
            if slot:
                color_map[slot] = room.player_colors.get(ws, '')

        return [{
            'type': 'color_changed',
            'playerName': player_name,
            'colorMap': color_map,
        }]

    def _advance_turn(self):
        self.consecutive_doubles = 0
        self.dice_values = [0, 0]
        self.waiting_for_move = False

        if not self.player_names:
            return []

        self.current_turn_idx = (self.current_turn_idx + 1) % len(self.player_names)
        name = self.player_names[self.current_turn_idx]

        return [{'type': 'turn_update', 'currentTurnName': name}]

    def _get_slot(self, player_name):
        return self.sides.get(player_name)

    def get_state(self):
        return {
            'pawnPositions': self.pawn_positions,
            'scores': self.scores,
            'phase': self.phase,
            'sides': self.sides,
            'diceValues': self.dice_values,
            'waitingForMove': self.waiting_for_move,
        }


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Multiplayer Parchís Server')
    parser.add_argument('--port', type=int, default=8773, help='Port to listen on')
    args = parser.parse_args()

    def game_factory():
        return ParchisiGame()

    server = GameServer(
        port=args.port,
        game_factory=game_factory,
        min_players=2,
        max_players=4,
        game_name='Parchisi',
    )
    server.run()
