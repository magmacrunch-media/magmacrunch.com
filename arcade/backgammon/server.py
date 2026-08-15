"""
WebSocket server — Backgammon multiplayer
Run with:  python server.py [--port PORT]
Requires:  pip install -r arcade/requirements.txt
"""

import argparse
import random
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared', 'multiplayer'))
from server_base import GameServer

# ── Constants ────────────────────────────────────────────────────────────────
PLAYER = 'player'
AI = 'ai'

# Board array indices
BAR_PLAYER = 0
BAR_AI = 25
OFF_PLAYER = 26
OFF_AI = 27
ARRAY_SIZE = 28
NUM_POINTS = 24

# Initial position (1-indexed points)
INITIAL_POSITION = {
    1:  (2, PLAYER),
    6:  (5, AI),
    8:  (3, AI),
    12: (5, PLAYER),
    13: (5, AI),
    17: (3, PLAYER),
    19: (5, PLAYER),
    24: (2, AI),
}

# Move types
NORMAL = 'normal'
HIT = 'hit'
BAR = 'bar'
BEAR_OFF = 'bear_off'


def create_initial_board():
    board = [0] * ARRAY_SIZE
    for pt, (count, owner) in INITIAL_POSITION.items():
        board[pt] = count if owner == PLAYER else -count
    return board


def copy_board(board):
    return board[:]


# ── Board Helpers ────────────────────────────────────────────────────────────

def get_owner(board, point):
    if board[point] > 0:
        return PLAYER
    if board[point] < 0:
        return AI
    return None


def get_count(board, point):
    return abs(board[point])


def has_bar(board, player):
    if player == PLAYER:
        return board[BAR_PLAYER] > 0
    return board[BAR_AI] < 0


def can_land(board, point, player):
    val = board[point]
    if val == 0:
        return True
    if player == PLAYER:
        return val >= 0 or abs(val) <= 1
    return val <= 0 or abs(val) <= 1


def all_in_home_board(board, player):
    if has_bar(board, player):
        return False
    if player == PLAYER:
        for i in range(7, 25):
            if board[i] > 0:
                return False
        return True
    else:
        for i in range(1, 19):
            if board[i] < 0:
                return False
        return True


def get_direction(player):
    return -1 if player == PLAYER else 1


def get_home_point(player):
    return 0 if player == PLAYER else 25


# ── Move Validation ──────────────────────────────────────────────────────────

def get_legal_moves_for_die(board, player, die):
    moves = []
    direction = get_direction(player)
    bar_point = BAR_PLAYER if player == PLAYER else BAR_AI

    # If player has checkers on bar, must enter first
    if has_bar(board, player):
        entry_point = 25 - die if player == PLAYER else die
        if can_land(board, entry_point, player):
            move_type = HIT if (board[entry_point] != 0 and get_owner(board, entry_point) != player) else BAR
            moves.append({
                'from': bar_point,
                'to': entry_point,
                'type': move_type,
                'die': die,
            })
        return moves

    # Normal moves
    for from_pt in range(1, 25):
        if get_owner(board, from_pt) != player:
            continue

        to = from_pt + direction * die

        # Bearing off
        if to <= 0 or to >= 25:
            if all_in_home_board(board, player):
                home = get_home_point(player)
                is_exact = (to == home) or (player == PLAYER and to < 0) or (player == AI and to > 25)
                if is_exact:
                    # Check if this is the furthest checker
                    is_furthest = True
                    if player == PLAYER:
                        for check in range(from_pt + 1, 7):
                            if board[check] > 0:
                                is_furthest = False
                                break
                    else:
                        for check in range(from_pt - 1, 0, -1):
                            if board[check] < 0:
                                is_furthest = False
                                break

                    if to == home or is_furthest:
                        moves.append({
                            'from': from_pt,
                            'to': home,
                            'type': BEAR_OFF,
                            'die': die,
                        })
            continue

        # Normal or hit
        if can_land(board, to, player):
            move_type = HIT if (board[to] != 0 and get_owner(board, to) != player) else NORMAL
            moves.append({
                'from': from_pt,
                'to': to,
                'type': move_type,
                'die': die,
            })

    return moves


