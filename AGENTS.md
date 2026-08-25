# AGENTS.md — magmacrunch.com

## Dev approach

Open `index.html` directly in browser. No build server, no package manager, no tests.

## Git identity — read before committing

**Commit and push as `magmacrunchmedia`. Never add an AI attribution trailer.**

### On the Mac only

Two GitHub accounts are authenticated on the Mac — `magmacrunchmedia` and
a separate work account — and `git` there uses `gh` as its credential helper
(`credential.helper = !gh auth git-credential`). That means pushes go out as
whichever account `gh` currently has *active*, not as whatever `user.name` says.
Switching accounts for something unrelated silently changes who your next push
comes from.

**On the Mac, check before every push** and abort if it is not `magmacrunchmedia`:

```bash
gh auth status                 # look for "Active account: true"
gh auth switch --user magmacrunchmedia
```

### On Windows (MC1) — do not run the check above

`gh` is **not** in the credential chain here and does not need to be. The helper
is Git Credential Manager (`credential.helper = manager`, global), which holds the
`magmacrunchmedia` credential in Windows Credential Manager. Pushes authenticate
through GCM and come out as the right account on their own.

`gh auth status` reports "not logged into any GitHub hosts" on this machine, and
that is **expected and harmless** — there is no `%APPDATA%\GitHub CLI` config at
all. It is not an expired token and it does not block anything. Nothing in this
repo shells out to `gh` locally; only CI does, using `GITHUB_TOKEN`.

Do not treat that message as a problem to fix, and do not run `gh auth switch`
or `gh auth login` here — the login is an interactive device-code flow that
cannot complete in a non-interactive agent shell, which is why repeated attempts
leave no config behind. Just verify the commit author instead:

```bash
git log -1 --format='%an <%ae>'   # want: magmacrunchmedia@gmail.com
```

Commit author should be `magmacrunchmedia <magmacrunchmedia@gmail.com>` (already
set repo-locally here, and globally for `~/Documents/game_dev/adenosine`).

**No AI attribution.** Do not append `Co-Authored-By: Claude …`, "Generated with
…", or any similar trailer to commit messages, PR bodies or release notes. These
are Jake's own published projects under his own name and npm account. Both repo
histories were rewritten once to strip these — do not reintroduce them. If your
tooling adds such a line by default, remove it before committing.

The same applies in `~/Documents/game_dev/adenosine`, which has no agent-guidance file of its own.

## magmascript

