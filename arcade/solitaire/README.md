# Solitaire Deluxe — MagmaCrunch Arcade

A Klondike Solitaire (Draw-3) web game built with vanilla JavaScript. Part of the MagmaCrunch Arcade collection by MagmaCrunch Media.

---

## Project Overview

**Type:** Vanilla JavaScript web game (no frameworks, no build step)  
**Game:** Klondike Solitaire, Draw-3 variant  
**Version:** 2.0  
**Aesthetic:** Vaporwave / Miami Vice / Windows 3.1 shareware  

---

## Project Structure

```
solitaire/
├── index.html              # Main HTML — window chrome, start screen, game screen, modals
├── css/
│   ├── base.css            # CSS variables, desktop, window chrome, base button styles
│   ├── start-screen.css    # Start screen / splash layout
│   ├── game-layout.css     # Game board header, felt table, card spots
│   ├── modals.css          # All modal dialogs (rules, scores, initials, credits)
│   └── responsive.css      # Mobile/tablet breakpoints
└── js/
    ├── config.js           # SUITS, RANKS, SUIT_SYMBOLS, SUIT_COLORS, RANK_VALUES
    ├── game.js             # Solitaire class — all game logic and rendering
    └── main.js             # Entry point, instantiates Solitaire
```

**Shared card rendering pipeline** (used by solitaire, solitaire_THLD, scandinavian-stud):
```
arcade/shared/cards/
├── deck.js             # Card class, Deck class, getCardBackSVG()
├── face-cards.js       # Pixel-art SVG face cards (J/Q/K × 4 suits)
├── number-cards.js     # Number card (2–10) and Ace HTML generators
└── cards.css           # Card shell, corners, pips, face card wrappers
```

> **Script load order matters:** `config.js` → `../shared/cards/deck.js` → `../shared/cards/face-cards.js` → `../shared/cards/number-cards.js` → `game.js` → `main.js`

---

## Aesthetics

The visual design is a deliberate mashup of early-internet eras:

- **Desktop:** Dark teal (`#003838`) — the Windows 98/XP factory wallpaper color
- **Window chrome:** Windows 3.1 silver-grey with 3D-raised bevel borders and a purple→teal title bar gradient
- **Neon stripe:** Pink → gold → cyan gradient running below the menu bar
- **Typography:** Orbitron (display/UI) + VT323 (scores/terminal data) + Arial (card labels)
- **Card backs:** Deep purple with diagonal pink/cyan crosshatch grid and a centered MagmaCrunch volcano badge (gold-bordered dark panel, pixel-art volcano with lava eruption)
- **Card faces:** Pixel-art SVG face cards; smooth Unicode pips on number cards; pixel-art corner pip icons on both

### Color Variables (base.css)
| Variable | Value | Usage |
|---|---|---|
| `--pink` | `#ff2d78` | Primary neon accent, selections |
| `--cyan` | `#00e5ff` | Secondary accent, scores |
| `--gold` | `#ffd700` | Tertiary accent, volcano badge |
| `--purple` | `#7b2fff` | Title bar, modal headings |
| `--desktop` | `#003838` | Body background |
| `--chrome-bg` | `#c0c0c0` | Window/button silver |

---

## Game Rules

Standard Klondike Solitaire, Draw-3 variant.

**Tableau:** Build down in alternating colors (K→Q→J...→2→A). Only Kings on empty columns. Full face-up sequences move as a unit.

**Foundation:** Build up by suit (A→2→...→K). Win when all four foundations are complete.

**Stock/Waste:** Click stock to draw 3 cards. When stock is empty, click to recycle waste (−100 points).

---

## Scoring System

| Action | Points |
|---|---|
| Card to foundation | +10 |
| Waste → tableau | +5 |
| Reveal tableau card | +5 |
| Foundation → tableau | −15 |
| Recycle deck | −100 |
| Win time bonus | up to +10,000 |

