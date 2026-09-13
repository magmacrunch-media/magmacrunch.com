#!/usr/bin/env node
/* backup-tmdb.mjs
 *
 * Snapshots TMDB person data for contributors with film credits
 * into local JSON files. Run manually or via GitHub Action.
 *
 * Existing cache files are archived (renamed with timestamp) before
 * overwriting, so previous versions are never lost.
 *
 * Usage:  node scripts/backup-tmdb.mjs [--dry-run] [--skip-existing]
 *
 * Requires TMDB_API_KEY env var (get one at https://www.themoviedb.org/settings/api)
 */

import { writeFile, mkdir, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = resolve(ROOT, 'archive/_cache');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EXISTING = process.argv.includes('--skip-existing');

const API_KEY = process.env.TMDB_API_KEY;
if (!API_KEY) {
    console.error('Error: TMDB_API_KEY environment variable is required.');
    console.error('Get one at https://www.themoviedb.org/settings/api');
    process.exit(1);
}

const API = 'https://api.themoviedb.org/3';
const DELAY_MS = 300;

// ─── rate-limited fetch ────────────────────────────────────────────

/**
 * Strip the API key out of anything on its way to a log or an error message.
 *
 * The key is a query parameter on every request URL, so interpolating a URL
 * into a message writes the credential to stdout — and this script runs from
 * bot-backup-tmdb.sh on the Pi, whose output is appended to
 * ~/arcade/logs/backup.log. A single failed request was enough to leave the
 * key sitting in that file. Applied at both the throw site and where a caught
 * error is logged, since fetch failures can carry the URL along in `cause`
 * rather than in `message`.
 */
function redact(value) {
    return String(value).replace(/api_key=[^&\s'"]+/gi, 'api_key=REDACTED');
}

let lastFetch = 0;
async function fetchTMDB(path) {
    const elapsed = Date.now() - lastFetch;
    if (elapsed < DELAY_MS) await delay(DELAY_MS - elapsed);
    lastFetch = Date.now();

    // v3 auth: the key rides on every request as an `api_key` query parameter.
    // (An earlier comment here claimed v4 Bearer tokens were also supported.
    // They are not — nothing sets an Authorization header, so a v4 token would
    // be sent as a query parameter and rejected.)
    const separator = path.includes('?') ? '&' : '?';
    const url = path.startsWith('http') ? path : `${API}/${path}${separator}api_key=${API_KEY}`;

    for (let i = 0; i < 4; i++) {
        try {
            const res = await fetch(url);
            if (res.status === 429) {
                const wait = 2000 * (i + 1);
                log(`  rate-limited (429), waiting ${wait}ms…`);
                await delay(wait);
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${redact(url)}`);
            return await res.json();
        } catch (err) {
            if (i === 3) throw err;
            await delay(1500 * (i + 1));
        }
    }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── logging ───────────────────────────────────────────────────────

let indent = 0;
function log(msg) { console.log('  '.repeat(indent) + msg); }

// ─── entity definitions ────────────────────────────────────────────

const TMDB_PERSONS = [
    { id: 5285267, name: 'Jake A. McCoy',   mbContributor: 'jake-mccoy' },
    { id: 6309136, name: 'Rho Kalupson',     mbContributor: 'rho-k' },
    { id: 6309139, name: "Chuck Jones O'Brien", mbContributor: 'chuck-job' },
    { id: 6309134, name: 'Ellis Hester',     mbContributor: 'elias-grey' },
];

// ─── archive existing cache before overwriting ─────────────────────

async function archiveCache(type, id) {
    const dir = resolve(CACHE_DIR, type);
    const file = resolve(dir, `${id}.json`);
    if (!existsSync(file)) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archived = resolve(dir, `${id}.${stamp}.json`);
    if (DRY_RUN) {
        log(`  [dry-run] would archive ${file} → ${archived}`);
        return;
    }
    await rename(file, archived);
    log(`  archived previous → ${type}/${id}.${stamp}.json`);
}

// ─── write cache file ──────────────────────────────────────────────

async function writeCache(type, id, data) {
    const dir = resolve(CACHE_DIR, type);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const file = resolve(dir, `${id}.json`);
    if (DRY_RUN) {
        log(`  [dry-run] would write ${file} (${(JSON.stringify(data).length / 1024).toFixed(1)} KB)`);
        return;
    }
    await writeFile(file, JSON.stringify(data, null, 2));
    const size = (JSON.stringify(data).length / 1024).toFixed(1);
    log(`  cached ${size} KB → ${type}/${id}.json`);
}

function cacheExists(type, id) {
    return existsSync(resolve(CACHE_DIR, type, `${id}.json`));
}

// ─── backup: person ────────────────────────────────────────────────

async function backupPerson(entity) {
    log(`[tmdb-person] ${entity.name} (ID: ${entity.id})`);
    indent++;

    log('  fetching person + credits…');
    let data;
    try {
        data = await fetchTMDB(`person/${entity.id}?append_to_response=credits&language=en-US`);
    } catch (err) {
        if (err.message && err.message.includes('HTTP 404')) {
            log(`  ⚠ skipped — person not found on TMDB (404)`);
            indent--;
            return;
        }
        throw err;
    }

    const cache = {
        fetchedAt: new Date().toISOString(),
        entityType: 'tmdb-person',
        id: data.id,
        name: data.name,
        profile_path: data.profile_path,
        known_for_department: data.known_for_department,
        place_of_birth: data.place_of_birth,
        biography: data.biography,
        birthday: data.birthday,
        gender: data.gender,
        external_ids: data.external_ids || {},
        credits: {
            cast: (data.credits?.cast || []).map(c => ({
                id: c.id,
                title: c.title || c.name,
                release_date: c.release_date,
                character: c.character,
                poster_path: c.poster_path,
                media_type: c.media_type,
            })),
            crew: (data.credits?.crew || []).map(c => ({
                id: c.id,
                title: c.title || c.name,
                release_date: c.release_date,
                department: c.department,
                job: c.job,
                poster_path: c.poster_path,
                media_type: c.media_type,
            })),
        },
    };

    indent--;
    await archiveCache('tmdb/person', entity.id);
    await writeCache('tmdb/person', entity.id, cache);
}

// ─── main ──────────────────────────────────────────────────────────

async function main() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  TMDB Backup — magmacrunch.com           ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log();

    if (DRY_RUN) console.log('[DRY RUN — no files will be written]\n');
    if (SKIP_EXISTING) console.log('[SKIP EXISTING — already-cached entities will be skipped]\n');

    const start = Date.now();
    let completed = 0, skipped = 0, failed = 0;
    const total = TMDB_PERSONS.length;

    for (const entity of TMDB_PERSONS) {
        if (SKIP_EXISTING && cacheExists('tmdb/person', entity.id)) {
            log(`[${completed + 1}/${total}] ${entity.name} — already cached, skipping`);
            completed++;
            skipped++;
            continue;
        }
        log(`[${completed + 1}/${total}]`);
        try {
            await backupPerson(entity);
            completed++;
        } catch (err) {
            log(`  ✗ failed — ${redact(err.message)}`);
            failed++;
        }
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    console.log(`\nDone! ${completed - skipped - failed} persons backed up, ${skipped} skipped, ${failed} failed in ${min}m ${sec}s`);
    if (DRY_RUN) console.log('(dry run — no files were written)');
    if (failed > 0) process.exit(1);
}

main().catch(err => {
    // Print the stack rather than the error object, so it can be redacted:
    // an unhandled fetch failure carries the request URL — and with it the
    // API key — in its stack and `cause`.
    console.error('\nBackup failed:', redact(err && err.stack ? err.stack : err));
    process.exit(1);
});
