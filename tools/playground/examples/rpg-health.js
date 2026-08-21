// rpg-health: Damage, healing, invincibility frames, notifications
var canvas = document.getElementById('c');
AdRPG.initCanvas(canvas);

var MAP_W = 10, MAP_H = 8;
var TILE = 32;
var map = [];
for (var y = 0; y < MAP_H; y++) {
  var row = [];
  for (var x = 0; x < MAP_W; x++) {
    row.push(x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? 2 : 0);
  }
  map.push(row);
}

AdRPG.setCurrentMap('arena');
AdRPG.setMap(map);
AdRPG.player.x = 5;
AdRPG.player.y = 4;
AdRPG.player.health = 100;
AdRPG.player.maxHealth = 100;

var input = AdRPG.initInput();
var cooldown = AdRPG.createDamageCooldown(60);
var isGameOver = false;

AdRPG.setOnGameOverCallback(function () {
  isGameOver = true;
  AdRPG.showNotification('you have fallen...', { theme: 'locked', duration: 5000 });
});

AdRPG.engine.on('health-changed', function (data) {
  var pct = Math.round((data.health / data.maxHealth) * 100);
  if (data.health < data.maxHealth) {
    AdRPG.showNotification('hp: ' + pct + '%', { theme: 'default', duration: 1500 });
  }
});

AdRPG.engine.on('player-died', function () {
  console.log('Player died! Game over.');
});

console.log('WASD/arrows to move.');
console.log('Press H to heal (+25). Press D to take damage (-20).');

var loop = AdRPG.createGameLoop({
  update: function () {
    if (isGameOver) return;
    AdRPG.handleMovement(AdRPG.player, {
      speed: 0.4,
      collisionOpts: { map: map, solidTiles: [2] },
    });
    cooldown.tick();
    if (AdRPG.keysPressed['h']) {
      AdRPG.healPlayer(25);
      console.log('Healed +25 HP');
    }
    if (AdRPG.keysPressed['d']) {
      if (cooldown.canDamage()) {
        AdRPG.damagePlayer(20);
        cooldown.recordHit();
        console.log('Took -20 damage');
      } else {
        console.log('Invincible! Wait...');
      }
    }
    AdRPG.updateCamera({ target: AdRPG.player, tileSize: TILE, mapWidth: MAP_W, mapHeight: MAP_H });
  },
  render: function () {
    var ctx = AdRPG.ctx;
    AdRPG.renderWorld({
      map: map, tileSize: TILE,
      renderTile: function (ctx, x, y, id) {
        ctx.fillStyle = id === 2 ? '#5d4037' : '#4a2a2a';
        ctx.fillRect(x, y, TILE, TILE);
      },
      layers: [{
        sortY: AdRPG.player.y,
        render: function (ctx) {
          var p = AdRPG.player;
          var blink = cooldown.canDamage() || Math.floor(Date.now() / 80) % 2 === 0;
          ctx.fillStyle = blink ? '#ff6ec7' : '#ff6ec744';
          ctx.fillRect(p.x * TILE + 4, p.y * TILE + 4, TILE - 8, TILE - 8);
        },
      }],
    });

    var p = AdRPG.player;
    var barW = 200, barH = 16;
    var bx = 640 / 2 - barW / 2, by = 12;
    ctx.fillStyle = '#222';
    ctx.fillRect(bx, by, barW, barH);
    var pct = Math.max(0, p.health / p.maxHealth);
    ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
    ctx.fillRect(bx, by, barW * pct, barH);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, by, barW, barH);
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HP ' + p.health + ' / ' + p.maxHealth, 640 / 2, by + 12);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#666';
    ctx.font = '9px monospace';
    ctx.fillText('[H] heal +25    [D] damage -20', 8, 480 - 12);

    if (!cooldown.canDamage()) {
      ctx.fillStyle = '#ffd700';
      ctx.font = '10px "Press Start 2P", monospace';
      ctx.fillText('INVINCIBLE', 8, 40);
    }
  },
  fps: 30,
});

AdRPG.setGameStarted(true);
loop.start();
