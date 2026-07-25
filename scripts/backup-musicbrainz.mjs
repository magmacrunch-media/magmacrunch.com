#!/usr/bin/env node
/* backup-musicbrainz.mjs
 *
 * Snapshots all MusicBrainz data used by the magmacrunch.com archive pages
 * into local JSON files. Run manually or via GitHub Action.
 *
 * Usage:  node scripts/backup-musicbrainz.mjs [--dry-run]
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = resolve(ROOT, 'archive/_cache');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EXISTING = process.argv.includes('--skip-existing');

const API = 'https://musicbrainz.org/ws/2';
const DELAY_MS = 1100;

// ─── rate-limited fetch ────────────────────────────────────────────

let lastFetch = 0;
async function fetchMB(path) {
    const elapsed = Date.now() - lastFetch;
    if (elapsed < DELAY_MS) await delay(DELAY_MS - elapsed);
    lastFetch = Date.now();

    const url = path.startsWith('http') ? path : `${API}/${path}`;
    for (let i = 0; i < 4; i++) {
        try {
            const res = await fetch(url, {
                headers: { 'User-Agent': 'magmacrunch-backup/1.0 (https://magmacrunch.com)' }
            });
            if (res.status === 429 || res.status === 503) {
                const wait = 2000 * (i + 1);
                log(`  rate-limited (${res.status}), waiting ${wait}ms…`);
                await delay(wait);
                continue;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
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
function logEntity(type, name) { log(`[${type}] ${name}`); }

// ─── entity definitions ────────────────────────────────────────────

const ARTISTS = [
    { uuid: '0335c576-94a4-4adb-a323-6effff5914e0', name: 'DDT LLC' },
    { uuid: '0cb54a5f-3c60-4635-abb3-e6bc60fa7d9f', name: 'woah' },
    { uuid: '260e4953-a937-4355-8389-d1baaf24eca5', name: 'SVFP' },
    { uuid: '33c830f0-d5be-4baf-b8db-3dc754e74c16', name: 'Jon McCoy' },
    { uuid: '44c1e0bd-be4c-4a0b-8f06-864c8e2fedcc', name: 'C.P. Rutledge' },
    { uuid: '4d945923-9deb-4cd0-a477-6e1474cb306c', name: 'THLD' },
    { uuid: '5b954c0a-1375-40de-ae5f-a245e4f942c6', name: 'Dino Spumoni' },
    { uuid: '605cc914-2aff-4e2b-9657-524c7009cb18', name: 'Dag Henderson' },
    { uuid: 'bdf6e0d0-6886-4801-b7ce-c9ced5d377a8', name: 'The Four Bs' },
    { uuid: 'ddcbeb01-edb5-4e74-b5cd-23d1b64d3086', name: 'Juanito Thompson' },
    { uuid: 'e33d1006-01a5-4266-aade-b7f6c1dff8e3', name: 'Bottle Boys Collective' },
];

const PLACES = [
    { uuid: '1fc551c6-d3d5-43d0-a3bb-9e5606bdbebe', name: 'Green St. Apt' },
    { uuid: '26cbb244-48c7-49e5-863c-5dde5388dde1', name: 'Irvin House' },
    { uuid: '362e9df6-ce39-4805-841e-c113e4e2a7c9', name: 'Frogwood Manor' },
    { uuid: '3ecebfcc-6824-46a9-9e1a-ecc26f69a4a2', name: 'The Tuna Can' },
    { uuid: 'c6c69d44-8408-4a0a-9dbf-8b3ee903bc5f', name: 'College Green Apt' },
    { uuid: 'd8a1b49b-3573-4117-ae93-794816c57d4d', name: 'Marvin Gardens G12' },
    { uuid: 'e697fa03-e300-421a-8fd3-3b026d8d4f13', name: 'Twin Maples' },
    { uuid: 'f30be60e-94b4-465a-8e75-8cbdefaffbc8', name: 'Melrose House' },
];

const CONTRIBUTORS = [
    { uuid: '32bc1ac7-efd0-44f2-8645-8fecf6a40edb', name: 'Jake McCoy' },
    { uuid: '054fd43c-d028-42d6-8857-20f7d2d0bd0a', name: 'Judah Unmuth-Yockey' },
    { uuid: '03a5593d-7cb7-4e22-9f1f-a1ce216ee972', name: 'Ben Nikitas' },
    { uuid: '94a0d47c-5c34-4552-838d-c006b2a0d83b', name: 'David Hayes' },
    { uuid: '0bfa85f1-5138-4790-8439-e709399944df', name: 'Alex S.' },
    { uuid: 'c8ba82bf-cfa1-49a0-98bf-0cf8f931099f', name: "Chuck J'OB" },
    { uuid: '8b0a17a4-fb29-49b4-82e2-2e50e0be50fd', name: 'D. Rob Robinson' },
    { uuid: 'd0a8ae01-3443-42da-b258-490300f1249c', name: 'James McCoy' },
    { uuid: 'aa5ccc77-a82e-465e-a9d5-79cf4098a926', name: 'Elias Grey' },
    { uuid: 'a492cd5d-b090-48e3-8bbb-0f8f5cefc34a', name: 'Jake Thomas' },
    { uuid: '205acdc4-99a4-4f91-bf6d-43a7f1f8028e', name: 'Stephen McMillan' },
    { uuid: 'b0d4d4fd-d500-4439-b401-5c15f231e41f', name: 'Rho K.' },
    { uuid: '9b9aaa44-76da-4745-8bdb-b5869c9301b3', name: 'Rob Tomer' },
];

const LABELS = [
    { uuid: 'c78b5612-2300-4ee1-8663-299ddcf9ce25', name: 'magmacrunch music' },
    { uuid: 'ad82d124-e41e-49e8-9bf9-53e836b44336', name: 'The Slop Collective' },
    { uuid: '39446d03-fe9c-47d0-81a9-2b42d34fb400', name: 'magmacrunch media' },
    { uuid: '1d3190cc-b700-4409-bdb4-2ee8b93f3d8c', name: 'magmacrunch arcade' },
];

const WORKS = [
    { uuid: 'b5d8ec34-e488-4e94-8aa7-af05136e9322', name: 'pay2play' },
    { uuid: 'e31f5986-649d-42f2-9f02-54989b12957c', name: 'try' },
    { uuid: '4c19c4b8-e84d-4e7a-8be0-db3600a03aa6', name: 'starting again' },
    { uuid: 'b8717e83-8f30-4a37-b681-834a99f11110', name: 'gone by' },
    { uuid: '4952512f-3d3f-48af-934f-222ebdfcdb4e', name: 'space' },
    { uuid: '27b2fa99-1404-4f12-b9c8-5fe7e90a1769', name: 'somewhere' },
    { uuid: '8b195014-6814-4293-9363-b7e838f348ca', name: 'i only feel the rain' },
    { uuid: '9143547e-3632-4835-b78c-0751cbb713d3', name: 'contemplate the plate tectonic' },
];

const COLLECTIVES = [
    { slug: 'audio-sound-paper-et-al', name: 'Audio Sound Paper, et al.', ids: [
        '76708e20-5d88-4699-adf6-a1f2118ef661',
        '0296c377-7f97-4099-9c83-e2edb5552eda',
        '5c860d63-acfa-4584-82db-4a76339b2f1e',
        '8b11928f-4013-4ac9-a39b-826bbc01b25c',
    ]},
    { slug: 'vinny-bobarino', name: 'Vinny Bobarino, et al.', ids: [
        'f701c2bc-6eb6-4e7b-b950-f0c2426cb91c',
        '856f7f94-8c21-49cb-9364-e1f7b429f9ef',
        '246bff13-d203-4879-a22b-9ad6b5ddae7c',
        'd9179190-dcf2-469e-b4c8-3624b97dc11a',
    ]},
    { slug: 'fruity-loops-debauchery-collective', name: 'Fruity Loops Debauchery Bros.', ids: [
        'b7846e25-306e-4ca9-8db1-0391ab159a36',
        'ce22522c-1193-4298-badf-0df5cdfa0415',
        '3c3bc6e8-9d72-457f-a192-b6ef263fe4ae',
    ]},
];

// Note: C.P. Rutledge and Jon McCoy appear in both ARTISTS and CONTRIBUTORS.
// Contributor pages fetch artist-rels + 6 more inc params, so they need
// their own cache files even though the UUID overlaps with artists.

// ─── write cache file ──────────────────────────────────────────────

async function writeCache(type, uuid, data) {
    const dir = resolve(CACHE_DIR, type);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const file = resolve(dir, `${uuid}.json`);
    if (DRY_RUN) {
        log(`  [dry-run] would write ${file} (${(JSON.stringify(data).length / 1024).toFixed(1)} KB)`);
        return;
    }
    await writeFile(file, JSON.stringify(data, null, 2));
    const size = (JSON.stringify(data).length / 1024).toFixed(1);
    log(`  cached ${size} KB → ${type}/${uuid}.json`);
}

function cacheExists(type, uuid) {
    return existsSync(resolve(CACHE_DIR, type, `${uuid}.json`));
}

// ─── paginated list fetch ──────────────────────────────────────────

async function fetchPaginated(entityParam, entityId) {
    let all = [], offset = 0, total = 0;
    do {
        const data = await fetchMB(`${entityParam}?${entityParam === 'event' ? (entityId.startsWith('place') ? 'place' : 'artist') : 'artist'}=${entityId.replace(/^(artist:|place:)/, '')}&limit=100&offset=${offset}&fmt=json`);
        total = data[`${entityParam}-count`] || 0;
        all = all.concat(data[`${entityParam}s`] || []);
        offset += 100;
        if (offset < total) await delay(1000);
    } while (offset < total);
    return { list: all, total };
}

// ─── backup: artist events ─────────────────────────────────────────

async function backupArtistEvents(uuid, name) {
    log('  events…');
    const cache = { list: null, details: {}, areaChains: {} };

    // paginated list
    let all = [], offset = 0, total = 0;
    do {
        const data = await fetchMB(`event?artist=${uuid}&limit=100&offset=${offset}&fmt=json`);
        total = data['event-count'] || 0;
        all = all.concat(data.events || []);
        offset += 100;
        if (offset < total) await delay(1000);
    } while (offset < total);
    cache.list = { 'event-count': total, events: all };

    // detail for each event
    for (let i = 0; i < all.length; i++) {
        const e = all[i];
        log(`  event detail ${i + 1}/${all.length}: ${e.name}`);
        const d = await fetchMB(`event/${e.id}?inc=place-rels+artist-rels&fmt=json`);
        cache.details[e.id] = d;

        // pre-resolve area chains for places
        const placeRel = d.relations?.find(r => r.type === 'held at');
        const areaId = placeRel?.place?.area?.id;
        if (areaId && !cache.areaChains[areaId]) {
            try {
                const names = [];
                const seen = new Set();
                let currentId = areaId;
                while (currentId && !seen.has(currentId)) {
                    seen.add(currentId);
                    const areaData = await fetchMB(`area/${currentId}?inc=area-rels&fmt=json`);
                    if (areaData.name && !['County'].includes(areaData.type)) names.push(areaData.name);
                    if (areaData.type === 'Country' || names.length >= 4) break;
                    const partOf = areaData.relations?.find(r => r.type === 'part of' && r['target-type'] === 'area');
                    currentId = partOf?.area?.id || null;
                }
                cache.areaChains[areaId] = names.join(', ');
            } catch {
                cache.areaChains[areaId] = '';
            }
        }
    }
    return cache;
}

// ─── backup: artist releases ───────────────────────────────────────

async function backupArtistReleases(uuid, name) {
    log('  releases…');
    const cache = { list: null, details: {}, releaseGroups: {} };

    let all = [], offset = 0, total = 0;
    do {
        const data = await fetchMB(`release?artist=${uuid}&limit=100&offset=${offset}&fmt=json`);
        total = data['release-count'] || 0;
        all = all.concat(data.releases || []);
        offset += 100;
        if (offset < total) await delay(1000);
    } while (offset < total);
    cache.list = { 'release-count': total, releases: all };

    for (let i = 0; i < all.length; i++) {
        const rel = all[i];
        log(`  release detail ${i + 1}/${all.length}: ${rel.title}`);
        const d = await fetchMB(`release/${rel.id}?inc=artists+labels+recordings+release-groups&fmt=json`);
        cache.details[rel.id] = d;

        if (d['release-group']?.id) {
            try {
                const rg = await fetchMB(`release-group/${d['release-group'].id}?inc=tags&fmt=json`);
                cache.releaseGroups[d['release-group'].id] = rg;
            } catch {}
        }
    }
    return cache;
}

// ─── backup: artist recordings ─────────────────────────────────────

async function backupArtistRecordings(uuid, name) {
    log('  recordings…');
    const cache = { list: null, details: {} };

    let all = [], offset = 0;
    while (true) {
        const data = await fetchMB(`recording?artist=${uuid}&limit=100&offset=${offset}&fmt=json`);
        const recs = data.recordings || [];
        all = all.concat(recs);
        if (recs.length < 100) break;
        offset += 100;
        await delay(1000);
    }
    cache.list = { recordings: all };

    for (let i = 0; i < all.length; i++) {
        const rec = all[i];
        log(`  recording detail ${i + 1}/${all.length}: ${rec.title}`);
        cache.details[rec.id] = await fetchMB(
            `recording/${rec.id}?inc=artists+isrcs+tags+artist-rels+place-rels+releases+work-rels+aliases+recording-rels&fmt=json`
        );
    }
    return cache;
}

// ─── backup: artist works ──────────────────────────────────────────

async function backupArtistWorks(uuid, name) {
    log('  works…');
    const cache = { artistWorkRels: null, details: {}, recordingFlags: {} };

    const artistData = await fetchMB(`artist/${uuid}?inc=work-rels&fmt=json`);
    cache.artistWorkRels = artistData;

    const workRels = artistData.relations?.filter(r => r['target-type'] === 'work') || [];
    const seen = new Set();

    for (const rel of workRels) {
        const workId = rel.work?.id;
        if (!workId || seen.has(workId)) continue;
        seen.add(workId);
        log(`  work detail ${seen.size}/${workRels.length}: ${rel.work?.title}`);

        const w = await fetchMB(`work/${workId}?inc=artist-rels+label-rels+url-rels+place-rels+tags+work-rels+aliases+recording-rels&fmt=json`);
        cache.details[workId] = w;

        // pre-fetch recording flags (video, disambiguation) for performances
        const recRels = w.relations?.filter(r => r['target-type'] === 'recording' && r.type === 'performance') || [];
        for (const r of recRels) {
            const recId = r.recording?.id;
            if (!recId || cache.recordingFlags[recId]) continue;
            try {
                const rd = await fetchMB(`recording/${recId}?fmt=json`);
                cache.recordingFlags[recId] = { video: rd.video, disambiguation: rd.disambiguation || '' };
            } catch {
                cache.recordingFlags[recId] = { video: false, disambiguation: '' };
            }
        }
    }
    return cache;
}

// ─── backup: artist members ────────────────────────────────────────

async function backupArtistMembers(uuid, name) {
    log('  members…');
    const cache = { main: null, subgroups: {} };

    const data = await fetchMB(`artist/${uuid}?inc=artist-rels&fmt=json`);
    cache.main = data;

    const subgroups = data.relations?.filter(r =>
        r['target-type'] === 'artist' && r.artist && r.type === 'subgroup'
    ) || [];

    for (const sg of subgroups) {
        log(`  subgroup: ${sg.artist.name}`);
        cache.subgroups[sg.artist.id] = await fetchMB(`artist/${sg.artist.id}?inc=artist-rels&fmt=json`);
    }
    return cache;
}

// ─── backup: full artist entity (all sub-pages) ────────────────────

async function backupArtist(entity) {
    logEntity('artist', entity.name);
    const cache = { fetchedAt: new Date().toISOString(), entityType: 'artist', uuid: entity.uuid, name: entity.name, subpages: {} };
    indent++;

    cache.subpages.events     = await backupArtistEvents(entity.uuid, entity.name);
    cache.subpages.releases   = await backupArtistReleases(entity.uuid, entity.name);
    cache.subpages.recordings = await backupArtistRecordings(entity.uuid, entity.name);
    cache.subpages.works      = await backupArtistWorks(entity.uuid, entity.name);
    cache.subpages.members    = await backupArtistMembers(entity.uuid, entity.name);

    indent--;
    await writeCache('artists', entity.uuid, cache);
}

// ─── backup: place events ──────────────────────────────────────────

async function backupPlaceEvents(uuid, name) {
    log('  events…');
    const cache = { list: null, details: {} };

    let all = [], offset = 0, total = 0;
    do {
        const data = await fetchMB(`event?place=${uuid}&limit=100&offset=${offset}&fmt=json`);
        total = data['event-count'] || 0;
        all = all.concat(data.events || []);
        offset += 100;
        if (offset < total) await delay(1000);
    } while (offset < total);
    cache.list = { 'event-count': total, events: all };

    for (let i = 0; i < all.length; i++) {
        const e = all[i];
        log(`  event detail ${i + 1}/${all.length}: ${e.name}`);
        cache.details[e.id] = await fetchMB(`event/${e.id}?inc=place-rels+artist-rels&fmt=json`);
    }
    return cache;
}

// ─── backup: place recordings ──────────────────────────────────────

async function backupPlaceRecordings(uuid, name) {
    log('  recordings…');
    const cache = { placeData: null, details: {} };

    const placeData = await fetchMB(`place/${uuid}?inc=recording-rels&fmt=json`);
    cache.placeData = placeData;

    const recRels = placeData.relations?.filter(r => r['target-type'] === 'recording') || [];
    const seen = new Map();
    for (const rel of recRels) {
        const id = rel.recording?.id;
        if (id && !seen.has(id)) seen.set(id, rel);
    }

    let i = 0;
    for (const [recId] of seen) {
        i++;
        log(`  recording detail ${i}/${seen.size}`);
        cache.details[recId] = await fetchMB(
            `recording/${recId}?inc=artists+isrcs+tags+artist-rels+place-rels+releases+work-rels+aliases+recording-rels&fmt=json`
        );
    }
    return cache;
}

// ─── backup: place works ───────────────────────────────────────────

async function backupPlaceWorks(uuid, name) {
    log('  works…');
    const cache = { placeData: null, details: {}, recordingFlags: {} };

    const placeData = await fetchMB(`place/${uuid}?inc=work-rels&fmt=json`);
    cache.placeData = placeData;

    const workRels = placeData.relations?.filter(r => r['target-type'] === 'work') || [];
    const seen = new Set();

    for (const rel of workRels) {
        const workId = rel.work?.id;
        if (!workId || seen.has(workId)) continue;
        seen.add(workId);
        log(`  work detail ${seen.size}/${workRels.length}: ${rel.work?.title}`);

        const w = await fetchMB(`work/${workId}?inc=artist-rels+label-rels+url-rels+place-rels+tags+work-rels+aliases+recording-rels&fmt=json`);
        cache.details[workId] = w;

        const recRels = w.relations?.filter(r => r['target-type'] === 'recording' && r.type === 'performance') || [];
        for (const r of recRels) {
            const recId = r.recording?.id;
            if (!recId || cache.recordingFlags[recId]) continue;
            try {
                const rd = await fetchMB(`recording/${recId}?fmt=json`);
                cache.recordingFlags[recId] = { video: rd.video, disambiguation: rd.disambiguation || '' };
            } catch {
                cache.recordingFlags[recId] = { video: false, disambiguation: '' };
            }
        }
    }
    return cache;
}

// ─── backup: place personnel ───────────────────────────────────────

async function backupPlacePersonnel(uuid, name) {
    log('  personnel…');
    const cache = { placeData: null, details: {} };

    const placeData = await fetchMB(`place/${uuid}?inc=artist-rels&fmt=json`);
    cache.placeData = placeData;

    const artistRels = placeData.relations?.filter(r => r['target-type'] === 'artist') || [];
    const seen = new Set();

    for (const rel of artistRels) {
        const artistId = rel.artist?.id;
        if (!artistId || seen.has(artistId)) continue;
        seen.add(artistId);
        log(`  artist detail ${seen.size}/${artistRels.length}: ${rel.artist?.name}`);

        cache.details[artistId] = await fetchMB(
            `artist/${artistId}?inc=artist-rels+label-rels+url-rels+place-rels+tags+work-rels+aliases+recording-rels+release-groups&fmt=json`
        );
    }
    return cache;
}

// ─── backup: full place entity ─────────────────────────────────────

async function backupPlace(entity) {
    logEntity('place', entity.name);
    const cache = { fetchedAt: new Date().toISOString(), entityType: 'place', uuid: entity.uuid, name: entity.name, subpages: {} };
    indent++;

    cache.subpages.events     = await backupPlaceEvents(entity.uuid, entity.name);
    cache.subpages.recordings = await backupPlaceRecordings(entity.uuid, entity.name);
    cache.subpages.works      = await backupPlaceWorks(entity.uuid, entity.name);
    cache.subpages.personnel  = await backupPlacePersonnel(entity.uuid, entity.name);

    indent--;
    await writeCache('places', entity.uuid, cache);
}

// ─── backup: contributor ───────────────────────────────────────────

async function backupContributor(entity) {
    logEntity('contributor', entity.name);
    const cache = { fetchedAt: new Date().toISOString(), entityType: 'contributor', uuid: entity.uuid, name: entity.name, responses: {} };
    indent++;

    const incParams = ['artist-rels', 'recording-rels', 'work-rels', 'release-rels', 'label-rels', 'place-rels', 'event-rels'];

    for (const inc of incParams) {
        log(`  ${inc}…`);
        cache.responses[inc] = await fetchMB(`artist/${entity.uuid}?fmt=json&inc=${inc}`);
    }

    indent--;
    await writeCache('contributors', entity.uuid, cache);
}

// ─── backup: label ─────────────────────────────────────────────────

async function backupLabel(entity) {
    logEntity('label', entity.name);
    const cache = { fetchedAt: new Date().toISOString(), entityType: 'label', uuid: entity.uuid, name: entity.name, responses: {} };
    indent++;

    const incParams = ['artist-rels', 'label-rels', 'event-rels', 'recording-rels', 'work-rels', 'release-rels'];

    for (const inc of incParams) {
        log(`  ${inc}…`);
        cache.responses[inc] = await fetchMB(`label/${entity.uuid}?fmt=json&inc=${inc}`);
    }

    indent--;
    await writeCache('labels', entity.uuid, cache);
}

// ─── backup: standalone work (for lyrics pages) ─────────────────

async function backupWork(entity) {
    logEntity('work', entity.name);
    const cache = { fetchedAt: new Date().toISOString(), entityType: 'work', uuid: entity.uuid, name: entity.name, data: null, recordings: {} };
    indent++;

    log('  work detail…');
    cache.data = await fetchMB(`work/${entity.uuid}?inc=artist-rels+recording-rels+place-rels+tags+aliases&fmt=json`);

    // fetch recording details for release + place info
    const recRels = cache.data.relations?.filter(r => r['target-type'] === 'recording' && r.type === 'performance') || [];
    for (const r of recRels) {
        const recId = r.recording?.id;
        if (!recId || cache.recordings[recId]) continue;
        log(`  recording: ${r.recording?.title}`);
        try {
            cache.recordings[recId] = await fetchMB(`recording/${recId}?inc=releases+place-rels+event-rels&fmt=json`);
        } catch {
            cache.recordings[recId] = null;
        }
    }

    indent--;
    await writeCache('works', entity.uuid, cache);
}

// ─── backup: full collective entity (works + recordings + releases) ──

async function backupCollective(entity) {
    logEntity('collective', entity.name);
    const cache = { fetchedAt: new Date().toISOString(), entityType: 'collective', slug: entity.slug, name: entity.name, ids: entity.ids, works: { artistWorkRels: null, details: {}, recordingFlags: {} }, recordings: { list: [], details: {} }, releases: { list: [], details: {}, releaseGroups: {} } };
    indent++;

    // ── works ──
    log('works…');
    const allWorkRels = [];
    const workSeen = new Set();
    for (const id of entity.ids) {
        log(`  work-rels for ${id.slice(0,8)}…`);
        const artistData = await fetchMB(`artist/${id}?inc=work-rels&fmt=json`);
        const rels = artistData.relations?.filter(r => r['target-type'] === 'work') || [];
        for (const rel of rels) {
            const wid = rel.work?.id;
            if (wid && !workSeen.has(wid)) { workSeen.add(wid); allWorkRels.push(rel); }
        }
    }
    cache.works.artistWorkRels = { relations: allWorkRels };

    for (const rel of allWorkRels) {
        const workId = rel.work?.id;
        if (!workId) continue;
        log(`  work detail ${workId.slice(0,8)}: ${rel.work?.title}`);
        const w = await fetchMB(`work/${workId}?inc=artist-rels+label-rels+url-rels+place-rels+tags+work-rels+aliases+recording-rels&fmt=json`);
        cache.works.details[workId] = w;

        const recRels = w.relations?.filter(r => r['target-type'] === 'recording' && r.type === 'performance') || [];
        for (const r of recRels) {
            const recId = r.recording?.id;
            if (!recId || cache.works.recordingFlags[recId]) continue;
            try {
                const rd = await fetchMB(`recording/${recId}?fmt=json`);
                cache.works.recordingFlags[recId] = { video: rd.video, disambiguation: rd.disambiguation || '' };
            } catch {
                cache.works.recordingFlags[recId] = { video: false, disambiguation: '' };
            }
        }
    }

    // ── recordings ──
    log('recordings…');
    const allRecordings = [];
    const recSeen = new Set();
    for (const id of entity.ids) {
        let offset = 0, hasMore = true;
        while (hasMore) {
            log(`  recording list ${id.slice(0,8)} offset=${offset}…`);
            const data = await fetchMB(`recording?artist=${id}&limit=100&offset=${offset}&fmt=json`);
            const recs = data.recordings || [];
            for (const rec of recs) {
                if (!recSeen.has(rec.id)) { recSeen.add(rec.id); allRecordings.push(rec); }
            }
            if (recs.length === 100) { offset += 100; await delay(1000); }
            else hasMore = false;
        }
    }
    cache.recordings.list = allRecordings;

    for (let i = 0; i < allRecordings.length; i++) {
        const rec = allRecordings[i];
        log(`  recording detail ${i+1}/${allRecordings.length}: ${rec.title}`);
        cache.recordings.details[rec.id] = await fetchMB(
            `recording/${rec.id}?inc=artists+isrcs+tags+artist-rels+place-rels+releases+work-rels+aliases+recording-rels&fmt=json`
        );
    }

    // ── releases ──
    log('releases…');
    const allReleases = [];
    const relSeen = new Set();
    for (const id of entity.ids) {
        let offset = 0, total = 0;
        do {
            log(`  release list ${id.slice(0,8)} offset=${offset}…`);
            const data = await fetchMB(`release?artist=${id}&limit=100&offset=${offset}&fmt=json`);
            total = data['release-count'] || 0;
            const rels = data.releases || [];
            for (const rel of rels) {
                if (!relSeen.has(rel.id)) { relSeen.add(rel.id); allReleases.push(rel); }
            }
            offset += 100;
            if (offset < total) await delay(1000);
        } while (offset < total);
    }
    cache.releases.list = allReleases;

    for (let i = 0; i < allReleases.length; i++) {
        const rel = allReleases[i];
        log(`  release detail ${i+1}/${allReleases.length}: ${rel.title}`);
        cache.releases.details[rel.id] = await fetchMB(
            `release/${rel.id}?inc=artists+labels+recordings+release-groups&fmt=json`
        );

        if (cache.releases.details[rel.id]['release-group']?.id) {
            const rgId = cache.releases.details[rel.id]['release-group'].id;
            if (!cache.releases.releaseGroups[rgId]) {
                try {
                    const rg = await fetchMB(`release-group/${rgId}?inc=tags&fmt=json`);
                    cache.releases.releaseGroups[rgId] = rg;
                } catch {}
            }
        }
    }

    indent--;
    await writeCache('collectives', entity.slug, cache);
}

// ─── main ──────────────────────────────────────────────────────────

async function main() {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║  MusicBrainz Backup — magmacrunch.com    ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log();

    if (DRY_RUN) console.log('[DRY RUN — no files will be written]\n');
    if (SKIP_EXISTING) console.log('[SKIP EXISTING — already-cached entities will be skipped]\n');

    const start = Date.now();
    let completed = 0, skipped = 0;
    const total = ARTISTS.length + PLACES.length + CONTRIBUTORS.length + LABELS.length + WORKS.length + COLLECTIVES.length;

    for (const entity of ARTISTS) {
        if (SKIP_EXISTING && cacheExists('artists', entity.uuid)) { log(`[${completed + 1}/${total}] [artist] ${entity.name} — already cached, skipping`); completed++; skipped++; continue; }
        log(`[${completed + 1}/${total}]`);
        await backupArtist(entity);
        completed++;
    }

    for (const entity of PLACES) {
        if (SKIP_EXISTING && cacheExists('places', entity.uuid)) { log(`[${completed + 1}/${total}] [place] ${entity.name} — already cached, skipping`); completed++; skipped++; continue; }
        log(`[${completed + 1}/${total}]`);
        await backupPlace(entity);
        completed++;
    }

    for (const entity of CONTRIBUTORS) {
        if (SKIP_EXISTING && cacheExists('contributors', entity.uuid)) { log(`[${completed + 1}/${total}] [contributor] ${entity.name} — already cached, skipping`); completed++; skipped++; continue; }
        log(`[${completed + 1}/${total}]`);
        await backupContributor(entity);
        completed++;
    }

    for (const entity of LABELS) {
        if (SKIP_EXISTING && cacheExists('labels', entity.uuid)) { log(`[${completed + 1}/${total}] [label] ${entity.name} — already cached, skipping`); completed++; skipped++; continue; }
        log(`[${completed + 1}/${total}]`);
        await backupLabel(entity);
        completed++;
    }

    for (const entity of WORKS) {
        if (SKIP_EXISTING && cacheExists('works', entity.uuid)) { log(`[${completed + 1}/${total}] [work] ${entity.name} — already cached, skipping`); completed++; skipped++; continue; }
        log(`[${completed + 1}/${total}]`);
        await backupWork(entity);
        completed++;
    }

    for (const entity of COLLECTIVES) {
        if (SKIP_EXISTING && cacheExists('collectives', entity.slug)) { log(`[${completed + 1}/${total}] [collective] ${entity.name} — already cached, skipping`); completed++; skipped++; continue; }
        log(`[${completed + 1}/${total}]`);
        await backupCollective(entity);
        completed++;
    }

    const elapsed = ((Date.now() - start) / 1000).toFixed(0);
    const min = Math.floor(elapsed / 60);
    const sec = elapsed % 60;
    console.log(`\nDone! ${completed - skipped} entities backed up, ${skipped} skipped in ${min}m ${sec}s`);
    if (DRY_RUN) console.log('(dry run — no files were written)');
}

main().catch(err => {
    console.error('\nBackup failed:', err);
    process.exit(1);
});
