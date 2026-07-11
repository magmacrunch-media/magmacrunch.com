# Puzzle Game Framework

A reusable framework for sliding tile puzzle games in the magmacrunch arcade.

---

## Overview

This framework provides common functionality for sliding tile puzzle games like 2048, George Boole, and 15 Puzzle. It extracts shared patterns into reusable modules:

- **Grid engine** — NxN grid with rotation-based movement
- **Input handling** — Keyboard (arrow keys) and touch (swipe) support
- **Game state machine** — Lifecycle management, win/loss detection
- **Score system** — localStorage persistence, high scores, ranking
- **UI patterns** — Modals, dropdowns, common styling
- **Rendering** — Grid and tile rendering

---

## Files

### JavaScript

| File | Purpose |
|------|---------|
| `puzzle-grid.js` | Core grid engine: create, clone, rotate, move detection |
| `puzzle-input.js` | Keyboard and touch input handling |
| `puzzle-game.js` | Game state machine, lifecycle, win/loss checks |
| `puzzle-scoring.js` | Score tracking with localStorage persistence |
| `puzzle-ui.js` | Modal management, dropdowns, utility functions |
| `puzzle-render.js` | Grid and tile rendering |

### CSS

| File | Purpose |
|------|---------|
| `puzzle-base.css` | Global reset, body, CRT scanlines, loading screen |
| `puzzle-grid.css` | Grid layout, tile styling, animations |
| `puzzle-modals.css` | Modal system, dropdowns, buttons |
| `puzzle-responsive.css` | Responsive breakpoints |

---

## Usage

### 1. Include Framework Files

```html
<!-- CSS -->
<link rel="stylesheet" href="../puzzle-framework/css/puzzle-base.css">
<link rel="stylesheet" href="../puzzle-framework/css/puzzle-grid.css">
<link rel="stylesheet" href="../puzzle-framework/css/puzzle-modals.css">
<link rel="stylesheet" href="../puzzle-framework/css/puzzle-responsive.css">

<!-- JavaScript -->
<script src="../puzzle-framework/js/puzzle-grid.js"></script>
<script src="../puzzle-framework/js/puzzle-input.js"></script>
<script src="../puzzle-framework/js/puzzle-game.js"></script>
<script src="../puzzle-framework/js/puzzle-scoring.js"></script>
<script src="../puzzle-framework/js/puzzle-ui.js"></script>
<script src="../puzzle-framework/js/puzzle-render.js"></script>
```

### 2. Create a Game

```javascript
// Create game instance
var game = PuzzleGame.create({
    size: 4,
    difficulty: 'normal',
    gameName: 'my-puzzle'
});

// Override required methods
game.addRandomTile = function() {
    var empty = PuzzleGrid.getEmptyCells(game.grid);
    if (empty.length > 0) {
        var cell = empty[Math.floor(Math.random() * empty.length)];
        game.grid.board[cell.row][cell.col] = Math.random() < 0.9 ? 2 : 4;
    }
};

game.moveLeft = function() {
    // Your merge logic here
};

game.checkWin = function() {
    // Your win condition here
    return false;
};

game.render = function() {
    renderer.renderGrid(game.grid);
};

// Set up input
var input = PuzzleInput.create({
    onMove: function(dir) { game.handleMove(dir); },
    isActive: function() { return game.isActive(); }
}, document.getElementById('gameBoard'));

// Start game
game.init();
```

### 3. Use Scoring

```javascript
var scoring = PuzzleScoring.create('my-puzzle');

// Add a score
var rank = scoring.addScore(12345, 'normal', { moves: 100, time: 60 });

// Get top scores
var topScores = scoring.getTopScores('normal', 10);

// Check if new high score
var isNew = scoring.isNewHighScore(12345, 'normal');
```

### 4. Use UI Patterns

```javascript
var ui = PuzzleUI.create();

// Register modals
ui.registerModal('gameOver', document.getElementById('gameOverModal'));

// Show/hide modals
ui.showModal('gameOver');
ui.hideModal('gameOver');

// Set up dropdown
ui.setupDropdown(
    document.getElementById('difficultyDropdown'),
    document.getElementById('difficultySelected'),
    document.querySelectorAll('.dropdown-option'),
    function(value) { console.log('Selected:', value); }
);
```

---

## Extending the Framework

### Creating a New Game

1. **Extend PuzzleGame** — Override required methods
2. **Implement game-specific logic** — Merge rules, win conditions, spawning
3. **Use framework CSS** — Import via `@import` in your CSS
4. **Add game-specific styles** — Custom tile colors, themes

### Required Overrides

| Method | Purpose |
|--------|---------|
| `addRandomTile()` | How tiles spawn (e.g., 2/4 for 2048) |
| `moveLeft()` | Merge/move logic for one direction |
| `checkWin()` | Win condition check |
| `render()` | Game-specific rendering |

### Optional Overrides

| Method | Purpose |
|--------|---------|
| `addInitialTiles()` | Initial board setup |
| `checkGameState()` | Custom game-over logic |
| `onWin()` | Win handling |
| `onGameOver()` | Game-over handling |

---

## Games Using This Framework

| Game | Grid | Merge Logic | Win Condition |
|------|------|-------------|---------------|
| **2048** | 4x4 | Same value (2+2=4) | Reach target value |
| **George Boole** | 4x4 | Logic gates (XOR, OR, AND) | Survival |
| **15 Puzzle** | 4x4 | No merge (just slide) | Sequential order |
| **Threes** | 4x4 | 1+2=3, same+same=double | Survival |

---

## Future Improvements

- **Variable grid sizes** — Support 3x3, 5x5, etc.
- **Animation system** — Slide, merge, appear animations
- **Sound effects** — Move, merge, win, game-over sounds
- **JSONBin integration** — Cloud high scores
- **Undo system** — Undo last move
- **AI opponent** — For single-player puzzle games

---

## Credits

- **Framework Design:** Jake A. McCoy
- **Publisher:** magmacrunch media
- **Built With:** Vanilla JavaScript, CSS
