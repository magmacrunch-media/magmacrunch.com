Automated bots that keep magmacrunch.com running — backups, deployments, monitoring, and more.

---

## Bot Status

Check the latest status report in [GitHub Discussions → Bot Updates](https://github.com/magmacrunch-media/magmacrunch.com/discussions) or run the summary workflow manually.

---

## GitHub Actions Workflows

| Bot | Schedule | Trigger | Manual Run |
|---|---|---|---|
| **CI** | Push/PR to `main` | Push, PR | Automatic |
| **Deploy to Pi** | Push to `main` | Push to main | `gh workflow run "Deploy to Pi"` |
| **Check Archive Format** | Push/PR to `main` (archive changes) | Push, PR | `gh workflow run "Check Archive Format"` |
| **Theme Audit** | Push to `main` (CSS/HTML changes) | Push | `gh workflow run "Theme Audit"` |
| **Generate Archive Stubs** | Push to `main` (config change) | Push | `gh workflow run "Generate Archive Stubs"` |
| **Bake Cache into Pages** | After MusicBrainz backup | Backup completes | `gh workflow run "Bake Cache into Pages"` |
| **Backup to Private Repo** | Push to `main` (code changes) | Push | Automatic |
| **Bot Status Report** | Weekly (Mon 7 AM UTC) | Schedule | `gh workflow run "Bot Status Report"` |
| **Sync Adenosine Playground** | Push to `main` | Push | `gh workflow run "Sync Adenosine Playground"` |
| **Sync Crunch C** | Push to `main` | Push | `gh workflow run "Sync Crunch C"` |
| **Sync MAGMAScript Playground** | Push to `main` | Push | `gh workflow run "Sync MAGMAScript Playground"` |
| **Sync Texas Toast Playground** | Push to `main` | Push | `gh workflow run "Sync Texas Toast Playground"` |

---

## Pi Cron Jobs

Several bots have been migrated from GitHub Actions to Pi cron jobs for reliability (no dependency on MC1 being awake). Scripts live in `arcade/scripts/` and share helpers from `pi-bot-env.sh`.

| Bot | Schedule | Script | Purpose |
|---|---|---|---|
| **Check Links** | Mon 6 AM UTC | `bot-check-links.sh` | Lychee link checker → GitHub Issue |
| **Check Services** | Every 30 min | `bot-check-services.sh` | TCP health check → Discussion + Discord |
| **Smoke Test** | Mon 10 AM UTC | `bot-smoke-test.sh` | Playwright smoke tests → GitHub Issue |
| **MusicBrainz Backup** | Mon 6 AM UTC | `bot-backup-musicbrainz.sh` | Cache backup → git push |
| **TMDB Backup** | Mon 6:30 AM UTC | `bot-backup-tmdb.sh` | Cache backup → git push |
| **Play Counts** | Mon 6 AM UTC | `bot-play-counts.sh` | Last.fm play counts → git push |
| **Weekly Scores** | Mon 6 AM UTC | `bot-weekly-scores.sh` | Score leaderboard → Discussion + Discord |
| **Rebuild Search Index** | Daily 7 AM UTC | `bot-rebuild-search-index.sh` | Rebuild search index → git push |

All migrated workflows retain `workflow_dispatch` triggers for manual runs from the GitHub UI.

---

## Bot Details

### CI
**Workflow:** `.github/workflows/ci.yml`
**What it does:** Runs ESLint, pytest, and JS tests on every push/PR to `main`.
**When it runs:** Automatically on push or PR.
**If it fails:** The PR has linting or test errors.

### Deploy to Pi
**Workflow:** `.github/workflows/deploy-pi.yml`
**What it does:** rsync `arcade/` to Raspberry Pi, rebuilds adenosine bundles, restarts all services.
**Requirements:** Self-hosted runner running on MC1 (WSL2).
**When it runs:** On push to `main`.
**If it fails:** Check SSH key or Pi connectivity.

### Check Archive Format
**Workflow:** `.github/workflows/check-archive-format.yml`
**What it does:** Validates formatting consistency across archive HTML files.
**When it runs:** On push/PR to `main` when `archive/**` changes.
**Reporting:** Creates/updates a GitHub Issue ("Archive format warnings").

### Theme Audit
**Workflow:** `.github/workflows/theme-audit.yml`
**What it does:** Generates a visual audit of theme colors across the site.
**When it runs:** On push to `main` when CSS or HTML files change.

### Generate Archive Stubs
**Workflow:** `.github/workflows/generate-stubs.yml`
**What it does:** Auto-generates stub HTML files for new archive pages.
**When it runs:** On push to `main` when `scripts/archive-stubs.json` changes.
**Config:** `scripts/archive-stubs.json` — add entities to generate.

### Bake Cache into Pages
**Workflow:** `.github/workflows/bake-cache.yml`
**What it does:** Inlines MusicBrainz cache JSON into archive HTML pages.
**When it runs:** After MusicBrainz backup completes.
**Result:** Pages load instantly (no fetch() call at runtime).

### Backup to Private Repo
**Workflow:** `.github/workflows/backup-private.yml`
**What it does:** Syncs code (excluding media, caches, scores) to private backup repo `magma-ops-backup`.
**When it runs:** On push to `main` when code files change.

### Bot Status Report
**Workflow:** `.github/workflows/bot-status.yml`
**What it does:** Checks status of all recent workflow runs, posts summary.
**When it runs:** Weekly (Mon 7 AM UTC).
**Reporting:** Creates a Discussion in "Bot Updates" category.

### Check Links (Pi Cron)
**Script:** `arcade/scripts/bot-check-links.sh`
**What it does:** Scans all HTML/MD files for broken links using lychee.
**When it runs:** Monday 6 AM UTC.
**Reporting:** Creates/updates GitHub Issue with broken link report.

### Check Services (Pi Cron)
**Script:** `arcade/scripts/bot-check-services.sh`
**What it does:** TCP health check of all public-facing Pi game servers.
**When it runs:** Every 30 minutes.
**Reporting:** Posts to GitHub Discussion + Discord webhook on failure.

### Smoke Test (Pi Cron)
**Script:** `arcade/scripts/bot-smoke-test.sh`
**What it does:** Playwright smoke test of all arcade games.
**When it runs:** Monday 10 AM UTC.
**Requirements:** Node.js 20+, Playwright + Chromium on the Pi.

### MusicBrainz Backup (Pi Cron)
**Script:** `arcade/scripts/bot-backup-musicbrainz.sh`
**What it does:** Snapshots MusicBrainz API data to local cache.
**When it runs:** Monday 6 AM UTC.

### TMDB Backup (Pi Cron)
**Script:** `arcade/scripts/bot-backup-tmdb.sh`
**What it does:** Snapshots TMDB person data.
**When it runs:** Monday 6:30 AM UTC.

### Play Counts (Pi Cron)
**Script:** `arcade/scripts/bot-play-counts.sh`
**What it does:** Fetches play counts from Last.fm API for all artists.
**When it runs:** Monday 6 AM UTC.

### Weekly Scores (Pi Cron)
**Script:** `arcade/scripts/bot-weekly-scores.sh`
**What it does:** Posts leaderboard summary to Discussion + Discord.
**When it runs:** Monday 6 AM UTC.

### Rebuild Search Index (Pi Cron)
**Script:** `arcade/scripts/bot-rebuild-search-index.sh`
**What it does:** Rebuilds `search-index.json` for client-side search.
**When it runs:** Daily 7 AM UTC.

---

## How to Trigger a Bot

### Via GitHub UI
1. Go to [Actions tab](https://github.com/magmacrunch-media/magmacrunch.com/actions)
2. Select the workflow
3. Click "Run workflow"

### Via GitHub CLI
```bash
gh workflow run "Workflow Name" -R magmacrunch-media/magmacrunch.com
```

### Via Admin Dashboard
See the Bots tab in MAGMA//OPS.

---

## Troubleshooting

### Bot failed — what do I do?
1. Check the workflow run logs in the Actions tab
2. Look for error messages
3. Common issues:
   - **Deploy to Pi:** SSH key not configured, Pi unreachable
   - **Check Services:** Pi services down, firewall blocking
   - **Bake Cache:** MusicBrainz cache missing or stale
   - **CI:** Linting errors or test failures
   - **Pi cron bots:** Check logs at `~/arcade/logs/<name>.log` on the Pi

### How do I stop a bot from running?
Disable the workflow in the GitHub Actions tab, or remove the schedule trigger.
For Pi cron jobs: `crontab -e` on the Pi.

### How do I add a new bot?
1. For GitHub Actions: create the workflow in `.github/workflows/`
2. For Pi cron: create `arcade/scripts/bot-<name>.sh` that sources `pi-bot-env.sh`
3. Add it to this wiki page
4. For GitHub Actions, add it to bot-status.yml summary
5. Run `gh workflow list` to verify it appears
