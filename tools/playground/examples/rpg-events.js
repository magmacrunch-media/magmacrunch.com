// rpg-events: Event-driven architecture with engine event bus
var canvas = document.getElementById('c');
AdRPG.initCanvas(canvas);

var MAP_W = 12, MAP_H = 10;
var TILE = 32;
var map = [];
for (var y = 0; y < MAP_H; y++) {
  var row = [];
  for (var x = 0; x < MAP_W; x++) {
    row.push(x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? 2 : 0);
  }
  map.push(row);
}

AdRPG.setCurrentMap('event-demo');
AdRPG.setMap(map);
AdRPG.player.x = 6;
AdRPG.player.y = 5;
AdRPG.player.health = 100;
AdRPG.player.maxHealth = 100;

var input = AdRPG.initInput();
var em = AdRPG.createEntityManager();
var cooldown = AdRPG.createDamageCooldown(45);
var eventLog = [];

em.addEnemy({ x: 4, y: 4, map: 'event-demo', moveSpeed: 35, patrolRange: 3, damage: 15 });
em.addEnemy({ x: 8, y: 6, map: 'event-demo', moveSpeed: 45, patrolRange: 4, damage: 10 });

function logEvent(msg) {
  eventLog.unshift(msg);
  if (eventLog.length > 8) eventLog.pop();
}

AdRPG.engine.on('enemy-collision', function (data) {
  logEvent('enemy hit! -' + data.enemy.damage + ' dmg');
});

AdRPG.engine.on('health-changed', function (data) {
  logEvent('health: ' + data.health + '/' + data.maxHealth);
});

AdRPG.engine.on('player-died', function () {
  logEvent('PLAYER DIED');
});

AdRPG.engine.on('map-changed', function (data) {
  logEvent('map: ' + data.mapName);
});

AdRPG.engine.on('dialogue-start', function (data) {
  logEvent('talk: ' + (data.speaker ? data.speaker.name : 'unknown'));
});

AdRPG.engine.on('dialogue-close', function () {
  logEvent('dialogue closed');
});

console.log('Event-driven RPG. Watch the event log on screen.');
console.log('WASD/arrows to move. Walk into enemies to see events fire.');

var loop = AdRPG.createGameLoop({
  update: function () {
    AdRPG.handleMovement(AdRPG.player, {
      speed: 0.4,
      collisionOpts: { map: map, solidTiles: [2] },
    });
    em.updateEnemies('event-demo', function (x, y) {
      return AdRPG.isSolid(x, y, { map: map, solidTiles: [2] });
    });
    cooldown.tick();
    if (cooldown.canDamage()) {
      em.checkEnemyCollisions(AdRPG.player.x, AdRPG.player.y, 'event-demo', function (dmg) {
        AdRPG.damagePlayer(dmg);
        cooldown.recordHit();
      });
    }
    AdRPG.updateCamera({ target: AdRPG.player, tileSize: TILE, mapWidth: MAP_W, mapHeight: MAP_H });
  },
  render: function () {
    var ctx = AdRPG.ctx;
    AdRPG.renderWorld({
      map: map, tileSize: TILE,
      renderTile: function (ctx, x, y, id) {
        ctx.fillStyle = id === 2 ? '#5d4037' : '#2a3a2a';
        ctx.fillRect(x, y, TILE, TILE);
      },
      layers: (function () {
        var layers = [];
        var enemies = em.getEnemies('event-demo');
        for (var i = 0; i < enemies.length; i++) {
          (function (e) {
            layers.push({
              sortY: e.y,
              render: function (ctx) {
                ctx.fillStyle = '#ff4444';
                ctx.fillRect(e.x * TILE + 6, e.y * TILE + 6, TILE - 12, TILE - 12);
              }
            });
          })(enemies[i]);
        }
        layers.push({
          sortY: AdRPG.player.y,
          render: function (ctx) {
            var p = AdRPG.player;
            ctx.fillStyle = '#ff6ec7';
            ctx.fillRect(p.x * TILE + 4, p.y * TILE + 4, TILE - 8, TILE - 8);
          }
        });
        return layers;
      })(),
    });

    var p = AdRPG.player;
    var barW = 120, barH = 10;
    ctx.fillStyle = '#333';
    ctx.fillRect(8, 8, barW, barH);
    var pct = Math.max(0, p.health / p.maxHealth);
    ctx.fillStyle = pct > 0.5 ? '#4caf50' : '#f44336';
    ctx.fillRect(8, 8, barW * pct, barH);
    ctx.fillStyle = '#fff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText('HP ' + p.health, 12, 16);

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(440, 8, 192, 180);
    ctx.strokeStyle = '#6a7a9a';
    ctx.lineWidth = 2;
    ctx.strokeRect(440, 8, 192, 180);

    ctx.fillStyle = '#ffd700';
    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillText('EVENT LOG', 456, 26);

    ctx.fillStyle = '#aaa';
    ctx.font = '8px monospace';
    for (var i = 0; i < eventLog.length; i++) {
      ctx.fillText('> ' + eventLog[i], 456, 44 + i * 18);
    }
  },
  fps: 30,
});

AdRPG.setGameStarted(true);
loop.start();
