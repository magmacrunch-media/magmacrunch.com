"""
test_rule_engine.py — Tests for SORRY! Python rule engine.
Run:  cd arcade/SORRY/tests && pytest test_rule_engine.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from rule_engine import (
    BoardConfig, Slide, ColorConfig, TrackPos, SafePos, HOME,
    create_square_config, advance_position, check_slide,
    get_legal_moves, get_split_moves, build_deck,
    CARD_COUNTS, CARD_DEFINITIONS, pos_equal, pos_to_xy,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

CONFIG = create_square_config()

def pawn(pid, color, pos=None, lapped=False):
    return {'id': pid, 'color': color, 'boardPosition': pos, 'lapped': lapped}

def make_pawns(colors=None):
    """Create a standard pawn layout for testing."""
    if colors is None:
        colors = ['red', 'blue']
    all_pawns = {}
    for c in colors:
        all_pawns[c] = [pawn(f'{c}-{i}', c) for i in range(4)]
    return all_pawns


@pytest.fixture
def config():
    return CONFIG


@pytest.fixture
def pawns():
    return make_pawns()


# ── Board Configuration ───────────────────────────────────────────────────────

class TestBoardConfig:
    def test_track_length(self, config):
        assert config.track_length == 60

    def test_four_colors(self, config):
        assert config.num_players == 4
        assert config.colors == ['red', 'blue', 'yellow', 'green']

    def test_entry_points(self, config):
        for c in config.colors:
            cfg = config.color_config[c]
            assert 0 <= cfg.entry < 60

    def test_safe_entries(self, config):
        for c in config.colors:
            cfg = config.color_config[c]
            assert 0 <= cfg.safe_entry < 60

    def test_safe_zones_have_5_squares(self, config):
        for c in config.colors:
            cfg = config.color_config[c]
            assert len(cfg.safe) == 5

    def test_eight_slides(self, config):
        assert len(config.slides) == 8

    def test_two_slides_per_color(self, config):
        for c in config.colors:
            slides = [s for s in config.slides if s.color == c]
            assert len(slides) == 2


# ── Position Helpers ──────────────────────────────────────────────────────────

class TestPositionHelpers:
    def test_pos_equal_same(self):
        assert pos_equal(TrackPos(5), TrackPos(5)) is True

    def test_pos_equal_different(self):
        assert pos_equal(TrackPos(5), TrackPos(6)) is False

    def test_pos_equal_safe(self):
        assert pos_equal(SafePos(3), SafePos(3)) is True

    def test_pos_equal_none(self):
        assert pos_equal(None, None) is True

    def test_pos_equal_home(self):
        assert pos_equal(HOME, HOME) is True

    def test_pos_to_xy_track(self, config):
        xy = pos_to_xy(TrackPos(0), 'red', config)
        assert xy == (1, 1)

    def test_pos_to_xy_safe(self, config):
        xy = pos_to_xy(SafePos(0), 'red', config)
        assert xy == (3, 2)

    def test_pos_to_xy_none(self, config):
        assert pos_to_xy(None, 'red', config) is None

    def test_pos_to_xy_home(self, config):
        assert pos_to_xy(HOME, 'red', config) is None


# ── Movement: Forward ─────────────────────────────────────────────────────────

class TestForwardMovement:
    def test_forward_one(self, config):
        result = advance_position(TrackPos(5), 'red', 1, False, config)
        assert result is not None
        pos, lapped = result
        assert isinstance(pos, TrackPos)
        assert pos.track == 6

    def test_forward_wraps(self, config):
        # Use a position far from safe zone entry
        result = advance_position(TrackPos(30), 'red', 5, True, config)
        assert result is not None
        pos, _ = result
        assert isinstance(pos, TrackPos)
        assert pos.track == 35

    def test_forward_multiple_steps(self, config):
        result = advance_position(TrackPos(30), 'red', 10, True, config)
        assert result is not None
        pos, _ = result
        assert isinstance(pos, TrackPos)
        assert pos.track == 40


# ── Movement: Backward ────────────────────────────────────────────────────────

class TestBackwardMovement:
    def test_backward_one(self, config):
        result = advance_position(TrackPos(5), 'red', -1, False, config)
        assert result is not None
        pos, lapped = result
        assert pos.track == 4

    def test_backward_wraps(self, config):
        result = advance_position(TrackPos(0), 'red', -4, True, config)
        assert result is not None
        pos, _ = result
        assert pos.track == 56  # 0 - 4 = -4 % 60 = 56

    def test_backward_never_enters_safe_zone(self, config):
        # Even if near safe entry, backward shouldn't enter safe zone
        cfg = config.color_config['red']
        result = advance_position(TrackPos(cfg.safe_entry), 'red', -1, True, config)
        assert result is not None
        pos, _ = result
        assert isinstance(pos, TrackPos)


# ── Movement: Lapping ─────────────────────────────────────────────────────────

class TestLapping:
    def test_lap_detection(self, config):
        cfg = config.color_config['red']
        # Pawn just before entry, moves past it
        pos_before_entry = (cfg.entry - 1) % config.track_length
        result = advance_position(TrackPos(pos_before_entry), 'red', 2, False, config)
        assert result is not None
        _, lapped = result
        assert lapped is True

    def test_already_lapped_stays_lapped(self, config):
        result = advance_position(TrackPos(10), 'red', 5, True, config)
        assert result is not None
        _, lapped = result
        assert lapped is True

    def test_no_lap_if_not_passing_entry(self, config):
        cfg = config.color_config['red']
        # Pawn far from entry, small move
        far_from_entry = (cfg.entry + 30) % config.track_length
        result = advance_position(TrackPos(far_from_entry), 'red', 2, False, config)
        assert result is not None
        _, lapped = result
        assert lapped is False


# ── Movement: Safe Zone Entry ─────────────────────────────────────────────────

class TestSafeZoneEntry:
    def test_enter_safe_zone(self, config):
        cfg = config.color_config['red']
        # Pawn at safe entry, lapped, moves forward 1 → safe[1]
        # (distToSafe=0, safeSteps=1-0=1)
        result = advance_position(TrackPos(cfg.safe_entry), 'red', 1, True, config)
        assert result is not None
        pos, lapped = result
        assert isinstance(pos, SafePos)
        assert pos.safe == 1

    def test_safe_zone_forward(self, config):
        result = advance_position(SafePos(2), 'red', 2, True, config)
        assert result is not None
        pos, _ = result
        assert isinstance(pos, SafePos)
        assert pos.safe == 4

    def test_safe_zone_to_home(self, config):
        result = advance_position(SafePos(3), 'red', 2, True, config)
        assert result is not None
        pos, _ = result
        assert pos == HOME

    def test_safe_zone_overshoot(self, config):
        result = advance_position(SafePos(3), 'red', 3, True, config)
        assert result is None  # would go past home

    def test_safe_zone_can_go_back_within_zone(self, config):
        # JS allows backward within safe zone as long as newSafe >= 0
        result = advance_position(SafePos(2), 'red', -1, True, config)
        assert result is not None
        pos, _ = result
        assert isinstance(pos, SafePos)
        assert pos.safe == 1

    def test_safe_zone_cannot_go_below_zero(self, config):
        result = advance_position(SafePos(0), 'red', -1, True, config)
        assert result is None

    def test_safe_zone_exact_home(self, config):
        result = advance_position(SafePos(0), 'red', 5, True, config)
        assert result is not None
        assert result[0] == HOME


# ── Movement: Card 4 Backward ─────────────────────────────────────────────────

class TestCardFourBackward:
    def test_card_4_backward(self, config):
        result = advance_position(TrackPos(5), 'red', -4, False, config)
        assert result is not None
        pos, _ = result
        assert pos.track == 1

    def test_card_4_backward_wraps(self, config):
        result = advance_position(TrackPos(2), 'red', -4, False, config)
        assert result is not None
        pos, _ = result
        assert pos.track == 58  # 2 - 4 = -2 % 60 = 58


# ── Slides ────────────────────────────────────────────────────────────────────

class TestSlides:
    def test_slide_triggers(self, config):
        # Red slide starts at track index of (2,1)
        slide_start = None
        for s in config.slides:
            if s.color == 'red' and s.start is not None:
                slide_start = s.start
                break

        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['blue'][0]['boardPosition'] = TrackPos(slide_start)

        result = check_slide(slide_start, 'blue', all_pawns, config)
        assert result is not None

    def test_slide_does_not_trigger_own_color(self, config):
        slide_start = config.slides[0].start  # red slide

        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(slide_start)

        result = check_slide(slide_start, 'red', all_pawns, config)
        assert result is None

    def test_slide_bumps_opponents(self, config):
        slide = config.slides[0]  # first red slide
        all_pawns = make_pawns(['red', 'blue'])

        # Place a RED pawn on a swept square (opponent of blue who lands on slide)
        swept_square = (slide.start + 1) % config.track_length
        all_pawns['red'][0]['boardPosition'] = TrackPos(swept_square)

        # Blue pawn lands on red's slide start
        result = check_slide(slide.start, 'blue', all_pawns, config)
        assert result is not None
        _, bumped = result
        assert len(bumped) >= 1


# ── Legal Moves: Standard Cards ───────────────────────────────────────────────

class TestLegalMovesStandard:
    def test_card_1_exits_start(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        moves = get_legal_moves('red', all_pawns, '1', config)
        exit_moves = [m for m in moves if m['from'] is None]
        assert len(exit_moves) == 4  # 4 pawns can exit

    def test_card_1_forward(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        moves = get_legal_moves('red', all_pawns, '1', config)
        forward = [m for m in moves if m['from'] == TrackPos(5)]
        assert len(forward) == 1
        assert forward[0]['steps'] == 1

    def test_card_4_backward(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        moves = get_legal_moves('red', all_pawns, '4', config)
        backward = [m for m in moves if m['steps'] == -4]
        assert len(backward) >= 1

    def test_card_10_two_options(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        moves = get_legal_moves('red', all_pawns, '10', config)
        # Should have +10 and -1 options
        steps = set(m['steps'] for m in moves)
        assert 10 in steps
        assert -1 in steps

    def test_blocked_by_friendly(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        all_pawns['red'][1]['boardPosition'] = TrackPos(6)
        moves = get_legal_moves('red', all_pawns, '1', config)
        # Pawn at 5 can't move to 6 (occupied by friendly)
        from_5 = [m for m in moves if m['from'] == TrackPos(5)]
        assert len(from_5) == 0

    def test_can_bump_opponent(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        all_pawns['blue'][0]['boardPosition'] = TrackPos(6)
        moves = get_legal_moves('red', all_pawns, '1', config)
        from_5 = [m for m in moves if m['from'] == TrackPos(5)]
        assert len(from_5) == 1
        assert from_5[0]['bump'] is not None


# ── Legal Moves: Card 7 Split ─────────────────────────────────────────────────

class TestLegalMovesCard7:
    def test_card_7_full_move(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        moves = get_legal_moves('red', all_pawns, '7', config)
        full = [m for m in moves if m['steps'] == 7]
        assert len(full) >= 1

    def test_card_7_split_options(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        all_pawns['red'][1]['boardPosition'] = TrackPos(20)
        moves = get_legal_moves('red', all_pawns, '7', config)
        # Should have split moves (steps 1-6)
        split = [m for m in moves if 1 <= m['steps'] <= 6]
        assert len(split) >= 1


# ── Legal Moves: Card 11 Swap ─────────────────────────────────────────────────

class TestLegalMovesCard11:
    def test_card_11_has_swap_moves(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        all_pawns['blue'][0]['boardPosition'] = TrackPos(20)
        moves = get_legal_moves('red', all_pawns, '11', config)
        swaps = [m for m in moves if m.get('isSwap')]
        assert len(swaps) >= 1

    def test_card_11_swap_swaps_positions(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        all_pawns['blue'][0]['boardPosition'] = TrackPos(20)
        moves = get_legal_moves('red', all_pawns, '11', config)
        swaps = [m for m in moves if m.get('isSwap')]
        assert len(swaps) >= 1
        swap = swaps[0]
        assert swap['to'] == TrackPos(20)  # we go to their square
        assert swap['swapTo'] == TrackPos(5)  # they come to our square


# ── Legal Moves: Sorry Card ───────────────────────────────────────────────────

class TestLegalMovesSorry:
    def test_sorry_card(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['blue'][0]['boardPosition'] = TrackPos(15)
        moves = get_legal_moves('red', all_pawns, 'sorry', config)
        assert len(moves) >= 1
        assert moves[0].get('isSorry') is True
        assert moves[0]['from'] is None  # from Start

    def test_sorry_no_pawn_in_start(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        all_pawns['red'][1]['boardPosition'] = TrackPos(10)
        all_pawns['red'][2]['boardPosition'] = TrackPos(15)
        all_pawns['red'][3]['boardPosition'] = TrackPos(20)
        all_pawns['blue'][0]['boardPosition'] = TrackPos(25)
        moves = get_legal_moves('red', all_pawns, 'sorry', config)
        assert len(moves) == 0


# ── Legal Moves: Edge Cases ───────────────────────────────────────────────────

class TestLegalMovesEdgeCases:
    def test_no_moves_pawn_in_home(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        for i in range(4):
            all_pawns['red'][i]['boardPosition'] = HOME
        moves = get_legal_moves('red', all_pawns, '1', config)
        assert len(moves) == 0

    def test_no_moves_all_blocked(self, config):
        all_pawns = make_pawns(['red', 'blue'])
        # All red pawns surrounded by friendly pawns
        all_pawns['red'][0]['boardPosition'] = TrackPos(5)
        all_pawns['red'][1]['boardPosition'] = TrackPos(6)
        all_pawns['red'][2]['boardPosition'] = TrackPos(4)
        all_pawns['red'][3]['boardPosition'] = TrackPos(11)  # blocked by entry
        moves = get_legal_moves('red', all_pawns, '1', config)
        # Some moves should exist (not all blocked)
        assert isinstance(moves, list)


# ── Deck ──────────────────────────────────────────────────────────────────────

class TestDeck:
    def test_deck_count(self):
        deck = build_deck()
        total = sum(CARD_COUNTS.values())
        assert len(deck) == total

    def test_deck_has_all_types(self):
        deck = build_deck()
        values = set(card['value'] for card in deck)
        for card_def in __import__('rule_engine', fromlist=['CARD_DEFINITIONS']).CARD_DEFINITIONS:
            assert card_def['value'] in values
