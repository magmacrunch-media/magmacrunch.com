# Adenosine game engine — script loading patterns, globals, IIFE build/sync pipeline, and repo workflow.

## Adenosine game engine

[adenosine](https://github.com/magmacrunch-media/adenosine) is the game engine used by arcade games.
- **adenosine-rpg.js** — game loop, input, state (used by tetris)
- **adenosine-puzzle.js** — puzzle framework (used by 2^N, george-boole, fifteen-puzzle, klotski, threes)
- **adenosine-score-client.js** — high score client (used by 2^N, george-boole, fifteen-puzzle, klotski, threes, cribbage, tarot)
- **adenosine-cards.js** — card deck, rendering, cribbage hand eval (used by cribbage, solitaire, scandinavian-stud, solitaire_THLD)
- **adenosine-audio.js** — Web Audio API music + SFX (used by george-boole, moonlight-drift)

### Loading in a game page

```html
<!-- RPG games (tetris) -->
<script src="../shared/adenosine-rpg.js"></script>
<script src="../shared/adenosine-score-client.js"></script>

<!-- Puzzle games (2^N, george-boole, fifteen-puzzle, klotski, threes) -->
<script src="../shared/adenosine-score-client.js"></script>
<script>const scoreClient = new AdScore.ScoreClient().auto();</script>
<script src="../shared/adenosine-puzzle.js"></script>

<!-- Card games (cribbage, solitaire, scandinavian-stud, solitaire_THLD) -->
<!-- adenosine-cards.js must precede js/config.js, which reads its constants -->
<script src="../shared/adenosine-cards.js"></script>
<script src="../shared/adenosine-score-client.js"></script>
<script>const scoreClient = new AdScore.ScoreClient().auto();</script>

<!-- Audio games (george-boole, moonlight-drift) -->
<script src="../shared/adenosine-audio.js"></script>

<!-- Multiplayer board games (SORRY, backgammon, checkers, chess, cribbage, etc.) -->
<script src="../shared/adenosine-multiplayer.js"></script>

<!-- Chat widget (nearly every game page) -->
<script src="../shared/adenosine-chat.js"></script>
<script src="../shared/chat-server.js"></script>
<script>const { ChatWidget } = AdChat;</script>
```

Every one of these `src` values carries a `?v=<hash>` cache-buster in the real
pages, applied automatically by `npm run build:adenosine` — write the tag without
one and the script will stamp it on the next run. Only load `adenosine-audio.js`
in a game that actually plays audio (currently george-boole and moonlight-drift).

### Available globals

- `AdRPG` — game loop, input, state (`createGameLoop`, `initInput`, `keys`, `keysPressed`)
- `AdPuzzle` — puzzle framework (`createGame`, `createUI`, `createScoring`, `createRenderer`, `createInput`)
- `AdScore` — high score client (`ScoreClient`)
- `AdCards` — card deck, rendering, cribbage hand eval (`Card`, `Deck`, `CribbageHandEval`)
- `AdAudio` — Web Audio API music + SFX (`init`, `playMusic`, `playSfx`)
- `AdChat` — floating real-time chat widget (`ChatWidget.connect()`, `.setName()`, `.setColor()`, `.joinRoom()`)
- `AdMP` — multiplayer WebSocket client (`MP`, `MSG`, `MP_PALETTE`, `BoardGameTemplate`)

### Integration pattern

1. Call `AdRPG.initCanvas(canvasEl)` to register the board canvas
2. Create loop: `AdRPG.createGameLoop({ update, render, fps: 30 })`
3. Use `AdRPG.keys`/`AdRPG.keysPressed` for input (with custom bindings via `TETRIS_BINDINGS`)
4. Sync state: `AdRPG.setGameStarted()`, `setGamePaused()`, `setGameOver()`
5. Score client: `new AdScore.ScoreClient().auto()`

### IIFE builds

Adenosine packages ship both ESM (for npm) and IIFE (for `<script>` tags). All seven
bundles in `arcade/shared/adenosine-*.js` are generated — **never hand-edit them**.

`npm run build:adenosine` runs `scripts/sync-adenosine.mjs`, which:
1. copies each `node_modules/@magmacrunch/adenosine-*/dist/index.global.js` into
   `arcade/shared/adenosine-<pkg>.js`;
2. stamps a content-hash `?v=` on every arcade `<script>` tag that loads one.

The hash is derived from the bundle bytes rather than the package version, because
a bundle has already been rebuilt with a fix under an unchanged version number
(commit `632b856`) — a version stamp would not have busted that stale cache.

The bundles are **committed on purpose**, despite being generated: GitHub Pages
serves this repo's branch directly (there is no Pages build workflow), so an
untracked bundle would 404 on magmacrunch.com. The Pi instead gets them from
`deploy-pi.yml`, which runs this script after `npm ci`. Re-run it and commit the
result after any dependency change.

### Package naming

The rule for everything published, not just adenosine:

- **npm default scope is `@magmacrunch/*`.** A product earns its own scope only
  once it ships three or more packages people install independently. Adenosine
  qualifies at seven; a single-package project never does. This keeps org and
  token administration at one org no matter how many projects get added.
- **PyPI has no scopes**, so Python projects publish bare product names —
  `magmascript`, `texastoast` — and prefer extras (`texastoast[sprites]`) over
  splitting into several packages.

`@magmacrunch` is an npm **organization**, converted from the personal user
account of the same name. The scope string did not change in the conversion, so
nothing in this repo references it differently than before. Publishing is done
by CI from a granular access token scoped to `@magmacrunch` with **no**
organization permission — a token in Actions secrets should not be able to
restructure the org.

Under this rule `ware/shell` would publish as `@magmacrunch/ware-shell` if it is
ever packaged, **not** under an adenosine name — it is tool chrome, and no
arcade game loads it. See `ware/shell/README.md`; it is deliberately not a
package today.

**`@adenosine` is not available on npm — do not spend time on it again.**
Renaming `@magmacrunch/adenosine-*` to a shorter `@adenosine/*` was considered
and is closed: npm reports the name as taken. Package search shows nothing,
which is misleading — npm user names and org names share one namespace and
neither appears in package search, so an account registered with nothing
published still blocks the scope. There is no unscoped `adenosine` package and
no packages in the scope; the block is an account.

Nothing is lost by this. The rename was optional branding worth cashing in only
if adenosine found outside adopters, and `@magmacrunch/adenosine-*` costs
nothing to keep.

Related, in case it comes up: npm has no concept of linking or nesting
organizations. Separate orgs are independent, connected only by sharing an owner
account and by `repository`/`homepage`/`author` metadata. Grouping *within* a
scope is done with teams (`npm team create @magmacrunch:…`), not extra orgs — so
`@magmacrunch` plus teams is the structure, and a second org would have given
less connection rather than more.

### Repository

[adenosine](https://github.com/magmacrunch-media/adenosine) is a monorepo (`packages/*` workspaces) published to npm as `@magmacrunch/adenosine-*`.

**There is exactly one working copy on this Mac: `~/Documents/game_dev/adenosine`.
Keep it that way.** The number is what matters, not the location — the repo moved
here from `~/adenosine` on 2026-08-19, and two stale clones were deleted on
2026-08-18. While those existed the same one-line `deck.js` import fix got
authored twice, independently, in two different clones (`096e888` and `cb1a040`),
and work was repeatedly started against a copy that was 15 commits behind and
missing the `audio` package outright. If you need a second checkout for some
reason, use a git worktree rather than a second clone.

- Mac: `~/Documents/game_dev/adenosine`
- MC1: `~/adenosine` (WSL2: `/home/magma/adenosine`) — unverified since the Mac move

**Sync:** Same as magmacrunch.com — GitHub is the source of truth. Always `git pull` before editing, commit/push frequently.

**Changing the engine, end to end:**
```bash
cd ~/Documents/game_dev/adenosine
npm install
npm test && npm run typecheck   # both must exit 0
npm run build                   # IIFE bundles land in packages/*/dist/index.global.js
# bump the changed package's version, then publish (GitHub release triggers publish.yml)

cd ~/Documents/website
npm install                     # or `npm ci` in CI
npm run build:adenosine         # re-copies bundles and re-stamps cache-busters
git add arcade/shared/adenosine-*.js arcade/**/index.html
```

All seven packages the website uses are npm dependencies — there is no longer any
manually built or hand-copied bundle.

