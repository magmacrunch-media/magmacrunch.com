"""
rule_engine.py — Python port of SORRY! board-config.js rule engine.
Parameterized for different board shapes (square, pentagon, hexagon).

Run tests:  cd arcade/SORRY/tests && pytest test_rule_engine.py -v
"""

from dataclasses import dataclass, field
from typing import Optional
from itertools import combinations


# ── Position Types ────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class TrackPos:
    """Position on the perimeter track."""
    track: int

@dataclass(frozen=True)
class SafePos:
    """Position in a safe zone."""
    safe: int

# Position encoding:
#   None       → pawn is in Start zone
#   TrackPos   → pawn is on perimeter square
#   SafePos    → pawn is on safe zone square (0=first, 4=last before home)
#   'home'     → pawn is in Home

HOME = 'home'


# ── Board Configuration ───────────────────────────────────────────────────────

@dataclass
class Slide:
    color: str
    start: int
    end: int

@dataclass
class ColorConfig:
    entry: int       # track index where pawns enter from Start
    safe_entry: int  # last perimeter square before safe zone
    safe: list       # list of (x, y) tuples for safe zone squares

@dataclass
class BoardConfig:
    """Parameterized board geometry."""
    track_length: int
    colors: list
    color_config: dict  # color → ColorConfig
    slides: list        # list of Slide
    track: list = field(default_factory=list)  # list of (x, y) tuples

    @property
    def num_players(self):
        return len(self.colors)


# ── Standard Square Board ─────────────────────────────────────────────────────

def _build_square_track():
    """Build 60-square perimeter track for standard SORRY! board."""
    track = []
    for x in range(1, 17):
        track.append((x, 1))     # top: 16 squares
    for y in range(2, 17):
        track.append((16, y))    # right: 15 squares
    for x in range(15, 0, -1):
        track.append((x, 16))    # bottom: 15 squares
    for y in range(15, 1, -1):
        track.append((1, y))     # left: 14 squares
    return track  # Total: 60

def _build_square_xy_to_track(track):
    """Build reverse lookup: (x, y) → track index."""
    return {pos: i for i, pos in enumerate(track)}

def create_square_config():
    """Standard 4-player SORRY! board."""
    track = _build_square_track()
    xy_to_track = _build_square_xy_to_track(track)

    colors = ['red', 'blue', 'yellow', 'green']
    color_config = {
        'red': ColorConfig(
            entry=xy_to_track[(5, 1)],
            safe_entry=xy_to_track[(3, 1)],
            safe=[(3, 2), (3, 3), (3, 4), (3, 5), (3, 6)],
        ),
        'blue': ColorConfig(
            entry=xy_to_track[(16, 5)],
            safe_entry=xy_to_track[(16, 3)],
            safe=[(15, 3), (14, 3), (13, 3), (12, 3), (11, 3)],
        ),
        'yellow': ColorConfig(
            entry=xy_to_track[(12, 16)],
            safe_entry=xy_to_track[(14, 16)],
            safe=[(14, 15), (14, 14), (14, 13), (14, 12), (14, 11)],
        ),
        'green': ColorConfig(
            entry=xy_to_track[(1, 12)],
            safe_entry=xy_to_track[(1, 14)],
            safe=[(2, 14), (3, 14), (4, 14), (5, 14), (6, 14)],
        ),
    }

    slides = [
        Slide('red', xy_to_track[(2, 1)], xy_to_track[(5, 1)]),
        Slide('red', xy_to_track[(10, 1)], xy_to_track[(14, 1)]),
        Slide('blue', xy_to_track[(16, 2)], xy_to_track[(16, 5)]),
        Slide('blue', xy_to_track[(16, 10)], xy_to_track[(16, 14)]),
        Slide('yellow', xy_to_track[(15, 16)], xy_to_track[(12, 16)]),
        Slide('yellow', xy_to_track[(7, 16)], xy_to_track[(3, 16)]),
        Slide('green', xy_to_track[(1, 15)], xy_to_track[(1, 12)]),
        Slide('green', xy_to_track[(1, 7)], xy_to_track[(1, 3)]),
    ]

    return BoardConfig(
        track_length=60,
        colors=colors,
        color_config=color_config,
        slides=slides,
        track=track,
    )


# ── Position Helpers ──────────────────────────────────────────────────────────

def pos_equal(a, b):
    """Check if two positions are equal."""
    if a == b:
        return True
    if a is None or b is None:
        return False
    if isinstance(a, TrackPos) and isinstance(b, TrackPos):
        return a.track == b.track
    if isinstance(a, SafePos) and isinstance(b, SafePos):
        return a.safe == b.safe
    return False


