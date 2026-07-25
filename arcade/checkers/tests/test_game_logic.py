"""
test_game_logic.py — Mechanics tests for Checkers server-side game logic.
Run:  cd arcade/checkers/tests && pytest test_game_logic.py -v
"""

import sys
import os
import random
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from server import (
    CheckersGame, INITIAL_BOARD, copy_board,
    EMPTY, RED_PIECE, BLACK_PIECE, RED_KING, BLACK_KING,
    BOARD_SIZE, is_red, is_black, is_king, get_owner,
    get_moves_for_piece, get_legal_moves, apply_move,
    find_move, count_pieces, check_winner, get_multi_jumps,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_game():
    game = CheckersGame()
    game.set_player_names(["Alice", "Bob"])
    game.reset()
    return game


def board_to_str(board):
    symbols = {EMPTY: '.', RED_PIECE: 'r', BLACK_PIECE: 'b', RED_KING: 'R', BLACK_KING: 'B'}
    return '\n'.join(' '.join(symbols.get(p, '?') for p in row) for row in board)


def set_board(game, config):
    for r in range(BOARD_SIZE):
        for c in range(BOARD_SIZE):
            game.board[r][c] = EMPTY
    for (r, c), piece in config.items():
        game.board[r][c] = piece


@pytest.fixture
def game():
    return make_game()


# ── Initial State ─────────────────────────────────────────────────────────────

class TestInitialState:
    def test_board_matches_initial_layout(self, game):
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                assert game.board[r][c] == INITIAL_BOARD[r][c]

    def test_red_has_12_pieces(self, game):
        red, _ = count_pieces(game.board)
        assert red == 12

    def test_black_has_12_pieces(self, game):
        _, black = count_pieces(game.board)
        assert black == 12

    def test_red_moves_first(self, game):
        assert game.get_state()['currentTurnSide'] == 'red'

    def test_phase_is_playing(self, game):
        assert game.get_state()['phase'] == 'playing'

    def test_no_winner_initially(self, game):
        assert game.get_state()['winner'] is None

    def test_sides_assigned_correctly(self, game):
        state = game.get_state()
        assert state['sides']['red'] == 'Alice'
        assert state['sides']['black'] == 'Bob'


# ── Normal Moves ──────────────────────────────────────────────────────────────

class TestNormalMoves:
    def test_red_moves_forward_diagonally(self, game):
        moves = get_moves_for_piece(game.board, 5, 2)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (4, 1) in targets or (4, 3) in targets

    def test_red_does_not_move_backward(self, game):
        moves = get_moves_for_piece(game.board, 5, 2)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (6, 1) not in targets
        assert (6, 3) not in targets

    def test_black_moves_forward_diagonally(self, game):
        moves = get_moves_for_piece(game.board, 2, 1)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (3, 0) in targets or (3, 2) in targets

    def test_black_does_not_move_backward(self, game):
        moves = get_moves_for_piece(game.board, 2, 1)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (1, 0) not in targets
        assert (1, 2) not in targets

    def test_moves_are_diagonal(self, game):
        moves = get_moves_for_piece(game.board, 5, 2)
        for m in moves:
            assert abs(m['to']['row'] - m['from']['row']) == 1
            assert abs(m['to']['col'] - m['from']['col']) == 1

    def test_cannot_move_to_occupied_square(self, game):
        game.board[4][1] = RED_PIECE
        moves = get_moves_for_piece(game.board, 5, 2)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (4, 1) not in targets

    def test_edge_piece_has_fewer_moves(self, game):
        moves = get_moves_for_piece(game.board, 5, 0)
        assert len(moves) == 1
        assert moves[0]['to'] == {'row': 4, 'col': 1}

    def test_move_type_is_normal(self, game):
        moves = get_moves_for_piece(game.board, 5, 2)
        for m in moves:
            assert m['type'] == 'normal'

    def test_handle_action_applies_move(self, game):
        game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 5, "col": 2},
            "to": {"row": 4, "col": 1},
        })
        assert game.board[5][2] == EMPTY
        assert game.board[4][1] == RED_PIECE

    def test_turn_switches_after_move(self, game):
        game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 5, "col": 2},
            "to": {"row": 4, "col": 1},
        })
        assert game.get_state()['currentTurnSide'] == 'black'

    def test_result_contains_expected_fields(self, game):
        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 5, "col": 2},
            "to": {"row": 4, "col": 1},
        })
        assert result is not None
        assert result['type'] == 'move_made'
        assert result['player'] == 'Alice'
        assert result['side'] == 'red'
        assert 'state' in result
        assert 'move' in result


