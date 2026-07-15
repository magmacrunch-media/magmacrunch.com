"""
WebSocket server — Chess multiplayer
Run with:  python server.py [--port PORT]
Requires:  pip install websockets
"""

import argparse
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared', 'multiplayer'))
from server_base import GameServer

# ── Constants ────────────────────────────────────────────────────────────────

BOARD_SIZE = 8

# Piece types
PAWN = 'pawn'
KNIGHT = 'knight'
BISHOP = 'bishop'
ROOK = 'rook'
QUEEN = 'queen'
KING = 'king'

# Owners
WHITE = 'white'
BLACK = 'black'

# Initial board setup: board[row][col] = (type, owner) or None
# Row 0 = top (black), Row 7 = bottom (white)
INITIAL_BOARD = [
    [(ROOK, BLACK), (KNIGHT, BLACK), (BISHOP, BLACK), (QUEEN, BLACK), (KING, BLACK), (BISHOP, BLACK), (KNIGHT, BLACK), (ROOK, BLACK)],
    [(PAWN, BLACK)] * 8,
    [None] * 8,
    [None] * 8,
    [None] * 8,
    [None] * 8,
    [(PAWN, WHITE)] * 8,
    [(ROOK, WHITE), (KNIGHT, WHITE), (BISHOP, WHITE), (QUEEN, WHITE), (KING, WHITE), (BISHOP, WHITE), (KNIGHT, WHITE), (ROOK, WHITE)],
]


def copy_board(board):
    return [row[:] for row in board]


def in_bounds(r, c):
    return 0 <= r < BOARD_SIZE and 0 <= c < BOARD_SIZE


def opponent(owner):
    return BLACK if owner == WHITE else WHITE


# ── Move Generation ──────────────────────────────────────────────────────────

def get_sliding_moves(board, row, col, directions, owner):
    moves = []
    for dr, dc in directions:
        r, c = row + dr, col + dc
        while in_bounds(r, c):
            if board[r][c] is None:
                moves.append({'from': {'row': row, 'col': col}, 'to': {'row': r, 'col': c}})
            elif board[r][c][1] != owner:
                moves.append({'from': {'row': row, 'col': col}, 'to': {'row': r, 'col': c}})
                break
            else:
                break
            r += dr
            c += dc
    return moves


def get_knight_moves(board, row, col, owner):
    moves = []
    offsets = [(-2, -1), (-2, 1), (-1, -2), (-1, 2),
               (1, -2), (1, 2), (2, -1), (2, 1)]
    for dr, dc in offsets:
        r, c = row + dr, col + dc
        if in_bounds(r, c) and (board[r][c] is None or board[r][c][1] != owner):
            moves.append({'from': {'row': row, 'col': col}, 'to': {'row': r, 'col': c}})
    return moves


def get_king_moves(board, row, col, owner, castling):
    moves = []
    directions = [(-1, -1), (-1, 0), (-1, 1),
                  (0, -1), (0, 1),
                  (1, -1), (1, 0), (1, 1)]
    for dr, dc in directions:
        r, c = row + dr, col + dc
        if in_bounds(r, c) and (board[r][c] is None or board[r][c][1] != owner):
            moves.append({'from': {'row': row, 'col': col}, 'to': {'row': r, 'col': c}})

    # Castling
    cr = castling.get(owner, {})
    if cr.get('kingside'):
        if (board[row][5] is None and board[row][6] is None and
                board[row][7] is not None and board[row][7] == (ROOK, owner)):
            if not is_square_attacked(board, row, 4, owner) and \
               not is_square_attacked(board, row, 5, owner) and \
               not is_square_attacked(board, row, 6, owner):
                moves.append({'from': {'row': row, 'col': 4}, 'to': {'row': row, 'col': 6},
                              'isKingsideCastle': True})
    if cr.get('queenside'):
        if (board[row][3] is None and board[row][2] is None and board[row][1] is None and
                board[row][0] is not None and board[row][0] == (ROOK, owner)):
            if not is_square_attacked(board, row, 4, owner) and \
               not is_square_attacked(board, row, 3, owner) and \
               not is_square_attacked(board, row, 2, owner):
                moves.append({'from': {'row': row, 'col': 4}, 'to': {'row': row, 'col': 2},
                              'isQueensideCastle': True})
    return moves


