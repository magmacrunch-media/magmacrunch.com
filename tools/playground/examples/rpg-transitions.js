// rpg-transitions: Walk between maps through door tiles
var canvas = document.getElementById('c');
AdRPG.initCanvas(canvas);

var TILE = 32;

var maps = {
  overworld: (function () {
    var w = 14, h = 10;
    var m = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) row.push(2);
        else if (x === 7 && y === 5) row.push(3);
        else row.push(0);
      }
      m.push(row);
    }
    return m;
  })(),
  house: (function () {
    var w = 8, h = 6;
    var m = [];
    for (var y = 0; y < h; y++) {
      var row = [];
      for (var x = 0; x < w; x++) {
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) row.push(2);
        else if (x === 4 && y === h - 1) row.push(3);
        else row.push(0);
      }
      m.push(row);
    }
    return m;
  })()
};

var currentMap = 'overworld';
var mapW = maps.overworld[0].length;
var mapH = maps.overworld.length;

AdRPG.setCurrentMap(currentMap);
AdRPG.setMap(maps[currentMap]);
AdRPG.player.x = 7;
AdRPG.player.y = 3;

var input = AdRPG.initInput();

function checkTransition() {
  var p = AdRPG.player;
  var tileX = Math.round(p.x);
  var tileY = Math.round(p.y);
  var m = maps[currentMap];
  if (m[tileY] && m[tileY][tileX] === 3) {
    if (currentMap === 'overworld') {
      mapW = 8; mapH = 6;
      AdRPG.transitionTo({
        mapName: 'house', maps: maps,
        x: 4, y: 4, facing: 'up', tileSize: TILE
      });
      currentMap = 'house';
      console.log('Entered the house!');
    } else {
      mapW = 14; mapH = 10;
      AdRPG.transitionTo({
        mapName: 'overworld', maps: maps,
        x: 7, y: 6, facing: 'down', tileSize: TILE
      });
      currentMap = 'overworld';
      console.log('Left the house!');
    }
  }
}

console.log('Walk onto the blue door tile to transition between maps.');

var loop = AdRPG.createGameLoop({
  update: function () {
    AdRPG.handleMovement(AdRPG.player, {
      speed: 0.4,
      collisionOpts: { map: maps[currentMap], solidTiles: [2] },
    });
    checkTransition();
    AdRPG.updateCamera({ target: AdRPG.player, tileSize: TILE, mapWidth: mapW, mapHeight: mapH });
  },
  render: function () {
    var ctx = AdRPG.ctx;
    AdRPG.renderWorld({
      map: maps[currentMap], tileSize: TILE,
      renderTile: function (ctx, x, y, id) {
        if (id === 3) {
          ctx.fillStyle = '#4488ff';
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = '#fff';
          ctx.font = '14px monospace';
          ctx.fillText('D', x + 10, y + 22);
        } else {
          ctx.fillStyle = id === 2 ? '#5d4037' : (currentMap === 'house' ? '#6b5b3a' : '#7cb342');
          ctx.fillRect(x, y, TILE, TILE);
        }
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

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(8, 8, 160, 28);
    ctx.fillStyle = '#ffd700';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('Map: ' + currentMap, 16, 26);
  },
  fps: 30,
});

AdRPG.setGameStarted(true);
loop.start();
