Web-based monitoring and management UI for the Raspberry Pi server.

---

## Access

- **HTTP**: port 8780 on the Pi
- **Desktop shortcut**: "MagmaCrunch Ops" — opens in Chromium

## Tabs

| Tab | Description |
|-----|-------------|
| **STATUS** | System info — uptime, memory, CPU, load |
| **ARCADE** | Service status, live logs, chat history, high scores |
| **MC1** | MC1 (Windows PC) system info and service management |
| **BOTS** | View and trigger all GitHub Actions workflows |
| **JUKEBOX** | Manage songs and playlists |
| **TV** | Manage TV channels |
| **FAVICON** | Pixel art editor for favicons |
| **THEMES** | Edit and deploy theme colors |
| **PLAYS** | Play count data and artist stats |
| **TRAFFIC** | nginx access log analysis |
| **SECURITY** | API key management, password changes |
| **GITHUB** | Deploy, sync, and backup via GitHub API |
| **ACCOUNTS** | Reference list of MagmaCrunch accounts |

## Configuration

Admin uses `--config config.json` for port/auth settings (passed via command line). Data files are stored directly:

- `jukebox-songs.json` — jukebox track list
- `themes.json` — color theme definitions
- `tv-channels.json` — TV channel list
- `scores/` — per-game score JSON files

## Score Storage

Scores are stored as JSON files in `arcade/admin/scores/`:

```
arcade/admin/scores/
├── 2n.json
├── fifteen-puzzle.json
├── george-boole.json
├── klotski.json
├── moonlight-drift.json
├── scandinavian-stud.json
├── solitaire.json
├── solitaire-thld.json
├── tetris.json
└── threes.json
```

Each file contains:
```json
{
    "game": "tetris",
    "scores": [
        { "initials": "JAM", "score": 12400, "level": 5 },
        { "initials": "CPR", "score": 8800, "level": 3 }
    ]
}
```

## Deployment

```bash
# Deploy admin dashboard
rsync -avz arcade/admin/ jake@<pi>:~/arcade/admin/

# Restart the service
ssh jake@<pi> "sudo systemctl restart arcade-admin"

# View logs
ssh jake@<pi> "journalctl -u arcade-admin -f"
```

## Desktop Shortcuts

- **MagmaCrunch-Ops.desktop** — opens admin dashboard
- **Jukebox-Manager.desktop** — opens jukebox management
- **Theme-Manager.desktop** — opens theme management

All placed on the Pi desktop during setup.
