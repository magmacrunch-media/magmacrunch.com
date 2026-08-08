#!/usr/bin/env node

/**
 * init-admin-data.mjs
 *
 * One-time setup script that creates the data files needed by MAGMA//OPS.
 * Run this once to initialize the admin dashboard with real data.
 *
 * Usage: node scripts/init-admin-data.mjs
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ADMIN_DIR = join(ROOT, 'arcade', 'admin');
const JUKEBOX_SONGS = join(ROOT, 'music', 'jukebox', 'songs.json');

console.log('Initializing MAGMA//OPS admin data files...\n');

// ── TV Channels ─────────────────────────────────────────────────────

const TV_CHANNELS_PATH = join(ADMIN_DIR, 'tv-channels.json');

if (!existsSync(TV_CHANNELS_PATH)) {
  const DEFAULT_CHANNELS = [
    { title: "Hologram of a Dream", artist: "magma//crunch", id: "mby4C5PZzlQ", year: "2025" },
    { title: "Sitting on a Dock in New Shoreham", artist: "magma//crunch", id: "BirxEyAj0u0", year: "2025" },
    { title: "Very Long Boards", artist: "magma//crunch", id: "8xjZgv3us1Q", year: "2025" },
    { title: "I'm gonna need more of a commitment than that", artist: "magma//crunch", id: "KiFWHj1cmOY", year: "2025" },
    { title: "Leaves", artist: "magma//crunch", id: "wv_6z79fQjQ", year: "2024" },
    { title: "Summer Day", artist: "magma//crunch", id: "QgJfLXhV15Y", year: "2024" },
    { title: "Gravitational Voltage", artist: "magma//crunch", id: "gtclSfU8oDM", year: "2024" },
    { title: "Beach Ave.", artist: "magma//crunch", id: "tkpoCxpsUAk", year: "2024" },
    { title: "Who is Richard Parker?", artist: "magma//crunch", id: "xGzuJO_5364", year: "2024" },
    { title: "Parade Float Electronics", artist: "magma//crunch", id: "gjo9FdBJGRk", year: "2024" },
    { title: "Figure the Shoreline", artist: "magma//crunch", id: "Gm9XVmj0iVM", year: "2024" },
    { title: "Point Judith", artist: "magma//crunch", id: "cCUC-a6v74E", year: "2024" },
    { title: "Eternity spent in an arcade", artist: "magma//crunch", id: "lTmHfMZAimQ", year: "2024" },
    { title: "Try", artist: "magma//crunch", id: "To6AJJ7-iCY", year: "2024" },
    { title: "Contemplate the Plate Tectonic", artist: "magma//crunch", id: "YnzQh-h5zq0", year: "2024" },
    { title: "Area Does Not Exist", artist: "magma//crunch", id: "T6lCJBrjFQ0", year: "2024" },
    { title: "Daffodil & Sweet Pea", artist: "magma//crunch", id: "0QwOELVzeSo", year: "2024" },
    { title: "Driving", artist: "magma//crunch", id: "vmUJ2O3xwJw", year: "2024" },
    { title: "Ancient Weeds", artist: "magma//crunch", id: "pX3G_dtyMPI", year: "2023" },
    { title: "Film School", artist: "magma//crunch", id: "VN_5u6tBPts", year: "2023" },
    { title: "Little Piece No. 1", artist: "magma//crunch", id: "hlOYgcDvyaE", year: "2023" },
    { title: "Millstone Woods May 2018", artist: "magma//crunch", id: "3_jo3WEOPEI", year: "2023" },
    { title: "Bus full of time-traveling twenty-somethings", artist: "magma//crunch", id: "OebpP5m3jms", year: "2023" },
    { title: "Sex Van Floor Plan: The Documentary", artist: "SVFP", id: "VSGReUKVRjk", year: "2026" },
  ];

  writeFileSync(TV_CHANNELS_PATH, JSON.stringify(DEFAULT_CHANNELS, null, 2) + '\n');
  console.log('  created: arcade/admin/tv-channels.json');
  console.log(`            ${DEFAULT_CHANNELS.length} channels`);
} else {
  console.log('  skipped: arcade/admin/tv-channels.json (already exists)');
}

// ── Jukebox Songs ───────────────────────────────────────────────────

const JUKEBOX_PATH = join(ADMIN_DIR, 'jukebox-songs.json');

if (!existsSync(JUKEBOX_PATH)) {
  const songs = JSON.parse(readFileSync(JUKEBOX_SONGS, 'utf8'));
  writeFileSync(JUKEBOX_PATH, JSON.stringify(songs, null, 2) + '\n');
  console.log('  created: arcade/admin/jukebox-songs.json');
  console.log(`            ${songs.length} songs`);
} else {
  console.log('  skipped: arcade/admin/jukebox-songs.json (already exists)');
}

// ── Themes ──────────────────────────────────────────────────────────

const THEMES_PATH = join(ADMIN_DIR, 'themes.json');

if (!existsSync(THEMES_PATH)) {
  // Read DEFAULT_THEMES from theme.js
  const themeJs = readFileSync(join(ADMIN_DIR, 'static', 'theme.js'), 'utf8');
  const match = themeJs.match(/var\s+DEFAULT_THEMES\s*=\s*(\[[\s\S]*?\]);/);
  if (match) {
    // Evaluate the array (safe since it's our own code)
    const themes = eval(match[1]);
    writeFileSync(THEMES_PATH, JSON.stringify(themes, null, 2) + '\n');
    console.log('  created: arcade/admin/themes.json');
    console.log(`            ${themes.length} themes`);
  } else {
    console.log('  warning: could not parse DEFAULT_THEMES from theme.js');
  }
} else {
  console.log('  skipped: arcade/admin/themes.json (already exists)');
}

// ── GitHub Token (auto-configure from env) ──────────────────────────

const GITHUB_TOKEN_PATH = join(ADMIN_DIR, 'github-token.json');

if (!existsSync(GITHUB_TOKEN_PATH) && process.env.GITHUB_TOKEN) {
  writeFileSync(GITHUB_TOKEN_PATH, JSON.stringify({ token: process.env.GITHUB_TOKEN }, null, 2) + '\n');
  console.log('  created: arcade/admin/github-token.json (from GITHUB_TOKEN env)');
} else if (!existsSync(GITHUB_TOKEN_PATH)) {
  console.log('  skipped: arcade/admin/github-token.json (no GITHUB_TOKEN env var)');
  console.log('            Set GITHUB_TOKEN env var or paste token in dashboard');
} else {
  console.log('  skipped: arcade/admin/github-token.json (already exists)');
}

// ── Summary ─────────────────────────────────────────────────────────

console.log('\nDone! MAGMA//OPS data files initialized.');
console.log('');
console.log('Next steps:');
console.log('  1. Deploy to Pi: make deploy-pi');
console.log('  2. Open MAGMA//OPS dashboard');
console.log('  3. Check JUKEBOX, TV, THEMES tabs');
console.log('  4. If GitHub not configured, paste token in GITHUB tab');
