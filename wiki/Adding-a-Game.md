Step-by-step guide to adding a game to the arcade.

> This is the normal, single-version workflow, and it is the right one for
> almost every game. Eight arcade folders are **not** authored here — they
> are generated copies of games that live in their own repositories. If you
> are changing Moonlight Drift, George Boole, Texas Hold'Em Lava Dome, or
> any of the other synced games, read [Multi-Version Games](Multi-Version-Games)
> first: edits made in `arcade/` for those are destroyed at the next sync.

---

## Quick Start with Scaffolder

1. Edit `scripts/new-game.json`:
   ```json
   {
     "name": "othello",
     "title": "OTHELLO",
     "category": "puzzles",
     "description": "Classic Othello with neon theme"
   }
   ```
2. Run: `node scripts/scaffold-game.mjs`
3. Edit `arcade/othello/js/game.js` — implement game logic
4. Add card to `arcade/puzzles/index.html`

The scaffolder generates:
- `index.html` — standard boilerplate with chat + score client
- `favicon.svg` — placeholder pixel art
- `css/base.css` + `css/game.css` — styles
- `js/config.js` + `js/game.js` + `js/main.js` — game logic skeleton

---

## Manual Setup

### 1. Create the Folder

```
arcade/my-game/
├── index.html
├── css/
│   └── style.css
└── js/
    └── game.js
```

## 2. index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>my game — magmacrunch media</title>
    <link rel="icon" type="image/svg+xml" href="../favicon.svg">
    <link rel="stylesheet" href="../shared/arcade-base.css">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="game" width="64" height="64"></canvas>
    </div>
    <script src="js/game.js"></script>
</body>
</html>
```

## 3. Canvas Pixel Art Rules

- Draw at low resolution (64x64 or similar)
- Use `image-rendering: pixelated` on the canvas element
- Scale up with CSS — never draw at full display size

```css
#game {
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    width: 480px;
    height: 480px;
}
```

## 4. Integrate Chat (Optional)

```html
<link rel="stylesheet" href="../shared/chat-widget.css">
<script src="../shared/adenosine-chat.js"></script>
<script>const { ChatWidget } = AdChat; ChatWidget.connect();</script>
```

## 5. Integrate High Scores

```html
<script src="../shared/adenosine-score-client.js"></script>
<script>
const scoreClient = new AdScore.ScoreClient().auto();

// Load scores
const scores = await scoreClient.load('my-game');

// Save a score
await scoreClient.save('my-game', 'JAM', 12400, { level: 5 });
</script>
```

`scoreClient.save()` owns persistence — it writes `mc_scores_<game>` in
localStorage *and* syncs to the Pi. Never write that key from game code; a second
writer will clobber the engine's list.

The `?v=` cache-buster on the script tag is applied automatically by
`npm run build:adenosine`, so write the tag without one.

## 6. Add to Arcade Index

Add a game card to `arcade/index.html` under the appropriate collection section:

```html
<a href="my-game/" class="game-card" style="--card-color: #00f5ff">
    <div class="card-inner">
        <div class="card-title">MY<br>GAME</div>
        <div class="card-canvas-wrap">
            <canvas id="cMyGame" width="72" height="72"></canvas>
        </div>
        <div class="card-desc">short description of the game.</div>
        <div class="card-play">PLAY<span class="card-arrow">_</span></div>
    </div>
</a>
```

Then add a preview sprite drawing function in `gamecard-previews.js`.

## 7. Multiplayer Games

For multiplayer, create a WebSocket server:

```python
# arcade/my-game/server.py
import asyncio, websockets, json

async def handler(websocket):
    # Handle game messages
    async for message in websocket:
        data = json.loads(message)
        # Process and respond

async def main():
    async with websockets.serve(handler, "0.0.0.0", 87XX):
        await asyncio.Future()

asyncio.run(main())
```

See existing servers in `arcade/chess/server.py`, `arcade/checkers/server.py` for examples.

## Checklist

- [ ] Game folder created with index.html, css/, js/
- [ ] Canvas uses `image-rendering: pixelated`
- [ ] Game works standalone (no external dependencies)
- [ ] Chat widget integrated (if multiplayer)
- [ ] Score client integrated (if scoring)
- [ ] Added to arcade index with preview sprite
- [ ] Added to appropriate collection page
- [ ] Works on mobile (touch controls if applicable)
