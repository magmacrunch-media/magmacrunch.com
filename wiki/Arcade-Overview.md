The arcade is the largest section of magmacrunch.com — 20+ pixel art games organized into four collections plus a private collection.

**Est. December 2025** | Also on [itch.io](https://magmacrunch.itch.io/)

---

## Collections

### Board Games
| Game | Multiplayer | Description |
|------|-------------|-------------|
| Chess | Yes | Neon edition. Classic chess vs AI. Algebraic notation. |
| Checkers | Yes | Neon edition. Mandatory jumps, king promotion. |
| Backgammon | Yes | Neon edition. Doubling cube. |
| Parchis | Yes | "El clasico juego espanol." 2-4 player online. |
| Chinese Checkers | Yes | Hexagonal board. Hop to win vs AI. |
| Aggravation | Yes | Classic marble racing game. |

### Card Games
| Game | Multiplayer | Description |
|------|-------------|-------------|
| Klondike Solitaire | No | Classic draw-3 solitaire. Timed scoring. |
| Cribbage | Yes | First to 121 points. Pegging, hands, the crib. |
| Söko (Scandinavian Stud) | Yes | Five-card poker with Finnish twist. |
| Texas Hold'em Lava Dome | No | Poker solitaire. Build hands, score big. |
| French Tarot | No | 78-card tarot deck. Trick-taking, bidding. |

### Puzzles
| Game | Scores | Description |
|------|--------|-------------|
| 2^N (2048) | Yes | Slide and merge tiles to reach 2^N |
| George Boole | Yes | Logic gates on a sliding board. XOR, OR, AND, NOT. |
| 15 Puzzle | Yes | Classic sliding tile puzzle. 3x3 to 6x6. |
| Threes | Yes | Slide, merge, survive. 1+2=3. |
| Klotski | Yes | Classic Chinese sliding block puzzle. |
| Nelikko | Yes | Helsinki 1989. The falling-block puzzle, as Finland invented it. Was Tetris. |

### Action
| Game | Scores | Description |
|------|--------|-------------|
| Moonlight Drift | Yes | Coast through space. Side-scroller. |
| Very Long Boards | — | Downhill longboarding. Dodge everything. |
| Roderick Tron | — | Robot composer on 1810s rooftops. Platformer. |

### Private Collection
Password-protected. Hosted at port 8782. Ask Jake for access. See [Private Collection](Private-Collection) for architecture details.

---

## Game Folder Structure

Games live directly under `arcade/`, each in its own directory. Category folders (`board-games/`, `card-games/`, `puzzles/`, `action/`) are index pages, not subdirectories containing games.

```
arcade/
├── chess/                # index.html, js/, css/, server.py, tests/
├── checkers/
├── backgammon/
├── parchisi/
├── chinese-checkers/
├── aggravation/
├── solitaire/
├── cribbage/
├── scandinavian-stud/
├── solitaire_THLD/       # Texas Hold'em Lava Dome (generated)
├── tarot/
├── 2^N/                  # 2048 variant
├── george-boole/         # generated
├── fifteen-puzzle/
├── threes/
├── klotski/
├── nelikko/
├── moonlight-drift/      # generated
├── very-long-boards/
├── roderick-tron/
├── SORRY/
├── pay2play/             # slot machine (CSS, JS, prizes)
├── shared/               # shared libraries (chat, scores, cards, etc.)
├── admin/                # MAGMA//OPS dashboard + score server
├── counter/              # hit counter server
├── private/              # password-protected collection
├── arcade.css            # arcade index page styles + game card grid
└── gamecard-previews.js  # tile illustrations for each collection
```

Three of those folders — `moonlight-drift/`, `george-boole/` and
`solitaire_THLD/` — are generated copies of games that live in their own
repositories, holding a browser version and a Nintendo Wii port side by side.
Editing them here does nothing lasting: the next sync deletes and recopies the
folder. See [Multi-Version Games](Multi-Version-Games).

### Typical Game Files

| File | Purpose |
|------|---------|
| `index.html` | Entry point — loads CSS, config, game logic |
| `js/` or inline | Game logic (canvas or DOM-based) |
| `css/` or inline | Game styles |
| `config.js` | Game configuration (board size, difficulty, etc.) |
| `server.py` | Multiplayer server (if applicable) |
| `tests/` | Python tests for game logic |

### Rendering Approaches

| Approach | Games |
|----------|-------|
| **Canvas** | Chess, Checkers, Backgammon, Parchisi, Chinese Checkers, Aggravation, Nelikko, Moonlight Drift, Very Long Boards, Roderick Tron |
| **DOM** | Solitaire, Cribbage, Scandinavian Stud, 2^N, George Boole, 15 Puzzle, Threes, Klotski |
| **Hybrid** | SORRY (canvas + DOM overlay) |

Canvas games use `image-rendering: pixelated` and draw at low resolution (64x64 or similar), scaled up with CSS.

---

## Architecture

```
Game (browser) ──WebSocket──▶ Raspberry Pi servers
     │                              │
     ├── Chat (SharedWorker)        ├── chat-server.py (port 8768)
     ├── Scores (ScoreClient)       ├── admin/server.py (port 8780)
     └── Multiplayer                └── game-specific servers (ports 8765-8774)
```

All games are self-contained — each has its own `index.html`, CSS, and JS. Shared code lives in `arcade/shared/`.

See [Multiplayer Architecture](Multiplayer-Architecture) and [High Score System](High-Score-System) for details.

### Server-side Scores

Games with scores above sync high scores to the Raspberry Pi via ScoreClient (WebSocket to `admin/server.py`, localStorage fallback offline). Score files live in `arcade/admin/scores/{game}.json`. See [High Score System](High-Score-System) for architecture and API details.