# ── Jump Mechanics ────────────────────────────────────────────────────────────

class TestJumpMechanics:
    def test_single_jump_removes_captured_piece(self, game):
        set_board(game, {
            (3, 2): RED_PIECE,
            (2, 3): BLACK_PIECE,
            (1, 4): EMPTY,
        })
        game.current_turn = 'red'

        game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 3, "col": 2},
            "to": {"row": 1, "col": 4},
        })

        assert game.board[2][3] == EMPTY
        assert game.board[1][4] == RED_PIECE

    def test_jump_lands_two_squares_away(self, game):
        set_board(game, {
            (3, 2): RED_PIECE,
            (2, 3): BLACK_PIECE,
            (1, 4): EMPTY,
        })
        game.current_turn = 'red'

        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 3, "col": 2},
            "to": {"row": 1, "col": 4},
        })

        assert result['move']['type'] in ('jump', 'multi_jump')
        assert len(result['move']['jumped']) == 1

    def test_jump_over_edge_piece(self, game):
        set_board(game, {
            (1, 0): BLACK_PIECE,
            (2, 1): RED_PIECE,
            (3, 2): EMPTY,
        })
        game.current_turn = 'black'

        game.handle_action("Bob", {
            "type": "move",
            "from": {"row": 1, "col": 0},
            "to": {"row": 3, "col": 2},
        })

        assert game.board[2][1] == EMPTY
        assert game.board[3][2] == BLACK_PIECE

    def test_result_reflects_jumped_piece(self, game):
        set_board(game, {
            (3, 2): RED_PIECE,
            (2, 3): BLACK_PIECE,
            (1, 4): EMPTY,
        })
        game.current_turn = 'red'

        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 3, "col": 2},
            "to": {"row": 1, "col": 4},
        })

        assert result['move']['jumped'] == [{'row': 2, 'col': 3}]

    def test_multi_jump_chain_detected(self, game):
        """Multi-jump chains should be detected now that the bug is fixed."""
        set_board(game, {
            (5, 0): RED_PIECE,
            (4, 1): BLACK_PIECE,
            (3, 2): EMPTY,
            (2, 3): BLACK_PIECE,
            (1, 4): EMPTY,
        })
        game.current_turn = 'red'

        moves = get_moves_for_piece(game.board, 5, 0)
        multi = [m for m in moves if len(m.get('jumped', [])) >= 2]

        assert len(multi) >= 1, (
            "get_multi_jumps should detect chain jumps when piece is passed correctly"
        )

    def test_apply_move_works_for_manual_multi_jump(self, game):
        """Even though detection is broken, manually executing a multi-jump works."""
        set_board(game, {
            (5, 0): RED_PIECE,
            (4, 1): BLACK_PIECE,
            (3, 2): EMPTY,
            (2, 3): BLACK_PIECE,
            (1, 4): EMPTY,
        })
        game.current_turn = 'red'

        # First jump: (5,0) over (4,1) to (3,2)
        result1 = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 5, "col": 0},
            "to": {"row": 3, "col": 2},
        })
        assert result1 is not None
        assert game.board[4][1] == EMPTY
        assert game.board[3][2] == RED_PIECE

        # Second jump: (3,2) over (2,3) to (1,4)
        game.current_turn = 'red'  # Force turn back for test
        result2 = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 3, "col": 2},
            "to": {"row": 1, "col": 4},
        })
        assert result2 is not None
        assert game.board[2][3] == EMPTY
        assert game.board[1][4] == RED_PIECE


# ── Mandatory Jump Rule ───────────────────────────────────────────────────────

class TestMandatoryJump:
    def test_get_legal_moves_returns_only_jumps_when_available(self, game):
        set_board(game, {
            (3, 2): RED_PIECE,
            (2, 3): BLACK_PIECE,
            (1, 4): EMPTY,
            (5, 0): RED_PIECE,
        })
        game.current_turn = 'red'

        legal = get_legal_moves(game.board, 'red')
        for m in legal:
            assert m['type'] in ('jump', 'multi_jump')

    def test_server_rejects_normal_move_when_jumps_exist(self, game):
        set_board(game, {
            (3, 2): RED_PIECE,
            (2, 3): BLACK_PIECE,
            (1, 4): EMPTY,
            (5, 0): RED_PIECE,
        })
        game.current_turn = 'red'

        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 5, "col": 0},
            "to": {"row": 4, "col": 1},
        })
        assert result is None, (
            "Server should reject normal moves when any piece can jump"
        )


# ── King Promotion ────────────────────────────────────────────────────────────

