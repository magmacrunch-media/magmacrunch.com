"""
WebSocket server — Aggravation multiplayer
Run with:  python server.py [--port PORT]
Requires:  pip install -r arcade/requirements.txt
"""

import argparse
import os
import sys
import random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared', 'multiplayer'))
from server_base import GameServer

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
    if is_safe_square(track_pos):
        return None
    pawns_here = get_pawns_at_track(pawns, track_pos, exclude_color=moving_color)
    opponents = [p for p in pawns_here if p['color'] != moving_color]
    if len(opponents) == 1:
        return opponents[0]
    return None


def is_blockade(pawns, track_pos):
    pawns_here = get_pawns_at_track(pawns, track_pos)
    color_counts = {}
    for p in pawns_here:
        color_counts[p['color']] = color_counts.get(p['color'], 0) + 1
    return any(count >= 2 for count in color_counts.values())


def get_legal_moves(color, dice_value, pawns):
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


def ai_choose_move(color, dice_value, pawns):
    """Simple AI: prefer captures, then entering from yard, then farthest forward."""
    moves = get_legal_moves(color, dice_value, pawns)
    if not moves:
        return None
    captures = [m for m in moves if m.get('capture')]
    if captures:
        return captures[0]
    enters = [m for m in moves if m.get('enterFromYard')]
    if enters:
        return enters[0]
    return max(moves, key=lambda m: m.get('newPos', {}).get('track', 0) if isinstance(m.get('newPos'), dict) else 0)


# ── Game Class ────────────────────────────────────────────────────────────────

class AggravationGame:
    def __init__(self):
        self.player_names = []
        self.room = None
        self.reset()

    def set_player_names(self, names):
        self.player_names = names

    def reset(self):
        self.pawns = {}
        self.scores = {}
        self.current_dice = 0
        self.consecutive_sixes = 0
        self.waiting_for_move = False
        self.phase = 'playing'
        self.current_turn_idx = 0

        # Map player order to board colors
        num_players = len(self.player_names)
        self.sides = {}
        for i, name in enumerate(self.player_names):
            if i < len(COLORS):
                self.sides[name] = COLORS[i]
                self.pawns[COLORS[i]] = [None] * NUM_PAWNS
                self.scores[COLORS[i]] = 0

        # Return custom game_started data
        turn_order = [self.sides[name] for name in self.player_names if name in self.sides]
        player_names_map = {self.sides[name]: name for name in self.player_names if name in self.sides}
        return {
            'turnOrder': turn_order,
            'playerNames': player_names_map,
        }

    def handle_action(self, player_name, action, room=None):
        action_type = action.get('type')

        # Only roll_dice is allowed from any player; other actions require it to be their turn
        if action_type != 'roll_dice' and action_type != 'resign':
            if self.phase != 'playing':
                return None
            # Check it's this player's turn
            if self.current_turn_idx < len(self.player_names):
                current_name = self.player_names[self.current_turn_idx]
                if player_name != current_name:
                    return None

        if action_type == 'roll_dice':
            return self._handle_roll(player_name)
        elif action_type == 'move_pawn':
            return self._handle_move(player_name, action)
        elif action_type == 'skip_turn':
            return self._handle_skip(player_name)
        elif action_type == 'resign':
            return self._handle_resign(player_name)

        return None

    def _handle_roll(self, player_name):
        if self.phase != 'playing':
            return None
        if self._get_side(player_name) is None:
            return None

        dice_value = random.randint(1, 6)

        if dice_value == 6:
            self.consecutive_sixes += 1
        else:
            self.consecutive_sixes = 0

        self.current_dice = dice_value
        self.waiting_for_move = True

        slot = self._get_side(player_name)
        msgs = [{
            'type': 'dice_rolled',
            'playerName': player_name,
            'dice': dice_value,
            'slot': slot,
        }]

        # Check if there are legal moves
        moves = get_legal_moves(slot, dice_value, self.pawns)
        if not moves:
            self.waiting_for_move = False
            msgs.append({'type': 'system', 'text': f'{player_name} has no legal moves'})
            msgs.extend(self._advance_turn())

        return msgs

    def _handle_move(self, player_name, action):
        if self.phase != 'playing':
            return None
        if not self.waiting_for_move:
            return None

        slot = self._get_side(player_name)
        if slot is None:
            return None

        pawn_idx = action.get('pawnIndex')
        if pawn_idx is None or not (0 <= pawn_idx < NUM_PAWNS):
            return None

        new_pos = action.get('newPos')

        # Validate the move
        moves = get_legal_moves(slot, self.current_dice, self.pawns)
        valid_move = None
        for m in moves:
            if m['pawnIndex'] == pawn_idx:
                if m['newPos'] == new_pos or (
                    isinstance(m['newPos'], dict) and isinstance(new_pos, dict) and m['newPos'] == new_pos
                ):
                    valid_move = m
                    break

        if not valid_move:
            return None

        old_pos = self.pawns[slot][pawn_idx]
        capture = valid_move.get('capture')

        if capture:
            cap_color = capture['color']
            cap_idx = capture['index']
            self.pawns[cap_color][cap_idx] = None

        self.pawns[slot][pawn_idx] = new_pos

        msgs = [{
            'type': 'pawn_moved',
            'color': slot,
            'pawnIndex': pawn_idx,
            'newPos': new_pos,
            'capture': capture,
        }]

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

        self.waiting_for_move = False
        msgs.extend(self._advance_turn())
        return msgs

    def _handle_skip(self, player_name):
        if not self.waiting_for_move:
            return None
        self.waiting_for_move = False
        msgs = [{'type': 'system', 'text': f'{player_name} skipped turn'}]
        msgs.extend(self._advance_turn())
        return msgs

    def _handle_resign(self, player_name):
        slot = self._get_side(player_name)
        if slot is None or self.phase != 'playing':
            return None

        # Find winner (anyone who isn't this player)
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

    def _advance_turn(self):
        """Advance to next player's turn. Returns list of messages."""
        self.consecutive_sixes = 0
        self.current_dice = 0
        self.waiting_for_move = False

        if not self.player_names:
            return []

        self.current_turn_idx = (self.current_turn_idx + 1) % len(self.player_names)
        name = self.player_names[self.current_turn_idx]
        slot = self.sides.get(name)

        return [{'type': 'turn_update', 'currentTurnName': name, 'slot': slot}]

    def _get_side(self, player_name):
        return self.sides.get(player_name)

    def get_state(self):
        return {
            'pawns': self.pawns,
            'scores': self.scores,
            'phase': self.phase,
            'sides': self.sides,
            'currentDice': self.current_dice,
            'waitingForMove': self.waiting_for_move,
        }


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Multiplayer Aggravation Server')
    parser.add_argument('--port', type=int, default=8774, help='Port to listen on')
    args = parser.parse_args()

    def game_factory():
        return AggravationGame()

    server = GameServer(
        port=args.port,
        game_factory=game_factory,
        min_players=2,
        max_players=6,
        game_name='Aggravation',
    )
    server.run()