def get_pawn_moves(board, row, col, owner, en_passant):
    moves = []
    direction = -1 if owner == WHITE else 1
    start_row = 6 if owner == WHITE else 1
    promotion_row = 0 if owner == WHITE else 7

    # Forward one
    r = row + direction
    if in_bounds(r, col) and board[r][col] is None:
        if r == promotion_row:
            moves.append({'from': {'row': row, 'col': col}, 'to': {'row': r, 'col': col}, 'promotion': True})
        else:
            moves.append({'from': {'row': row, 'col': col}, 'to': {'row': r, 'col': col}})
        # Forward two from start
        if row == start_row:
            r2 = row + direction * 2
            if in_bounds(r2, col) and board[r2][col] is None:
                moves.append({'from': {'row': row, 'col': col}, 'to': {'row': r2, 'col': col},
                              'enPassantCreate': True})

    # Captures
    for dc in [-1, 1]:
        c = col + dc
        if in_bounds(r, c):
            if board[r][c] is not None and board[r][c][1] != owner:
                if r == promotion_row:
                    moves.append({'from': {'row': row, 'col': col}, 'to': {'row': r, 'col': c}, 'promotion': True})
                else:
                    moves.append({'from': {'row': row, 'col': col}, 'to': {'row': r, 'col': c}})
            # En passant
            if en_passant and en_passant['row'] == r and en_passant['col'] == c:
                moves.append({'from': {'row': row, 'col': col}, 'to': {'row': r, 'col': c}, 'enPassant': True})
    return moves


def get_raw_moves(board, row, col, castling, en_passant):
    piece = board[row][col]
    if piece is None:
        return []
    ptype, owner = piece
    if ptype == PAWN:
        return get_pawn_moves(board, row, col, owner, en_passant)
    elif ptype == KNIGHT:
        return get_knight_moves(board, row, col, owner)
    elif ptype == BISHOP:
        return get_sliding_moves(board, row, col, [(-1, -1), (-1, 1), (1, -1), (1, 1)], owner)
    elif ptype == ROOK:
        return get_sliding_moves(board, row, col, [(-1, 0), (1, 0), (0, -1), (0, 1)], owner)
    elif ptype == QUEEN:
        return get_sliding_moves(board, row, col,
                                 [(-1, -1), (-1, 1), (1, -1), (1, 1), (-1, 0), (1, 0), (0, -1), (0, 1)], owner)
    elif ptype == KING:
        return get_king_moves(board, row, col, owner, castling)
    return []


def find_king(board, owner):
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            if board[r][c] is not None and board[r][c] == (KING, owner):
                return {'row': r, 'col': c}
    return None


def is_square_attacked(board, row, col, by_owner):
    """Check if square (row,col) is attacked by opponent of by_owner."""
    opp = opponent(by_owner)
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            piece = board[r][c]
            if piece is not None and piece[1] == opp:
                ptype = piece[0]
                if ptype == PAWN:
                    d = -1 if opp == WHITE else 1
                    if (r + d, c - 1) == (row, col) or (r + d, c + 1) == (row, col):
                        return True
                elif ptype == KNIGHT:
                    for dr, dc in [(-2, -1), (-2, 1), (-1, -2), (-1, 2),
                                   (1, -2), (1, 2), (2, -1), (2, 1)]:
                        if r + dr == row and c + dc == col:
                            return True
                elif ptype == BISHOP:
                    for dr, dc in [(-1, -1), (-1, 1), (1, -1), (1, 1)]:
                        nr, nc = r + dr, c + dc
                        while in_bounds(nr, nc):
                            if nr == row and nc == col:
                                return True
                            if board[nr][nc] is not None:
                                break
                            nr += dr
                            nc += dc
                elif ptype == ROOK:
                    for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr, nc = r + dr, c + dc
                        while in_bounds(nr, nc):
                            if nr == row and nc == col:
                                return True
                            if board[nr][nc] is not None:
                                break
                            nr += dr
                            nc += dc
                elif ptype == QUEEN:
                    for dr, dc in [(-1, -1), (-1, 1), (1, -1), (1, 1), (-1, 0), (1, 0), (0, -1), (0, 1)]:
                        nr, nc = r + dr, c + dc
                        while in_bounds(nr, nc):
                            if nr == row and nc == col:
                                return True
                            if board[nr][nc] is not None:
                                break
                            nr += dr
                            nc += dc
                elif ptype == KING:
                    for dr, dc in [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]:
                        if r + dr == row and c + dc == col:
                            return True
    return False