class TestKingPromotion:
    def test_red_promotes_at_row_0(self, game):
        set_board(game, {(1, 0): RED_PIECE})
        game.current_turn = 'red'

        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 1, "col": 0},
            "to": {"row": 0, "col": 1},
        })

        assert game.board[0][1] == RED_KING
        assert result['promoted'] is True

    def test_black_promotes_at_row_7(self, game):
        set_board(game, {(6, 1): BLACK_PIECE})
        game.current_turn = 'black'

        result = game.handle_action("Bob", {
            "type": "move",
            "from": {"row": 6, "col": 1},
            "to": {"row": 7, "col": 0},
        })

        assert game.board[7][0] == BLACK_KING
        assert result['promoted'] is True

    def test_already_king_does_not_promote_again(self, game):
        set_board(game, {(1, 0): RED_KING})
        game.current_turn = 'red'

        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 1, "col": 0},
            "to": {"row": 0, "col": 1},
        })

        assert game.board[0][1] == RED_KING
        assert result['promoted'] is False

    def test_promotion_via_jump(self, game):
        set_board(game, {
            (2, 1): RED_PIECE,
            (1, 2): BLACK_PIECE,
            (0, 3): EMPTY,
        })
        game.current_turn = 'red'

        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 2, "col": 1},
            "to": {"row": 0, "col": 3},
        })

        assert game.board[0][3] == RED_KING
        assert result['promoted'] is True


# ── King Movement ─────────────────────────────────────────────────────────────

class TestKingMovement:
    def test_king_can_move_backward(self, game):
        set_board(game, {(1, 2): RED_KING})
        game.current_turn = 'red'

        moves = get_moves_for_piece(game.board, 1, 2)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (2, 1) in targets
        assert (2, 3) in targets

    def test_king_can_move_forward(self, game):
        set_board(game, {(3, 2): RED_KING})
        game.current_turn = 'red'

        moves = get_moves_for_piece(game.board, 3, 2)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (2, 1) in targets
        assert (2, 3) in targets

    def test_king_has_four_directions(self, game):
        set_board(game, {(3, 3): RED_KING})
        game.current_turn = 'red'

        moves = get_moves_for_piece(game.board, 3, 3)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (2, 2) in targets
        assert (2, 4) in targets
        assert (4, 2) in targets
        assert (4, 4) in targets

    def test_king_can_jump_backward(self, game):
        set_board(game, {
            (3, 2): RED_KING,
            (4, 3): BLACK_PIECE,
            (5, 4): EMPTY,
        })
        game.current_turn = 'red'

        moves = get_legal_moves(game.board, 'red')
        jumps = [m for m in moves if m['type'] in ('jump', 'multi_jump')]
        assert len(jumps) >= 1

    def test_black_king_moves_both_directions(self, game):
        set_board(game, {(5, 4): BLACK_KING})
        game.current_turn = 'black'

        moves = get_moves_for_piece(game.board, 5, 4)
        targets = {(m['to']['row'], m['to']['col']) for m in moves}
        assert (4, 3) in targets
        assert (4, 5) in targets
        assert (6, 3) in targets
        assert (6, 5) in targets


# ── Turn Enforcement ──────────────────────────────────────────────────────────

class TestTurnEnforcement:
    def test_wrong_player_rejected(self, game):
        result = game.handle_action("Bob", {
            "type": "move",
            "from": {"row": 2, "col": 1},
            "to": {"row": 3, "col": 0},
        })
        assert result is None
        assert game.board[3][0] == EMPTY

    def test_red_rejected_on_black_turn(self, game):
        game.current_turn = 'black'
        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 5, "col": 0},
            "to": {"row": 4, "col": 1},
        })
        assert result is None

    def test_unknown_player_rejected(self, game):
        result = game.handle_action("Eve", {
            "type": "move",
            "from": {"row": 5, "col": 0},
            "to": {"row": 4, "col": 1},
        })
        assert result is None


# ── Win Conditions ────────────────────────────────────────────────────────────

class TestWinConditions:
    def test_red_wins_when_no_black_pieces(self, game):
        set_board(game, {(3, 2): RED_PIECE})
        assert check_winner(game.board) == 'red'

    def test_black_wins_when_no_red_pieces(self, game):
        set_board(game, {(3, 2): BLACK_PIECE})
        assert check_winner(game.board) == 'black'

    def test_red_wins_when_black_has_no_moves(self, game):
        set_board(game, {
            (0, 1): BLACK_PIECE,
            (1, 0): RED_PIECE,
            (1, 2): RED_PIECE,
            (2, 3): RED_PIECE,
        })
        assert check_winner(game.board) == 'red'

    def test_game_over_on_last_capture(self, game):
        set_board(game, {
            (3, 2): RED_PIECE,
            (2, 3): BLACK_PIECE,
            (1, 4): EMPTY,
        })
        game.current_turn = 'red'

        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 3, "col": 2},
            "to": {"row": 1, "col": 4},
        })

        assert result['gameOver'] is True
        assert result['winner'] == 'Alice'
        assert game.phase == 'game_over'

    def test_no_winner_during_play(self, game):
        assert check_winner(game.board) is None


