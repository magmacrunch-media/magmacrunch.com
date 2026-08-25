// rpg-inventory: Pick up items, manage inventory, equip backpack
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

AdRPG.setCurrentMap('loot-room');
AdRPG.setMap(map);
AdRPG.player.x = 6;
AdRPG.player.y = 5;

var input = AdRPG.initInput();
var registry = AdRPG.createItemRegistry();
var worldItems = AdRPG.createWorldItems();
var inv = AdRPG.createInventory();

registry.register({ id: 'sword', name: 'Iron Sword' });
registry.register({ id: 'shield', name: 'Wooden Shield' });
registry.register({ id: 'potion', name: 'Health Potion', canDrop: false });
registry.register({ id: 'key', name: 'Rusty Key', required: true });
registry.register({ id: 'backpack', name: 'Leather Backpack' });

worldItems.addItem('loot-room', 'sword', 3, 3);
worldItems.addItem('loot-room', 'shield', 7, 3);
worldItems.addItem('loot-room', 'potion', 5, 7);
worldItems.addItem('loot-room', 'key', 9, 6);

console.log('WASD/arrows to move. Walk over items to pick up.');
console.log('Press S (shift+s) to swap hands. Press B to equip backpack.');

var loop = AdRPG.createGameLoop({
  update: function () {
    AdRPG.handleMovement(AdRPG.player, {
      speed: 0.4,
      collisionOpts: { map: map, solidTiles: [2] },
    });
    var item = worldItems.checkPickup(AdRPG.player.x, AdRPG.player.y, 'loot-room');
    if (item) {
      var def = registry.get(item.itemId);
      var name = def ? def.name : item.itemId;
      if (inv.addItem({ type: { id: item.itemId } })) {
        worldItems.pickup(item, inv);
        console.log('Picked up: ' + name);
      } else {
        console.log('Hands full! Drop something first.');
      }
    }
    if (AdRPG.keysPressed['b']) {
      if (!inv.backpack) {
        inv.equipBackpack({ id: 'leather', storageCapacity: 4 });
        console.log('Equipped backpack!');
      } else {
        inv.unequipBackpack();
        console.log('Removed backpack.');
      }
    }
    AdRPG.updateCamera({ target: AdRPG.player, tileSize: TILE, mapWidth: MAP_W, mapHeight: MAP_H });
  },
  render: function () {
    var ctx = AdRPG.ctx;
    AdRPG.renderWorld({
      map: map, tileSize: TILE,
      renderTile: function (ctx, x, y, id) {
        ctx.fillStyle = id === 2 ? '#5d4037' : '#3a3a4a';
        ctx.fillRect(x, y, TILE, TILE);
      },
      layers: (function () {
        var layers = [];
        var items = worldItems.getItems('loot-room');
        for (var i = 0; i < items.length; i++) {
          (function (wi) {
            layers.push({
              sortY: wi.y,
              render: function (ctx) {
                var bob = Math.sin(Date.now() / 300 + wi.x) * 3;
                ctx.fillStyle = '#ffd700';
                ctx.fillRect(wi.x * TILE + 10, wi.y * TILE + 10 + bob, TILE - 20, TILE - 20);
                ctx.fillStyle = '#fff';
                ctx.font = '8px monospace';
                var def = registry.get(wi.itemId);
                ctx.fillText(def ? def.name[0] : '?', wi.x * TILE + 13, wi.y * TILE + 24 + bob);
              }
            });
          })(items[i]);
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

    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(440, 8, 192, 200);
    ctx.strokeStyle = '#6a7a9a';
    ctx.lineWidth = 2;
    ctx.strokeRect(440, 8, 192, 200);

    ctx.fillStyle = '#ffd700';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText('INVENTORY', 456, 28);

    ctx.font = '9px "Press Start 2P", monospace';
    ctx.fillStyle = '#87ceeb';
    ctx.fillText('Left:  ' + (inv.leftHand ? inv.leftHand.type.id : 'empty'), 456, 52);
    ctx.fillStyle = '#ff6ec7';
    ctx.fillText('Right: ' + (inv.rightHand ? inv.rightHand.type.id : 'empty'), 456, 70);

    ctx.fillStyle = '#aaa';
    ctx.fillText('Backpack: ' + (inv.backpack ? 'yes' : 'no'), 456, 94);

    if (inv.backpack) {
      ctx.fillStyle = '#888';
      ctx.fillText('Storage:', 456, 112);
      for (var i = 0; i < inv.storage.length; i++) {
        ctx.fillText('  ' + inv.storage[i], 456, 128 + i * 14);
      }
    }

    ctx.fillStyle = '#666';
    ctx.font = '8px monospace';
    ctx.fillText('[B] equip backpack', 456, 192);
  },
  fps: 30,
});

AdRPG.setGameStarted(true);
loop.start();
