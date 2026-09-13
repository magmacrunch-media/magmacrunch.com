# Texas Hold'Em Lava Dome — Agent Guide

## Dev approach

Open `index.html` directly in browser. No build server, no package manager, no tests.

## Dependencies on the adenosine engine

Cards **and** chips come from `../shared/adenosine-cards.js`, which exposes the
global `AdCards` (`Card`, `Deck`, face/number card SVG generators, `ChipAnim`,
`drawChip`, `DENOMS`, and the `SUITS`/`RANKS`/`SUIT_SYMBOLS`/`SUIT_COLORS`/`RANK_VALUES`
constants). High scores come from `../shared/adenosine-score-client.js` (`AdScore`).

**Never edit `arcade/shared/adenosine-*.js`** — they are generated from npm
dependencies by `npm run build:adenosine`. Fix the engine in `~/adenosine`,
publish, then re-run that script.

Only the stylesheets are still local: `../shared/cards/cards.css` and
`../shared/chips/chip-animation.css`.

## Script load order

`index.html` scripts must load in this order (dependencies matter):
1. `../shared/adenosine-cards.js` (cards + chips; must precede `config.js`)
2. `../shared/adenosine-score-client.js`
3. `js/config.js`
4. `js/state.js`
5. `js/dealer.js`
6. `js/hand-eval.js`
7. `js/dome.js`
8. `js/betting.js`
9. `js/scoring.js`
10. `js/ui.js`
11. `js/main.js`

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