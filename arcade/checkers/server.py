"""
WebSocket server — Checkers multiplayer
Run with:  python server.py [--port PORT]
Requires:  pip install websockets
"""

import argparse
import asyncio
import json
import random
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared', 'multiplayer'))
from server_base import GameServer

# ── Constants ────────────────────────────────────────────────────────────────
EMPTY = 0
RED_PIECE = 1
BLACK_PIECE = -1
RED_KING = 2
BLACK_KING = -2
BOARD_SIZE = 8

# ── Initial Board ────────────────────────────────────────────────────────────
INITIAL_BOARD = [
    [ 0, -1,  0, -1,  0, -1,  0, -1],
    [-1,  0, -1,  0, -1,  0, -1,  0],
    [ 0, -1,  0, -1,  0, -1,  0, -1],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0,  0,  0],
    [ 1,  0,  1,  0,  1,  0,  1,  0],
    [ 0,  1,  0,  1,  0,  1,  0,  1],
    [ 1,  0,  1,  0,  1,  0,  1,  0]
]


def copy_board(board):
    return [row[:] for row in board]


def is_red(piece):
    return piece == RED_PIECE or piece == RED_KING


def is_black(piece):
    return piece == BLACK_PIECE or piece == BLACK_KING


def is_king(piece):
    return piece == RED_KING or piece == BLACK_KING


def get_owner(piece):
    if is_red(piece):
        return 'red'
    if is_black(piece):
        return 'black'
    return None


def get_direction(player):
    return -1 if player == 'red' else 1


def get_king_row(player):
    return 0 if player == 'red' else BOARD_SIZE - 1


def in_bounds(row, col):
    return 0 <= row < BOARD_SIZE and 0 <= col < BOARD_SIZE


# ── Move Generation ──────────────────────────────────────────────────────────

def get_moves_for_piece(board, row, col):
    piece = board[row][col]
    if piece == EMPTY:
        return []

    player = get_owner(piece)
    moves = []
    jumps = []

    if is_king(piece):
        directions = [(-1, -1), (-1, 1), (1, -1), (1, 1)]
    else:
        d = get_direction(player)
        directions = [(d, -1), (d, 1)]

    for dr, dc in directions:
        nr, nc = row + dr, col + dc
        if in_bounds(nr, nc) and board[nr][nc] == EMPTY:
            moves.append({
                'from': {'row': row, 'col': col},
                'to': {'row': nr, 'col': nc},
                'type': 'normal',
                'jumps': []
            })

        jr, jc = row + dr * 2, col + dc * 2
        if in_bounds(jr, jc) and board[jr][jc] == EMPTY:
            mid = board[nr][nc]
            if mid != EMPTY and get_owner(mid) != player:
                jump_move = {
                    'from': {'row': row, 'col': col},
                    'to': {'row': jr, 'col': jc},
                    'type': 'jump',
                    'jumped': [{'row': nr, 'col': nc}],
                }
                jumps.append(jump_move)

    for jump in list(jumps):
        more = get_multi_jumps(board, jump['to']['row'], jump['to']['col'],
                               [jump['from']], jump['jumped'])
        jumps.extend(more)

    if jumps:
        return jumps
    return moves


def get_multi_jumps(board, row, col, visited, jumped_pieces):
    piece = board[row][col]
    if piece == EMPTY:
        return []

    player = get_owner(piece)
    result = []

    if is_king(piece):
        directions = [(-1, -1), (-1, 1), (1, -1), (1, 1)]
    else:
        d = get_direction(player)
        directions = [(d, -1), (d, 1)]

    for dr, dc in directions:
        mid_r, mid_c = row + dr, col + dc
        jr, jc = row + dr * 2, col + dc * 2

        if in_bounds(jr, jc) and board[jr][jc] == EMPTY:
            mid = board[mid_r][mid_c]
            if mid != EMPTY and get_owner(mid) != player:
                already = any(p['row'] == mid_r and p['col'] == mid_c for p in jumped_pieces)
                if not already:
                    new_jump = {
                        'from': visited[0],
                        'to': {'row': jr, 'col': jc},
                        'type': 'multi_jump',
                        'jumped': jumped_pieces + [{'row': mid_r, 'col': mid_c}],
                    }
                    result.append(new_jump)
                    more = get_multi_jumps(board, jr, jc, visited + [{'row': jr, 'col': jc}],
                                           jumped_pieces + [{'row': mid_r, 'col': mid_c}])
                    result.extend(more)

    return result


