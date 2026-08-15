"""
WebSocket server — Chinese Checkers multiplayer
Run with:  python server.py [--port PORT]
Requires:  pip install -r arcade/requirements.txt
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared', 'multiplayer'))
from server_base import GameServer

# ── Board Positions ──────────────────────────────────────────────────────────
# All valid board positions as (q, r, s) cube coordinates
POSITIONS = []

# Center hexagon (radius 4)
for q in range(-4, 5):
    for r in range(-4, 5):
        s = -q - r
        if -4 <= s <= 4:
            POSITIONS.append((q, r, s))

# Top triangle (r < -4)
for r in range(-8, -4):
    q_min = -(r + 4)
    for q in range(q_min, 5):
        s = -q - r
        if abs(s) <= 4:
            POSITIONS.append((q, r, s))

# Bottom triangle (r > 4)
for r in range(5, 9):
    q_max = -(r - 4)
    for q in range(-4, q_max + 1):
        s = -q - r
        if abs(s) <= 4:
            POSITIONS.append((q, r, s))

# Top-right triangle (s < -4)
for s in range(-8, -4):
    q_min = -(s + 4)
    for q in range(q_min, 5):
        r = -q - s
        if abs(r) <= 4:
            POSITIONS.append((q, r, s))

# Bottom-left triangle (s > 4)
for s in range(5, 9):
    q_max = -(s - 4)
    for q in range(-4, q_max + 1):
        r = -q - s
        if abs(r) <= 4:
            POSITIONS.append((q, r, s))

# Top-left triangle (q < -4)
for q in range(-8, -4):
    r_min = -(q + 4)
    for r in range(r_min, 5):
        s = -q - r
        if abs(s) <= 4:
            POSITIONS.append((q, r, s))

# Bottom-right triangle (q > 4)
for q in range(5, 9):
    r_max = -(q - 4)
    for r in range(-4, r_max + 1):
        s = -q - r
        if abs(s) <= 4:
            POSITIONS.append((q, r, s))

POSITION_SET = set(POSITIONS)

# Hex directions (6 neighbors)
DIRECTIONS = [
    (1, -1, 0),   # right
    (1, 0, -1),   # bottom-right
    (0, 1, -1),   # bottom-left
    (-1, 1, 0),   # left
    (-1, 0, 1),   # top-left
    (0, -1, 1)    # top-right
]

# ── Player Colors ─────────────────────────────────────────────────────────────
PLAYER_COLORS = [
    '#00f5ff',  # Cyan (player 1)
    '#ff2d78',  # Magenta (player 2)
    '#39ff6e',  # Green (player 3)
    '#ffe03a',  # Yellow (player 4)
    '#ff7c1f',  # Orange (player 5)
    '#c45fff',  # Purple (player 6)
]

# ── Starting Positions (per player) ──────────────────────────────────────────
# Player 0: top triangle (r <= -5)
# Player 1: bottom triangle (r >= 5)
# Player 2: top-right triangle (s <= -5)
# Player 3: bottom-left triangle (s >= 5)
# Player 4: top-left triangle (q <= -5)
# Player 5: bottom-right triangle (q >= 5)

START_POSITIONS = {
    0: [(q, r, s) for q, r, s in POSITIONS if r <= -5],
    1: [(q, r, s) for q, r, s in POSITIONS if r >= 5],
    2: [(q, r, s) for q, r, s in POSITIONS if s <= -5],
    3: [(q, r, s) for q, r, s in POSITIONS if s >= 5],
    4: [(q, r, s) for q, r, s in POSITIONS if q <= -5],
    5: [(q, r, s) for q, r, s in POSITIONS if q >= 5],
}

# Goal positions (opposite triangle for each player)
GOAL_POSITIONS = {
    0: START_POSITIONS[1],  # Player 0 goal: bottom triangle
    1: START_POSITIONS[0],  # Player 1 goal: top triangle
    2: START_POSITIONS[3],  # Player 2 goal: bottom-left triangle
    3: START_POSITIONS[2],  # Player 3 goal: top-right triangle
    4: START_POSITIONS[5],  # Player 4 goal: bottom-right triangle
    5: START_POSITIONS[4],  # Player 5 goal: top-left triangle
}


def pos_key(q, r, s):
    return f"{q},{r},{s}"


def parse_key(key):
    parts = key.split(',')
    return (int(parts[0]), int(parts[1]), int(parts[2]))


def is_valid(q, r, s):
    return (q, r, s) in POSITION_SET


def get_neighbors(q, r, s):
    neighbors = []
    for dq, dr, ds in DIRECTIONS:
        nq, nr, ns = q + dq, r + dr, s + ds
        if is_valid(nq, nr, ns):
            neighbors.append((nq, nr, ns))
    return neighbors


def get_adjacent_moves(cells, q, r, s):
    moves = []
    for nq, nr, ns in get_neighbors(q, r, s):
        if cells.get(pos_key(nq, nr, ns)) is None or cells[pos_key(nq, nr, ns)] == -1:
            moves.append({
                'from': [q, r, s],
                'to': [nq, nr, ns],
                'type': 'adjacent',
                'hops': []
            })
    return moves


def get_hop_moves(cells, q, r, s, player):
    moves = []
    for dq, dr, ds in DIRECTIONS:
        mq, mr, ms = q + dq, r + dr, s + ds
        lq, lr, ls = q + dq * 2, r + dr * 2, s + ds * 2

        if is_valid(mq, mr, ms) and is_valid(lq, lr, ls):
            mid_key = pos_key(mq, mr, ms)
            land_key = pos_key(lq, lr, ls)

            mid_piece = cells.get(mid_key)
            land_piece = cells.get(land_key)

            if mid_piece is not None and mid_piece != -1 and mid_piece != player:
                if land_piece is None or land_piece == -1:
                    moves.append({
                        'from': [q, r, s],
                        'to': [lq, lr, ls],
                        'type': 'hop',
                        'hops': [[mq, mr, ms]]
                    })
    return moves


def get_multi_hop_moves(cells, q, r, s, player):
    all_moves = []
    visited = {pos_key(q, r, s)}

    def find_hops(cq, cr, cs, path):
        for dq, dr, ds in DIRECTIONS:
            mq, mr, ms = cq + dq, cr + dr, cs + ds
            lq, lr, ls = cq + dq * 2, cr + dr * 2, cs + ds * 2
            lkey = pos_key(lq, lr, ls)

            if is_valid(mq, mr, ms) and is_valid(lq, lr, ls):
                mid_key = pos_key(mq, mr, ms)
                mid_piece = cells.get(mid_key)
                land_piece = cells.get(lkey)

                if mid_piece is not None and mid_piece != -1 and mid_piece != player:
                    if (land_piece is None or land_piece == -1) and lkey not in visited:
                        visited.add(lkey)
                        new_path = path + [[mq, mr, ms]]

                        all_moves.append({
                            'from': [q, r, s],
                            'to': [lq, lr, ls],
                            'type': 'multi_hop',
                            'hops': new_path
                        })

                        find_hops(lq, lr, ls, new_path)

    find_hops(q, r, s, [])
    return all_moves


def get_moves_for_piece(cells, q, r, s, player):
    adjacent = get_adjacent_moves(cells, q, r, s)
    hops = get_multi_hop_moves(cells, q, r, s, player)
    return adjacent + hops


def get_legal_moves(cells, player):
    all_moves = []
    for key, piece in cells.items():
        if piece == player:
            q, r, s = parse_key(key)
            moves = get_moves_for_piece(cells, q, r, s, player)
            all_moves.extend(moves)
    return all_moves


def find_move(cells, from_q, from_r, from_s, to_q, to_r, to_s, player):
    moves = get_moves_for_piece(cells, from_q, from_r, from_s, player)
    for m in moves:
        if m['to'] == [to_q, to_r, to_s]:
            return m
    return None


def apply_move(cells, move, player):
    from_key = pos_key(*move['from'])
    to_key = pos_key(*move['to'])

    cells[from_key] = -1
    cells[to_key] = player


def count_pieces_in_goal(cells, player):
    count = 0
    for q, r, s in GOAL_POSITIONS[player]:
        if cells.get(pos_key(q, r, s)) == player:
            count += 1
    return count


def check_winner(cells, player_count):
    for p in range(player_count):
        if count_pieces_in_goal(cells, p) == 10:
            return p
    return None


# ── Game Class ────────────────────────────────────────────────────────────────

class ChineseCheckersGame:
    def __init__(self):
        self.player_names = []
        self.reset()

    def set_player_names(self, names):
        self.player_names = names

    def reset(self):
        self.cells = {}
        self.player_count = len(self.player_names)
        self.current_turn = 0
        self.phase = 'playing'
        self.winner = None
        self.move_history = []

        # Initialize empty board
        for q, r, s in POSITIONS:
            self.cells[pos_key(q, r, s)] = -1

        # Place pieces for each player
        for p in range(self.player_count):
            for q, r, s in START_POSITIONS[p]:
                self.cells[pos_key(q, r, s)] = p

    def handle_action(self, player_name, action):
        action_type = action.get('type')

        if action_type == 'move':
            return self._handle_move(player_name, action)
        elif action_type == 'resign':
            return self._handle_resign(player_name)

        return None

    def _handle_move(self, player_name, action):
        if self.phase != 'playing':
            return None

        player_idx = self._get_player_idx(player_name)
        if player_idx is None or player_idx != self.current_turn:
            return None

        from_pos = action['from']
        to_pos = action['to']

        move = find_move(
            self.cells,
            from_pos[0], from_pos[1], from_pos[2],
            to_pos[0], to_pos[1], to_pos[2],
            player_idx
        )

        if move is None:
            return None

        apply_move(self.cells, move, player_idx)

        self.move_history.append({
            'player': player_name,
            'playerIdx': player_idx,
            'move': move,
        })

        # Check for winner
        winner = check_winner(self.cells, self.player_count)
        if winner is not None:
            self.winner = winner
            self.phase = 'game_over'
            return {
                'type': 'move_made',
                'player': player_name,
                'playerIdx': player_idx,
                'move': move,
                'state': self.get_state(),
                'gameOver': True,
                'winner': self.player_names[winner],
                'winnerIdx': winner,
            }

        # Advance to next player
        self.current_turn = (self.current_turn + 1) % self.player_count

        return {
            'type': 'move_made',
            'player': player_name,
            'playerIdx': player_idx,
            'move': move,
            'state': self.get_state(),
            'nextTurn': self.player_names[self.current_turn],
            'nextTurnIdx': self.current_turn,
        }

    def _handle_resign(self, player_name):
        player_idx = self._get_player_idx(player_name)
        if player_idx is None or self.phase != 'playing':
            return None

        # Find next active player
        self.current_turn = (self.current_turn + 1) % self.player_count
        while self.current_turn == player_idx:
            self.current_turn = (self.current_turn + 1) % self.player_count

        self.phase = 'game_over'
        self.winner = self.current_turn

        return {
            'type': 'player_resigned',
            'player': player_name,
            'playerIdx': player_idx,
            'winner': self.player_names[self.winner],
            'winnerIdx': self.winner,
            'state': self.get_state(),
            'gameOver': True,
        }

    def _get_player_idx(self, player_name):
        for i, name in enumerate(self.player_names):
            if name == player_name:
                return i
        return None

    def get_state(self):
        # Convert cells dict to a serializable format
        board_data = {}
        for key, val in self.cells.items():
            if val != -1:
                board_data[key] = val

        return {
            'board': board_data,
            'currentTurn': self.player_names[self.current_turn] if self.current_turn < len(self.player_names) else None,
            'currentTurnIdx': self.current_turn,
            'playerCount': self.player_count,
            'phase': self.phase,
            'sides': {self.player_names[i]: i for i in range(self.player_count)},
            'winner': self.player_names[self.winner] if self.winner is not None else None,
            'winnerIdx': self.winner,
        }


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Multiplayer Chinese Checkers Server')
    parser.add_argument('--port', type=int, default=8772, help='Port to listen on')
    args = parser.parse_args()

    def game_factory():
        return ChineseCheckersGame()

    server = GameServer(
        port=args.port,
        game_factory=game_factory,
        min_players=2,
        max_players=6,
        game_name='Chinese Checkers',
    )
    server.run()
