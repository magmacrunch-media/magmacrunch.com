# CI/CD and bots — GitHub Actions workflows, self-hosted MC1 runner, Pi cron bots, SSH key management.

## CI/CD (GitHub Actions)

### Auto-deploy to Pi

`.github/workflows/deploy-pi.yml` — triggers on push to `main` or manual dispatch.

- **Runner**: Self-hosted on MC1 (`runs-on: self-hosted`)
- **Action**: rsync `arcade/` → Pi, restart all `arcade-*` services
- **Secrets**: `PI_SSH_KEY` (ed25519 private key for `jake@100.74.172.4`)
- **Excludes**: `node_modules`, `.git`, `*.pyc`, `__pycache__`, `scores/*.json`
- **Network**: Uses Tailscale IP (`100.74.172.4`) for Pi SSH — works from any network

### MC1 Runner Setup

MC1 (Windows PC) runs the self-hosted GitHub Actions runner inside WSL2 Ubuntu:

- **SSH**: `ssh magma@100.75.220.87` (Windows host)
- **Service**: `actions.runner.magmacrunch-media-magmacrunch.com.MC1-linux`
- **Config**: `~/actions-runner` (WSL2 Ubuntu: `wsl -d Ubuntu`)
- **Start type**: enabled (auto-starts on boot via systemd)
- **Labels**: `self-hosted`, `linux`
- **SSH key**: `~/.ssh/id_ed25519` (WS2) — must be authorized on Pi

**Workflows running on MC1:**
- `deploy-pi.yml` — deploy to Pi
- `check-services.yml` — TCP health check of Pi services
- `smoke-test.yml` — Playwright smoke tests

**WSL2 prerequisites:**
- Ubuntu (via `wsl --install -d Ubuntu`)
- `git`, `curl`, `build-essential`, `libssl-dev`, `libicu-dev`
- SSH key at `~/.ssh/id_ed25519` (copied from Windows: `/mnt/c/Users/magma/.ssh/`)

**Note:** The `~/.ssh/id_ed25519` key is the one authorized on the Pi. If WSL2 is reinstalled, copy the key again:
```bash
cp /mnt/c/Users/magma/.ssh/id_ed25519 ~/.ssh/id_ed25519
cp /mnt/c/Users/magma/.ssh/id_ed25519.pub ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/id_ed25519
```

### Updating the SSH key for Pi access

The deploy workflow uses the SSH key at `~/.ssh/id_ed25519` in WSL2 to connect to the Pi via Tailscale.

**If the key needs to be replaced:**
```bash
# Generate new key in WSL2
wsl -d Ubuntu -- ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519

# Copy public key to Pi
ssh-copy-id -i ~/.ssh/id_ed25519.pub jake@100.74.172.4
```

### Workflows on GitHub Actions

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push/PR to `main` | ESLint + pytest + JS tests |
| `deploy-pi.yml` | Push to `main` / manual | Deploy `arcade/` to Raspberry Pi |
| `bot-status.yml` | Weekly (Mon 7AM UTC) / manual | Check all bot statuses, post report to Discussion |
| `bake-cache.yml` | After MusicBrainz backup / manual | Inline cache data into archive HTML pages |
| `check-archive-format.yml` | Push/PR to `main` (archive changes) | Check archive HTML formatting, create/update Issue |
| `generate-stubs.yml` | Push to `main` (config change) | Auto-generate archive page stubs |

### Workflows migrated to Pi cron

These workflows now run as cron jobs on the Raspberry Pi (`arcade/scripts/bot-*.sh`):

| Workflow | Cron | Purpose |
|---|---|---|
| `check-links.yml` | Mon 6 AM UTC | Lychee link checker → GitHub Issue |
| `check-services.yml` | Every 30 min | TCP health check → Discussion + Discord |
| `smoke-test.yml` | Mon 10 AM UTC | Playwright smoke tests → GitHub Issue |
| `backup-musicbrainz.yml` | Mon 6 AM UTC | MusicBrainz cache backup → git push |
| `backup-tmdb.yml` | Mon 6:30 AM UTC | TMDB cache backup → git push |
| `play-counts.yml` | Mon 6 AM UTC | Last.fm play counts → git push |
| `weekly-scores.yml` | Mon 6 AM UTC | Score leaderboard → Discussion + Discord |
| `rebuild-search-index.yml` | Daily 7 AM UTC | Rebuild search index → git push |

All migrated workflows retain `workflow_dispatch` triggers for manual runs from the GitHub UI.

### Pi cron bot setup

