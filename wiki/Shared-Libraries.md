Reusable code in `arcade/shared/` used across multiple games.

---

## Directory Structure

```
arcade/shared/
├── adenosine-audio.js          # @adenosine/audio IIFE build (Web Audio API music + SFX)
├── adenosine-cards.js          # @adenosine/cards IIFE build (card deck, rendering, cribbage eval)
├── adenosine-chat.js           # @adenosine/chat IIFE build (floating real-time chat widget)
├── adenosine-multiplayer.js    # @adenosine/multiplayer IIFE build (WebSocket client)
├── adenosine-puzzle.js         # @adenosine/puzzle IIFE build (puzzle framework)
├── adenosine-rpg.js            # @adenosine/rpg IIFE build (game loop, input, state)
├── adenosine-score-client.js   # @adenosine/score-client IIFE build
├── arcade-base.css             # Base styles for all arcade pages
├── board-game-template.js      # Reusable board game rendering
├── cards/
│   └── cards.css               # Card rendering styles
├── chat-server.js              # Chat server (Node.js)
├── chat-widget.css             # Chat widget styles
├── chat-worker.js              # SharedWorker for chat
├── chips/
│   └── chip-animation.css      # Poker chip animation styles
├── decks/                      # Card deck JSON definitions
│   ├── index.json
│   ├── magmacrunch-v1.deck.json
│   └── README.md
├── font-load.js                # Font loading helper
├── mp-server.js                # Multiplayer server (Node.js)
├── multiplayer/
│   ├── card_constants.py       # Card constants for Python servers
│   ├── lobby.css               # Lobby/waiting room UI
│   ├── server_base.py          # Python base class for game servers
│   └── README.md
├── score-server.js             # Score server (Node.js)
├── services.json               # Service port/URL registry
└── tests/
    ├── test_server_base.py     # Tests for multiplayer server base
    └── test_services.py        # Tests for services.json
```

## Adenosine Game Engine

[adenosine](https://github.com/magmacrunch-media/adenosine) provides shared game systems. Packages ship both ESM (for npm) and IIFE (for `<script>` tags). All seven bundles in `arcade/shared/adenosine-*.js` are generated — **never hand-edit them**.

### Available Globals

| Global | Package | Description |
|--------|---------|-------------|
| `AdRPG` | `@adenosine/rpg` | Game loop, input, state (`createGameLoop`, `initInput`, `keys`, `keysPressed`) |
| `AdPuzzle` | `@adenosine/puzzle` | Puzzle framework (`createGame`, `createUI`, `createScoring`, `createRenderer`, `createInput`) |
| `AdScore` | `@adenosine/score-client` | High score client (`ScoreClient`) |
| `AdCards` | `@adenosine/cards` | Card deck, rendering, cribbage hand eval (`Card`, `Deck`, `CribbageHandEval`) |
| `AdAudio` | `@adenosine/audio` | Web Audio API music + SFX (`init`, `playMusic`, `playSfx`) |
| `AdChat` | `@adenosine/chat` | Floating real-time chat widget (`ChatWidget.connect()`, `.setName()`, `.setColor()`, `.joinRoom()`) |
| `AdMP` | `@adenosine/multiplayer` | Multiplayer WebSocket client (`MP`, `MSG`, `MP_PALETTE`, `BoardGameTemplate`) |

### Loading in a Game Page

```html
<!-- RPG games (nelikko) -->
<script src="../shared/adenosine-rpg.js"></script>
<script src="../shared/adenosine-score-client.js"></script>

<!-- Puzzle games (2^N, george-boole, fifteen-puzzle, klotski, threes) -->
<script src="../shared/adenosine-score-client.js"></script>
<script>const scoreClient = new AdScore.ScoreClient().auto();</script>
<script src="../shared/adenosine-puzzle.js"></script>

<!-- Card games (cribbage, solitaire, scandinavian-stud, solitaire_THLD) -->
<script src="../shared/adenosine-cards.js"></script>
<script src="../shared/adenosine-score-client.js"></script>
<script>const scoreClient = new AdScore.ScoreClient().auto();</script>

<!-- Audio games (george-boole, moonlight-drift) -->
<script src="../shared/adenosine-audio.js"></script>

<!-- Multiplayer board games (SORRY, backgammon, checkers, chess, etc.) -->
<script src="../shared/adenosine-multiplayer.js"></script>

<!-- Chat widget (nearly every game page) -->
<script src="../shared/adenosine-chat.js"></script>
<script>const { ChatWidget } = AdChat;</script>
```

### Integration Pattern

1. Call `AdRPG.initCanvas(canvasEl)` to register the board canvas
2. Create loop: `AdRPG.createGameLoop({ update, render, fps: 30 })`
3. Use `AdRPG.keys`/`AdRPG.keysPressed` for input (with custom bindings)
4. Sync state: `AdRPG.setGameStarted()`, `setGamePaused()`, `setGameOver()`
5. Score client: `new AdScore.ScoreClient().auto()`

### IIFE Builds

`npm run build:adenosine` runs `scripts/sync-adenosine.mjs`, which:
1. copies each `node_modules/@magmacrunch/adenosine-*/dist/index.global.js` into `arcade/shared/adenosine-<pkg>.js`
2. stamps a content-hash `?v=` on every arcade `<script>` tag that loads one

The bundles are **committed on purpose** (GitHub Pages serves this repo's branch directly). Re-run and commit after any dependency change.

### Repository

[adenosine](https://github.com/magmacrunch-media/adenosine) is a monorepo (`packages/*` workspaces) published to npm as `@magmacrunch/adenosine-*`.

## Card Pipeline

Used by: solitaire, solitaire_THLD, scandinavian-stud, cribbage

```html
<link rel="stylesheet" href="../shared/cards/cards.css">
```

Provides card rendering styles. Card logic is in `adenosine-cards.js`.

## Chip Animation

Used by: solitaire_THLD, scandinavian-stud, cribbage

```html
<link rel="stylesheet" href="../shared/chips/chip-animation.css">
```

Animated poker chips for betting/scoring UI.

## Board Game Template

Reusable template for rendering board games with pieces:

```html
<script src="../shared/board-game-template.js"></script>
```

Provides board grid rendering, piece placement, and move animation.

## Chat Widget

Quick add:
```html
<link rel="stylesheet" href="../shared/chat-widget.css">
<script src="../shared/adenosine-chat.js"></script>
<script>const { ChatWidget } = AdChat; ChatWidget.connect();</script>
```

Uses a SharedWorker (`chat-worker.js`) to hold a single WebSocket connection across page navigations.

## Score Client

See [High Score System](High-Score-System) for full details.

Quick add:
```html
<script src="../shared/adenosine-score-client.js"></script>
<script>const scoreClient = new AdScore.ScoreClient().auto();</script>
```

## Multiplayer Framework

Base library for game-specific WebSocket servers:

- `multiplayer/server_base.py` — Python base class for servers
- `multiplayer/card_constants.py` — card constants for Python servers
- `multiplayer/lobby.css` — lobby/waiting room UI
- `mp-server.js` — Node.js multiplayer server
- `chat-server.js` — Node.js chat server
- `score-server.js` — Node.js score server
- `adenosine-multiplayer.js` — WebSocket client (IIFE build of `@adenosine/multiplayer`)

See [Multiplayer Architecture](Multiplayer-Architecture) for details.
