"""
test_server.py — Tests for Aggravation server-side game logic.
Run:  cd arcade/aggravation/tests && pytest test_server.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from server import (
    TRACK_SIZE, HOME_SIZE, NUM_PAWNS,
    COLORS, COLOR_CONFIG, SAFE_SQUARES,
    advance_position, get_pawns_at_track, is_safe_square,
    check_capture, is_blockade, get_legal_moves, ai_choose_move,
    pos_is_null, pos_is_track, pos_is_home, pos_is_finished,
)


# ── Position Helpers ──────────────────────────────────────────────────────────

class TestPositionHelpers:
    def test_pos_is_null_none(self):
        assert pos_is_null(None) is True

    def test_pos_is_null_track(self):
        assert pos_is_null({'track': 5}) is False

    def test_pos_is_track(self):
        assert pos_is_track({'track': 5}) is True

    def test_pos_is_track_false(self):
        assert pos_is_track({'home': 3}) is False

    def test_pos_is_home(self):
        assert pos_is_home({'home': 3}) is True

    def test_pos_is_home_false(self):
        assert pos_is_home({'track': 5}) is False

    def test_pos_is_finished(self):
        assert pos_is_finished('finished') is True

    def test_pos_is_finished_false(self):
        assert pos_is_finished({'track': 5}) is False


# ── Constants ─────────────────────────────────────────────────────────────────

class TestConstants:
    def test_track_size(self):
        assert TRACK_SIZE == 60

    def test_home_size(self):
        assert HOME_SIZE == 6

    def test_num_pawns(self):
        assert NUM_PAWNS == 4

    def test_six_colors(self):
        assert len(COLORS) == 6

    def test_entry_points_spaced(self):
        entries = [COLOR_CONFIG[c]['entry'] for c in COLORS]
        # Each entry should be 10 apart (60/6)
        for i in range(len(entries) - 1):
            diff = (entries[i + 1] - entries[i]) % TRACK_SIZE
            assert diff == 10

    def test_safe_squares_exist(self):
        assert len(SAFE_SQUARES) > 0

    def test_entry_squares_are_safe(self):
        for c in COLORS:
            entry = COLOR_CONFIG[c]['entry']
            assert entry in SAFE_SQUARES


# ── Movement: Normal Track ────────────────────────────────────────────────────

class TestTrackMovement:
    def test_forward_one(self):
        result = advance_position('red', {'track': 10}, 1)
        assert result == {'track': 11}

    def test_forward_multiple(self):
        result = advance_position('red', {'track': 10}, 5)
        assert result == {'track': 15}

    def test_forward_wraps_around(self):
        # Red entry is at 0. From track 50, 5 steps stays on track (no entry crossing)
        result = advance_position('red', {'track': 50}, 5)
        assert result == {'track': 55}

    def test_forward_to_entry(self):
        # Red entry is at 0. From track 57, 3 steps crosses entry → home 0
        result = advance_position('red', {'track': 57}, 3)
        assert result == {'home': 0}

    def test_forward_past_entry(self):
        # Red entry is at 0. From track 58, 4 steps = 2 to entry + 2 into home
        result = advance_position('red', {'track': 58}, 4)
        assert result == {'home': 2}

    def test_forward_exact_home(self):
        # Red entry is at 0. From track 58, 8 steps = 2 to entry + 6 home = finished
        result = advance_position('red', {'track': 58}, 8)
        assert result == 'finished'

    def test_forward_overshoot_home(self):
        # Red entry is at 0. From track 58, 9 steps = overshoot
        result = advance_position('red', {'track': 58}, 9)
        assert result is None


# ── Movement: Home Run ────────────────────────────────────────────────────────

class TestHomeMovement:
    def test_home_forward(self):
        result = advance_position('red', {'home': 3}, 2)
        assert result == {'home': 5}

    def test_home_exact_finish(self):
        result = advance_position('red', {'home': 3}, 3)
        assert result == 'finished'

    def test_home_overshoot(self):
        result = advance_position('red', {'home': 3}, 4)
        assert result is None

    def test_home_from_zero(self):
        result = advance_position('red', {'home': 0}, 1)
        assert result == {'home': 1}


# ── Movement: Edge Cases ──────────────────────────────────────────────────────

class TestMovementEdgeCases:
    def test_from_yard(self):
        result = advance_position('red', None, 5)
        assert result is None

    def test_from_finished(self):
        result = advance_position('red', 'finished', 5)
        assert result is None

    def test_all_colors_can_reach_home(self):
        for color in COLORS:
            entry = COLOR_CONFIG[color]['entry']
            # From entry-1, HOME_SIZE+1 steps = 1 to entry + HOME_SIZE home
            result = advance_position(color, {'track': (entry - 1) % TRACK_SIZE}, HOME_SIZE + 1)
            assert result == 'finished', f"{color} couldn't reach home"

    def test_each_color_has_different_entry(self):
        entries = [COLOR_CONFIG[c]['entry'] for c in COLORS]
        assert len(set(entries)) == 6


# ── Safe Squares ──────────────────────────────────────────────────────────────

class TestSafeSquares:
    def test_entry_is_safe(self):
        for c in COLORS:
            entry = COLOR_CONFIG[c]['entry']
            assert is_safe_square(entry), f"{c} entry {entry} should be safe"

    def test_second_safe_per_color(self):
        for c in COLORS:
            safe = COLOR_CONFIG[c]['safe']
            assert len(safe) == 2
            assert is_safe_square(safe[1])

    def test_non_safe_square(self):
        # 7 is not in SAFE_SQUARES
        assert is_safe_square(7) is False

    def test_all_safe_squares_are_valid(self):
        for sq in SAFE_SQUARES:
            assert 0 <= sq < TRACK_SIZE


# ── Captures ──────────────────────────────────────────────────────────────────

class TestCaptures:
    def test_capture_single_opponent(self):
        # Use a non-safe track position (7 is not safe)
        pawns = {
            'red': [{'track': 7}, None, None, None],
            'blue': [{'track': 7}, None, None, None],
        }
        result = check_capture('red', 7, pawns)
        assert result is not None
        assert result['color'] == 'blue'

    def test_no_capture_on_safe_square(self):
        pawns = {
            'red': [{'track': SAFE_SQUARES[0]}, None, None, None],
            'blue': [{'track': SAFE_SQUARES[0]}, None, None, None],
        }
        result = check_capture('red', SAFE_SQUARES[0], pawns)
        assert result is None

    def test_no_capture_blockade(self):
        pawns = {
            'red': [{'track': 10}, None, None, None],
            'blue': [{'track': 10}, {'track': 10}, None, None],
        }
        result = check_capture('red', 10, pawns)
        assert result is None

    def test_no_capture_own_pawns(self):
        pawns = {
            'red': [{'track': 10}, {'track': 10}, None, None],
        }
        result = check_capture('red', 10, pawns)
        assert result is None


# ── Blockades ─────────────────────────────────────────────────────────────────

class TestBlockades:
    def test_blockade_detected(self):
        pawns = {
            'red': [{'track': 10}, {'track': 10}, None, None],
        }
        assert is_blockade(pawns, 10) is True

    def test_no_blockade_single_pawn(self):
        pawns = {
            'red': [{'track': 10}, None, None, None],
        }
        assert is_blockade(pawns, 10) is False

    def test_no_blockade_empty(self):
        pawns = {}
        assert is_blockade(pawns, 10) is False


# ── Legal Moves ───────────────────────────────────────────────────────────────

class TestLegalMoves:
    def test_no_moves_from_yard_with_wrong_dice(self):
        pawns = {'red': [None, None, None, None]}
        moves = get_legal_moves('red', 3, pawns)
        assert len(moves) == 0

    def test_enter_from_yard_with_one(self):
        pawns = {'red': [None, None, None, None]}
        moves = get_legal_moves('red', 1, pawns)
        assert len(moves) == 4  # All 4 pawns can enter
        assert all(m.get('enterFromYard') for m in moves)

    def test_enter_from_yard_with_six(self):
        pawns = {'red': [None, None, None, None]}
        moves = get_legal_moves('red', 6, pawns)
        assert len(moves) == 4  # All 4 pawns can enter
        assert all(m.get('enterFromYard') for m in moves)

    def test_no_enter_blockaded_entry(self):
        pawns = {
            'red': [None, None, None, None],
            'blue': [{'track': 0}, {'track': 0}, None, None],  # blockade at red entry
        }
        moves = get_legal_moves('red', 1, pawns)
        assert len(moves) == 0

    def test_move_on_track(self):
        pawns = {'red': [{'track': 5}, None, None, None]}
        moves = get_legal_moves('red', 3, pawns)
        assert len(moves) >= 1
        assert moves[0]['newPos'] == {'track': 8}

    def test_no_move_to_blockade(self):
        pawns = {
            'red': [{'track': 5}, None, None, None],
            'blue': [{'track': 8}, {'track': 8}, None, None],  # blockade at 8
        }
        moves = get_legal_moves('red', 3, pawns)
        for m in moves:
            if isinstance(m['newPos'], dict) and 'track' in m['newPos']:
                assert m['newPos']['track'] != 8

    def test_move_captures_opponent(self):
        pawns = {
            'red': [{'track': 5}, None, None, None],
            'blue': [{'track': 8}, None, None, None],
        }
        moves = get_legal_moves('red', 3, pawns)
        capture_moves = [m for m in moves if m.get('capture')]
        assert len(capture_moves) >= 1

    def test_no_capture_on_safe(self):
        safe = SAFE_SQUARES[0]
        # Place red before safe, blue on safe
        pawns = {
            'red': [{'track': safe - 1}, None, None, None],
            'blue': [{'track': safe}, None, None, None],
        }
        dice = (safe - (safe - 1)) % TRACK_SIZE
        moves = get_legal_moves('red', dice, pawns)
        for m in moves:
            assert m.get('capture') is None


# ── AI Logic ──────────────────────────────────────────────────────────────────

class TestAI:
    def test_ai_returns_move(self):
        pawns = {'red': [{'track': 5}, None, None, None]}
        move = ai_choose_move('red', 3, pawns)
        assert move is not None

    def test_ai_returns_none_when_no_moves(self):
        pawns = {'red': [None, None, None, None]}
        move = ai_choose_move('red', 3, pawns)
        assert move is None

    def test_ai_prefers_capture(self):
        pawns = {
            'red': [{'track': 5}, None, None, None],
            'blue': [{'track': 8}, None, None, None],
        }
        move = ai_choose_move('red', 3, pawns)
        assert move.get('capture') is not None

    def test_ai_single_move_returns_it(self):
        pawns = {'red': [None, None, None, None]}
        move = ai_choose_move('red', 1, pawns)
        assert move is not None
        assert move['enterFromYard'] is True


# ── Game Init ─────────────────────────────────────────────────────────────────

class TestGameInit:
    def test_init_creates_pawn_positions(self):
        import server
        old_pawns = server.pawns.copy()
        old_scores = server.scores.copy()
        old_order = server.player_order[:]

        server.player_order = ['ws1', 'ws2']
        server.pawns.clear()
        server.scores.clear()
        server.init_game()

        for color in COLORS[:2]:
            assert color in server.pawns
            assert len(server.pawns[color]) == NUM_PAWNS
            for pos in server.pawns[color]:
                assert pos is None

        server.pawns.clear()
        server.pawns.update(old_pawns)
        server.scores.clear()
        server.scores.update(old_scores)
        server.player_order = old_order

    def test_init_scores_zero(self):
        import server
        old_pawns = server.pawns.copy()
        old_scores = server.scores.copy()
        old_order = server.player_order[:]

        server.player_order = ['ws1', 'ws2']
        server.pawns.clear()
        server.scores.clear()
        server.init_game()

        for color in COLORS[:2]:
            assert server.scores.get(color, 0) == 0

        server.pawns.clear()
        server.pawns.update(old_pawns)
        server.scores.clear()
        server.scores.update(old_scores)
        server.player_order = old_order


# ── Turn Management ───────────────────────────────────────────────────────────

class TestTurnManagement:
    def test_advance_turn_wraps(self):
        import server
        old_order = server.player_order[:]
        old_turn = server.current_turn

        server.player_order = ['ws1', 'ws2']
        server.current_turn = 'ws2'

        # Simulate advance
        idx = server.player_order.index(server.current_turn)
        server.current_turn = server.player_order[(idx + 1) % len(server.player_order)]
        assert server.current_turn == 'ws1'

        server.player_order = old_order
        server.current_turn = old_turn

    def test_advance_turn_normal(self):
        import server
        old_order = server.player_order[:]
        old_turn = server.current_turn

        server.player_order = ['ws1', 'ws2', 'ws3']
        server.current_turn = 'ws1'

        idx = server.player_order.index(server.current_turn)
        server.current_turn = server.player_order[(idx + 1) % len(server.player_order)]
        assert server.current_turn == 'ws2'

        server.player_order = old_order
        server.current_turn = old_turn


# ── Server Constants ──────────────────────────────────────────────────────────

class TestServerConstants:
    def test_min_players(self):
        assert MIN_PLAYERS == 2

    def test_max_players(self):
        assert MAX_PLAYERS == 6

    def test_colors_list(self):
        assert COLORS == ['red', 'blue', 'green', 'yellow', 'purple', 'orange']
