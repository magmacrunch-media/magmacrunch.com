#!/usr/bin/env node

/**
 * build-search-index.js
 * Scans the magmacrunch.com site and generates search-index.json
 * for client-side search with Fuse.js.
 *
 * Usage: node scripts/build-search-index.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const index = [];

function addItem(title, category, url, description, body) {
  index.push({ t: title, c: category, u: '/' + url, d: description || '', b: body || '' });
}

// ── Body Text Extraction ───────────────────────────────────
function extractBodyText(html, maxLength = 600) {
  let text = html;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  text = text.replace(/\s+/g, ' ').trim();
  if (text.length > maxLength) text = text.slice(0, maxLength) + '...';
  return text;
}

// ── Helper: extract title from HTML ────────────────────────
function extractTitle(html) {
  const m = html.match(/<title>([^<]+)<\/title>/);
  if (!m) return null;
  return m[1].split('—')[0].split('–')[0].trim();
}

// ── Helper: format a slug as a readable name ───────────────
function prettyName(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Helper: scan a directory for .html files recursively ───
function findHtmlFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      results.push(...findHtmlFiles(full));
    } else if (e.name.endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

// ══════════════════════════════════════════════════════════
// SECTION PARSERS
// ══════════════════════════════════════════════════════════

// ── Main / Hub Pages ──────────────────────────────────────
function parseMainPages() {
  const pages = [
    { file: 'index.html', title: 'Home', desc: 'magmacrunch media homepage' },
    { file: 'home/about.html', title: 'About', desc: 'About magmacrunch media' },
    { file: 'home/guestbook.html', title: 'Guestbook', desc: 'Sign the guestbook' },
    { file: 'music/index.html', title: 'Music Hub', desc: 'Music landing page' },
    { file: 'music/distributed-music.html', title: 'Distributed Music', desc: 'Stream and download releases' },
    { file: 'music/jukebox/index.html', title: 'Jukebox', desc: 'Audio jukebox player' },
    { file: 'music/physical-media/index.html', title: 'Physical Media', desc: 'CDs, tapes, and floppy disks' },
    { file: 'music/physical-media/cd/index.html', title: 'CD Releases', desc: 'CD releases catalog' },
    { file: 'music/physical-media/tape/index.html', title: 'Tape Releases', desc: 'Cassette tape releases' },
    { file: 'music/physical-media/floppy-disk/index.html', title: 'Floppy Disk', desc: 'Floppy disk releases' },
    { file: 'visual/index.html', title: 'Visual Hub', desc: 'Visual art landing page' },
    { file: 'visual/music-videos.html', title: 'Music Videos', desc: 'MTV-style music videos' },
    { file: 'visual/collage.html', title: 'Collage', desc: 'Editorial magazine collage art' },
    { file: 'visual/photography.html', title: 'Photography', desc: 'Photography gallery' },
    { file: 'visual/tv.html', title: 'Teevee', desc: 'Television-style content' },
    { file: 'archive/index.html', title: 'Archive Hub', desc: 'MusicBrainz archive' },
    { file: 'archive/by-artist/index.html', title: 'Artists', desc: 'Browse by artist' },
    { file: 'archive/by-place/index.html', title: 'Places', desc: 'Browse by place' },
    { file: 'archive/by-label/index.html', title: 'Labels', desc: 'Browse by label' },
    { file: 'archive/by-contributor/index.html', title: 'Contributors', desc: 'Browse by contributor' },
    { file: 'archive/more/contributors.html', title: 'More Contributors', desc: 'Additional contributor data' },
    { file: 'archive/more/video.html', title: 'Video Archive', desc: 'MusicBrainz video data' },
    { file: 'arcade/index.html', title: 'Arcade Hub', desc: 'Pixel games and multiplayer' },
    { file: 'arcade/server.html', title: 'Arcade Server', desc: 'Server status and info' },
    { file: 'arcade/board-games/index.html', title: 'Board Games', desc: 'Chess, checkers, backgammon, and more' },
    { file: 'arcade/card-games/index.html', title: 'Card Games', desc: 'Solitaire, cribbage, poker' },
    { file: 'arcade/puzzles/index.html', title: 'Puzzles', desc: '2048, Tetris, and brain teasers' },
    { file: 'arcade/action/index.html', title: 'Action Games', desc: 'Drift, race, and survive' },
    { file: 'press/index.html', title: 'Press Hub', desc: 'Journals and writing' },
    { file: 'press/scientific/index.html', title: 'Scientific Journal', desc: 'Academic writing and physics' },
    { file: 'press/experimental/index.html', title: 'Experimental Journal', desc: 'Experimental and literary writing' },
    { file: 'press/lyrics/index.html', title: 'Lyrics', desc: 'Song lyrics by artist' },
    { file: 'tools/index.html', title: 'Tools Hub', desc: 'Creative web tools' },
  ];

  for (const p of pages) {
    const filePath = path.join(ROOT, p.file);
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');
    const title = extractTitle(html) || p.title;
    const body = extractBodyText(html);
    addItem(title, 'page', p.file, p.desc, body);
  }
}

// ── Distributed Music ──────────────────────────────────────
function parseDistributedMusic() {
  const html = fs.readFileSync(path.join(ROOT, 'music/distributed-music.html'), 'utf8');
  const cardRegex = /<!-- ═══ (.+?) ═══ -->[\s\S]*?id="([^"]+)"[\s\S]*?dist-title">([^<]+)<[\s\S]*?dist-artist">by <a href="([^"]+)">([^<]+)<[\s\S]*?dist-description">\s*<p>\s*([\s\S]*?)\s*<\/p>/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const [, , id, title, , artistName, desc] = match;
    const cleanDesc = desc.replace(/\s+/g, ' ').trim();
    addItem(`${title}`, 'music', `music/distributed-music.html#${id}`, `${artistName} — ${cleanDesc}`);
  }
}

// ── Jukebox Songs ──────────────────────────────────────────
function parseJukeboxSongs() {
  const songs = JSON.parse(fs.readFileSync(path.join(ROOT, 'music/jukebox/songs.json'), 'utf8'));
  const visible = songs.filter(s => !s.hidden);
  for (const song of visible) {
    addItem(`${song.title}`, 'song', 'music/jukebox/', `${song.artist} — ${song.duration}`);
  }
}

// ── Physical Media (floppy disk sub-pages) ─────────────────
function parsePhysicalMedia() {
  const floppyDir = path.join(ROOT, 'music/physical-media/floppy-disk');
  const releases = ['iou-american-spirits', 'pay2play-2025'];
  for (const release of releases) {
    const dir = path.join(floppyDir, release);
    const files = findHtmlFiles(dir);
    for (const file of files) {
      const html = fs.readFileSync(file, 'utf8');
      const title = extractTitle(html);
      if (!title) continue;
      const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
      const body = extractBodyText(html);
      addItem(title, 'music', relPath, 'Floppy disk release', body);
    }
  }
}

// ── Generic Archive Section Parser ─────────────────────────
// Scans by-artist, by-place, by-label, by-contributor
// and indexes ALL .html files in each subdirectory.
function parseArchiveSection(type) {
  const dir = path.join(ROOT, 'archive', type);
  if (!fs.existsSync(dir)) return;

  const categoryMap = {
    'by-artist': 'artist',
    'by-place': 'place',
    'by-label': 'label',
    'by-contributor': 'contributor'
  };
  const category = categoryMap[type] || type;
  const subType = type.replace('by-', '');

  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_'));

  for (const entry of entries) {
    const entityDir = path.join(dir, entry.name);
    const files = findHtmlFiles(entityDir);

    for (const file of files) {
      const html = fs.readFileSync(file, 'utf8');
      const title = extractTitle(html);
      if (!title) continue;

      const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
      const body = extractBodyText(html);
      const entityName = prettyName(entry.name);

      // Build a descriptive label based on sub-page type
      const fileName = path.basename(file, '.html');
      let desc = entityName;
      if (fileName !== 'index') {
        desc = `${entityName} — ${prettyName(fileName)}`;
      } else {
        desc = `${subType} archive — recordings, works, events, releases`;
      }

      addItem(title, category, relPath, desc, body);
    }
  }
}

// ── Arcade Games ───────────────────────────────────────────
function parseArcadeGames() {
  const gameDirs = [
    'chess', 'checkers', 'backgammon', 'parchisi', 'chinese-checkers',
    'solitaire', 'cribbage', 'scandinavian-stud', 'solitaire_THLD', 'tarot',
    '2^N', 'george-boole', 'fifteen-puzzle', 'threes', 'klotski', 'tetris',
    'moonlight-drift', 'very-long-boards', 'roderick-tron', 'SORRY',
    'aggravation'
  ];

  const categories = {
    board: ['chess', 'checkers', 'backgammon', 'parchisi', 'chinese-checkers', 'aggravation'],
    card: ['solitaire', 'cribbage', 'scandinavian-stud', 'solitaire_THLD', 'tarot'],
    puzzle: ['2^N', 'george-boole', 'fifteen-puzzle', 'threes', 'klotski', 'tetris'],
    action: ['moonlight-drift', 'very-long-boards', 'roderick-tron'],
    other: ['SORRY']
  };

  const catLabels = { board: 'Board Game', card: 'Card Game', puzzle: 'Puzzle Game', action: 'Action Game', other: 'Game' };

  for (const game of gameDirs) {
    const indexFile = path.join(ROOT, 'arcade', game, 'index.html');
    if (!fs.existsSync(indexFile)) continue;

    const html = fs.readFileSync(indexFile, 'utf8');
    const title = extractTitle(html) || prettyName(game);
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);
    const cat = Object.entries(categories).find(([, games]) => games.includes(game));
    const category = cat ? catLabels[cat[0]] : 'Game';

    addItem(title, 'arcade', `arcade/${game}/`, descMatch ? descMatch[1] : category);
  }
}

// ── Press Pieces ───────────────────────────────────────────
function parsePress() {
  // Recursively scan all .html files under press/
  const pressDir = path.join(ROOT, 'press');
  const files = findHtmlFiles(pressDir);

  for (const file of files) {
    const html = fs.readFileSync(file, 'utf8');
    const title = extractTitle(html);
    if (!title) continue;

    const relPath = path.relative(ROOT, file).replace(/\\/g, '/');
    const body = extractBodyText(html);

    // Categorize based on path
    let desc = 'Press';
    if (relPath.includes('scientific')) desc = 'Scientific journal';
    else if (relPath.includes('experimental')) desc = 'Experimental journal';
    else if (relPath.includes('lyrics')) desc = 'Lyrics';
    else if (relPath.includes('submissions')) desc = 'Submission guidelines';

    addItem(title, 'press', relPath, desc, body);
  }
}

// ── Tools ──────────────────────────────────────────────────
function parseTools() {
  const toolDirs = ['album-art-maker', 'media-search', 'pixel-process'];
  for (const tool of toolDirs) {
    const indexFile = path.join(ROOT, 'tools', tool, 'index.html');
    if (!fs.existsSync(indexFile)) continue;
    const html = fs.readFileSync(indexFile, 'utf8');
    const title = extractTitle(html) || prettyName(tool);
    const body = extractBodyText(html);
    addItem(title, 'tool', `tools/${tool}/`, 'Creative web tool', body);
  }
}

// ── MusicBrainz Cache (recordings, releases, works) ────────
// Enriches existing archive entries by appending recording/release/work
// titles to the body text, making them searchable.
function parseMusicBrainzCache() {
  const cacheDir = path.join(ROOT, 'archive', '_cache');
  const entityMapPath = path.join(ROOT, 'templates', 'entity-map.js');

  /* Parse entity-map.js to get UUID → relative path mapping */
  const entityMapSrc = fs.readFileSync(entityMapPath, 'utf8');
  const uuidMap = {};
  const uuidRegex = /['"]([0-9a-f-]{36})['"]\s*:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = uuidRegex.exec(entityMapSrc)) !== null) {
    let relPath = m[2];
    relPath = relPath.replace(/^\.\.\/\.\.\//, 'archive/');
    uuidMap[m[1]] = relPath;
  }

  /* Build a URL → index entry lookup for enrichment */
  const urlIndex = {};
  index.forEach((item, i) => { urlIndex[item.u] = i; });

  /* Parse artist cache files */
  const artistDir = path.join(cacheDir, 'artists');
  if (fs.existsSync(artistDir)) {
    const files = fs.readdirSync(artistDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(artistDir, file), 'utf8'));
        if (!data.name || !data.uuid) continue;

        const basePath = uuidMap[data.uuid];
        if (!basePath) continue;

        const prefix = basePath.replace(/index\.html$/, '');

        /* Enrich recordings page */
        const recs = data.subpages?.recordings?.list?.recordings || [];
        if (recs.length > 0) {
          const recUrl = '/' + prefix + 'recordings.html';
          const idx = urlIndex[recUrl];
          if (idx !== undefined) {
            const titles = recs.map(r => r.title).filter(Boolean).join(', ');
            index[idx].b = (index[idx].b ? index[idx].b + ' ' : '') + titles;
          }
        }

        /* Enrich releases page */
        const rels = data.subpages?.releases?.list?.releases || [];
        if (rels.length > 0) {
          const relUrl = '/' + prefix + 'releases.html';
          const idx = urlIndex[relUrl];
          if (idx !== undefined) {
            const titles = rels.map(r => r.title).filter(Boolean).join(', ');
            index[idx].b = (index[idx].b ? index[idx].b + ' ' : '') + titles;
          }
        }

        /* Enrich works page */
        const works = data.subpages?.works?.list?.works || [];
        if (works.length > 0) {
          const workUrl = '/' + prefix + 'works.html';
          const idx = urlIndex[workUrl];
          if (idx !== undefined) {
            const titles = works.map(w => w.title).filter(Boolean).join(', ');
            index[idx].b = (index[idx].b ? index[idx].b + ' ' : '') + titles;
          }
        }
      } catch (e) { /* skip malformed files */ }
    }
  }
}

// ══════════════════════════════════════════════════════════
// BUILD
// ══════════════════════════════════════════════════════════
parseMainPages();
parseDistributedMusic();
parseJukeboxSongs();
parsePhysicalMedia();
parseArchiveSection('by-artist');
parseArchiveSection('by-place');
parseArchiveSection('by-label');
parseArchiveSection('by-contributor');
parseArcadeGames();
parsePress();
parseTools();
parseMusicBrainzCache();

// Deduplicate by URL (keep first occurrence)
const seen = new Set();
const deduped = index.filter(item => {
  if (seen.has(item.u)) return false;
  seen.add(item.u);
  return true;
});

// Write output
const outPath = path.join(ROOT, 'search-index.json');
fs.writeFileSync(outPath, JSON.stringify(deduped, null, 2));
console.log(`Generated ${deduped.length} search entries → search-index.json`);
