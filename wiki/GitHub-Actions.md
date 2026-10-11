Automated workflows for CI, deployments, and monitoring.

---

## CI (Continuous Integration)

**File**: `.github/workflows/ci.yml`

Runs on every push/PR to `main`. Three parallel jobs:

1. **Lint** — ESLint with Node.js 22
2. **Python tests** — pytest across all game servers (warns on pre-existing failures)
3. **JS tests** — Node.js test files

### Notes
- Python tests warn on pre-existing failures instead of hard-failing
- Requires `pytest>=7.0` (see `requirements.txt`)
- JS tests run via `find arcade -name 'test-*.js' -path '*/tests/*'`

---

## Deploy to Pi

**File**: `.github/workflows/deploy-pi.yml`

Auto-deploys the `arcade/` directory to the Raspberry Pi on every push to `main`.

### What It Does

1. Checks out code on the self-hosted runner (MC1, inside WSL2)
2. Runs `npm ci` and `npm run build:adenosine`
3. rsync `arcade/` to the Pi via Tailscale
4. Recreates Pi venv and installs dependencies
5. Restarts all `arcade-*` systemd services

### Excludes

- `node_modules`, `.git`, `*.pyc`, `__pycache__`, `scores/*.json`, `venv/`

### Requirements

- Self-hosted runner running on MC1 (Windows PC, WSL2 Ubuntu)
- SSH key (`~/.ssh/id_ed25519` in WSL2) authorized on Pi

---

## Check Pi Services

**File**: `.github/workflows/check-services.yml`

TCP health check of all public-facing Pi game servers. Manual dispatch only — automated checking runs as a Pi cron job.

### What It Does

1. Connects to each port via `nc -z` (netcat)
2. If any service is unreachable, posts to Discussion + Discord

### Services Monitored

| Service | Port |
|---|---|
| SORRY! | 8765 |
| Cribbage | 8766 |
| Scandinavian Stud | 8767 |
| Chat | 8768 |
| Chess | 8769 |
| Checkers | 8770 |
| Backgammon | 8771 |
| Chinese Checkers | 8772 |
| Parchisi | 8773 |
| Aggravation | 8774 |
| Counter | 8783 |

### Excludes

- Admin (8780) — localhost-only
- Private (8782) — firewall-blocked

### Triggers

- Manual only (`workflow_dispatch`)
- Automated runs via Pi cron (`arcade/scripts/bot-check-services.sh`, every 30 minutes)

---

## Check Links

**File**: `.github/workflows/check-links.yml`

