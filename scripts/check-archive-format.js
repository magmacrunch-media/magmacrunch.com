#!/usr/bin/env node
/* ═══════════════════════════════════════════════
   check-archive-format.js
   Validates formatting consistency across archive
   HTML files. Exits non-zero if warnings found.

   Usage:
     node scripts/check-archive-format.js          # console output
     node scripts/check-archive-format.js --json   # JSON to stdout
   ═══════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ARCHIVE = path.join(ROOT, 'archive');
const jsonMode = process.argv.includes('--json');

// ── Canonical mapping: link text → expected CSS class ──
const TEXT_TO_CLASS = {
  'about':        'c-about',
  'events':       'c-events',
  'games':        'c-games',
  'links':        'c-links',
  'music videos': 'c-music-videos',
  'network':      'c-network',
  'documentary':  'c-documentary',
  'personnel':    'c-personnel',
  'photography':  'c-photography',
  'recordings':   'c-recordings',
  'releases':     'c-releases',
  'works':        'c-works',
};

const warnings = [];

function warn(file, line, msg) {
  const rel = path.relative(ROOT, file);
  warnings.push({ file: rel, line, msg });
  if (!jsonMode) {
    console.log(`\nWARN  ${rel}:${line}`);
    console.log(`      ${msg}`);
  }
}

// ── File walking ──
function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (entry === 'node_modules' || entry === '.git') continue;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, acc);
    } else if (entry.endsWith('.html')) {
      acc.push(full);
    }
  }
  return acc;
}

// ── Extract sub-nav blocks with surrounding line context ──
function extractSubNavs(lines) {
  const navs = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<div class="sub-nav"')) {
      let depth = 0;
      let end = i;
      for (let j = i; j < lines.length; j++) {
        const open = (lines[j].match(/<div[\s>]/g) || []).length;
        const close = (lines[j].match(/<\/div>/g) || []).length;
        depth += open - close;
        if (depth <= 0) { end = j; break; }
      }
      navs.push({ startLine: i, endLine: end, lines: lines.slice(i, end + 1) });
    }
  }
  return navs;
}

// ── Extract nav-card links from sub-nav lines ──
function extractCards(navLines) {
  const cards = [];
  for (let i = 0; i < navLines.length; i++) {
    const m = navLines[i].match(/<a\s+href="([^"]+)"\s+class="nav-card\s+(c-[\w-]+)"[^>]*>([^<]+)<\/a>/);
    if (m) {
      cards.push({ href: m[1], cls: m[2], text: m[3].trim(), lineOffset: i });
    }
  }
  return cards;
}

// ── Check: sub-nav CSS class matches link text ──
function checkSubNavClasses(file, lines) {
  // Load CSS files for this page to verify target classes exist
  const dir = path.dirname(file);
  const cssClasses = loadCssClasses(dir);

  const navs = extractSubNavs(lines);
  for (const nav of navs) {
    const cards = extractCards(nav.lines);
    for (const card of cards) {
      if (card.cls === 'c-back') continue;
      const expected = TEXT_TO_CLASS[card.text];
      if (expected && card.cls !== expected) {
        // Only warn if the target class is actually defined in CSS.
        // If it's not defined, the current class may be intentional.
        if (!cssClasses.has(expected)) continue;
        const lineNum = nav.startLine + card.lineOffset + 1;
        warn(file, lineNum,
          `sub-nav class mismatch: "${card.text}" link uses ${card.cls}, expected ${expected}`);
      }
    }
  }
}

// ── Load CSS class definitions from a directory's stylesheets ──
function loadCssClasses(dir) {
  const classes = new Set();
  const root = path.resolve(__dirname, '..');

  // Collect CSS files: *-shared.css in page dir, style.css at root, templates CSS
  const cssFiles = [];
  try {
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith('.css')) cssFiles.push(path.join(dir, f));
    }
  } catch {}
  cssFiles.push(path.join(root, 'style.css'));

  for (const cssFile of cssFiles) {
    try {
      const css = fs.readFileSync(cssFile, 'utf8');
      // Match .nav-card.c-classname patterns (handles .nav-card.c-music-videos, body.x-page .nav-card.c-events, etc.)
      const re = /\.nav-card\.([\w-]+)/g;
      let m;
      while ((m = re.exec(css))) classes.add(m[1]);
    } catch {}
  }
  return classes;
}

// ── Check: orphan closing divs ──
function checkOrphanDivs(file, lines) {
  let opens = 0;
  let closes = 0;
  for (const line of lines) {
    opens += (line.match(/<div[\s>]/g) || []).length;
    closes += (line.match(/<\/div>/g) || []).length;
  }
  if (opens !== closes) {
    let depth = 0;
    for (let i = lines.length - 1; i >= 0; i--) {
      const open = (lines[i].match(/<div[\s>]/g) || []).length;
      const close = (lines[i].match(/<\/div>/g) || []).length;
      depth += close - open;
      if (depth > 0) {
        warn(file, i + 1,
          `orphan closing </div> tag (${opens} opens, ${closes} closes)`);
        return;
      }
    }
    warn(file, 1,
      `mismatched div tags: ${opens} opens, ${closes} closes`);
  }
}

// ── Main ──
function main() {
  const htmlFiles = walk(ARCHIVE);

  for (const file of htmlFiles) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    checkSubNavClasses(file, lines);
    checkOrphanDivs(file, lines);
  }

  if (jsonMode) {
    console.log(JSON.stringify({ warnings, count: warnings.length }));
  } else {
    console.log('');
    if (warnings.length === 0) {
      console.log('all checks passed');
    } else {
      console.log(`${warnings.length} warning${warnings.length === 1 ? '' : 's'} found`);
    }
  }
  process.exit(warnings.length > 0 ? 1 : 0);
}

main();
