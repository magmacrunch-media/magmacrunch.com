"""
test_game_logic.py — Mechanics tests for Scandinavian Stud (Sökö) server-side game logic.
Run:  cd arcade/scandinavian-stud/tests && pytest test_game_logic.py -v
"""

import sys
import os
import random
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from server import (
    Card, Deck, HandEvaluator, Player, SokoGame, SokoServerGame,
    RANK_VALUES, HAND_RANKS, SUITS, RANKS,
    STARTING_CHIPS, ANTE_AMOUNT, SMALL_BET, BIG_BET, MAX_RAISES_PER_ROUND,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def card(suit, rank):
    return Card(suit, rank)


evaluator = HandEvaluator()


def evaluate(*cards):
    return evaluator.evaluate(list(cards))


def make_game(players=2):
    game = SokoServerGame()
    names = ["Alice", "Bob", "Carol", "Dave"][:players]
    ids = [f"p{i}" for i in range(players)]
    game.set_player_names(list(zip(ids, names)))
    return game


# ── Card ──────────────────────────────────────────────────────────────────────

class TestCard:
    def test_card_creation(self):
        c = card('hearts', 'A')
        assert c.suit == 'hearts'
        assert c.rank == 'A'
        assert c.value == 14

    def test_card_to_dict(self):
        c = card('spades', 'K')
        d = c.to_dict()
        assert d == {'suit': 'spades', 'rank': 'K', 'value': 13}

    def test_rank_values(self):
        assert RANK_VALUES['A'] == 14
        assert RANK_VALUES['2'] == 2
        assert RANK_VALUES['K'] == 13
        assert RANK_VALUES['J'] == 11
        assert RANK_VALUES['Q'] == 12


# ── Deck ──────────────────────────────────────────────────────────────────────

class TestDeck:
    def test_deck_has_52_cards(self):
        deck = Deck()
        assert len(deck.cards) == 52

    def test_deal_removes_card(self):
        deck = Deck()
        card = deck.deal()
        assert len(deck.cards) == 51
        assert card.suit in SUITS
        assert card.rank in RANKS


# ── Hand Evaluator: High Card ────────────────────────────────────────────────

class TestHighCard:
    def test_high_card(self):
        # A-K-Q-9-5 — no straight, no flush, no pair
        result = evaluate(card('hearts', 'A'), card('spades', 'K'),
                          card('clubs', 'Q'), card('diamonds', '9'), card('hearts', '5'))
        assert result['name'] == 'High Card'
        assert result['rank'] == HAND_RANKS['High Card']

    def test_high_card_tiebreaker(self):
        result = evaluate(card('hearts', 'A'), card('spades', 'K'),
                          card('clubs', 'Q'), card('diamonds', '9'), card('hearts', '5'))
        assert result['tiebreakers'] == [14, 13, 12, 9, 5]


# ── Hand Evaluator: One Pair ─────────────────────────────────────────────────

class TestOnePair:
    def test_one_pair(self):
        result = evaluate(card('hearts', '7'), card('spades', '7'),
                          card('clubs', 'A'), card('diamonds', 'K'), card('hearts', 'Q'))
        assert result['name'] == 'One Pair'
        assert result['rank'] == HAND_RANKS['One Pair']

    def test_pair_beats_high_card(self):
        high = evaluate(card('hearts', 'A'), card('spades', 'K'),
                        card('clubs', 'Q'), card('diamonds', '9'), card('hearts', '5'))
        pair = evaluate(card('hearts', '2'), card('spades', '2'),
                        card('clubs', '3'), card('diamonds', '7'), card('hearts', '9'))
        assert pair['rank'] > high['rank']


# ── Hand Evaluator: Two Pair ─────────────────────────────────────────────────

class TestTwoPair:
    def test_two_pair(self):
        result = evaluate(card('hearts', 'A'), card('spades', 'A'),
                          card('clubs', 'K'), card('diamonds', 'K'), card('hearts', 'Q'))
        assert result['name'] == 'Two Pair'
        assert result['rank'] == HAND_RANKS['Two Pair']

    def test_two_pair_tiebreaker(self):
        result = evaluate(card('hearts', 'A'), card('spades', 'A'),
                          card('clubs', 'K'), card('diamonds', 'K'), card('hearts', 'Q'))
        assert result['tiebreakers'][0] == 14  # Aces
        assert result['tiebreakers'][1] == 13  # Kings


# ── Hand Evaluator: Three of a Kind ──────────────────────────────────────────

class TestThreeOfAKind:
    def test_three_of_a_kind(self):
        result = evaluate(card('hearts', 'J'), card('spades', 'J'),
                          card('clubs', 'J'), card('diamonds', 'A'), card('hearts', 'K'))
        assert result['name'] == 'Three of a Kind'
        assert result['rank'] == HAND_RANKS['Three of a Kind']


# ── Hand Evaluator: Four of a Kind ───────────────────────────────────────────

class TestFourOfAKind:
    def test_four_of_a_kind(self):
        result = evaluate(card('hearts', 'Q'), card('spades', 'Q'),
                          card('clubs', 'Q'), card('diamonds', 'Q'), card('hearts', 'A'))
        assert result['name'] == 'Four of a Kind'
        assert result['rank'] == HAND_RANKS['Four of a Kind']


# ── Hand Evaluator: Full House ────────────────────────────────────────────────

class TestFullHouse:
    def test_full_house(self):
        result = evaluate(card('hearts', 'K'), card('spades', 'K'),
                          card('clubs', 'K'), card('diamonds', '7'), card('hearts', '7'))
        assert result['name'] == 'Full House'
        assert result['rank'] == HAND_RANKS['Full House']

    def test_full_house_beats_flush(self):
        full = evaluate(card('hearts', 'K'), card('spades', 'K'),
                        card('clubs', 'K'), card('diamonds', '7'), card('hearts', '7'))
        flush = evaluate(card('hearts', '2'), card('hearts', '4'),
                         card('hearts', '6'), card('hearts', '8'), card('hearts', 'Q'))
        assert full['rank'] > flush['rank']


# ── Hand Evaluator: Flush ─────────────────────────────────────────────────────

class TestFlush:
    def test_flush(self):
        result = evaluate(card('hearts', 'A'), card('hearts', 'K'),
                          card('hearts', 'Q'), card('hearts', 'J'), card('hearts', '9'))
        assert result['name'] == 'Flush'
        assert result['rank'] == HAND_RANKS['Flush']

    def test_flush_different_suit_fails(self):
        result = evaluate(card('hearts', 'A'), card('hearts', 'K'),
                          card('hearts', 'Q'), card('hearts', 'J'), card('spades', '9'))
        assert result['name'] != 'Flush'


# ── Hand Evaluator: Straight ──────────────────────────────────────────────────

class TestStraight:
    def test_straight(self):
        result = evaluate(card('hearts', '9'), card('spades', '10'),
                          card('clubs', 'J'), card('diamonds', 'Q'), card('hearts', 'K'))
        assert result['name'] == 'Straight'
        assert result['rank'] == HAND_RANKS['Straight']

    def test_ace_low_straight(self):
        result = evaluate(card('hearts', 'A'), card('spades', '2'),
                          card('clubs', '3'), card('diamonds', '4'), card('hearts', '5'))
        assert result['name'] == 'Straight'
        assert result['tiebreakers'] == [5]  # 5-high


# ── Hand Evaluator: Straight Flush ────────────────────────────────────────────

class TestStraightFlush:
    def test_straight_flush(self):
        result = evaluate(card('hearts', '5'), card('hearts', '6'),
                          card('hearts', '7'), card('hearts', '8'), card('hearts', '9'))
        assert result['name'] == 'Straight Flush'
        assert result['rank'] == HAND_RANKS['Straight Flush']


# ── Hand Evaluator: Royal Flush ───────────────────────────────────────────────

class TestRoyalFlush:
    def test_royal_flush(self):
        result = evaluate(card('spades', '10'), card('spades', 'J'),
                          card('spades', 'Q'), card('spades', 'K'), card('spades', 'A'))
        assert result['name'] == 'Royal Flush'
        assert result['rank'] == HAND_RANKS['Royal Flush']


# ── Hand Evaluator: Four-Card Flush ───────────────────────────────────────────

class TestFourCardFlush:
    def test_four_card_flush(self):
        result = evaluate(card('hearts', 'A'), card('hearts', 'K'),
                          card('hearts', 'Q'), card('hearts', 'J'), card('spades', '2'))
        assert result['name'] == 'Four-Card Flush'
        assert result['rank'] == HAND_RANKS['Four-Card Flush']

    def test_four_card_flush_not_five(self):
        # Five-card flush should be Flush, not Four-Card Flush
        result = evaluate(card('hearts', 'A'), card('hearts', 'K'),
                          card('hearts', 'Q'), card('hearts', 'J'), card('hearts', '9'))
        assert result['name'] == 'Flush'


# ── Hand Evaluator: Four-Card Straight ────────────────────────────────────────

class TestFourCardStraight:
    def test_four_card_straight(self):
        result = evaluate(card('hearts', '5'), card('spades', '6'),
                          card('clubs', '7'), card('diamonds', '8'), card('hearts', 'Q'))
        assert result['name'] == 'Four-Card Straight'
        assert result['rank'] == HAND_RANKS['Four-Card Straight']

    def test_four_card_straight_wheel(self):
        result = evaluate(card('hearts', 'A'), card('spades', '2'),
                          card('clubs', '3'), card('diamonds', '4'), card('hearts', 'Q'))
        assert result['name'] == 'Four-Card Straight'

    def test_four_card_straight_not_five(self):
        # Five-card straight should be Straight, not Four-Card Straight
        result = evaluate(card('hearts', '5'), card('spades', '6'),
                          card('clubs', '7'), card('diamonds', '8'), card('hearts', '9'))
        assert result['name'] == 'Straight'


# ── Hand Evaluator: Hand Rankings ─────────────────────────────────────────────

class TestHandRankings:
    def test_all_rankings_ordered(self):
        names = ['High Card', 'One Pair', 'Four-Card Straight', 'Four-Card Flush',
                 'Two Pair', 'Three of a Kind', 'Straight', 'Flush',
                 'Full House', 'Four of a Kind', 'Straight Flush', 'Royal Flush']
        for i in range(len(names) - 1):
            assert HAND_RANKS[names[i]] < HAND_RANKS[names[i + 1]]


# ── Hand Evaluator: Comparisons ───────────────────────────────────────────────

class TestComparisons:
    def test_higher_pair_wins(self):
        pair_7s = evaluate(card('hearts', '7'), card('spades', '7'),
                           card('clubs', '2'), card('diamonds', '3'), card('hearts', '4'))
        pair_ks = evaluate(card('hearts', 'K'), card('spades', 'K'),
                           card('clubs', '2'), card('diamonds', '3'), card('hearts', '4'))
        assert evaluator._compare_to(pair_ks, pair_7s) > 0

    def test_same_rank_tiebreaker(self):
        h1 = evaluate(card('hearts', 'A'), card('spades', 'K'),
                      card('clubs', 'Q'), card('diamonds', '9'), card('hearts', '5'))
        h2 = evaluate(card('hearts', 'A'), card('spades', 'K'),
                      card('clubs', 'Q'), card('diamonds', '9'), card('hearts', '4'))
        assert evaluator._compare_to(h1, h2) > 0

    def test_equal_hands_tie(self):
        h1 = evaluate(card('hearts', 'A'), card('spades', 'K'),
                      card('clubs', 'Q'), card('diamonds', 'J'), card('hearts', '9'))
        h2 = evaluate(card('diamonds', 'A'), card('clubs', 'K'),
                      card('spades', 'Q'), card('hearts', 'J'), card('diamonds', '9'))
        assert evaluator._compare_to(h1, h2) == 0


# ── Hand Evaluator: Partial Hands ─────────────────────────────────────────────

class TestPartialHands:
    def test_one_card(self):
        result = evaluate(card('hearts', 'A'))
        assert result['partial'] is True
        assert result['name'] == 'No Cards'

    def test_two_cards_pair(self):
        result = evaluate(card('hearts', '7'), card('spades', '7'))
        assert result['name'] == 'One Pair'
        assert result['partial'] is True

    def test_three_cards(self):
        result = evaluate(card('hearts', 'A'), card('spades', 'A'), card('clubs', 'A'))
        assert result['name'] == 'Three of a Kind'
        assert result['partial'] is True

    def test_four_cards_four_flush(self):
        result = evaluate(card('hearts', 'A'), card('hearts', 'K'),
                          card('hearts', 'Q'), card('hearts', 'J'))
        assert result['name'] == 'Four-Card Flush'
        assert result['partial'] is True

    def test_empty_hand(self):
        result = evaluate()
        assert result['name'] == 'No Cards'
        assert result['rank'] == -1


# ── Hand Evaluator: Descriptions ──────────────────────────────────────────────

class TestDescriptions:
    def test_royal_flush_desc(self):
        result = evaluate(card('spades', '10'), card('spades', 'J'),
                          card('spades', 'Q'), card('spades', 'K'), card('spades', 'A'))
        assert 'Royal Flush' in result['description']

    def test_full_house_desc(self):
        result = evaluate(card('hearts', 'K'), card('spades', 'K'),
                          card('clubs', 'K'), card('diamonds', '7'), card('hearts', '7'))
        assert 'K' in result['description']
        assert '7' in result['description']

    def test_pair_desc(self):
        result = evaluate(card('hearts', 'J'), card('spades', 'J'),
                          card('clubs', '2'), card('diamonds', '3'), card('hearts', '4'))
        assert 'J' in result['description']


# ── Player ────────────────────────────────────────────────────────────────────

class TestPlayer:
    def test_player_creation(self):
        p = Player("Alice", "p1")
        assert p.name == "Alice"
        assert p.chips == STARTING_CHIPS
        assert p.folded is False

    def test_player_to_dict(self):
        p = Player("Bob", "p2")
        d = p.to_dict()
        assert d['name'] == 'Bob'
        assert d['chips'] == STARTING_CHIPS

    def test_player_to_dict_hides_hole(self):
        p = Player("Bob", "p2")
        p.cards = [card('hearts', 'A'), card('spades', 'K')]
        d = p.to_dict(hide_holes=True, viewer_id='other')
        assert len(d['cards']) == 1  # Only face-up cards shown


# ── Game: Setup ───────────────────────────────────────────────────────────────

class TestGameSetup:
    def test_add_player(self):
        game = make_game(2)
        assert len(game.game.players) == 2

    def test_max_players(self):
        game = make_game(4)
        assert len(game.game.players) == 4

    def test_player_chips(self):
        game = make_game(2)
        for p in game.game.players:
            assert p.chips == STARTING_CHIPS


# ── Game: Hand Dealing ───────────────────────────────────────────────────────

class TestHandDealing:
    def test_new_hand_deals_cards(self):
        game = make_game(2)
        result = game.handle_action("p0", {"type": "start_hand"})
        assert result is not None
        assert result['type'] == 'hand_started'
        for p in game.game.players:
            assert len(p.cards) == 2  # Hole + 1 face-up

    def test_antes_posted(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        for p in game.game.players:
            assert p.chips == STARTING_CHIPS - ANTE_AMOUNT

    def test_pot_collected(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        assert game.game.pot == ANTE_AMOUNT * 2


# ── Game: Betting ─────────────────────────────────────────────────────────────

class TestBetting:
    def test_check(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        current = game.game.get_current_player()
        result = game.handle_action(current.id, {
            "type": "player_action",
            "action": "check",
        })
        assert result is not None
        assert result['action'] == 'check'

    def test_call(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        # Raise first
        current = game.game.get_current_player()
        game.handle_action(current.id, {
            "type": "player_action",
            "action": "raise",
        })
        # Other player calls
        current = game.game.get_current_player()
        result = game.handle_action(current.id, {
            "type": "player_action",
            "action": "call",
        })
        assert result is not None

    def test_fold(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        current = game.game.get_current_player()
        result = game.handle_action(current.id, {
            "type": "player_action",
            "action": "fold",
        })
        assert result is not None
        assert result.get('gameOver') is True

    def test_wrong_player_rejected(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        current = game.game.get_current_player()
        other = "p1" if current.id == "p0" else "p0"
        result = game.handle_action(other, {
            "type": "player_action",
            "action": "check",
        })
        assert result is None

    def test_raise_increases_bet(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        current = game.game.get_current_player()
        chips_before = current.chips
        game.handle_action(current.id, {
            "type": "player_action",
            "action": "raise",
        })
        assert current.chips < chips_before

    def test_max_raises_limit(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        # Raise 4 times (max is 3)
        for _ in range(4):
            current = game.game.get_current_player()
            if current and not current.folded:
                game.handle_action(current.id, {
                    "type": "player_action",
                    "action": "raise",
                })
        # After max raises, raise should become a call
        assert game.game.raises_this_round <= MAX_RAISES_PER_ROUND


# ── Game: Showdown ────────────────────────────────────────────────────────────

class TestShowdown:
    def test_showdown_finds_winner(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        # Both check through all streets
        for _ in range(8):
            current = game.game.get_current_player()
            if current and not current.folded and game.game.phase == 'betting':
                game.handle_action(current.id, {
                    "type": "player_action",
                    "action": "check",
                })
        # Game should be over or in waiting phase
        assert game.game.phase in ('waiting', 'complete')

    def test_winner_gets_pot(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        # Current player folds — other player wins pot
        current = game.game.get_current_player()
        game.handle_action(current.id, {"type": "player_action", "action": "fold"})
        winner = [p for p in game.game.players if not p.folded][0]
        # Winner had ante deducted then pot added back
        assert winner.chips == STARTING_CHIPS - ANTE_AMOUNT + game.game.pot


# ── Game: Multiple Hands ──────────────────────────────────────────────────────

class TestMultipleHands:
    def test_prepare_next_hand(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        # Current player folds to end hand quickly
        current = game.game.get_current_player()
        game.handle_action(current.id, {"type": "player_action", "action": "fold"})
        # Verify hand ended
        assert game.game.game_over is True

        result = game.handle_action("p0", {"type": "next_hand"})
        assert result is not None
        assert result['type'] == 'hand_started'

    def test_dealer_rotates(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        dealer1 = game.game.dealer_index
        # Current player folds to end hand
        current = game.game.get_current_player()
        game.handle_action(current.id, {"type": "player_action", "action": "fold"})
        game.handle_action("p0", {"type": "next_hand"})
        dealer2 = game.game.dealer_index
        assert dealer1 != dealer2


# ── Game: Available Actions ───────────────────────────────────────────────────

class TestAvailableActions:
    def test_check_available_when_no_bet(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        current = game.game.get_current_player()
        actions = game.game.get_available_actions(current.id)
        assert 'check' in actions
        assert 'fold' in actions

    def test_call_available_when_bet_exists(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        current = game.game.get_current_player()
        game.handle_action(current.id, {"type": "player_action", "action": "raise"})
        current = game.game.get_current_player()
        actions = game.game.get_available_actions(current.id)
        assert 'call' in actions
        assert 'fold' in actions

    def test_fold_always_available(self):
        game = make_game(2)
        game.handle_action("p0", {"type": "start_hand"})
        current = game.game.get_current_player()
        actions = game.game.get_available_actions(current.id)
        assert 'fold' in actions
