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

See the [wiki](https://github.com/magmacrunchmedia/magmacrunch.com/wiki) for full documentation on all systems.

---

## bots & automation

16 automated bots keep the site running:

| Bot | What it does | Schedule |
|---|---|---|
| **CI** | ESLint + pytest + JS tests | Push/PR |
| **Deploy to Pi** | rsync arcade/ → Raspberry Pi | Push to main |
| **Check Links** | Scan for broken links | Weekly + push |
| **Check Pi Services** | TCP health check of game servers | Every 30 min |
| **Rebuild Search Index** | Rebuild search-index.json | On content change |
| **Generate Archive Stubs** | Auto-generate archive page stubs | On config change |
| **Bake Cache** | Inline MusicBrainz data into pages | After backup |
| **Weekly High Scores** | Post leaderboard to Discussion + Discord | Weekly |
| **Fetch Play Counts** | Fetch Last.fm play counts | Weekly |
| **MusicBrainz Backup** | Snapshot MusicBrainz API data | Weekly |
| **TMDB Backup** | Snapshot TMDB person data | Weekly |
| **Backup to Private Repo** | Sync code to private backup repo | On code changes |
| **Bot Status Report** | Check all bot statuses | Weekly |
| **Theme Color Audit** | Scan CSS files, generate color preview | On CSS change |

See [Bots wiki page](https://github.com/magmacrunchmedia/magmacrunch.com/wiki/Bots) for details.

---

## scripts

| Script | Purpose | Usage |
|---|---|---|
| `backup-musicbrainz.mjs` | Snapshot MusicBrainz data | `node scripts/backup-musicbrainz.mjs` |
| `backup-tmdb.mjs` | Snapshot TMDB data | `node scripts/backup-tmdb.mjs` |
| `bake-cache.mjs` | Inline cache into HTML pages | `node scripts/bake-cache.mjs` |
| `build-search-index.js` | Build search index | `node scripts/build-search-index.js` |
| `generate-og.mjs` | Generate OG preview images | `node scripts/generate-og.mjs` |
| `generate-theme-audit.mjs` | Scan CSS, generate color preview | `node scripts/generate-theme-audit.mjs` |
| `generate-archive-stubs.mjs` | Generate archive page stubs | `node scripts/generate-archive-stubs.mjs` |
| `scaffold-game.mjs` | Generate new game boilerplate | `node scripts/scaffold-game.mjs` |
| `weekly-scores.mjs` | Generate high score summary | `node scripts/weekly-scores.mjs` |

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

## dev notes

- Open `index.html` directly in browser — no build server needed
- `npm run lint` — lint JavaScript (ESLint)
- `npm test` — lint + JS tests
- `npm run test:py` — Python tests for multiplayer game servers
- `node scripts/backup-musicbrainz.mjs` — snapshot MusicBrainz data to local cache
- `npm run og` — regenerate OG preview images for social media
- `./arcade/start-all.sh` — launch all game servers locally
- Arcade games are self-contained — own CSS/JS, no shared state
- `node scripts/scaffold-game.mjs` — generate new game boilerplate
- `node scripts/generate-theme-audit.mjs` — scan CSS files for color definitions
