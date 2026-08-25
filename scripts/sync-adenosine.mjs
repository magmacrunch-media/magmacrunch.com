#!/usr/bin/env node
/**
 * Sync adenosine IIFE bundles and stylesheets from node_modules into arcade/,
 * then stamp
 * every arcade <script> tag that loads one with a content-hash cache-buster,
 * plus every game-local .js/.css an arcade page references.
 *
 * Run via `npm run build:adenosine`. Idempotent: re-running with no dependency
 * change rewrites nothing.
 *
 * Why a content hash rather than the package version: adenosine-cards has
 * already been rebuilt with a real bug fix under an unchanged version number
 * (website commit 632b856), so a version stamp would not have busted the stale
 * copy in visitors' caches. The hash is derived from the bytes actually served,
 * so it cannot drift from them.
 *
 * All five bundles stay tracked in git on purpose: GitHub Pages serves this
 * repo's branch directly (no Pages build workflow), so an untracked bundle
 * would 404 on magmacrunch.com. The Pi gets them from this script instead.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHARED = join(ROOT, 'arcade', 'shared');

/** Package short name -> the arcade/shared/ filename games load. */
const PACKAGES = ['rpg', 'score-client', 'puzzle', 'cards', 'audio', 'chat', 'multiplayer'];

/**
 * Extra files a package ships beside its bundle. adenosine-chat's SharedWorker
 * must sit next to the bundle that loads it: the widget resolves the worker as
 * a sibling of its own <script src>, and a SharedWorker cannot be bundled in
 * (it is a separate execution context loaded by URL).
 */
const EXTRA_ASSETS = { chat: ['chat-worker.js'] };

/**
 * Hand-written scripts in arcade/shared/ that are not generated from npm but
 * still need busting. score-server.js decides which host receives high scores,
 * so a stale copy sends them nowhere — the exact failure the stamps prevent.
 */
const LOCAL_SHARED = ['score-server.js', 'mp-server.js', 'chat-server.js'];

/**
 * Stylesheets a package ships, and where in arcade/ the pages already load them
 * from. Paths are relative to the repo root and deliberately point at the
 * existing locations, so no page markup has to change.
 *
 * These used to be hand-maintained copies rather than synced ones, and that is
 * how two bugs survived: the published cards.css referenced six custom
 * properties it never defined, and the face-card SVG another eight, so cards
 * rendered transparent and kings painted solid black for everyone outside this
 * repo. Nothing here noticed, because the arcade loaded its own copy and the
 * published file had no consumer at all.
 *
 * Syncing them closes that gap: the stylesheet people install is the one
 * production runs, so it cannot break for them while looking fine for us.
 */
const PACKAGE_CSS = {
  cards: [
    ['cards.css', 'arcade/shared/cards/cards.css'],
    ['chip-animation.css', 'arcade/shared/chips/chip-animation.css'],
  ],
  multiplayer: [['lobby.css', 'arcade/shared/multiplayer/lobby.css']],
  chat: [['chat-widget.css', 'arcade/shared/chat-widget.css']],
  puzzle: [
    ['puzzle-base.css', 'arcade/puzzle-framework/css/puzzle-base.css'],
    ['puzzle-grid.css', 'arcade/puzzle-framework/css/puzzle-grid.css'],
    ['puzzle-modals.css', 'arcade/puzzle-framework/css/puzzle-modals.css'],
    ['puzzle-responsive.css', 'arcade/puzzle-framework/css/puzzle-responsive.css'],
  ],
};

const HASH_LEN = 8;

function shortHash(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, HASH_LEN);
}

/** Recursively collect every .html file under a directory. */
function htmlFiles(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(p, out);
    else if (/\.html?$/.test(entry.name)) out.push(p);
  }
  return out;
}

// ── 1. Copy bundles out of node_modules ──────────────────────────────────────

mkdirSync(SHARED, { recursive: true });

/** short name -> content hash of the bundle now in arcade/shared/ */
const hashes = new Map();
const missing = [];
const stale = [];

/** The version package-lock.json pins for a workspace dependency, if any. */
function lockedVersion(pkg) {
  try {
    const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
    return lock.packages?.[`node_modules/@magmacrunch/adenosine-${pkg}`]?.version ?? null;
  } catch {
    return null;
  }
}

