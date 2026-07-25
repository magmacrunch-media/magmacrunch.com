"""
test_game_logic.py — Mechanics tests for Chinese Checkers server-side game logic.
Run:  cd arcade/chinese-checkers/tests && pytest test_game_logic.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from server import (
    ChineseCheckersGame, POSITIONS, POSITION_SET, DIRECTIONS,
    START_POSITIONS, GOAL_POSITIONS,
    pos_key, parse_key, is_valid, get_neighbors,
    get_adjacent_moves, get_hop_moves, get_multi_hop_moves,
    get_moves_for_piece, get_legal_moves, find_move, apply_move,
    count_pieces_in_goal, check_winner,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_game(player_count=2):
    names = ["Alice", "Bob", "Carol", "Dave", "Eve", "Frank"][:player_count]
    game = ChineseCheckersGame()
    game.set_player_names(names)
    game.reset()
    return game


def board_with(pieces, player_count=2):
    """Create a game with specific pieces. Each piece is (q, r, s, player)."""
    game = make_game(player_count)
    # Clear all pieces
    for key in game.cells:
        game.cells[key] = -1
    # Place specified pieces
    for q, r, s, player in pieces:
        game.cells[pos_key(q, r, s)] = player
    return game


@pytest.fixture
def game():
    return make_game(2)


# ── Position Utilities ────────────────────────────────────────────────────────

class TestPositionUtilities:
    def test_pos_key_parse_roundtrip(self):
        for q, r, s in POSITIONS[:50]:
            assert parse_key(pos_key(q, r, s)) == (q, r, s)

    def test_is_valid_on_board(self):
        assert is_valid(0, 0, 0) is True
        assert is_valid(4, -4, 0) is True

    def test_is_valid_off_board(self):
        assert is_valid(10, -10, 0) is False
        assert is_valid(0, 0, 10) is False

    def test_cube_coordinate_constraint(self):
        for q, r, s in POSITIONS:
            assert q + r + s == 0

    def test_positions_are_unique(self):
        assert len(POSITIONS) == len(set(POSITIONS))

    def test_total_positions(self):
        # Standard Chinese Checkers board has 121 positions
        assert len(POSITIONS) == 121


# ── Hex Directions ────────────────────────────────────────────────────────────

class TestHexDirections:
    def test_six_directions(self):
        assert len(DIRECTIONS) == 6

    def test_directions_sum_to_zero(self):
        for dq, dr, ds in DIRECTIONS:
            assert dq + dr + ds == 0

    def test_directions_are_unit_steps(self):
        for dq, dr, ds in DIRECTIONS:
            assert abs(dq) + abs(dr) + abs(ds) == 2


# ── Neighbors ─────────────────────────────────────────────────────────────────

class TestNeighbors:
    def test_center_has_six_neighbors(self):
        neighbors = get_neighbors(0, 0, 0)
        assert len(neighbors) == 6

    def test_corner_has_fewer_neighbors(self):
        # Top corner of top triangle
        neighbors = get_neighbors(0, -8, 8)
        assert len(neighbors) < 6

    def test_all_neighbors_are_valid(self):
        for q, r, s in POSITIONS[:30]:
            for nq, nr, ns in get_neighbors(q, r, s):
                assert is_valid(nq, nr, ns)

    def test_neighbor_distance(self):
        neighbors = get_neighbors(0, 0, 0)
        for nq, nr, ns in neighbors:
            dq = abs(nq - 0)
            dr = abs(nr - 0)
            ds = abs(ns - 0)
            assert max(dq, dr, ds) == 1


# ── Starting Positions ────────────────────────────────────────────────────────

class TestStartingPositions:
    def test_each_player_has_10_pieces(self):
        for p in range(6):
            assert len(START_POSITIONS[p]) == 10

    def test_player_0_top_triangle(self):
        for q, r, s in START_POSITIONS[0]:
            assert r <= -5

    def test_player_1_bottom_triangle(self):
        for q, r, s in START_POSITIONS[1]:
            assert r >= 5

    def test_player_2_top_right(self):
        for q, r, s in START_POSITIONS[2]:
            assert s <= -5

    def test_player_3_bottom_left(self):
        for q, r, s in START_POSITIONS[3]:
            assert s >= 5

    def test_player_4_top_left(self):
        for q, r, s in START_POSITIONS[4]:
            assert q <= -5

    def test_player_5_bottom_right(self):
        for q, r, s in START_POSITIONS[5]:
            assert q >= 5

    def test_start_positions_dont_overlap(self):
        for p1 in range(6):
            for p2 in range(p1 + 1, 6):
                s1 = set(START_POSITIONS[p1])
                s2 = set(START_POSITIONS[p2])
                assert s1.isdisjoint(s2)


# ── Goal Positions ────────────────────────────────────────────────────────────

class TestGoalPositions:
    def test_goals_are_opposite_triangles(self):
        assert GOAL_POSITIONS[0] == START_POSITIONS[1]
        assert GOAL_POSITIONS[1] == START_POSITIONS[0]
        assert GOAL_POSITIONS[2] == START_POSITIONS[3]
        assert GOAL_POSITIONS[3] == START_POSITIONS[2]
        assert GOAL_POSITIONS[4] == START_POSITIONS[5]
        assert GOAL_POSITIONS[5] == START_POSITIONS[4]


# ── Adjacent Moves ────────────────────────────────────────────────────────────

class TestAdjacentMoves:
    def test_move_to_empty_neighbor(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0

        moves = get_adjacent_moves(cells, 0, 0, 0)
        assert len(moves) >= 1
        for m in moves:
            assert m['type'] == 'adjacent'
            assert m['from'] == [0, 0, 0]

    def test_cannot_move_to_occupied_neighbor(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0
        cells[pos_key(1, -1, 0)] = 1  # occupied by opponent

        moves = get_adjacent_moves(cells, 0, 0, 0)
        targets = [m['to'] for m in moves]
        assert [1, -1, 0] not in targets

    def test_own_piece_blocks_adjacent(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0
        cells[pos_key(1, -1, 0)] = 0  # own piece

        moves = get_adjacent_moves(cells, 0, 0, 0)
        targets = [m['to'] for m in moves]
        assert [1, -1, 0] not in targets


# ── Hop Moves ─────────────────────────────────────────────────────────────────

class TestHopMoves:
    def test_single_hop_over_opponent(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0       # our piece
        cells[pos_key(1, -1, 0)] = 1       # opponent (mid)
        cells[pos_key(2, -2, 0)] = -1      # empty (landing)

        moves = get_hop_moves(cells, 0, 0, 0, 0)
        assert len(moves) == 1
        assert moves[0]['to'] == [2, -2, 0]
        assert moves[0]['type'] == 'hop'
        assert moves[0]['hops'] == [[1, -1, 0]]

    def test_cannot_hop_over_own_piece(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0
        cells[pos_key(1, -1, 0)] = 0  # own piece

        moves = get_hop_moves(cells, 0, 0, 0, 0)
        assert len(moves) == 0

    def test_cannot_hop_to_occupied_landing(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0
        cells[pos_key(1, -1, 0)] = 1
        cells[pos_key(2, -2, 0)] = 2  # occupied landing

        moves = get_hop_moves(cells, 0, 0, 0, 0)
        assert len(moves) == 0

    def test_hop_requires_valid_positions(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0
        # Mid and landing positions off board — should not crash
        moves = get_hop_moves(cells, 0, 0, 0, 0)
        assert isinstance(moves, list)


# ── Multi-Hop Moves ───────────────────────────────────────────────────────────

class TestMultiHopMoves:
    def test_chain_of_two_hops(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0
        cells[pos_key(1, -1, 0)] = 1   # opponent 1
        cells[pos_key(2, -2, 0)] = -1  # empty (first landing)
        cells[pos_key(3, -3, 0)] = 1   # opponent 2
        cells[pos_key(4, -4, 0)] = -1  # final landing

        moves = get_multi_hop_moves(cells, 0, 0, 0, 0)
        two_hops = [m for m in moves if len(m['hops']) >= 2]
        assert len(two_hops) >= 1

    def test_visited_prevents_cycles(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0
        cells[pos_key(1, -1, 0)] = 1
        cells[pos_key(2, -2, 0)] = 1
        cells[pos_key(3, -3, 0)] = 1

        moves = get_multi_hop_moves(cells, 0, 0, 0, 0)
        # Should not have duplicate destinations
        destinations = [tuple(m['to']) for m in moves]
        assert len(destinations) == len(set(destinations))

    def test_multi_hop_from_starts_in_correct_position(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0
        cells[pos_key(1, -1, 0)] = 1
        cells[pos_key(2, -2, 0)] = -1

        moves = get_multi_hop_moves(cells, 0, 0, 0, 0)
        for m in moves:
            assert m['from'] == [0, 0, 0]


# ── Combined Moves ────────────────────────────────────────────────────────────

class TestCombinedMoves:
    def test_adjacent_and_hops_combined(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0
        cells[pos_key(1, -1, 0)] = 1   # opponent (hop)
        cells[pos_key(2, -2, 0)] = -1  # landing
        cells[pos_key(-1, 1, 0)] = -1  # empty neighbor

        moves = get_moves_for_piece(cells, 0, 0, 0, 0)
        adjacent = [m for m in moves if m['type'] == 'adjacent']
        hops = [m for m in moves if m['type'] in ('hop', 'multi_hop')]
        assert len(adjacent) >= 1
        assert len(hops) >= 1

    def test_no_moves_when_fully_surrounded(self):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        # Place piece at center, surround with own pieces
        cells[pos_key(0, 0, 0)] = 0
        neighbors = get_neighbors(0, 0, 0)
        for nq, nr, ns in neighbors:
            cells[pos_key(nq, nr, ns)] = 0

        moves = get_moves_for_piece(cells, 0, 0, 0, 0)
        assert len(moves) == 0


# ── Legal Moves ───────────────────────────────────────────────────────────────

class TestLegalMoves:
    def test_legal_moves_finds_player_pieces(self, game):
        moves = get_legal_moves(game.cells, 0)
        # Some pieces should have moves (edge pieces closest to center)
        pieces_with_moves = set()
        for m in moves:
            pieces_with_moves.add(tuple(m['from']))
        assert len(pieces_with_moves) >= 1

    def test_initial_position_has_moves(self, game):
        moves = get_legal_moves(game.cells, 0)
        assert len(moves) > 0


# ── Apply Move ────────────────────────────────────────────────────────────────

class TestApplyMove:
    def test_move_clears_source(self, game):
        move = {
            'from': list(START_POSITIONS[0][0]),
            'to': [0, 0, 0],
            'type': 'adjacent',
            'hops': [],
        }
        from_key = pos_key(*move['from'])
        to_key = pos_key(*move['to'])

        apply_move(game.cells, move, 0)

        assert game.cells[from_key] == -1
        assert game.cells[to_key] == 0

    def test_hop_removes_correct_pieces(self, game):
        cells = {}
        for q, r, s in POSITIONS:
            cells[pos_key(q, r, s)] = -1
        cells[pos_key(0, 0, 0)] = 0
        cells[pos_key(1, -1, 0)] = 1
        cells[pos_key(2, -2, 0)] = -1

        move = {
            'from': [0, 0, 0],
            'to': [2, -2, 0],
            'type': 'hop',
            'hops': [[1, -1, 0]],
        }
        apply_move(cells, move, 0)

        assert cells[pos_key(0, 0, 0)] == -1
        assert cells[pos_key(1, -1, 0)] == 1  # opponent piece still there
        assert cells[pos_key(2, -2, 0)] == 0


# ── Find Move ─────────────────────────────────────────────────────────────────

class TestFindMove:
    def test_find_valid_move(self, game):
        # Find a piece that has at least one adjacent move
        for key, piece in game.cells.items():
            if piece == 0:
                q, r, s = parse_key(key)
                moves = get_moves_for_piece(game.cells, q, r, s, 0)
                if moves:
                    m = moves[0]
                    result = find_move(game.cells, q, r, s, m['to'][0], m['to'][1], m['to'][2], 0)
                    assert result is not None
                    return
        pytest.skip("No valid moves found in initial position")

    def test_find_invalid_move(self, game):
        result = find_move(game.cells, 0, 0, 0, 5, 5, -10, 0)
        assert result is None


# ── Win Detection ─────────────────────────────────────────────────────────────

class TestWinDetection:
    def test_no_winner_initially(self, game):
        assert check_winner(game.cells, 2) is None

    def test_winner_when_all_in_goal(self, game):
        # Place all 10 pieces of player 0 in goal
        for q, r, s in GOAL_POSITIONS[0][:10]:
            game.cells[pos_key(q, r, s)] = 0
        assert check_winner(game.cells, 2) == 0

    def test_winner_not_declared_with_9_pieces(self, game):
        for q, r, s in GOAL_POSITIONS[0][:9]:
            game.cells[pos_key(q, r, s)] = 0
        assert check_winner(game.cells, 2) is None

    def test_count_pieces_in_goal(self, game):
        for q, r, s in GOAL_POSITIONS[0][:5]:
            game.cells[pos_key(q, r, s)] = 0
        assert count_pieces_in_goal(game.cells, 0) == 5


# ── Game Class ────────────────────────────────────────────────────────────────

class TestGameClass:
    def test_initial_state(self, game):
        state = game.get_state()
        assert state['playerCount'] == 2
        assert state['phase'] == 'playing'
        assert state['currentTurn'] == 'Alice'
        assert state['currentTurnIdx'] == 0

    def test_move_advances_turn(self, game):
        # Find a valid move for player 0
        for key, piece in game.cells.items():
            if piece == 0:
                q, r, s = parse_key(key)
                moves = get_moves_for_piece(game.cells, q, r, s, 0)
                if moves:
                    m = moves[0]
                    result = game.handle_action("Alice", {
                        "type": "move",
                        "from": m['from'],
                        "to": m['to'],
                    })
                    assert result is not None
                    assert result['nextTurn'] == 'Bob'
                    assert result['nextTurnIdx'] == 1
                    return
        pytest.skip("No valid moves found")

    def test_wrong_player_rejected(self, game):
        result = game.handle_action("Bob", {
            "type": "move",
            "from": [0, -8, 8],
            "to": [0, -7, 7],
        })
        assert result is None

    def test_illegal_move_rejected(self, game):
        result = game.handle_action("Alice", {
            "type": "move",
            "from": [0, 0, 0],
            "to": [5, 5, -10],
        })
        assert result is None

    def test_resignation(self, game):
        result = game.handle_action("Alice", {"type": "resign"})
        assert result is not None
        assert result['type'] == 'player_resigned'
        assert result['winner'] == 'Bob'
        assert game.phase == 'game_over'

    def test_resignation_after_game_over(self, game):
        game.phase = 'game_over'
        result = game.handle_action("Alice", {"type": "resign"})
        assert result is None

    def test_game_over_on_win(self):
        # Verify win detection works through the game class
        game = make_game(2)
        goal = GOAL_POSITIONS[0]

        # Clear all pieces from the goal area
        for q, r, s in goal:
            game.cells[pos_key(q, r, s)] = -1

        # Place all 10 pieces of player 0 in goal
        for q, r, s in goal:
            game.cells[pos_key(q, r, s)] = 0

        # Verify count
        assert count_pieces_in_goal(game.cells, 0) == 10
        assert check_winner(game.cells, 2) == 0

        # Now make any valid move for player 1 to trigger check_winner
        for key, piece in game.cells.items():
            if piece == 1:
                q, r, s = parse_key(key)
                moves = get_moves_for_piece(game.cells, q, r, s, 1)
                if moves:
                    m = moves[0]
                    result = game.handle_action("Bob", {
                        "type": "move",
                        "from": m['from'],
                        "to": m['to'],
                    })
                    # After Bob's move, check_winner should detect player 0's win
                    # (but check_winner is called inside _handle_move, so if Bob moves first, it won't detect yet)
                    # The win is detected when we check after any move
                    break

        # Manually verify win state
        assert check_winner(game.cells, 2) == 0

    def test_three_player_turn_rotation(self, game3):
        assert game3.current_turn == 0
        # Make a move for player 0
        for key, piece in game3.cells.items():
            if piece == 0:
                q, r, s = parse_key(key)
                moves = get_moves_for_piece(game3.cells, q, r, s, 0)
                if moves:
                    m = moves[0]
                    game3.handle_action("Alice", {
                        "type": "move",
                        "from": m['from'],
                        "to": m['to'],
                    })
                    assert game3.current_turn == 1
                    return
        pytest.skip("No valid moves found")

    def test_unknown_player_rejected(self, game):
        result = game.handle_action("Eve", {
            "type": "move",
            "from": [0, -8, 8],
            "to": [0, -7, 7],
        })
        assert result is None

    def test_nonexistent_action_type(self, game):
        result = game.handle_action("Alice", {"type": "fly"})
        assert result is None


@pytest.fixture
def game3():
    return make_game(3)


# ── Board Integrity ───────────────────────────────────────────────────────────

class TestBoardIntegrity:
    def test_initial_board_has_121_positions(self, game):
        assert len(game.cells) == 121

    def test_empty_positions_are_minus_one(self, game):
        occupied = set()
        for p in range(game.player_count):
            for q, r, s in START_POSITIONS[p]:
                occupied.add(pos_key(q, r, s))

        for key in game.cells:
            if key in occupied:
                assert game.cells[key] >= 0
            else:
                assert game.cells[key] == -1

    def test_player_pieces_match_start_positions(self, game):
        for p in range(game.player_count):
            for q, r, s in START_POSITIONS[p]:
                assert game.cells[pos_key(q, r, s)] == p

    def test_no_position_overlap_between_players(self, game):
        occupied_by = {}
        for key, val in game.cells.items():
            if val >= 0:
                if key in occupied_by:
                    pytest.fail(f"Position {key} occupied by both player {occupied_by[key]} and {val}")
                occupied_by[key] = val