# ── Resignation ───────────────────────────────────────────────────────────────

class TestResignation:
    def test_red_resigns_black_wins(self, game):
        result = game.handle_action("Alice", {"type": "resign"})
        assert result is not None
        assert result['type'] == 'player_resigned'
        assert result['winner'] == 'Bob'
        assert result['winnerSide'] == 'black'
        assert game.phase == 'game_over'

    def test_black_resigns_red_wins(self, game):
        game.current_turn = 'black'
        result = game.handle_action("Bob", {"type": "resign"})
        assert result is not None
        assert result['winner'] == 'Alice'
        assert result['winnerSide'] == 'red'

    def test_resignation_after_game_over(self, game):
        game.phase = 'game_over'
        result = game.handle_action("Alice", {"type": "resign"})
        assert result is None

    def test_unknown_player_resigns(self, game):
        result = game.handle_action("Eve", {"type": "resign"})
        assert result is None


# ── Invalid Moves ─────────────────────────────────────────────────────────────

class TestInvalidMoves:
    def test_move_empty_square(self, game):
        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 4, "col": 1},
            "to": {"row": 3, "col": 0},
        })
        assert result is None
        assert game.board[3][0] == EMPTY

    def test_server_rejects_moving_opponents_piece(self, game):
        set_board(game, {
            (2, 1): BLACK_PIECE,
            (3, 0): EMPTY,
            (3, 2): EMPTY,
        })
        game.current_turn = 'red'

        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 2, "col": 1},
            "to": {"row": 3, "col": 0},
        })
        assert result is None, (
            "Server should reject moves where the piece doesn't belong to the current player"
        )

    def test_move_to_off_board(self, game):
        result = game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 0, "col": 0},
            "to": {"row": -1, "col": 1},
        })
        assert result is None

    def test_nonexistent_action_type(self, game):
        result = game.handle_action("Alice", {"type": "fly"})
        assert result is None


# ── Board Boundaries ──────────────────────────────────────────────────────────

class TestBoardBoundaries:
    def test_king_at_top_left_has_one_move(self, game):
        set_board(game, {(0, 0): RED_KING})
        game.current_turn = 'red'
        moves = get_moves_for_piece(game.board, 0, 0)
        assert len(moves) == 1
        assert moves[0]['to'] == {'row': 1, 'col': 1}

    def test_king_at_bottom_right_has_one_move(self, game):
        set_board(game, {(7, 7): BLACK_KING})
        game.current_turn = 'black'
        moves = get_moves_for_piece(game.board, 7, 7)
        assert len(moves) == 1
        assert moves[0]['to'] == {'row': 6, 'col': 6}

    def test_no_moves_go_off_board(self, game):
        set_board(game, {(0, 0): RED_PIECE})
        game.current_turn = 'red'
        moves = get_moves_for_piece(game.board, 0, 0)
        for m in moves:
            assert 0 <= m['to']['row'] < BOARD_SIZE
            assert 0 <= m['to']['col'] < BOARD_SIZE

    def test_jump_cannot_land_off_board(self, game):
        set_board(game, {
            (1, 0): BLACK_PIECE,
            (0, 1): RED_PIECE,
        })
        game.current_turn = 'black'

        moves = get_moves_for_piece(game.board, 1, 0)
        for m in moves:
            assert m['to']['row'] >= 0
            assert m['to']['col'] >= 0


# ── State Consistency ─────────────────────────────────────────────────────────

class TestStateConsistency:
    def test_state_board_matches_game_board(self, game):
        state = game.get_state()
        for r in range(BOARD_SIZE):
            for c in range(BOARD_SIZE):
                assert state['board'][r][c] == game.board[r][c]

    def test_state_reflects_turn_after_move(self, game):
        game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 5, "col": 2},
            "to": {"row": 4, "col": 1},
        })
        state = game.get_state()
        assert state['currentTurn'] == 'Bob'
        assert state['currentTurnSide'] == 'black'

    def test_game_over_state(self, game):
        set_board(game, {
            (3, 2): RED_PIECE,
            (2, 3): BLACK_PIECE,
            (1, 4): EMPTY,
        })
        game.current_turn = 'red'

        game.handle_action("Alice", {
            "type": "move",
            "from": {"row": 3, "col": 2},
            "to": {"row": 1, "col": 4},
        })

        state = game.get_state()
        assert state['phase'] == 'game_over'
        assert state['winner'] == 'Alice'