for (const pkg of PACKAGES) {
  const src = join(ROOT, 'node_modules', '@magmacrunch', `adenosine-${pkg}`, 'dist', 'index.global.js');
  if (!existsSync(src)) {
    missing.push(`@magmacrunch/adenosine-${pkg}`);
    continue;
  }
  const bytes = readFileSync(src);
  const dest = join(SHARED, `adenosine-${pkg}.js`);
  const changed = !existsSync(dest) || !readFileSync(dest).equals(bytes);
  if (changed) writeFileSync(dest, bytes);

  const hash = shortHash(bytes);
  hashes.set(pkg, hash);

  const version = JSON.parse(
    readFileSync(join(ROOT, 'node_modules', '@magmacrunch', `adenosine-${pkg}`, 'package.json'), 'utf8'),
  ).version;

  // Guard against a stale node_modules silently *downgrading* a bundle. If the
  // lockfile has moved on (e.g. after pulling a branch that bumped a dep) and
  // npm ci has not been run, copying from node_modules would overwrite the
  // committed bundle with an older build — losing whatever the newer one fixed.
  const locked = lockedVersion(pkg);
  if (locked && locked !== version) {
    stale.push(`  @magmacrunch/adenosine-${pkg}: lockfile ${locked}, installed ${version}`);
  }
  console.log(`  ${changed ? 'updated' : 'unchanged'}  adenosine-${pkg}.js  v${version}  ?v=${hash}`);

  for (const asset of EXTRA_ASSETS[pkg] ?? []) {
    const from = join(ROOT, 'node_modules', '@magmacrunch', `adenosine-${pkg}`, 'dist', asset);
    if (!existsSync(from)) {
      missing.push(`@magmacrunch/adenosine-${pkg} is missing dist/${asset}`);
      continue;
    }
    const bytes = readFileSync(from);
    const dest = join(SHARED, asset);
    const assetChanged = !existsSync(dest) || !readFileSync(dest).equals(bytes);
    if (assetChanged) writeFileSync(dest, bytes);
    console.log(`  ${assetChanged ? 'updated' : 'unchanged'}  ${asset}  (asset of adenosine-${pkg})`);
  }

  // Stylesheets. The game-local stamping pass below re-hashes any .css an arcade
  // page references, so these pick up a fresh ?v= automatically once their bytes
  // change — no separate bookkeeping needed.
  for (const [shipped, target] of PACKAGE_CSS[pkg] ?? []) {
    const from = join(ROOT, 'node_modules', '@magmacrunch', `adenosine-${pkg}`, shipped);
    if (!existsSync(from)) {
      missing.push(`@magmacrunch/adenosine-${pkg} is missing ${shipped}`);
      continue;
    }
    const bytes = readFileSync(from);
    const dest = join(ROOT, target);
    mkdirSync(dirname(dest), { recursive: true });
    const cssChanged = !existsSync(dest) || !readFileSync(dest).equals(bytes);
    if (cssChanged) writeFileSync(dest, bytes);
    console.log(`  ${cssChanged ? 'updated' : 'unchanged'}  ${target.replace('arcade/', '')}  (css of adenosine-${pkg})`);
  }
}

for (const name of LOCAL_SHARED) {
  const file = join(SHARED, name);
  if (!existsSync(file)) {
    missing.push(`arcade/shared/${name} (expected to exist; it is not generated)`);
    continue;
  }
  const hash = shortHash(readFileSync(file));
  hashes.set(name, hash);
  console.log(`  local     ${name}  ?v=${hash}`);
}

if (missing.length) {
  console.error(`\nMissing dependencies — run \`npm install\` first:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}

if (stale.length) {
  console.error(
    `\nnode_modules does not match package-lock.json:\n${stale.join('\n')}\n\n` +
      'Run `npm ci` and re-run this script. Continuing would copy the installed\n' +
      'build over the committed bundle, downgrading it.',
  );
  process.exit(1);
}

// ── 1b. Sync playground from adenosine repo ─────────────────────────────────

const ADENOSINE_REPO = process.env.ADENOSINE_REPO || resolve(ROOT, '..', 'game_dev', 'adenosine');
const PLAYGROUND_SRC = join(ADENOSINE_REPO, 'playground');
const PLAYGROUND_DEST = join(ROOT, 'ware', 'playground');

if (existsSync(PLAYGROUND_SRC)) {
  console.log('\nplayground:');

  // Top-level files
  for (const name of ['index.html', 'app.js', 'style.css']) {
    const src = join(PLAYGROUND_SRC, name);
    const dest = join(PLAYGROUND_DEST, name);
    if (!existsSync(src)) { console.log(`  skipped    ${name} (not in adenosine repo)`); continue; }
    let bytes = readFileSync(src);
    // Strip CDN/Local source toggle — only CDN mode works on the website
    if (name === 'index.html') {
      bytes = Buffer.from(bytes.toString('utf8')
        .replace(/<div class="source-toggle">[\s\S]*?<\/div>\n\s*/g, ''));
    }
    if (name === 'app.js') {
      bytes = Buffer.from(bytes.toString('utf8')
        .replace(/let state = \{ package: "rpg", example: "rpg-basic", mode: "cdn" \};/,
                 'let state = { package: "rpg", example: "rpg-basic" };')
        .replace(/if \(state\.mode === "local"\) return `[^`]*`;\n\s*return/g, 'return')
        .replace(/document\.querySelectorAll\('input\[name="source"\]'\)[\s\S]*?\n\n/g, ''));
    }
    if (name === 'style.css') {
      bytes = Buffer.from(bytes.toString('utf8')
        .replace(/\/\* ── Source toggle ──[\s\S]*?(?=\n\/\* ── About modal)/, '')
        .replace(/\n?\.source-toggle[^\{]*\{[^}]*\}\n?/g, ''));
    }
    const changed = !existsSync(dest) || !readFileSync(dest).equals(bytes);
    if (changed) { mkdirSync(PLAYGROUND_DEST, { recursive: true }); writeFileSync(dest, bytes); }
    console.log(`  ${changed ? 'updated' : 'unchanged'}  ${name}`);
  }

  // examples/ directory
  const examplesSrc = join(PLAYGROUND_SRC, 'examples');
  if (existsSync(examplesSrc)) {
    const examplesDest = join(PLAYGROUND_DEST, 'examples');
    mkdirSync(examplesDest, { recursive: true });
    for (const name of readdirSync(examplesSrc).filter(f => f.endsWith('.js'))) {
      const src = join(examplesSrc, name);
      const dest = join(examplesDest, name);
      const bytes = readFileSync(src);
      const changed = !existsSync(dest) || !readFileSync(dest).equals(bytes);
      if (changed) writeFileSync(dest, bytes);
      console.log(`  ${changed ? 'updated' : 'unchanged'}  examples/${name}`);
    }
  }
} else {
  console.log(`\nskipped playground (adenosine repo not found at ${PLAYGROUND_SRC})`);
}

