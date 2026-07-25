# Backgammon — Neon Edition

A browser-based single-player backgammon game vs AI, built with vanilla HTML/CSS/JS and a neon retro arcade aesthetic.

---

## Project Status

**Currently working:**
- Standard backgammon board with 24 points, bar, and bear-off areas
- Neon retro visual theme (cyan player vs magenta AI)
- CSS triangle rendering for points
- Click-to-select checker movement
- Legal move validation (normal moves, hitting blots, bar re-entry, bearing off)
- Doubling cube for stakes
- AI opponent with basic strategy (prioritizes hitting, making points, bearing off)
- Dice rolling with animation
- Start screen, game screen, and modals (instructions, credits, game over)
- Responsive design for mobile and tablet
- Added to arcade index.html game grid

**Not yet implemented:**
- Advanced AI strategy
- Sound effects
- Move history display

---

## Known Bugs

### Board layout — fixed

The CSS grid originally had 25 columns (`repeat(12, 1fr) + bar + repeat(12, 1fr)`) but points were only placed in columns 1-6 and 14-19, leaving columns 7-12 and 20-25 empty. Fixed by changing to a 13-column grid (`repeat(6, 1fr) + bar + repeat(6, 1fr)`) and updating the column mapping.

---

## File Structure

```
backgammon/
├── index.html          # Main entry point
├── favicon.svg         # Dice icon
│
├── js/
│   ├── config.js       # Game constants, colors, board layout
│   ├── board.js        # Board representation, move validation
│   ├── dice.js         # Dice rolling, doubling cube logic
│   ├── ai.js           # AI opponent strategy
│   ├── game.js         # Game state machine, turn flow
│   └── main.js         # DOM rendering, click handlers, UI
│
└── css/
    ├── base.css        # CSS variables, reset, layout
    ├── board.css       # Board grid, points, checkers
    ├── dice.css        # Dice animation, doubling cube
    ├── modals.css      # Instructions, credits, game over
    └── responsive.css  # Mobile layout
```

---

## Running the Game

Open `index.html` directly in a browser. No build step, no server needed.

---

## Git Status

**Do not commit or push until the GitHub account is switched to `magmacrunchmedia`.**

The remote `origin` is currently set to `https://github.com/magmacrunchmedia/magmacrunch.com.git`, but the repository may not exist yet or authentication may not be configured.

To check:
```bash
gh auth status
git remote -v
```

---

## How to Play

1. Click **START** or press Space to begin
2. The game rolls dice to determine who goes first
3. Click a checker to select it — legal destinations will highlight
4. Click a highlighted point to move there
5. If you hit an opponent's blot, it goes to the bar
6. Get all your checkers to your home board (points 1-6) to bear off
7. First to bear off all 15 checkers wins!

### Doubling Cube

Before your turn, click the doubling cube to offer doubling the stakes. If the AI accepts, the cube value doubles. If it rejects, you win the game.

---

## Credits

- **Design & Development:** Jake A. McCoy
- **Publisher:** magmacrunch media
- **Built With:** Vanilla HTML, CSS & JavaScript · Press Start 2P font · Neon retro aesthetic
