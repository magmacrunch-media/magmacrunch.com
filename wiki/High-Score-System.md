Persistent high scores across sessions, powered by the Raspberry Pi backend.

---

## Architecture

```
Game (browser) ──WebSocket──▶ admin/server.py ──file I/O──▶ arcade/admin/scores/{game}.json
     │                                                         │
     └── localStorage fallback (offline)                       └── JSON files (one per game)
```

## ScoreClient API

```html
<script src="../shared/adenosine-score-client.js"></script>
<script>const scoreClient = new AdScore.ScoreClient().auto();</script>
```

`.auto()` detects the host from `window.location` and connects to port 8781.

The bundle is generated from `@magmacrunch/adenosine-score-client` by
`npm run build:adenosine`, which also stamps the `?v=` cache-buster — write the
script tag without one. The older hand-rolled `arcade/shared/score-client.js` has
been removed; `AdScore` is the only client.

`scoreClient.save()` owns persistence: it writes the top 100 entries to
`mc_scores_<game>` in localStorage *and* queues a sync to the Pi. **Game code must
not write that key** — a second writer truncates or reshapes the engine's list.

### Load Scores

```js
const scores = await scoreClient.load('tetris');
// Returns: [{ initials: 'JAM', score: 12400, level: 5 }, ...]
```

### Save a Score

```js
const result = await scoreClient.save('tetris', 'JAM', 12400, { level: 5 });
// result: { rank: 1, synced: true }
```

- `name` — player initials (up to 3 chars, auto-uppercased)
- `score` — numeric score value
- `extra` — optional object with additional data (level, time, etc.)

### Load All Scores (Admin)

```js
const allScores = await scoreClient.loadAll();
// Returns: { 'tetris': { game: 'tetris', scores: [...] }, ... }
```

### Reset Scores (Admin)

```js
await scoreClient.reset('tetris');
```

## Offline Behavior

When the Pi is unreachable:
1. Scores save to `localStorage` immediately
2. Pending saves are queued in memory
3. On reconnect, queued saves sync automatically
4. `load()` falls back to `localStorage` cache

## Storage Format

Each game has a JSON file at `arcade/admin/scores/{game}.json`:

```json
{
  "game": "tetris",
  "scores": [
    { "initials": "JAM", "score": 12400, "level": 5 },
    { "initials": "CPR", "score": 8800, "level": 3 }
  ]
}
```

## Games with Server-side Scores

| Game | Game ID | Score type | Client |
|------|---------|-----------|--------|
| Tetris | `tetris` | points | adenosine |
| 2^N | `2n` | target reached | adenosine |
| George Boole | `george-boole` | points | adenosine |
| 15 Puzzle | `fifteen-puzzle` | moves (ascending) | adenosine |
| Klotski | `klotski` | moves (ascending) | adenosine |
| Threes | `threes` | points | adenosine |
| Cribbage | `cribbage` | score | adenosine |
| Tarot | `tarot` | score | adenosine |
| Moonlight Drift | `moonlight-drift` | obstacles passed | legacy |
| Solitaire | `solitaire` | score | legacy |
| Scandinavian Stud | `scandinavian-stud` | score | legacy |
| Solitaire THLD | `solitaire-thld` | score | legacy |

## Adding Scores to a New Game

1. Add the score client script to your `index.html`
2. Call `ScoreClient.auto()` on page load
3. Use `scoreClient.load()` to display existing scores
4. Use `scoreClient.save()` when a game ends
5. Use a unique game ID (matches the JSON filename)

## Admin Dashboard

The MAGMA//OPS dashboard shows all leaderboards and allows score management. See [Admin Dashboard](Admin-Dashboard).