def pos_to_xy(pos, color, config):
    """Convert a position to (x, y) coordinates."""
    if pos is None or pos == HOME:
        return None
    if isinstance(pos, TrackPos):
        return config.track[pos.track]
    if isinstance(pos, SafePos):
        return config.color_config[color].safe[pos.safe]
    return None


# ── Movement ──────────────────────────────────────────────────────────────────

def advance_position(pos, color, steps, already_lapped, config):
    """
    Advance a pawn's position forward or backward by `steps`.
    Returns (new_position, lapped) or None if move is illegal.

    Port of advancePosition() from board-config.js.
    """
    cfg = config.color_config[color]
    track_len = config.track_length

    # In safe zone
    if isinstance(pos, SafePos):
        new_safe = pos.safe + steps
        if new_safe < 0:
            return None  # can't back out of safe zone
        if new_safe == 5:
            return (HOME, True)
        if new_safe > 5:
            return None  # overshoot
        return (SafePos(new_safe), True)

    # On perimeter
    if isinstance(pos, TrackPos):
        if steps < 0:
            # Backward — wraps freely, never enters safe zone
            new_track = (pos.track + steps) % track_len
            return (TrackPos(new_track), already_lapped)

        # Forward — check lapping
        entry = cfg.entry
        dist_to_entry = (entry - pos.track + track_len) % track_len
        will_lap = not already_lapped and (dist_to_entry == 0 or steps >= dist_to_entry)
        now_lapped = already_lapped or will_lap

        # Check safe zone entry (only if lapped)
        if now_lapped:
            dist_to_safe = (cfg.safe_entry - pos.track + track_len) % track_len
            dist_to_entry_check = (entry - pos.track + track_len) % track_len

            if dist_to_entry_check == 0:
                safe_reachable = dist_to_safe < track_len
            else:
                safe_reachable = dist_to_safe < dist_to_entry_check

            if safe_reachable and steps >= dist_to_safe:
                safe_steps = steps - dist_to_safe
                if safe_steps > 5:
                    return None  # overshoot HOME
                if safe_steps == 5:
                    return (HOME, True)
                return (SafePos(safe_steps), True)

        # Normal forward move on perimeter
        new_track = (pos.track + steps) % track_len
        return (TrackPos(new_track), now_lapped)

    return None


# ── Slides ────────────────────────────────────────────────────────────────────

def check_slide(track_idx, color, all_pawns, config):
    """
    If `track_idx` is a slide start for a different color, returns
    (slide_end_pos, bumped_pawns) or None.
    """
    slide = None
    for s in config.slides:
        if s.start == track_idx and s.color != color:
            slide = s
            break

    if not slide:
        return None

    # Collect swept track indices
    swept = []
    i = slide.start
    max_steps = config.track_length
    while i != slide.end and len(swept) < max_steps:
        i = (i + 1) % config.track_length
        swept.append(i)

    # Find opponent pawns on swept squares
    bumped = []
    for c, cpawns in all_pawns.items():
        if c == color:
            continue
        for pawn in cpawns:
            pos = pawn['boardPosition']
            if pos is None or pos == HOME or not isinstance(pos, TrackPos):
                continue
            if pos.track in swept:
                bumped.append({'pawnId': pawn['id'], 'color': c})

    return (TrackPos(slide.end), bumped)


# ── Legal Move Calculator ─────────────────────────────────────────────────────

