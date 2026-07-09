"""
cribbage/server.py — Multiplayer Cribbage server
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
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5,
    '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13
}

WINNING_SCORE = 121
CARDS_PER_HAND = 6
MAX_PEG_COUNT = 31

# Scoring values
SCORE = {
    'FIFTEEN': 2,
    'PAIR': 2,
    'THREE_OF_KIND': 6,
    'FOUR_OF_KIND': 12,
    'FLUSH_4': 4,
    'FLUSH_5': 5,
    'NIBS': 1,
    'HIS_HEELS': 2,
    'GO': 1,
    'THIRTY_ONE': 2,
}


# ── Cribbage Game Logic ─────────────────────────────────────────────────────

class CribbageGame:
    def __init__(self):
        self.reset()

    def reset(self):
        self.phase = 'deal'
        self.deck = self._create_deck()
        self.player_hands = {}  # name -> [card, ...]
        self.crib = []
        self.starter = None
        self.scores = {}
        self.current_turn = None
        self.current_count = 0
        self.played_cards = []  # cards played this count
        self.last_to_play = None
        self.go_called = False
        self.turn_count = 0
        self.players = []  # ordered player names
        self.dealer_index = 0
        self.crib_selections = {}  # name -> [card, ...]
        self.selected_count = {}  # name -> number selected

    def _create_deck(self):
        deck = []
        for suit in SUITS:
            for rank in RANKS:
                deck.append({'suit': suit, 'rank': rank})
        random.shuffle(deck)
        return deck

    def _deal(self):
        """Deal 6 cards to each player."""
        self.player_hands = {}
        for player in self.players:
            self.player_hands[player] = [self.deck.pop() for _ in range(CARDS_PER_HAND)]
            self.scores[player] = self.scores.get(player, 0)

        self.crib = []
        self.starter = None
        self.crib_selections = {}
        self.selected_count = {p: 0 for p in self.players}
        self.phase = 'crib_selection'

    def _cut_starter(self):
        """Cut the deck for a starter card."""
        if len(self.deck) < 1:
            self.deck = self._create_deck()
        idx = random.randint(0, len(self.deck) - 1)
        self.starter = self.deck[idx]
        self.starter['faceUp'] = True

        # His Heels: Jack as starter
        if self.starter['rank'] == 'J':
            dealer = self.players[self.dealer_index]
            self.scores[dealer] = self.scores.get(dealer, 0) + SCORE['HIS_HEELS']

        self.phase = 'pegging'
        # Non-dealer goes first
        non_dealer_idx = (self.dealer_index + 1) % len(self.players)
        self.current_turn = self.players[non_dealer_idx]
        self.current_count = 0
        self.played_cards = []
        self.last_to_play = None
        self.go_called = False
        self.turn_count = 0

    def _score_hand(self, hand, starter, is_crib=False):
        """Score a hand of 4 cards + starter."""
        all_cards = hand + ([starter] if starter else [])
        if len(all_cards) < 2:
            return {'total': 0, 'breakdown': {}}

        fifteens = self._count_fifteens(all_cards)
        pairs = self._count_pairs(all_cards)
        runs = self._count_runs(all_cards)
        flush = self._count_flush(hand, starter, is_crib)
        nobs = self._count_nobs(hand, starter)

        total = fifteens + pairs + runs + flush + nobs
        return {
            'total': total,
            'breakdown': {
                'fifteens': fifteens,
                'pairs': pairs,
                'runs': runs,
                'flush': flush,
                'nobs': nobs,
            }
        }

    def _count_fifteens(self, cards):
        """Count combinations of cards summing to 15."""
        count = 0
        n = len(cards)
        for mask in range(1, 1 << n):
            total = 0
            for i in range(n):
                if mask & (1 << i):
                    total += RANK_VALUES[cards[i]['rank']]
            if total == 15:
                count += 1
        return count * SCORE['FIFTEEN']

    def _count_pairs(self, cards):
        """Count pairs, three of a kind, four of a kind."""
        rank_counts = {}
        for card in cards:
            rank_counts[card['rank']] = rank_counts.get(card['rank'], 0) + 1

        points = 0
        for rank, count in rank_counts.items():
            if count == 2:
                points += SCORE['PAIR']
            elif count == 3:
                points += SCORE['THREE_OF_KIND']
            elif count == 4:
                points += SCORE['FOUR_OF_KIND']
        return points

    def _count_runs(self, cards):
        """Count runs of 3+ cards."""
        if len(cards) < 3:
            return 0

        # Get unique values and their counts
        value_counts = {}
        for card in cards:
            val = RANK_VALUES[card['rank']]
            value_counts[val] = value_counts.get(val, 0) + 1

        unique_values = sorted(value_counts.keys())

        total_points = 0
        i = 0
        while i < len(unique_values):
            # Find end of consecutive sequence
            j = i
            while j + 1 < len(unique_values) and unique_values[j + 1] == unique_values[j] + 1:
                j += 1

            seq_length = j - i + 1
            if seq_length >= 3:
                # Score all sub-runs
                for start in range(i, j - 1):
                    for end in range(start + 2, j + 1):
                        run_length = end - start + 1
                        multiplier = 1
                        for k in range(start, end + 1):
                            multiplier *= value_counts[unique_values[k]]
                        total_points += run_length * multiplier

            i = j + 1

        return total_points

    def _count_flush(self, hand, starter, is_crib):
        """Count flush (4 or 5 cards same suit)."""
        if not starter or len(hand) < 4:
            return 0

        hand_suit = hand[0]['suit']
        is_hand_flush = all(c['suit'] == hand_suit for c in hand)

        if not is_hand_flush:
            return 0

        if starter['suit'] == hand_suit:
            return SCORE['FLUSH_5']

        if is_crib:
            return 0

        return SCORE['FLUSH_4']

    def _count_nobs(self, hand, starter):
        """Count nobs (Jack in hand matching starter suit)."""
        if not starter:
            return 0
        for card in hand:
            if card['rank'] == 'J' and card['suit'] == starter['suit']:
                return SCORE['NIBS']
        return 0

    def _score_pegging(self, card, played_cards):
        """Score a pegging play."""
        count = sum(RANK_VALUES[c['rank']] for c in played_cards) + RANK_VALUES[card['rank']]
        points = 0
        descriptions = []

        if count == 31:
            points += SCORE['THIRTY_ONE']
            descriptions.append('Thirty-one!')

        if count == 15:
            points += SCORE['FIFTEEN']
            descriptions.append('Fifteen!')

        # Check pairs
        if played_cards:
            last_card = played_cards[-1]
            if card['rank'] == last_card['rank']:
                if len(played_cards) >= 2 and played_cards[-2]['rank'] == card['rank']:
                    if len(played_cards) >= 3 and played_cards[-3]['rank'] == card['rank']:
                        points += SCORE['FOUR_OF_KIND']
                        descriptions.append('Four of a kind!')
                    else:
                        points += SCORE['THREE_OF_KIND']
                        descriptions.append('Three of a kind!')
                else:
                    points += SCORE['PAIR']
                    descriptions.append('Pair!')

        # Check runs
        if len(played_cards) >= 2:
            all_played = played_cards + [card]
            run_length = 0
            for length in range(min(len(all_played), 7), 2, -1):
                last_n = all_played[-length:]
                values = sorted(RANK_VALUES[c['rank']] for c in last_n)
                if all(values[i + 1] == values[i] + 1 for i in range(len(values) - 1)):
                    run_length = length
                    break
            if run_length >= 3:
                points += run_length
                descriptions.append(f'Run of {run_length}!')

        return points, ' + '.join(descriptions) if descriptions else ''

    def handle_action(self, player, action):
        """Process a game action from a player. Returns dict to broadcast or None."""
        action_type = action.get('type')

        if action_type == 'select_crib':
            return self._handle_crib_selection(player, action)
        elif action_type == 'confirm_crib':
            return self._handle_confirm_crib(player)
        elif action_type == 'cut_starter':
            return self._handle_cut_starter(player)
        elif action_type == 'play_card':
            return self._handle_play_card(player, action)
        elif action_type == 'say_go':
            return self._handle_say_go(player)
        elif action_type == 'next_hand':
            return self._handle_next_hand(player)
        return None

    def _handle_crib_selection(self, player, action):
        """Player selects/deselects a card for the crib."""
        if self.phase != 'crib_selection':
            return None
        if player not in self.player_hands:
            return None

        card = action.get('card')
        if not card:
            return None

        hand = self.player_hands[player]
        selected = self.crib_selections.get(player, [])

        # Toggle selection
        is_selected = any(c['suit'] == card['suit'] and c['rank'] == card['rank'] for c in selected)

        if is_selected:
            selected = [c for c in selected if not (c['suit'] == card['suit'] and c['rank'] == card['rank'])]
        elif len(selected) < 2:
            selected.append(card)

        self.crib_selections[player] = selected
        self.selected_count[player] = len(selected)

        return {
            'type': 'crib_selection_update',
            'player': player,
            'selected': selected,
            'selectedCount': len(selected),
        }

    def _handle_confirm_crib(self, player):
        """Player confirms their crib selection."""
        if self.phase != 'crib_selection':
            return None
        if player not in self.crib_selections:
            return None
        if len(self.crib_selections[player]) != 2:
            return None

        # Move selected cards to crib
        self.crib.extend(self.crib_selections[player])

        # Remove from hand
        self.player_hands[player] = [
            c for c in self.player_hands[player]
            if not any(sc['suit'] == c['suit'] and sc['rank'] == c['rank']
                      for sc in self.crib_selections[player])
        ]

        self.crib_selections[player] = []

        # Check if all players have confirmed
        all_confirmed = all(len(self.crib_selections.get(p, [])) == 0 and len(self.crib.get(p, [])) == 0
                          for p in self.players if self.crib_selections.get(p) is not None)

        # Actually, check if crib has 4 cards (2 from each player)
        if len(self.crib) >= len(self.players) * 2:
            self.phase = 'starter_cut'

        return {
            'type': 'crib_confirmed',
            'player': player,
            'phase': self.phase,
        }

    def _handle_cut_starter(self, player):
        """Cut the deck for a starter card."""
        if self.phase != 'starter_cut':
            return None

        self._cut_starter()

        return {
            'type': 'starter_cut',
            'starter': self.starter,
            'currentTurn': self.current_turn,
            'scores': dict(self.scores),
        }

    def _handle_play_card(self, player, action):
        """Player plays a card during pegging."""
        if self.phase != 'pegging':
            return None
        if self.current_turn != player:
            return None

        card = action.get('card')
        if not card:
            return None

        # Verify card is in hand
        hand = self.player_hands.get(player, [])
        card_in_hand = None
        for c in hand:
            if c['suit'] == card['suit'] and c['rank'] == card['rank']:
                card_in_hand = c
                break

        if not card_in_hand:
            return None

        # Check count limit
        card_value = RANK_VALUES[card_in_hand['rank']]
        if self.current_count + card_value > MAX_PEG_COUNT:
            return None

        # Play the card
        self.current_count += card_value
        self.played_cards.append(card_in_hand)
        self.player_hands[player] = [c for c in hand if c != card_in_hand]

        # Score the play
        points, description = self._score_pegging(card_in_hand, self.played_cards[:-1])
        self.scores[player] = self.scores.get(player, 0) + points

        result = {
            'type': 'card_played',
            'player': player,
            'card': card_in_hand,
            'count': self.current_count,
            'points': points,
            'description': description,
            'scores': dict(self.scores),
        }

        # Check for 31
        if self.current_count == 31:
            self.last_to_play = player
            self._reset_count()
            result['hit31'] = True
            return result

        # Check for Go
        opponent = [p for p in self.players if p != player][0]
        opponent_hand = self.player_hands.get(opponent, [])
        can_opponent_play = any(RANK_VALUES[c['rank']] + self.current_count <= MAX_PEG_COUNT
                               for c in opponent_hand)

        if not can_opponent_play:
            self.scores[player] = self.scores.get(player, 0) + SCORE['GO']
            self.go_called = True
            self.last_to_play = player
            result['go'] = True
            result['goPoints'] = SCORE['GO']
            result['scores'] = dict(self.scores)
            self._reset_count()
            return result

        # Switch turns
        self.current_turn = opponent
        self.turn_count += 1
        result['nextTurn'] = self.current_turn

        return result

    def _handle_say_go(self, player):
        """Player says Go (can't play)."""
        if self.phase != 'pegging':
            return None
        if self.current_turn != player:
            return None

        # Check if player can actually play
        hand = self.player_hands.get(player, [])
        can_play = any(RANK_VALUES[c['rank']] + self.current_count <= MAX_PEG_COUNT for c in hand)

        if can_play:
            return None  # Can play, can't say Go

        # Go point already awarded in play_card, just reset
        self.last_to_play = player
        self._reset_count()

        return {
            'type': 'go_called',
            'player': player,
            'count': self.current_count,
            'currentTurn': self.current_turn,
            'scores': dict(self.scores),
        }

    def _reset_count(self):
        """Reset count after 31 or Go."""
        self.current_count = 0
        self.played_cards = []
        self.go_called = False

        # Check if all cards played
        if all(len(hand) == 0 for hand in self.player_hands.values()):
            self.phase = 'hand_scoring'
            return

        # Next turn: player who couldn't play (or last to play if Go)
        if self.last_to_play:
            self.current_turn = self.last_to_play

    def _handle_next_hand(self, player):
        """Advance to next hand after scoring."""
        if self.phase != 'hand_scoring':
            return None

        # Score hands
        results = self._score_hands()

        # Check for winner
        winner = None
        for name, score in self.scores.items():
            if score >= WINNING_SCORE:
                winner = name
                break

        if winner:
            self.phase = 'game_over'
            return {
                'type': 'game_over',
                'winner': winner,
                'scores': dict(self.scores),
                'scoring': results,
            }

        # Rotate dealer
        self.dealer_index = (self.dealer_index + 1) % len(self.players)
        self.phase = 'deal'
        self._deal()

        return {
            'type': 'next_hand',
            'dealer': self.players[self.dealer_index],
            'scores': dict(self.scores),
            'scoring': results,
            'hands': {p: self.player_hands[p] for p in self.players},
        }

    def _score_hands(self):
        """Score all hands and crib."""
        results = []

        # Non-dealer first
        non_dealer_idx = (self.dealer_index + 1) % len(self.players)
        non_dealer = self.players[non_dealer_idx]
        non_dealer_score = self._score_hand(self.player_hands[non_dealer], self.starter)
        self.scores[non_dealer] = self.scores.get(non_dealer, 0) + non_dealer_score['total']
        results.append({
            'player': non_dealer,
            'score': non_dealer_score,
        })

        # Dealer's hand
        dealer = self.players[self.dealer_index]
        dealer_score = self._score_hand(self.player_hands[dealer], self.starter)
        self.scores[dealer] = self.scores.get(dealer, 0) + dealer_score['total']
        results.append({
            'player': dealer,
            'score': dealer_score,
        })

        # Crib (dealer's)
        crib_score = self._score_hand(self.crib, self.starter, is_crib=True)
        self.scores[dealer] = self.scores.get(dealer, 0) + crib_score['total']
        results.append({
            'player': 'crib',
            'score': crib_score,
        })

        return results

    def get_state(self):
        """Return current game state."""
        return {
            'phase': self.phase,
            'scores': dict(self.scores),
            'playerHands': {p: self.player_hands.get(p, []) for p in self.players},
            'crib': self.crib,
            'starter': self.starter,
            'currentCount': self.current_count,
            'currentTurn': self.current_turn,
            'dealer': self.players[self.dealer_index] if self.players else None,
            'playedCards': self.played_cards,
            'players': self.players,
        }


# ── Main ────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description='Multiplayer Cribbage Server')
    parser.add_argument('--port', type=int, default=8766, help='Port to listen on')
    args = parser.parse_args()

    def game_factory():
        return CribbageGame()

    server = GameServer(
        port=args.port,
        game_factory=game_factory,
        min_players=2,
        max_players=2,
        game_name='Cribbage'
    )

    print(f"[Cribbage] Starting server on port {args.port}")
    print(f"[Cribbage] Players connect via browser to play")
    server.run()
