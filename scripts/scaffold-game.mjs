#!/usr/bin/env node

/**
 * scaffold-game.mjs
 *
 * Generates boilerplate files for a new arcade game.
 *
 * Usage: node scripts/scaffold-game.mjs
 *
 * Reads config from scripts/new-game.json:
 * {
 *   "name": "othello",
 *   "title": "OTHELLO",
 *   "category": "puzzles",
 *   "description": "Classic Othello with neon theme"
 * }
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ARCADE_DIR = join(ROOT, 'arcade');

// ── Load config ──────────────────────────────────────────────────

const configPath = join(__dirname, 'new-game.json');
const config = JSON.parse(readFileSync(configPath, 'utf8'));

const { name, title, category, description } = config;

if (!name || !title) {
  console.error('Error: name and title are required in scripts/new-game.json');
  process.exit(1);
}

const gameDir = join(ARCADE_DIR, name);

if (existsSync(gameDir)) {
  console.error(`Error: arcade/${name}/ already exists`);
  process.exit(1);
}

console.log(`Scaffolding game: ${title} (${name})`);
console.log(`Category: ${category}`);
console.log('');

// ── Create directory structure ───────────────────────────────────

mkdirSync(join(gameDir, 'css'), { recursive: true });
mkdirSync(join(gameDir, 'js'), { recursive: true });

// ── Generate index.html ──────────────────────────────────────────

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="favicon.svg">

    <style>
        :root {
            --mc-back-color: #00f5ff;
            --mc-back-glow: 0 0 8px rgba(0, 245, 255, 0.95);
        }
        body.game-active .mc-back,
        .container.game-active .mc-back {
            display: none;
        }
    </style>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="../shared/arcade-base.css">
    <link rel="stylesheet" href="css/base.css">
    <link rel="stylesheet" href="css/game.css">
</head>
<body>
    <a href="../" class="mc-back">magmacrunch arcade</a>

    <div class="container">
        <div class="header">
            <h1>${title}</h1>
            <div class="subtitle">${description}</div>
        </div>

        <div class="game-area">
            <canvas id="gameCanvas" width="400" height="400"></canvas>
        </div>

        <div class="controls">
            <button id="startBtn" class="btn btn-primary">START</button>
            <button id="helpBtn" class="btn">HELP</button>
        </div>

        <div class="score-display">
            <div class="score-label">SCORE</div>
            <div class="score-value" id="score">0</div>
        </div>
    </div>

    <!-- Help Modal -->
    <div class="modal" id="helpModal">
        <div class="modal-content">
            <h2>HOW TO PLAY</h2>
            <p>Game instructions go here.</p>
            <button id="closeHelp" class="btn">CLOSE</button>
        </div>
    </div>

    <!-- Adenosine packages. Add others as needed (adenosine-cards.js,
         adenosine-puzzle.js, adenosine-rpg.js, adenosine-audio.js).
         Run \`npm run build:adenosine\` to sync bundles and stamp cache-busters. -->
    <script src="../shared/adenosine-score-client.js"></script>
    <script>const scoreClient = new AdScore.ScoreClient().auto();</script>

    <!-- Game Scripts -->
    <script src="js/config.js"></script>
    <script src="js/game.js"></script>
    <script src="js/main.js"></script>

    <!-- Chat Widget -->
    <link rel="stylesheet" href="../shared/chat-widget.css">
    <script src="../shared/chat-widget.js"></script>
    <script>ChatWidget.connect();</script>
</body>
</html>`;

writeFileSync(join(gameDir, 'index.html'), indexHtml);
console.log('  created: index.html');

// ── Generate favicon.svg ─────────────────────────────────────────

const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#080808"/>
  <rect x="4" y="4" width="24" height="24" fill="#00f5ff" rx="2"/>
  <text x="16" y="22" font-family="monospace" font-size="14" fill="#080808" text-anchor="middle" font-weight="bold">${title[0]}</text>
</svg>`;

writeFileSync(join(gameDir, 'favicon.svg'), faviconSvg);
console.log('  created: favicon.svg');

// ── Generate CSS files ───────────────────────────────────────────

const baseCss = `/* Base styles for ${title} */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: #080808;
    color: #f0ead8;
    font-family: 'Press Start 2P', monospace;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.container {
    max-width: 800px;
    width: 100%;
    padding: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
}

.header {
    text-align: center;
}

.header h1 {
    font-size: 24px;
    color: #00f5ff;
    text-shadow: 0 0 10px rgba(0, 245, 255, 0.5);
    margin-bottom: 8px;
}

.header .subtitle {
    font-size: 10px;
    color: #888;
}

.game-area {
    display: flex;
    justify-content: center;
}

canvas {
    border: 2px solid #00f5ff;
    box-shadow: 0 0 20px rgba(0, 245, 255, 0.3);
}

