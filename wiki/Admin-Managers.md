Management UIs accessible from the Raspberry Pi desktop.

---

## Overview

The admin dashboard (`arcade/admin/`) includes management sections accessible via desktop shortcuts. These are sections of the main MAGMA//OPS dashboard, not separate files.

## Desktop Shortcuts

| Shortcut | URL | Description |
|----------|-----|-------------|
| MagmaCrunch Ops | `http://localhost:8780` | Main dashboard |
| Jukebox Manager | `http://localhost:8780/#jukebox` | Edit jukebox songs |
| Theme Manager | `http://localhost:8780/#themes` | Browse/edit color themes |

## Jukebox Manager

URL: `http://localhost:8780/#jukebox`

Manages the jukebox mini-player that appears on all pages.

### Features
- View all songs in the queue
- Reorder tracks
- Add/remove songs
- Edit song metadata (title, artist, file path)

### Song Storage
Songs are defined in `music/jukebox/songs.json`:

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

Audio files live in `music/jukebox/songs/`.

## Theme Manager

URL: `http://localhost:8780/#themes`

Manages color themes for visual pages.

### Features
- Browse existing themes
- Edit color variables
- Preview changes
- Save theme configurations

### Theme Storage
Themes are defined inline in page `<style>` blocks using CSS variables. See [Theming Guide](Theming-Guide) for the pattern.

## Accessing from Desktop

The shortcuts are `.desktop` files in `arcade/admin/`:

```
arcade/admin/
├── MagmaCrunch-Ops.desktop
├── Jukebox-Manager.desktop
└── Theme-Manager.desktop
```

These are installed to the Pi desktop during setup. Each opens Chromium to the specific dashboard URL.

### Manual Installation

```bash
# Copy shortcuts to Pi desktop
scp arcade/admin/*.desktop <user>@<pi-ip>:~/Desktop/

# Make executable
ssh <user>@<pi-ip> "chmod +x ~/Desktop/*.desktop"
```

## Dashboard Config

The admin dashboard uses command-line `--config config.json` for port and auth settings. Data is stored in separate JSON files:

- `arcade/admin/jukebox-songs.json` — jukebox track list
- `arcade/admin/themes.json` — color theme definitions
- `arcade/admin/tv-channels.json` — TV channel list
- `arcade/admin/scores/` — per-game score JSON files

## Server Architecture

The admin dashboard runs on two ports:

| Port | Protocol | Purpose |
|------|----------|---------|
| 8780 | HTTP | Dashboard UI |
| 8781 | WebSocket | Live logs + score management |

### Score Management

The dashboard reads/writes score files in `arcade/admin/scores/`:

```
arcade/admin/scores/
├── tetris.json
├── george-boole.json
├── solitaire.json
└── ...
```

See [High Score System](High-Score-System) for the score file format. 
