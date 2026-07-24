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

function slugify(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ── Body Text Extraction ───────────────────────────────────
// Strips HTML tags, scripts, styles, and nav elements.
// Truncates to maxLength chars.
function extractBodyText(html, maxLength = 600) {
  let text = html;
  // Remove script and style tags and their content
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  // Remove nav elements
  text = text.replace(/<nav[\s\S]*?<\/nav>/gi, '');
  // Remove footer
  text = text.replace(/<footer[\s\S]*?<\/footer>/gi, '');
  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();
  // Truncate
  if (text.length > maxLength) text = text.slice(0, maxLength) + '...';
  return text;
}

// ── Distributed Music ──────────────────────────────────────
function parseDistributedMusic() {
  const html = fs.readFileSync(path.join(ROOT, 'music/distributed-music.html'), 'utf8');
  const cardRegex = /<!-- ═══ (.+?) ═══ -->[\s\S]*?id="([^"]+)"[\s\S]*?dist-title">([^<]+)<[\s\S]*?dist-artist">by <a href="([^"]+)">([^<]+)<[\s\S]*?dist-description">\s*<p>\s*([\s\S]*?)\s*<\/p>/g;
  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const [, , id, title, artistPath, artistName, desc] = match;
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

// ── Archive: Artists ───────────────────────────────────────
function parseArtists() {
  const dir = path.join(ROOT, 'archive/by-artist');
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_') && e.name !== 'index.html');
  for (const entry of entries) {
    const name = entry.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const indexFile = path.join(dir, entry.name, 'index.html');
    if (fs.existsSync(indexFile)) {
      const html = fs.readFileSync(indexFile, 'utf8');
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        const title = titleMatch[1].split('—')[0].split('–')[0].trim();
        addItem(title, 'artist', `archive/by-artist/${entry.name}/`, `Artist archive — recordings, works, events, releases`);
      } else {
        addItem(name, 'artist', `archive/by-artist/${entry.name}/`, `Artist archive`);
      }
    }
  }
}

// ── Archive: Places ────────────────────────────────────────
function parsePlaces() {
  const dir = path.join(ROOT, 'archive/by-place');
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_') && e.name !== 'index.html');
  for (const entry of entries) {
    const indexFile = path.join(dir, entry.name, 'index.html');
    if (fs.existsSync(indexFile)) {
      const html = fs.readFileSync(indexFile, 'utf8');
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        const title = titleMatch[1].split('—')[0].split('–')[0].trim();
        addItem(title, 'place', `archive/by-place/${entry.name}/`, `Place archive — recordings, works, events`);
      }
    }
  }
}

// ── Archive: Labels ────────────────────────────────────────
function parseLabels() {
  const dir = path.join(ROOT, 'archive/by-label');
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_') && e.name !== 'index.html');
  for (const entry of entries) {
    const indexFile = path.join(dir, entry.name, 'index.html');
    if (fs.existsSync(indexFile)) {
      const html = fs.readFileSync(indexFile, 'utf8');
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        const title = titleMatch[1].split('—')[0].split('–')[0].trim();
        addItem(title, 'label', `archive/by-label/${entry.name}/`, `Label archive`);
      }
    }
  }
}

// ── Archive: Contributors ──────────────────────────────────
function parseContributors() {
  const dir = path.join(ROOT, 'archive/by-contributor');
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(e => e.isDirectory() && !e.name.startsWith('_') && e.name !== 'index.html');
  for (const entry of entries) {
    const indexFile = path.join(dir, entry.name, 'index.html');
    if (fs.existsSync(indexFile)) {
      const html = fs.readFileSync(indexFile, 'utf8');
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        const title = titleMatch[1].split('—')[0].split('–')[0].trim();
        addItem(title, 'contributor', `archive/by-contributor/${entry.name}/`, `Contributor archive`);
      }
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
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/);

    let title = game.replace(/-/g, ' ');
    if (titleMatch) {
      title = titleMatch[1].split('—')[0].split('–')[0].trim();
    }

    const cat = Object.entries(categories).find(([, games]) => games.includes(game));
    const category = cat ? catLabels[cat[0]] : 'Game';

    addItem(title, 'arcade', `arcade/${game}/`, descMatch ? descMatch[1] : category);
  }
}

