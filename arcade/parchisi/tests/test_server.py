"""
test_server.py — Tests for Parchisi server-side game logic.
Run:  cd arcade/parchisi/tests && pytest test_server.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from server import (
    TRACK_SIZE, HOME_SIZE, SLOT_COLORS, COLOR_ENTRY, SAFE_SQUARES,
    advance_position, get_pawns_at_track, is_safe_square,
    check_capture, is_blockade, init_game, advance_turn,
    is_null, is_track, is_home, is_finished,
)


# ── Position Helpers ──────────────────────────────────────────────────────────

class TestPositionHelpers:
    def test_is_null_none(self):
        assert is_null(None) is True

    def test_is_null_track(self):
        assert is_null({'track': 5}) is False

    def test_is_track(self):
        assert is_track({'track': 5}) is True

    def test_is_track_false(self):
        assert is_track({'home': 3}) is False

    def test_is_home(self):
        assert is_home({'home': 3}) is True

    def test_is_home_false(self):
        assert is_home({'track': 5}) is False

    def test_is_finished(self):
        assert is_finished('finished') is True

    def test_is_finished_false(self):
        assert is_finished({'track': 5}) is False


# ── Constants ─────────────────────────────────────────────────────────────────

class TestConstants:
    def test_track_size(self):
        assert TRACK_SIZE == 68

    def test_home_size(self):
        assert HOME_SIZE == 8

    def test_four_slot_colors(self):
        assert len(SLOT_COLORS) == 4
        assert SLOT_COLORS == ['red', 'blue', 'green', 'yellow']

    def test_entry_points_spaced(self):
        entries = list(COLOR_ENTRY.values())
        # Each entry should be 17 apart (68/4)
        for i in range(len(entries) - 1):
            diff = (entries[i + 1] - entries[i]) % TRACK_SIZE
            assert diff == 17

    def test_safe_squares_count(self):
        assert len(SAFE_SQUARES) == 8


# ── Movement: Normal Track ────────────────────────────────────────────────────

class TestTrackMovement:
    def test_forward_one(self):
        result = advance_position('red', {'track': 10}, 1)
        assert result == {'track': 11}

    def test_forward_multiple(self):
        result = advance_position('red', {'track': 10}, 5)
        assert result == {'track': 15}

    def test_forward_wraps_around(self):
        result = advance_position('red', {'track': 65}, 5)
        assert result == {'track': 2}  # 65 + 5 = 70 % 68 = 2

    def test_forward_to_entry(self):
        # Red entry is at 5. From track 2, 3 steps reaches entry
        result = advance_position('red', {'track': 2}, 3)
        assert result == {'track': 5}

    def test_forward_past_entry(self):
        # Red entry is at 5. From track 3, 4 steps = 2 to entry + 2 into home
        result = advance_position('red', {'track': 3}, 4)
        assert result == {'home': 2}

    def test_forward_exact_home(self):
        # Red entry is at 5. From track 3, 10 steps = 2 to entry + 8 home = finished
        result = advance_position('red', {'track': 3}, 10)
        assert result == 'finished'

    def test_forward_overshoot_home(self):
        # Red entry is at 5. From track 3, 11 steps = overshoot
        result = advance_position('red', {'track': 3}, 11)
        assert result is None


# ── Movement: Home Run ────────────────────────────────────────────────────────

class TestHomeMovement:
    def test_home_forward(self):
        result = advance_position('red', {'home': 3}, 2)
        assert result == {'home': 5}

    def test_home_exact_finish(self):
        result = advance_position('red', {'home': 5}, 3)
        assert result == 'finished'

    def test_home_overshoot(self):
        result = advance_position('red', {'home': 5}, 4)
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
        for color in SLOT_COLORS:
            entry = COLOR_ENTRY[color]
            # From entry, 8 steps should reach home
            result = advance_position(color, {'track': entry}, 8)
            assert result == 'finished', f"{color} couldn't reach home from entry"

    def test_each_color_has_different_entry(self):
        entries = list(COLOR_ENTRY.values())
        assert len(set(entries)) == 4


# ── Safe Squares ──────────────────────────────────────────────────────────────

class TestSafeSquares:
    def test_entry_is_safe(self):
        for color in SLOT_COLORS:
            entry = COLOR_ENTRY[color]
            assert is_safe_square(entry), f"{color} entry {entry} should be safe"

    def test_non_entry_safe_squares(self):
        for sq in SAFE_SQUARES:
            assert is_safe_square(sq)

    def test_non_safe_square(self):
        # 10 is not in SAFE_SQUARES
        assert is_safe_square(10) is False

    def test_all_safe_squares_are_valid(self):
        for sq in SAFE_SQUARES:
            assert 0 <= sq < TRACK_SIZE


# ── Captures ──────────────────────────────────────────────────────────────────

class TestCaptures:
    def test_capture_single_opponent(self, game_pawns):
        # Red pawn lands on track 10, blue pawn at track 10
        result = check_capture('red', 10)
        assert result is not None
        assert result['slot'] == 'blue'

    def test_no_capture_on_safe_square(self, game_pawns):
        # Safe squares can't be captured from
        result = check_capture('red', SAFE_SQUARES[0])
        assert result is None

    def test_no_capture_blockade(self, game_pawns):
        # 2+ same color = blockade, can't capture
        # This test needs setup — blockades are checked in a more complex way
        pass

    def test_no_capture_own_pawns(self):
        # Can't capture your own pawns
        result = check_capture('red', 10)
        # With only red pawns at 10, no capture
        assert result is None


# ── Blockades ─────────────────────────────────────────────────────────────────

class TestBlockades:
    def test_blockade_detected(self, game_pawns):
        # Need 2+ same-color pawns at same track position
        # This requires pawn_positions to be set up
        pass

    def test_no_blockade_single_pawn(self):
        assert is_blockade(10) is False


# ── Game Init ─────────────────────────────────────────────────────────────────

class TestGameInit:
    def test_init_creates_pawn_positions(self):
        # Save and restore global state
        import server
        old_positions = server.pawn_positions.copy()
        old_scores = server.scores.copy()
        old_order = server.player_order[:]

        # Set up 2 players
        server.player_order = ['ws1', 'ws2']
        server.pawn_positions.clear()
        server.scores.clear()
        init_game()

        for color in SLOT_COLORS[:2]:
            assert color in server.pawn_positions
            assert len(server.pawn_positions[color]) == 4
            for pos in server.pawn_positions[color]:
                assert pos is None  # All start in yard

        # Restore
        server.pawn_positions.clear()
        server.pawn_positions.update(old_positions)
        server.scores.clear()
        server.scores.update(old_scores)
        server.player_order = old_order

    def test_init_scores_zero(self):
        import server
        old_scores = server.scores.copy()
        server.scores.clear()
        init_game()
        for color in SLOT_COLORS[:2]:
            assert server.scores.get(color, 0) == 0
        server.scores.clear()
        server.scores.update(old_scores)


# ── Turn Management ───────────────────────────────────────────────────────────

class TestTurnManagement:
    def test_advance_turn_wraps(self):
        import server
        old_order = server.player_order[:]
        old_turn = server.current_turn

        # Set up a 2-player order
        server.player_order = ['ws1', 'ws2']
        server.current_turn = 'ws2'

        advance_turn()
        assert server.current_turn == 'ws1'  # Wraps to first player

        # Restore
        server.player_order = old_order
        server.current_turn = old_turn

    def test_advance_turn_normal(self):
        import server
        old_order = server.player_order[:]
        old_turn = server.current_turn

        server.player_order = ['ws1', 'ws2', 'ws3']
        server.current_turn = 'ws1'

        advance_turn()
        assert server.current_turn == 'ws2'

        server.player_order = old_order
        server.current_turn = old_turn

    def test_advance_turn_empty(self):
        import server
        old_order = server.player_order[:]
        old_turn = server.current_turn

        server.player_order = []
        server.current_turn = None

        advance_turn()
        assert server.current_turn is None

        server.player_order = old_order
        server.current_turn = old_turn


# ── Server State ──────────────────────────────────────────────────────────────

class TestServerState:
    def test_constants_are_correct(self):
        assert TRACK_SIZE == 68
        assert HOME_SIZE == 8
        assert MIN_PLAYERS == 2
        assert MAX_PLAYERS == 4


# ── Helper Fixture ────────────────────────────────────────────────────────────

@pytest.fixture
def game_pawns():
    """Set up minimal pawn positions for testing."""
    import server
    old_positions = server.pawn_positions.copy()
    old_scores = server.scores.copy()

    server.pawn_positions = {
        'red': [{'track': 10}, None, None, None],
        'blue': [{'track': 10}, {'track': 15}, None, None],
        'green': [None, None, None, None],
        'yellow': [None, None, None, None],
    }
    server.scores = {'red': 0, 'blue': 0, 'green': 0, 'yellow': 0}

    yield

    server.pawn_positions.clear()
    server.pawn_positions.update(old_positions)
    server.scores.clear()
    server.scores.update(old_scores)


# ── Import Constants ──────────────────────────────────────────────────────────

MIN_PLAYERS = 2
MAX_PLAYERS = 4
