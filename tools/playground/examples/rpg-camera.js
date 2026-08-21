// rpg-camera: Camera following the player with arrow key movement
var canvas = document.getElementById('c');
AdRPG.initCanvas(canvas);

// Larger map to demonstrate camera scrolling
var MAP_W = 20, MAP_H = 15;
var map = [];
for (var y = 0; y < MAP_H; y++) {
  var row = [];
  for (var x = 0; x < MAP_W; x++) {
    row.push(x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? 2 : 0);
  }
  map.push(row);
}
// Scatter some walls
map[5][5] = 2; map[5][6] = 2; map[6][5] = 2;
map[8][10] = 2; map[9][10] = 2; map[10][10] = 2;

AdRPG.setCurrentMap('big');
AdRPG.setMap(map);
AdRPG.player.x = 10;
AdRPG.player.y = 7;

var TILE = 32;
var keys = {};
window.addEventListener('keydown', function (e) { keys[e.key] = true; });
window.addEventListener('keyup',   function (e) { keys[e.key] = false; });

console.log('Arrow keys to move. Camera follows the player.');

var loop = AdRPG.createGameLoop({
  update: function () {
    var p = AdRPG.player;
    var dx = 0, dy = 0;
    if (keys['ArrowLeft'])  dx = -1;
    if (keys['ArrowRight']) dx =  1;
    if (keys['ArrowUp'])    dy = -1;
    if (keys['ArrowDown'])  dy =  1;
    if (dx || dy) {
      var nx = p.x + dx, ny = p.y + dy;
      if (!AdRPG.isSolid(nx, ny, { map: map, solidTiles: [2] })) {
        p.x = nx; p.y = ny;
      }
    }
    AdRPG.updateCamera({ target: p, tileSize: TILE, mapWidth: MAP_W, mapHeight: MAP_H });
  },
  render: function () {
    AdRPG.renderWorld({
      map: map, tileSize: TILE,
      renderTile: function (ctx, x, y, id) {
        ctx.fillStyle = id === 2 ? '#5d4037' : '#7cb342';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = '#333';
        ctx.strokeRect(x, y, TILE, TILE);
      },
      layers: [{
        sortY: AdRPG.player.y,
        render: function (ctx) {
          var p = AdRPG.player;
          ctx.fillStyle = '#ff6ec7';
          ctx.fillRect(p.x * TILE + 4, p.y * TILE + 4, TILE - 8, TILE - 8);
        },
      }],
    });
  },
  fps: 30,
});

AdRPG.setGameStarted(true);
loop.start();
