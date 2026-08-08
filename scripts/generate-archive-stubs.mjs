#!/usr/bin/env node

/**
 * generate-archive-stubs.mjs
 *
 * Reads scripts/archive-stubs.json and generates stub HTML files
 * for new artists, contributors, places, and labels.
 *
 * Also updates:
 * - templates/entity-map.js (adds UUID → path mappings)
 * - scripts/backup-musicbrainz.mjs (adds to entity arrays)
 * - scripts/archive-stubs.json (marks entries as generated)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CONFIG_PATH = join(__dirname, 'archive-stubs.json');
const ENTITY_MAP_PATH = join(ROOT, 'templates', 'entity-map.js');
const BACKUP_SCRIPT_PATH = join(__dirname, 'backup-musicbrainz.mjs');

let generated = 0;

// ── Load config ──────────────────────────────────────────────────

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));

// ── Artist stubs ─────────────────────────────────────────────────

function generateArtistStubs(artist) {
  const { name, uuid, slug, abbr, accent, backColor } = artist;
  const dir = join(ROOT, 'archive', 'by-artist', slug);
  mkdirSync(dir, { recursive: true });

  const sections = [
    { file: 'recordings.html', title: 'RECORDINGS', js: 'artist_recordings.js', css: 'artist-recordings.css', listId: 'recordings-list', loading: 'loading recordings…' },
    { file: 'releases.html', title: 'RELEASES', js: 'artist_releases.js', css: 'artist-recordings.css', listId: 'releases-list', loading: 'loading releases…' },
    { file: 'works.html', title: 'WORKS', js: 'artist_works.js', css: 'artist-recordings.css', listId: 'works-list', loading: 'loading works…' },
    { file: 'events.html', title: 'EVENTS', js: 'artist_events.js', css: 'artist-recordings.css', listId: 'events-list', loading: 'loading events…' },
  ];

  const siblings = ['about', 'links', 'music-videos', 'photography', 'recordings', 'releases', 'works'];

  for (const s of sections) {
    const filePath = join(dir, s.file);
    if (existsSync(filePath)) continue;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} — ${s.title.toLowerCase()} — magmacrunch media</title>
    <link rel="icon" type="image/x-icon" href="../../../favicon.ico">
    <link rel="stylesheet" href="../../../style.css">
    <link rel="stylesheet" href="../../../assets/archive.css">
    <link rel="stylesheet" href="../../../templates/${s.css}">
    <style>
        :root { --section-accent: var(--${accent}); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .breadcrumb a { color: var(--section-accent); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .breadcrumb a:hover { color: var(--cream, #f0ead8); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .breadcrumb .sep { color: var(--section-accent); opacity: 0.6; }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .breadcrumb .current { color: var(--section-accent); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .artist-label { color: var(--section-accent); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .page-title { color: var(--section-accent); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .nav-card.c-back { color: var(--section-accent); border-color: var(--section-accent); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .nav-card.c-back:hover { background: var(--section-accent); color: var(--black, #080808); }
    </style>
    <script>
    window.ARTIST_CONFIG = {
        id:        '${uuid}',
        name:      '${name}',
        abbr:      '${abbr}',
        accent:    '${accent}',
        backColor: '${backColor}',
        siblings:  ${JSON.stringify(siblings)},
        depth:     '../../../',
    };
    </script>
</head>
<body class="${abbr}-page ${abbr}-${s.title.toLowerCase()}-page">
<nav id="auto-nav" data-depth="../../../"></nav><main>
    <div class="breadcrumb"></div>

    <div class="page-header">
        <div class="artist-label" id="artist-label"></div>
        <div class="page-title">${s.title}</div>
        <div class="sub-nav" id="sub-nav"></div>
    </div>
    <div class="catalog-wrap">
        <div id="status-bar">${s.loading}</div>
        <div id="count-bar"></div>
        <div id="${s.listId}"></div>
    </div>
</main>
<footer>&copy; 2026 <span>magmacrunch media</span></footer>
<script src="../../../nav.js"></script>
<script src="../../../templates/entity-map.js"></script>
<script src="../../../templates/${s.js}"></script>
</body>
</html>`;

    writeFileSync(filePath, html);
    console.log(`  created: archive/by-artist/${slug}/${s.file}`);
    generated++;
  }
}

// ── Contributor stubs ────────────────────────────────────────────

function generateContributorStub(contributor) {
  const { name, uuid, slug } = contributor;
  const dir = join(ROOT, 'archive', 'by-contributor', slug);
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, 'index.html');
  if (existsSync(filePath)) return;

  const displayName = name.toUpperCase();
  const abbr = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} — magmacrunch archive</title>
    <link rel="icon" type="image/x-icon" href="../../../favicon.ico">
    <link rel="stylesheet" href="../../../style.css">
    <link rel="stylesheet" href="../../../templates/contributor.css">
    <link rel="stylesheet" href="../../../templates/contributor-theme.css">
    <style>
        main {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 80px 20px 60px;
        }
    </style>
</head>
<body class="ctb-page">

<nav id="auto-nav" data-depth="../../../"></nav>

<main>

    <div class="breadcrumb">
        <a href="../../../">home</a>
        <span class="sep">&rsaquo;</span>
        <a href="../../">archive</a>
        <span class="sep">&rsaquo;</span>
        <a href="../">by contributor</a>
        <span class="sep">&rsaquo;</span>
        <span class="current">${abbr}</span>
    </div>

    <div class="contrib-header">
        <h1 class="contrib-name">${displayName}</h1>
        <div class="contrib-ids" id="contrib-ids"></div>
    </div>

    <div id="content">
        <div class="loading">loading from MusicBrainz</div>
    </div>

    <a href="https://musicbrainz.org/artist/${uuid}" target="_blank" rel="noopener" class="mb-link">VIEW ON MUSICBRAINZ &nearr;</a>

</main>

<footer>
    &copy; 2026 <span>magmacrunch media</span>
</footer>

<script src="../../../nav.js"></script>
<script src="../../../templates/entity-map.js"></script>
<script>
window.__CONTRIBUTOR_CONFIG = {
    MB_ID: '${uuid}',
    NAME: '${name}',
    ARCHIVE_LINKS: {}
};
</script>
<script src="../../../templates/contributor.js"></script>

</body>
</html>`;

  writeFileSync(filePath, html);
  console.log(`  created: archive/by-contributor/${slug}/index.html`);
  generated++;
}

// ── Place stubs ──────────────────────────────────────────────────

function generatePlaceStubs(place) {
  const { name, uuid, slug, abbr, accent, backColor } = place;
  const dir = join(ROOT, 'archive', 'by-place', slug);
  mkdirSync(dir, { recursive: true });

  const sections = [
    { file: 'personnel.html', title: 'PERSONNEL', js: 'place_personnel.js', css: 'artist-personnel.css', listId: 'artists-list', loading: 'loading personnel…' },
    { file: 'recordings.html', title: 'RECORDINGS', js: 'place_recordings.js', css: 'artist-recordings.css', listId: 'recordings-list', loading: 'loading recordings…' },
    { file: 'works.html', title: 'WORKS', js: 'place_works.js', css: 'artist-recordings.css', listId: 'works-list', loading: 'loading works…' },
    { file: 'events.html', title: 'EVENTS', js: 'place_events.js', css: 'artist-recordings.css', listId: 'events-list', loading: 'loading events…' },
  ];

  const siblings = ['about', 'events', 'links', 'personnel', 'photography', 'recordings', 'works'];

  for (const s of sections) {
    const filePath = join(dir, s.file);
    if (existsSync(filePath)) continue;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} — ${s.title.toLowerCase()} — magmacrunch media</title>
    <link rel="icon" type="image/x-icon" href="../../../favicon.ico">
    <link rel="stylesheet" href="../../../style.css">
    <link rel="stylesheet" href="../../../assets/archive.css">
    <link rel="stylesheet" href="../../../templates/${s.css}">
    <style>
        :root { --section-accent: var(--${accent}); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .breadcrumb a { color: var(--section-accent); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .breadcrumb a:hover { color: var(--cream, #f0ead8); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .breadcrumb .sep { color: var(--section-accent); opacity: 0.6; }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .breadcrumb .current { color: var(--section-accent); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .place-label { color: var(--section-accent); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .page-title { color: var(--section-accent); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .nav-card.c-back { color: var(--section-accent); border-color: var(--section-accent); }
        body.${abbr}-page.${abbr}-${s.title.toLowerCase()}-page .nav-card.c-back:hover { background: var(--section-accent); color: var(--black, #080808); }
    </style>
    <script>
    window.PLACE_CONFIG = {
        id:        '${uuid}',
        name:      '${name}',
        abbr:      '${abbr}',
        backColor: '${backColor}',
        siblings:  ${JSON.stringify(siblings)},
        depth:     '../../../',
        accent:    '${accent}',
    };
    </script>
</head>
<body class="${abbr}-page ${abbr}-${s.title.toLowerCase()}-page">
<nav id="auto-nav" data-depth="../../../"></nav>
<main>
    <div class="breadcrumb"></div>

    <div class="page-header">
        <div class="place-label" id="place-label"></div>
        <div class="page-title">${s.title}</div>
        <div class="sub-nav" id="sub-nav"></div>
    </div>
    <div class="catalog-wrap">
        <div id="status-bar">${s.loading}</div>
        <div id="count-bar"></div>
        <div id="${s.listId}"></div>
    </div>
</main>
<footer>&copy; 2026 <span>magmacrunch media</span></footer>
<script src="../../../nav.js"></script>
<script src="../../../templates/entity-map.js"></script>
<script src="../../../templates/${s.js}"></script>
</body>
</html>`;

    writeFileSync(filePath, html);
    console.log(`  created: archive/by-place/${slug}/${s.file}`);
    generated++;
  }
}

// ── Label stubs ──────────────────────────────────────────────────

function generateLabelStub(label) {
  const { name, uuid, slug } = label;
  const dir = join(ROOT, 'archive', 'by-label', slug);
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, 'index.html');
  if (existsSync(filePath)) return;

  const displayName = name.toUpperCase();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${name} — magmacrunch archive</title>
    <link rel="icon" type="image/x-icon" href="../../../favicon.ico">
    <link rel="stylesheet" href="../../../style.css">
    <link rel="stylesheet" href="../../../templates/contributor.css">
    <link rel="stylesheet" href="../../../templates/label-theme.css">
    <style>
        main {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 80px 20px 60px;
        }
    </style>
</head>
<body class="lbl-page">

<nav id="auto-nav" data-depth="../../../"></nav>

<main>

    <div class="breadcrumb">
        <a href="../../../">home</a>
        <span class="sep">&rsaquo;</span>
        <a href="../../">archive</a>
        <span class="sep">&rsaquo;</span>
        <a href="../">by label</a>
        <span class="sep">&rsaquo;</span>
        <span class="current">${name}</span>
    </div>

    <div class="contrib-header">
        <h1 class="contrib-name">${displayName}</h1>
        <div class="contrib-ids" id="contrib-ids"></div>
    </div>

    <div id="content">
        <div class="loading">loading from MusicBrainz</div>
    </div>

    <a href="https://musicbrainz.org/label/${uuid}" target="_blank" rel="noopener" class="mb-link">VIEW ON MUSICBRAINZ &nearr;</a>

</main>

<footer>
    &copy; 2026 <span>magmacrunch media</span>
</footer>

<script src="../../../nav.js"></script>
<script src="../../../templates/entity-map.js"></script>
<script>
window.__LABEL_CONFIG = {
    MB_ID: '${uuid}',
    NAME: '${name}',
};
</script>
<script src="../../../templates/label.js"></script>

</body>
</html>`;

  writeFileSync(filePath, html);
  console.log(`  created: archive/by-label/${slug}/index.html`);
  generated++;
}

// ── Update entity-map.js ─────────────────────────────────────────

function updateEntityMap(entries) {
  if (entries.length === 0) return;

  let content = readFileSync(ENTITY_MAP_PATH, 'utf8');

  for (const e of entries) {
    const { uuid, slug, type } = e;
    if (content.includes(uuid)) continue;

    const path = type === 'artist' ? `../../by-artist/${slug}/`
               : type === 'contributor' ? `../../by-contributor/${slug}/`
               : type === 'place' ? `../../by-place/${slug}/`
               : `../../by-label/${slug}/`;

    const typeComment = type === 'artist' ? 'Artists'
                      : type === 'contributor' ? 'Contributors'
                      : type === 'place' ? 'Places'
                      : 'Labels';

    // Find the right section and append
    const sectionMarker = `/* ── ${typeComment} →`;
    const sectionIdx = content.indexOf(sectionMarker);
    if (sectionIdx !== -1) {
      // Find the end of this section (next ── or end of object)
      const afterSection = content.indexOf('/* ──', sectionIdx + 10);
      const insertIdx = afterSection !== -1 ? afterSection : content.lastIndexOf('};');
      const line = `\n    /* ${slug} */\n    '${uuid}': '${path}',\n`;
      content = content.slice(0, insertIdx) + line + content.slice(insertIdx);
    }
  }

  writeFileSync(ENTITY_MAP_PATH, content);
  console.log(`  updated: templates/entity-map.js`);
}

// ── Update backup-musicbrainz.mjs ────────────────────────────────

function updateBackupScript(entries) {
  if (entries.length === 0) return;

  let content = readFileSync(BACKUP_SCRIPT_PATH, 'utf8');

  for (const e of entries) {
    const { uuid, name, type } = e;
    if (content.includes(uuid)) continue;

    const arrayName = type === 'artist' ? 'ARTISTS'
                    : type === 'contributor' ? 'CONTRIBUTORS'
                    : type === 'place' ? 'PLACES'
                    : 'LABELS';

    // Find the array and append before the closing bracket
    const marker = `const ${arrayName} = [`;
    const idx = content.indexOf(marker);
    if (idx === -1) continue;

    const closeBracket = content.indexOf('];', idx);
    if (closeBracket === -1) continue;

    const entry = `    { uuid: '${uuid}', name: '${name}' },`;
    content = content.slice(0, closeBracket) + '\n' + entry + '\n' + content.slice(closeBracket);
  }

  writeFileSync(BACKUP_SCRIPT_PATH, content);
  console.log(`  updated: scripts/backup-musicbrainz.mjs`);
}

// ── Mark config entries as generated ─────────────────────────────

function markGenerated() {
  for (const key of ['artists', 'contributors', 'places', 'labels']) {
    for (const entry of config[key]) {
      entry.generated = true;
    }
  }
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

// ── Main ─────────────────────────────────────────────────────────

console.log('Generating archive stubs...\n');

const allEntries = [];

// Artists
for (const artist of config.artists || []) {
  if (artist.generated) continue;
  console.log(`Artist: ${artist.name}`);
  generateArtistStubs(artist);
  allEntries.push({ ...artist, type: 'artist' });
}

// Contributors
for (const contributor of config.contributors || []) {
  if (contributor.generated) continue;
  console.log(`Contributor: ${contributor.name}`);
  generateContributorStub(contributor);
  allEntries.push({ ...contributor, type: 'contributor' });
}

// Places
for (const place of config.places || []) {
  if (place.generated) continue;
  console.log(`Place: ${place.name}`);
  generatePlaceStubs(place);
  allEntries.push({ ...place, type: 'place' });
}

// Labels
for (const label of config.labels || []) {
  if (label.generated) continue;
  console.log(`Label: ${label.name}`);
  generateLabelStub(label);
  allEntries.push({ ...label, type: 'label' });
}

// Update shared files
if (allEntries.length > 0) {
  console.log('\nUpdating shared files...');
  updateEntityMap(allEntries);
  updateBackupScript(allEntries);
  markGenerated();
}

console.log(`\nDone! Generated ${generated} file(s).`);
