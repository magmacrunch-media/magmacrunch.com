# SORRY! — Agent Guide

## Quick Start

```bash
pip install -r arcade/requirements.txt  # from repo root
python server.py          # start the WebSocket server
# Open index.html in browser — no build step, no server needed for the client
```

## Architecture

All state changes flow through `applyAction()` in `js/game-state.js`. Local and remote moves take the same path. The server echoes `pawn_moved` to all clients, which triggers `applyAction(MOVE_PAWN)` on every client including the mover.

```
js/board-config.js   → pure data + getLegalMoves(), no DOM
js/game-state.js     → state machine, fires onStateChange()
js/board-renderer.js → reads state, writes DOM
js/multiplayer.js    → shared MP framework wrapper → applyAction() calls
js/audio.js          → preloads and plays the move/card sound effects
js/ui.js             → wires multiplayer to DOM, calls Multiplayer.connect()
index.html           → loads scripts in order above
```

**CSS load order matters:** `css/base.css` must load first — it defines all CSS variables used by other sheets.

**Slide animation is client-side only:** The server has no concept of slides. When an active player lands on a slide, the animation plays locally before the `move_pawn` and `bump_pawn` messages are sent. Other clients see only the instant state update.

## Key Conventions

- **Pawn must always be clicked first** — even when only one pawn can move, the player must click it to see destination highlights. See `js/board-renderer.js:handlePawnClick()`.
- **Slide destination highlight shows the start, not the end** — the slide is a surprise bonus revealed on landing.
- **Card 7 split options** (1–6 steps) only appear when a valid second move exists for the remainder.
- **Board slot labels use Player 1–4, not color names** — `SLOT_NAMES` in `board-config.js` maps board positions to player numbers. The server sends `slot` in `welcome` and `lobby_update` so the client can resolve its board position.
- **Board center color blends all active player colors** — `injectColorMap()` in `ui.js` calls `_blendColors()` to average all chosen hex colors and set `--board-center`. Do not override this with per-player colors on turn changes.
- `server.py` runs only on localhost. Only one concurrent game supported.

## Known Gotchas

- **Safe zone entry uses `steps >= distToSafe`** — landing exactly on `safeEntry` enters safe[0]. The formula is `safeSteps = steps - distToSafe` (no `-1` offset). See `advancePosition()` in `board-config.js`.
- **`willLap` set at entry square** — a pawn at its entry with `lapped=false` gets `willLap=true` on any forward move. This is correct: once you start moving from entry, you're past Start and the safe zone is reachable on subsequent moves. The safe zone is 58+ steps away from entry, so no card can reach it immediately.

## Python Server

- Accepts 2–4 players; first to join is host
- Broadcasts: `lobby_update`, `game_started`, `turn_update`, `card_drawn`, `pawn_moved`, `chat`, `system`
- Receives: `join`, `spectate`, `start_game`, `draw_card`, `move_pawn`, `move_pawn_partial`, `bump_pawn`, `swap_pawn`, `skip_turn`, `chat`, `quit`
- "Opening handshake failed / missing Upgrade header" in logs is harmless — plain HTTP requests to the WebSocket port

## Raspberry Pi Deploy

```bash
chmod +x start.sh
./start.sh --setup   # installs 'sorry' alias in ~/.bashrc (run once)
source ~/.bashrc
sorry                # starts server with auto-restart on crash
```

## Not Implemented

- Reconnect mid-game
- Hosted/public server
- Multiple concurrent game rooms
- Card 2 draw-again rule