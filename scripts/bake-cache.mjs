#!/usr/bin/env node
/**
 * bake-cache.mjs
 *
 * Inlines MusicBrainz cache JSON into archive stub pages as window.__MB_CACHE.
 * This eliminates the fetch() call at runtime, making pages load instantly.
 *
 * Usage: node scripts/bake-cache.mjs [--dry-run]
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE_DIR = join(ROOT, 'archive', '_cache');
const DRY_RUN = process.argv.includes('--dry-run');

// Directories to scan for archive stubs
const ARCHIVE_DIRS = [
  join(ROOT, 'archive', 'by-artist'),
  join(ROOT, 'archive', 'by-place'),
  join(ROOT, 'archive', 'by-contributor'),
  join(ROOT, 'archive', 'by-label'),
];

// Config variable names for each entity type
const CONFIG_PATTERNS = {
  'by-artist': { regex: /window\.ARTIST_CONFIG\s*=\s*(\{[^}]+\})/s, cacheType: 'artists', uuidKey: 'id' },
  'by-place': { regex: /window\.PLACE_CONFIG\s*=\s*(\{[^}]+\})/s, cacheType: 'places', uuidKey: 'id' },
  'by-contributor': { regex: /window\.__CONTRIBUTOR_CONFIG\s*=\s*(\{[^}]+\})/s, cacheType: 'contributors', uuidKey: 'MB_ID' },
  'by-label': { regex: /window\.__LABEL_CONFIG\s*=\s*(\{[^}]+\})/s, cacheType: 'labels', uuidKey: 'MB_ID' },
};

let baked = 0;
let skipped = 0;

function findStubs(dir) {
  if (!existsSync(dir)) return [];
  const stubs = [];
  for (const entity of readdirSync(dir)) {
    const entityDir = join(dir, entity);
    try {
      if (!statSync(entityDir).isDirectory()) continue;
    } catch { continue; }
    for (const file of readdirSync(entityDir)) {
      if (file.endsWith('.html')) {
        stubs.push(join(entityDir, file));
      }
    }
  }
  return stubs;
}

function extractConfig(html, pattern) {
  const match = html.match(pattern.regex);
  if (!match) return null;
  try {
    // Parse the config object from the match
    const configStr = match[1];
    // Extract UUID using the key name
    const uuidMatch = configStr.match(new RegExp(`${pattern.uuidKey}\\s*:\\s*['"]([^'"]+)['"]`));
    if (!uuidMatch) return null;
    return uuidMatch[1];
  } catch {
    return null;
  }
}

function loadCache(cacheType, uuid) {
  const cacheFile = join(CACHE_DIR, cacheType, `${uuid}.json`);
  if (!existsSync(cacheFile)) return null;
  try {
    return JSON.parse(readFileSync(cacheFile, 'utf8'));
  } catch {
    return null;
  }
}

function bakeCache(html, cacheData) {
  // Check if already baked
  if (html.includes('window.__MB_CACHE')) return html;

  // Find the template script tag (last <script> before </body>)
  const templateScriptMatch = html.match(/<script src="[^"]*templates\/[^"]+\.js"><\/script>/);
  if (!templateScriptMatch) return html;

  // Inject cache before the template script
  const cacheScript = `<script>\nwindow.__MB_CACHE = ${JSON.stringify(cacheData)};\n</script>\n`;
  return html.replace(templateScriptMatch[0], cacheScript + templateScriptMatch[0]);
}

function processStub(filePath) {
  const html = readFileSync(filePath, 'utf8');

  // Determine entity type from path
  let cacheType = null;
  let uuidKey = null;
  let pattern = null;

  for (const [dir, p] of Object.entries(CONFIG_PATTERNS)) {
    if (filePath.includes(dir)) {
      pattern = p;
      cacheType = p.cacheType;
      uuidKey = p.uuidKey;
      break;
    }
  }

  if (!pattern) return;

  const uuid = extractConfig(html, pattern);
  if (!uuid) return;

  const cacheData = loadCache(cacheType, uuid);
  if (!cacheData) return;

  // Check if already baked (has same data)
  if (html.includes('window.__MB_CACHE')) {
    skipped++;
    return;
  }

  const bakedHtml = bakeCache(html, cacheData);

  if (DRY_RUN) {
    console.log(`  [dry-run] would bake: ${filePath.replace(ROOT + '/', '')} (${(JSON.stringify(cacheData).length / 1024).toFixed(1)} KB)`);
  } else {
    writeFileSync(filePath, bakedHtml);
    console.log(`  baked: ${filePath.replace(ROOT + '/', '')}`);
  }
  baked++;
}

// ─── Main ──────────────────────────────────────────────────────────

console.log('Baking MusicBrainz cache into archive pages...\n');

for (const dir of ARCHIVE_DIRS) {
  const stubs = findStubs(dir);
  for (const stub of stubs) {
    processStub(stub);
  }
}

console.log(`\nDone! ${baked} pages baked, ${skipped} skipped.`);
if (DRY_RUN) console.log('(dry run — no files were written)');