Scans all HTML/MD files for broken links using [lychee](https://github.com/lycheeverse/lychee-action). Manual dispatch only — automated checking runs as a Pi cron job.

### Triggers

- Manual only (`workflow_dispatch`)
- Automated runs via Pi cron (`arcade/scripts/bot-check-links.sh`, Monday 6 AM UTC)

---

## Smoke Test

**File**: `.github/workflows/smoke-test.yml`

Weekly Playwright smoke test of all arcade games. Manual dispatch only — automated runs via Pi cron.

### What It Does

1. Launches headless Chromium via Playwright
2. Loads each game page
3. Captures JavaScript console errors
4. Saves screenshots only for failures
5. Posts results to GitHub Discussions
6. Creates an issue if any games fail

### Triggers

- Manual only (`workflow_dispatch`)
- Automated runs via Pi cron (`arcade/scripts/bot-smoke-test.sh`, Monday 10 AM UTC)

---

## Check Archive Format

**File**: `.github/workflows/check-archive-format.yml`

Validates formatting consistency across archive HTML files.

### What It Does

1. Runs `magmascript archive check-format`
2. If warnings found, creates/updates a GitHub Issue
3. Auto-closes the issue when all checks pass

### Triggers

- Push/PR to `main` when `archive/**` changes
- Manual

---

## Theme Audit

**File**: `.github/workflows/theme-audit.yml`

Generates a visual audit of theme colors across the site.

### What It Does

1. Runs `node scripts/generate-theme-audit.mjs`
2. Generates `og/theme-audit.png` and `theme-audit.json`
3. Commits and pushes if changed

### Triggers

- Push to `main` when CSS or HTML files change
- Manual

---

## Rebuild Search Index

**File**: `.github/workflows/rebuild-search-index.yml`

Rebuilds `search-index.json` when content changes. Manual dispatch only — automated runs via Pi cron.

### Triggers

- Manual only (`workflow_dispatch`)
- Automated runs via Pi cron (`arcade/scripts/bot-rebuild-search-index.sh`, daily 7 AM UTC)

---

## Generate Archive Stubs

**File**: `.github/workflows/generate-stubs.yml`

Auto-generates stub HTML files for new archive pages.

### What It Does

1. Reads `scripts/archive-stubs.json` for new entities
2. Generates stub files for artists, contributors, places, and labels
3. Updates `templates/entity-map.js` with UUID → path mappings
4. Updates `scripts/backup-musicbrainz.mjs` with new entity entries
5. Commits and pushes the generated files

### Config

`scripts/archive-stubs.json` — add entities to generate.

### What Still Needs Manual Work

- Hero/index pages (require hero image, custom CSS)
- Shared CSS palette files
- MusicBrainz UUID lookup
- Accent color and abbreviation choices

### Triggers

- Push to `main` when `scripts/archive-stubs.json` changes
- Manual

---

## Weekly High Scores

**File**: `.github/workflows/weekly-scores.yml`

Posts a leaderboard summary to a GitHub Discussion. Manual dispatch only — automated runs via Pi cron.

### Triggers

- Manual only (`workflow_dispatch`)
- Automated runs via Pi cron (`arcade/scripts/bot-weekly-scores.sh`, Monday 6 AM UTC)

---

## Fetch Play Counts

**File**: `.github/workflows/play-counts.yml`

Fetches play count data from Last.fm API for all artists. Manual dispatch only — automated runs via Pi cron.

### Triggers

- Manual only (`workflow_dispatch`)
- Automated runs via Pi cron (`arcade/scripts/bot-play-counts.sh`, Monday 6 AM UTC)

---

## MusicBrainz Backup

**File**: `.github/workflows/backup-musicbrainz.yml`

Weekly snapshot of all MusicBrainz data used by archive pages. Manual dispatch only — automated runs via Pi cron.

### Triggers

- Manual only (`workflow_dispatch`)
- Automated runs via Pi cron (`arcade/scripts/bot-backup-musicbrainz.sh`, Monday 6 AM UTC)

---

## TMDB Backup

**File**: `.github/workflows/backup-tmdb.yml`

Weekly snapshot of TMDB data. Manual dispatch only — automated runs via Pi cron.

### Triggers

- Manual only (`workflow_dispatch`)
- Automated runs via Pi cron (`arcade/scripts/bot-backup-tmdb.sh`, Monday 6:30 AM UTC)

---

## Bake Cache into Pages

**File**: `.github/workflows/bake-cache.yml`

Inlines MusicBrainz cache data directly into archive HTML pages for instant loading.

### What It Does

1. Triggers after MusicBrainz backup completes
2. Runs `scripts/bake-cache.mjs`
3. Injects `window.__MB_CACHE = {...}` into all archive stub pages
4. Commits and pushes updated pages

### Benefits

- **Zero fetch delay** — pages load instantly
- **Works offline** — no network needed
- **Resilient** — survives MusicBrainz outages

### Tradeoffs

- Pages are larger (500KB–3.5MB per page)
- Cache data is stale until next backup + bake cycle

---

## Backup to Private Repo

**File**: `.github/workflows/backup-private.yml`

Syncs code to a private backup repository for disaster recovery.

### What It Does

1. Checks out code with full history
2. Uses rsync to sync files to private repo `magma-ops-backup`
3. Commits and pushes changes

### Excludes

- Images, audio, video
- `archive/_cache/`, `arcade/admin/scores/`
- `node_modules/`, `.git/`, `.github/`

---

## Bot Status Report

**File**: `.github/workflows/bot-status.yml`

Checks status of all recent workflow runs, posts summary.

### Triggers

- Weekly (Mon 7 AM UTC)
- Manual

---

## Sync Adenosine Playground

**File**: `.github/workflows/sync-adenosine-playground.yml`

Syncs the adenosine playground page with the latest engine build.

### Triggers

- Push to `main` when adenosine-related files change
- Manual

---

## Sync Crunch C

**File**: `.github/workflows/sync-crunch-c.yml`

Syncs the Crunch C project files.

### Triggers

- Push to `main` when crunch-c files change
- Manual

---

## Sync MAGMAScript Playground

**File**: `.github/workflows/sync-magmascript-playground.yml`

Syncs the MAGMAScript playground page with the latest tool build.

### Triggers

- Push to `main` when magmascript-related files change
- Manual

---

## Sync Texas Toast Playground

**File**: `.github/workflows/sync-texastoast-playground.yml`

Syncs the Texas Toast playground page.

### Triggers

- Push to `main` when texastoast files change
- Manual

---

## Pi Cron Jobs

Several workflows have been migrated from GitHub Actions to Pi cron jobs for reliability (no dependency on Mac/being awake). Scripts live in `arcade/scripts/` and share helpers from `pi-bot-env.sh`.

| Cron Job | Schedule | Script |
|---|---|---|
| Check Links | Mon 6 AM UTC | `bot-check-links.sh` |
| Check Services | Every 30 min | `bot-check-services.sh` |
| Smoke Test | Mon 10 AM UTC | `bot-smoke-test.sh` |
| MusicBrainz Backup | Mon 6 AM UTC | `bot-backup-musicbrainz.sh` |
| TMDB Backup | Mon 6:30 AM UTC | `bot-backup-tmdb.sh` |
| Play Counts | Mon 6 AM UTC | `bot-play-counts.sh` |
| Weekly Scores | Mon 6 AM UTC | `bot-weekly-scores.sh` |
| Rebuild Search Index | Daily 7 AM UTC | `bot-rebuild-search-index.sh` |

All migrated workflows retain `workflow_dispatch` triggers for manual runs from the GitHub UI.

### Requirements on the Pi

- Node.js 20+ (`sudo apt install nodejs`)
- lychee (`/usr/local/bin/lychee`)
- Playwright + Chromium (for smoke tests)
- GitHub PAT with `repo` scope (for push + API access)

### Environment

`~/arcade/.env` on the Pi:
```
GITHUB_PAT=ghp_...
TMDB_API_KEY=...
LASTFM_API_KEY=...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

---

## MC1 Runner Setup

MC1 (Windows PC) runs the self-hosted GitHub Actions runner inside WSL2 Ubuntu.

- **SSH**: `ssh magma@<mc1>` (Windows host)
- **WSL2**: `wsl -d Ubuntu`
- **Service**: `actions.runner.magmacrunchmedia-magmacrunch.com.MC1-linux`
- **Labels**: `self-hosted`, `linux`
- **SSH key**: `~/.ssh/id_ed25519` in WSL2 — must be authorized on Pi

### WSL2 Prerequisites

- Ubuntu (via `wsl --install -d Ubuntu`)
- `git`, `curl`, `build-essential`, `libssl-dev`, `libicu-dev`
- SSH key at `~/.ssh/id_ed25519` (copied from Windows: `/mnt/c/Users/magma/.ssh/`)

## Why Automated Backups?

- **Fresh data**: Keeps archive pages up-to-date with latest MusicBrainz/TMDB info
- **Rate limits**: Spreads API calls over time instead of batching
- **Offline resilience**: Local cache means pages work without network
- **Version history**: Git tracks changes to cached data over time

## Adding a New Backup Workflow

1. Create script in `scripts/`
2. Create workflow in `.github/workflows/`
3. Use `actions/checkout@v4` and `actions/setup-node@v4`
4. Run script, commit changes, push

Example:

```yaml
name: Backup My Data
on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node scripts/backup-my-data.mjs
      - run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add -A
          git diff --staged --quiet || git commit -m "Update data backup"
          git push
```