[magmascript](https://github.com/magmacrunchmedia/magmascript) is the primary CLI tool for managing this site. Key commands:

```bash
# Scores
magmascript scores report                    # markdown report
magmascript scores report --post-discussion  # post to GitHub Discussion
magmascript scores report --post-discord     # post to Discord

# Archive
magmascript archive check-format             # validate HTML formatting
magmascript archive bake-cache               # inline cache into pages

# MusicBrainz
magmascript mb backup                        # full backup
magmascript mb backup --skip-existing        # skip cached entities

# Last.fm
magmascript lastfm fetch                     # fetch play counts

# Search
magmascript search build-index               # build search-index.json

# Pi management
magmascript pi status                        # service statuses
magmascript pi deploy <path>                 # deploy files
```

Set `MAGMACRUNCH_ROOT=/path/to/magmacrunch.com` for commands that access local files.

## Project structure

```
/                      # root: index.html, style.css, nav.js
├── animations/        # extracted canvas animations (volcano, cereal, coin, server, floppy)
├── arcade/            # self-contained pixel games (each has index.html + js/css)
│   ├── arcade.css     # arcade index page styles + game card grid
│   ├── gamecard-previews.js  # tile illustrations for each collection
│   ├── shared/        # shared code: adenosine engine, score-client, chat, cards
│   │   ├── adenosine-rpg.js        # @adenosine/rpg IIFE build
│   │   ├── adenosine-score-client.js # @adenosine/score-client IIFE build
│   │   ├── score-client.js          # legacy score client (still used by some games)
│   │   └── ...
│   ├── pay2play/      # pay2play slot machine (CSS, JS, prizes)
│   └── ...
├── archive/           # artist/place pages with MusicBrainz API integration
│   ├── archive.css    # page-specific styles for archive index
│   ├── emerac.js      # EMERAC component (LED grid, CRT display, MusicBrainz fetch)
│   ├── by-artist/     # artist stubs with window.ARTIST_CONFIG or window.COLLECTIVE_CONFIG
│   ├── by-place/      # place stubs with window.PLACE_CONFIG
│   ├── by-label/      # label stubs with window.__LABEL_CONFIG
│   ├── by-contributor/ # contributor stubs with window.__CONTRIBUTOR_CONFIG
│   └── _cache/        # MusicBrainz data backups (JSON)
├── home/              # about.html, about.css, guestbook.html, guestbook.css, links/
├── music/             # distributed-music/, jukebox/, floppy-disk/
│   ├── music.css      # music index styles
│   ├── distributed-music/  # data-driven release catalog (releases.js + app.js)
│   └── jukebox/       # fetches songs.json for playlist
├── press/             # press.css, journals: scientific/, experimental/
├── mcp-server/        # MCP server — exposes project data + Pi management to AI assistants
├── scripts/           # backup-musicbrainz.mjs
├── templates/         # JS template scripts for archive pages
├── ware/              # browser utilities + dev tools (was tools/ — see below)
├── tools/             # redirect shims only — see below
└── visual/            # gallery pages (collage, photography/, music-videos, teevee/tv)
```

## The tools/ → ware/ rename (2026-08-24)

The section formerly at `/tools/` is now `/ware/`. `tools/` still exists but holds
**nothing but 18 meta-refresh redirect stubs**, one per old entry point, each
pointing at its `/ware/` equivalent with a `rel="canonical"` and `noindex`.

GitHub Pages serves this repo's branch directly, so there is no server-side
redirect layer — stub pages are the only mechanism available. Do not add real
content under `tools/`, and do not link to it. Once the old URLs stop drawing
traffic the whole directory can be deleted in one commit.

The two playground sync workflows (`sync-magmascript-playground.yml`,
`sync-texastoast-playground.yml`) `git add` a hardcoded path — they were updated
to `ware/` in the same commit. If you ever move the section again, they move too
or the next upstream release dispatch commits nothing.

## Key conventions

- **Retro aesthetic required**: Keep "Press Start 2P" font, CRT scanlines, neon colors, pixel art
- **Self-contained games**: Each arcade subfolder works standalone. Shared dependencies (adenosine engine, score-client, chat-widget) live in `arcade/shared/`.
- **MusicBrainz rate limit**: API allows ~1 req/sec. `fetchWithRetry` handles backoff - don't batch-fetch
- **Canvas pixel art**: Use `image-rendering: pixelated` and draw at low resolution (64x64), scale with CSS
- **Config via `window.*_CONFIG`**: Archive pages define config objects inline, templates read them
- **Collective templates**: Multi-artist groups use `window.COLLECTIVE_CONFIG` with `ids[]` array. Templates: `collective_recordings.js`, `collective_releases.js`, `collective_works.js`

## Extracted animations

Canvas animations are extracted from page HTML into `animations/`:

| File | Used by | Description |
|---|---|---|
| `volcano.js` | `index.html` | Erupting volcano with cereal particles |
| `cereal.js` | `home/about.html` | Cereal pouring into bowl with milk |
| `coin.js` | `arcade/index.html` | Spinning gold coin sprite |
| `server.js` | `arcade/index.html` | Retro mainframe with CRT, tapes, LEDs |
| `floppy.js` | `music/physical-media/floppy-disk/` | Floppy disk with glint animation |

Each file is a self-contained IIFE with named constants, visibility change handling, and `window.__pageCleanup` hook for the SPA router.

## Page-specific CSS

Pages extract inline CSS to separate files:
- `archive/archive.css` — archive index + EMERAC component
- `arcade/arcade.css` — arcade index + game card grid
- `home/about.css` — about page
- `home/guestbook.css` — guestbook page
- `music/music.css` — music index
- `music/distributed-music/styles.css` — distributed music
- `music/jukebox/styles.css` — jukebox
- `press/press.css` — press index
- `ware/ware.css` — ware index

## Game card previews

Tile illustrations for arcade collections are in `arcade/gamecard-previews.js`.
Each preview is a self-contained IIFE that draws on a 72x72 canvas:
- Board Games (checkerboard + pieces)
- Card Games (fanned hand)
- Puzzles (question mark grid)
- Action (joystick)
- Private (lock icon)

Hidden/commented-out previews (crystal maze, pay2play) are preserved as comments.

## Adenosine game engine

[adenosine](https://github.com/magmacrunchmedia/adenosine) is the game engine used by arcade games.
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

### Repository

[adenosine](https://github.com/magmacrunchmedia/adenosine) is a monorepo (`packages/*` workspaces) published to npm as `@magmacrunch/adenosine-*`.

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

## Distributed music

Release data lives in `music/distributed-music/releases.js` as a `window.RELEASES` array.
The page (`music/distributed-music/app.js`) fetches this data and renders cards dynamically.

To add a new release: add an object to the `RELEASES` array in `releases.js`.

## Jukebox

The full jukebox page (`music/jukebox/`) fetches `songs.json` at runtime for the playlist.
The mini-player widget (`assets/jukebox.js`) has its own embedded track list.
`songs.json` is the single source of truth — MAGMA//OPS reads/writes it.

## MusicBrainz cache

Templates check local JSON cache before hitting the MusicBrainz API. Use magmascript to snapshot all data:

```bash
magmascript mb backup                        # full backup
magmascript mb backup --skip-existing        # skip already-cached entities
magmascript mb backup --stale-only           # only refresh stale caches
```

A GitHub Action and Pi cron job run this weekly with `--skip-existing`.

Cache location: `archive/_cache/{artists,places,contributors,labels}/{uuid}.json`

## Theming nav colors

When overriding nav colors (border, brand text, glow), set CSS variables on `:root`, NOT on a body class. The `body.class` approach does not reliably override the fallback values in style.css.

```css
/* CORRECT — matches guestbook pattern */
:root {
    --nav-accent: #FF1F5B;
    --nav-glow: rgba(255,31,91,0.4);
    --nav-brand: #00C2FF;
    --nav-brand-glow: rgba(0,194,255,0.7);
}

/* WRONG — does not work */
body.my-theme {
    --nav-accent: #FF1F5B;
    /* ... */
}
```

Use `body.my-theme` only for non-nav overrides (background, text colors, etc.).

## Page-specific color themes

Visual pages use a three-part theming pattern:

1. **`visual/visual.css`** — shared base styles (main layout, breadcrumb, page-header, footer, dropdown) that consume CSS custom properties
2. **`:root`** — nav overrides + theme palette + shared pattern vars (`--bc-accent`, `--footer-border`, `--footer-accent`, `--dd-1`–`--dd-5`, `--dd-hover-color`, `--dd-hover-bg`)
3. **`body.theme-name`** — page overrides (background, text, dim, rose, yellow, etc.)

Each visual subpage links `visual.css` for shared structure and keeps its unique component CSS inline. All 5 themes are preserved as inline `:root` palette + `body.theme` overrides.

Existing themes:
- `visual/index.html` — Pop Art (`:root` + `body.pop-art`)
- `visual/music-videos.html` — MTV (`:root` + `body.mtv`)
- `visual/collage.html` — Memphis (`:root` + `body.memphis`)
- `visual/photography/` — City Pop (`:root` + `body.city-pop`)
- `visual/tv/` — Broadcast (`:root` + `body.broadcast`)

## Color palette (defined in style.css)

```
--rose:   #ff3d6e   --yellow: #ffe03a   --cyan:   #00f5ff
--green:  #39ff6e   --orange: #ff7c1f   --purple: #c45fff
--white:  #f0ead8   --black:  #080808
```

## OG images

Preview images for social media (1200x630 PNGs) in `og/`, generated by `scripts/generate-og.mjs`.

- **Logo**: `drawPixelM()` pattern array — edit the 8×8 grid (`1`/`0`)
- **Page configs**: `PAGES` array — title, subtitle, accent color per page
- **Regenerate**: `npm run og`
- **Cache busting**: Bump `?v=N` in `og:image` meta tags after pushing new PNGs
- **Font**: Requires `fonts/PressStart2P-Regular.ttf`

## Testing

```bash
npm test          # lint + JS tests (fast)
npm run check     # lint + Python + JS
npm run test:py   # pytest suites under arcade/
npm run test:js   # node test-*.js under arcade/*/tests/
```

`make test`, `make check`, `make test-py` and `make test-js` do the same thing —
both routes call `scripts/run-tests.mjs`, so there is one implementation of
"find the suites and run them" rather than a copy in each.

**Python interpreter.** The runner probes `$PYTHON`, then `$VIRTUAL_ENV`, then
`py -3`, `python3`, `python`, and uses the first that actually executes. It does
not simply take the first on PATH: on Windows `python3` is usually the Microsoft
Store stub, which exists, is not Python, and opens the Store when run. To test
against a virtualenv without activating it in whatever shell npm spawns:

```bash
PYTHON=/path/to/venv/bin/python npm run test:py
```

pytest comes from the root `requirements.txt` (`pip install -r requirements.txt`).
If it is missing the runner says so and exits non-zero — it does not report a pass.

**These scripts used to be POSIX one-liners** and npm hands scripts to cmd.exe
unless `script-shell` is set, so on Windows neither ran: `test:py` died on
`'while' is not recognized` and `test:js` on ``find: missing argument to `-exec'``.
`npm test` is `lint && test:js`, so it reported success while running no tests at
all. Keep the runner in Node for that reason.

### What covers what

| suite | covers |
|---|---|
| `arcade/<game>/tests/test_*.py` | game rules, in-process — no sockets |
| `arcade/shared/tests/test_services.py` | `services.json` and the dashboard's reader of it |
| `arcade/shared/tests/test_server_base.py` | the handshake gate, `client_ip`, and the per-IP limiters |
| `arcade/tests/test_chat_server.py` | `chat-server.py`'s protocol, over a real socket on an ephemeral port |
| `arcade/tests/smoke-test.mjs` | every game page loads; multiplayer lobbies open; the chat widget connects |

`chat-server.py` is loaded with `importlib` because the hyphen in its name is not
a valid identifier — renaming it would break the systemd unit and the deploy.

The chat and `server_base` tests assert behaviour that survives a *reconnect*, not
just return values. The bugs they exist for were a limiter that reset on a new
socket and a rate-limit check whose return value every caller discarded — both
look correct in isolation, and both pass a test that only calls the function.

**No `pytest-asyncio`.** `requirements.txt` is what the Pi installs; `asyncio.run()`
inside a sync test does the same job with nothing added.

**Local dev must be served over http**, not opened off disk. A `file://` page
sends `Origin: null`, which the handshake gate refuses.

---

## Adding a new arcade game

### Quick start with scaffolder

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

### Manual setup

1. Create folder under `arcade/`
2. Include `index.html`, `js/` (game logic), `css/` (styles)
3. Follow the pixel art conventions - use canvas at low res, scale with CSS
4. Add link to `arcade/index.html` nav

## Arcade chat system

The chat widget provides a floating real-time chat on nearly every arcade page.
It uses a SharedWorker (`shared/chat-worker.js`) to hold a single WebSocket
connection across page navigations — preventing duplicate users when navigating
between games.

**The widget is generated, the server is not.** `shared/adenosine-chat.js`,
`shared/chat-worker.js` and `shared/chat-widget.css` are synced from the
`@magmacrunch/adenosine-chat` npm package by `npm run build:adenosine`; an edit
made to any of them here survives until the next sync and is then silently
overwritten. Change them in the [adenosine](https://github.com/magmacrunchmedia/adenosine)
repo, publish, and re-sync. `shared/chat-server.js` is hand-written and lives here.

### Architecture

```
Page (browser) ──postMessage──▶ SharedWorker ──WebSocket──▶ chat-server.py (port 8768)
     │                              │
     └── sendToServer() ────────────┘
```

- **SharedWorker** holds one WebSocket. Pages connect via `postMessage`. Caches history/user_list/status for new pages.
- **Session tokens** stored in `localStorage` (one per browser profile). Server tracks disconnected users for 30s and restores name, color, *and room membership* on reconnect.
- **Server** delays `user_info` creation until `set_name` arrives (no anonymous flicker).
- **Which host the widget dials** is decided only by `MC_CHAT_OPTS` in `shared/chat-server.js` — LAN and Tailscale hosts talk to port 8768 directly, everything public goes through nginx on `magmacrunch.duckdns.org`. Its `allowlist` is a security control: the widget replays saved credentials as soon as the socket opens, so an unrestricted `?server=` override would hand a visitor's identity to any host named in a crafted link. Do not re-derive the host anywhere else.

### Adding chat to a game page

```html
<link rel="stylesheet" href="../shared/chat-widget.css">
<script src="../shared/adenosine-chat.js"></script>
<script src="../shared/chat-server.js"></script>
<script>AdChat.ChatWidget.connect(MC_CHAT_OPTS);</script>
```

`npm run build:adenosine` stamps the `?v=` cache-busting hashes on those tags.

### Public API

```js
ChatWidget.connect(opts)
ChatWidget.disconnect()
ChatWidget.joinRoom(code)
ChatWidget.leaveRoom(code)
ChatWidget.setName(name)
ChatWidget.setColor(color)
ChatWidget.getMyName()
ChatWidget.getMyColor()
```

### Shared handshake gate and rate limits

`chat-server.py` imports `client_ip`, `ip_limiter`, `make_reject_request` and
`limiter_janitor` from `shared/multiplayer/server_base.py`, the same module the
game servers use. That module owns:

- **`client_ip`** — reads nginx's `X-Real-IP`, but only when the TCP peer is loopback. Behind the proxy every connection looks like `127.0.0.1`, so without this every visitor shares one rate-limit bucket. Not `X-Forwarded-For`: nginx *appends* to that one, so a client can seed it.
- **`origin_allowed`** — refuses cross-origin browser handshakes. A missing `Origin` is allowed (health bots, the admin dashboard, tests); `null` is not, so **local development must be served over http, not opened off disk**.
- **`ip_limiter`** — one process-wide limiter keyed by `(ip, action)`. The old per-connection limiters reset on reconnect, which cost a spammer one extra socket.
- **`make_reject_request(max_connections=...)`** — the `process_request` gate. Plain HTTP still gets 426, so the health bot keeps working. Games allow 10 new sockets per IP per minute; chat allows 30, because browsers without SharedWorker support open one per page navigation.

### Room codes and history

Room codes must match `^[A-Z0-9]{4,8}$` and there is a cap of 200 live rooms.
Chatting into a room requires being a member of it. When the last member leaves,
both the room and its stored messages are dropped — the messages used to be left
behind, so every code the arcade ever issued kept its transcript until restart.

### The `get_history` dump

`get_history` returns every room's private sub-chat, so it requires
`ARCADE_ADMIN_TOKEN`. Set the same value for `arcade-chat` and `arcade-admin`;
both units read `/home/jake/arcade-secrets.env` (optional include, so a
missing file leaves the dashboard's chat panel empty rather than failing to
start). Create it on the Pi:

```bash
umask 077 && openssl rand -hex 32 | sed "s/^/ARCADE_ADMIN_TOKEN=/" > /home/jake/arcade-secrets.env
```

It sits beside `~/arcade`, not inside it: `deploy-pi.yml` rsyncs `arcade/` with
`--delete`, so a secret stored under `~/arcade` would be erased on the next push
to `main`.

An unauthenticated request is ignored rather than refused: `chat-worker.js` still
sends one on every socket open, and an error frame there would surface as a
broken widget. Dropping that call is a pending change in the adenosine repo.

### Service list

Ports, directories, icons and nginx paths live in `arcade/shared/services.json`.
`chat-server.py` (status panel), `start-all.sh`, `scripts/bot-check-services.sh`
and `admin/server.py` (dashboard cards, and the allowlist of units it will
restart) all read it. Adding a game means an entry there, a unit in
`arcade/systemd/`, and a `location` block in `scripts/nginx-magmacrunch.conf`.

The manifest has two arrays and the difference is load-bearing:

- `services` — started by `start-all.sh` and TCP-probed by the health bot every
  30 minutes. An entry here is also an alert path, and it must take `--port`.
- `dashboard_only` — units that exist on the Pi but are neither started nor
  probed. Only `admin/server.py` reads it. `arcade-private` (8782) sits here
  because `private/server.py` reads its port from `config.json` rather than
  `--port`, and because 8782 is not proxied by nginx and nothing has confirmed
  the unit is enabled — probing it would invent a "service down" alert.

`arcade-admin` is in neither array. It is the dashboard's own process, so
`admin/server.py` hardcodes it into `VALID_UNITS`: restartable by name, never
drawn as a card.

`VALID_UNITS` is what the dashboard hands to `systemctl restart`, so
`admin/server.py` parses the manifest once at import and validates every field
before trusting it — unit names must match `arcade-<slug>`, and `name`/`icon` are
rejected if they contain HTML metacharacters, because `static/arcade.js` and
`static/status.js` put both into `innerHTML` unescaped. A manifest it cannot
validate raises, so the unit fails to start with the reason in the journal rather
than coming up with a half-built allowlist. `arcade/shared/tests/test_services.py`
covers all of this.

### Deploying chat-server.py

A push to `main` deploys everything: `.github/workflows/deploy-pi.yml` rsyncs the
whole of `arcade/` and restarts every `arcade-*` unit. To push by hand instead,
note that `chat-server.py` now imports from `server_base.py` and reads
`services.json`, so all three have to go together:

```bash
rsync -avz arcade/chat-server.py jake@192.168.1.16:~/arcade/chat-server.py
rsync -avz arcade/shared/services.json jake@192.168.1.16:~/arcade/shared/services.json
rsync -avz arcade/shared/multiplayer/server_base.py jake@192.168.1.16:~/arcade/shared/multiplayer/server_base.py
ssh jake@192.168.1.16 "sudo systemctl restart arcade-chat 'arcade-*'"
```

The game servers restart too: they share `server_base.py`.

### Note on websockets library

`chat-server.py` uses `websockets.datastructures.Headers` for the handshake
responses (not a plain dict). This is required by `websockets` >= 14.x. If you
see `AttributeError: 'dict' object has no attribute 'serialize`, the import is
missing.


## High scores

All arcade game high scores are managed through the MAGMA//OPS admin dashboard on the Raspberry Pi.

### Architecture

```
Game (browser) ──WebSocket──▶ admin/server.py ──file I/O──▶ arcade/admin/scores/{game}.json
     │                                                         │
     └── localStorage fallback (offline)                       └── JSON files (one per game)
```

- **ScoreClient** — shared library that games include. Two versions:
  - `arcade/shared/adenosine-score-client.js` (recommended) — `new AdScore.ScoreClient().auto()`
  - `arcade/shared/score-client.js` (legacy) — `ScoreClient.auto()`
- **Server** (`arcade/admin/server.py`) — WebSocket actions: `score_load`, `score_save`, `scores_all`, `score_reset`
- **Storage** (`arcade/admin/scores/`) — one JSON file per game
- **Dashboard** — HIGH SCORES section in MAGMA//OPS shows all leaderboards

### Games with server-side scores

| Game | Game ID | Score type | Client |
|------|---------|-----------|--------|
| tetris | `tetris` | points | adenosine |
| 2^N | `2n` | target reached | adenosine |
| george-boole | `george-boole` | points | adenosine |
| fifteen-puzzle | `fifteen-puzzle` | moves (ascending) | adenosine |
| klotski | `klotski` | moves (ascending) | adenosine |
| threes | `threes` | points | adenosine |
| cribbage | `cribbage` | score | adenosine |
| tarot | `tarot` | score | adenosine |
| moonlight-drift | `moonlight-drift` | obstacles passed | legacy |
| solitaire | `solitaire` | score | legacy |
| scandinavian-stud | `scandinavian-stud` | score | legacy |
| solitaire_THLD | `solitaire-thld` | score | legacy |

### Adding scores to a new game

1. Add to `index.html`:
   ```html
   <script src="../shared/adenosine-score-client.js"></script>
   <script>const scoreClient = new AdScore.ScoreClient().auto();</script>
   ```
2. In your game's scoring code:
   ```js
   // Load
   const scores = await scoreClient.load('your-game-id');
   
   // Save (auto-syncs to Pi, falls back to localStorage)
   await scoreClient.save('your-game-id', 'JAM', 12400, { level: 5 });
   ```
3. Game ID should match the JSON filename (e.g. `your-game-id` → `scores/your-game-id.json`)

### Migration from JSONBin

Run `node scripts/migrate-jsonbin.mjs` to snapshot all JSONBin scores locally. This was a one-time migration — games now use ScoreClient exclusively. No API keys in client-side code.

## Hit counter

Retro hit counter that tracks total page loads site-wide, displayed on the guestbook page.

### Architecture

```
Every page (nav.js) ──WebSocket──▶ counter-server.py ──file I/O──▶ arcade/counter/count.json
        │                                                         │
        └── CounterClient.increment() (fire-and-forget)           └── {"count": N}
```

- **Server** (`arcade/counter/counter-server.py`) — WebSocket on port 8783, persists count to JSON
- **Client** (`assets/counter-client.js`) — shared library loaded by nav.js on every page
- **Display** (`assets/counter.css`) — retro LED digit styling for the guestbook page
- **Storage** (`arcade/counter/count.json`) — `{"count": N}`

### How it works

1. `nav.js` loads `counter-client.js` on every page with a `<nav>` element
2. On first page load per session, `CounterClient.increment()` fires a WebSocket message to the Pi
3. The server bumps the count and persists to `count.json`
4. On the guestbook page, `CounterClient.display('#hit-counter')` renders the retro LED counter

### Adding counter to a new page

To display the counter on another page:
```html
<link rel="stylesheet" href="../assets/counter.css">
<div id="hit-counter"></div>
<script>CounterClient.display('#hit-counter');</script>
```

### Disabling counter on a page

Add `no-counter` to the `<body>` class:
```html
<body class="no-counter">
```

### Deploying counter-server.py

```bash
rsync -avz arcade/counter/ jake@192.168.1.16:~/arcade/counter/
ssh jake@192.168.1.16 "sudo systemctl restart arcade-counter"
```

## MCP server

Remote MCP server that exposes magmacrunch.com data and Pi/MC1 management to AI coding assistants. Runs on MC1 (WSL2), accessible via HTTPS through Pi's nginx reverse proxy.

### Architecture

```
Internet ──HTTPS──> Pi (nginx:443) ──Tailscale──> MC1 (WSL2:8785) ──SSH──> Pi (game servers)
                                        └─SSH──> MC1 (local services)
```

- **Server** (`mcp-server/serve.py`) — runs on MC1 WSL2, port 8785
- **Proxy** — Pi nginx at `https://magmacrunch.duckdns.org/mcp` → MC1 via Tailscale
- **Auth** — API key in `Authorization: Bearer <key>` header (validated by nginx)
- **Config** (`opencode.json`) — opencode connects as `"type": "remote"`
- **Service** — systemd on MC1 WSL2 (`mcp-server.service`) + Windows scheduled task for auto-start on boot

### SSH access

Windows host: `ssh magma@100.75.220.87`
WSL2 commands: `wsl -d Ubuntu -u root -- <command>`

### Setup

**MC1 (WSL2):**
```bash
# Clone repos
cd ~
git clone https://github.com/magmacrunchmedia/magmacrunch.com.git website
git clone https://github.com/magmacrunchmedia/magmascript.git

# Create Python venv
cd ~/website/mcp-server
python3 -m venv venv
source venv/bin/activate
pip install -r ~/website/mcp-server/requirements.txt
cd ~/magmascript && pip install -e .

# Configure
mkdir -p ~/.config/magmascript
# Add config.toml with [pi], [mc1], [gh] sections
# Add .env with MCP_API_KEY, GITHUB_PAT, DISCOGS_TOKEN

# Enable systemd service
sudo systemctl enable mcp-server
sudo systemctl start mcp-server
```

**Pi (nginx proxy):**
```bash
# nginx proxy_pass points to MC1 via Tailscale
# In /etc/nginx/sites-available/magmacrunch:
#   proxy_pass http://100.75.220.87:8785/mcp;
#   proxy_set_header Host 100.75.220.87:8785;
sudo nginx -t && sudo systemctl reload nginx
```

### Tools

| Category | Tool | Description |
|---|---|---|
| MusicBrainz cache | `list_cached_entities` | List all cached entities (artists, places, contributors, labels, works, collectives) |
| | `get_entity` | Get full data for a specific entity by type and UUID/slug |
| | `search_cache` | Search cached entity names by substring |
| High scores | `list_scoreboards` | List all game leaderboards with entry counts and top scores |
| | `get_scores` | Get leaderboard for a specific game |
| Project structure | `list_archive_pages` | List all archive pages (artists, places, contributors, labels) |
| | `list_arcade_games` | List all arcade games with server info |
| Pi services | `check_pi_services` | Check status of all arcade services |
| | `get_service_logs` | Get recent logs for a service |
| | `restart_pi_service` | Restart a service |
| | `get_pi_system_info` | Get uptime, memory, CPU temp, load |
| | `deploy_to_pi` | rsync files to the Pi and optionally restart a service |
| MC1 services | `check_mc1_services` | Check status of Windows services |
| | `get_mc1_system_info` | Get uptime, memory, CPU, disk |
| | `restart_mc1_service` | Restart a Windows service |
| | `get_mc1_processes` | Get top processes by CPU usage |
| | `reboot_mc1` | Reboot MC1 |
| Discogs | `search_discogs` | Search Discogs for artists/labels/releases |
| GitHub | `github_*` | Repository and workflow management |

### Service management

**MC1 (WSL2):**
```bash
# SSH into MC1 first
ssh magma@100.75.220.87

# Then run WSL2 commands:
wsl -d Ubuntu -u root -- systemctl status mcp-server
wsl -d Ubuntu -u root -- systemctl restart mcp-server
wsl -d Ubuntu -u root -- journalctl -u mcp-server -f
wsl -d Ubuntu -u root -- journalctl -u mcp-server -n 50
```

**Pi (nginx):**
```bash
# Reload nginx after config changes
sudo nginx -t && sudo systemctl reload nginx
```

### opencode.json config

```json
{
  "mcp": {
    "magma": {
      "type": "remote",
      "url": "https://magmacrunch.duckdns.org/mcp",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer ${MCP_API_KEY}"
      }
    }
  }
}
```

### Troubleshooting

- **401 Unauthorized** — check `MCP_API_KEY` in `~/.zshrc` (Mac) and `~/website/mcp-server/.env` (MC1)
- **502 Bad Gateway** — MCP server not running on MC1; SSH in (`ssh magma@100.75.220.87`) then check `wsl -d Ubuntu -u root -- systemctl status mcp-server`
- **Connection refused** — port 443 not forwarded from router; check router config
- **MC1 unreachable** — check Tailscale status: `tailscale status | grep mc1`
- **Pi fallback** — if MC1 is down, change nginx proxy_pass back to `http://127.0.0.1:8785/mcp` and reload nginx

### Legacy (local subprocess)

Before the remote server, the MCP ran as a local subprocess on the Mac:

```json
{
  "mcp": {
    "magma": {
      "type": "local",
      "command": ["/opt/homebrew/bin/python3.14", "mcp-server/magma-mcp.py"],
      "cwd": ".",
      "enabled": true,
      "env": {
        "DISCOGS_TOKEN": "${DISCOGS_TOKEN}",
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

This only works when the laptop is awake. The remote server is always available.

## Adding archive pages

See `archive/ARCHIVE_THEMING.md` for detailed theming patterns. Short version:
1. Create folder under `archive/by-artist/`, `archive/by-place/`, or `archive/by-contributor/`
2. Copy stub template from existing page
3. Set `window.ARTIST_CONFIG`, `window.PLACE_CONFIG`, or `window.__CONTRIBUTOR_CONFIG` with MusicBrainz UUID
4. Choose `accent` color per page type (green/cyan/rose/yellow/blue)
5. For contributor pages, also load `entity-map.js` before `contributor.js`
6. For multi-artist collectives, use `window.COLLECTIVE_CONFIG` with `ids[]` array and load `collective_*.js` templates

## Raspberry Pi deployment

### One-shot setup

```bash
# From Mac — copy files to Pi and run setup
rsync -avz arcade/ jake@100.74.172.4:~/arcade/
ssh jake@100.74.172.4 "sudo bash ~/arcade/scripts/setup-pi.sh"
```

This installs systemd services for all servers + dashboard, enables auto-start on boot, and places a desktop shortcut. The venv is created automatically by `setup-pi.sh` and dependencies are installed from `arcade/requirements.txt`.

### Venv recovery

If the Pi venv is lost, recreate it:

```bash
ssh jake@100.74.172.4
cd ~/arcade
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart 'arcade-*'
```

### Admin dashboard

 `arcade/admin/` — Web-based monitoring and management UI (v4.0).

- **Port**: 8780 (HTTP) + 8781 (WebSocket for live logs)
- **Desktop shortcut**: "MagmaCrunch Ops" — opens dashboard in Chromium
- **Config**: `arcade/admin/config.json` — set `auth: true` for password protection
- **Dependency**: Uses `magmascript` Python library for GitHub API (`GHClient`) and Pi management (`PIClient(local=True)`)

Commands:
```bash
ssh jake@100.74.172.4 "sudo systemctl restart arcade-admin"
ssh jake@100.74.172.4 "journalctl -u arcade-admin -f"
```

### Systemd services

All servers run as systemd services (auto-start on boot, auto-restart on crash).
The name/port/path mapping is `arcade/shared/services.json`; this table mirrors it.

| Service | Port |
|---|---|
| `arcade-sorry` | 8765 |
| `arcade-cribbage` | 8766 |
| `arcade-stud` | 8767 |
| `arcade-chat` | 8768 |
| `arcade-chess` | 8769 |
| `arcade-checkers` | 8770 |
| `arcade-backgammon` | 8771 |
| `arcade-chinese-checkers` | 8772 |
| `arcade-parchisi` | 8773 |
| `arcade-aggravation` | 8774 |
| `arcade-counter` | 8783 |
| `arcade-private` | 8782 |
| `arcade-admin` | 8780 |

Quick commands:
```bash
# Status
sudo systemctl status 'arcade-*'

# Restart one
sudo systemctl restart arcade-chat

# Logs
journalctl -u 'arcade-*' -f
journalctl -u arcade-chat -n 50
```

## CI/CD (GitHub Actions)

### Auto-deploy to Pi

`.github/workflows/deploy-pi.yml` — triggers on push to `main` or manual dispatch.

- **Runner**: Self-hosted on MC1 (`runs-on: self-hosted`)
- **Action**: rsync `arcade/` → Pi, restart all `arcade-*` services
- **Secrets**: `PI_SSH_KEY` (ed25519 private key for `jake@100.74.172.4`)
- **Excludes**: `node_modules`, `.git`, `*.pyc`, `__pycache__`, `scores/*.json`
- **Network**: Uses Tailscale IP (`100.74.172.4`) for Pi SSH — works from any network

### MC1 Runner Setup

MC1 (Windows PC) runs the self-hosted GitHub Actions runner inside WSL2 Ubuntu:

- **SSH**: `ssh magma@100.75.220.87` (Windows host)
- **Service**: `actions.runner.magmacrunchmedia-magmacrunch.com.MC1-linux`
- **Config**: `~/actions-runner` (WSL2 Ubuntu: `wsl -d Ubuntu`)
- **Start type**: enabled (auto-starts on boot via systemd)
- **Labels**: `self-hosted`, `linux`
- **SSH key**: `~/.ssh/id_ed25519` (WS2) — must be authorized on Pi

**Workflows running on MC1:**
- `deploy-pi.yml` — deploy to Pi
- `check-services.yml` — TCP health check of Pi services
- `smoke-test.yml` — Playwright smoke tests

**WSL2 prerequisites:**
- Ubuntu (via `wsl --install -d Ubuntu`)
- `git`, `curl`, `build-essential`, `libssl-dev`, `libicu-dev`
- SSH key at `~/.ssh/id_ed25519` (copied from Windows: `/mnt/c/Users/magma/.ssh/`)

**Note:** The `~/.ssh/id_ed25519` key is the one authorized on the Pi. If WSL2 is reinstalled, copy the key again:
```bash
cp /mnt/c/Users/magma/.ssh/id_ed25519 ~/.ssh/id_ed25519
cp /mnt/c/Users/magma/.ssh/id_ed25519.pub ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/id_ed25519
```

### Updating the SSH key for Pi access

The deploy workflow uses the SSH key at `~/.ssh/id_ed25519` in WSL2 to connect to the Pi via Tailscale.

**If the key needs to be replaced:**
```bash
# Generate new key in WSL2
wsl -d Ubuntu -- ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519

# Copy public key to Pi
ssh-copy-id -i ~/.ssh/id_ed25519.pub jake@100.74.172.4
```

### Workflows on GitHub Actions

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push/PR to `main` | ESLint + pytest + JS tests |
| `deploy-pi.yml` | Push to `main` / manual | Deploy `arcade/` to Raspberry Pi |
| `bot-status.yml` | Weekly (Mon 7AM UTC) / manual | Check all bot statuses, post report to Discussion |
| `bake-cache.yml` | After MusicBrainz backup / manual | Inline cache data into archive HTML pages |
| `check-archive-format.yml` | Push/PR to `main` (archive changes) | Check archive HTML formatting, create/update Issue |
| `generate-stubs.yml` | Push to `main` (config change) | Auto-generate archive page stubs |

### Workflows migrated to Pi cron

These workflows now run as cron jobs on the Raspberry Pi (`arcade/scripts/bot-*.sh`):

| Workflow | Cron | Purpose |
|---|---|---|
| `check-links.yml` | Mon 6 AM UTC | Lychee link checker → GitHub Issue |
| `check-services.yml` | Every 30 min | TCP health check → Discussion + Discord |
| `smoke-test.yml` | Mon 10 AM UTC | Playwright smoke tests → GitHub Issue |
| `backup-musicbrainz.yml` | Mon 6 AM UTC | MusicBrainz cache backup → git push |
| `backup-tmdb.yml` | Mon 6:30 AM UTC | TMDB cache backup → git push |
| `play-counts.yml` | Mon 6 AM UTC | Last.fm play counts → git push |
| `weekly-scores.yml` | Mon 6 AM UTC | Score leaderboard → Discussion + Discord |
| `rebuild-search-index.yml` | Daily 7 AM UTC | Rebuild search index → git push |

All migrated workflows retain `workflow_dispatch` triggers for manual runs from the GitHub UI.

### Pi cron bot setup

Scripts live in `arcade/scripts/` and are deployed to the Pi via rsync. Shared helpers are in `pi-bot-env.sh`.

**Requirements on the Pi:**
- Node.js 20+ (`sudo apt install nodejs`)
- lychee (`/usr/local/bin/lychee`)
- Playwright + Chromium (for smoke tests)
- GitHub PAT with `repo` scope (for push + API access)

**Environment file**: `~/arcade/.env` on the Pi:
```
GITHUB_PAT=ghp_...
TMDB_API_KEY=...
LASTFM_API_KEY=...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

**Adding a new Pi bot:**
1. Create `arcade/scripts/bot-<name>.sh` that sources `pi-bot-env.sh`
2. Use `gh_api` helper for GitHub API calls
3. Use `discord_post` helper for Discord notifications
4. Add cron entry: `crontab -e` on the Pi
5. Logs go to `~/arcade/logs/<name>.log`

**Cron jobs on the Pi:**
```bash
crontab -l    # View all cron jobs
```

**Viewing bot logs:**
```bash
ssh jake@100.74.172.4 "tail -50 ~/arcade/logs/check-links.log"
ssh jake@100.74.172.4 "tail -50 ~/arcade/logs/check-services.log"
```

### Broken link checker (Pi)

`arcade/scripts/bot-check-links.sh` uses lychee to scan all HTML/MD files for broken links.

- **Cron**: Monday 6 AM UTC
- **Excludes**: Private IPs (`192.168.*`, `localhost`), `mailto:` links
- **Rate limits**: Accepts 403/429 (MusicBrainz bot protection)
- **Reporting**: Creates/updates GitHub Issue with broken link report
- **Config**: `.lycheeignore` at repo root for exclude patterns

### Pi service health check (Pi)

`arcade/scripts/bot-check-services.sh` — TCP port check of all public-facing Pi services.

- **Cron**: Every 30 minutes
- **Checks**: Ports 8765–8774 (games), 8783 (counter) via `nc -z`
- **Excludes**: Admin (8780, localhost-only), Private (8782, firewall-blocked)
- **Reporting**: Posts to GitHub Discussion + Discord webhook on failure

### Generate archive stubs

- **Triggers**: Push to `main` when `scripts/archive-stubs.json` changes, manual
- **Config**: `scripts/archive-stubs.json` — add entities to generate
- **Generates**: Artist subpages, contributor/label index pages, place subpages
- **Also updates**: `templates/entity-map.js`, `scripts/backup-musicbrainz.mjs`
- **Note**: Hero/index pages and shared CSS still need manual creation

### MusicBrainz cache bake

`.github/workflows/bake-cache.yml` — inlines cache data into archive HTML pages.

- **Triggers**: After MusicBrainz backup completes, manual
- **Action**: Runs `scripts/bake-cache.mjs` — injects `window.__MB_CACHE` into all archive stubs
- **Result**: Pages load instantly (no fetch() call at runtime)
- **Note**: Pages are larger (500KB–3.5MB) but work offline

### MusicBrainz cache snapshots

`scripts/backup-musicbrainz.mjs` saves timestamped snapshots before overwriting cache files.

- **Location**: `archive/_cache/snapshots/{date}/{type}/{uuid}.json`
- **Retention**: Last 4 snapshots (1 month of history)
- **Use case**: Restore old data if MusicBrainz servers go down

### Archive stub generator

`.github/workflows/check-archive-format.yml` — validates formatting consistency across archive HTML files.

- **Triggers**: Push/PR to `main` when `archive/**` changes, manual
- **Script**: `scripts/check-archive-format.js` — no dependencies, exits non-zero on warnings
- **Checks**:
  - Sub-nav CSS class matches link text (e.g. "music videos" → `c-music-videos`)
  - No orphan `</div>` tags
- **Output**: Console warnings + GitHub Issue ("Archive format warnings"). Issue auto-closes when clean.

### Running the self-hosted runner

The runner runs as a systemd service inside WSL2 on MC1 — no manual intervention needed.

**Status check (from MC1):**
```bash
ssh magma@100.75.220.87
wsl -d Ubuntu -- sudo systemctl status actions.runner.magmacrunchmedia-magmacrunch.com.MC1-linux.service
```

**Restart (from MC1):**
```bash
ssh magma@100.75.220.87
wsl -d Ubuntu -- sudo systemctl restart actions.runner.magmacrunchmedia-magmacrunch.com.MC1-linux.service
```

**If MC1 is off:** pushes to `main` skip deployment (no error).

## opencode on MC1 — known issues

### Tool Serialization Bug (BuildMessage)

**Error:** `BuildMessage: Unexpected escaped backslash '\\'`
**Also shows as:** `Unexpected server error. Check server logs for details.`

**Cause:** opencode v1.18.18 has a bug in its tool definition serialization. When too many custom TypeScript tools from `~/.opencode/tools/` are loaded together, the message builder hits a backslash parsing error in `ToolRegistry.state`. The issue is combinatorial — individual tools work fine, but certain combinations trigger it.

**Known problematic tools (Aug 15 batch):**
- `analyze-corrections.ts`
- `auto-update-facts.ts`
- `detect-patterns.ts`
- `service-monitor.ts`

**Fix:**
1. Remove the problematic tools: `rm ~/.opencode/tools/{analyze-corrections,auto-update-facts,detect-patterns,service-monitor}.ts`
2. Keep the 11 working tools: `check-services, deploy, run-tests, search-codebase, changelog, search-multiple, test-runner, detect-project, verify-claim, verify-deploy, rag-search`
3. Restart opencode

**Workaround:** Use `opencode run --pure` to skip tool loading entirely.

**Prevention:**
- Don't run `opencode uninstall` — it can delete `~/.config/opencode/opencode.json` (the Ollama provider config). If it does, restore from the example config in the `magmacrunch-ai` repo.
- When adding new tools, test them one at a time first, then in combination
- Keep tool count under ~11 to avoid triggering the bug
- Reference: `magmacrunch-ai` repo `knowledge/projects/error-patterns.md`

## Monitoring & Security

### Websockets logging

All WebSocket servers (`chat-server.py`, `server_base.py`) have INFO-level logging enabled:

```bash
# Live stream all connection events
ssh jake@192.168.1.16 "journalctl -u 'arcade-*' -f"

# Last 50 lines for chat server
ssh jake@192.168.1.16 "journalctl -u arcade-chat -n 50"
```

Log format:
```
18:46:31 [Chat] Starting chat server on port 8768
18:47:15 Connect: ('213.209.159.154', 54321)
18:47:15 Rate limited: global from ('213.209.159.154', 54321)
18:47:16 Disconnect: ('213.209.159.154', 54321)
18:48:00 High connection rate: 213.209.159.154 (12 in 60s)
```

### Connection rate tracking

`chat-server.py` and `server_base.py` track connections per IP. If an IP makes >10 connections in 60 seconds, a warning is logged. This detects bots reconnecting rapidly.

### fail2ban jails

Four fail2ban jails auto-ban scanners and brute-force attackers:

| Jail | What it catches | Ban time |
|------|-----------------|----------|
| `nginx-scanner` | .env probes, wp-admin, phpmyadmin, .git scans | 24 hours |
| `nginx-botsearch` | CMS scanning (wp-login, roundcube) | 24 hours |
| `nginx-bad-request` | Malformed requests (400 errors) | 1 hour |
| `sshd` | SSH brute-force | default |

```bash
# Check fail2ban status
ssh jake@192.168.1.16 "sudo fail2ban-client status"
ssh jake@192.168.1.16 "sudo fail2ban-client status nginx-scanner"
```

Config files on Pi: `/etc/fail2ban/jail.local`, `/etc/fail2ban/filter.d/nginx-scanner.conf`

### Admin TRAFFIC tab

The MAGMA//OPS dashboard has a TRAFFIC tab showing nginx access log analysis:

- **Top IPs** — by request count
- **Status codes** — 426 (bot rejected), 301 (redirect), 101 (websocket)
- **User agents** — suspicious entries highlighted (spoofed MSIE 7.0, etc.)
- **Total requests** count

Open: `http://192.168.1.16:8780` → TRAFFIC tab → REFRESH

### nginx access logs

```bash
# Last 100 lines
ssh jake@192.168.1.16 "tail -100 /var/log/nginx/access.log"

# Top IPs
ssh jake@192.168.1.16 "awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10"

# .env scanners
ssh jake@192.168.1.16 "grep '\.env' /var/log/nginx/access.log | tail -10"
```