def is_in_check(board, owner):
    king = find_king(board, owner)
    if not king:
        return False
    return is_square_attacked(board, king['row'], king['col'], owner)


def apply_move_raw(board, move, castling, en_passant):
    """Apply a move to the board (mutates board). Returns new en_passant target."""
    piece = board[move['from']['row']][move['from']['col']]
    owner = piece[1]
    new_en_passant = None

    # En passant capture
    if move.get('enPassant'):
        board[move['from']['row']][move['to']['col']] = None

    # Castling rook movement
    if move.get('isKingsideCastle'):
        board[move['from']['row']][5] = board[move['from']['row']][7]
        board[move['from']['row']][7] = None
    if move.get('isQueensideCastle'):
        board[move['from']['row']][3] = board[move['from']['row']][0]
        board[move['from']['row']][0] = None

    # Move piece
    board[move['to']['row']][move['to']['col']] = piece
    board[move['from']['row']][move['from']['col']] = None

    # En passant create
    if move.get('enPassantCreate'):
        new_en_passant = {
            'row': (move['from']['row'] + move['to']['row']) // 2,
            'col': move['to']['col']
        }

    # Promotion (default queen for raw)
    if move.get('promotion'):
        board[move['to']['row']][move['to']['col']] = (QUEEN, owner)

    return new_en_passant


def would_be_in_check(board, move, owner, castling, en_passant):
    """Simulate move and check if king is in check."""
    saved = copy_board(board)
    saved_ep = en_passant
    saved_castling = {k: dict(v) for k, v in castling.items()}

    new_ep = apply_move_raw(board, move, castling, en_passant)

    result = is_in_check(board, owner)

    # Restore
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            board[r][c] = saved[r][c]

    return result


def get_legal_moves(board, row, col, castling, en_passant):
    piece = board[row][col]
    if piece is None:
        return []
    owner = piece[1]
    raw = get_raw_moves(board, row, col, castling, en_passant)
    legal = []
    for m in raw:
        if not would_be_in_check(board, m, owner, castling, en_passant):
            legal.append(m)
    return legal


def get_all_legal_moves(board, owner, castling, en_passant):
    moves = []
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            piece = board[r][c]
            if piece is not None and piece[1] == owner:
                moves.extend(get_legal_moves(board, r, c, castling, en_passant))
    return moves


def has_checkmate(board, owner, castling, en_passant):
    if not is_in_check(board, owner):
        return False
    return len(get_all_legal_moves(board, owner, castling, en_passant)) == 0


def has_stalemate(board, owner, castling, en_passant):
    if is_in_check(board, owner):
        return False
    return len(get_all_legal_moves(board, owner, castling, en_passant)) == 0


def get_game_result(board, castling, en_passant):
    white_moves = get_all_legal_moves(board, WHITE, castling, en_passant)
    black_moves = get_all_legal_moves(board, BLACK, castling, en_passant)

    if len(white_moves) == 0:
        if is_in_check(board, WHITE):
            return 'checkmate-black'
        return 'stalemate'
    if len(black_moves) == 0:
        if is_in_check(board, BLACK):
            return 'checkmate-white'
        return 'stalemate'
    return None