def get_legal_moves(board, player):
    all_moves = []
    all_jumps = []

    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            piece = board[r][c]
            if piece != EMPTY and get_owner(piece) == player:
                for m in get_moves_for_piece(board, r, c):
                    if m['type'] in ('jump', 'multi_jump'):
                        all_jumps.append(m)
                    else:
                        all_moves.append(m)

    return all_jumps if all_jumps else all_moves


def find_move(board, from_row, from_col, to_row, to_col):
    moves = get_moves_for_piece(board, from_row, from_col)
    for m in moves:
        if m['to']['row'] == to_row and m['to']['col'] == to_col:
            return m
    return None


def apply_move(board, move):
    piece = board[move['from']['row']][move['from']['col']]
    player = get_owner(piece)

    board[move['from']['row']][move['from']['col']] = EMPTY

    for j in move.get('jumped', []):
        board[j['row']][j['col']] = EMPTY

    board[move['to']['row']][move['to']['col']] = piece

    promoted = False
    if move['to']['row'] == get_king_row(player):
        if player == 'red' and piece == RED_PIECE:
            board[move['to']['row']][move['to']['col']] = RED_KING
            promoted = True
        elif player == 'black' and piece == BLACK_PIECE:
            board[move['to']['row']][move['to']['col']] = BLACK_KING
            promoted = True

    return promoted


def count_pieces(board):
    red = 0
    black = 0
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            p = board[r][c]
            if is_red(p):
                red += 1
            elif is_black(p):
                black += 1
    return red, black


def check_winner(board):
    red, black = count_pieces(board)
    if red == 0:
        return 'black'
    if black == 0:
        return 'red'
    if not get_legal_moves(board, 'red'):
        return 'black'
    if not get_legal_moves(board, 'black'):
        return 'red'
    return None


# ── Game Class ───────────────────────────────────────────────────────────────

class CheckersGame:
    def __init__(self):
        self.player_names = []  # set by base server via set_player_names
        self.reset()

    def set_player_names(self, names):
        self.player_names = names

    def reset(self):
        self.board = copy_board(INITIAL_BOARD)
        self.current_turn = 'red'
        self.phase = 'playing'
        self.winner = None
        self.sides = {}
        self.move_history = []

        # Assign sides: first player = red, second = black
        if len(self.player_names) >= 1:
            self.sides['red'] = self.player_names[0]
        if len(self.player_names) >= 2:
            self.sides['black'] = self.player_names[1]

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

        side = self._get_side(player_name)
        if side is None or side != self.current_turn:
            return None

        from_row = action['from']['row']
        from_col = action['from']['col']
        to_row = action['to']['row']
        to_col = action['to']['col']

        move = find_move(self.board, from_row, from_col, to_row, to_col)
        if move is None:
            return None

        promoted = apply_move(self.board, move)
        self.move_history.append({
            'player': player_name,
            'side': side,
            'move': move,
            'promoted': promoted,
        })

        winner = check_winner(self.board)
        if winner:
            self.winner = winner
            self.phase = 'game_over'
            return {
                'type': 'move_made',
                'player': player_name,
                'side': side,
                'move': move,
                'promoted': promoted,
                'state': self.get_state(),
                'gameOver': True,
                'winner': self.sides.get(winner, winner),
                'winnerSide': winner,
            }

        self.current_turn = 'black' if self.current_turn == 'red' else 'red'

        return {
            'type': 'move_made',
            'player': player_name,
            'side': side,
            'move': move,
            'promoted': promoted,
            'state': self.get_state(),
            'nextTurn': self.sides.get(self.current_turn, self.current_turn),
        }

    def _handle_resign(self, player_name):
        side = self._get_side(player_name)
        if side is None or self.phase != 'playing':
            return None

        self.winner = 'black' if side == 'red' else 'red'
        self.phase = 'game_over'

        return {
            'type': 'player_resigned',
            'player': player_name,
            'side': side,
            'winner': self.sides.get(self.winner, self.winner),
            'winnerSide': self.winner,
            'state': self.get_state(),
            'gameOver': True,
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
            'phase': self.phase,
            'sides': self.sides,
            'winner': self.sides.get(self.winner, self.winner) if self.winner else None,
            'winnerSide': self.winner,
        }


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Multiplayer Checkers Server')
    parser.add_argument('--port', type=int, default=8770, help='Port to listen on')
    args = parser.parse_args()

    def game_factory():
        return CheckersGame()

    server = GameServer(
        port=args.port,
        game_factory=game_factory,
        min_players=2,
        max_players=2,
        game_name='Checkers',
    )
    server.run()
