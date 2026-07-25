"""
test_server.py — Tests for SORRY! server-side game logic.
Run:  cd arcade/SORRY/tests && pytest test_server.py -v
"""

import sys
import os
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from server import SorryGame, CARD_DEFINITIONS, CARD_COUNTS


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_game(players=2):
    game = SorryGame()
    names = ["Alice", "Bob", "Carol", "Dave"][:players]
    game.set_player_names(names)
    game.reset()
    return game


@pytest.fixture
def game():
    return make_game()


# ── Deck ──────────────────────────────────────────────────────────────────────

class TestDeck:
    def test_deck_has_correct_count(self, game):
        deck = game._build_deck()
        # 5 fours + 4 each of 10 other types = 45
        assert len(deck) == 45

    def test_card_counts(self, game):
        deck = game._build_deck()
        counts = {}
        for card in deck:
            counts[card['value']] = counts.get(card['value'], 0) + 1
        assert counts['1'] == 5
        assert counts['2'] == 4
        assert counts['3'] == 4
        assert counts['4'] == 4
        assert counts['5'] == 4
        assert counts['7'] == 4
        assert counts['8'] == 4
        assert counts['10'] == 4
        assert counts['11'] == 4
        assert counts['12'] == 4
        assert counts['sorry'] == 4

    def test_all_card_types_present(self, game):
        deck = game._build_deck()
        values = set(card['value'] for card in deck)
        for card_def in CARD_DEFINITIONS:
            assert card_def['value'] in values


# ── Draw ──────────────────────────────────────────────────────────────────────

class TestDraw:
    def test_draw_card(self, game):
        result = game._draw_card("Alice")
        assert result is not None
        assert result['type'] == 'card_drawn'
        assert game.current_card is not None
        assert result['cardsRemaining'] == 44

    def test_draw_when_already_drew(self, game):
        game.current_card = {'value': '5', 'label': '5'}
        result = game._draw_card("Alice")
        assert result is None

    def test_draw_reshuffles_when_empty(self, game):
        game.draw_pile = []
        game.discard_pile = [{'value': '1', 'label': '1'}] * 10
        result = game._draw_card("Alice")
        assert result is not None
        assert len(game.draw_pile) >= 0


# ── Move ──────────────────────────────────────────────────────────────────────

class TestMove:
    def test_basic_move(self, game):
        game.current_card = {'value': '5', 'label': '5'}
        result = game._move_pawn("Alice", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 5}, 'lapped': False,
        })
        assert result is not None
        assert result[0]['type'] == 'pawn_moved'
        assert game.pawn_positions['red'][0] == {'track': 5}

    def test_card_2_skips_turn(self, game):
        game.current_card = {'value': '2', 'label': '2'}
        game._move_pawn("Alice", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 5}, 'lapped': False,
        })
        # Turn should NOT advance
        assert game.current_turn_idx == 0

    def test_card_2_draws_again_message(self, game):
        game.current_card = {'value': '2', 'label': '2'}
        result = game._move_pawn("Alice", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 5}, 'lapped': False,
        })
        # Should not include turn_update (no next turn message)
        turn_updates = [m for m in result if m.get('type') == 'turn_update']
        assert len(turn_updates) == 0

    def test_no_card_drawn_rejects_move(self, game):
        game.current_card = None
        result = game._move_pawn("Alice", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 5}, 'lapped': False,
        })
        assert result is None

    def test_wrong_player_rejected(self, game):
        game.current_card = {'value': '5', 'label': '5'}
        result = game._move_pawn("Bob", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 5}, 'lapped': False,
        })
        assert result is None

    def test_invalid_pawn_index(self, game):
        game.current_card = {'value': '5', 'label': '5'}
        result = game._move_pawn("Alice", {
            'color': 'red', 'pawnIndex': 5,
            'newPosition': {'track': 5}, 'lapped': False,
        })
        assert result is None

    def test_move_clears_current_card(self, game):
        game.current_card = {'value': '5', 'label': '5'}
        game._move_pawn("Alice", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 5}, 'lapped': False,
        })
        assert game.current_card is None

    def test_move_advances_turn(self, game):
        game.current_card = {'value': '5', 'label': '5'}
        game._move_pawn("Alice", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 5}, 'lapped': False,
        })
        assert game.current_turn_idx == 1


# ── Bump ──────────────────────────────────────────────────────────────────────

class TestBump:
    def test_bump_opponent(self, game):
        game.pawn_positions['blue'][0] = {'track': 10}
        result = game._bump_pawn("Alice", {
            'color': 'blue', 'pawnIndex': 0,
        })
        assert result is not None
        assert game.pawn_positions['blue'][0] is None

    def test_cannot_bump_own_pawn(self, game):
        game.pawn_positions['red'][0] = {'track': 10}
        result = game._bump_pawn("Alice", {
            'color': 'red', 'pawnIndex': 0,
        })
        assert result is None

    def test_bump_resets_lapped(self, game):
        game.pawn_positions['blue'][0] = {'track': 10}
        game.pawn_lapped['blue'][0] = True
        game._bump_pawn("Alice", {'color': 'blue', 'pawnIndex': 0})
        assert game.pawn_lapped['blue'][0] is False


# ── Swap ──────────────────────────────────────────────────────────────────────

