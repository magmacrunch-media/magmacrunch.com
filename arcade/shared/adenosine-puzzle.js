"use strict";
var AdPuzzle = (() => {
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
    PuzzleGrid: () => puzzle_grid_exports,
    createGame: () => create2,
    createInput: () => create3,
    createRenderer: () => create4,
    createScoring: () => create5,
    createUI: () => create6
  });

  // src/puzzle-grid.ts
  var puzzle_grid_exports = {};
  __export(puzzle_grid_exports, {
    clone: () => clone,
    countValue: () => countValue,
    create: () => create,
    equals: () => equals,
    findCell: () => findCell,
    getEmptyCells: () => getEmptyCells,
    getMaxValue: () => getMaxValue,
    getValues: () => getValues,
    gridToString: () => gridToString,
    hasAdjacentMatches: () => hasAdjacentMatches,
    isFull: () => isFull,
    isSolved: () => isSolved,
    rotate: () => rotate,
    swap: () => swap
  });
  function cell(board, r, c) {
    return board[r][c];
  }
  function setCell(board, r, c, val) {
    board[r][c] = val;
  }
  function create(cols, rows) {
    rows = rows ?? cols;
    const board = [];
    for (let r = 0; r < rows; r++) {
      board[r] = [];
      for (let c = 0; c < cols; c++) {
        board[r][c] = 0;
      }
    }
    return { size: cols, cols, rows, board };
  }
  function clone(grid) {
    const copy = [];
    for (let r = 0; r < grid.rows; r++) {
      copy[r] = grid.board[r].slice();
    }
    return { size: grid.size, cols: grid.cols, rows: grid.rows, board: copy };
  }
  function getEmptyCells(grid) {
    const cells = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (cell(grid.board, r, c) === 0) {
          cells.push({ row: r, col: c });
        }
      }
    }
    return cells;
  }
  function isFull(grid) {
    return getEmptyCells(grid).length === 0;
  }
  function rotate(grid, times = 1) {
    if (grid.cols !== grid.rows) {
      console.warn("PuzzleGrid.rotate: rotation not supported for non-square grids");
      return;
    }
    for (let t = 0; t < times; t++) {
      const newBoard = [];
      for (let r = 0; r < grid.size; r++) {
        newBoard[r] = [];
      }
      for (let r = 0; r < grid.size; r++) {
        for (let c = 0; c < grid.size; c++) {
          setCell(newBoard, c, grid.size - 1 - r, cell(grid.board, r, c));
        }
      }
      grid.board = newBoard;
    }
  }
  function equals(grid1, grid2) {
    if (grid1.cols !== grid2.cols || grid1.rows !== grid2.rows) return false;
    for (let r = 0; r < grid1.rows; r++) {
      for (let c = 0; c < grid1.cols; c++) {
        if (cell(grid1.board, r, c) !== cell(grid2.board, r, c)) return false;
      }
    }
    return true;
  }
  function hasAdjacentMatches(grid) {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const val = cell(grid.board, r, c);
        if (val === 0) continue;
        if (c < grid.cols - 1 && cell(grid.board, r, c + 1) === val) return true;
        if (r < grid.rows - 1 && cell(grid.board, r + 1, c) === val) return true;
      }
    }
    return false;
  }
  function getValues(grid) {
    const values = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const v = cell(grid.board, r, c);
        if (v !== 0) values.push(v);
      }
    }
    return values;
  }
  function getMaxValue(grid) {
    let max = 0;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const v = cell(grid.board, r, c);
        if (v > max) max = v;
      }
    }
    return max;
  }
  function countValue(grid, value) {
    let count = 0;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (cell(grid.board, r, c) === value) count++;
      }
    }
    return count;
  }
  function findCell(grid, value) {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (cell(grid.board, r, c) === value) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }
  function swap(grid, r1, c1, r2, c2) {
    const temp = cell(grid.board, r1, c1);
    setCell(grid.board, r1, c1, cell(grid.board, r2, c2));
    setCell(grid.board, r2, c2, temp);
  }
  function isSolved(grid, targetBoard) {
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        if (cell(grid.board, r, c) !== cell(targetBoard, r, c)) return false;
      }
    }
    return true;
  }
  function gridToString(grid) {
    let s = "";
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const v = cell(grid.board, r, c);
        s += v === 0 ? "." : v;
        s += "	";
      }
      s += "\n";
    }
    return s;
  }

  // src/puzzle-game.ts
  function create2(config = {}) {
    const size = config.size ?? 4;
    const difficulty = config.difficulty ?? "normal";
    const gameName = config.gameName ?? "puzzle";
    const spawnTiles = config.spawnTiles ?? true;
    let _grid = null;
    let _score = 0;
    let _moves = 0;
    let _gameOver = false;
    let _won = false;
    let _startTime = null;
    let _endTime = null;
    let _lastDirection = null;
    let onRender = null;
    let onStateChange = null;
    let onGameOver = null;
    let onWin = null;
    const api = {
      get size() {
        return size;
      },
      get difficulty() {
        return difficulty;
      },
      get gameName() {
        return gameName;
      },
      get spawnTiles() {
        return spawnTiles;
      },
      get lastDirection() {
        return _lastDirection;
      },
      get grid() {
        return _grid;
      },
      set grid(val) {
        _grid = val;
      },
      get score() {
        return _score;
      },
      set score(val) {
        _score = val;
        api.notifyStateChange();
      },
      get moves() {
        return _moves;
      },
      set moves(val) {
        _moves = val;
      },
      get gameOver() {
        return _gameOver;
      },
      set gameOver(val) {
        _gameOver = val;
      },
      get won() {
        return _won;
      },
      set won(val) {
        _won = val;
      },
      get startTime() {
        return _startTime;
      },
      get endTime() {
        return _endTime;
      },
      set endTime(val) {
        _endTime = val;
      },
      addRandomTile() {
      },
      moveLeft() {
      },
      checkWin() {
        return false;
      },
      checkGameState() {
        if (api.checkWin()) {
          _won = true;
          _endTime = Date.now();
          if (onWin) onWin(api);
          api.notifyStateChange();
          return;
        }
        if (isFull(_grid) && !hasAdjacentMatches(_grid)) {
          _gameOver = true;
          _endTime = Date.now();
          if (onGameOver) onGameOver(api);
          api.notifyStateChange();
        }
      },
      addInitialTiles() {
        api.addRandomTile();
        api.addRandomTile();
      },
      init() {
        _grid = create(size);
        _score = 0;
        _moves = 0;
        _gameOver = false;
        _won = false;
        _startTime = Date.now();
        _endTime = null;
        api.addInitialTiles();
        api.render();
      },
      isActive() {
        return !_gameOver && !_won;
      },
      getElapsedTime() {
        if (!_startTime) return 0;
        const end = _endTime || Date.now();
        return Math.floor((end - _startTime) / 1e3);
      },
      handleMove(direction) {
        if (!api.isActive()) return false;
        const original = clone(_grid);
        api.moveInDirection(direction);
        const moved = !equals(_grid, original);
        if (moved) {
          _moves++;
          _lastDirection = direction;
          if (spawnTiles) {
            api.addRandomTile();
          }
          api.checkGameState();
          api.render();
        }
        return moved;
      },
      moveInDirection(direction) {
        switch (direction) {
          case "left":
            api.moveLeft();
            break;
          case "right":
            rotate(_grid, 2);
            api.moveLeft();
            rotate(_grid, 2);
            break;
          case "up":
            rotate(_grid, 3);
            api.moveLeft();
            rotate(_grid, 1);
            break;
          case "down":
            rotate(_grid, 1);
            api.moveLeft();
            rotate(_grid, 3);
            break;
        }
      },
      notifyStateChange() {
        if (onStateChange) {
          onStateChange({
            score: _score,
            moves: _moves,
            gameOver: _gameOver,
            won: _won,
            elapsed: api.getElapsedTime(),
            grid: _grid
          });
        }
      },
      render() {
        if (onRender) {
          onRender(api);
        }
      },
      setOnRender(cb) {
        onRender = cb;
      },
      setOnStateChange(cb) {
        onStateChange = cb;
      },
      setOnGameOver(cb) {
        onGameOver = cb;
      },
      setOnWin(cb) {
        onWin = cb;
      },
      getGrid() {
        return _grid;
      },
      setGrid(g) {
        _grid = g;
      }
    };
    return api;
  }

  // src/puzzle-input.ts
  var SWIPE_THRESHOLD = 30;
  function create3(callbacks, boardElement) {
    let touchStartX = 0;
    let touchStartY = 0;
    const listeners = [];
    function onKeyDown(e) {
      if (!callbacks.isActive()) return;
      let direction = null;
      switch (e.key) {
        case "ArrowUp":
          direction = "up";
          break;
        case "ArrowDown":
          direction = "down";
          break;
        case "ArrowLeft":
          direction = "left";
          break;
        case "ArrowRight":
          direction = "right";
          break;
      }
      if (direction) {
        e.preventDefault();
        callbacks.onMove(direction);
      }
    }
    function onTouchStart(e) {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    }
    function onTouchEnd(e) {
      if (!callbacks.isActive()) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) > SWIPE_THRESHOLD) {
        let direction;
        if (absDx > absDy) {
          direction = dx > 0 ? "right" : "left";
        } else {
          direction = dy > 0 ? "down" : "up";
        }
        callbacks.onMove(direction);
      }
    }
    function setup() {
      document.addEventListener("keydown", onKeyDown);
      listeners.push({ element: document, event: "keydown", handler: onKeyDown });
      if (boardElement) {
        boardElement.addEventListener("touchstart", onTouchStart, { passive: true });
        boardElement.addEventListener("touchend", onTouchEnd);
        listeners.push({ element: boardElement, event: "touchstart", handler: onTouchStart });
        listeners.push({ element: boardElement, event: "touchend", handler: onTouchEnd });
      }
    }
    function destroy() {
      for (const l of listeners) {
        l.element.removeEventListener(l.event, l.handler);
      }
      listeners.length = 0;
    }
    setup();
    return { destroy };
  }

  // src/puzzle-render.ts
  function create4(boardElement, config = {}) {
    const tileClass = config.tileClass ?? "tile";
    const emptyClass = config.emptyClass ?? "tile-empty";
    function renderGrid(grid, tileRenderer) {
      boardElement.innerHTML = "";
      for (let r = 0; r < grid.size; r++) {
        for (let c = 0; c < grid.size; c++) {
          const value = grid.board[r][c];
          const tile = tileRenderer ? tileRenderer(r, c, value) : createDefaultTile(r, c, value);
          boardElement.appendChild(tile);
        }
      }
    }
    function createDefaultTile(row, col, value) {
      const tile = document.createElement("div");
      tile.className = tileClass;
      tile.dataset.row = String(row);
      tile.dataset.col = String(col);
      if (value === 0) {
        tile.classList.add(emptyClass);
      } else {
        tile.textContent = String(value);
        tile.dataset.value = String(value);
      }
      return tile;
    }
    function renderGridWithSpecial(grid, getTileContent) {
      boardElement.innerHTML = "";
      for (let r = 0; r < grid.size; r++) {
        for (let c = 0; c < grid.size; c++) {
          const value = grid.board[r][c];
          const tileInfo = getTileContent(value);
          const tile = document.createElement("div");
          tile.className = tileClass;
          tile.dataset.row = String(r);
          tile.dataset.col = String(c);
          if (value === 0) {
            tile.classList.add(emptyClass);
          } else {
            tile.textContent = tileInfo.text;
            if (tileInfo.classes) {
              tileInfo.classes.forEach((cls) => tile.classList.add(cls));
            }
            if (tileInfo.attributes) {
              for (const [key, val] of Object.entries(tileInfo.attributes)) {
                tile.dataset[key] = val;
              }
            }
          }
          boardElement.appendChild(tile);
        }
      }
    }
    function updateTile(row, col, value, extraClasses) {
      const tile = boardElement.querySelector(
        `[data-row="${row}"][data-col="${col}"]`
      );
      if (!tile) return;
      tile.className = tileClass;
      tile.textContent = "";
      tile.dataset.value = "";
      if (value === 0) {
        tile.classList.add(emptyClass);
      } else {
        tile.textContent = String(value);
        tile.dataset.value = String(value);
      }
      if (extraClasses) {
        extraClasses.forEach((cls) => tile.classList.add(cls));
      }
    }
    function getTile(row, col) {
      return boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    }
    function getAllTiles() {
      return boardElement.querySelectorAll(`.${tileClass}`);
    }
    function clear() {
      boardElement.innerHTML = "";
    }
    return {
      renderGrid,
      renderGridWithSpecial,
      createDefaultTile,
      updateTile,
      getTile,
      getAllTiles,
      clear
    };
  }

  // src/puzzle-scoring.ts
  function create5(gameName, config = {}) {
    const storageKey = gameName + "_scores";
    const ascending = config.ascending ?? false;
    let scores = loadScores();
    function loadScores() {
      try {
        const data = localStorage.getItem(storageKey);
        return data ? JSON.parse(data) : [];
      } catch {
        return [];
      }
    }
    function saveScores() {
      try {
        localStorage.setItem(storageKey, JSON.stringify(scores));
      } catch {
      }
    }
    function addScore(score, difficulty, metadata = {}) {
      const entry = {
        score,
        difficulty,
        date: (/* @__PURE__ */ new Date()).toISOString(),
        moves: metadata.moves ?? 0,
        time: metadata.time ?? 0,
        highestTile: metadata.highestTile ?? 0
      };
      scores.push(entry);
      scores.sort((a, b) => ascending ? a.score - b.score : b.score - a.score);
      scores = scores.slice(0, 100);
      saveScores();
      return getRank(score, difficulty);
    }
    function getRank(score, difficulty) {
      const filtered = difficulty ? scores.filter((s) => s.difficulty === difficulty) : scores;
      for (let i = 0; i < filtered.length; i++) {
        const entry = filtered[i];
        if (ascending ? score <= entry.score : score >= entry.score) return i + 1;
      }
      return filtered.length + 1;
    }
    function getTopScores(difficulty, limit = 10) {
      const filtered = difficulty ? scores.filter((s) => s.difficulty === difficulty) : scores;
      return filtered.slice(0, limit);
    }
    function isNewHighScore(score, difficulty) {
      const topScores = getTopScores(difficulty, 10);
      if (topScores.length < 10) return true;
      const last = topScores[topScores.length - 1];
      return ascending ? score < last.score : score > last.score;
    }
    function getDifficulties() {
      const diffMap = {};
      scores.forEach((s) => {
        if (s.difficulty) diffMap[s.difficulty] = true;
      });
      return Object.keys(diffMap);
    }
    function clearScores() {
      scores = [];
      saveScores();
    }
    return {
      addScore,
      getRank,
      getTopScores,
      isNewHighScore,
      getDifficulties,
      clearScores
    };
  }

  // src/puzzle-ui.ts
  function create6() {
    const modals = {};
    function registerModal(id, element) {
      modals[id] = element;
    }
    function showModal(id) {
      if (modals[id]) {
        modals[id].classList.add("active");
      }
    }
    function hideModal(id) {
      if (modals[id]) {
        modals[id].classList.remove("active");
      }
    }
    function hideAllModals() {
      for (const id of Object.keys(modals)) {
        modals[id].classList.remove("active");
      }
    }
    function isModalOpen(id) {
      return !!(modals[id] && modals[id].classList.contains("active"));
    }
    function setupModalClose(modalId, closeButtons) {
      const modal = modals[modalId];
      if (!modal) return;
      closeButtons.forEach((btn) => {
        if (btn) {
          btn.addEventListener("click", () => hideModal(modalId));
        }
      });
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          hideModal(modalId);
        }
      });
    }
    function setupDropdown(container, selected, options, onSelect) {
      let isOpen = false;
      selected.addEventListener("click", (e) => {
        e.stopPropagation();
        isOpen = !isOpen;
        container.classList.toggle("open", isOpen);
      });
      options.forEach((option) => {
        option.addEventListener("click", () => {
          selected.textContent = option.textContent;
          selected.dataset.value = option.dataset.value ?? "";
          container.classList.remove("open");
          isOpen = false;
          if (onSelect) onSelect(option.dataset.value ?? "");
        });
      });
      document.addEventListener("click", (e) => {
        if (!container.contains(e.target)) {
          container.classList.remove("open");
          isOpen = false;
        }
      });
    }
    function $(selector) {
      return document.querySelector(selector);
    }
    function $$(selector) {
      return document.querySelectorAll(selector);
    }
    function show(element) {
      if (element) element.style.display = "";
    }
    function hide(element) {
      if (element) element.style.display = "none";
    }
    function setText(element, text) {
      if (element) element.textContent = text;
    }
    function setHTML(element, html) {
      if (element) element.innerHTML = html;
    }
    function formatTime(seconds) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m}:${s < 10 ? "0" : ""}${s}`;
    }
    function formatScore(score) {
      return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    return {
      registerModal,
      showModal,
      hideModal,
      hideAllModals,
      isModalOpen,
      setupModalClose,
      setupDropdown,
      $,
      $$,
      show,
      hide,
      setText,
      setHTML,
      formatTime,
      formatScore
    };
  }
  return __toCommonJS(index_exports);
})();
//# sourceMappingURL=index.global.js.map