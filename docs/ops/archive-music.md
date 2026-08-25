# Music and archive content — distributed-music releases, jukebox, MusicBrainz cache, adding archive pages.

## Distributed music

Release data lives in `music/distributed-music/releases.js` as a `window.RELEASES` array.
The page (`music/distributed-music/app.js`) fetches this data and renders cards dynamically.

To add a new release: add an object to the `RELEASES` array in `releases.js`.

## Jukebox

The full jukebox page (`music/jukebox/`) fetches `songs.json` at runtime for the playlist.
The mini-player widget (`assets/jukebox.js`) has its own embedded track list.
`songs.json` is the single source of truth — MAGMA//OPS reads/writes it.

## MusicBrainz cache

Templates check local JSON cache before hitting the MusicBrainz API. Use magmascript to snapshot all data:

```bash
magmascript mb backup                        # full backup
magmascript mb backup --skip-existing        # skip already-cached entities
magmascript mb backup --stale-only           # only refresh stale caches
```

A GitHub Action and Pi cron job run this weekly with `--skip-existing`.

Cache location: `archive/_cache/{artists,places,contributors,labels}/{uuid}.json`

## Adding archive pages

See `archive/ARCHIVE_THEMING.md` for detailed theming patterns. Short version:
1. Create folder under `archive/by-artist/`, `archive/by-place/`, or `archive/by-contributor/`
2. Copy stub template from existing page
3. Set `window.ARTIST_CONFIG`, `window.PLACE_CONFIG`, or `window.__CONTRIBUTOR_CONFIG` with MusicBrainz UUID
4. Choose `accent` color per page type (green/cyan/rose/yellow/blue)
5. For contributor pages, also load `entity-map.js` before `contributor.js`
6. For multi-artist collectives, use `window.COLLECTIVE_CONFIG` with `ids[]` array and load `collective_*.js` templates