**Win bonus formula:** `(700,000 ÷ seconds elapsed) × 35`  
classic Microsoft Windows

> **Note on the original formula:** The original bonus was `700000 − (elapsedSeconds × 2)`, which decayed so slowly that nearly all leaderboard scores were the time bonus (~699,000+) regardless of gameplay. The revised formula makes the gameplay score meaningful.

Score cannot go below 0.

---

## Architecture

### Card Rendering Pipeline (shared across card games)

```
arcade/shared/cards/
├── config.js          SUITS, RANKS, SUIT_COLORS, RANK_VALUES (per-game, not shared)
├── face-cards.js      FC_CORNERS() + FACE_CARD_SVG lookup (12 pixel-art SVGs)
├── number-cards.js    cornerHTML() + getSuitLayout() + Unicode pips
├── deck.js            Card.getHTML() → dispatches to face-cards / number-cards / getCardBackSVG()
└── cards.css          Card shell, corners, pips, face card wrappers
```

### Corner Label Config (face-cards.js)

Adjust these constants at the top of `../shared/cards/face-cards.js` to tune face card corner labels:

```javascript
const FC_RANK_SIZE  = 10;    // rank letter font size (SVG units)
const FC_PIP_SIZE   = 9;     // suit glyph font size (SVG units)
const FC_RANK_Y     = 11;    // rank baseline position
const FC_GLYPH_Y    = 21;    // suit glyph baseline (increase = move down)
```

### Volcano Badge (deck.js)

The card back badge is centered at (32, 44) in the 64×88 SVG viewBox. The dark panel is `x=15, y=29, width=34, height=30`. To shift the volcano vertically, add/subtract from all `y` and `y1`/`y2` values in the badge section of `../shared/cards/deck.js`.

### Solitaire Class (game.js)

Key state:
```javascript
this.tableau    // Card[][] — 7 columns
this.foundation // Card[][] — 4 piles (one per suit)
this.stock      // Card[]
this.waste      // Card[]
this.selectedCard  // Card | null
this.selectedPile  // { type, index, cardIndex } | null
this.score, this.moves, this.elapsedSeconds
```

Key methods:
- `init()` — reset and deal
- `drawFromStock()` — draw 3 or recycle
- `handleCardClick()` — two-click selection
- `tryMove()` — validate and execute move
- `checkWin()` — all 4 foundations have 13 cards
- `_doRender()` — rebuild DOM from state (clone-and-replace avoids listener accumulation)

### Rendering Note

Foundation and tableau column elements are **cloned and replaced** on every render rather than having `addEventListener` called repeatedly on the same node. This prevents the listener-accumulation bug where a single click would fire dozens of handlers.

---

## Menu Bar

The window menu bar is wired in `game.js → setupEventListeners()`:

| Item | Action |
|---|---|
| Game | New game (or launch from start screen) |
| Options | Opens High Scores modal |
| Help | Opens How to Play modal |
| Credits | Opens Credits modal |

---

## Data Persistence

High scores are saved via **ScoreClient** (MAGMA//OPS WebSocket backend with localStorage fallback):

Scores are stored as an array of up to 10 objects:
```javascript
{ initials: 'ABC', score: 1234, time: '5:42' }
```

localStorage is used as offline fallback when the Pi is unreachable.

---

## External Dependencies

- **Google Fonts:** Orbitron (400, 700, 900) + VT323 — loaded via `<link>` in `index.html`
- **ScoreClient:** WebSocket-based score persistence via MAGMA//OPS backend (Pi)
- No JavaScript libraries or build tools

---

## Known Issues / Future Ideas

- Responsive layout needs review for the updated class names and color variables
- No undo functionality (would require move history stack)
- No win animation (cards flying to foundations)
- No sound effects
- Draw-1 mode not implemented
- Hint system not implemented

---

**Version:** 2.0  
**Last Updated:** March 2026  
**© 2026 MagmaCrunch Media**