def get_legal_moves(color, all_pawns, card_value, config):
    """
    Return all legal moves for `color` given the full pawn state and card.

    Port of getLegalMoves() from board-config.js.
    """
    cfg = config.color_config[color]
    pawns = all_pawns[color]
    moves = []

    # Build occupancy maps
    friendly_track = set()
    friendly_safe = set()
    opponents_by_track = {}  # track_idx → [{pawnId, color}, ...]

    for c, cpawns in all_pawns.items():
        for p in cpawns:
            pos = p['boardPosition']
            if pos is None or pos == HOME:
                continue
            if isinstance(pos, TrackPos):
                if c == color:
                    friendly_track.add(pos.track)
                else:
                    if pos.track not in opponents_by_track:
                        opponents_by_track[pos.track] = []
                    opponents_by_track[pos.track].append({'pawnId': p['id'], 'color': c})
            if isinstance(pos, SafePos) and c == color:
                friendly_safe.add(pos.safe)

    def opp_at(track_idx):
        arr = opponents_by_track.get(track_idx, [])
        return arr[0] if arr else None

    def check_dest(to):
        if to == HOME:
            return {'bump': None}
        if isinstance(to, SafePos):
            if to.safe in friendly_safe:
                return None
            return {'bump': None}
        if isinstance(to, TrackPos):
            if to.track in friendly_track:
                return None
            return {'bump': opp_at(to.track)}
        return None

    def build_move(pawn, steps, extra_exclude_track=None):
        pos = pawn['boardPosition']
        if pos is None or pos == HOME:
            return None

        result = advance_position(pos, color, steps, pawn.get('lapped', False), config)
        if result is None:
            return None

        new_pos, lapped = result
        dest = check_dest(new_pos)
        if dest is None:
            return None

        final_pos = new_pos
        slide_bumps = []
        highlight_at = None

        if isinstance(final_pos, TrackPos):
            slide = check_slide(final_pos.track, color, all_pawns, config)
            if slide:
                highlight_at = final_pos
                final_pos, slide_bumps = slide
                slide_dest = check_dest(final_pos)
                if slide_dest is None:
                    return None

        return {
            'pawnId': pawn['id'],
            'from': pos,
            'to': final_pos,
            'highlightAt': highlight_at,
            'steps': steps,
            'lapped': lapped,
            'bump': dest['bump'],
            'slideBumps': slide_bumps,
        }

    # ── Sorry card ────────────────────────────────────────────────────────
    if card_value == 'sorry':
        has_pawn_in_start = any(p['boardPosition'] is None for p in pawns)
        if has_pawn_in_start:
            for track_idx, opps in opponents_by_track.items():
                if track_idx in friendly_track:
                    continue
                for opp in opps:
                    for pawn in pawns:
                        if pawn['boardPosition'] is not None:
                            continue

                        final_pos = TrackPos(track_idx)
                        slide_bumps = []
                        highlight_at = None
                        bump = opp

                        slide = check_slide(track_idx, color, all_pawns, config)
                        if slide:
                            highlight_at = final_pos
                            final_pos, slide_bumps = slide
                            slide_bumps = [sb for sb in slide_bumps if sb['pawnId'] != opp['pawnId']]
                            slide_dest_ok = check_dest(final_pos)
                            if slide_dest_ok is None:
                                continue
                            if slide_dest_ok['bump']:
                                bump = slide_dest_ok['bump']

                        moves.append({
                            'pawnId': pawn['id'], 'from': None, 'to': final_pos,
                            'highlightAt': highlight_at, 'steps': 0, 'lapped': False,
                            'bump': bump, 'slideBumps': slide_bumps, 'isSorry': True,
                        })
        return moves

    # ── Card 11 — move 11 OR swap ─────────────────────────────────────────
    if card_value == '11':
        for pawn in pawns:
            m = build_move(pawn, 11)
            if m:
                moves.append(m)

        for pawn in pawns:
            my_pos = pawn['boardPosition']
            if my_pos is None or my_pos == HOME or isinstance(my_pos, SafePos):
                continue

            for track_idx, opps in opponents_by_track.items():
                if track_idx in friendly_track:
                    continue
                for opp in opps:
                    final_pos = TrackPos(track_idx)
                    slide_bumps = []
                    highlight_at = None

                    slide = check_slide(track_idx, color, all_pawns, config)
                    if slide:
                        highlight_at = final_pos
                        final_pos, slide_bumps = slide
                        slide_bumps = [sb for sb in slide_bumps if sb['pawnId'] != opp['pawnId']]
                        if check_dest(final_pos) is None:
                            continue

                    moves.append({
                        'pawnId': pawn['id'], 'from': my_pos, 'to': final_pos,
                        'highlightAt': highlight_at, 'steps': 0,
                        'lapped': pawn.get('lapped', False),
                        'bump': None, 'slideBumps': slide_bumps,
                        'isSwap': True, 'swapWith': opp, 'swapTo': my_pos,
                    })
        return moves

    # ── Card 7 — split moves ──────────────────────────────────────────────
    if card_value == '7':
        on_board = [p for p in pawns if p['boardPosition'] is not None and p['boardPosition'] != HOME]

        for pawn in on_board:
            full = build_move(pawn, 7)
            if full:
                moves.append(full)

            for s in range(1, 7):
                m = build_move(pawn, s)
                if not m:
                    continue
                remaining = 7 - s
                sim_pawns = {c: [dict(p) for p in ps] for c, ps in all_pawns.items()}
                sim_pawn = next((p for p in sim_pawns[color] if p['id'] == pawn['id']), None)
                if sim_pawn:
                    sim_pawn['boardPosition'] = m['to']
                    sim_pawn['lapped'] = m['lapped']
                second_moves = get_split_moves(color, sim_pawns, pawn['id'], m['to'], remaining, config)
                if second_moves:
                    moves.append(m)
        return moves

    # ── Standard cards ────────────────────────────────────────────────────
    can_exit = card_value in ('1', '2')
    step_map = {
        '1': [1], '2': [2], '3': [3], '4': [-4], '5': [5],
        '8': [8], '10': [10, -1], '12': [12],
    }
    step_options = step_map.get(card_value, [])

    for pawn in pawns:
        pos = pawn['boardPosition']

        if pos is None:
            if can_exit:
                dest = check_dest(TrackPos(cfg.entry))
                if dest is not None:
                    moves.append({
                        'pawnId': pawn['id'], 'from': None,
                        'to': TrackPos(cfg.entry), 'steps': 0,
                        'lapped': False, 'bump': dest['bump'], 'slideBumps': [],
                    })
            continue

        if pos == HOME:
            continue

        for steps in step_options:
            m = build_move(pawn, steps)
            if m:
                moves.append(m)

    return moves


