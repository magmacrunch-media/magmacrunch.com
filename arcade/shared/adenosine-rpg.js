"use strict";
var AdRPG = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var index_exports = {};
  __export(index_exports, {
    DEFAULT_BINDINGS: () => DEFAULT_BINDINGS,
    DIRECTION_VECTORS: () => DIRECTION_VECTORS,
    animationFrame: () => animationFrame,
    camera: () => camera,
    campfireAnimCounter: () => campfireAnimCounter,
    campfireAnimFrame: () => campfireAnimFrame,
    canvas: () => canvas,
    createAnimationCounter: () => createAnimationCounter,
    createDamageCooldown: () => createDamageCooldown,
    createDialogueSystem: () => createDialogueSystem,
    createEntityManager: () => createEntityManager,
    createEventBus: () => createEventBus,
    createGameLoop: () => createGameLoop,
    createInteractionManager: () => createInteractionManager,
    createInventory: () => createInventory,
    createItemRegistry: () => createItemRegistry,
    createSpriteRegistry: () => createSpriteRegistry,
    createWorldItems: () => createWorldItems,
    ctx: () => ctx,
    currentMap: () => currentMap,
    damagePlayer: () => damagePlayer,
    engine: () => engine,
    frameCounter: () => frameCounter,
    gameOver: () => gameOver,
    gamePaused: () => gamePaused,
    gameStarted: () => gameStarted,
    generatePropCollisionTiles: () => generatePropCollisionTiles,
    getEntityInFront: () => getEntityInFront,
    handleMovement: () => handleMovement,
    healPlayer: () => healPlayer,
    initCanvas: () => initCanvas,
    initInput: () => initInput,
    isFacingProp: () => isFacingProp,
    isNearProp: () => isNearProp,
    isSolid: () => isSolid,
    keys: () => keys,
    keysPressed: () => keysPressed,
    map: () => map,
    player: () => player,
    renderWorld: () => renderWorld,
    setCurrentMap: () => setCurrentMap,
    setGameOver: () => setGameOver,
    setGamePaused: () => setGamePaused,
    setGameStarted: () => setGameStarted,
    setMap: () => setMap,
    setOnGameOverCallback: () => setOnGameOverCallback,
    setTransitionCooldown: () => setTransitionCooldown,
    showNotification: () => showNotification,
    tileToScreen: () => tileToScreen,
    transitionCooldown: () => transitionCooldown,
    transitionTo: () => transitionTo,
    updateCamera: () => updateCamera,
    waterAnimCounter: () => waterAnimCounter,
    waterAnimFrame: () => waterAnimFrame
  });

  // src/state.ts
  var gameStarted = false;
  var gamePaused = false;
  var gameOver = false;
  function setGameStarted(val) {
    gameStarted = val;
  }
  function setGamePaused(val) {
    gamePaused = val;
  }
  function setGameOver(val) {
    gameOver = val;
  }
  var currentMap = "default";
  var map = [];
  function setCurrentMap(val) {
    currentMap = val;
  }
  function setMap(val) {
    map = val;
  }
  var player = {
    x: 0,
    y: 0,
    facingX: 0,
    facingY: 1,
    direction: "down",
    isWalking: false,
    wasMoving: false,
    health: 100,
    maxHealth: 100,
    positionLocked: false
  };
  var canvas = null;
  var ctx = null;
  function initCanvas(canvasEl) {
    canvas = canvasEl;
    ctx = canvasEl.getContext("2d");
  }
  var animationFrame = 0;
  var frameCounter = 0;
  var waterAnimFrame = 0;
  var waterAnimCounter = 0;
  var campfireAnimFrame = 0;
  var campfireAnimCounter = 0;
  var transitionCooldown = 0;
  function setTransitionCooldown(val) {
    transitionCooldown = val;
  }

  // src/game-loop.ts
  function createGameLoop({ update, render, fps = 30 } = {}) {
    const targetFrameTime = 1e3 / fps;
    let lastFrameTime = 0;
    let accumulatedTime = 0;
    let rafId = null;
    function gameLoop(currentTime = 0) {
      rafId = requestAnimationFrame(gameLoop);
      if (!lastFrameTime) lastFrameTime = currentTime;
      const deltaTime = currentTime - lastFrameTime;
      accumulatedTime += deltaTime;
      if (accumulatedTime >= targetFrameTime) {
        const deltaFactor = accumulatedTime / targetFrameTime;
        accumulatedTime = accumulatedTime % targetFrameTime;
        if (!gamePaused && !gameOver && update) {
          update(deltaFactor);
        }
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        if (gameStarted && !gameOver && render) {
          render();
        }
      }
      lastFrameTime = currentTime;
    }
    return {
      start: () => {
        rafId = requestAnimationFrame(gameLoop);
      },
      stop: () => {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        lastFrameTime = 0;
        accumulatedTime = 0;
      }
    };
  }

  // src/bindings.ts
  var DEFAULT_BINDINGS = {
    moveUp: ["arrowup", "w"],
    moveDown: ["arrowdown", "s"],
    moveLeft: ["arrowleft", "a"],
    moveRight: ["arrowright", "d"],
    pause: ["escape", "p"],
    interact: [" "]
  };

  // src/events.ts
  function createEventBus() {
    const listeners = {};
    const bus = {
      on(event, fn) {
        if (!listeners[event]) listeners[event] = [];
        const arr = listeners[event];
        arr.push(fn);
        return () => bus.off(event, fn);
      },
      once(event, fn) {
        const wrapper = (...args) => {
          fn(...args);
          bus.off(event, wrapper);
        };
        return bus.on(event, wrapper);
      },
      off(event, fn) {
        const arr = listeners[event];
        if (arr) {
          listeners[event] = arr.filter((f) => f !== fn);
        }
      },
      emit(event, ...args) {
        for (const fn of listeners[event] || []) {
          if (args.length > 0) {
            fn(args[0]);
          } else {
            fn();
          }
        }
      }
    };
    return bus;
  }
  var engine = createEventBus();

  // src/input.ts
  var keys = {};
  var keysPressed = {};
  var activeListeners = null;
  function initInput({ onPause, onInteract, bindings = DEFAULT_BINDINGS } = {}) {
    if (activeListeners) return activeListeners;
    const pauseKeys = new Set(bindings.pause.map((k) => k.toLowerCase()));
    const interactKeys = new Set(bindings.interact.map((k) => k.toLowerCase()));
    function onKeyDown(e) {
      const key = e.key.toLowerCase();
      if (pauseKeys.has(key)) {
        engine.emit("pause-toggle");
        if (onPause) onPause();
        return;
      }
      if (!keysPressed[key]) {
        keysPressed[key] = true;
        if (interactKeys.has(key)) {
          e.preventDefault();
          engine.emit("interact");
          if (onInteract) onInteract();
        }
      }
      keys[key] = true;
    }
    function onKeyUp(e) {
      const key = e.key.toLowerCase();
      keys[key] = false;
      keysPressed[key] = false;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    activeListeners = {
      destroy() {
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        activeListeners = null;
      }
    };
    return activeListeners;
  }

  // src/camera.ts
  var camera = { x: 0, y: 0 };
  function updateCamera({ target, tileSize, mapWidth, mapHeight, smoothing = 0.3 } = {}) {
    if (!canvas || !target || tileSize === void 0 || mapWidth === void 0 || mapHeight === void 0) return;
    const targetX = target.x * tileSize - canvas.width / 2 + tileSize / 2;
    const targetY = target.y * tileSize - canvas.height / 2 + tileSize / 2;
    camera.x += (targetX - camera.x) * smoothing;
    camera.y += (targetY - camera.y) * smoothing;
    const maxX = Math.max(0, mapWidth * tileSize - canvas.width);
    const maxY = Math.max(0, mapHeight * tileSize - canvas.height);
    camera.x = Math.round(Math.max(0, Math.min(maxX, camera.x)));
    camera.y = Math.round(Math.max(0, Math.min(maxY, camera.y)));
  }

  // src/collision.ts
  function isSolid(x, y, { map: map2, solidTiles = [], entities = [], props = [] } = {}) {
    if (!map2 || !map2.length) return true;
    const checkX = Math.floor(x + 1e-3);
    const checkY = Math.floor(y + 1e-3);
    const mapHeight = map2.length;
    const mapWidth = map2[0] ? map2[0].length : 0;
    const bottomBoundary = mapHeight - 1;
    if (checkX < 1 || checkX >= mapWidth - 1 || checkY < 1 || checkY >= bottomBoundary) {
      return true;
    }
    if (!map2[checkY] || checkX >= map2[checkY].length) return true;
    for (const entity of entities) {
      const eWidth = entity.width || 1;
      const eHeight = entity.height || 1;
      const eCenterX = entity.x + eWidth / 2;
      const eCenterY = entity.y + eHeight / 2;
      const pCenterX = x + 0.5;
      const pCenterY = y + 0.5;
      const dx = Math.abs(pCenterX - eCenterX);
      const dy = Math.abs(pCenterY - eCenterY);
      const radius = Math.max(eWidth, eHeight) * 0.6;
      if (dx < radius && dy < radius) {
        return true;
      }
    }
    for (const prop of props) {
      if (checkX === prop.x && checkY === prop.y) {
        return true;
      }
    }
    const tileId = map2[checkY]?.[checkX];
    return tileId !== void 0 && solidTiles.includes(tileId);
  }

  // src/movement.ts
  function handleMovement(player2, { speed = 0.4, dt = 1, isBlocked, collisionOpts = {}, bindings = DEFAULT_BINDINGS } = {}) {
    if (speed <= 0) return false;
    const upKeys = bindings.moveUp.map((k) => k.toLowerCase());
    const downKeys = bindings.moveDown.map((k) => k.toLowerCase());
    const leftKeys = bindings.moveLeft.map((k) => k.toLowerCase());
    const rightKeys = bindings.moveRight.map((k) => k.toLowerCase());
    const isUp = upKeys.some((k) => keys[k]);
    const isDown = downKeys.some((k) => keys[k]);
    const isLeft = leftKeys.some((k) => keys[k]);
    const isRight = rightKeys.some((k) => keys[k]);
    const isMovementKey = isUp || isDown || isLeft || isRight;
    player2.isWalking = isMovementKey;
    if (isBlocked && isBlocked()) {
      player2.isWalking = false;
      return false;
    }
    if (!isMovementKey) return false;
    let dx = 0, dy = 0;
    if (isLeft) {
      dx = -1;
      player2.facingX = -1;
      player2.facingY = 0;
      player2.direction = "left";
    } else if (isRight) {
      dx = 1;
      player2.facingX = 1;
      player2.facingY = 0;
      player2.direction = "right";
    }
    if (isUp) {
      dy = -1;
      player2.facingX = 0;
      player2.facingY = -1;
      player2.direction = "up";
    } else if (isDown) {
      dy = 1;
      player2.facingX = 0;
      player2.facingY = 1;
      player2.direction = "down";
    }
    if (dx !== 0 && dy !== 0) {
      dx *= 1 / Math.SQRT2;
      dy *= 1 / Math.SQRT2;
    }
    const newX = player2.x + dx * speed * dt;
    const newY = player2.y + dy * speed * dt;
    if (dx !== 0 && !isSolid(newX, player2.y, collisionOpts)) {
      player2.x = newX;
    }
    if (dy !== 0 && !isSolid(player2.x, newY, collisionOpts)) {
      player2.y = newY;
    }
    return true;
  }

  // src/renderer.ts
  function renderWorld({ map: map2, tileSize, renderTile, layers = [], background }) {
    if (!ctx || !canvas || !map2) return;
    if (background) background(ctx);
    const sx = Math.floor(camera.x / tileSize);
    const sy = Math.floor(camera.y / tileSize);
    const ex = sx + Math.ceil(canvas.width / tileSize) + 2;
    const ey = sy + Math.ceil(canvas.height / tileSize) + 2;
    const mapWidth = map2[0] ? map2[0].length : 0;
    const mapHeight = map2.length;
    for (let y = Math.max(0, sy); y < Math.min(mapHeight, ey); y++) {
      for (let x = Math.max(0, sx); x < Math.min(mapWidth, ex); x++) {
        const tile = map2[y][x];
        const screenX = Math.floor(x * tileSize - camera.x);
        const screenY = Math.floor(y * tileSize - camera.y);
        renderTile(ctx, screenX, screenY, tile, x, y);
      }
    }
    const sorted = [...layers].sort((a, b) => a.sortY - b.sortY);
    for (const layer of sorted) {
      layer.render(ctx);
    }
  }
  function tileToScreen(tileX, tileY, tileSize) {
    return {
      x: Math.floor(tileX * tileSize - camera.x),
      y: Math.floor(tileY * tileSize - camera.y)
    };
  }
  function createSpriteRegistry() {
    const registry = {};
    return {
      register: (type, drawFn) => {
        registry[type] = drawFn;
      },
      draw: (type, ...args) => {
        if (registry[type]) registry[type](...args);
        else if (ctx) {
          ctx.fillStyle = "#ff00ff";
          const [x, y, w, h] = args;
          if (typeof x === "number" && typeof y === "number") {
            ctx.fillRect(x, y, typeof w === "number" ? w : 16, typeof h === "number" ? h : 16);
          }
        }
      }
    };
  }

  // src/inventory.ts
  function createInventory() {
    return {
      leftHand: null,
      rightHand: null,
      backpack: null,
      storage: [],
      addItem(item) {
        if (this.leftHand === null) {
          this.leftHand = item;
          engine.emit("item-acquired", item);
          return true;
        }
        if (this.rightHand === null) {
          this.rightHand = item;
          engine.emit("item-acquired", item);
          return true;
        }
        return false;
      },
      removeItem(itemId) {
        if (this.leftHand && this.leftHand.type.id === itemId) {
          const removed = this.leftHand;
          this.leftHand = null;
          engine.emit("item-removed", removed);
          return removed;
        }
        if (this.rightHand && this.rightHand.type.id === itemId) {
          const removed = this.rightHand;
          this.rightHand = null;
          engine.emit("item-removed", removed);
          return removed;
        }
        return null;
      },
      getItem(itemId) {
        if (this.leftHand?.type.id === itemId) return this.leftHand;
        if (this.rightHand?.type.id === itemId) return this.rightHand;
        return null;
      },
      hasItem(itemId) {
        return this.leftHand?.type.id === itemId || this.rightHand?.type.id === itemId;
      },
      swapHands() {
        const temp = this.leftHand;
        this.leftHand = this.rightHand;
        this.rightHand = temp;
      },
      isFull() {
        return this.leftHand !== null && this.rightHand !== null;
      },
      equipBackpack(type) {
        this.backpack = type;
        this.storage = [];
      },
      unequipBackpack() {
        const bp = this.backpack;
        this.backpack = null;
        this.storage = [];
        return bp;
      },
      addToStorage(itemId) {
        if (!this.backpack) return false;
        const capacity = this.backpack.storageCapacity ?? 6;
        if (this.storage.length >= capacity) return false;
        this.storage.push(itemId);
        return true;
      },
      removeFromStorage(itemId) {
        const idx = this.storage.indexOf(itemId);
        if (idx === -1) return null;
        this.storage.splice(idx, 1);
        return itemId;
      },
      clear() {
        this.leftHand = null;
        this.rightHand = null;
        this.backpack = null;
        this.storage = [];
      }
    };
  }

  // src/notifications.ts
  var activeCount = 0;
  function showNotification(text, { duration = 2e3, theme = "default", container } = {}) {
    const parent = container || document.body;
    const themes = {
      default: {
        bg: "#3a4466",
        color: "#ffffff",
        border: "0 0 0 4px #6a7a9a, 0 0 0 8px #4a5a7a, 0 0 0 12px #2a3a5a"
      },
      locked: {
        bg: "#5a4a2a",
        color: "#ffd700",
        border: "0 0 0 4px #8a7a5a, 0 0 0 8px #6a5a3a, 0 0 0 12px #4a3a1a"
      },
      item: {
        bg: "#2a4a2a",
        color: "#90ee90",
        border: "0 0 0 4px #4a8a4a, 0 0 0 8px #3a6a3a, 0 0 0 12px #2a4a2a"
      }
    };
    const t = themes[theme] || themes.default;
    const offset = activeCount * 50;
    activeCount++;
    const el = document.createElement("div");
    el.style.cssText = `
        position: absolute;
        top: ${120 + offset}px;
        left: 50%;
        transform: translateX(-50%);
        background: ${t.bg};
        color: ${t.color};
        padding: 16px 24px;
        font-family: 'Press Start 2P', monospace;
        font-size: 11px;
        text-transform: lowercase;
        z-index: 1000;
        box-shadow: ${t.border}, 0 12px 0 0 rgba(0,0,0,0.3), 0 16px 0 0 rgba(0,0,0,0.2);
    `;
    el.textContent = text;
    parent.appendChild(el);
    let timerId = setTimeout(() => {
      el.remove();
      activeCount--;
    }, duration);
    return {
      cancel() {
        clearTimeout(timerId);
        el.remove();
        activeCount--;
      }
    };
  }

  // src/health.ts
  var onGameOverCallback = null;
  function setOnGameOverCallback(fn) {
    onGameOverCallback = fn;
  }
  function damagePlayer(amount) {
    if (amount <= 0) return;
    const wasAlive = player.health > 0;
    player.health = Math.max(0, player.health - amount);
    engine.emit("health-changed", { health: player.health, maxHealth: player.maxHealth });
    if (wasAlive && player.health <= 0) {
      engine.emit("player-died", { health: player.health });
      if (onGameOverCallback) onGameOverCallback();
    }
  }
  function healPlayer(amount) {
    if (amount <= 0) return;
    player.health = Math.min(player.maxHealth, player.health + amount);
    engine.emit("health-changed", { health: player.health, maxHealth: player.maxHealth });
  }
  function createDamageCooldown(frames = 60) {
    let cooldown = 0;
    return {
      canDamage() {
        return cooldown === 0;
      },
      recordHit() {
        cooldown = frames;
      },
      tick() {
        if (cooldown > 0) cooldown--;
      }
    };
  }

  // src/types.ts
  var DIRECTION_VECTORS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 }
  };

  // src/transitions.ts
  function lockPosition(facing, tileSize = 16) {
    player.positionLocked = true;
    if (facing) {
      player.direction = facing;
      player.facingX = DIRECTION_VECTORS[facing].x;
      player.facingY = DIRECTION_VECTORS[facing].y;
    }
    if (canvas) {
      camera.x = player.x * tileSize - canvas.width / 2;
      camera.y = player.y * tileSize - canvas.height / 2;
    }
    setTimeout(() => {
      player.positionLocked = false;
    }, 1);
  }
  function transitionTo({ mapName, maps, x, y, facing, tileSize = 16 }) {
    setTransitionCooldown(30);
    setCurrentMap(mapName);
    const mapData = maps[mapName] ?? [];
    setMap(mapData);
    player.x = x;
    player.y = y;
    lockPosition(facing, tileSize);
    engine.emit("map-changed", { mapName, map: mapData });
  }

  // src/animation.ts
  function createAnimationCounter({ frames, interval }) {
    let frame = 0;
    let counter = 0;
    return {
      update() {
        counter++;
        if (counter >= interval) {
          frame = (frame + 1) % frames;
          counter = 0;
        }
        return frame;
      },
      get frame() {
        return frame;
      },
      reset() {
        frame = 0;
        counter = 0;
      }
    };
  }

  // src/detection.ts
  function getEntityInFront(player2, entities, opts = {}) {
    const { map: map2, threshold = 0.8, filter } = opts;
    const targetX = player2.x + player2.facingX;
    const targetY = player2.y + player2.facingY;
    for (const entity of entities) {
      if (map2 && entity.map !== map2) continue;
      if (filter && !filter(entity)) continue;
      const dx = entity.x - targetX;
      const dy = entity.y - targetY;
      if (dx * dx + dy * dy < threshold) {
        return entity;
      }
    }
    return null;
  }
  function isFacingProp(player2, prop) {
    const facingX = Math.floor(player2.x + player2.facingX);
    const facingY = Math.floor(player2.y + player2.facingY);
    if (prop.width && prop.height) {
      for (let dy = 0; dy < prop.height; dy++) {
        for (let dx = 0; dx < prop.width; dx++) {
          if (facingX === prop.x + dx && facingY === prop.y + dy) {
            return true;
          }
        }
      }
      return false;
    }
    return facingX === prop.x && facingY === prop.y;
  }
  function isNearProp(player2, prop, threshold = 2) {
    if (prop.width && prop.height) {
      for (let dy = 0; dy < prop.height; dy++) {
        for (let dx = 0; dx < prop.width; dx++) {
          const distance2 = Math.abs(player2.x - (prop.x + dx)) + Math.abs(player2.y - (prop.y + dy));
          if (distance2 < threshold) return true;
        }
      }
      return false;
    }
    const distance = Math.abs(player2.x - prop.x) + Math.abs(player2.y - prop.y);
    return distance < threshold;
  }

  // src/props.ts
  function generatePropCollisionTiles(props) {
    const tiles = [];
    for (const prop of props) {
      if (prop.visible === false) continue;
      if (prop.solidTiles && prop.solidTiles.length > 0) {
        for (const solid of prop.solidTiles) {
          tiles.push({ x: prop.x + solid.dx, y: prop.y + solid.dy });
        }
      } else if (prop.collidable === true) {
        tiles.push({ x: prop.x, y: prop.y });
      }
    }
    return tiles;
  }

  // src/items.ts
  function createItemRegistry() {
    const types = /* @__PURE__ */ new Map();
    return {
      register(typeDef) {
        types.set(typeDef.id, typeDef);
      },
      get(id) {
        return types.get(id) || null;
      },
      isQuest(id) {
        return types.get(id)?.required === true;
      },
      canDrop(id) {
        return types.get(id)?.canDrop !== false;
      },
      canStore(id) {
        return types.get(id)?.canStore !== false;
      },
      all() {
        return [...types.values()];
      }
    };
  }
  function createWorldItems() {
    const items = /* @__PURE__ */ new Map();
    return {
      addItem(mapName, itemId, x, y) {
        if (!items.has(mapName)) items.set(mapName, []);
        const item = { itemId, x, y };
        items.get(mapName).push(item);
        engine.emit("world-item-added", { mapName, item });
        return item;
      },
      getItems(mapName) {
        return items.get(mapName) || [];
      },
      checkPickup(playerX, playerY, mapName, radius = 1.5) {
        const mapItems = items.get(mapName) || [];
        for (const item of mapItems) {
          const dx = Math.abs(playerX - item.x);
          const dy = Math.abs(playerY - item.y);
          if (dx < radius && dy < radius) {
            return item;
          }
        }
        return null;
      },
      pickup(item, inventory) {
        const added = inventory.addItem({ type: { id: item.itemId } });
        if (added) {
          this.remove(item);
          engine.emit("world-item-picked", { item });
          return true;
        }
        return false;
      },
      remove(item) {
        for (const [mapName, mapItems] of items) {
          const idx = mapItems.indexOf(item);
          if (idx !== -1) {
            mapItems.splice(idx, 1);
            engine.emit("world-item-removed", { mapName, item });
            return true;
          }
        }
        return false;
      },
      clear(mapName) {
        if (mapName) {
          items.delete(mapName);
        } else {
          items.clear();
        }
      }
    };
  }

  // src/entities.ts
  function createEntityManager() {
    const npcs = [];
    const enemies = [];
    return {
      addNPC(data) {
        const npc = {
          x: data.x,
          y: data.y,
          width: data.width ?? 1,
          height: data.height ?? 1,
          name: data.name || "",
          type: data.type || "npc",
          map: data.map || "default",
          direction: data.direction || "down",
          dialogue: data.dialogue || []
        };
        npcs.push(npc);
        return npc;
      },
      addEnemy(data) {
        const enemy = {
          x: data.x,
          y: data.y,
          width: data.width ?? 1,
          height: data.height ?? 1,
          map: data.map || "default",
          type: data.type || "enemy",
          direction: data.direction ?? 1,
          moveCounter: 0,
          moveSpeed: data.moveSpeed ?? 60,
          patrolRange: data.patrolRange ?? 5,
          startX: data.x,
          startY: data.y,
          damage: data.damage ?? 10
        };
        enemies.push(enemy);
        return enemy;
      },
      getNPCs(mapName) {
        return mapName ? npcs.filter((n) => n.map === mapName) : [...npcs];
      },
      getEnemies(mapName) {
        return mapName ? enemies.filter((e) => e.map === mapName) : [...enemies];
      },
      updateEnemies(mapName, isSolidFn, dt = 1) {
        for (const enemy of enemies) {
          if (enemy.map !== mapName) continue;
          enemy.moveCounter += dt;
          if (enemy.moveCounter >= enemy.moveSpeed) {
            enemy.moveCounter = 0;
            const nextX = enemy.x + enemy.direction;
            if (!isSolidFn(nextX, enemy.y) && Math.abs(nextX - enemy.startX) <= enemy.patrolRange) {
              enemy.x = nextX;
            } else {
              enemy.direction *= -1;
            }
          }
        }
      },
      checkEnemyCollisions(playerX, playerY, mapName, damageCallback) {
        for (const enemy of enemies) {
          if (enemy.map !== mapName) continue;
          const dx = Math.abs(playerX - enemy.x);
          const dy = Math.abs(playerY - enemy.y);
          if (dx < 1 && dy < 1) {
            damageCallback(enemy.damage);
            engine.emit("enemy-collision", { enemy });
            return enemy;
          }
        }
        return null;
      },
      getNPCInFront(player2, mapName, threshold = 0.8) {
        const targetX = player2.x + player2.facingX;
        const targetY = player2.y + player2.facingY;
        for (const npc of npcs) {
          if (npc.map !== mapName) continue;
          const dx = npc.x - targetX;
          const dy = npc.y - targetY;
          if (dx * dx + dy * dy < threshold) {
            return npc;
          }
        }
        return null;
      }
    };
  }

  // src/dialogue.ts
  function createDialogueSystem() {
    let active = false;
    let speaker = null;
    let lines = [];
    let lineIndex = 0;
    let choices = [];
    let choiceIndex = 0;
    let choicesMade = false;
    let onClose = null;
    function getState() {
      return {
        active,
        speaker,
        lines,
        lineIndex,
        currentLine: lines[lineIndex] || null,
        choices,
        choiceIndex,
        choicesMade,
        hasMoreLines: lineIndex < lines.length - 1,
        showChoices: choices.length > 0 && !choicesMade && lineIndex >= lines.length - 1
      };
    }
    return {
      show(speakerData, opts = {}) {
        speaker = speakerData;
        lines = Array.isArray(speakerData.dialogue) ? speakerData.dialogue : [speakerData.dialogue || ""];
        lineIndex = 0;
        choices = opts.choices || [];
        choiceIndex = 0;
        choicesMade = false;
        onClose = opts.onClose || null;
        active = true;
        engine.emit("dialogue-start", { speaker, line: lines[0] });
      },
      advance() {
        if (!active) return;
        if (choices.length > 0 && !choicesMade && lineIndex >= lines.length - 1) {
          return;
        }
        lineIndex++;
        if (lineIndex >= lines.length) {
          if (choices.length > 0 && !choicesMade) {
            engine.emit("dialogue-choices", { choices });
          } else {
            this.close();
          }
        } else {
          engine.emit("dialogue-line", { speaker, line: lines[lineIndex] });
        }
      },
      moveChoice(dir) {
        if (!active || choices.length === 0) return;
        choiceIndex = (choiceIndex + dir + choices.length) % choices.length;
      },
      selectChoice() {
        if (!active || choices.length === 0 || choicesMade) return;
        choicesMade = true;
        const choice = choices[choiceIndex];
        this.close();
        if (choice?.callback) choice.callback();
      },
      close() {
        if (!active) return;
        active = false;
        const cb = onClose;
        onClose = null;
        speaker = null;
        lines = [];
        lineIndex = 0;
        choices = [];
        choiceIndex = 0;
        choicesMade = false;
        engine.emit("dialogue-close");
        if (cb) cb();
      },
      isActive() {
        return active;
      },
      getState
    };
  }

  // src/interactions.ts
  function createInteractionManager() {
    const sources = [];
    let currentPrompt = null;
    return {
      register(source) {
        sources.push(source);
        sources.sort((a, b) => b.priority - a.priority);
      },
      unregister(name) {
        const idx = sources.findIndex((s) => s.name === name);
        if (idx !== -1) sources.splice(idx, 1);
      },
      handleInteraction(player2, context = {}) {
        for (const source of sources) {
          if (source.handler(player2, context)) {
            engine.emit("interaction-handled", { source: source.name, player: player2 });
            return true;
          }
        }
        engine.emit("interaction-none", { player: player2 });
        return false;
      },
      updatePrompt(player2, context = {}) {
        for (const source of sources) {
          if (source.promptFn) {
            const prompt = source.promptFn(player2, context);
            if (prompt) {
              if (currentPrompt !== prompt) {
                currentPrompt = prompt;
                engine.emit("prompt-show", { text: prompt, source: source.name });
              }
              return;
            }
          }
        }
        if (currentPrompt !== null) {
          currentPrompt = null;
          engine.emit("prompt-hide");
        }
      },
      getPrompt() {
        return currentPrompt;
      },
      getSources() {
        return [...sources];
      }
    };
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map