def get_legal_moves(board, player, die1, die2):
    if die1 == die2:
        return get_doubles_moves(board, player, die1)

    combos = []

    # Try die1 then die2
    moves1 = get_legal_moves_for_die(board, player, die1)
    for m1 in moves1:
        temp = copy_board(board)
        apply_move(temp, m1)
        moves2 = get_legal_moves_for_die(temp, player, die2)
        for m2 in moves2:
            combos.append([m1, m2])

    # Try die2 then die1
    moves2_first = get_legal_moves_for_die(board, player, die2)
    for m2 in moves2_first:
        temp = copy_board(board)
        apply_move(temp, m2)
        moves1_second = get_legal_moves_for_die(temp, player, die1)
        for m1 in moves1_second:
            combo = [m2, m1]
            if not is_duplicate_combo(combos, combo):
                combos.append(combo)

    # If no combos with both, try just one die
    if not combos:
        for m in get_legal_moves_for_die(board, player, die1):
            combos.append([m])
        for m in get_legal_moves_for_die(board, player, die2):
            if not is_duplicate_single(combos, m):
                combos.append([m])

    return combos


def get_doubles_moves(board, player, die):
    combos = []
    for count in range(1, 5):
        generate_doubles_combos(board, player, die, count, [], combos)
    return combos


def generate_doubles_combos(board, player, die, remaining, current, combos):
    if remaining == 0:
        if current:
            combos.append(current[:])
        return

    moves = get_legal_moves_for_die(board, player, die)
    for m in moves:
        temp = copy_board(board)
        apply_move(temp, m)
        current.append(m)
        generate_doubles_combos(temp, player, die, remaining - 1, current, combos)
        current.pop()


def is_duplicate_combo(existing, new_combo):
    for combo in existing:
        if len(combo) != len(new_combo):
            continue
        match = True
        for i in range(len(combo)):
            if combo[i]['from'] != new_combo[i]['from'] or combo[i]['to'] != new_combo[i]['to']:
                match = False
                break
        if match:
            return True
    return False


def is_duplicate_single(existing, move):
    for combo in existing:
        if len(combo) == 1 and combo[0]['from'] == move['from'] and combo[0]['to'] == move['to']:
            return True
    return False


# ── Move Application ─────────────────────────────────────────────────────────

def apply_move(board, move):
    player = PLAYER if board[move['from']] > 0 else AI

    # Remove from source
    board[move['from']] += -1 if player == PLAYER else 1

    # Hit blot
    if move['type'] == HIT:
        hit_player = AI if player == PLAYER else PLAYER
        bar_point = BAR_PLAYER if hit_player == PLAYER else BAR_AI
        board[move['to']] = 0
        board[bar_point] += 1 if hit_player == PLAYER else -1

    # Add to destination
    if move['type'] == BEAR_OFF:
        off_point = OFF_PLAYER if player == PLAYER else OFF_AI
        board[off_point] += 1 if player == PLAYER else -1
    else:
        board[move['to']] += 1 if player == PLAYER else -1


def apply_moves(board, moves):
    for m in moves:
        apply_move(board, m)


def get_winner(board):
    if board[OFF_PLAYER] >= 15:
        return PLAYER
    if board[OFF_AI] <= -15:
        return AI
    return None


# ── Doubling Cube ────────────────────────────────────────────────────────────

def can_double(doubling_cube, doubling_owner, player):
    if doubling_cube >= 64:
        return False
    if doubling_owner is None:
        return True
    return doubling_owner == player


def double(doubling_cube, doubling_owner, player):
    doubling_cube *= 2
    doubling_owner = AI if player == PLAYER else PLAYER
    return doubling_cube, doubling_owner


# ── Game Class ───────────────────────────────────────────────────────────────

