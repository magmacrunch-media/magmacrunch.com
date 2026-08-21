// rpg-npcs: Talk to NPCs with branching dialogue
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

AdRPG.setCurrentMap('village');
AdRPG.setMap(map);
AdRPG.player.x = 6;
AdRPG.player.y = 5;

var input = AdRPG.initInput();
var em = AdRPG.createEntityManager();
var dialogue = AdRPG.createDialogueSystem();
var interactions = AdRPG.createInteractionManager();

var elder = em.addNPC({
  x: 3, y: 3, map: 'village', name: 'Elder',
  dialogue: [
    'welcome, traveler.',
    'our village has been plagued by strange creatures.',
    'will you help us?'
  ]
});

var merchant = em.addNPC({
  x: 8, y: 3, map: 'village', name: 'Merchant',
  dialogue: [
    'ah, a customer!',
    'i have rare goods — if you have the coin.'
  ]
});

interactions.register({
  name: 'npc-talk',
  priority: 10,
  promptFn: function (player) {
    if (dialogue.isActive()) return null;
    var npc = em.getNPCInFront(player, 'village');
    if (npc) return '[SPACE] talk to ' + npc.name;
    return null;
  },
  handler: function (player) {
    if (dialogue.isActive()) return false;
    var npc = em.getNPCInFront(player, 'village');
    if (!npc) return false;
    var opts = {};
    if (npc.name === 'Elder') {
      opts.choices = [
        { label: 'Yes, I will help!', callback: function () { console.log('You accepted the quest!'); } },
        { label: 'Not right now.', callback: function () { console.log('You declined.'); } }
      ];
    }
    dialogue.show(npc, opts);
    return true;
  }
});

var promptText = null;

console.log('WASD/arrows to move. Face an NPC and press SPACE to talk.');

var loop = AdRPG.createGameLoop({
  update: function () {
    if (dialogue.isActive()) {
      if (AdRPG.keysPressed[' '] || AdRPG.keysPressed['enter']) {
        if (dialogue.getState().showChoices) {
          dialogue.selectChoice();
        } else {
          dialogue.advance();
        }
      }
      if (AdRPG.keysPressed['arrowup'] || AdRPG.keysPressed['w']) dialogue.moveChoice(-1);
      if (AdRPG.keysPressed['arrowdown'] || AdRPG.keysPressed['s']) dialogue.moveChoice(1);
      return;
    }
    AdRPG.handleMovement(AdRPG.player, {
      speed: 0.4,
      collisionOpts: { map: map, solidTiles: [2] },
    });
    interactions.updatePrompt(AdRPG.player);
    var newPrompt = interactions.getPrompt();
    if (newPrompt !== promptText) {
      promptText = newPrompt;
      if (promptText) console.log(promptText);
    }
    AdRPG.updateCamera({ target: AdRPG.player, tileSize: TILE, mapWidth: MAP_W, mapHeight: MAP_H });
  },
  render: function () {
    var ctx = AdRPG.ctx;
    AdRPG.renderWorld({
      map: map, tileSize: TILE,
      renderTile: function (ctx, x, y, id) {
        ctx.fillStyle = id === 2 ? '#5d4037' : '#7cb342';
        ctx.fillRect(x, y, TILE, TILE);
      },
      layers: (function () {
        var layers = [];
        var npcs = em.getNPCs('village');
        for (var i = 0; i < npcs.length; i++) {
          (function (npc) {
            layers.push({
              sortY: npc.y,
              render: function (ctx) {
                ctx.fillStyle = npc.name === 'Elder' ? '#ffd700' : '#87ceeb';
                ctx.fillRect(npc.x * TILE + 4, npc.y * TILE + 4, TILE - 8, TILE - 8);
                ctx.fillStyle = '#fff';
                ctx.font = '9px monospace';
                ctx.fillText(npc.name, npc.x * TILE, npc.y * TILE - 4);
              }
            });
          })(npcs[i]);
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

    if (dialogue.isActive()) {
      var state = dialogue.getState();
      var dw = 400, dh = 100;
      var dx = (640 - dw) / 2, dy = 480 - dh - 16;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(dx, dy, dw, dh);
      ctx.strokeStyle = '#6a7a9a';
      ctx.lineWidth = 4;
      ctx.strokeRect(dx, dy, dw, dh);
      ctx.strokeStyle = '#4a5a7a';
      ctx.strokeRect(dx + 4, dy + 4, dw - 8, dh - 8);

      ctx.fillStyle = '#ffd700';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText(state.speaker ? state.speaker.name : '', dx + 16, dy + 24);

      ctx.fillStyle = '#fff';
      ctx.font = '11px "Press Start 2P", monospace';
      ctx.fillText(state.currentLine || '', dx + 16, dy + 50);

      if (state.showChoices) {
        for (var i = 0; i < state.choices.length; i++) {
          var cy = dy + 66 + i * 18;
          ctx.fillStyle = i === state.choiceIndex ? '#ffd700' : '#aaa';
          ctx.fillText((i === state.choiceIndex ? '> ' : '  ') + (state.choices[i].label || ''), dx + 16, cy);
        }
      } else if (state.hasMoreLines) {
        ctx.fillStyle = '#666';
        ctx.font = '9px monospace';
        ctx.fillText('[SPACE] next', dx + dw - 100, dy + dh - 8);
      } else {
        ctx.fillStyle = '#666';
        ctx.font = '9px monospace';
        ctx.fillText('[SPACE] close', dx + dw - 110, dy + dh - 8);
      }
    }
  },
  fps: 30,
});

AdRPG.setGameStarted(true);
loop.start();
