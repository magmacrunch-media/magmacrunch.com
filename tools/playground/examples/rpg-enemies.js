// rpg-enemies: Patrol enemies, collision damage, and health bar
var canvas = document.getElementById('c');
AdRPG.initCanvas(canvas);

var MAP_W = 16, MAP_H = 12;
var TILE = 32;
var map = [];
for (var y = 0; y < MAP_H; y++) {
  var row = [];
  for (var x = 0; x < MAP_W; x++) {
    row.push(x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? 2 : 0);
  }
  map.push(row);
}
map[4][4] = 2; map[4][5] = 2; map[5][4] = 2;
map[8][8] = 2; map[8][9] = 2; map[9][8] = 2;
map[3][10] = 0; map[6][3] = 0;

AdRPG.setCurrentMap('dungeon');
AdRPG.setMap(map);
AdRPG.player.x = 2;
AdRPG.player.y = 2;
AdRPG.player.health = 100;
AdRPG.player.maxHealth = 100;

var input = AdRPG.initInput();
var em = AdRPG.createEntityManager();
var cooldown = AdRPG.createDamageCooldown(90);

em.addEnemy({ x: 5, y: 5, map: 'dungeon', moveSpeed: 40, patrolRange: 4, damage: 15 });
em.addEnemy({ x: 10, y: 6, map: 'dungeon', moveSpeed: 50, patrolRange: 3, damage: 20 });
em.addEnemy({ x: 7, y: 9, map: 'dungeon', moveSpeed: 30, patrolRange: 5, damage: 10 });

console.log('WASD/arrows to move. Avoid the red enemies!');

var loop = AdRPG.createGameLoop({
  update: function () {
    AdRPG.handleMovement(AdRPG.player, {
      speed: 0.4,
      collisionOpts: { map: map, solidTiles: [2] },
    });
    em.updateEnemies('dungeon', function (x, y) {
      return AdRPG.isSolid(x, y, { map: map, solidTiles: [2] });
    });
    cooldown.tick();
    if (cooldown.canDamage()) {
      em.checkEnemyCollisions(AdRPG.player.x, AdRPG.player.y, 'dungeon', function (dmg) {
        AdRPG.damagePlayer(dmg);
        cooldown.recordHit();
        AdRPG.showNotification('-' + dmg + ' hp', { theme: 'locked', duration: 1500 });
      });
    }
    AdRPG.updateCamera({ target: AdRPG.player, tileSize: TILE, mapWidth: MAP_W, mapHeight: MAP_H });
  },
  render: function () {
    var ctx = AdRPG.ctx;
    AdRPG.renderWorld({
      map: map, tileSize: TILE,
      renderTile: function (ctx, x, y, id) {
        ctx.fillStyle = id === 2 ? '#5d4037' : '#2a2a3a';
        ctx.fillRect(x, y, TILE, TILE);
      },
      layers: (function () {
        var layers = [];
        var enemies = em.getEnemies('dungeon');
        for (var i = 0; i < enemies.length; i++) {
          (function (e) {
            layers.push({
              sortY: e.y,
              render: function (ctx) {
                var blink = cooldown.canDamage() || Math.floor(Date.now() / 100) % 2 === 0;
                ctx.fillStyle = blink ? '#ff4444' : '#cc0000';
                ctx.fillRect(e.x * TILE + 4, e.y * TILE + 4, TILE - 8, TILE - 8);
                ctx.fillStyle = '#ff0';
                ctx.font = '14px monospace';
                ctx.fillText('!', e.x * TILE + 12, e.y * TILE - 2);
              }
            });
          })(enemies[i]);
        }
        layers.push({
          sortY: AdRPG.player.y,
          render: function (ctx) {
            var p = AdRPG.player;
            var blink = cooldown.canDamage() || Math.floor(Date.now() / 80) % 2 === 0;
            ctx.fillStyle = blink ? '#ff6ec7' : '#ff6ec788';
            ctx.fillRect(p.x * TILE + 4, p.y * TILE + 4, TILE - 8, TILE - 8);
          }
        });
        return layers;
      })(),
    });

    var p = AdRPG.player;
    var barW = 120, barH = 12;
    var bx = 8, by = 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, barW, barH);
    var pct = Math.max(0, p.health / p.maxHealth);
    ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.strokeStyle = '#666';
    ctx.strokeRect(bx, by, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('HP: ' + p.health + '/' + p.maxHealth, bx + 4, by + 10);

    if (p.health <= 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#f44336';
      ctx.font = '20px "Press Start 2P", monospace';
      ctx.fillText('GAME OVER', 200, 230);
      ctx.fillStyle = '#aaa';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillText('refresh to try again', 180, 270);
    }
  },
  fps: 30,
});

AdRPG.setGameStarted(true);
loop.start();
