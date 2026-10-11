Conventions and shared code used across arcade games.

---

## font-load.js

Prevents FOIT (flash of invisible text) for Press Start 2P font.

### Usage

Add to `<head>`:

```html
<style>.font-loading body{visibility:hidden}</style>
<script src="../shared/font-load.js"></script>
```

### How It Works
1. Adds `font-loading` class to `<html>` immediately
2. Hides body via CSS while class is present
3. Removes class when `document.fonts.ready` resolves

---

## arcade-base.css

Shared styles for all arcade games.

### Include

```html
<link rel="stylesheet" href="../shared/arcade-base.css">
```

### Features

#### Back Link (`.mc-back`)

Fixed-position back arrow to the arcade index:

```html
<a href="../" class="mc-back">BACK</a>
```

Override color per game:

```css
:root {
    --mc-back-color: #ff3d6e;
    --mc-back-glow: 0 0 8px #ff3d6e;
}
```

#### Scanlines Overlay

Add CRT scanline effect:

```html
<body>
    <div class="scanlines"></div>
    <!-- game content -->
</body>
```

Override opacity:

```css
:root {
    --mc-scanline-opacity: 0.2;
}
```

---

## config.js / main.js Convention

Many games separate concerns into two files:

- **`config.js`** — tuning constants, colors, sizes, speeds
- **`main.js`** — game logic, entry point

### config.js

```js
const CONFIG = {
    GRID_SIZE: 8,
    CELL_SIZE: 64,
    COLORS: {
        bg: '#080808',
        piece: '#00f5ff',
        highlight: '#ffe03a'
    },
    SPEED: 0.5
};
```

### main.js

```js
// Game logic using CONFIG
function init() {
    const canvas = document.getElementById('game');
    // ...
}
init();
```

---

## BoardGameTemplate

Reusable HTML template for board games.

### Usage

```html
<script src="../shared/board-game-template.js"></script>
<script>
BoardGameTemplate.render({
    title: 'CHESS',
    subtitle: '// NEON EDITION //',
    footer: ['CLASSIC BOARD GAME', 'VS AI'],
    mpServer: 'ws://magmacrunch.duckdns.org:8769'
});
</script>
```

### Config Options

| Key | Type | Description |
|-----|------|-------------|
| `title` | string | Game title |
| `subtitle` | string | Subtitle text |
| `footer` | array | Footer lines |
| `buttons` | array | Start screen buttons |
| `extraStart` | HTML | Extra content after buttons |
| `gameHeader` | HTML | Extra stat items |
| `gameBody` | HTML | Content inside game layout |
| `gameControls` | array | Control buttons |
| `instructions` | HTML | Instructions modal content |
| `credits` | HTML | Credits modal content |
| `gameOverTitle` | string | Game over modal title |
| `gameOverMsg` | string | Game over modal message |
| `mpServer` | string | WebSocket server URL |
| `scripts` | array | Script paths to load |
| `extraHead` | HTML | Extra head content |

---

## card_constants.py

Shared Python constants for multiplayer game servers.

### Import

```python
from card_constants import SUITS, RANKS, SUIT_SYMBOLS, SUIT_COLORS, RANK_VALUES
```

### Constants

- `SUITS` — `['hearts', 'diamonds', 'clubs', 'spades']`
- `RANKS` — `['2', '3', ..., '10', 'jack', 'queen', 'king', 'ace']`
- `SUIT_SYMBOLS` — Unicode suit characters
- `SUIT_COLORS` — Red/black mapping
- `RANK_VALUES` — Numeric values for comparison

---

## Shared Card Pipeline

Used by card games: solitaire, solitaire_THLD, scandinavian-stud, cribbage.

```html
<link rel="stylesheet" href="../shared/cards/cards.css">
<script src="../shared/adenosine-cards.js"></script>
```

### API

```js
// Create and shuffle a deck
const deck = MagmaCards.createDeck();
MagmaCards.shuffle(deck);

// Deal cards
const hand = MagmaCards.deal(deck, 5);

// Render a card
MagmaCards.renderCard(card, container);
```

---

## window.__pageCleanup

Pages with animations/timers should define a cleanup function:

```js
window.__pageCleanup = function () {
    cancelAnimationFrame(rafId);
    clearInterval(timerId);
};
```

The SPA router calls this before navigating away. 