.controls {
    display: flex;
    gap: 12px;
}

.btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 10px;
    padding: 12px 24px;
    border: 2px solid #00f5ff;
    background: transparent;
    color: #00f5ff;
    cursor: pointer;
    transition: all 0.2s;
}

.btn:hover {
    background: #00f5ff;
    color: #080808;
}

.btn-primary {
    background: #00f5ff;
    color: #080808;
}

.btn-primary:hover {
    background: #00c8cc;
}

.score-display {
    text-align: center;
}

.score-label {
    font-size: 10px;
    color: #888;
    margin-bottom: 4px;
}

.score-value {
    font-size: 20px;
    color: #ffe03a;
    text-shadow: 0 0 10px rgba(255, 224, 58, 0.5);
}

/* Modal */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    justify-content: center;
    align-items: center;
    z-index: 100;
}

.modal.active {
    display: flex;
}

.modal-content {
    background: #1a1a1a;
    border: 2px solid #00f5ff;
    padding: 30px;
    max-width: 500px;
    text-align: center;
}

.modal-content h2 {
    font-size: 16px;
    color: #00f5ff;
    margin-bottom: 16px;
}

.modal-content p {
    font-size: 10px;
    line-height: 1.8;
    margin-bottom: 16px;
}
`;

writeFileSync(join(gameDir, 'css', 'base.css'), baseCss);
console.log('  created: css/base.css');

const gameCss = `/* Game-specific styles for ${title} */

.game-area {
    position: relative;
}

canvas {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
}
`;

writeFileSync(join(gameDir, 'css', 'game.css'), gameCss);
console.log('  created: css/game.css');

// ── Generate JS files ────────────────────────────────────────────

const configJs = `// Game configuration for ${title}

const CONFIG = {
    CANVAS_WIDTH: 400,
    CANVAS_HEIGHT: 400,
    GRID_SIZE: 20,
    FPS: 60,
    COLORS: {
        BACKGROUND: '#080808',
        PRIMARY: '#00f5ff',
        SECONDARY: '#ffe03a',
        ACCENT: '#ff3d6e',
    }
};
`;

writeFileSync(join(gameDir, 'js', 'config.js'), configJs);
console.log('  created: js/config.js');

const gameJs = `// Core game logic for ${title}

class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.score = 0;
        this.running = false;
        this.gameOver = false;
    }

    init() {
        this.score = 0;
        this.running = true;
        this.gameOver = false;
        // Initialize game state here
    }

    update() {
        if (!this.running || this.gameOver) return;
        // Update game state here
    }

    render() {
        this.ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        // Render game here
    }

    handleInput(key) {
        // Handle keyboard input here
    }

    checkGameOver() {
        // Check game over conditions here
    }

    start() {
        this.init();
        this.loop();
    }

    loop() {
        this.update();
        this.render();
        if (this.running) {
            requestAnimationFrame(() => this.loop());
        }
    }

    stop() {
        this.running = false;
    }
}
`;

writeFileSync(join(gameDir, 'js', 'game.js'), gameJs);
console.log('  created: js/game.js');

const mainJs = `// DOM wiring and UI for ${title}

(function() {
    const canvas = document.getElementById('gameCanvas');
    const game = new Game(canvas);
    const scoreEl = document.getElementById('score');
    const startBtn = document.getElementById('startBtn');
    const helpBtn = document.getElementById('helpBtn');
    const helpModal = document.getElementById('helpModal');
    const closeHelp = document.getElementById('closeHelp');

    // Start game
    startBtn.addEventListener('click', () => {
        document.body.classList.add('game-active');
        game.start();
        startBtn.textContent = 'RESTART';
    });

    // Help modal
    helpBtn.addEventListener('click', () => {
        helpModal.classList.add('active');
    });

    closeHelp.addEventListener('click', () => {
        helpModal.classList.remove('active');
    });

    // Keyboard input
    document.addEventListener('keydown', (e) => {
        if (game.running) {
            game.handleInput(e.key);
        }
    });

    // Update score display
    setInterval(() => {
        if (game.running) {
            scoreEl.textContent = game.score;
        }
    }, 100);
})();
`;

writeFileSync(join(gameDir, 'js', 'main.js'), mainJs);
console.log('  created: js/main.js');

// ── Summary ──────────────────────────────────────────────────────

console.log('');
console.log(`Game scaffolded at arcade/${name}/`);
console.log('');
console.log('Next steps:');
console.log(`  1. Edit arcade/${name}/js/game.js — implement game logic`);
console.log(`  2. Edit arcade/${name}/js/main.js — wire up UI`);
console.log(`  3. Add card to arcade/${category}/index.html`);
console.log(`  4. Run: node scripts/build-search-index.js`);
