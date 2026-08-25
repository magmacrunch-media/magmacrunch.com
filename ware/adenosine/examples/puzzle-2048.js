// puzzle-2048: 2048-style merge game
var SIZE = 4;
var board, score, won;

function init() {
  board = [];
  for (var r = 0; r < SIZE; r++) {
    board.push([0, 0, 0, 0]);
  }
  score = 0;
  won = false;
  addTile();
  addTile();
}

function addTile() {
  var empty = [];
  for (var r = 0; r < SIZE; r++)
    for (var c = 0; c < SIZE; c++)
      if (board[r][c] === 0) empty.push([r, c]);
  if (!empty.length) return;
  var cell = empty[Math.floor(Math.random() * empty.length)];
  board[cell[0]][cell[1]] = Math.random() < 0.9 ? 2 : 4;
}

function slide(row) {
  var arr = row.filter(function (v) { return v !== 0; });
  for (var i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      score += arr[i];
      if (arr[i] === 2048) won = true;
      arr.splice(i + 1, 1);
    }
  }
  while (arr.length < SIZE) arr.push(0);
  return arr;
}

function moveLeft()  { var changed = false; for (var r = 0; r < SIZE; r++) { var orig = board[r].join(); board[r] = slide(board[r]); if (board[r].join() !== orig) changed = true; } return changed; }
function moveRight() { var changed = false; for (var r = 0; r < SIZE; r++) { var orig = board[r].join(); board[r] = slide(board[r].slice().reverse()).reverse(); if (board[r].join() !== orig) changed = true; } return changed; }
function moveUp()    { return moveDir(0, 1); }
function moveDown()  { return moveDir(0, -1); }

function moveDir(dr, dc) {
  var changed = false;
  for (var c = 0; c < SIZE; c++) {
    var col = [];
    for (var r = 0; r < SIZE; r++) col.push(board[r][c]);
    var orig = col.join();
    col = dc === 1 ? slide(col) : slide(col.slice().reverse()).reverse();
    for (var r = 0; r < SIZE; r++) board[r][c] = col[r];
    if (col.join() !== orig) changed = true;
  }
  return changed;
}

var COLORS = {
  0:    '#14141b',
  2:    '#776e65', 4: '#776e65',
  8:    '#f9f6f2', 16: '#f9f6f2',
  32:   '#f9f6f2', 64: '#f9f6f2',
  128:  '#f9f6f2', 256: '#f9f6f2',
  512:  '#f9f6f2', 1024: '#f9f6f2', 2048: '#f9f6f2',
};
var BG = {
  0: '#3a3a4a', 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179',
  16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72',
  256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e',
};

function render() {
  var el = document.getElementById('output-content');
  el.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.style.cssText = 'display:inline-block;padding:1rem;';
  // Score
  var scoreEl = document.createElement('div');
  scoreEl.style.cssText = 'color:#e8e6f0;font-size:14px;margin-bottom:.5rem;';
  scoreEl.textContent = 'Score: ' + score + (won ? ' — 2048!' : '');
  wrap.appendChild(scoreEl);
  // Grid
  var grid = document.createElement('div');
  grid.style.cssText = 'display:inline-grid;grid-template-columns:repeat(4,72px);gap:6px;';
  for (var r = 0; r < SIZE; r++) {
    for (var c = 0; c < SIZE; c++) {
      var v = board[r][c];
      var tile = document.createElement('div');
      tile.style.cssText = 'width:72px;height:72px;display:flex;align-items:center;justify-content:center;'
        + 'font-size:' + (v >= 1024 ? 16 : v >= 128 ? 20 : 24) + 'px;font-weight:bold;border-radius:8px;'
        + 'background:' + (BG[v] || BG[2048]) + ';color:' + (COLORS[v] || '#f9f6f2') + ';';
      tile.textContent = v || '';
      grid.appendChild(tile);
    }
  }
  wrap.appendChild(grid);
  var hint = document.createElement('p');
  hint.style.cssText = 'color:#9d99b5;font-size:13px;margin-top:.5rem;';
  hint.textContent = 'Arrow keys to merge tiles';
  wrap.appendChild(hint);
  el.appendChild(wrap);
}

window.addEventListener('keydown', function (e) {
  if (won) return;
  var changed = false;
  if (e.key === 'ArrowLeft')  changed = moveLeft();
  if (e.key === 'ArrowRight') changed = moveRight();
  if (e.key === 'ArrowUp')    changed = moveUp();
  if (e.key === 'ArrowDown')  changed = moveDown();
  if (changed) {
    addTile();
    render();
  }
  e.preventDefault();
});

init();
render();
console.log('2048 loaded — arrow keys to merge tiles');