def get_split_moves(color, all_pawns, moved_pawn_id, moved_to, remaining, config):
    """
    For card 7 split phase 2: find valid moves for other pawns.
    """
    pawns = all_pawns[color]

    friendly_track = set()
    friendly_safe = set()
    opponents_by_track = {}

    for c, cpawns in all_pawns.items():
        for p in cpawns:
            pos = moved_to if p['id'] == moved_pawn_id else p['boardPosition']
            if pos is None or pos == HOME:
                continue
            if isinstance(pos, TrackPos):
                if c == color:
                    friendly_track.add(pos.track)
                else:
                    if pos.track not in opponents_by_track:
                        opponents_by_track[pos.track] = []
                    opponents_by_track[pos.track].append({'pawnId': p['id'], 'color': c})
            if isinstance(pos, SafePos) and c == color:
                friendly_safe.add(pos.safe)

    def opp_at(track_idx):
        arr = opponents_by_track.get(track_idx, [])
        return arr[0] if arr else None

    def check_dest(to):
        if to == HOME:
            return {'bump': None}
        if isinstance(to, SafePos):
            if to.safe in friendly_safe:
                return None
            return {'bump': None}
        if isinstance(to, TrackPos):
            if to.track in friendly_track:
                return None
            return {'bump': opp_at(to.track)}
        return None

    moves = []
    sim_pawns = {c: [dict(p) for p in ps] for c, ps in all_pawns.items()}
    moved_pawn_obj = next((p for p in sim_pawns[color] if p['id'] == moved_pawn_id), None)
    if moved_pawn_obj:
        moved_pawn_obj['boardPosition'] = moved_to

    for pawn in pawns:
        if pawn['id'] == moved_pawn_id:
            continue
        pos = pawn['boardPosition']
        if pos is None or pos == HOME:
            continue

        result = advance_position(pos, color, remaining, pawn.get('lapped', False), config)
        if not result:
            continue
        new_pos, lapped = result

        dest = check_dest(new_pos)
        if not dest:
            continue

        final_pos = new_pos
        slide_bumps = []
        highlight_at = None

        if isinstance(final_pos, TrackPos):
            slide = check_slide(final_pos.track, color, sim_pawns, config)
            if slide:
                highlight_at = final_pos
                final_pos, slide_bumps = slide
                if not check_dest(final_pos):
                    continue

        moves.append({
            'pawnId': pawn['id'], 'from': pos, 'to': final_pos,
            'highlightAt': highlight_at, 'steps': remaining,
            'lapped': lapped, 'bump': dest['bump'], 'slideBumps': slide_bumps,
        })

    return moves


# ── Card Deck ─────────────────────────────────────────────────────────────────

CARD_DEFINITIONS = [
    {"value": "1", "label": "1", "description": "Move out of Start, or move forward 1."},
    {"value": "2", "label": "2", "description": "Move out of Start, or move forward 2. Draw again!"},
    {"value": "3", "label": "3", "description": "Move forward 3."},
    {"value": "4", "label": "4", "description": "Move backward 4."},
    {"value": "5", "label": "5", "description": "Move forward 5."},
    {"value": "7", "label": "7", "description": "Move forward 7, or split between two pawns."},
    {"value": "8", "label": "8", "description": "Move forward 8."},
    {"value": "10", "label": "10", "description": "Move forward 10, or backward 1."},
    {"value": "11", "label": "11", "description": "Move forward 11, or swap with any opponent's pawn."},
    {"value": "12", "label": "12", "description": "Move forward 12."},
    {"value": "sorry", "label": "Sorry!", "description": "Take a pawn from Start, place it on any opponent's square!"},
]

CARD_COUNTS = {
    "1": 5, "2": 4, "3": 4, "4": 4, "5": 4,
    "7": 4, "8": 4, "10": 4, "11": 4, "12": 4,
    "sorry": 4,
}

def build_deck():
    """Build a standard SORRY! deck."""
    deck = []
    for card in CARD_DEFINITIONS:
        for _ in range(CARD_COUNTS[card['value']]):
            deck.append(card.copy())
    return deck
