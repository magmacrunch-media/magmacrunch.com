# magmacrunch.com

Personal website for magmacrunch media — music, art, archives, and arcade games. Static HTML/CSS/JS, no build step, no dependencies.

Live site: [magmacrunch.com](https://magmacrunchmedia.github.io/magmacrunch.com/)

**Wiki**: [Full documentation](https://github.com/magmacrunchmedia/magmacrunch.com/wiki)

---

## project structure

```
/                     index.html, style.css, nav.js
├── animations/       extracted canvas animations (volcano, cereal, coin, server, floppy)
├── archive/          MusicBrainz-powered catalog (artists, places, labels, contributors)
├── arcade/           20+ pixel art games (board, card, puzzle, action)
├── assets/           shared CSS/JS (jukebox, search, counter)
├── home/             about, guestbook, links
├── music/            jukebox, distributed music, physical media
├── press/            journals (scientific, experimental, lyrics)
├── mcp-server/       MCP server — exposes project data + Pi management to AI assistants
├── scripts/          backup and build utilities
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

See the [wiki](https://github.com/magmacrunchmedia/magmacrunch.com/wiki) for full documentation on all systems.

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
