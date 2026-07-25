"""
simulate.py — SORRY! game simulation toolkit.
Run simulations to test game balance, measure stats, compare board configs.

Usage:
    python simulate.py                    # Run 1000 games on standard board
    python simulate.py --games 5000       # More games
    python simulate.py --players 4        # Force 4 players
    python simulate.py --strategy heuristic  # Use heuristic bots
"""

import random
import time
import sys
import os
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from rule_engine import (
    create_square_config, advance_position, check_slide,
    get_legal_moves, build_deck, TrackPos, SafePos, HOME, BoardConfig,
)


# ── Bot Strategies ────────────────────────────────────────────────────────────

def random_bot(color, pawns, card_value, config):
    """Pick a random legal move."""
    moves = get_legal_moves(color, pawns, card_value, config)
    if not moves:
        return None
    return random.choice(moves)


def heuristic_bot(color, pawns, card_value, config):
    """Pick the best move based on simple heuristics."""
    moves = get_legal_moves(color, pawns, card_value, config)
    if not moves:
        return None

    scored = []
    for m in moves:
        score = 0

        # Big bonus for reaching home
        if m['to'] == HOME:
            score += 1000

        # Bonus for safe zone
        elif isinstance(m['to'], SafePos):
            score += 200 + m['to'].safe * 10  # deeper = better

        # Bonus for bumps
        if m.get('bump'):
            score += 150

        # Bonus for slide bumps
        score += len(m.get('slideBumps', [])) * 80

        # Bonus for forward movement on track
        if isinstance(m['from'], TrackPos) and isinstance(m['to'], TrackPos):
            from rule_engine import advance_position as adv
            cfg = config.color_config[color]
            track_len = config.track_length
            # How far toward goal (home stretch entry)
            dist = (m['to'].track - cfg.entry + track_len) % track_len
            score += (track_len - dist) * 2  # closer to home = better

        # Penalty for moving backward
        if m.get('steps', 0) < 0:
            score -= 30

        # Small random factor for variety
        score += random.random() * 5

        scored.append((score, m))

    scored.sort(key=lambda x: x[0], reverse=True)
    return scored[0][1]


STRATEGIES = {
    'random': random_bot,
    'heuristic': heuristic_bot,
}


# ── Game Simulation ───────────────────────────────────────────────────────────

def simulate_game(config, strategy='random', max_turns=500, seed=None):
    """
    Simulate a single game.
    Returns dict with game stats.
    """
    if seed is not None:
        random.seed(seed)

    colors = config.colors[:4]  # Use first 4 colors for now
    num_players = len(colors)

    # Initialize pawns
    pawns = {}
    for c in colors:
        pawns[c] = [
            {'id': f'{c}-{i}', 'color': c, 'boardPosition': None, 'lapped': False}
            for i in range(4)
        ]

    # Build and shuffle deck
    deck = build_deck()
    random.shuffle(deck)
    discard = []

    # Game state
    current_color_idx = 0
    turns = 0
    winner = None
    bot_fn = STRATEGIES[strategy]

    while turns < max_turns:
        color = colors[current_color_idx]

        # Draw card
        if not deck:
            deck = discard[:]
            discard = []
            random.shuffle(deck)

        card = deck.pop()
        discard.append(card)
        card_value = card['value']

        # Get legal moves
        moves = get_legal_moves(color, pawns, card_value, config)

        if moves:
            # Bot picks a move
            move = bot_fn(color, pawns, card_value, config)

            # Apply move
            if move:
                # Move the pawn
                pawn_list = pawns[color]
                pawn = next(p for p in pawn_list if p['id'] == move['pawnId'])
                pawn['boardPosition'] = move['to']
                pawn['lapped'] = move.get('lapped', False)

                # Handle bump
                if move.get('bump'):
                    bump = move['bump']
                    bump_pawn = next(
                        (p for p in pawns[bump['color']] if p['id'] == bump['pawnId']),
                        None
                    )
                    if bump_pawn:
                        bump_pawn['boardPosition'] = None
                        bump_pawn['lapped'] = False

                # Handle slide bumps
                for sb in move.get('slideBumps', []):
                    sb_pawn = next(
                        (p for p in pawns[sb['color']] if p['id'] == sb['pawnId']),
                        None
                    )
                    if sb_pawn:
                        sb_pawn['boardPosition'] = None
                        sb_pawn['lapped'] = False

                # Handle swap (card 11)
                if move.get('isSwap') and move.get('swapWith'):
                    swap = move['swapWith']
                    swap_pawn = next(
                        (p for p in pawns[swap['color']] if p['id'] == swap['pawnId']),
                        None
                    )
                    if swap_pawn:
                        swap_pawn['boardPosition'] = move['swapTo']

                # Check for win
                if move['to'] == HOME:
                    all_home = all(p['boardPosition'] == HOME for p in pawns[color])
                    if all_home:
                        winner = color
                        break

        # Advance turn (card 2 skips)
        if card_value != '2':
            current_color_idx = (current_color_idx + 1) % num_players

        turns += 1

    # Count final piece positions
    piece_positions = {}
    for c in colors:
        home = sum(1 for p in pawns[c] if p['boardPosition'] == HOME)
        safe = sum(1 for p in pawns[c] if isinstance(p['boardPosition'], SafePos))
        track = sum(1 for p in pawns[c] if isinstance(p['boardPosition'], TrackPos))
        start = sum(1 for p in pawns[c] if p['boardPosition'] is None)
        piece_positions[c] = {'home': home, 'safe': safe, 'track': track, 'start': start}

    return {
        'winner': winner,
        'turns': turns,
        'max_turns_reached': turns >= max_turns,
        'piece_positions': piece_positions,
    }


