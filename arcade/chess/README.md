# Chess — Neon Edition

A browser-based single-player chess game vs AI, built with vanilla HTML/CSS/JS and a neon retro arcade aesthetic.

---

## Project Status

**Currently working:**
- Standard chess rules (all pieces, castling, en passant, promotion)
- Pixel art chess pieces (cyan player vs magenta AI)
- AI opponent with minimax and alpha-beta pruning
- Configurable AI difficulty (Easy/Medium/Hard)
- Configurable time controls (None/Blitz/Rapid/Classical)
- Algebraic notation (e4, Nf3, O-O, etc.)
- Move history panel (side, toggle-able)
- Settings modal (configure before first game)
- Promotion modal (always show, player chooses piece)
- Responsive design for mobile and tablet
- Added to arcade index.html game grid

**Not yet implemented:**
- Online multiplayer (future: use `shared/multiplayer/` framework)
- Color choosing mechanism
- Sound effects
- Game analysis (review moves after game ends)
- Opening book (common opening moves for AI)
- Chat window (future: near move history panel)

---

## File Structure

```
chess/
├── index.html          # Main entry point
├── favicon.svg         # Chess piece icon
├── README.md           # Project documentation
│
├── js/
│   ├── config.js       # Piece constants, colors, initial position, settings
│   ├── board.js        # Board representation, move generation, validation
│   ├── ai.js           # AI opponent (minimax with alpha-beta pruning)
│   ├── game.js         # Game state machine, turn flow, settings management
│   └── main.js         # DOM rendering, pixel art, notation, UI
│
└── css/
    ├── base.css        # CSS variables, reset, layout
    ├── board.css       # Board grid, pieces, highlights, move history
    ├── modals.css      # Instructions, settings, promotion, credits, game over
    └── responsive.css  # Mobile layout
```

---

## Running the Game

Open `index.html` directly in a browser. No build step, no server needed.

---

## How to Play

1. Click **START** or press Space to begin
2. Configure settings (difficulty, time control) in the settings modal
3. You are **CYAN** (white), AI is **MAGENTA** (black)
4. Click a piece to select it — legal moves will highlight
5. Click a highlighted square to move there
6. Special moves: Castling, en passant, pawn promotion
7. Checkmate the AI king to win!

---

## AI Difficulty

| Level | Depth | Description |
|-------|-------|-------------|
| Easy | 2 | Basic moves, occasional mistakes |
| Medium | 3 | Solid play, good tactics |
| Hard | 4 | Strong play, finds tactics |

---

## Time Controls

| Option | Description |
|--------|-------------|
| No Timer | Unlimited time |
| Blitz | 5 minutes per player |
| Rapid | 15 minutes per player |
| Classical | 30 minutes per player |

---

## Future Roadmap (for all three games)

- **Online multiplayer** — Use `shared/multiplayer/` framework
- **Color choosing** — Allow players to pick their color
- **Sound effects** — Piece moves, captures, check, game end
- **Game analysis** — Review moves after game ends
- **Chat window** — Near move history panel

---

## Credits

- **Design & Development:** Jake A. McCoy
- **Publisher:** magmacrunch media
- **Built With:** Vanilla HTML, CSS & JavaScript · Press Start 2P font · Neon retro aesthetic
