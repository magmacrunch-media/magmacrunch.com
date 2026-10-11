No build server, no package manager, no dependencies.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/magmacrunch-media/magmacrunch.com.git
cd magmacrunch.com

# Start local server
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

> **Note:** You can also open `index.html` directly in the browser — most features work fine. But a local server is recommended for full functionality (see [Local Server](#local-server) below).

## Makefile

The `Makefile` provides shortcuts for common operations:

```bash
make help          # Show all available commands
make lint          # Lint shared JavaScript
make lint-all      # Lint ALL JavaScript (including games)
make test          # Run lint + JS tests
make check         # Run ALL checks (lint + Python + JS)
make deploy-pi     # Deploy arcade/ to Raspberry Pi
make pi-status     # Check Pi service status
make logs          # Tail Pi service logs
make backup        # Sync to private backup repo
make backup-mb     # Run MusicBrainz cache backup
make search-index  # Rebuild search-index.json
```

## Development Workflow

1. Start local server: `python3 -m http.server 8000`
2. Edit files with any text editor
3. Refresh the browser to see changes

## Local Server

A local server is recommended for full functionality:

```bash
# Python (recommended)
python3 -m http.server 8000

# Node.js
npx serve .

# Then open
open http://localhost:8000
```

### Why use a local server?

- **MIME types** — Python serves `.js` files with correct `Content-Type: application/javascript` (browsers may block inline scripts from `file://` URLs)
- **CORS** — API fetches (MusicBrainz, chat server) need proper origins; `file://` has no origin
- **SPA routing** — `fetch()` calls in `nav.js` work correctly with a server
- **WebSocket connections** — chat and score clients connect properly from `localhost` origins

### When you can skip it

Opening `index.html` directly works for:
- Viewing individual pages
- Editing CSS/HTML
- Single-player arcade games (no multiplayer)

## Testing Arcade Games

Arcade games with multiplayer features connect to the Raspberry Pi. For local testing:

- Chat system: falls back to `<pi-ip>:8768` when on localhost
- Score system: uses `ScoreClient.auto()` which connects to port 8781
- Single-player games work fine without a server

## Testing Archive Pages

Archive pages fetch from MusicBrainz API. They work locally but:
- Rate limited to ~1 request/sec
- Data is cached in `archive/_cache/` after first load
- Run `node scripts/backup-musicbrainz.mjs` to pre-populate cache

## File Editing Tips

- `nav.js` controls navigation across all pages — edit `NAV_CONFIG` to change nav
- `style.css` has all CSS variables — use these for consistent theming
- Each arcade game is self-contained — no shared state between games
- Archive templates in `/templates/` are shared across all archive pages 
