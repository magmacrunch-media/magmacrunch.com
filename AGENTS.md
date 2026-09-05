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
suite, `npm run check` adds the Python tests, the ware shell token contract and
the game repos' cache-busters, and `ci.yml` runs five jobs including a Playwright
arcade smoke test.
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
npm test               # lint + JS tests (fast)
npm run check          # lint + Python + JS + both cache-buster checks
npm run test:py        # pytest suites under arcade/
npm run test:js        # node test-*.js under arcade/*/tests/
npm run check:cachebust    # every ?v= on every page here
npm run check:gamestamps   # every ?v= in the four game repos (see below)
```

`check:gamestamps` needs those repos checked out; with none of them beside this
one it says so and passes, rather than failing a clone that was never given
them. CI sets `GAME_REPOS`, and with that set a missing repo is fatal instead —
a check that quietly drops one is the failure it exists to catch.
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

### Audio needs two formats, or the game is silent on iOS

Ship every clip as **both `.ogg` and `.mp3`**, and pick at load time:

```js
const AUDIO_EXT = document.createElement('audio')
    .canPlayType('audio/ogg; codecs="vorbis"') ? '.ogg' : '.mp3';
const audioSrc = (path) => path.replace(/\.ogg$/, AUDIO_EXT);
```

iOS has no Ogg Vorbis decoder, and every browser on iOS is WebKit, so Chrome
and Firefox there fail exactly as Safari does. An ogg-only game is not quieter
on an iPhone, it is **silent** — and silent without an error, because a failed
decode lands in the same do-nothing path that most loaders already swallow on
purpose. `makemecookies`, `SORRY`, `george-boole` and `moonlight-drift` all
shipped that way and it went unreported for as long as they existed.

Transcode with `ffmpeg -i in.ogg -c:a libmp3lame -q:a 2 out.mp3`, and check the
result against the source size rather than reaching for `-q:a 0`. george-boole's
3:50 loop came from a ~93kbps Vorbis original: V0 inflated it from 2.7MB to
4MB, which is the wrong trade for background music over mobile data, and V2
brought it back to 2.86MB. Keep the `.ogg` — it stays the file almost everyone
receives, and the mp3 is a second-generation transcode of it.

Two things worth knowing before this looks broken:

- `adenosine-audio` loops music through a decoded Web Audio buffer, and mp3
  carries encoder delay and padding **inside** that buffer, so a looping track
  seams slightly on iOS where the ogg does not. A faint seam beats silence, and
  the alternative is a gapless format far too large to serve.
- Whatever loads the audio should say so when it fails. Three separate
  `.catch(() => {})` calls are why this survived: a blocked or undecodable track
  reported nothing at all, to the player or to anyone testing.

### Four arcade folders are generated — never edit them here

`arcade/moonlight-drift/`, `arcade/george-boole/`, `arcade/solitaire_THLD/` and
`arcade/very-long-boards/` are copies. Each game lives in its own repo holding
more than one version of itself, and the folder here is produced from that
repo's `web/` by `make sync-<repo>`, which **deletes the folder and recopies
it**. Anything edited here is destroyed the next time anyone syncs, with no
warning and no conflict.

| Folder here | Source repo | Target | Other version there |
|---|---|---|---|
| `arcade/moonlight-drift/` | `moonlight-drift` | `make sync-moonlight-drift` | Wii, terminal |
| `arcade/george-boole/` | `george-boole` | `make sync-george-boole` | Wii, terminal |
| `arcade/solitaire_THLD/` | `texas-holdem-lava-dome` | `make sync-texas-holdem-lava-dome` | Wii, terminal |
| `arcade/very-long-boards/` | `very-long-boards` | `make sync-very-long-boards` | Godot desktop |

To change one of those games: edit `../<repo>/web/`, run its target here, commit
the result. Each folder also carries a `GENERATED.md` saying the same thing, so
the rule is visible from inside the copy as well as from here.

**`very-long-boards` is the odd one out and its commits should say so.** The
other three carry ports of one game, so a rules change is expected in every
version. Its Godot version is a *different game* — a timed course rather than an
endless run for score — and that repo's `AGENTS.md` says plainly that a change to
one is not owed to the other.

#### Syncing reintroduces stale `?v=` stamps

A sync copies the source repo's `index.html` verbatim, cache-buster stamps and
all, and those stamps were computed against whatever that repo last saw. So
`make sync-<game>` can leave `check:cachebust` failing on a game nobody touched:
re-syncing `moonlight-drift` on 2026-09-05 reverted `adenosine-audio.js?v` from
the stamp the hook had corrected here back to the game repo's older one.

The fix belongs in the **source** repo's `web/index.html`, not in the copy —
correcting it here only survives until the next sync. Run `check:cachebust`
after any sync, and carry the digests it reports back upstream.

`npm run check:gamestamps` checks those repos directly, and the `game-stamps` CI
job runs it against fresh checkouts of all four. It resolves a reference in the
game repo first and here only if it is not there, which splits the two ways a
stamp rots: a game's own `css/` and `js/` go stale the ordinary way, when an edit
forgets the bump, while `../shared/*` goes stale **with nothing in that repo
touched at all**, because those files live here and are versioned here.

That second kind is why the check runs in this repo rather than in the four. It
is a commit *here* — taking a new adenosine bundle — that breaks them, and a
check in a game repo would not run then, since nothing was pushed to it. It
would fire whenever somebody next touched that game, and "nobody noticed" is the
whole failure. Both kinds were real on 2026-09-05: seven stamps stale across the
four repos, and then `adenosine-chat` 0.6.0 that same afternoon staled two more
in three of them, between one commit and the next.

When it fails, nothing here can fix it — the named repo needs its own commit.

**CI covers three of the four.** `very-long-boards` is a private repo and a
workflow's `GITHUB_TOKEN` reaches only the repo it runs in, so the job cannot
check it out. That gap is declared in `ci.yml` as `GAME_REPOS_OPTIONAL` rather
than tolerated: the check names the repo in its output on every run and says it
is not covered, and an undeclared missing repo is still fatal. On the dev box,
where all four are on disk, `npm run check` covers it like any other — so run
that after syncing it. Restore the checkout step and drop the line once the repo
is public or a token that can read it is available.

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