class TestSwap:
    def test_swap_opponent(self, game):
        game.pawn_positions['blue'][0] = {'track': 10}
        result = game._swap_pawn("Alice", {
            'color': 'blue', 'pawnIndex': 0,
            'newPosition': {'track': 5}, 'oppLapped': False,
        })
        assert result is not None
        assert game.pawn_positions['blue'][0] == {'track': 5}

    def test_cannot_swap_self(self, game):
        result = game._swap_pawn("Alice", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 5},
        })
        assert result is None

    def test_swap_with_lapped(self, game):
        game.pawn_positions['blue'][0] = {'track': 10}
        game._swap_pawn("Alice", {
            'color': 'blue', 'pawnIndex': 0,
            'newPosition': {'track': 5}, 'oppLapped': True,
        })
        assert game.pawn_lapped['blue'][0] is True


# ── Split (Card 7) ────────────────────────────────────────────────────────────

class TestSplit:
    def test_partial_move(self, game):
        game.current_card = {'value': '7', 'label': '7'}
        result = game._move_pawn_partial("Alice", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 3}, 'lapped': False,
        })
        assert result is not None
        assert result['type'] == 'pawn_moved'

    def test_wrong_card_rejected(self, game):
        game.current_card = {'value': '5', 'label': '5'}
        result = game._move_pawn_partial("Alice", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 3},
        })
        assert result is None

    def test_no_card_rejected(self, game):
        result = game._move_pawn_partial("Alice", {
            'color': 'red', 'pawnIndex': 0,
            'newPosition': {'track': 3},
        })
        assert result is None


# ── Skip Turn ─────────────────────────────────────────────────────────────────

class TestSkip:
    def test_skip_turn(self, game):
        game.current_card = {'value': '8', 'label': '8'}
        initial_idx = game.current_turn_idx
        result = game._skip_turn("Alice")
        assert result is not None
        assert len(result) == 2
        assert result[0]['type'] == 'system'
        assert game.current_card is None
        assert game.current_turn_idx != initial_idx

    def test_skip_without_card(self, game):
        game.current_card = None
        result = game._skip_turn("Alice")
        assert result is None


# ── Turn Management ───────────────────────────────────────────────────────────

class TestTurns:
    def test_advance_turn(self, game):
        initial = game.current_turn_idx
        game._advance_turn()
        assert game.current_turn_idx == (initial + 1) % len(game.player_names)

    def test_advance_turn_wraps(self, game):
        game.current_turn_idx = len(game.player_names) - 1
        game._advance_turn()
        assert game.current_turn_idx == 0

    def test_turn_update_message(self, game):
        msg = game._turn_update_msg()
        assert msg['type'] == 'turn_update'
        assert msg['currentTurnName'] == game.player_names[game.current_turn_idx]


# ── Win Detection ─────────────────────────────────────────────────────────────

class TestWin:
    def test_win_on_fourth_pawn_home(self, game):
        game.pawn_positions['red'] = ['home', 'home', 'home', None]
        game.current_card = {'value': '1', 'label': '1'}
        game._move_pawn("Alice", {
            'color': 'red', 'pawnIndex': 3,
            'newPosition': 'home', 'lapped': True,
        })
        assert game.winner == "Alice"
        assert game.phase == 'finished'

    def test_no_win_with_three_home(self, game):
        game.pawn_positions['red'] = ['home', 'home', 'home', None]
        game.current_card = {'value': '1', 'label': '1'}
        game._move_pawn("Alice", {
            'color': 'red', 'pawnIndex': 3,
            'newPosition': {'track': 5}, 'lapped': False,
        })
        assert game.winner is None
        assert game.phase == 'playing'

    def test_win_message_includes_color(self, game):
        game.pawn_positions['red'] = ['home', 'home', 'home', None]
        game.current_card = {'value': '1', 'label': '1'}
        result = game._move_pawn("Alice", {
            'color': 'red', 'pawnIndex': 3,
            'newPosition': 'home', 'lapped': True,
        })
        game_over = [m for m in result if m.get('type') == 'game_over']
        assert len(game_over) == 1
        assert game_over[0]['winnerColor'] == 'red'


# ── Game State ────────────────────────────────────────────────────────────────

class TestState:
    def test_initial_state(self, game):
        state = game.get_state()
        assert state['phase'] == 'playing'
        assert state['winner'] is None
        assert state['currentTurn'] == 'Alice'

    def test_pawns_state_format(self, game):
        state = game.get_state()
        for color in ['red', 'blue', 'yellow', 'green']:
            assert color in state['pawns']
            assert len(state['pawns'][color]) == 4
            for pawn in state['pawns'][color]:
                assert 'id' in pawn
                assert 'boardPosition' in pawn
                assert 'lapped' in pawn

    def test_deck_remaining(self, game):
        state = game.get_state()
        assert state['deckRemaining'] == 45


# ── Color Management ──────────────────────────────────────────────────────────

class TestColor:
    def test_change_color(self, game):
        result = game._change_color("Alice", {'color': '#ff2d55'})
        assert result is not None
        assert result['type'] == 'color_changed'

    def test_invalid_color_rejected(self, game):
        result = game._change_color("Alice", {'color': 'not-a-color'})
        assert result is None


# ── Four Player Game ──────────────────────────────────────────────────────────

class TestFourPlayers:
    def test_four_player_game(self):
        game = make_game(4)
        assert len(game.player_names) == 4
        assert game.current_turn_idx == 0

    def test_four_player_turn_rotation(self):
        game = make_game(4)
        for i in range(4):
            game._advance_turn()
        assert game.current_turn_idx == 0
