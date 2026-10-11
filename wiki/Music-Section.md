Jukebox player, distributed music catalog, and physical media pages.

---

## Pages

| Page | Path | Description |
|------|------|-------------|
| Jukebox | `music/jukebox/` | Persistent audio player with song queue |
| Distributed Music | `music/distributed-music/` | Data-driven catalog of distributed releases |
| Physical Media | `music/physical-media/` | CD, floppy disk, tape collections |

## Jukebox

The jukebox is a mini-player that persists across SPA navigations.

### Files
- `assets/jukebox.js` — player logic
- `assets/jukebox.css` — player styles
- `music/jukebox/songs.json` — song metadata
- `music/jukebox/songs/` — audio files

### How It Works

1. `nav.js` loads `jukebox.js` on every page with a `<nav>` element
2. Player widget appears as a floating UI element
3. Audio persists across SPA navigations (same `<audio>` element)
4. Songs defined in `songs.json`

### songs.json Format

```json
[
    {
        "title": "Song Name",
        "artist": "Artist Name",
        "file": "songs/song-name.mp3",
        "duration": "3:45"
    }
]
```

### Disable on a Page

```html
<body class="no-jukebox">
```

## Distributed Music

Catalog page showing all distributed releases. Links to streaming platforms and download options.

### Data-Driven Approach

Release data lives in `music/distributed-music/releases.js` as a `window.RELEASES` array.
The page (`music/distributed-music/app.js`) fetches this data and renders cards dynamically.

To add a new release: add an object to the `RELEASES` array in `releases.js`.

### Files

| File | Purpose |
|------|---------|
| `music/distributed-music/index.html` | Page skeleton |
| `music/distributed-music/releases.js` | Release data array (31 entries) |
| `music/distributed-music/app.js` | Renders cards + search filter |
| `music/distributed-music/styles.css` | Page styles |

## Physical Media

Pages for physical formats:
- CDs
- Floppy disks
- Cassettes/tapes

Each format has its own sub-page with images and descriptions. 
