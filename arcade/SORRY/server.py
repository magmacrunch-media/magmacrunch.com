"""
WebSocket server — SORRY! multiplayer (shared framework version)
Run with:  python server.py [--port PORT]
Requires:  pip install -r arcade/requirements.txt
"""

import sys
import os
import argparse
import random

# Add shared multiplayer directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'shared', 'multiplayer'))
from server_base import GameServer, SLOT_COLORS, PALETTE

# ── Card deck ──────────────────────────────────────────────────────────────────

CARD_DEFINITIONS = [
    {"value": "1",      "label": "1",      "description": "Move out of Start, or move forward 1."},
    {"value": "2",      "label": "2",      "description": "Move out of Start, or move forward 2. Draw again!"},
    {"value": "3",      "label": "3",      "description": "Move forward 3."},
    {"value": "4",      "label": "4",      "description": "Move backward 4."},
    {"value": "5",      "label": "5",      "description": "Move forward 5."},
    {"value": "7",      "label": "7",      "description": "Move forward 7, or split between two pawns."},
    {"value": "8",      "label": "8",      "description": "Move forward 8."},
    {"value": "10",     "label": "10",     "description": "Move forward 10, or backward 1."},
    {"value": "11",     "label": "11",     "description": "Move forward 11, or swap with any opponent's pawn."},
    {"value": "12",     "label": "12",     "description": "Move forward 12."},
    {"value": "sorry",  "label": "Sorry!", "description": "Take a pawn from Start, place it on any opponent's square!"},
]

CARD_COUNTS = {
    "1": 5, "2": 4, "3": 4, "4": 4, "5": 4,
    "7": 4, "8": 4, "10": 4, "11": 4, "12": 4,
    "sorry": 4,
}


