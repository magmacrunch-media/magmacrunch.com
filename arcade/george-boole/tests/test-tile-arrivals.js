// Run: node web/tests/test-tile-arrivals.js
const assert = require('node:assert/strict');
const h = require('./dom-harness.cjs')(__dirname + '/..');
const game = h.board();
function set(board) {
    game.board = board; game.highestValueEver = 15;
    game.previousBoard = Array.from({length:4}, () => Array(4).fill(-999));
    game._arrivals.clear(); game.render();
}
const blank = () => Array.from({length:4}, () => Array(4).fill(0));
for (const direction of ['left','right','up','down']) {
    const board = blank(); board[0][0] = 1;
    if (['left','right'].includes(direction)) board[0][1] = 1; else board[1][0] = 1;
    set(board); assert.ok(game.move(direction)); game.render();
    const results = game.tiles.filter(t => t.dataset.arrival === 'merged');
    assert.equal(results.length, 1, direction + ': same-value result marked even if cell value is unchanged');
    const index = direction === 'right' ? 3 : direction === 'down' ? 12 : 0;
    assert.equal(game.tiles[index].dataset.arrival, 'merged');
    h.context.Math.random = () => 0.5;
    game.addRandomTile(); game.render();
    assert.equal(game.tiles.filter(t => t.dataset.arrival === 'new').length, 1);
    assert.equal(game.tiles[index].dataset.arrival, 'merged');
    const attrs = game.tiles.map(t => t.dataset.arrival);
    game.render(); assert.deepEqual(game.tiles.map(t => t.dataset.arrival), attrs, 'rerender preserves labels');
    const before = JSON.stringify([...game._arrivals]); game.checkGameOver();
    assert.equal(JSON.stringify([...game._arrivals]), before, 'game-over probe does not alter provenance');
}
set([[5,-1,3,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);
game.move('left'); game.render(); assert.equal(game.tiles[0].dataset.arrival, 'merged');
assert.equal(game.tiles[0].getAttribute('data-value'), '6');
set([[15,-4,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]]);
game.move('left'); game.render(); assert.equal(game.tiles.filter(t => t.dataset.arrival).length, 0, 'cleared result is not a surviving merge');
h.context.Math.random = () => 0;
game.addRandomTile(); game.render();
assert.equal(game.tiles[0].dataset.arrival, 'new', 'gate spawning into cleared cell is new');
assert.equal(game.tiles[0].getAttribute('data-value'), 'gate');
assert.equal(game.move('left'), false); game.render(); assert.equal(game.tiles[0].dataset.arrival, 'new', 'no-op keeps last successful move labels');
game.move('right'); game.render(); assert.equal(game.tiles.filter(t => t.dataset.arrival).length, 0, 'plain slide clears old labels');
set(Array.from({length:4}, () => [1,2,3,4])); game.addRandomTile(); game.render();
assert.equal(game.tiles.filter(t => t.dataset.arrival).length, 0, 'full board invents no spawn');
game.init(); assert.equal(game.tiles.filter(t => t.dataset.arrival === 'new').length, 2, 'reset marks only starting tiles');
console.log('Tile origins: passed (four directions, unchanged values, gates, clear, no-op, rerender, reset)');
