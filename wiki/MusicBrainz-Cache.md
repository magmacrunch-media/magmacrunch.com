Local JSON backups of MusicBrainz data to avoid repeated API calls and respect rate limits.

---

## How It Works

1. Archive templates check `archive/_cache/` before hitting the MusicBrainz API
2. If a cached JSON file exists, it's used directly
3. If not, the API is called and the response is cached locally
4. GitHub Actions run weekly to pre-populate and update the cache

## Cache Structure

```
archive/_cache/
├── artists/
│   └── {uuid}.json        # Artist data
├── collectives/
│   └── {uuid}.json        # Multi-artist group data
├── contributors/
│   └── {uuid}.json        # Contributor data
├── labels/
│   └── {uuid}.json        # Label data
├── places/
│   └── {uuid}.json        # Place data
├── works/
│   └── {uuid}.json        # Work/composition data
└── tmdb/
    └── {id}.json           # TMDB movie data
```

## Manual Backup

Run the backup script to snapshot all data:

```bash
node scripts/backup-musicbrainz.mjs
```

Options:
- `--skip-existing` — don't overwrite existing cache files
- Without flags — re-fetch all data

## Automated Backup

GitHub Actions run weekly:

- `.github/workflows/backup-musicbrainz.yml` — MusicBrainz data
- `.github/workflows/backup-tmdb.yml` — TMDB data

Both use `--skip-existing` to avoid unnecessary API calls.

## Rate Limiting

MusicBrainz allows ~1 request/sec. The `fetchWithRetry` function handles this:

```js
async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (res.status === 429) {
                // Rate limited — wait and retry
                await new Promise(r => setTimeout(r, 1000));
                continue;
            }
            return res;
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000));
        }
    }
}
```

## Why Cache?

- **Speed**: Local JSON loads instantly vs network fetch
- **Reliability**: Works offline or when MusicBrainz is down
- **Rate limits**: Avoids hitting API limits during development
- **Consistency**: Snapshot of data at a point in time

---

## Snapshot Backups

Before overwriting a cache file, the backup script saves a timestamped copy:

```
archive/_cache/snapshots/
├── 2026-08-04/
│   ├── artists/{uuid}.json
│   └── ...
├── 2026-07-28/
│   └── ...
```

### Retention
Last 4 snapshots (1 month of history). Older snapshots are auto-cleaned.

### Purpose
Provides resilience if MusicBrainz servers go down for an extended period. You can restore from the last snapshot.

### Manual Run
Snapshots are created automatically during `node scripts/backup-musicbrainz.mjs`.

---

## Cache Bake

`scripts/bake-cache.mjs` inlines the cache JSON directly into archive HTML pages.

### How It Works

Each archive page now has the MusicBrainz data baked in as a global variable:

```html
<script>
window.__MB_CACHE = { /* inlined JSON from _cache/artists/{uuid}.json */ };
</script>
<script src="../../../templates/artist_recordings.js"></script>
```

The templates check for `window.__MB_CACHE` first and use it if available, skipping the `fetch()` call entirely.

### Benefits
- **Zero fetch delay** — pages load instantly
- **Works offline** — no network needed
- **Resilient** — survives MusicBrainz outages

### Tradeoffs
- Pages are larger (500KB–3.5MB per page)
- Cache data is stale until next backup + bake cycle

### Automation
`.github/workflows/bake-cache.yml` triggers automatically after the MusicBrainz backup completes.

### Manual Run
```bash
node scripts/bake-cache.mjs
``` 