class SorryGame:
    """SORRY! game logic for the shared multiplayer framework."""

    def __init__(self):
        self.player_names = []
        self.draw_pile = []
        self.discard_pile = []
        self.current_card = None
        self.current_turn_idx = 0
        self.pawn_positions = {}
        self.pawn_lapped = {}
        self.player_colors = {}   # player_name → hex (game-specific tracking)
        self.taken_colors = set()
        self.phase = 'lobby'
        self.winner = None

    def set_player_names(self, names):
        """Called by framework before reset(). Stores ordered player list."""
        self.player_names = names

    def reset(self):
        """Initialize game state for a new round."""
        self.draw_pile = self._build_deck()
        self.discard_pile = []
        self.current_card = None
        self.current_turn_idx = 0
        self.pawn_positions = {c: [None, None, None, None] for c in SLOT_COLORS}
        self.pawn_lapped = {c: [False, False, False, False] for c in SLOT_COLORS}
        self.phase = 'playing'
        self.winner = None

    def handle_action(self, player_name, action):
        """Process one game action. Return dict, list of dicts, or None."""
        action_type = action.get('type')

        if action_type == 'draw_card':
            return self._draw_card(player_name)
        elif action_type == 'move_pawn':
            return self._move_pawn(player_name, action)
        elif action_type == 'move_pawn_partial':
            return self._move_pawn_partial(player_name, action)
        elif action_type == 'bump_pawn':
            return self._bump_pawn(player_name, action)
        elif action_type == 'swap_pawn':
            return self._swap_pawn(player_name, action)
        elif action_type == 'skip_turn':
            return self._skip_turn(player_name)
        elif action_type == 'change_color':
            return self._change_color(player_name, action)

        return None

    def get_state(self):
        """Return full game state for spectators and late joiners."""
        sides = {}
        for i, name in enumerate(self.player_names):
            slot = SLOT_COLORS[i] if i < len(SLOT_COLORS) else None
            if slot:
                sides[slot] = name

        return {
            "sides": sides,
            "currentTurn": self.player_names[self.current_turn_idx] if self.current_turn_idx < len(self.player_names) else None,
            "currentTurnColor": SLOT_COLORS[self.current_turn_idx] if self.current_turn_idx < len(SLOT_COLORS) else None,
            "pawns": self._build_pawns_state(),
            "deckRemaining": len(self.draw_pile),
            "phase": self.phase,
            "winner": self.winner,
        }

    # ── Action handlers ────────────────────────────────────────────────────────

    def _draw_card(self, player_name):
        """Draw a card from the deck. Returns card_drawn message."""
        if self.current_card is not None:
            return None  # already drew — wait for move

        if not self.draw_pile:
            self.draw_pile = self.discard_pile[:]
            self.discard_pile = []
            random.shuffle(self.draw_pile)

        card = self.draw_pile.pop()
        self.discard_pile.append(card)
        self.current_card = card

        return {
            "type": "card_drawn",
            "from": player_name,
            "card": card,
            "cardsRemaining": len(self.draw_pile),
        }

    def _move_pawn(self, player_name, action):
        """Move a pawn. Returns pawn_moved (+ turn_update unless card 2)."""
        if self.current_card is None:
            return None

        color = action.get('color')
        pawn_idx = action.get('pawnIndex')
        new_pos = action.get('newPosition')
        lapped = action.get('lapped', False)

        if color is None or pawn_idx is None:
            return None

        player_slot = self._slot_for_player(player_name)
        if color != player_slot:
            return None  # can't move opponent's pawn

        if not isinstance(pawn_idx, int) or not (0 <= pawn_idx <= 3):
            return None

        self.pawn_positions[color][pawn_idx] = new_pos
        if lapped:
            self.pawn_lapped[color][pawn_idx] = True

        card_value = self.current_card["value"]
        self.current_card = None

        msgs = [{
            "type": "pawn_moved",
            "color": color,
            "pawnIndex": pawn_idx,
            "pawnId": f"{color}-{pawn_idx}",
            "newPosition": new_pos,
            "lapped": lapped,
        }]

        # Check for win
        if new_pos == 'home':
            all_home = all(p == 'home' for p in self.pawn_positions.get(color, []))
            if all_home:
                self.winner = player_name
                self.phase = 'finished'
                msgs.append({"type": "game_over", "winner": player_name, "winnerColor": color})

        # Advance turn (card 2 allows draw again — skip turn advance)
        if card_value != "2" and self.phase != 'finished':
            self._advance_turn()
            msgs.append(self._turn_update_msg())

        return msgs

    def _move_pawn_partial(self, player_name, action):
        """Partial move for card 7 split. Returns pawn_moved (no turn change)."""
        if self.current_card is None or self.current_card.get("value") != "7":
            return None

        color = action.get('color')
        pawn_idx = action.get('pawnIndex')
        new_pos = action.get('newPosition')
        lapped = action.get('lapped', False)

        if color is None or pawn_idx is None:
            return None

        player_slot = self._slot_for_player(player_name)
        if color != player_slot:
            return None

        if not isinstance(pawn_idx, int) or not (0 <= pawn_idx <= 3):
            return None

        self.pawn_positions[color][pawn_idx] = new_pos
        if lapped:
            self.pawn_lapped[color][pawn_idx] = True

        return {
            "type": "pawn_moved",
            "color": color,
            "pawnIndex": pawn_idx,
            "pawnId": f"{color}-{pawn_idx}",
            "newPosition": new_pos,
            "lapped": lapped,
        }

    def _bump_pawn(self, player_name, action):
        """Bump an opponent's pawn back to Start."""
        bump_color = action.get('color')
        bump_idx = action.get('pawnIndex')

        if bump_color is None or bump_idx is None:
            return None

        player_slot = self._slot_for_player(player_name)
        if bump_color == player_slot:
            return None  # can't bump your own pawn

        self.pawn_positions[bump_color][bump_idx] = None
        self.pawn_lapped[bump_color][bump_idx] = False

        return {
            "type": "pawn_moved",
            "color": bump_color,
            "pawnIndex": bump_idx,
            "pawnId": f"{bump_color}-{bump_idx}",
            "newPosition": None,
            "lapped": False,
        }

    def _swap_pawn(self, player_name, action):
        """Swap with an opponent's pawn (card 11)."""
        swap_color = action.get('color')
        swap_idx = action.get('pawnIndex')
        new_pos = action.get('newPosition')
        opp_lapped = action.get('oppLapped', False)

        if swap_color is None or swap_idx is None or new_pos is None:
            return None

        player_slot = self._slot_for_player(player_name)
        if swap_color == player_slot:
            return None  # can't swap with yourself

        self.pawn_positions[swap_color][swap_idx] = new_pos
        if opp_lapped:
            self.pawn_lapped[swap_color][swap_idx] = True

        return {
            "type": "pawn_moved",
            "color": swap_color,
            "pawnIndex": swap_idx,
            "pawnId": f"{swap_color}-{swap_idx}",
            "newPosition": new_pos,
            "lapped": opp_lapped,
        }

    def _skip_turn(self, player_name):
        """Player has no moves — skip their turn."""
        if self.current_card is None:
            return None

        skipped_label = self.current_card["label"]
        self.current_card = None
        self._advance_turn()

        return [
            {"type": "system", "text": f"{player_name} drew {skipped_label} but had no moves — skipping."},
            self._turn_update_msg(),
        ]

    def _change_color(self, player_name, action):
        """Allow a player to change their display color."""
        new_color = (action.get('color') or '').strip()

        # Validate against the shared palette
        if new_color not in PALETTE:
            return None

        # Check if color is taken by another player
        my_old_color = self.player_colors.get(player_name)
        if new_color in self.taken_colors and new_color != my_old_color:
            return None

        # Update tracking
        if my_old_color:
            self.taken_colors.discard(my_old_color)
        self.player_colors[player_name] = new_color
        self.taken_colors.add(new_color)

        # Build slot-based colorMap
        color_map = {}
        for i, name in enumerate(self.player_names):
            slot = SLOT_COLORS[i] if i < len(SLOT_COLORS) else None
            if slot:
                color_map[slot] = self.player_colors.get(name, '#aaa')

        return {
            "type": "color_changed",
            "playerName": player_name,
            "colorMap": color_map,
        }

    # ── Helpers ────────────────────────────────────────────────────────────────

    def _slot_for_player(self, player_name):
        """Return the board slot color for a player, or None."""
        try:
            idx = self.player_names.index(player_name)
            return SLOT_COLORS[idx] if idx < len(SLOT_COLORS) else None
        except ValueError:
            return None

    def _advance_turn(self):
        """Move to the next player's turn."""
        if not self.player_names:
            return
        self.current_turn_idx = (self.current_turn_idx + 1) % len(self.player_names)

    def _turn_update_msg(self):
        """Build a turn_update message for the current turn."""
        name = self.player_names[self.current_turn_idx] if self.current_turn_idx < len(self.player_names) else None
        return {"type": "turn_update", "currentTurnName": name}

    def _build_deck(self):
        """Build and shuffle a fresh deck."""
        deck = []
        for card in CARD_DEFINITIONS:
            for _ in range(CARD_COUNTS[card["value"]]):
                deck.append(card.copy())
        random.shuffle(deck)
        return deck

    def _build_pawns_state(self):
        """Convert internal pawn positions to the client-facing format."""
        pawns = {}
        for color in SLOT_COLORS:
            positions = self.pawn_positions.get(color, [None, None, None, None])
            lapped = self.pawn_lapped.get(color, [False, False, False, False])
            pawns[color] = []
            for idx, pos in enumerate(positions):
                pawns[color].append({
                    "id": f"{color}-{idx}",
                    "color": color,
                    "boardPosition": pos,
                    "inHome": (pos == 'home'),
                    "lapped": lapped[idx] if idx < len(lapped) else False,
                })
        return pawns


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Multiplayer SORRY! Server')
    parser.add_argument('--port', type=int, default=8765, help='Port to listen on')
    args = parser.parse_args()

    def game_factory():
        return SorryGame()

    server = GameServer(
        port=args.port,
        game_factory=game_factory,
        min_players=2,
        max_players=4,
        game_name='SORRY',
    )
    server.run()
