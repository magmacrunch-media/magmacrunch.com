#!/usr/bin/env node
/* fetch-play-counts.mjs
 *
 * Fetches global play counts and top tracks from Last.fm for a curated list
 * of artists. Auto-resolves MusicBrainz IDs on first run.
 *
 * Usage:  node scripts/fetch-play-counts.mjs [--dry-run] [--skip-existing]
 *
 * Requires LASTFM_API_KEY environment variable.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = resolve(ROOT, 'arcade/admin/stats/lastfm');
const HISTORY_DIR = resolve(CACHE_DIR, 'history');
const ARTISTS_FILE = resolve(__dirname, 'play-counts.json');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EXISTING = process.argv.includes('--skip-existing');

const LASTFM_API = 'https://ws.audioscrobbler.com/2.0/';
const DELAY_MS = 250;
const TOP_TRACKS_LIMIT = 50;

const API_KEY = process.env.LASTFM_API_KEY;
if (!API_KEY) {
    console.error('Error: LASTFM_API_KEY environment variable is required');
    process.exit(1);
}

// ─── helpers ────────────────────────────────────────────────────────

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

let lastFetch = 0;
async function lastfmFetch(method, params = {}) {
    const elapsed = Date.now() - lastFetch;
    if (elapsed < DELAY_MS) await delay(DELAY_MS - elapsed);
    lastFetch = Date.now();

    const url = new URL(LASTFM_API);
    url.searchParams.set('api_key', API_KEY);
    url.searchParams.set('method', method);
    url.searchParams.set('format', 'json');
    for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
    }

    for (let i = 0; i < 4; i++) {
        try {
            const res = await fetch(url);
            if (res.status === 429) {
                const wait = 2000 * (i + 1);
                log(`  rate-limited, waiting ${wait}ms…`);
                await delay(wait);
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (data.error) throw new Error(`Last.fm error ${data.message}`);
            return data;
        } catch (err) {
            if (i === 3) throw err;
            await delay(1500 * (i + 1));
        }
    }
}

let indent = 0;
function log(msg) { console.log('  '.repeat(indent) + msg); }

// ─── MBID resolution ───────────────────────────────────────────────

async function resolveMBID(artistName) {
    log(`  searching Last.fm for "${artistName}"…`);
    const data = await lastfmFetch('artist.search', { artist: artistName });
    const results = data?.results?.artistmatches?.artist;
    if (!results || results.length === 0) {
        log(`  no results found`);
        return null;
    }

    // pick the best match: prefer exact name, then highest listeners
    const exact = results.find(a => a.name.toLowerCase() === artistName.toLowerCase());
    const match = exact || results[0];
    log(`  matched: "${match.name}" (${match.listeners} listeners, mbid=${match.mbid || 'none'})`);
    return { mbid: match.mbid || null, resolvedName: match.name };
}

// ─── main fetch logic ───────────────────────────────────────────────

async function fetchArtist(artist) {
    log(`[${artist.name}]`);

    // step 1: resolve name/MBID if needed
    let mbid = null;
    let resolvedName = artist.name;

    if (artist.mbid) {
        mbid = artist.mbid;
        resolvedName = artist.resolvedName || artist.name;
        log(`  using cached mbid: ${mbid}`);
    } else {
        indent++;
        const result = await resolveMBID(artist.name);
        indent--;
        if (!result) {
            log(`  ⚠ no match found, skipping`);
            return null;
        }
        mbid = result.mbid; // may be null — that's fine, we'll use name
        resolvedName = result.resolvedName;
    }

    // step 2: fetch artist info (listeners + playcount)
    // artist.getInfo accepts either mbid or artist name
    log(`  fetching artist info…`);
    const infoParams = mbid ? { mbid } : { artist: resolvedName };
    const info = await lastfmFetch('artist.getInfo', infoParams);
    const stats = info?.artist?.stats || {};
    const listeners = parseInt(stats.listeners) || 0;
    const playcount = parseInt(stats.playcount) || 0;
    log(`  ${listeners.toLocaleString()} listeners, ${playcount.toLocaleString()} plays`);

    // step 3: fetch top tracks
    log(`  fetching top tracks…`);
    const tracksParams = mbid ? { mbid, limit: TOP_TRACKS_LIMIT } : { artist: resolvedName, limit: TOP_TRACKS_LIMIT };
    const tracksData = await lastfmFetch('artist.getTopTracks', tracksParams);
    const tracks = (tracksData?.toptracks?.track || []).map(t => ({
        name: t.name,
        playcount: parseInt(t.playcount) || 0,
        listeners: parseInt(t.listeners) || 0
    }));
    log(`  ${tracks.length} top tracks fetched`);

    return {
        name: resolvedName,
        mbid,
        fetchedAt: new Date().toISOString(),
        stats: { listeners, playcount },
        topTracks: tracks
    };
}

// ─── file I/O ───────────────────────────────────────────────────────

async function saveCache(artistName, data) {
    const slug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const dir = resolve(CACHE_DIR);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, `${slug}.json`), JSON.stringify(data, null, 2));
}

async function saveHistory(artistName, data) {
    const today = new Date().toISOString().slice(0, 10);
    const slug = artistName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const dir = resolve(HISTORY_DIR, today);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, `${slug}.json`), JSON.stringify(data, null, 2));
}

async function pruneHistory(keep = 12) {
    if (!existsSync(HISTORY_DIR)) return;
    const { readdirSync } = await import('node:fs');
    const dirs = readdirSync(HISTORY_DIR)
        .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort();
    while (dirs.length > keep) {
        const old = dirs.shift();
        const { rmSync } = await import('node:fs');
        rmSync(resolve(HISTORY_DIR, old), { recursive: true });
        log(`pruned old snapshot: ${old}`);
    }
}

// ─── run ────────────────────────────────────────────────────────────

async function main() {
    log('Fetching Last.fm play counts…');
    log('');

    // read artist list
    const config = JSON.parse(readFileSync(ARTISTS_FILE, 'utf8'));
    let artists = config.artists;
    let changed = false;

    for (const artist of artists) {
        indent = 0;

        // check for existing cache
        const slug = artist.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const cachePath = resolve(CACHE_DIR, `${slug}.json`);
        if (SKIP_EXISTING && existsSync(cachePath)) {
            log(`[${artist.name}] cached, skipping`);
            continue;
        }

        indent++;
        const data = await fetchArtist(artist);
        indent--;

        if (!data) continue;

        if (!DRY_RUN) {
            await saveCache(artist.name, data);
            await saveHistory(artist.name, data);
        }

            // update MBID in config if newly resolved
            if (!artist.mbid && data.mbid) {
                artist.mbid = data.mbid;
                artist.resolvedName = data.name;
                changed = true;
                log(`  resolved MBID: ${data.mbid}`);
            }

        log('');
    }

    // save updated config with resolved MBIDs
    if (changed && !DRY_RUN) {
        config.artists = artists;
        await writeFile(ARTISTS_FILE, JSON.stringify(config, null, 2) + '\n');
        log('Updated play-counts.json with resolved MBIDs');
    }

    if (!DRY_RUN) {
        await pruneHistory();
    }

    log('Done.');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
