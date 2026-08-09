# magmacrunch.com

Personal website for magmacrunch media — music, art, archives, and arcade games. Static HTML/CSS/JS, no build step, no dependencies.

Live site: [magmacrunch.com](https://magmacrunch.com)

**Wiki**: [Full documentation](https://github.com/magmacrunchmedia/magmacrunch.com/wiki)

---

## project structure

```
/                     index.html, style.css, nav.js
├── animations/       extracted canvas animations (volcano, cereal, coin, server, floppy)
├── archive/          MusicBrainz-powered catalog (artists, places, labels, contributors)
│   └── _cache/       MusicBrainz + TMDB JSON cache (auto-updated weekly)
├── arcade/           20+ pixel art games (board, card, puzzle, action)
├── assets/           shared CSS/JS (jukebox, search, counter, album art)
├── fonts/            Press Start 2P pixel font
├── home/             about, guestbook, links
├── music/            jukebox, distributed music, physical media
├── press/            journals (scientific, experimental, lyrics)
├── mcp-server/       MCP server — exposes project data + Pi management to AI assistants
├── scripts/          backup, build, and automation utilities
├── templates/        JS templates for archive pages
├── tools/            browser utilities (album art, media search, pixel process)
├── og/               generated OG preview images (1200x630 PNGs)
└── visual/           gallery pages (collage, photography, music videos, TV)
```

---

## key features

- **auto-nav** — single `NAV_CONFIG` in `nav.js` generates nav for all 200+ pages
- **SPA navigation** — instant page transitions, `<nav>` persists across navigations
- **archive templates** — thin HTML stubs + MusicBrainz UUID → full catalog pages
- **arcade chat** — SharedWorker holds one WebSocket across page navigations
- **persistent jukebox** — mini audio player on every page, state saved to localStorage
- **high scores** — ScoreClient with Raspberry Pi backend, localStorage fallback
- **theme color audit** — scans all CSS files, generates visual color preview
- **cache bake** — MusicBrainz data inlined into pages for instant loading
- **monitoring** — fail2ban auto-bans scanners, TRAFFIC tab shows nginx analytics, app-level connection logging

See the [wiki](https://github.com/magmacrunchmedia/magmacrunch.com/wiki) for full documentation on all systems.

---

## magmascript

[magmascript](https://github.com/magmacrunchmedia/magmascript) is the primary CLI tool for managing this site. Install it with:

```bash
pip install magmascript
```

### Quick reference

```bash
# Scores
magmascript scores report                    # markdown report
magmascript scores report --discord          # Discord JSON payload
magmascript scores report --post-discussion  # post to GitHub Discussion
magmascript scores report --post-discord     # post to Discord

# Archive
magmascript archive check-format             # validate HTML formatting
magmascript archive bake-cache               # inline cache into pages

# MusicBrainz
magmascript mb backup                        # full MusicBrainz backup
magmascript mb backup --skip-existing        # skip cached entities

# Last.fm
magmascript lastfm fetch                     # fetch play counts

# Search
magmascript search build-index               # build search-index.json

# Pi management
magmascript pi status                        # service statuses
magmascript pi logs arcade-chat              # service logs

# GitHub
magmascript gh workflows                     # workflow statuses
magmascript gh sync                          # diff + commit data files
```

See [magmascript README](https://github.com/magmacrunchmedia/magmascript#readme) for full documentation.

---

## bots & automation

16 automated bots keep the site running:

| Bot | What it does | Schedule | Tool |
|---|---|---|---|
| **CI** | ESLint + pytest + JS tests | Push/PR | GitHub Actions |
| **Deploy to Pi** | rsync arcade/ → Raspberry Pi | Push to main | GitHub Actions |
| **Check Links** | Scan for broken links | Weekly + push | Pi cron (lychee) |
| **Check Pi Services** | TCP health check of game servers | Every 30 min | Pi cron |
| **Rebuild Search Index** | Rebuild search-index.json | On content change | Pi cron |
| **Generate Archive Stubs** | Auto-generate archive page stubs | On config change | GitHub Actions |
| **Bake Cache** | Inline MusicBrainz data into pages | After backup | GitHub Actions |
| **Weekly High Scores** | Post leaderboard to Discussion + Discord | Weekly | Pi cron + magmascript |
| **Fetch Play Counts** | Fetch Last.fm play counts | Weekly | Pi cron + magmascript |
| **MusicBrainz Backup** | Snapshot MusicBrainz API data | Weekly | Pi cron + magmascript |
| **TMDB Backup** | Snapshot TMDB person data | Weekly | Pi cron |
| **Backup to Private Repo** | Sync code to private backup repo | On code changes | Manual |
| **Bot Status Report** | Check all bot statuses | Weekly | GitHub Actions |
| **Theme Color Audit** | Scan CSS files, generate color preview | On CSS change | GitHub Actions |

See [Bots wiki page](https://github.com/magmacrunchmedia/magmacrunch.com/wiki/Bots) for details.

---

## scripts

| Script | Purpose | Usage |
|---|---|---|
| `backup-musicbrainz.mjs` | Snapshot MusicBrainz data | `magmascript mb backup` |
| `backup-tmdb.mjs` | Snapshot TMDB data | `node scripts/backup-tmdb.mjs` |
| `bake-cache.mjs` | Inline cache into HTML pages | `magmascript archive bake-cache` |
| `build-search-index.js` | Build search index | `magmascript search build-index` |
| `generate-og.mjs` | Generate OG preview images | `npm run og` |
| `generate-theme-audit.mjs` | Scan CSS, generate color preview | `node scripts/generate-theme-audit.mjs` |
| `generate-archive-stubs.mjs` | Generate archive page stubs | `node scripts/generate-archive-stubs.mjs` |
| `scaffold-game.mjs` | Generate new game boilerplate | `node scripts/scaffold-game.mjs` |
| `weekly-scores.mjs` | Generate high score summary | `magmascript scores report` |

**Note**: Most scripts now have magmascript equivalents. Use `magmascript <domain> --help` to see available commands.

---

## mcp server

The MCP server (`mcp-server/magma-mcp.py`) exposes project data to AI assistants:

**Data access:**
- `list_cached_entities`, `get_entity`, `search_cache` — MusicBrainz cache
- `list_scoreboards`, `get_scores` — high scores
- `list_archive_pages`, `list_arcade_games` — project structure
- `search_discogs`, `get_discogs_release`, `get_discogs_artist` — Discogs API

**Pi management:**
- `check_pi_services`, `get_service_logs`, `restart_pi_service` — service management
- `deploy_to_pi` — rsync files to Pi

**Bot management:**
- `list_bots`, `get_bot_status`, `trigger_bot`, `get_bot_runs` — workflow management

See [MCP Server wiki page](https://github.com/magmacrunchmedia/magmacrunch.com/wiki/MCP-Server) for details.

---

## OG images

Retro-styled preview images (1200x630 PNGs) in `og/` for social media cards.
Generated by `scripts/generate-og.mjs` using `@napi-rs/canvas`.

### Editing

- **Logo**: Edit the `pattern` array in `drawPixelM()` — `1` = filled pixel, `0` = empty
- **Page configs**: Edit the `PAGES` array at the top — title, subtitle, accent color
- **Accent colors**: Use site palette (`#FF3D6E` rose, `#00F5FF` cyan, `#C45FFF` purple, `#39FF6E` green, `#FFE03A` yellow, `#FF7C1F` orange)

### Regenerate

```bash
npm run og
```

### Cache busting

After pushing new images, bump `?v=N` in the `og:image` meta tags to force
Discord/social media to re-fetch. Each page's `og:image` URL is in its `<head>`.

---

## dev notes

- Open `index.html` directly in browser — no build server needed
- `npm run lint` — lint JavaScript (ESLint)
- `npm test` — lint + JS tests
- `npm run test:py` — Python tests for multiplayer game servers
- `npm run og` — regenerate OG preview images for social media
- `./arcade/start-all.sh` — launch all game servers locally
- Arcade games are self-contained — own CSS/JS, no shared state
- See [magmascript](https://github.com/magmacrunchmedia/magmascript#readme) for site management commands
