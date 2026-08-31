# Puzzle Framework — Stylesheets

This directory now holds **only the shared stylesheets** for sliding-tile puzzle
games. The JavaScript that used to live in `puzzle-framework/js/` has moved to the
[adenosine](https://github.com/magmacrunch-media/adenosine) engine and is loaded as
`arcade/shared/adenosine-puzzle.js`, which exposes the global `AdPuzzle`.

---

## Files

| File | Purpose |
|------|---------|
| `css/puzzle-base.css` | Global reset, body, CRT scanlines, loading screen |
| `css/puzzle-grid.css` | Grid layout, tile styling, animations |
| `css/puzzle-modals.css` | Modal system, dropdowns, buttons |
| `css/puzzle-responsive.css` | Responsive breakpoints |

The same four stylesheets are also published as
`@magmacrunch/adenosine-puzzle/puzzle-*.css`. The arcade links the local copies.

---

## Usage

```html
<link rel="stylesheet" href="../puzzle-framework/css/puzzle-base.css">
<link rel="stylesheet" href="../puzzle-framework/css/puzzle-grid.css">
<link rel="stylesheet" href="../puzzle-framework/css/puzzle-modals.css">
<link rel="stylesheet" href="../puzzle-framework/css/puzzle-responsive.css">

<script src="../shared/adenosine-puzzle.js"></script>
```

`AdPuzzle` provides `PuzzleGrid` (grid operations) plus the factories
`createGame`, `createInput`, `createRenderer`, `createScoring`, and `createUI`:

```javascript
var game = AdPuzzle.createGame({ size: 4, difficulty: 'normal', gameName: 'my-puzzle' });

// createGame returns no-op stubs for these — assign them or the game does nothing
game.addRandomTile = function () {
    var empty = AdPuzzle.PuzzleGrid.getEmptyCells(game.grid);
    if (!empty.length) return;
    var cell = empty[Math.floor(Math.random() * empty.length)];
    game.grid.board[cell.row][cell.col] = Math.random() < 0.9 ? 2 : 4;
};
game.moveLeft  = function () { /* merge logic for one direction */ };
game.checkWin  = function () { return false; };
game.render    = function () { renderer.renderGrid(game.grid); };

var input = AdPuzzle.createInput({
    onMove: function (dir) { game.handleMove(dir); },
    isActive: function () { return game.isActive(); }
}, document.getElementById('gameBoard'));

game.init();
```

Only `moveLeft` needs implementing: `moveInDirection` rotates the grid, calls
`moveLeft`, and rotates back to derive up/right/down.

For the full API see
[`packages/puzzle`](https://github.com/magmacrunch-media/adenosine/tree/main/packages/puzzle).

---

## Games Using This Framework

| Game | Grid | Merge Logic | Win Condition |
|------|------|-------------|---------------|
| **2^N** | 4x4 | Same value (2+2=4) | Reach target value |
| **George Boole** | 4x4 | Logic gates (XOR, OR, AND) | Survival |
| **15 Puzzle** | NxN | No merge (just slide) | Sequential order |
| **Klotski** | 4x5 | No merge (block sliding) | Free the big block |
| **Threes** | 4x4 | 1+2=3, same+same=double | Survival |

---

## Notes

- `AdPuzzle.createScoring(name)` persists to localStorage under `<name>_scores`,
  which is **separate** from the `mc_scores_<game>` key owned by `AdScore`. Games
  that use both keep two independent score stores.
- Rectangular grids are only partly supported upstream: `PuzzleGrid.rotate`
  no-ops for non-square boards, and the renderer iterates `grid.size` in both
  axes. Klotski works around this with its own rendering.

---

## Credits

- **Framework Design:** Jake A. McCoy
- **Publisher:** magmacrunch media
- **Built With:** Vanilla JavaScript, CSS
