// rpg-camera: Smooth movement with engine input + camera following
var canvas = document.getElementById('c');
AdRPG.initCanvas(canvas);

var MAP_W = 20, MAP_H = 15;
var TILE = 32;
var map = [];
for (var y = 0; y < MAP_H; y++) {
  var row = [];
  for (var x = 0; x < MAP_W; x++) {
    row.push(x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? 2 : 0);
  }
  map.push(row);
}
map[5][5] = 2; map[5][6] = 2; map[6][5] = 2;
map[8][10] = 2; map[9][10] = 2; map[10][10] = 2;

AdRPG.setCurrentMap('big');
AdRPG.setMap(map);
AdRPG.player.x = 10;
AdRPG.player.y = 7;

var input = AdRPG.initInput();

console.log('WASD or arrows to move. Smooth movement with wall sliding.');

var loop = AdRPG.createGameLoop({
  update: function () {
    AdRPG.handleMovement(AdRPG.player, {
      speed: 0.4,
      collisionOpts: { map: map, solidTiles: [2] },
    });
    AdRPG.updateCamera({
      target: AdRPG.player,
      tileSize: TILE,
      mapWidth: MAP_W,
      mapHeight: MAP_H,
      smoothing: 0.3,
    });
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
          ctx.fillStyle = '#fff';
          ctx.font = '10px monospace';
          ctx.fillText(p.direction, p.x * TILE + 4, p.y * TILE - 4);
        },
      }],
    });
  },
  fps: 30,
});

AdRPG.setGameStarted(true);
loop.start();
