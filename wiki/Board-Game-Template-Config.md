Full reference for `BoardGameTemplate.render(config)`.

---

## Usage

```html
<script src="../shared/board-game-template.js"></script>
<script>
BoardGameTemplate.render({
    title: 'CHESS',
    subtitle: '// NEON EDITION //',
    // ...
});
</script>
```

The template generates the complete page HTML: start screen, game screen, modals (instructions, credits, game over), multiplayer lobby, and script loading.

---

## Config Options

### Core

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `title` | string | `'GAME'` | Game title displayed on start screen and game header |
| `subtitle` | string | `'// NEON EDITION //'` | Subtitle below title |
| `footer` | array | `['CLASSIC BOARD GAME']` | Footer lines on start screen |

### Buttons

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `buttons` | array | See below | Start screen buttons |
| `gameControls` | array | `[{id:'newGameBtn', label:'NEW GAME'}, {id:'menuBtn', label:'MENU'}]` | Game screen control buttons |

#### buttons[] format

```js
{
    id: 'startGameBtn',     // Button element ID
    label: 'CLICK TO START', // Button text
    cls: 'primary',          // Optional CSS class
    icon: '▶'               // Optional icon prefix
}
```

Default buttons:
```js
[
    { id: 'startGameBtn', label: '▶  CLICK OR PRESS SPACE TO START', cls: 'primary' },
    { id: 'helpBtn', label: 'HOW TO PLAY' },
    { id: 'creditsBtn', label: 'CREDITS' }
]
```

### Game Layout

| Key | Type | Description |
|-----|------|-------------|
| `gameHeader` | HTML | Extra stat items in game header (beyond default TURN indicator) |
| `gameBody` | HTML | Content inside game layout (after board-area) |

### Modals

| Key | Type | Description |
|-----|------|-------------|
| `instructions` | HTML | Instructions modal body |
| `credits` | HTML | Credits modal body |
| `gameOverTitle` | string | Game over modal title (default: `'YOU WIN!'`) |
| `gameOverMsg` | string | Game over modal message (default: `'Congratulations!'`) |

### Multiplayer

| Key | Type | Description |
|-----|------|-------------|
| `mpServer` | string | WebSocket server URL (e.g. `'ws://magmacrunch.duckdns.org:8769'`) |

When set, the template:
- Adds `MP_DEFAULT_SERVER` global
- Loads `protocol.js` and `network.js`
- Generates the lobby overlay HTML

### Scripts & Head

| Key | Type | Description |
|-----|------|-------------|
| `scripts` | array | Script paths to load after shared deps |
| `extraHead` | HTML | Extra content in `<head>` |
| `extraStart` | HTML | Extra content after start buttons |

---

## Generated HTML Structure

```
#startScreen
├── .start-content
│   ├── h1.game-title
│   ├── p.game-subtitle
│   ├── .start-divider
│   ├── .start-buttons (from config.buttons)
│   ├── [extraStart]
│   └── .start-footer (from config.footer)

#gameScreen (hidden initially)
├── .game-header
│   ├── h1 (title with arrows)
│   └── .game-stats
│       ├── .stat-item (TURN)
│       └── [gameHeader]
├── .game-layout
│   ├── .board-area
│   │   └── #boardContainer
│   └── [gameBody]
├── .message-area
│   └── #gameMessage
└── .game-controls (from config.gameControls)

#lobbyOverlay (multiplayer)
#instructionsModal
#creditsModal
#gameOverModal
```

---

## Example: Chess

```js
BoardGameTemplate.render({
    title: 'CHESS',
    subtitle: '// NEON EDITION //',
    footer: ['CLASSIC BOARD GAME', 'VS AI OR MULTIPLAYER'],
    mpServer: 'ws://magmacrunch.duckdns.org:8769',
    scripts: ['js/config.js', 'js/main.js'],
    instructions: '<h3>Rules</h3><p>Standard chess rules apply.</p>',
    credits: '<h3>Chess</h3><p>Design & Development: Jake A. McCoy</p>'
});
```

---

## Example: Checkers with Custom Stats

```js
BoardGameTemplate.render({
    title: 'CHECKERS',
    subtitle: '// NEON EDITION //',
    footer: ['CLASSIC BOARD GAME', 'VS AI'],
    gameHeader: '<div class="stat-item"><span class="stat-label">PIECES</span><span class="stat-value" id="pieceCount">12</span></div>',
    scripts: ['js/config.js', 'js/main.js']
});
``` 
