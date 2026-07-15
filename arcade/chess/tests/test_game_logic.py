"""
test_game_logic.py — Mechanics tests for Chess server-side game logic.
Run:  cd arcade/chess/tests && pytest test_game_logic.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from server import (
    ChessGame, INITIAL_BOARD, copy_board,
    BOARD_SIZE, PAWN, KNIGHT, BISHOP, ROOK, QUEEN, KING, WHITE, BLACK,
    in_bounds, opponent, find_king,
    get_sliding_moves, get_knight_moves, get_king_moves, get_pawn_moves,
    get_raw_moves, is_square_attacked, is_in_check,
    get_legal_moves, get_all_legal_moves, would_be_in_check,
    apply_move_raw, has_checkmate, has_stalemate, get_game_result,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_game():
    game = ChessGame()
    game.set_player_names(["Alice", "Bob"])
    game.reset()
    return game


def empty_board():
    return [[None] * BOARD_SIZE for _ in range(BOARD_SIZE)]


def board_with(*pieces):
    """Create a board with specific pieces. Each piece is (type, owner, row, col)."""
    board = empty_board()
    for ptype, owner, row, col in pieces:
        board[row][col] = (ptype, owner)
    return board


def piece_at(board, row, col):
    return board[row][col]


def board_to_str(board):
    symbols = {
        None: '.',
        (PAWN, WHITE): 'P', (KNIGHT, WHITE): 'N', (BISHOP, WHITE): 'B',
        (ROOK, WHITE): 'R', (QUEEN, WHITE): 'Q', (KING, WHITE): 'K',
        (PAWN, BLACK): 'p', (KNIGHT, BLACK): 'n', (BISHOP, BLACK): 'b',
        (ROOK, BLACK): 'r', (QUEEN, BLACK): 'q', (KING, BLACK): 'k',
    }
    return '\n'.join(' '.join(symbols.get(board[r][c], '?') for c in range(BOARD_SIZE)) for r in range(BOARD_SIZE))


def default_castling():
    return {
        WHITE: {'kingside': True, 'queenside': True},
        BLACK: {'kingside': True, 'queenside': True},
    }


def make_move(game, player_name, from_r, from_c, to_r, to_c):
    return game.handle_action(player_name, {
        "type": "move",
        "from": {"row": from_r, "col": from_c},
        "to": {"row": to_r, "col": to_c},
    })


@pytest.fixture
def game():
    return make_game()


# ── Initial State ─────────────────────────────────────────────────────────────

class TestInitialState:
    def test_board_matches_initial_layout(self, game):
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                assert game.board[r][c] == INITIAL_BOARD[r][c]

    def test_white_pawns_on_row_6(self, game):
        for c in range(BOARD_SIZE):
            assert game.board[6][c] == (PAWN, WHITE)

    def test_black_pawns_on_row_1(self, game):
        for c in range(BOARD_SIZE):
            assert game.board[1][c] == (PAWN, BLACK)

    def test_white_pieces_on_row_7(self, game):
        expected = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK]
        for c in range(BOARD_SIZE):
            assert game.board[7][c] == (expected[c], WHITE)

    def test_black_pieces_on_row_0(self, game):
        expected = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK]
        for c in range(BOARD_SIZE):
            assert game.board[0][c] == (expected[c], BLACK)

    def test_white_moves_first(self, game):
        assert game.get_state()['currentTurnSide'] == WHITE

    def test_both_sides_have_castling(self, game):
        assert game.castling[WHITE]['kingside'] is True
        assert game.castling[WHITE]['queenside'] is True
        assert game.castling[BLACK]['kingside'] is True
        assert game.castling[BLACK]['queenside'] is True

    def test_no_en_passant_initially(self, game):
        assert game.en_passant is None

    def test_phase_is_playing(self, game):
        assert game.get_state()['phase'] == 'playing'

    def test_sides_assigned(self, game):
        state = game.get_state()
        assert state['sides'][WHITE] == 'Alice'
        assert state['sides'][BLACK] == 'Bob'


# ── Utility Functions ─────────────────────────────────────────────────────────

class TestUtilityFunctions:
    def test_opponent(self):
        assert opponent(WHITE) == BLACK
        assert opponent(BLACK) == WHITE

    def test_in_bounds(self):
        assert in_bounds(0, 0) is True
        assert in_bounds(7, 7) is True
        assert in_bounds(-1, 0) is False
        assert in_bounds(0, 8) is False

    def test_find_king(self, game):
        king = find_king(game.board, WHITE)
        assert king == {'row': 7, 'col': 4}

    def test_find_king_black(self, game):
        king = find_king(game.board, BLACK)
        assert king == {'row': 0, 'col': 4}

    def test_find_king_missing(self):
        board = empty_board()
        assert find_king(board, WHITE) is None

    def test_copy_board_is_independent(self, game):
        copy = copy_board(game.board)
        copy[0][0] = None
        assert game.board[0][0] is not None


# ── Pawn Moves ────────────────────────────────────────────────────────────────

class TestPawnMoves:
    def test_white_pawn_forward_one(self, game):
        moves = get_pawn_moves(game.board, 6, 0, WHITE, None)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (5, 0) in targets

    def test_white_pawn_forward_two_from_start(self, game):
        moves = get_pawn_moves(game.board, 6, 0, WHITE, None)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (4, 0) in targets

    def test_white_pawn_no_forward_two_from_non_start(self, game):
        moves = get_pawn_moves(game.board, 5, 0, WHITE, None)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (3, 0) not in targets

    def test_black_pawn_forward_one(self, game):
        moves = get_pawn_moves(game.board, 1, 0, BLACK, None)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (2, 0) in targets

    def test_black_pawn_forward_two_from_start(self, game):
        moves = get_pawn_moves(game.board, 1, 0, BLACK, None)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (3, 0) in targets

    def test_pawn_blocked_by_own_piece(self, game):
        board = board_with((PAWN, WHITE, 5, 0), (PAWN, WHITE, 4, 0))
        moves = get_pawn_moves(board, 5, 0, WHITE, None)
        assert len(moves) == 0

    def test_pawn_capture_diagonal(self, game):
        board = board_with((PAWN, WHITE, 5, 0), (PAWN, BLACK, 4, 1))
        moves = get_pawn_moves(board, 5, 0, WHITE, None)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (4, 1) in targets

    def test_pawn_no_capture_straight(self, game):
        board = board_with((PAWN, WHITE, 5, 0), (PAWN, BLACK, 4, 0))
        moves = get_pawn_moves(board, 5, 0, WHITE, None)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (4, 0) not in targets

    def test_pawn_en_passant_create(self, game):
        moves = get_pawn_moves(game.board, 6, 4, WHITE, None)
        en_passant_moves = [m for m in moves if m.get('enPassantCreate')]
        assert len(en_passant_moves) == 1
        assert en_passant_moves[0]['to'] == {'row': 4, 'col': 4}

    def test_pawn_en_passant_capture(self, game):
        board = board_with((PAWN, WHITE, 3, 3), (PAWN, BLACK, 3, 4))
        ep = {'row': 2, 'col': 4}
        moves = get_pawn_moves(board, 3, 3, WHITE, ep)
        ep_moves = [m for m in moves if m.get('enPassant')]
        assert len(ep_moves) == 1
        assert ep_moves[0]['to'] == {'row': 2, 'col': 4}

    def test_pawn_promotion(self, game):
        board = board_with((PAWN, WHITE, 1, 0))
        moves = get_pawn_moves(board, 1, 0, WHITE, None)
        promo_moves = [m for m in moves if m.get('promotion')]
        assert len(promo_moves) == 1

    def test_pawn_no_forward_two_when_blocked(self, game):
        board = board_with((PAWN, WHITE, 6, 0), (PAWN, BLACK, 5, 0))
        moves = get_pawn_moves(board, 6, 0, WHITE, None)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (4, 0) not in targets


# ── Knight Moves ──────────────────────────────────────────────────────────────

class TestKnightMoves:
    def test_knight_eight_possible_moves(self, game):
        board = empty_board()
        board[4][4] = (KNIGHT, WHITE)
        moves = get_knight_moves(board, 4, 4, WHITE)
        assert len(moves) == 8

    def test_knight_captures_opponent(self, game):
        board = empty_board()
        board[4][4] = (KNIGHT, WHITE)
        board[3][2] = (PAWN, BLACK)
        moves = get_knight_moves(board, 4, 4, WHITE)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (3, 2) in targets

    def test_knight_cannot_capture_own_piece(self, game):
        board = empty_board()
        board[4][4] = (KNIGHT, WHITE)
        board[3][2] = (PAWN, WHITE)
        moves = get_knight_moves(board, 4, 4, WHITE)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (3, 2) not in targets

    def test_knight_at_corner(self, game):
        board = empty_board()
        board[0][0] = (KNIGHT, WHITE)
        moves = get_knight_moves(board, 0, 0, WHITE)
        assert len(moves) == 2


# ── Sliding Moves (Bishop, Rook, Queen) ───────────────────────────────────────

class TestSlidingMoves:
    def test_bishop_diagonal(self, game):
        board = empty_board()
        board[4][4] = (BISHOP, WHITE)
        moves = get_sliding_moves(board, 4, 4, [(-1, -1), (-1, 1), (1, -1), (1, 1)], WHITE)
        assert len(moves) == 13

    def test_bishop_blocked_by_own_piece(self, game):
        board = empty_board()
        board[4][4] = (BISHOP, WHITE)
        board[2][2] = (PAWN, WHITE)
        moves = get_sliding_moves(board, 4, 4, [(-1, -1), (-1, 1), (1, -1), (1, 1)], WHITE)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (2, 2) not in targets
        assert (1, 1) not in targets

    def test_bishop_captures_opponent(self, game):
        board = empty_board()
        board[4][4] = (BISHOP, WHITE)
        board[2][2] = (PAWN, BLACK)
        moves = get_sliding_moves(board, 4, 4, [(-1, -1), (-1, 1), (1, -1), (1, 1)], WHITE)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (2, 2) in targets
        assert (1, 1) not in targets

    def test_rook_straight(self, game):
        board = empty_board()
        board[4][4] = (ROOK, WHITE)
        moves = get_sliding_moves(board, 4, 4, [(-1, 0), (1, 0), (0, -1), (0, 1)], WHITE)
        assert len(moves) == 14

    def test_queen_combined(self, game):
        board = empty_board()
        board[4][4] = (QUEEN, WHITE)
        all_dirs = [(-1, -1), (-1, 1), (1, -1), (1, 1), (-1, 0), (1, 0), (0, -1), (0, 1)]
        moves = get_sliding_moves(board, 4, 4, all_dirs, WHITE)
        assert len(moves) == 27


# ── King Moves ────────────────────────────────────────────────────────────────

class TestKingMoves:
    def test_king_eight_directions(self, game):
        board = empty_board()
        board[4][4] = (KING, WHITE)
        moves = get_king_moves(board, 4, 4, WHITE, default_castling())
        assert len(moves) == 8

    def test_king_captures_opponent(self, game):
        board = empty_board()
        board[4][4] = (KING, WHITE)
        board[3][3] = (PAWN, BLACK)
        moves = get_king_moves(board, 4, 4, WHITE, default_castling())
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (3, 3) in targets

    def test_king_cannot_capture_own_piece(self, game):
        board = empty_board()
        board[4][4] = (KING, WHITE)
        board[3][3] = (PAWN, WHITE)
        moves = get_king_moves(board, 4, 4, WHITE, default_castling())
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (3, 3) not in targets


# ── Castling ──────────────────────────────────────────────────────────────────

class TestCastling:
    def test_white_kingside_castle_available(self, game):
        # Clear path between king and rook
        game.board[7][5] = None
        game.board[7][6] = None
        moves = get_king_moves(game.board, 7, 4, WHITE, game.castling)
        castle_moves = [m for m in moves if m.get('isKingsideCastle')]
        assert len(castle_moves) == 1

    def test_white_queenside_castle_available(self, game):
        game.board[7][3] = None
        game.board[7][2] = None
        game.board[7][1] = None
        moves = get_king_moves(game.board, 7, 4, WHITE, game.castling)
        castle_moves = [m for m in moves if m.get('isQueensideCastle')]
        assert len(castle_moves) == 1

    def test_castling_blocked_by_piece(self, game):
        # Knight at f1 blocks kingside
        moves = get_king_moves(game.board, 7, 4, WHITE, game.castling)
        castle_moves = [m for m in moves if m.get('isKingsideCastle')]
        assert len(castle_moves) == 0

    def test_castling_rights_lost_on_king_move(self, game):
        # Move pawn to make room, then move king
        make_move(game, "Alice", 6, 4, 5, 4)
        make_move(game, "Bob", 1, 4, 2, 4)
        make_move(game, "Alice", 7, 4, 6, 4)
        assert game.castling[WHITE]['kingside'] is False
        assert game.castling[WHITE]['queenside'] is False

    def test_castling_rights_lost_on_rook_move(self, game):
        # Move knight out, pawn to make room, then move rook
        make_move(game, "Alice", 7, 6, 5, 5)  # Ng1-f3
        make_move(game, "Bob", 1, 4, 2, 4)
        make_move(game, "Alice", 7, 7, 7, 6)  # Rh1-g1
        assert game.castling[WHITE]['kingside'] is False
        assert game.castling[WHITE]['queenside'] is True

    def test_castling_through_check_blocked(self, game):
        # Black queen attacks f1 — castling through check must be blocked
        game.board = empty_board()
        game.board[7][4] = (KING, WHITE)
        game.board[7][7] = (ROOK, WHITE)
        game.board[7][0] = (ROOK, WHITE)
        game.board[0][5] = (QUEEN, BLACK)

        moves = get_king_moves(game.board, 7, 4, WHITE, game.castling)
        castle_moves = [m for m in moves if m.get('isKingsideCastle')]
        assert len(castle_moves) == 0

    def test_castling_into_check_blocked(self, game):
        # Black queen attacks g1 — castling into check must be blocked
        game.board = empty_board()
        game.board[7][4] = (KING, WHITE)
        game.board[7][7] = (ROOK, WHITE)
        game.board[7][0] = (ROOK, WHITE)
        game.board[0][6] = (QUEEN, BLACK)

        moves = get_king_moves(game.board, 7, 4, WHITE, game.castling)
        castle_moves = [m for m in moves if m.get('isKingsideCastle')]
        assert len(castle_moves) == 0

    def test_castling_king_must_not_be_in_check(self, game):
        game.board = empty_board()
        game.board[7][4] = (KING, WHITE)
        game.board[7][7] = (ROOK, WHITE)
        game.board[7][0] = (ROOK, WHITE)
        game.board[0][4] = (QUEEN, BLACK)

        moves = get_king_moves(game.board, 7, 4, WHITE, game.castling)
        castle_moves = [m for m in moves if m.get('isKingsideCastle') or m.get('isQueensideCastle')]
        assert len(castle_moves) == 0

    def test_castling_rook_moved_to_correct_square(self, game):
        game.board = empty_board()
        game.board[7][4] = (KING, WHITE)
        game.board[7][7] = (ROOK, WHITE)
        game.board[7][0] = (ROOK, WHITE)

        result = make_move(game, "Alice", 7, 4, 7, 6)
        assert result is not None
        assert game.board[7][5] == (ROOK, WHITE)
        assert game.board[7][7] is None

    def test_castling_rights_lost_when_rook_captured(self, game):
        # Capture black's rook at a8
        game.board = empty_board()
        game.board[7][4] = (KING, WHITE)
        game.board[0][0] = (ROOK, BLACK)
        game.board[3][0] = (ROOK, WHITE)

        make_move(game, "Alice", 3, 0, 0, 0)
        assert game.castling[BLACK]['queenside'] is False
        assert game.castling[BLACK]['kingside'] is True


# ── En Passant ────────────────────────────────────────────────────────────────

class TestEnPassant:
    def test_double_push_creates_en_passant_target(self, game):
        result = make_move(game, "Alice", 6, 4, 4, 4)
        assert result is not None
        assert game.en_passant == {'row': 5, 'col': 4}

    def test_en_passant_expires_after_one_turn(self, game):
        make_move(game, "Alice", 6, 4, 4, 4)
        # Bob makes a non-double-push move
        make_move(game, "Bob", 1, 0, 2, 0)
        assert game.en_passant is None

    def test_en_passant_capture_removes_opponent_pawn(self, game):
        # Proper en passant: white pawn on 5th rank, black double-pushes adjacent
        make_move(game, "Alice", 6, 3, 4, 3)  # d2-d4
        make_move(game, "Bob", 1, 0, 2, 0)    # a7-a6
        make_move(game, "Alice", 4, 3, 3, 3)  # d4-d5 (5th rank)
        make_move(game, "Bob", 1, 2, 3, 2)    # c7-c5 (double push, target=2,2)
        # White captures en passant: d5xc6
        result = make_move(game, "Alice", 3, 3, 2, 2)
        assert result is not None
        assert result.get('enPassantCapture') is True
        assert game.board[2][2] == (PAWN, WHITE)
        assert game.board[3][2] is None  # Black pawn at c5 removed

    def test_en_passant_not_available_without_target(self, game):
        board = board_with((PAWN, WHITE, 3, 3), (PAWN, BLACK, 3, 4))
        moves = get_pawn_moves(board, 3, 3, WHITE, None)
        ep_moves = [m for m in moves if m.get('enPassant')]
        assert len(ep_moves) == 0


# ── Check Detection ───────────────────────────────────────────────────────────

class TestCheckDetection:
    def test_king_in_check_from_queen(self, game):
        board = board_with((KING, WHITE, 4, 4), (QUEEN, BLACK, 4, 0))
        assert is_in_check(board, WHITE) is True

    def test_king_not_in_check(self, game):
        # Queen at d5, king at h2 — not on same diagonal/rank/file
        board = board_with((KING, WHITE, 6, 7), (QUEEN, BLACK, 3, 3))
        assert is_in_check(board, WHITE) is False

    def test_check_from_pawn(self, game):
        board = board_with((KING, WHITE, 4, 4), (PAWN, BLACK, 3, 3))
        assert is_in_check(board, WHITE) is True

    def test_check_from_knight(self, game):
        board = board_with((KING, WHITE, 4, 4), (KNIGHT, BLACK, 2, 3))
        assert is_in_check(board, WHITE) is True

    def test_check_blockaded(self, game):
        board = board_with(
            (KING, WHITE, 4, 4), (QUEEN, BLACK, 4, 0),
            (ROOK, WHITE, 4, 2)
        )
        assert is_in_check(board, WHITE) is False

    def test_initial_position_not_in_check(self, game):
        assert is_in_check(game.board, WHITE) is False
        assert is_in_check(game.board, BLACK) is False

    def test_square_attacked_by_pawn(self, game):
        board = board_with((PAWN, BLACK, 3, 3))
        assert is_square_attacked(board, 4, 4, WHITE) is True
        assert is_square_attacked(board, 4, 2, WHITE) is True

    def test_square_attacked_by_knight(self, game):
        board = board_with((KNIGHT, BLACK, 2, 3))
        assert is_square_attacked(board, 4, 4, WHITE) is True


# ── Legal Moves ───────────────────────────────────────────────────────────────

class TestLegalMoves:
    def test_legal_moves_filters_check(self, game):
        # King in check must resolve it
        board = board_with((KING, WHITE, 7, 4), (QUEEN, BLACK, 5, 4))
        game.board = board
        legal = get_legal_moves(board, 7, 4, game.castling, game.en_passant)
        for m in legal:
            assert m['to']['row'] != 7 or m['to']['col'] != 4

    def test_king_cannot_move_into_check(self, game):
        board = board_with((KING, WHITE, 4, 4), (ROOK, BLACK, 0, 4))
        game.board = board
        legal = get_legal_moves(board, 4, 4, game.castling, game.en_passant)
        for m in legal:
            if m['to']['row'] == 0 and m['to']['col'] == 4:
                pytest.fail("King can move into check")

    def test_pinned_piece_cannot_move(self, game):
        # Rook pins bishop to king
        board = board_with((KING, WHITE, 7, 4), (BISHOP, WHITE, 5, 4), (ROOK, BLACK, 0, 4))
        game.board = board
        legal = get_legal_moves(board, 5, 4, game.castling, game.en_passant)
        assert len(legal) == 0

    def test_initial_position_legal_moves(self, game):
        legal = get_all_legal_moves(game.board, WHITE, game.castling, game.en_passant)
        assert len(legal) == 20

    def test_all_legal_moves_finds_all_pieces(self, game):
        moves = get_all_legal_moves(game.board, WHITE, game.castling, game.en_passant)
        pieces_with_moves = set()
        for m in moves:
            pieces_with_moves.add((m['from']['row'], m['from']['col']))
        # Initial position: 8 pawns + 2 knights have moves, 6 back-rank pieces are blocked
        assert len(pieces_with_moves) == 10


# ── Checkmate ─────────────────────────────────────────────────────────────────

class TestCheckmate:
    def test_scholars_mate(self, game):
        # 1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#
        make_move(game, "Alice", 6, 4, 4, 4)
        make_move(game, "Bob", 1, 4, 3, 4)
        make_move(game, "Alice", 7, 5, 4, 2)
        make_move(game, "Bob", 0, 6, 2, 5)
        make_move(game, "Alice", 7, 3, 3, 7)
        make_move(game, "Bob", 0, 1, 2, 2)
        result = make_move(game, "Alice", 3, 7, 1, 5)

        assert result is not None
        assert result.get('gameOver') is True
        assert result.get('result') == 'checkmate-white'

    def test_back_rank_mate(self, game):
        # Test via has_checkmate function — king trapped by own pawns, rook delivers mate
        board = board_with(
            (KING, BLACK, 0, 6),
            (PAWN, BLACK, 1, 5), (PAWN, BLACK, 1, 6), (PAWN, BLACK, 1, 7),
            (ROOK, WHITE, 0, 0),
        )
        assert is_in_check(board, BLACK) is True
        assert has_checkmate(board, BLACK, default_castling(), None) is True

    def test_not_checkmate_when_escape_exists(self, game):
        board = board_with(
            (KING, BLACK, 0, 6),
            (PAWN, BLACK, 1, 5), (PAWN, BLACK, 1, 7),
            (ROOK, WHITE, 7, 0),
        )
        game.board = board
        game.current_turn = WHITE

        assert has_checkmate(board, BLACK, game.castling, game.en_passant) is False

    def test_checkmate_detection_function(self, game):
        board = board_with(
            (KING, BLACK, 0, 6),
            (PAWN, BLACK, 1, 5), (PAWN, BLACK, 1, 6), (PAWN, BLACK, 1, 7),
            (ROOK, WHITE, 0, 0),
        )
        assert has_checkmate(board, BLACK, default_castling(), None) is True


# ── Stalemate ─────────────────────────────────────────────────────────────────

class TestStalemate:
    def test_stalemate_detection(self, game):
        # Black king at a8, white queen at b6, white king at c8
        # Black has no legal moves and is NOT in check
        board = board_with(
            (KING, BLACK, 0, 0),
            (QUEEN, WHITE, 2, 1),
            (KING, WHITE, 0, 2),
        )
        game.board = board
        assert has_stalemate(board, BLACK, game.castling, game.en_passant) is True

    def test_not_stalemate_when_in_check(self, game):
        board = board_with(
            (KING, BLACK, 0, 0),
            (QUEEN, WHITE, 1, 1),
            (KING, WHITE, 2, 2),
        )
        assert has_stalemate(board, BLACK, game.castling, game.en_passant) is False

    def test_not_stalemate_when_moves_exist(self, game):
        board = board_with(
            (KING, BLACK, 0, 0),
            (PAWN, WHITE, 1, 1),
        )
        assert has_stalemate(board, BLACK, default_castling(), None) is False

    def test_game_result_stalemate(self, game):
        board = board_with(
            (KING, BLACK, 0, 0),
            (QUEEN, WHITE, 2, 1),
            (KING, WHITE, 0, 2),
        )
        result = get_game_result(board, default_castling(), None)
        assert result == 'stalemate'


# ── Game Class ────────────────────────────────────────────────────────────────

class TestGameClass:
    def test_handle_move_applies(self, game):
        result = make_move(game, "Alice", 6, 4, 4, 4)
        assert result is not None
        assert game.board[6][4] is None
        assert game.board[4][4] == (PAWN, WHITE)

    def test_turn_switches(self, game):
        make_move(game, "Alice", 6, 4, 4, 4)
        assert game.get_state()['currentTurnSide'] == BLACK

    def test_wrong_player_rejected(self, game):
        result = make_move(game, "Bob", 1, 4, 3, 4)
        assert result is None

    def test_illegal_move_rejected(self, game):
        result = make_move(game, "Alice", 6, 4, 3, 4)
        assert result is None

    def test_resignation(self, game):
        result = game.handle_action("Alice", {"type": "resign"})
        assert result is not None
        assert result['type'] == 'player_resigned'
        assert result['winnerSide'] == BLACK
        assert game.phase == 'game_over'

    def test_resignation_after_game_over(self, game):
        game.phase = 'game_over'
        result = game.handle_action("Alice", {"type": "resign"})
        assert result is None

    def test_state_reflects_move(self, game):
        make_move(game, "Alice", 6, 4, 4, 4)
        state = game.get_state()
        assert state['moveCount'] == 1

    def test_promotion_pending(self, game):
        board = board_with((PAWN, WHITE, 1, 0), (KING, WHITE, 7, 4), (KING, BLACK, 0, 4))
        game.board = board
        game.current_turn = WHITE

        result = make_move(game, "Alice", 1, 0, 0, 0)
        assert result is not None
        assert result['type'] == 'promotion_pending'
        assert game.pending_promotion is not None

    def test_promotion_choice(self, game):
        board = board_with((PAWN, WHITE, 1, 0), (KING, WHITE, 7, 4), (KING, BLACK, 0, 4))
        game.board = board
        game.current_turn = WHITE

        make_move(game, "Alice", 1, 0, 0, 0)
        result = game.handle_action("Alice", {
            "type": "promotion_choice",
            "pieceType": KNIGHT,
        })
        assert result is not None
        assert game.board[0][0] == (KNIGHT, WHITE)

    def test_promotion_default_queen(self, game):
        board = board_with((PAWN, WHITE, 1, 0), (KING, WHITE, 7, 4), (KING, BLACK, 0, 4))
        game.board = board
        game.current_turn = WHITE

        make_move(game, "Alice", 1, 0, 0, 0)
        result = game.handle_action("Alice", {"type": "promotion_choice"})
        assert result is not None
        assert game.board[0][0] == (QUEEN, WHITE)

    def test_get_state_format(self, game):
        state = game.get_state()
        assert 'board' in state
        assert 'castlingRights' in state
        assert 'enPassantTarget' in state
        assert 'currentTurn' in state
        assert 'phase' in state
        assert 'sides' in state
        assert 'moveCount' in state

    def test_move_history_recorded(self, game):
        make_move(game, "Alice", 6, 4, 4, 4)
        assert len(game.move_history) == 1
        assert game.move_history[0]['side'] == WHITE