// ── Press Pieces ───────────────────────────────────────────
function parsePress() {
  // Scientific articles
  const sciDir = path.join(ROOT, 'press/scientific');
  if (fs.existsSync(sciDir)) {
    const files = fs.readdirSync(sciDir).filter(f => f.endsWith('.html'));
    for (const file of files) {
      const html = fs.readFileSync(path.join(sciDir, file), 'utf8');
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        const title = titleMatch[1].split('—')[0].split('–')[0].trim();
        const body = extractBodyText(html);
        addItem(title, 'press', `press/scientific/${file}`, 'Scientific journal', body);
      }
    }
    // Check for cone/ subdirectory
    const coneDir = path.join(sciDir, 'cone');
    if (fs.existsSync(coneDir)) {
      const files = fs.readdirSync(coneDir).filter(f => f.endsWith('.html'));
      for (const file of files) {
        const html = fs.readFileSync(path.join(coneDir, file), 'utf8');
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          const title = titleMatch[1].split('—')[0].split('–')[0].trim();
          const body = extractBodyText(html);
          addItem(title, 'press', `press/scientific/cone/${file}`, 'Scientific journal', body);
        }
      }
    }
  }

  // Experimental articles
  const expDir = path.join(ROOT, 'press/experimental');
  if (fs.existsSync(expDir)) {
    const files = fs.readdirSync(expDir).filter(f => f.endsWith('.html'));
    for (const file of files) {
      const html = fs.readFileSync(path.join(expDir, file), 'utf8');
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        const title = titleMatch[1].split('—')[0].split('–')[0].trim();
        const body = extractBodyText(html);
        addItem(title, 'press', `press/experimental/${file}`, 'Experimental journal', body);
      }
    }
  }

  // Lyrics
  const lyricsDir = path.join(ROOT, 'press/lyrics');
  if (fs.existsSync(lyricsDir)) {
    const artistDirs = fs.readdirSync(lyricsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name !== 'index.html');
    for (const artistDir of artistDirs) {
      const dir = path.join(lyricsDir, artistDir.name);
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
      for (const file of files) {
        const html = fs.readFileSync(path.join(dir, file), 'utf8');
        const titleMatch = html.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          const title = titleMatch[1].split('—')[0].split('–')[0].trim();
          const artistName = artistDir.name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          const body = extractBodyText(html);
          addItem(title, 'press', `press/lyrics/${artistDir.name}/${file}`, `Lyrics — ${artistName}`, body);
        }
      }
    }
  }
}

// ── Tools ──────────────────────────────────────────────────
function parseTools() {
  const toolDirs = ['album-art-maker', 'media-search', 'pixel-process'];
  for (const tool of toolDirs) {
    const indexFile = path.join(ROOT, 'tools', tool, 'index.html');
    if (!fs.existsSync(indexFile)) continue;
    const html = fs.readFileSync(indexFile, 'utf8');
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    if (titleMatch) {
      const title = titleMatch[1].split('—')[0].split('–')[0].trim();
      addItem(title, 'tool', `tools/${tool}/`, 'Tool');
    }
  }
}

// ── Main Pages ─────────────────────────────────────────────
function parseMainPages() {
  const simplePages = [
    { file: 'index.html', title: 'Home', desc: 'magmacrunch media homepage' },
    { file: 'home/guestbook.html', title: 'Guestbook', desc: 'Sign the guestbook' },
    { file: 'music/index.html', title: 'Music Hub', desc: 'Music landing page' },
    { file: 'music/distributed-music.html', title: 'Distributed Music', desc: 'Stream and download releases' },
    { file: 'visual/index.html', title: 'Visual Hub', desc: 'Visual art landing page' },
    { file: 'visual/music-videos.html', title: 'Music Videos', desc: 'MTV-style music videos' },
    { file: 'visual/collage.html', title: 'Collage', desc: 'Editorial magazine collage art' },
    { file: 'visual/photography.html', title: 'Photography', desc: 'Photography gallery' },
    { file: 'visual/tv.html', title: 'Teevee', desc: 'Television-style content' },
    { file: 'archive/index.html', title: 'Archive Hub', desc: 'MusicBrainz archive' },
    { file: 'arcade/index.html', title: 'Arcade Hub', desc: 'Pixel games and multiplayer' },
    { file: 'press/index.html', title: 'Press Hub', desc: 'Journals and writing' },
    { file: 'press/submissions.html', title: 'Submissions', desc: 'Submission guidelines' },
    { file: 'tools/index.html', title: 'Tools Hub', desc: 'Creative tools' },
  ];
  for (const p of simplePages) {
    addItem(p.title, 'page', p.file, p.desc);
  }

  // About page — extract body text
  const aboutFile = path.join(ROOT, 'home/about.html');
  if (fs.existsSync(aboutFile)) {
    const html = fs.readFileSync(aboutFile, 'utf8');
    const body = extractBodyText(html);
    addItem('About', 'page', 'home/about.html', 'About magmacrunch media', body);
  }
}

// ── Build ──────────────────────────────────────────────────
parseMainPages();
parseDistributedMusic();
parseJukeboxSongs();
parseArtists();
parsePlaces();
parseLabels();
parseContributors();
parseArcadeGames();
parsePress();
parseTools();

// Write output
const outPath = path.join(ROOT, 'search-index.json');
fs.writeFileSync(outPath, JSON.stringify(index, null, 2));
console.log(`Generated ${index.length} search entries → search-index.json`);
