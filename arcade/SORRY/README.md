# SORRY! — Multiplayer Web Game

A browser-based multiplayer implementation of the SORRY! board game, built with vanilla HTML/CSS/JS and a Python WebSocket server.

---

## Project Status

**Currently working:**
- Multiplayer lobby (2–4 players) with host controls
- Real-time WebSocket connection via `server.py`
- Turn-based card draw synced across all clients
- Live chat in both lobby and game views, separated from the in-game event log
- SORRY! board rendered in the browser (perimeter track, safe zones, start/home zones, center logo)
- Full card deck system (standard 45-card SORRY! deck)
- **Retro arcade title screen** — full-screen CRT-style overlay with animated SORRY! logo, bouncing pawns, and color wash; dismissed on click/spacebar/Enter
- **Color picker** — 12-color palette in the lobby; server assigns a board slot (red/blue/yellow/green) per join order but each player chooses their own display color; taken colors are shown as greyed-out with an ✕; color can be changed after joining
- **Dynamic color theming** — board zones, slide tints, safe zone text/borders, and zone arrows all update to match each player's chosen color; text and borders inside zones use the **complementary color** (hue + 180°) for legibility regardless of what color is picked; unused board slots get muted dark neutrals so they visually recede
- **Distinct slide/safe zone tints** — each player color produces a clearly different pastel tint for their slide and safe zone squares; the tint algorithm uses per-hue lightness and saturation targets, plus the original color's own lightness as a tiebreaker for nearly-identical hues (e.g. Cherry vs Watermelon at ~350°)
- **Player-colored action buttons** — the Discard, Quit, and Leave buttons use each player's complementary color rather than a hardcoded red/orange, so they always feel on-theme
- **Lobby player count** — the server sends a full lobby snapshot to every new WebSocket connection immediately on connect, so visitors see the real player count before they even enter their name; previously new visitors saw "0/4" until after joining
- **Game-in-progress banner** — players who open the lobby while a game is already running see an amber "GAME IN PROGRESS" banner with a blinking indicator, and the status text updates to explain they can spectate or wait for the next round
- **Pawn movement** — draw a card, click the pawn you want to move, then click a destination; clicking the pawn first is always required (consistent whether one or multiple pawns are movable)
- Pawn `lapped` flag tracked correctly so safe zone entry unlocks after a full lap
- **Safe zone boundary bug fixed** — pawns that had already passed their safe-zone entry square were incorrectly being offered moves that routed through the safe zone by wrapping the full track (59 steps). Fixed by adding a `safeReachable` guard: the safe zone is only entered if `distToSafe < distToEntry`, ensuring the entry is genuinely ahead of the pawn in the forward direction
- **Slides** — landing on a slide start propels you to the end; sweeps any pawns along the way back to Start; Sorry! card respects slides too
  - The destination highlight shows the **slide start** square (where you'd normally land), not the end — the slide is a surprise bonus revealed on landing
  - A ripple animation lights up slide cells sequentially, bumped pawns spin and eject, and the arriving pawn pops with a whoosh
- **Bumping** — landing on an opponent's pawn sends it back to Start
- **Sorry! card** — take any pawn from Start and place it on any opponent's square (bumping them home); rides slides correctly
- **7-split** — split 7 moves between two pawns; split options (1–6 steps) are only offered when a valid second move exists for the remainder, preventing dead-end choices; if no valid 7 can be completed at all (e.g. only pawn is 6 steps from home, full 7 overshoots, no partner for a split), the card is correctly treated as unplayable and the discard button appears
- **11-swap** — optionally swap position with any opponent pawn on the perimeter; opponent's `lapped` flag is preserved correctly
- **Win detection** — all 4 pawns reaching Home ends the game immediately; guarded against firing twice
- **Game over overlay** — animated win screen showing winner color, name, and "(that's you!)" for the winning player; fires on all clients simultaneously
- **Game log** — separate panel below the board showing card draws, pawn moves, bumps, and win events; player chat is kept in its own sidebar panel
- Auto-skip when a drawn card has no legal moves
- **"magmacrunch arcade" back link** — shown on title screen and lobby only; automatically hidden during gameplay since the Quit button handles navigation
- Debug panel for tracing card draws, legal moves, and move submissions
- Graceful server shutdown with Ctrl+C
- **Raspberry Pi deploy script** (`start.sh`) — activates the venv, runs the server, and auto-restarts on crash; `./start.sh --setup` installs a `sorry` shell alias

**Not yet implemented:**
- Reconnect support — disconnecting mid-game requires rejoining from scratch
- Hosted server — currently localhost only
- Game rooms — only one concurrent game supported
- Card 2 "draw again" rule — official rules grant a bonus draw after playing a 2; currently the turn advances normally

---

## Known Bugs

### Layout glitch — mitigated, not fully eliminated

**Symptom:** In some browsers, after extended play, the board can break out of its container. Closing and reopening the browser resolves it.

**Root cause:** `box-shadow` pulse animations on `.big-zone.active-turn` and `.pawn-movable` are not GPU-compositable, causing escalating repaints that can eventually break the layout.

**Mitigations applied:**
- Active-turn zone pulse now uses a `::before` pseudo-element that animates only `opacity` and `transform: scale` — both GPU-compositable; the `box-shadow` is set once as a static value
- Movable pawn pulse similarly animates only `transform: scale`; `box-shadow` is static
- Card-playable and color-badge pulses switched from `box-shadow` animation to `opacity` animation
- All animated elements get `transform: translateZ(0)` to promote them to their own compositor layers
- `contain: strict` → `contain: layout paint` (drops size containment)
- Explicit `width`/`height` on `.board` and `.board-frame`; explicit `width` on `#game-main-col`

**Status:** Frequency is significantly reduced. The animations no longer trigger paint on every frame.

---

### Fixed bugs (documented for reference)

- ~~**Lobby shows "0/4 players" for new visitors**~~ — fixed: server now sends a full lobby snapshot on every new WebSocket connection, before the client has joined
- ~~**No indication that a game is already in progress**~~ — fixed: game-in-progress banner with amber indicator shown in lobby when `gameStarted: true`
- ~~**Pawn can move past own home / wrap through safe zone**~~ — fixed in `advancePosition`: added `safeReachable` guard so the safe zone is only entered when its entry point is genuinely ahead of the pawn
- ~~**Card 7 hangs when only move is a partial (e.g. 6 steps to home)**~~ — fixed in two places: `getLegalMoves` now only includes split moves (1–6 steps) when a valid partner exists for the remainder; `_startSeven` has a safety-net path that shows the discard button if `validFirstMoves` ends up empty
- ~~**Slides bumping own pawns**~~ — fixed in `checkSlide`: own-color pawns filtered from `slideBumps`
- ~~**Card 11 swap doesn't trigger a slide**~~ — fixed: `checkSlide` called for swap destination squares
- ~~**Sorry card + slide double-bumps the original opponent**~~ — fixed: original opponent filtered from `slideBumps` on Sorry moves
- ~~**`opponentByTrack` stores only one pawn per cell**~~ — fixed: now stores an array per cell; `oppAt()` returns the first entry

---

## File Structure

```
sorry-game/
├── index.html          # Main entry point — all players open this
├── server.py           # Python WebSocket server (asyncio + websockets)
├── start.sh            # Raspberry Pi deploy script (venv + auto-restart)
│
├── js/
│   ├── board-config.js   # Pure data: cell coordinates, zone definitions, legal move calculator
│   ├── game-state.js     # State machine: applyAction(), onStateChange()
│   ├── board-renderer.js # DOM rendering: renderBoard(), update(), highlightMoves(), playSlideAnimation()
│   ├── network.js        # WebSocket client layer, server message handling
│   ├── audio.js          # Sound effects
│   └── ui.js             # UI controller: DOM wiring, network callbacks, move interaction
│
└── css/
    ├── base.css          # CSS variables (color palette, board dimensions), reset, body, h1
    ├── board.css         # Board grid, cells, safe zone, zones, pawns, move highlights, slide animations
    ├── lobby.css         # Lobby overlay, net-box panels, chat/message styles, game-in-progress banner
    ├── game.css          # Game layout, sidebar, card system, turn HUD, game log, debug panel, game-over overlay
    └── title.css         # Retro arcade title screen overlay
```

### Architecture

```
js/board-config.js    → pure data + getLegalMoves() + getSplitMoves() + getSlideForMove(), no DOM
       ↓
js/game-state.js      → state machine, fires onStateChange()
       ↓
js/board-renderer.js  → reads state, writes DOM, handles move click UX, plays slide animations
       ↓
js/network.js         → WebSocket client, translates server messages → applyAction() calls
       ↓
js/ui.js              → wires Network callbacks to DOM, boots with Network.connect()

index.html            → markup only; loads scripts in order above
css/base.css          → loaded first; defines all CSS variables used by other sheets
```

**Key principle:** all state changes flow through `applyAction()` in `game-state.js`. Local and remote moves take the same path — the local player calls `Network.movePawn()`, the server echoes `pawn_moved` to all clients, which triggers `applyAction(MOVE_PAWN)` on every client including the mover.

**CSS load order matters:** `base.css` must load first as it defines the `--net-*` and board color variables consumed by all other sheets.

**Slide animation is client-side only:** The server has no concept of slides — it receives individual `bump_pawn` and `move_pawn` messages. The slide animation plays on the active player's client before those messages are sent. Other players see the instant state update as normal.

---

## Running the Game

**Requirements:**
- Python 3.8+
- `pip install websockets` (or `pip install websockets --break-system-packages` on Raspberry Pi OS)

**Start the server:**
```bash
python server.py
```
Press `Ctrl+C` to stop cleanly.

**On Raspberry Pi — recommended:**
```bash
chmod +x start.sh
./start.sh --setup   # installs a 'sorry' alias in ~/.bashrc (run once)
source ~/.bashrc
sorry                # from anywhere, starts the server with auto-restart
```

**Open the game:**
All players open `index.html` in a browser. Enter a name, click JOIN, then the host clicks START GAME.

> ⚠️ Open `index.html` directly in a browser (no local web server needed). The `js/` and `css/` folders must sit alongside `index.html`.

> ℹ️ "Opening handshake failed / missing Upgrade header" errors in the server log are harmless — they occur when a browser or health checker makes a plain HTTP request to the WebSocket port.

---

## How a Turn Works

1. Active player clicks **DRAW CARD** → server deals a card, broadcasts `card_drawn` to all
2. Active player's client computes legal moves via `getLegalMoves()` and highlights movable pawns
3. Player clicks a pawn (always required, even when only one pawn can move) → destination cells highlight
   - If the move would land on a slide start, the **slide start** is highlighted (not the end — the slide is a surprise)
4. Player clicks a destination → if the move involves a slide, the animation plays first; then `Network.movePawn()` sends `move_pawn` to server
5. Server validates ownership and echoes `pawn_moved` to all clients
6. All clients call `applyAction(MOVE_PAWN)` → board re-renders
7. Server advances turn (or re-sends same player for Card 2) → `turn_update` broadcast

### Card 7 (split) turn flow

1. Player draws a 7 — `getLegalMoves` returns only moves where the full 7 can be completed: full 7-step moves if legal, and split moves (1–6 steps) only when a valid second move exists for the remainder on another pawn. If nothing qualifies, the card is unplayable and the discard button appears automatically
2. If the player picks a full 7, it's sent immediately as a normal move
3. If the player picks a split (1–6 steps), the pawn moves locally in the DOM (no server call yet) and phase-2 destinations appear for the remaining steps on a different pawn; slide detection for the second pawn uses the updated first-pawn position
4. Once the second destination is chosen, both moves are sent: `move_pawn_partial` for the first pawn, then `move_pawn` for the second

---

## Server Details (`server.py`)

- Accepts 2–4 players; first to join is host
- Host starts once 2+ players have joined
- Sends a full lobby snapshot (player list, count, `gameStarted` flag) to every new WebSocket connection immediately on connect
- New players cannot join after game starts (can spectate)
- Card deck: standard 45-card SORRY! deck, reshuffles when empty
- Broadcasts: `lobby_update`, `game_started`, `turn_update`, `card_drawn`, `pawn_moved`, `chat`, `system`
- Receives: `join`, `spectate`, `start_game`, `draw_card`, `move_pawn`, `move_pawn_partial`, `bump_pawn`, `swap_pawn`, `skip_turn`, `chat`, `quit`

---

## Roadmap

- [ ] **Reconnect support** — rejoin a game in progress after disconnect
- [ ] **Hosted server** — move beyond localhost
- [ ] **Game rooms** — multiple concurrent games with room codes
- [ ] **Card 2 draw-again rule** — grant an extra draw after playing a 2
- [ ] **Remote slide animations** — currently only the active player sees the slide animation; other players see the instant state update
