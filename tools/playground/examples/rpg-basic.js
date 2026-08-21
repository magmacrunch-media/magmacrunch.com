// rpg-basic: 5x4 tile map, player at (1,1), game loop
var canvas = document.getElementById('c');
AdRPG.initCanvas(canvas);

var map = [
  [2,2,2,2,2],
  [2,0,0,0,2],
  [2,0,0,0,2],
  [2,2,2,2,2],
];

AdRPG.setCurrentMap('playground');
AdRPG.setMap(map);
AdRPG.player.x = 1;
AdRPG.player.y = 1;

console.log('Player at (' + AdRPG.player.x + ', ' + AdRPG.player.y + ')');
console.log('Map loaded: ' + AdRPG.currentMap);

var loop = AdRPG.createGameLoop({
  update: function () {
    AdRPG.updateCamera({
      target: AdRPG.player,
      tileSize: 32,
      mapWidth: 5,
      mapHeight: 4,
    });
  },
  render: function () {
    AdRPG.renderWorld({
      map: map,
      tileSize: 32,
      renderTile: function (ctx, x, y, id) {
        ctx.fillStyle = id === 2 ? '#5d4037' : '#7cb342';
        ctx.fillRect(x, y, 32, 32);
      },
      layers: [{
        sortY: AdRPG.player.y,
        render: function (ctx) {
          ctx.fillStyle = '#ff6ec7';
          ctx.fillRect(
            AdRPG.player.x * 32 + 8,
            AdRPG.player.y * 32 + 8,
            16, 16
          );
        },
      }],
    });
  },
  fps: 30,
});

AdRPG.setGameStarted(true);
loop.start();
console.log('Game loop started — pink square is the player');
