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

**Card rendering** comes from the adenosine engine — `arcade/shared/adenosine-cards.js`,
which exposes the global `AdCards` (`Card`, `Deck`, `getCardBackSVG()`, face-card and
number-card SVG generators, plus `SUITS`/`RANKS`/`SUIT_SYMBOLS`/`SUIT_COLORS`/`RANK_VALUES`).
Only the stylesheet is still local: `arcade/shared/cards/cards.css`.

> **Script load order matters:** `../shared/adenosine-cards.js` → `js/config.js` →
> `js/game.js` → `js/main.js`. The engine bundle must load *before* `config.js`,
> which reads its constants from `AdCards`.

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

### Card Rendering Pipeline

Card rendering lives in the adenosine engine, loaded as
`../shared/adenosine-cards.js` (global `AdCards`):

| `AdCards` export | Role |
|---|---|
| `SUITS`, `RANKS`, `SUIT_SYMBOLS`, `SUIT_COLORS`, `RANK_VALUES` | Deck constants |
| `FACE_CARD_SVG`, `FC_PIP_ART`, `FC_CORNERS` | 12 pixel-art face card SVGs |
| `getNumberCardHTML` | Number card (2–10) and Ace HTML |
| `Card`, `Deck`, `getCardBackSVG` | Card/deck logic and the card back |

`arcade/shared/cards/cards.css` (card shell, corners, pips) is the only piece still
in this repo.

### Tuning card artwork

The rendering constants — face card corner labels (`FC_RANK_SIZE`, `FC_PIP_SIZE`,
`FC_RANK_Y`, `FC_GLYPH_Y`) and the volcano badge geometry on the card back — now
live in the engine, not here:

- `~/Documents/game_dev/adenosine/packages/cards/src/face-cards.ts`
- `~/Documents/game_dev/adenosine/packages/cards/src/deck.ts`

Edit there, `npm run build` in that repo, publish, then `npm run build:adenosine`
in this one. **Do not hand-edit `arcade/shared/adenosine-cards.js`** — it is
generated and will be overwritten.

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
