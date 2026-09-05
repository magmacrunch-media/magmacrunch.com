# AGENTS.md — magmacrunch.com

Retro pixel-art personal site: arcade games, a MusicBrainz-backed music archive,
music, press, and visual galleries. Static site served straight from this repo by
GitHub Pages; WebSocket game/chat/score servers run on a Raspberry Pi.
Deep operational docs live in `docs/ops/` — see the index at the bottom.

## Dev approach

Open `index.html` directly in browser — no build server, and nothing is compiled;
the deployed artifact is the git tree, so anything generated must be committed.

There *is* npm and there *are* tests, despite what this line used to say:
`npm ci` installs seven adenosine runtime deps, `npm test` runs lint plus the JS
suite, `npm run check` adds the Python tests and the ware shell token contract,
and `ci.yml` runs four jobs including a Playwright arcade smoke test.
`npm run build:adenosine` syncs bundles out of `node_modules/` and stamps cache
busters — a copy step, not a compile step.

## Git identity — read before committing

**Commit and push as `magmacrunchmedia`. Never add an AI attribution trailer.**

On Windows (MC1): Git Credential Manager already authenticates pushes as the
right account. Do **not** run `gh auth login` or `gh auth switch` here, and
ignore `gh auth status` reporting "not logged into any GitHub hosts" — that is
expected and harmless (only CI uses `gh`). Just verify the commit author:
`git log -1 --format='%an <%ae>'` → want `magmacrunchmedia <magmacrunchmedia@gmail.com>`.

On the Mac: `gh` *is* the credential helper, so pushes go out as whichever
account `gh` has active — run the `gh auth` check in `docs/ops/git-identity.md`
before every push. Full per-machine details live in that file.

**No AI attribution.** Do not append `Co-Authored-By: Claude …`, "Generated with
…", or any similar trailer to commit messages, PR bodies or release notes. These
are Jake's own published projects under his own name and npm account. Both repo
histories were rewritten once to strip these — do not reintroduce them. If your
tooling adds such a line by default, remove it before committing.

The same applies in `~/Documents/game_dev/adenosine`, which has no agent-guidance file of its own.

## Two sessions at once — use a worktree

**Do not run two agents in this clone at the same time.** They share the index,
the branch and the push, not just the files. All four of these happened here in
one afternoon:

- `git add <my paths>` staged fine, but `git diff --cached` then showed the
  *other* session's files too, because they were already in the shared index. A
  plain `git commit` would have taken both.
- The pre-commit hook refused every commit for twenty minutes because a page
  belonging to the other session had an unstaged `?v=` stamp. Nothing was wrong
  with the commit being attempted.
- One session's staged work came within one `git commit -a` of being swept into
  the other's commit, under the wrong message.
- `git push` was rejected as behind — the other session had pushed the same
  branch seconds earlier, carrying the first session's commit out with it
  before its author had run `push` at all.

Give each session its own checkout instead:

```bash
npm run worktree -- new <branch>
```

That creates `../.worktrees/<branch>` — beside the repo, not inside it, so
recursive scans of the tree do not see it twice — and links in the gitignored
directories `npm` needs. Without those links a worktree cannot run `npm test`
at all: everything npm depends on is gitignored, so a fresh checkout has no
eslint and no Playwright, and a per-worktree `npm ci` would cost 92MB and
several minutes each time.

| command | |
|---|---|
| `npm run worktree -- new <branch>` | create one and provision it |
| `npm run worktree -- link <path>` | provision one that already exists |
| `npm run worktree -- list` | every worktree, and whether it is provisioned |
| `npm run worktree -- remove <path>` | remove it and its links |

`link` is for worktrees this script did not create — Claude Code makes its own
under `.claude/worktrees/`, and those need provisioning too.

Each worktree has its own index, HEAD and branch over the one object store, so
commits are independent and nothing is shared until a push. Secrets are **not**
copied in: `arcade/private/config.json`, `arcade/admin/*.json` and
`mcp-server/.env` stay in the primary tree, and `new` names any that exist so
you can copy them by hand if that worktree needs the admin dashboard or a chat
server.

Removal is safe against the shared `node_modules`. `git worktree remove`,
PowerShell's `Remove-Item -Recurse -Force` and Git Bash's `rm -rf` were each
checked on MC1: all three unlink the junction and leave its 73MB of contents
alone. What `git worktree remove` does *not* do is delete the junction
directory, so it reports success while the path still exists and the next
`new` on it fails as "already exists" — which is why `remove` above cleans up
after it. It also calls git *before* unlinking, so a removal git refuses (the
usual cause being uncommitted work) leaves the worktree provisioned and
working rather than stripped of its tooling.

Note the site deploys from `main`, so nothing on a worktree branch is live
until it is merged and pushed.

