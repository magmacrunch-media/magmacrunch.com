// puzzle-15: Playable 15-puzzle with arrow key input
var SIZE = 4;
var board = [];
var emptyRow, emptyCol;
var moves = 0;

function init() {
  // Create solved board then shuffle
  var n = 1;
  board = [];
  for (var r = 0; r < SIZE; r++) {
    var row = [];
    for (var c = 0; c < SIZE; c++) {
      row.push(n <= SIZE * SIZE - 1 ? n++ : 0);
    }
    board.push(row);
  }
  emptyRow = SIZE - 1;
  emptyCol = SIZE - 1;
  moves = 0;
  // Shuffle by making random valid moves
  for (var i = 0; i < 200; i++) {
    var dirs = [];
    if (emptyRow > 0) dirs.push([-1, 0]);
    if (emptyRow < SIZE - 1) dirs.push([1, 0]);
    if (emptyCol > 0) dirs.push([0, -1]);
    if (emptyCol < SIZE - 1) dirs.push([0, 1]);
    var d = dirs[Math.floor(Math.random() * dirs.length)];
    var nr = emptyRow + d[0], nc = emptyCol + d[1];
    board[emptyRow][emptyCol] = board[nr][nc];
    board[nr][nc] = 0;
    emptyRow = nr; emptyCol = nc;
  }
  moves = 0;
}

function isWon() {
  var n = 1;
  for (var r = 0; r < SIZE; r++)
    for (var c = 0; c < SIZE; c++) {
      if (r === SIZE - 1 && c === SIZE - 1) return board[r][c] === 0;
      if (board[r][c] !== n++) return false;
    }
  return true;
}

function render() {
  var el = document.getElementById('output-content');
  el.innerHTML = '';
  var grid = document.createElement('div');
  grid.style.cssText = 'display:inline-grid;grid-template-columns:repeat(4,64px);gap:4px;padding:1rem;';
  for (var r = 0; r < SIZE; r++) {
    for (var c = 0; c < SIZE; c++) {
      var tile = document.createElement('div');
      var v = board[r][c];
      tile.style.cssText = 'width:64px;height:64px;display:flex;align-items:center;justify-content:center;'
        + 'font-size:20px;font-weight:bold;border-radius:8px;cursor:default;'
        + (v === 0
          ? 'background:#14141b;'
          : 'background:#3b82f6;color:#fff;');
      tile.textContent = v || '';
      grid.appendChild(tile);
    }
  }
  el.appendChild(grid);
  var info = document.createElement('p');
  info.style.cssText = 'padding:1rem;color:#9d99b5;font-size:13px;';
  info.textContent = 'Moves: ' + moves + (isWon() ? ' — You win!' : ' — Arrow keys to play');
  el.appendChild(info);
}

window.addEventListener('keydown', function (e) {
  if (isWon()) return;
  var dr = 0, dc = 0;
  if (e.key === 'ArrowUp')    dr =  1;
  if (e.key === 'ArrowDown')  dr = -1;
  if (e.key === 'ArrowLeft')  dc =  1;
  if (e.key === 'ArrowRight') dc = -1;
  if (!dr && !dc) return;
  var nr = emptyRow + dr, nc = emptyCol + dc;
  if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) return;
  board[emptyRow][emptyCol] = board[nr][nc];
  board[nr][nc] = 0;
  emptyRow = nr; emptyCol = nc;
  moves++;
  render();
  e.preventDefault();
});

init();
render();
console.log('15-puzzle loaded — use arrow keys to slide tiles');