# ── Tournament ────────────────────────────────────────────────────────────────

def run_tournament(config, num_games=1000, strategy='random', verbose=False):
    """Run many games and collect statistics."""
    results = {
        'wins': defaultdict(int),
        'total_turns': 0,
        'max_turns_reached': 0,
        'piece_positions': defaultdict(lambda: defaultdict(int)),
        'games': 0,
    }

    start_time = time.time()

    for i in range(num_games):
        game = simulate_game(config, strategy=strategy, seed=i)

        results['games'] += 1
        results['total_turns'] += game['turns']

        if game['winner']:
            results['wins'][game['winner']] += 1
        else:
            results['wins']['draw'] += 1

        if game['max_turns_reached']:
            results['max_turns_reached'] += 1

        for color, pos in game['piece_positions'].items():
            for zone, count in pos.items():
                results['piece_positions'][color][zone] += count

        if verbose and (i + 1) % 100 == 0:
            print(f"  {i + 1}/{num_games} games completed...")

    elapsed = time.time() - start_time

    # Compute summary stats
    avg_turns = results['total_turns'] / results['games']
    colors = config.colors[:4]

    summary = {
        'games': results['games'],
        'strategy': strategy,
        'avg_turns': round(avg_turns, 1),
        'max_turns_reached': results['max_turns_reached'],
        'win_distribution': {
            c: round(results['wins'][c] / results['games'] * 100, 1)
            for c in colors
        },
        'draw_rate': round(results['wins']['draw'] / results['games'] * 100, 1),
        'avg_pieces_home': {
            c: round(results['piece_positions'][c]['home'] / results['games'], 2)
            for c in colors
        },
        'elapsed_seconds': round(elapsed, 2),
    }

    return summary


def print_summary(summary, title="Tournament Results"):
    """Pretty-print tournament results."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")
    print(f"  Games: {summary['games']}")
    print(f"  Strategy: {summary['strategy']}")
    print(f"  Avg turns per game: {summary['avg_turns']}")
    print(f"  Games hitting max turns: {summary['max_turns_reached']}")
    print(f"  Draw rate: {summary['draw_rate']}%")
    print(f"  Time: {summary['elapsed_seconds']}s")
    print()
    print("  Win Distribution:")
    for color, pct in summary['win_distribution'].items():
        bar = '#' * int(pct / 2)
        print(f"    {color:>8}: {pct:5.1f}% {bar}")
    print()
    print("  Avg Pieces at Home:")
    for color, avg in summary['avg_pieces_home'].items():
        print(f"    {color:>8}: {avg:.2f}")
    print(f"{'='*60}\n")


def compare_strategies(config, num_games=1000):
    """Compare random vs heuristic strategies."""
    print(f"\nComparing strategies on {num_games} games...")

    results = {}
    for strategy in ['random', 'heuristic']:
        summary = run_tournament(config, num_games, strategy)
        results[strategy] = summary
        print_summary(summary, f"Strategy: {strategy}")

    # Head-to-head comparison
    print(f"\n{'='*60}")
    print("  Head-to-Head Comparison")
    print(f"{'='*60}")
    print(f"  {'Metric':<25} {'Random':>10} {'Heuristic':>10}")
    print(f"  {'-'*45}")
    print(f"  {'Avg turns':<25} {results['random']['avg_turns']:>10} {results['heuristic']['avg_turns']:>10}")
    print(f"  {'Draw rate':<25} {results['random']['draw_rate']:>9}% {results['heuristic']['draw_rate']:>9}%")
    for c in config.colors[:4]:
        r = results['random']['win_distribution'][c]
        h = results['heuristic']['win_distribution'][c]
        print(f"  {c + ' win %':<25} {r:>9}% {h:>9}%")
    print(f"{'='*60}\n")

    return results


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='SORRY! Game Simulator')
    parser.add_argument('--games', type=int, default=1000, help='Number of games to simulate')
    parser.add_argument('--strategy', choices=['random', 'heuristic'], default='random')
    parser.add_argument('--compare', action='store_true', help='Compare strategies')
    parser.add_argument('--verbose', action='store_true', help='Show progress')
    args = parser.parse_args()

    config = create_square_config()

    if args.compare:
        compare_strategies(config, args.games)
    else:
        summary = run_tournament(config, args.games, args.strategy, args.verbose)
        print_summary(summary)