class BackgammonGame:
    def __init__(self):
        self.player_names = []
        self.reset()

    def set_player_names(self, names):
        self.player_names = names

    def reset(self):
        self.board = create_initial_board()
        self.sides = {}
        self.phase = 'playing'
        self.current_turn = None
        self.dice = [0, 0]
        self.moves_remaining = []
        self.doubling_cube = 1
        self.doubling_owner = None
        self.winner = None
        self.move_history = []

        if len(self.player_names) >= 1:
            self.sides[PLAYER] = self.player_names[0]
        if len(self.player_names) >= 2:
            self.sides[AI] = self.player_names[1]

        # Roll-off to determine who goes first
        self._roll_off()

    def _roll_off(self):
        p1 = random.randint(1, 6) + random.randint(1, 6)
        p2 = random.randint(1, 6) + random.randint(1, 6)
        while p1 == p2:
            p1 = random.randint(1, 6) + random.randint(1, 6)
            p2 = random.randint(1, 6) + random.randint(1, 6)

        if p1 > p2:
            self.current_turn = PLAYER
        else:
            self.current_turn = AI

        self.dice = [random.randint(1, 6), random.randint(1, 6)]
        self.moves_remaining = get_legal_moves(self.board, self.current_turn, self.dice[0], self.dice[1])

        # If no legal moves, switch turn
        if not self.moves_remaining:
            self._switch_turn()

    def _switch_turn(self):
        self.current_turn = AI if self.current_turn == PLAYER else PLAYER
        self.dice = [random.randint(1, 6), random.randint(1, 6)]
        self.moves_remaining = get_legal_moves(self.board, self.current_turn, self.dice[0], self.dice[1])

        # If no legal moves, switch again
        if not self.moves_remaining:
            self._switch_turn()

    def handle_action(self, player_name, action):
        action_type = action.get('type')

        if action_type == 'move':
            return self._handle_move(player_name, action)
        elif action_type == 'double':
            return self._handle_double(player_name)
        elif action_type == 'accept_double':
            return self._handle_accept_double(player_name)
        elif action_type == 'reject_double':
            return self._handle_reject_double(player_name)
        elif action_type == 'resign':
            return self._handle_resign(player_name)

        return None

    def _handle_move(self, player_name, action):
        if self.phase != 'playing':
            return None

        side = self._get_side(player_name)
        if side is None or side != self.current_turn:
            return None

        move_index = action.get('moveIndex', -1)
        if move_index < 0 or move_index >= len(self.moves_remaining):
            return None

        move_combo = self.moves_remaining[move_index]
        apply_moves(self.board, move_combo)
        self.move_history.append({
            'player': player_name,
            'side': side,
            'moves': move_combo,
            'dice': self.dice[:],
        })

        winner = get_winner(self.board)
        if winner:
            self.winner = winner
            self.phase = 'game_over'
            return {
                'type': 'move_made',
                'player': player_name,
                'side': side,
                'moves': move_combo,
                'state': self.get_state(),
                'gameOver': True,
                'winner': self.sides.get(winner, winner),
                'winnerSide': winner,
            }

        self._switch_turn()

        return {
            'type': 'move_made',
            'player': player_name,
            'side': side,
            'moves': move_combo,
            'state': self.get_state(),
            'nextTurn': self.sides.get(self.current_turn, self.current_turn),
        }

    def _handle_double(self, player_name):
        side = self._get_side(player_name)
        if side is None or side != self.current_turn:
            return None
        if not can_double(self.doubling_cube, self.doubling_owner, side):
            return None

        self.phase = 'doubling'
        return {
            'type': 'double_requested',
            'player': player_name,
            'side': side,
            'state': self.get_state(),
        }

    def _handle_accept_double(self, player_name):
        side = self._get_side(player_name)
        if side is None or self.phase != 'doubling':
            return None

        self.doubling_cube, self.doubling_owner = double(self.doubling_cube, self.doubling_owner, side)
        self.phase = 'playing'

        return {
            'type': 'double_accepted',
            'player': player_name,
            'side': side,
            'state': self.get_state(),
        }

    def _handle_reject_double(self, player_name):
        side = self._get_side(player_name)
        if side is None or self.phase != 'doubling':
            return None

        # The player who rejected loses
        winner = AI if side == PLAYER else PLAYER
        self.winner = winner
        self.phase = 'game_over'

        return {
            'type': 'double_rejected',
            'player': player_name,
            'side': side,
            'state': self.get_state(),
            'gameOver': True,
            'winner': self.sides.get(winner, winner),
            'winnerSide': winner,
        }

    def _handle_resign(self, player_name):
        side = self._get_side(player_name)
        if side is None or self.phase != 'playing':
            return None

        winner = AI if side == PLAYER else PLAYER
        self.winner = winner
        self.phase = 'game_over'

        return {
            'type': 'player_resigned',
            'player': player_name,
            'side': side,
            'state': self.get_state(),
            'gameOver': True,
            'winner': self.sides.get(winner, winner),
            'winnerSide': winner,
        }

    def _get_side(self, player_name):
        for side, name in self.sides.items():
            if name == player_name:
                return side
        return None

    def get_state(self):
        return {
            'board': self.board,
            'currentTurn': self.sides.get(self.current_turn, self.current_turn),
            'currentTurnSide': self.current_turn,
            'dice': self.dice,
            'movesRemaining': len(self.moves_remaining),
            'moves': self.moves_remaining,
            'phase': self.phase,
            'sides': self.sides,
            'doublingCube': self.doubling_cube,
            'doublingOwner': self.doubling_owner,
            'winner': self.sides.get(self.winner, self.winner) if self.winner else None,
            'winnerSide': self.winner,
        }


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Multiplayer Backgammon Server')
    parser.add_argument('--port', type=int, default=8771, help='Port to listen on')
    args = parser.parse_args()

    def game_factory():
        return BackgammonGame()

    server = GameServer(
        port=args.port,
        game_factory=game_factory,
        min_players=2,
        max_players=2,
        game_name='Backgammon',
    )
    server.run()