### The SessionStart notice

`scripts/session-start-worktree.mjs` runs when a session starts. From a linked
worktree it prints nothing — that is the state we want. From the primary tree it
names the branch, lists the registered worktrees, and says to run
`npm run worktree -- new <branch>` before doing anything substantive. If files
are already staged in the shared index it says so, loudly, because they may
belong to another session.

It exists because the gate above cannot see the case that actually costs work:
the gate only fires when more than one checkout is registered, so several
sessions all sitting in the primary tree trip nothing. This runs before any of
them has staged anything, which is the last moment switching is still free.

Its output is returned as `additionalContext`, so it reaches the model rather
than only the screen. The agent is what forgets — the day the worktree tooling
was written, the session that wrote it went on to run `npm install` in the
primary tree anyway, and a concurrent commit swallowed the resulting
`package.json` bump.

It is advisory. It cannot change the session's directory, and blocking startup
over a heuristic would be worse than the problem.

**The wiring is not in the repo.** `.claude/` is gitignored, so
`.claude/settings.json` is per-machine. The script is tracked; recreate the hook
on any other clone with:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command",
                     "command": "node scripts/session-start-worktree.mjs 2>/dev/null || true",
                     "timeout": 10 } ] }
    ]
  }
}
```

### The pre-commit gate

Once a second checkout exists, `.githooks/pre-commit` refuses a **whole-index**
commit in the primary worktree:

```
pre-commit: refusing a whole-index commit in the primary worktree.
```

The primary tree is where a second session lands by default, and its index is
the one two agents can both stage into — a bare `git commit` there records
whatever is staged, whoever staged it. Scoping the commit is the fix, because
git builds a temporary index holding only those paths and nothing else can ride
along:

```bash
git commit -- <paths>
```

`MC_PRIMARY_COMMIT=1 git commit` overrides it when the whole index really is
yours. Prefer that to `--no-verify`, which also disables the cache-buster check.

What it deliberately does **not** touch:

- **A clone with one checkout.** The gate needs `git worktree list` to show more
  than one, so ordinary solo work on `main` is unaffected. This matters — the
  site deploys from `main` and small commits straight to it are normal here.
- **Commits inside a linked worktree.** Those have their own index, are nobody
  else's shared ground, and are the thing we want people doing.
- **Merges, rebases, cherry-picks and reverts**, which do not run `pre-commit`.

`git commit --amend` *is* refused, because it rewrites from the whole index and
can sweep in exactly the same way. Scope it or use the override.

The gate runs before the cache-buster pass, not after. That pass rewrites files,
and a commit that is going to be refused should be refused without having edited
anything first — a blocked commit once left corrected `?v=` stamps behind in
another session's in-progress pages.

## magmascript

[magmascript](https://github.com/magmacrunch-media/magmascript) is the primary CLI
tool for managing this site (scores reports, archive checks, MusicBrainz backup,
Last.fm play counts, search index, Pi management). Full command reference:
`docs/ops/magmascript.md`. Set `MAGMACRUNCH_ROOT=/path/to/magmacrunch.com` for
commands that access local files.

## Project structure

```
/                      # root: index.html, style.css, nav.js
├── animations/        # extracted canvas animations (volcano, cereal, coin, server, floppy)
├── arcade/            # self-contained pixel games (each has index.html + js/css)
│   ├── arcade.css     # arcade index page styles + game card grid
│   ├── gamecard-previews.js  # tile illustrations for each collection
│   ├── shared/        # shared code: adenosine engine, score-client, chat, cards
│   │   ├── adenosine-rpg.js        # @magmacrunch/adenosine-rpg IIFE build
│   │   ├── adenosine-score-client.js # @magmacrunch/adenosine-score-client IIFE build
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
├── scripts/           # tooling: worktree.mjs, run-tests.mjs, scaffold-game.mjs, ...
├── templates/         # JS template scripts for archive pages
├── ware/              # browser utilities + dev tools (was tools/ — see below)
│   ├── shared/        # mgs-lang-bundle.js (generated) + mgs-runtime.js — the
│   │                  #   in-browser MagmaScript interpreter, shared by two pages
│   └── crunch-c/      # C-memory course; lessons.js is generated from the crunch-c repo
├── tools/             # redirect shims only — see below
└── visual/            # gallery pages (collage, photography/, music-videos, teevee/tv)
```

## Key conventions

- **Retro aesthetic required**: Keep "Press Start 2P" font, CRT scanlines, neon colors, pixel art
- **Self-contained games**: Each arcade subfolder works standalone. Shared dependencies (adenosine engine, score-client, chat-widget) live in `arcade/shared/`.
- **MusicBrainz rate limit**: API allows ~1 req/sec. `fetchWithRetry` handles backoff - don't batch-fetch
- **Canvas pixel art**: Use `image-rendering: pixelated` and draw at low resolution (64x64), scale with CSS
- **Config via `window.*_CONFIG`**: Archive pages define config objects inline, templates read them
- **Collective templates**: Multi-artist groups use `window.COLLECTIVE_CONFIG` with `ids[]` array. Templates: `collective_recordings.js`, `collective_releases.js`, `collective_works.js`
- **Generated bundles**: `arcade/shared/adenosine-*.js` and the chat widget files are synced from npm by `npm run build:adenosine` — never hand-edit them (see `docs/ops/adenosine.md`)
- **Generated ware files**: `ware/shared/mgs-lang-bundle.js` (from the installed magmascript, by `scripts/sync-playground.py`) and `ware/crunch-c/lessons.js` (from the crunch-c repo, by `scripts/sync-crunch-c.py`) are generated and committed — never hand-edit either. Edit the upstream source and re-run the script (see `docs/ops/frontend.md`)
- **`tools/` holds redirect stubs only**: the section moved to `ware/` — do not add content or links under `tools/` (see `docs/ops/frontend.md`)
- **Serve local dev over http** when testing chat/multiplayer: a `file://` page sends `Origin: null`, which the handshake gate refuses

