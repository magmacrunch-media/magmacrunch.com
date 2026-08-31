# Checkers — Neon Edition

A browser-based single-player checkers game vs AI, built with vanilla HTML/CSS/JS and a neon retro arcade aesthetic.

---

## Project Status

**Currently working:**
- Standard 8x8 checkers board with dark/light squares
- Neon retro visual theme (cyan player vs magenta AI)
- Standard checkers rules (mandatory jumps, king promotion)
- Click-to-select piece movement with legal move highlighting
- AI opponent with priority-based strategy (jumps, center control, king promotion)
- Piece count display
- Start screen, game screen, and modals (instructions, credits, game over)
- Responsive design for mobile and tablet
- Added to arcade index.html game grid

**Not yet implemented:**
- Color choosing mechanism
- Advanced AI strategy (minimax, alpha-beta pruning)
- Sound effects
- Move history display
- Rule options modal (mandatory jumps toggle, flying kings, board size)

---

## File Structure

```
checkers/
├── index.html          # Main entry point
├── favicon.svg         # Checker piece icon
├── README.md           # Project documentation
│
├── js/
│   ├── config.js       # Game constants, colors, board layout
│   ├── board.js        # Board representation, move validation
│   ├── ai.js           # AI opponent strategy
│   ├── game.js         # Game state machine, turn flow
│   └── main.js         # DOM rendering, click handlers
│
└── css/
    ├── base.css        # CSS variables, reset, layout
    ├── board.css       # Board grid, pieces, kings
    ├── modals.css      # Instructions, credits, game over
    └── responsive.css  # Mobile layout
```

---

## Running the Game

Open `index.html` directly in a browser. No build step, no server needed.

---

## How to Play

1. Click **START** or press Space to begin
2. You are **CYAN**, AI is **MAGENTA**
3. Click a piece to select it — legal moves will highlight
4. Click a highlighted square to move there
5. **Jumps are mandatory** — you must jump if possible
6. **Multiple jumps** are allowed (and required!)
7. Reach the opposite end to become a **King** (♛)
8. Kings can move forward and backward
9. Capture all AI pieces or block all AI moves to win!

---

## Git Status

**Do not commit or push until the GitHub account is switched to `magmacrunchmedia`.**

The remote `origin` is currently set to `https://github.com/magmacrunch-media/magmacrunch.com.git`, but the repository may not exist yet or authentication may not be configured.

To check:
```bash
gh auth status
git remote -v
```

---

## Credits

- **Design & Development:** Jake A. McCoy
- **Publisher:** magmacrunch media
- **Built With:** Vanilla HTML, CSS & JavaScript · Press Start 2P font · Neon retro aesthetic
