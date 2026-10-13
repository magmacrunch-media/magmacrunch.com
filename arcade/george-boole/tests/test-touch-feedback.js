// Run: node web/tests/test-touch-feedback.js
const assert = require('node:assert/strict');
const h = require('./dom-harness.cjs')(__dirname + '/..');
const game = h.board();
game.board = [[1,2,0,0],[3,0,0,0],[0,0,0,0],[0,0,0,0]];
game.render();
game.tiles.forEach((tile, i) => { tile.offsetLeft = i % 4 * 80; tile.offsetTop = Math.floor(i/4)*80; });
const input = h.inputs[0];
function start(index, count = 1) {
    game.gameBoardElement.dispatchEvent({ type: 'touchstart', touches: Array(count).fill({}), target: game.tiles[index] });
}
function drag(dx = 40, dy = 0, direction = 'right') { input.onDrag({ dx, dy, direction }); }
start(1); drag();
assert.match(game.tiles[1].style.transform, /translate3d\([\d.]+px, 0, 0\)/);
assert.equal(game.tiles.filter(t => t.style.transform).length, 1, 'only touched tile follows');
assert.equal(game.moves, 0); assert.equal(game.score, 0);
input.onDragEnd();
assert.equal(game.tiles[1].style.transform, '');
h.advance(140); assert.equal(game.tiles[1].style.transition, '');
start(2); drag(); assert.equal(game.tiles.filter(t => t.style.transform).length, 0, 'empty cell does not select neighbors');
start(4); drag(0, -60, 'up'); assert.match(game.tiles[4].style.transform, /0, -[\d.]+px, 0/);
game.gameBoardElement.dispatchEvent({ type: 'touchcancel' });
assert.equal(game.tiles[4].style.transform, '');
start(1); drag(); start(4); drag(0, 60, 'down'); h.advance(200);
assert.equal(game.tiles[1].style.transition, '', 'rapid next gesture restores old tile');
assert.equal(game.tiles[4].style.transition, 'none', 'old timer cannot interrupt active gesture');
start(4, 2); drag(); assert.equal(game.tiles.filter(t => t.style.transform).length, 0, 'multi-touch clears feedback');
h.window.reduceMotion = true; start(0); drag(); assert.equal(game.tiles.filter(t => t.style.transform).length, 0);
h.window.reduceMotion = false;
h.document.body.classList.add('performance-mode'); start(0); drag(); assert.equal(game.tiles.filter(t => t.style.transform).length, 0);
h.document.body.classList.remove('performance-mode');
game.board = [[1,2,0,0],[3,0,0,0],[0,0,0,0],[0,0,0,0]];
let spawns = 0; game.addRandomTile = () => { spawns++; };
input.onMove('right');
assert.equal(JSON.stringify(game.board[0]), JSON.stringify([0,0,1,2]));
assert.equal(JSON.stringify(game.board[1]), JSON.stringify([0,0,0,3]), 'release still moves the whole board');
assert.equal(game.moves, 1); assert.equal(spawns, 1);
start(2); drag(); game.destroy(); h.advance(200);
assert.equal(game.tiles[2].style.transform, ''); assert.equal(game.tiles[2].style.transition, '');
assert.equal(game.gameBoardElement.listeners.touchstart.length, 0, 'destroy removes touch listener');
console.log('Touch feedback: passed (selection, axis, cancellation, quick gestures, reduced motion, cleanup)');