Scripts live in `arcade/scripts/` and are deployed to the Pi via rsync. Shared helpers are in `pi-bot-env.sh`.

**Requirements on the Pi:**
- Node.js 20+ (`sudo apt install nodejs`)
- lychee (`/usr/local/bin/lychee`)
- Playwright + Chromium (for smoke tests)
- GitHub PAT with `repo` scope (for push + API access)

**Environment file**: `~/arcade/.env` on the Pi:
```
GITHUB_PAT=ghp_...
TMDB_API_KEY=...
LASTFM_API_KEY=...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

**Adding a new Pi bot:**
1. Create `arcade/scripts/bot-<name>.sh` that sources `pi-bot-env.sh`
2. Use `gh_api` helper for GitHub API calls
3. Use `discord_post` helper for Discord notifications
4. Add cron entry: `crontab -e` on the Pi
5. Logs go to `~/arcade/logs/<name>.log`

**Cron jobs on the Pi:**
```bash
crontab -l    # View all cron jobs
```

**Viewing bot logs:**
```bash
ssh jake@100.74.172.4 "tail -50 ~/arcade/logs/check-links.log"
ssh jake@100.74.172.4 "tail -50 ~/arcade/logs/check-services.log"
```

### Broken link checker (Pi)

`arcade/scripts/bot-check-links.sh` uses lychee to scan all HTML/MD files for broken links.

- **Cron**: Monday 6 AM UTC
- **Excludes**: Private IPs (`192.168.*`, `localhost`), `mailto:` links
- **Rate limits**: Accepts 403/429 (MusicBrainz bot protection)
- **Reporting**: Creates/updates GitHub Issue with broken link report
- **Config**: `.lycheeignore` at repo root for exclude patterns

### Pi service health check (Pi)

`arcade/scripts/bot-check-services.sh` — TCP port check of all public-facing Pi services.

- **Cron**: Every 30 minutes
- **Checks**: Ports 8765–8774 (games), 8783 (counter) via `nc -z`
- **Excludes**: Admin (8780, localhost-only), Private (8782, firewall-blocked)
- **Reporting**: Posts to GitHub Discussion + Discord webhook on failure

### Generate archive stubs

- **Triggers**: Push to `main` when `scripts/archive-stubs.json` changes, manual
- **Config**: `scripts/archive-stubs.json` — add entities to generate
- **Generates**: Artist subpages, contributor/label index pages, place subpages
- **Also updates**: `templates/entity-map.js`, `scripts/backup-musicbrainz.mjs`
- **Note**: Hero/index pages and shared CSS still need manual creation

### MusicBrainz cache bake

`.github/workflows/bake-cache.yml` — inlines cache data into archive HTML pages.

- **Triggers**: After MusicBrainz backup completes, manual
- **Action**: Runs `scripts/bake-cache.mjs` — injects `window.__MB_CACHE` into all archive stubs
- **Result**: Pages load instantly (no fetch() call at runtime)
- **Note**: Pages are larger (500KB–3.5MB) but work offline

### MusicBrainz cache snapshots

`scripts/backup-musicbrainz.mjs` saves timestamped snapshots before overwriting cache files.

- **Location**: `archive/_cache/snapshots/{date}/{type}/{uuid}.json`
- **Retention**: Last 4 snapshots (1 month of history)
- **Use case**: Restore old data if MusicBrainz servers go down

### Archive stub generator

`.github/workflows/check-archive-format.yml` — validates formatting consistency across archive HTML files.

- **Triggers**: Push/PR to `main` when `archive/**` changes, manual
- **Script**: `scripts/check-archive-format.js` — no dependencies, exits non-zero on warnings
- **Checks**:
  - Sub-nav CSS class matches link text (e.g. "music videos" → `c-music-videos`)
  - No orphan `</div>` tags
- **Output**: Console warnings + GitHub Issue ("Archive format warnings"). Issue auto-closes when clean.

### Running the self-hosted runner

The runner runs as a systemd service inside WSL2 on MC1 — no manual intervention needed.

**Status check (from MC1):**
```bash
ssh magma@100.75.220.87
wsl -d Ubuntu -- sudo systemctl status actions.runner.magmacrunch-media-magmacrunch.com.MC1-linux.service
```

**Restart (from MC1):**
```bash
ssh magma@100.75.220.87
wsl -d Ubuntu -- sudo systemctl restart actions.runner.magmacrunch-media-magmacrunch.com.MC1-linux.service
```

**If MC1 is off:** pushes to `main` skip deployment (no error).