# ── Game Class ───────────────────────────────────────────────────────────────

class ChessGame:
    def __init__(self):
        self.time_control = 'none'
        self.player_names = []
        self.reset()

    def set_player_names(self, names):
        self.player_names = names

    def reset(self):
        self.board = copy_board(INITIAL_BOARD)
        self.castling = {
            WHITE: {'kingside': True, 'queenside': True},
            BLACK: {'kingside': True, 'queenside': True},
        }
        self.en_passant = None
        self.current_turn = WHITE
        self.phase = 'playing'
        self.winner = None
        self.sides = {}
        self.move_history = []
        self.pending_promotion = None
        # time_control is preserved across resets

        # Assign sides: first player = white, second = black
        if len(self.player_names) >= 1:
            self.sides[WHITE] = self.player_names[0]
        if len(self.player_names) >= 2:
            self.sides[BLACK] = self.player_names[1]

    def handle_action(self, player_name, action):
        action_type = action.get('type')

        if action_type == 'set_time_control':
            self.time_control = action.get('timeControl', 'none')
            return None
        elif action_type == 'move':
            return self._handle_move(player_name, action)
        elif action_type == 'promotion_choice':
            return self._handle_promotion_choice(player_name, action)
        elif action_type == 'resign':
            return self._handle_resign(player_name)

        return None

    def _get_side(self, player_name):
        for side, name in self.sides.items():
            if name == player_name:
                return side
        return None

    def _handle_move(self, player_name, action):
        if self.phase != 'playing':
            return None

        side = self._get_side(player_name)
        if side is None or side != self.current_turn:
            return None

        from_r = action['from']['row']
        from_c = action['from']['col']
        to_r = action['to']['row']
        to_c = action['to']['col']

        # Find matching legal move
        legal = get_legal_moves(self.board, from_r, from_c, self.castling, self.en_passant)
        move = None
        for m in legal:
            if m['to']['row'] == to_r and m['to']['col'] == to_c:
                move = m
                break

        if move is None:
            return None

        # Check for promotion
        if move.get('promotion'):
            self.pending_promotion = {
                'player': player_name,
                'side': side,
                'move': move,
            }
            return {
                'type': 'promotion_pending',
                'player': player_name,
                'side': side,
                'move': move,
                'state': self.get_state(),
            }

        return self._apply_and_broadcast(move, player_name, side, None)

    def _handle_promotion_choice(self, player_name, action):
        if self.pending_promotion is None:
            return None
        if self.pending_promotion['player'] != player_name:
            return None

        piece_type = action.get('pieceType', QUEEN)
        if piece_type not in (QUEEN, ROOK, BISHOP, KNIGHT):
            piece_type = QUEEN

        move = self.pending_promotion['move']
        side = self.pending_promotion['side']
        self.pending_promotion = None

        return self._apply_and_broadcast(move, player_name, side, piece_type)

    def _apply_and_broadcast(self, move, player_name, side, promotion_type):
        # Update en passant target
        if move.get('enPassantCreate'):
            self.en_passant = {
                'row': (move['from']['row'] + move['to']['row']) // 2,
                'col': move['to']['col']
            }
        else:
            self.en_passant = None

        # En passant capture
        en_passant_capture = False
        captured = None
        if move.get('enPassant'):
            captured = self.board[move['from']['row']][move['to']['col']]
            self.board[move['from']['row']][move['to']['col']] = None
            en_passant_capture = True
        else:
            captured = self.board[move['to']['row']][move['to']['col']]

        # Castling
        castled = False
        if move.get('isKingsideCastle'):
            self.board[move['from']['row']][5] = self.board[move['from']['row']][7]
            self.board[move['from']['row']][7] = None
            castled = True
        if move.get('isQueensideCastle'):
            self.board[move['from']['row']][3] = self.board[move['from']['row']][0]
            self.board[move['from']['row']][0] = None
            castled = True

        # Update castling rights
        piece = self.board[move['from']['row']][move['from']['col']]
        if piece and piece[0] == KING:
            self.castling[side]['kingside'] = False
            self.castling[side]['queenside'] = False
        if piece and piece[0] == ROOK:
            if move['from']['col'] == 0:
                self.castling[side]['queenside'] = False
            if move['from']['col'] == 7:
                self.castling[side]['kingside'] = False
        # If rook captured
        if captured and captured[0] == ROOK:
            cap_owner = captured[1]
            if move['to']['row'] == 0 and move['to']['col'] == 0:
                self.castling[cap_owner]['queenside'] = False
            if move['to']['row'] == 0 and move['to']['col'] == 7:
                self.castling[cap_owner]['kingside'] = False
            if move['to']['row'] == 7 and move['to']['col'] == 0:
                self.castling[cap_owner]['queenside'] = False
            if move['to']['row'] == 7 and move['to']['col'] == 7:
                self.castling[cap_owner]['kingside'] = False

        # Move piece
        self.board[move['to']['row']][move['to']['col']] = piece
        self.board[move['from']['row']][move['from']['col']] = None

        # Promotion
        promoted = False
        if promotion_type:
            self.board[move['to']['row']][move['to']['col']] = (promotion_type, side)
            promoted = True
        elif move.get('promotion'):
            self.board[move['to']['row']][move['to']['col']] = (QUEEN, side)
            promoted = True

        # Record move
        self.move_history.append({
            'player': player_name,
            'side': side,
            'move': move,
            'promotionType': promotion_type,
        })

        # Check for game over
        result = get_game_result(self.board, self.castling, self.en_passant)
        if result:
            self.phase = 'game_over'
            if 'checkmate' in result:
                self.winner = WHITE if result == 'checkmate-white' else BLACK
            else:
                self.winner = None  # stalemate = draw

            return {
                'type': 'move_made',
                'player': player_name,
                'side': side,
                'move': move,
                'promoted': promoted,
                'promotionType': promotion_type,
                'captured': list(captured) if captured else None,
                'castled': castled,
                'enPassantCapture': en_passant_capture,
                'state': self.get_state(),
                'gameOver': True,
                'winner': self.sides.get(self.winner) if self.winner else None,
                'winnerSide': self.winner,
                'result': result,
            }

        # Switch turns
        self.current_turn = opponent(self.current_turn)

        return {
            'type': 'move_made',
            'player': player_name,
            'side': side,
            'move': move,
            'promoted': promoted,
            'promotionType': promotion_type,
            'captured': list(captured) if captured else None,
            'castled': castled,
            'enPassantCapture': en_passant_capture,
            'state': self.get_state(),
            'nextTurn': self.sides.get(self.current_turn, self.current_turn),
        }

    def _handle_resign(self, player_name):
        side = self._get_side(player_name)
        if side is None or self.phase != 'playing':
            return None

        self.winner = opponent(side)
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

    def get_state(self):
        # Convert board to serializable format
        board_data = []
        for r in range(BOARD_SIZE):
            row = []
            for c in range(BOARD_SIZE):
                piece = self.board[r][c]
                if piece:
                    row.append({'type': piece[0], 'owner': piece[1]})
                else:
                    row.append(None)
            board_data.append(row)

        return {
            'board': board_data,
            'castlingRights': self.castling,
            'enPassantTarget': self.en_passant,
            'currentTurn': self.sides.get(self.current_turn, self.current_turn),
            'currentTurnSide': self.current_turn,
            'phase': self.phase,
            'sides': self.sides,
            'winner': self.sides.get(self.winner, self.winner) if self.winner else None,
            'winnerSide': self.winner,
            'moveCount': len(self.move_history),
            'timeControl': self.time_control,
        }


# ── Main ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Multiplayer Chess Server')
    parser.add_argument('--port', type=int, default=8769, help='Port to listen on')
    args = parser.parse_args()

    def game_factory():
        return ChessGame()

    server = GameServer(
        port=args.port,
        game_factory=game_factory,
        min_players=2,
        max_players=2,
        game_name='Chess',
    )
    server.run()
