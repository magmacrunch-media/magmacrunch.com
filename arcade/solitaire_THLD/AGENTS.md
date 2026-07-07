# Texas Hold'Em Lava Dome — Agent Guide

## Dev approach

Open `index.html` directly in browser. No build server, no package manager, no tests.

## Dependencies on shared card pipeline

**Card rendering uses shared files from `../shared/cards/`** — do not modify those files unless fixing cross-game issues:
- `../shared/cards/cards.css`
- `../shared/cards/deck.js`
- `../shared/cards/face-cards.js`
- `../shared/cards/number-cards.js`

## Dependencies on shared chip animation

**Chip rendering uses shared files from `../shared/chips/`** — do not modify those files unless fixing cross-game issues:
- `../shared/chips/chip-animation.css`
- `../shared/chips/chip-animation.js`

## Script load order

`index.html` scripts must load in this order (dependencies matter):
1. `../shared/chips/chip-animation.js` (shared chip rendering)
2. `js/config.js`
3. `../shared/cards/deck.js` (shared card/deck logic)
4. `../shared/cards/face-cards.js`
5. `../shared/cards/number-cards.js`
6. `js/state.js`
7. `js/dealer.js`
8. `js/hand-eval.js`
9. `js/dome.js`
10. `js/betting.js`
11. `js/scoring.js`
12. `js/ui.js`
13. `js/main.js`

## Class architecture

```
GameState (state.js)       — session/round state, no logic
Dealer (dealer.js)         — deck management, street dealing
HandEvaluator (hand-eval.js) — 7-card best-hand evaluator
Dome (dome.js)             — ante charging, threshold resolution, bust/escape
Betting (betting.js)        — bet sizing and validation
Scoring (scoring.js)        — high score persistence
UI (ui.js)                 — DOM rendering and phase state machine
```

## Known issues

- **Resolve panel calls `dome.resolveHand()` on render** — this double-resolves. The call inside `_renderPhasePanel` for the resolve phase should be removed or guarded so it only fires once.
- **High score save/load not wired to session end flow** — `scoring.js` has `loadHighScores()` but the session-over flow hasn't connected to it.
- **Stale poker solitaire UI elements** — `pokerGrid`, `rowScores`, `colScores` IDs in `index.html` are from the old Klondike layout, not used by the Hold'Em game.

## Visual conventions

Lava/volcanic color palette (not the arcade site's neon palette):
```
--black: #0a0000   --dark-red: #1c0000   --deep-red: #3b0000
--lava-dark: #6b0000   --lava-bright: #cc2200   --orange: #dd4400
--orange-hot: #ff5500   --orange-glow: #ff7700   --yellow: #ffcc00
--white: #fff8f0
```

Press Start 2P font + VT323 for secondary text. CRT scanlines via `body::before` with `position: fixed`.

## Band theming

All round depth labels, flavor text, and UI copy are drawn from the discography of *Texas Hold'Em Lava Dome* (three albums: *Martial Law in Garrison Oaks*, *Hazardous Metals in Ambient Air*, *Pompous Fanfare for All Occasions*). Do not invent fake song titles — use only what appears in `GAME_DESIGN.md` or the band reference section of `README.md`.