// ── 2. Stamp ?v=<hash> on every arcade script tag that loads a bundle ────────

// Matches: src="<any path>adenosine-<pkg>.js" with an optional existing query.
const NAMES = [
  ...PACKAGES.map((p) => `adenosine-${p}\\.js`),
  ...LOCAL_SHARED.map((n) => n.replace('.', '\\.')),
];
const TAG = new RegExp(
  `(src=["'])([^"']*/(${NAMES.join('|')}))(\\?[^"']*)?(["'])`,
  'g',
);

let filesTouched = 0;
let tagsStamped = 0;

for (const file of htmlFiles(join(ROOT, 'arcade'))) {
  const before = readFileSync(file, 'utf8');
  const after = before.replace(TAG, (_m, open, path, file, _query, close) => {
    // `file` is the bare filename: adenosine-<pkg>.js, or a LOCAL_SHARED name.
    const key = file.startsWith('adenosine-') ? file.slice('adenosine-'.length, -3) : file;
    const hash = hashes.get(key);
    if (!hash) return _m; // unknown script: leave it exactly as it was
    tagsStamped++;
    return `${open}${path}?v=${hash}${close}`;
  });
  if (after !== before) {
    writeFileSync(file, after);
    filesTouched++;
    console.log(`  stamped   ${file.slice(ROOT.length + 1)}`);
  }
}

// ── 3. Stamp ?v=<hash> on every game-local script and stylesheet ─────────────

// Pass 2 keys its lookup on a bare filename, which only works because every
// shared bundle has a name unique across the repo. Game-local assets do not:
// arcade/<game>/js/main.js exists a dozen times over with different bytes. So
// this pass resolves each reference against the directory of the HTML file that
// makes it and hashes whatever is actually there.
//
// Without this a stale main.js can silently keep running after a fix ships —
// which is exactly how chess's multiplayer lobby appeared broken for a whole
// commit after it had already been fixed.
//
// The shared bundles pass 2 just stamped are matched here too. That is harmless
// and self-consistent: both passes hash the same bytes, so the stamp pass 3
// writes is the one pass 2 already wrote.

// Any <script src> or <link href>. The value is split on '?' below rather than
// matched here, so an existing query is replaced rather than appended to.
const LOCAL_ASSET = /(<(?:script|link)\b[^>]*?\b(?:src|href)=["'])([^"']+)(["'])/g;

/** Absolute, protocol-relative, root-relative and data: URLs are not ours. */
function isExternal(path) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(path);
}

let localFilesTouched = 0;
let localTagsStamped = 0;

for (const file of htmlFiles(join(ROOT, 'arcade'))) {
  const before = readFileSync(file, 'utf8');
  const dir = dirname(file);
  const after = before.replace(LOCAL_ASSET, (whole, open, value, close) => {
    const path = value.split('?')[0];
    if (isExternal(path) || !/\.(?:js|css)$/i.test(path)) return whole;
    const resolved = join(dir, path);
    if (!existsSync(resolved)) return whole; // typo or generated later: leave it
    localTagsStamped++;
    return `${open}${path}?v=${shortHash(readFileSync(resolved))}${close}`;
  });
  if (after !== before) {
    writeFileSync(file, after);
    localFilesTouched++;
    console.log(`  stamped   ${file.slice(ROOT.length + 1)}  (game-local assets)`);
  }
}

console.log(
  `\n${hashes.size} bundle(s) synced; ${tagsStamped} bundle tag(s) and ` +
    `${localTagsStamped} game-local tag(s) checked across arcade/; ` +
    `${filesTouched + localFilesTouched} file(s) rewritten.` +
    (existsSync(PLAYGROUND_SRC) ? ' Playground synced.' : ''),
);
