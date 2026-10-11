Services that run across the site, not tied to specific games. Each has a dedicated wiki page with full details.

---

## Chat System

**Server**: `arcade/chat-server.py` (port 8768)

Real-time chat widget on all arcade pages. Uses SharedWorker to maintain one WebSocket connection across page navigations.

See [Multiplayer Architecture](Multiplayer-Architecture) for full details.

### Quick Deploy

```bash
rsync -avz arcade/chat-server.py jake@<pi>:~/arcade/chat-server.py
ssh jake@<pi> "sudo systemctl restart arcade-chat"
```

---

## Hit Counter

**Server**: `arcade/counter/counter-server.py` (port 8783)

Retro LED-style hit counter. Incremented once per session, displayed on guestbook page.

See [Home Section](Home-Section#guestbook-homeguestbookhtml) for display details.

### Quick Deploy

```bash
rsync -avz arcade/counter/ jake@<pi>:~/arcade/counter/
ssh jake@<pi> "sudo systemctl restart arcade-counter"
```

---

## Jukebox Mini-Player

**Files**: `assets/jukebox.js`, `assets/jukebox.css`

Persistent audio player across SPA navigations. Vinyl-themed, bottom-left corner.

See [Jukebox System](Jukebox-System) for full details — keyboard shortcuts, songs.json schema, SPA integration.

---

## Search

**Files**: `assets/search.js`, `assets/search.css`, `search-index.json`

Client-side full-text search with CRT green terminal aesthetic.

See [Search System](Search-System) for full details — index format, scoring algorithm, category colors.

### Rebuild Index

```bash
make search-index
```

---

## SPA Router

Built into `nav.js`. Intercepts same-site link clicks, fetches target page, swaps `<main>` content.

See [SPA Router](SPA-Router) for full details — CSS/script lifecycle, excluded paths, MathJax handling.

### Excluded Paths (trigger full page loads)

- `/arcade/`
- `/by-contributor/`
- `/by-label/`
- `/tools/`