## Testing

```bash
npm test          # lint + JS tests (fast)
npm run check     # lint + Python + JS
npm run test:py   # pytest suites under arcade/
npm run test:js   # node test-*.js under arcade/*/tests/
```
Run `npm run hooks:install` once per clone. It points `core.hooksPath` at
`.githooks/`, whose `pre-commit` repairs stale `?v=` cache-buster stamps and
stages them with the asset that moved. Without it nothing breaks — `lint` in
CI still fails on a stale stamp — you just find out later. Bypass a single
commit with `git commit --no-verify`.

Runner internals, Python interpreter selection, and what each suite covers: `docs/ops/testing.md`.

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

### Three arcade folders are generated — never edit them here

`arcade/moonlight-drift/`, `arcade/george-boole/` and `arcade/solitaire_THLD/`
are copies. Each game now lives in its own repo holding both its browser and
Wii versions, and the folder here is produced from that repo's `web/` by
`make sync-<repo>`, which **deletes the folder and recopies it**. Anything
edited here is destroyed the next time anyone syncs, with no warning and no
conflict.

| Folder here | Source repo | Target |
|---|---|---|
| `arcade/moonlight-drift/` | `moonlight-drift` | `make sync-moonlight-drift` |
| `arcade/george-boole/` | `george-boole` | `make sync-george-boole` |
| `arcade/solitaire_THLD/` | `texas-holdem-lava-dome` | `make sync-texas-holdem-lava-dome` |

To change one of those games: edit `../<repo>/web/`, run its target here, commit
the result. Each folder also carries a `GENERATED.md` saying the same thing, so
the rule is visible from inside the copy as well as from here.

Every other game under `arcade/` is authored in this repo as normal.

## Deep operational docs — read on demand:

- `docs/ops/git-identity.md` — full Mac/Windows credential-helper rules; the Mac `gh auth` check before every push
- `docs/ops/magmascript.md` — full magmascript command reference
- `docs/ops/frontend.md` — tools/→ware/ rename, the shared MagmaScript runtime and the crunch-c course, extracted animations, page-specific CSS, game card previews, nav/page theming, color palette, OG images
- `docs/ops/adenosine.md` — adenosine engine: script loading patterns, globals, IIFE build/sync pipeline, repo workflow
- `docs/ops/archive-music.md` — distributed-music releases, jukebox, MusicBrainz cache, adding archive pages
- `docs/ops/testing.md` — test runner internals, Python interpreter probing, suite coverage map
- `docs/ops/chat-system.md` — arcade chat: SharedWorker architecture, handshake gate, rate limits, rooms, services.json, deploy
- `docs/ops/chat-presence-widget-changes.md` — arcade chat presence: what the online count means, and the widget changes queued for adenosine
- `docs/ops/scores-counter.md` — high-score system and site hit counter: architecture, game IDs, deploy
- `docs/ops/mcp-server.md` — remote MCP server on MC1: setup, tools, service management, troubleshooting
- `docs/ops/pi-deployment.md` — Raspberry Pi setup, venv recovery, admin dashboard, systemd services/ports
- `docs/ops/ci-bots.md` — GitHub Actions workflows, self-hosted MC1 runner, Pi cron bots, SSH keys
- `docs/ops/opencode-mc1.md` — opencode tool-serialization bug and workarounds on MC1
- `docs/ops/monitoring.md` — websocket logging, connection tracking, fail2ban, TRAFFIC tab, nginx logs

<!-- Update this file in the same commit as any change to build, test, deploy, or layout. -->
