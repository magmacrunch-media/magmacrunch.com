"""
scandinavian-stud/server.py — Multiplayer Scandinavian Stud (Sökö) server
Run with:  python server.py
Requires:  pip install websockets
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared', 'multiplayer'))

from server_base import GameServer
import random
from itertools import combinations


# ── Constants ────────────────────────────────────────────────────────────────

SUITS = ['hearts', 'diamonds', 'clubs', 'spades']
RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

RANK_VALUES = {
    'A': 14, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13
}

HAND_RANKS = {
    'Royal Flush':        11,
    'Straight Flush':     10,
    'Four of a Kind':     9,
    'Full House':         8,
    'Flush':              7,
    'Straight':           6,
    'Three of a Kind':    5,
    'Two Pair':           4,
    'Four-Card Flush':    3,
    'Four-Card Straight': 2,
    'One Pair':           1,
    'High Card':          0
}

STARTING_CHIPS = 1000
ANTE_AMOUNT = 25
SMALL_BET = 25
BIG_BET = 50
MAX_RAISES_PER_ROUND = 3


# ── Card ─────────────────────────────────────────────────────────────────────

class Card:
    def __init__(self, suit, rank):
        self.suit = suit
        self.rank = rank
        self.value = RANK_VALUES[rank]

    def to_dict(self):
        return {'suit': self.suit, 'rank': self.rank, 'value': self.value}


# ── Deck ─────────────────────────────────────────────────────────────────────

class Deck:
    def __init__(self):
        self.cards = [Card(s, r) for s in SUITS for r in RANKS]
        random.shuffle(self.cards)

    def deal(self):
        return self.cards.pop()


# ── Hand Evaluator ───────────────────────────────────────────────────────────

class HandEvaluator:

    def evaluate(self, cards):
        if not cards or len(cards) < 2:
            return self._empty_result()

        if len(cards) < 5:
            return self._evaluate_partial(cards)

        combos = list(combinations(cards, 5))
        best = None

        for combo in combos:
            result = self._evaluate_five(list(combo))
            if best is None or self._compare_to(result, best) > 0:
                best = result

        return best

    def _evaluate_five(self, cards):
        sorted_cards = sorted(cards, key=lambda c: c.value, reverse=True)
        is_flush = self._is_flush(cards)
        is_straight = self._is_straight(sorted_cards)
        counts = self._get_value_counts(cards)
        count_vals = sorted(counts.values(), reverse=True)

        name = 'High Card'
        rank = HAND_RANKS['High Card']
        tiebreakers = [c.value for c in sorted_cards]

        # Royal Flush
        if is_flush and is_straight and sorted_cards[0].value == 14 and sorted_cards[1].value == 13:
            name = 'Royal Flush'
            rank = HAND_RANKS['Royal Flush']
            tiebreakers = [14]
        # Straight Flush
        elif is_flush and is_straight:
            name = 'Straight Flush'
            rank = HAND_RANKS['Straight Flush']
            tiebreakers = [self._straight_high_card(sorted_cards)]
        # Four of a Kind
        elif count_vals[0] == 4:
            name = 'Four of a Kind'
            rank = HAND_RANKS['Four of a Kind']
            tiebreakers = self._tiebreak_by_count(counts, [4, 1])
        # Full House
        elif count_vals[0] == 3 and len(count_vals) > 1 and count_vals[1] == 2:
            name = 'Full House'
            rank = HAND_RANKS['Full House']
            tiebreakers = self._tiebreak_by_count(counts, [3, 2])
        # Flush (5 cards)
        elif is_flush:
            name = 'Flush'
            rank = HAND_RANKS['Flush']
            tiebreakers = [c.value for c in sorted_cards]
        # Straight (5 cards)
        elif is_straight:
            name = 'Straight'
            rank = HAND_RANKS['Straight']
            tiebreakers = [self._straight_high_card(sorted_cards)]
        # Three of a Kind
        elif count_vals[0] == 3:
            name = 'Three of a Kind'
            rank = HAND_RANKS['Three of a Kind']
            tiebreakers = self._tiebreak_by_count(counts, [3, 1, 1])
        # Two Pair
        elif count_vals[0] == 2 and len(count_vals) > 1 and count_vals[1] == 2:
            name = 'Two Pair'
            rank = HAND_RANKS['Two Pair']
            tiebreakers = self._tiebreak_by_count(counts, [2, 2, 1])
        # Four-Card Flush
        elif self._is_four_card_flush(cards):
            name = 'Four-Card Flush'
            rank = HAND_RANKS['Four-Card Flush']
            tiebreakers = [c.value for c in sorted_cards]
        # Four-Card Straight
        elif self._is_four_card_straight(sorted_cards):
            name = 'Four-Card Straight'
            rank = HAND_RANKS['Four-Card Straight']
            tiebreakers = [self._four_card_straight_high(sorted_cards)]
        # One Pair
        elif count_vals[0] == 2:
            name = 'One Pair'
            rank = HAND_RANKS['One Pair']
            tiebreakers = self._tiebreak_by_count(counts, [2, 1, 1, 1])

        return {
            'name': name,
            'rank': rank,
            'tiebreakers': tiebreakers,
            'description': self._describe(name, sorted_cards)
        }

    def _evaluate_partial(self, cards):
        sorted_cards = sorted(cards, key=lambda c: c.value, reverse=True)
        counts = self._get_value_counts(cards)
        count_vals = sorted(counts.values(), reverse=True)

        name = 'High Card'
        if count_vals[0] == 4:
            name = 'Four of a Kind'
        elif count_vals[0] == 3 and len(count_vals) > 1 and count_vals[1] == 2:
            name = 'Full House'
        elif count_vals[0] == 3:
            name = 'Three of a Kind'
        elif count_vals[0] == 2 and len(count_vals) > 1 and count_vals[1] == 2:
            name = 'Two Pair'
        elif len(cards) >= 4 and self._is_four_card_flush(cards):
            name = 'Four-Card Flush'
        elif len(cards) >= 4 and self._is_four_card_straight(sorted_cards):
            name = 'Four-Card Straight'
        elif count_vals[0] == 2:
            name = 'One Pair'

        return {
            'name': name,
            'rank': HAND_RANKS.get(name, 0),
            'tiebreakers': [c.value for c in sorted_cards],
            'description': f'{name} (partial)',
            'partial': True
        }

    def _empty_result(self):
        return {
            'name': 'No Cards',
            'rank': -1,
            'tiebreakers': [],
            'description': 'No cards dealt',
            'partial': True
        }

    def _compare_to(self, a, b):
        if a['rank'] != b['rank']:
            return a['rank'] - b['rank']
        for i in range(max(len(a['tiebreakers']), len(b['tiebreakers']))):
            av = a['tiebreakers'][i] if i < len(a['tiebreakers']) else 0
            bv = b['tiebreakers'][i] if i < len(b['tiebreakers']) else 0
            if av != bv:
                return av - bv
        return 0

    def _is_flush(self, cards):
        suit = cards[0].suit
        return all(c.suit == suit for c in cards)

    def _is_straight(self, sorted_cards):
        for i in range(len(sorted_cards) - 1):
            if sorted_cards[i].value - sorted_cards[i + 1].value != 1:
                # Check wheel: A-2-3-4-5
                values = sorted([c.value for c in sorted_cards])
                if values == [2, 3, 4, 5, 14]:
                    return True
                return False
        return True

    def _straight_high_card(self, sorted_cards):
        values = sorted([c.value for c in sorted_cards])
        if values == [2, 3, 4, 5, 14]:
            return 5
        return sorted_cards[0].value

    def _is_four_card_flush(self, cards):
        suit_counts = {}
        for c in cards:
            suit_counts[c.suit] = suit_counts.get(c.suit, 0) + 1
        return any(count >= 4 for count in suit_counts.values())

    def _is_four_card_straight(self, sorted_cards):
        values = sorted([c.value for c in sorted_cards])

        for skip in range(5):
            subset = [v for i, v in enumerate(values) if i != skip]
            if self._is_sequential(subset):
                return True

        # Wheel partial: A-2-3-4
        if 14 in values:
            low_values = [v for v in values if v != 14]
            if all(v in low_values for v in [2, 3, 4]):
                return True

        return False

    def _is_sequential(self, sorted_values):
        for i in range(len(sorted_values) - 1):
            if sorted_values[i + 1] - sorted_values[i] != 1:
                return False
        return True

    def _four_card_straight_high(self, sorted_cards):
        values = sorted([c.value for c in sorted_cards])
        best_high = 0

        for skip in range(5):
            subset = [v for i, v in enumerate(values) if i != skip]
            if self._is_sequential(subset):
                best_high = max(best_high, subset[3])

        # Wheel partial: A-2-3-4
        if 14 in values:
            low_values = [v for v in values if v != 14]
            if all(v in low_values for v in [2, 3, 4]):
                best_high = max(best_high, 5)

        return best_high

    def _get_value_counts(self, cards):
        counts = {}
        for c in cards:
            counts[c.value] = counts.get(c.value, 0) + 1
        return counts

    def _tiebreak_by_count(self, counts, pattern):
        groups = {}
        for val, cnt in counts.items():
            if cnt not in groups:
                groups[cnt] = []
            groups[cnt].append(val)

        for g in groups.values():
            g.sort(reverse=True)

        result = []
        seen = set()

        for target_count in pattern:
            if target_count in groups:
                for val in groups[target_count]:
                    if val not in seen:
                        result.append(val)
                        seen.add(val)
                        break

        return result

    def _describe(self, name, sorted_cards):
        top = sorted_cards[0]
        if name == 'Royal Flush':
            return f'Royal Flush — {top.suit}'
        elif name == 'Straight Flush':
            return f'Straight Flush — {top.rank} high'
        elif name == 'Four of a Kind':
            return f'Four {top.rank}s'
        elif name == 'Full House':
            counts = self._get_value_counts(sorted_cards)
            triple_val = next(v for v, cnt in counts.items() if cnt == 3)
            pair_val = next(v for v, cnt in counts.items() if cnt == 2)
            triple_rank = next(c.rank for c in sorted_cards if c.value == triple_val)
            pair_rank = next(c.rank for c in sorted_cards if c.value == pair_val)
            return f'Full House — {triple_rank}s full of {pair_rank}s'
        elif name == 'Flush':
            return f'Flush — {top.rank} high ({top.suit})'
        elif name == 'Straight':
            return f'Straight — {top.rank} high'
        elif name == 'Three of a Kind':
            return f'Three {top.rank}s'
        elif name == 'Two Pair':
            rank_names = {14: 'Aces', 13: 'Kings', 12: 'Queens', 11: 'Jacks',
                         10: 'Tens', 9: 'Nines', 8: 'Eights', 7: 'Sevens',
                         6: 'Sixes', 5: 'Fives', 4: 'Fours', 3: 'Threes', 2: 'Twos'}
            counts = self._get_value_counts(sorted_cards)
            pairs = [v for v, cnt in counts.items() if cnt == 2]
            pair_names = [rank_names.get(v, f'{v}s') for v in sorted(pairs, reverse=True)]
            return f'Two Pair — {" and ".join(pair_names)}'
        elif name == 'Four-Card Flush':
            suit_counts = {}
            for c in sorted_cards:
                suit_counts[c.suit] = suit_counts.get(c.suit, 0) + 1
            flush_suit = next(s for s, cnt in suit_counts.items() if cnt == 4)
            return f'Four-Card Flush — {top.rank} high ({flush_suit})'
        elif name == 'Four-Card Straight':
            high = self._four_card_straight_high(sorted_cards)
            return f'Four-Card Straight — {high} high'
        elif name == 'One Pair':
            counts = self._get_value_counts(sorted_cards)
            pair_val = next(v for v, cnt in counts.items() if cnt == 2)
            pair_rank = next(c.rank for c in sorted_cards if c.value == pair_val)
            return f'Pair of {pair_rank}s'
        elif name == 'High Card':
            return f'{top.rank} high'
        return name


# ── Player ───────────────────────────────────────────────────────────────────

class Player:
    def __init__(self, name, player_id):
        self.name = name
        self.id = player_id
        self.chips = STARTING_CHIPS
        self.cards = []
        self.folded = False
        self.all_in = False
        self.current_bet = 0
        self.hand = None

    def to_dict(self, hide_holes=False, viewer_id=None):
        cards = self.cards
        if hide_holes and self.id != viewer_id:
            # Only show face-up cards (all except first which is hole card)
            cards = [{'suit': c.suit, 'rank': c.rank, 'value': c.value, 'faceUp': True}
                     for c in self.cards[1:]] if len(self.cards) > 1 else []
        else:
            cards = [c.to_dict() for c in self.cards]

        return {
            'id': self.id,
            'name': self.name,
            'chips': self.chips,
            'cards': cards,
            'folded': self.folded,
            'allIn': self.all_in,
            'currentBet': self.current_bet,
            'hand': self.hand
        }


# ── Game ─────────────────────────────────────────────────────────────────────

class SokoGame:
    def __init__(self):
        self.reset()

    def reset(self):
        self.deck = None
        self.players = []
        self.pot = 0
        self.current_bet = 0
        self.round = 0
        self.betting_round = 0
        self.dealer_index = 0
        self.current_player_index = 0
        self.game_over = False
        self.phase = 'waiting'
        self.bets_this_round = {}
        self.raises_this_round = 0
        self.total_rounds = 0
        self.evaluator = HandEvaluator()
        self.last_winner = None
        self.action_log = []

    def add_player(self, name, player_id):
        if len(self.players) >= 4:
            return False
        player = Player(name, player_id)
        self.players.append(player)
        return True

    def remove_player(self, player_id):
        self.players = [p for p in self.players if p.id != player_id]

    def get_player_by_id(self, player_id):
        for p in self.players:
            if p.id == player_id:
                return p
        return None

    def new_hand(self):
        self.deck = Deck()
        self.pot = 0
        self.current_bet = 0
        self.round = 0
        self.betting_round = 0
        self.game_over = False
        self.last_winner = None
        self.phase = 'dealing'
        self.bets_this_round = {}
        self.raises_this_round = 0
        self.action_log = []

        # Reset players
        for p in self.players:
            p.cards = []
            p.folded = False
            p.all_in = False
            p.current_bet = 0
            p.hand = None

        # Post antes
        for p in self.players:
            if p.chips >= ANTE_AMOUNT:
                p.chips -= ANTE_AMOUNT
                p.current_bet = ANTE_AMOUNT
                self.pot += ANTE_AMOUNT
            else:
                self.pot += p.chips
                p.current_bet = p.chips
                p.chips = 0
                p.all_in = True

        # Deal hole card (face down) to each player
        for p in self.players:
            card = self.deck.deal()
            p.cards.append(card)

        # Deal first face-up card
        self._deal_next_street()

    def _deal_next_street(self):
        self.round += 1
        self.raises_this_round = 0
        self.bets_this_round = {}

        for p in self.players:
            if not p.folded:
                card = self.deck.deal()
                p.cards.append(card)

        self._evaluate_all_hands()

    def _evaluate_all_hands(self):
        for p in self.players:
            if not p.folded:
                p.hand = self.evaluator.evaluate(p.cards)

    def start_betting_round(self):
        self.phase = 'betting'
        self.raises_this_round = 0
        self.bets_this_round = {}
        self.current_bet = 0
        self.betting_round = self.round - 1

        for p in self.players:
            if not p.folded and not p.all_in:
                p.current_bet = 0

        next_player = self._next_active_player(self.dealer_index)
        if next_player is None:
            self.phase = 'waiting'
            return
        self.current_player_index = next_player

    def get_current_player(self):
        if self.current_player_index < len(self.players):
            return self.players[self.current_player_index]
        return None

    def is_betting_complete(self):
        active = [p for p in self.players if not p.folded and not p.all_in]

        if len(active) <= 1:
            return True

        bets = [p.current_bet for p in active]
        all_equal = all(b == bets[0] for b in bets)
        all_acted = all(self.bets_this_round.get(p.id, False) for p in active)

        return all_equal and all_acted

    def call(self, player):
        call_amount = self.current_bet - player.current_bet

        if call_amount <= 0:
            self.action_log.append({'player': player.name, 'action': 'check'})
        elif player.chips <= call_amount:
            all_in = player.chips
            player.current_bet += all_in
            self.pot += all_in
            player.chips = 0
            player.all_in = True
            self.action_log.append({'player': player.name, 'action': 'all-in', 'amount': all_in})
        else:
            player.chips -= call_amount
            player.current_bet += call_amount
            self.pot += call_amount
            self.action_log.append({'player': player.name, 'action': 'call', 'amount': call_amount})

        self.bets_this_round[player.id] = True
        self._next_player()

    def raise_bet(self, player, amount=None):
        if self.raises_this_round >= MAX_RAISES_PER_ROUND:
            self.call(player)
            return

        bet_increment = SMALL_BET if self.betting_round < 2 else BIG_BET
        min_raise = self.current_bet + bet_increment
        raise_amount = amount or min_raise
        total_bet = min(raise_amount, player.chips + player.current_bet)
        additional = total_bet - player.current_bet

        if additional <= 0:
            self.call(player)
            return

        player.chips -= additional
        self.pot += additional
        player.current_bet = total_bet
        self.current_bet = total_bet
        self.raises_this_round += 1
        self.action_log.append({'player': player.name, 'action': 'raise', 'amount': additional})

        self.bets_this_round = {}
        self.bets_this_round[player.id] = True

        self._next_player()

    def fold(self, player):
        player.folded = True
        self.bets_this_round[player.id] = True
        self.action_log.append({'player': player.name, 'action': 'fold'})

        active = [p for p in self.players if not p.folded]
        if len(active) == 1:
            self._end_hand(active[0])
            return

        self._next_player()

    def check(self, player):
        self.bets_this_round[player.id] = True
        self.action_log.append({'player': player.name, 'action': 'check'})
        self._next_player()

    def advance_street(self):
        if self.round >= 4:
            self.showdown()
            return

        self._deal_next_street()
        self.start_betting_round()

    def showdown(self):
        self.phase = 'showdown'

        # Reveal all hole cards
        for p in self.players:
            if not p.folded:
                pass  # Cards are already stored, will be revealed in state

        # Find winner (player closest to dealer's left wins ties)
        active = [p for p in self.players if not p.folded]
        winner = active[0]

        for i in range(1, len(active)):
            comparison = self.evaluator._compare_to(active[i].hand, winner.hand)
            if comparison > 0:
                winner = active[i]
            elif comparison == 0:
                dist_current = self._clockwise_distance(self.dealer_index, active[i].id)
                dist_winner = self._clockwise_distance(self.dealer_index, winner.id)
                if dist_current < dist_winner:
                    winner = active[i]

        self._end_hand(winner)

    def _end_hand(self, winner):
        self.game_over = True
        self.phase = 'complete'
        self.last_winner = winner
        winner.chips += self.pot
        self.total_rounds += 1

    def _next_active_player(self, from_index):
        if not self.players:
            return None
        next_idx = (from_index + 1) % len(self.players)
        iterations = 0
        while self.players[next_idx].folded or self.players[next_idx].all_in:
            next_idx = (next_idx + 1) % len(self.players)
            iterations += 1
            if iterations >= len(self.players):
                return None
        return next_idx

    def _next_player(self):
        next_idx = self._next_active_player(self.current_player_index)
        if next_idx is None:
            self.phase = 'waiting'
            return
        self.current_player_index = next_idx

        if self.is_betting_complete():
            self.phase = 'waiting'

    def _clockwise_distance(self, from_id, to_id):
        # Convert IDs to indices
        from_idx = next((i for i, p in enumerate(self.players) if p.id == from_id), 0)
        to_idx = next((i for i, p in enumerate(self.players) if p.id == to_id), 0)
        return (to_idx - from_idx + len(self.players)) % len(self.players)

    def get_available_actions(self, player_id):
        player = self.get_player_by_id(player_id)
        if not player or player.folded or player.all_in:
            return []

        actions = []
        call_amount = self.current_bet - player.current_bet

        if call_amount <= 0:
            actions.append('check')
        elif player.chips >= call_amount:
            actions.append('call')

        if player.chips > call_amount and self.raises_this_round < MAX_RAISES_PER_ROUND:
            actions.append('raise')

        actions.append('fold')

        return actions

    def prepare_next_hand(self):
        self.dealer_index = (self.dealer_index + 1) % len(self.players)
        self.new_hand()
        self.start_betting_round()

    def get_state(self, viewer_id=None):
        return {
            'pot': self.pot,
            'currentBet': self.current_bet,
            'round': self.round,
            'bettingRound': self.betting_round,
            'phase': self.phase,
            'players': [p.to_dict(hide_holes=True, viewer_id=viewer_id) for p in self.players],
            'currentPlayerIndex': self.current_player_index,
            'currentTurn': self.players[self.current_player_index].id if self.current_player_index < len(self.players) else None,
            'dealerIndex': self.dealer_index,
            'dealer': self.players[self.dealer_index].id if self.players else None,
            'totalRounds': self.total_rounds,
            'gameOver': self.game_over,
            'lastWinner': {
                'id': self.last_winner.id,
                'name': self.last_winner.name,
                'hand': self.last_winner.hand
            } if self.last_winner else None,
            'actionLog': self.action_log[-10:]  # Last 10 actions
        }


# ── Server Game Logic ────────────────────────────────────────────────────────

class SokoServerGame:
    """Wrapper that handles multiplayer actions from players."""

    def __init__(self):
        self.reset()
        self.player_map = {}  # websocket/player_id -> name

    def reset(self):
        self.game = SokoGame()
        self.current_turn = None
        self.turn_order = []

    def set_player_names(self, player_ids_names):
        """Set player names from room player list."""
        self.game.players = []
        self.turn_order = []
        for i, (pid, name) in enumerate(player_ids_names):
            player = Player(name, pid)
            self.game.players.append(player)
            self.turn_order.append(pid)
            self.player_map[pid] = name

    def handle_action(self, player_id, action):
        """Process a game action from a player."""
        action_type = action.get('type')

        if action_type == 'start_hand':
            return self._handle_start_hand(player_id)
        elif action_type == 'player_action':
            return self._handle_player_action(player_id, action)
        elif action_type == 'next_hand':
            return self._handle_next_hand(player_id)
        return None

    def _handle_start_hand(self, player_id):
        """Start a new hand."""
        if len(self.game.players) < 2:
            return None

        self.game.new_hand()
        self.game.start_betting_round()

        return {
            'type': 'hand_started',
            'state': self.game.get_state(),
            'hands': {p.id: [c.to_dict() for c in p.cards] for p in self.game.players}
        }

    def _handle_player_action(self, player_id, action):
        """Handle a player action (check/call/raise/fold)."""
        if self.game.phase != 'betting':
            return None

        current = self.game.get_current_player()
        if not current or current.id != player_id:
            return None

        sub_action = action.get('action')

        if sub_action == 'check':
            self.game.check(current)
        elif sub_action == 'call':
            self.game.call(current)
        elif sub_action == 'raise':
            amount = action.get('amount')
            self.game.raise_bet(current, amount)
        elif sub_action == 'fold':
            self.game.fold(current)
        else:
            return None

        result = {
            'type': 'action_made',
            'player': player_id,
            'action': sub_action,
            'state': self.game.get_state()
        }

        # Check if betting is complete, advance street or showdown
        if self.game.phase == 'waiting' and not self.game.game_over:
            self.game.advance_street()
            result['state'] = self.game.get_state()

            # If now betting again, include whose turn it is
            if self.game.phase == 'betting':
                result['nextTurn'] = self.game.get_current_player().id if self.game.get_current_player() else None

        # Check for game over
        if self.game.game_over:
            result['gameOver'] = True
            result['winner'] = {
                'id': self.game.last_winner.id,
                'name': self.game.last_winner.name,
                'hand': self.game.last_winner.hand
            }
            # Reveal all cards
            result['state'] = self.game.get_state()

        return result

    def _handle_next_hand(self, player_id):
        """Start next hand after game over."""
        if not self.game.game_over:
            return None

        self.game.prepare_next_hand()

        return {
            'type': 'hand_started',
            'state': self.game.get_state(),
            'hands': {p.id: [c.to_dict() for c in p.cards] for p in self.game.players}
        }

    def get_state(self, viewer_id=None):
        return self.game.get_state(viewer_id)


# ── Main ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Multiplayer Scandinavian Stud Server')
    parser.add_argument('--port', type=int, default=8767, help='Port to listen on')
    args = parser.parse_args()

    def game_factory():
        return SokoServerGame()

    server = GameServer(
        port=args.port,
        game_factory=game_factory,
        min_players=2,
        max_players=4,
        game_name='Scandinavian Stud'
    )

    print(f"[Scandinavian Stud] Starting server on port {args.port}")
    print(f"[Scandinavian Stud] Players connect via browser to play")
    server.run()