# ── Utility Functions ─────────────────────────────────────────────────────────

class TestUtilityFunctions:
    def test_is_red(self):
        assert is_red(RED_PIECE) is True
        assert is_red(RED_KING) is True
        assert is_red(BLACK_PIECE) is False
        assert is_red(EMPTY) is False

    def test_is_black(self):
        assert is_black(BLACK_PIECE) is True
        assert is_black(BLACK_KING) is True
        assert is_black(RED_PIECE) is False
        assert is_black(EMPTY) is False

    def test_is_king(self):
        assert is_king(RED_KING) is True
        assert is_king(BLACK_KING) is True
        assert is_king(RED_PIECE) is False
        assert is_king(EMPTY) is False

    def test_get_owner(self):
        assert get_owner(RED_PIECE) == 'red'
        assert get_owner(RED_KING) == 'red'
        assert get_owner(BLACK_PIECE) == 'black'
        assert get_owner(BLACK_KING) == 'black'
        assert get_owner(EMPTY) is None

    def test_count_pieces_on_initial_board(self):
        red, black = count_pieces(INITIAL_BOARD)
        assert red == 12
        assert black == 12

    def test_copy_board_is_independent(self):
        copy = copy_board(INITIAL_BOARD)
        copy[0][1] = EMPTY
        assert INITIAL_BOARD[0][1] != EMPTY

    def test_find_move_returns_correct_move(self, game):
        move = find_move(game.board, 5, 0, 4, 1)
        assert move is not None
        assert move['from'] == {'row': 5, 'col': 0}
        assert move['to'] == {'row': 4, 'col': 1}

    def test_find_move_returns_none_for_invalid(self, game):
        assert find_move(game.board, 5, 0, 3, 0) is None

    def test_find_move_returns_none_for_too_far(self, game):
        assert find_move(game.board, 5, 0, 2, 3) is None


# ── Fuzz: Random Games ───────────────────────────────────────────────────────

def play_random_game(game, max_moves=300):
    """Play a random game. Returns (moves_played, position_repeated)."""
    seen_positions = set()
    moves_played = 0

    while game.phase == 'playing' and moves_played < max_moves:
        legal = get_legal_moves(game.board, game.current_turn)
        if not legal:
            break

        pos_key = (
            tuple(tuple(row) for row in game.board),
            game.current_turn,
        )
        if pos_key in seen_positions:
            return moves_played, True
        seen_positions.add(pos_key)

        move = random.choice(legal)
        player_name = game.sides[game.current_turn]
        action = {"type": "move", "from": move["from"], "to": move["to"]}
        game.handle_action(player_name, action)
        moves_played += 1

    return moves_played, False


class TestFuzzRandomGames:
    def test_random_games_reach_valid_end(self):
        """Run 10 random games — each must end with a winner or a draw."""
        for i in range(10):
            game = make_game()
            moves_played, repeated = play_random_game(game)

            if repeated:
                # Draw by repetition — valid outcome
                assert game.phase == 'playing'
                red, black = count_pieces(game.board)
                assert red > 0 and black > 0, "Draw should have pieces from both sides"
            else:
                assert game.phase == 'game_over', (
                    f"Game {i} didn't terminate after {moves_played} moves. "
                    f"Board:\n{board_to_str(game.board)}"
                )
                assert game.winner in ('red', 'black')

    def test_jump_removes_correct_piece_count(self):
        """Jump moves remove exactly the right number of pieces."""
        for i in range(10):
            game = make_game()

            while game.phase == 'playing':
                legal = get_legal_moves(game.board, game.current_turn)
                if not legal:
                    break

                move = random.choice(legal)
                jumped_count = len(move.get('jumped', []))

                total_before = sum(
                    1 for r in range(BOARD_SIZE)
                    for c in range(BOARD_SIZE)
                    if game.board[r][c] != EMPTY
                )

                player_name = game.sides[game.current_turn]
                action = {"type": "move", "from": move["from"], "to": move["to"]}
                game.handle_action(player_name, action)

                total_after = sum(
                    1 for r in range(BOARD_SIZE)
                    for c in range(BOARD_SIZE)
                    if game.board[r][c] != EMPTY
                )

                if jumped_count > 0:
                    removed = total_before - total_after
                    assert removed == jumped_count, (
                        f"Jump removed {removed} pieces, expected {jumped_count}"
                    )
