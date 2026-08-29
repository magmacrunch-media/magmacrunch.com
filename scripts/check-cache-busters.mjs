#!/usr/bin/env node
/**
 * Assert every `?v=` cache-buster matches the file it stamps.
 *
 * Pages load their assets as `app.js?v=3f8ef237`, where the stamp is the first
 * eight hex of the file's SHA-256. Change the file, bump the stamp, and every
 * visitor gets the new bytes. Forget the bump and they keep the old ones out of
 * cache — the deploy succeeds, the page loads, and the only symptom is that a
 * fix nobody can reproduce didn't reach anyone.
 *
 * Nothing was checking this. When the check was first written it found three
 * live cases: ware/magmascript/playground.html serving a stale style.css and
 * app.js, and ware/texastoast/playground.html a stale app.js — all three
 * stranded by commits that edited the asset and left the stamp alone.
 *
 * ── Hash the normalised content, not the bytes on disk ──
 *
 * .gitattributes deliberately pins only the files the Pi executes (*.sh, *.py,
 * *.yml, *.conf) to LF. .js and .css are left to each clone's core.autocrlf, so
 * git hands you CRLF on Windows and LF on Linux for the same committed blob,
 * and the two hash differently. A checker that hashed raw bytes would pass on
 * Linux and fail on every Windows clone, for files that are perfectly correct.
 *
 * scripts/sync-playground.py:bundle_digest() learned this the same way and
 * normalises for the same reason. Both must agree, or a stamp written by one
 * fails the other.
 *
 * ── Scope ──
 *
 * Only src=/href= attributes in HTML, pointing at a local .js or .css. `?v=` in
 * a JS string is usually a YouTube video id, which this must never read as a
 * cache-buster.
 *
 * Stamps that are not 8 hex are a different convention — press/lyrics/ uses a
 * hand-bumped serial, `?v=11` — and cannot be verified against content. Those
 * are counted and named in the summary rather than skipped in silence.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Only trees git does not track: node_modules, and the four .gitignore entries
// that hold HTML. Everything deployed is checked, archive/ included — its ten
// `?v=` hits are all YouTube watch URLs and one og:image, which is precisely
// what the src/href-plus-extension pattern below exists to step over.
const SKIP_DIRS = new Set(['node_modules', 'wiki', 'wiki-old-backup', 'drafts']);

/** Every .html under a directory, skipping dotfiles and untracked trees. */
function htmlFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) htmlFiles(path, out);
    else if (entry.endsWith('.html')) out.push(path);
  }
  return out;
}

/** First 8 hex of sha256 over the content with newlines normalised to LF. */
const digest = (file) => createHash('sha256')
  .update(readFileSync(file, 'utf8').replace(/\r\n/g, '\n'))
  .digest('hex')
  .slice(0, 8);

const rel = (p) => relative(ROOT, p).split('\\').join('/');

// `--digest <file>` prints the stamp a file should carry, so the fix for a
// failure below is a copy-paste rather than a re-derivation of the rule.
if (process.argv[2] === '--digest') {
  const file = process.argv[3];
  if (!file || !existsSync(file)) {
    console.error('usage: check-cache-busters.mjs --digest <file>');
    process.exit(1);
  }
  console.log(digest(file));
  process.exit(0);
}

// src="..." or href="...", ending in .js or .css, carrying a ?v= stamp.
const REF_RE = /(?:src|href)\s*=\s*["']([^"']+?\.(?:js|css))\?v=([^"'&]*)["']/gi;

let checked = 0;
const stale = [];
const missing = [];
const unverifiable = [];

for (const page of htmlFiles(ROOT)) {
  const html = readFileSync(page, 'utf8');

  for (const [, href, stamp] of html.matchAll(REF_RE)) {
    if (/^(?:https?:)?\/\//.test(href)) continue;          // someone else's asset

    if (!/^[0-9a-f]{8}$/.test(stamp)) {
      unverifiable.push(`${rel(page)} -> ${href}?v=${stamp}`);
      continue;
    }

    const target = href.startsWith('/')
      ? join(ROOT, href)
      : join(dirname(page), href);

    if (!existsSync(target)) {
      missing.push(`${rel(page)} -> ${href}`);
      continue;
    }

    checked++;
    const actual = digest(target);
    if (actual !== stamp) {
      stale.push({ page: rel(page), href, stamp, actual });
    }
  }
}

if (checked === 0) {
  // A pass over nothing is not a pass. check-shell-tokens.mjs guards the same
  // way, having watched a sibling check go green on Windows by matching nothing.
  console.error('FAIL — no verifiable ?v= reference was found. The check matched nothing,\n' +
                'which means the pattern is wrong, not that the tree is clean.');
  process.exit(1);
}

for (const m of missing) console.error(`MISSING  ${m}`);
for (const s of stale) {
  console.error(`STALE    ${s.page}\n` +
                `           -> ${s.href}  ref=${s.stamp}  actual=${s.actual}`);
}

if (unverifiable.length) {
  console.log(`\n${unverifiable.length} reference(s) use a non-hash stamp and were not verified:`);
  for (const u of unverifiable) console.log(`  ${u}`);
}

if (missing.length || stale.length) {
  console.error(
    `\n${stale.length} stale, ${missing.length} missing, out of ${checked} verified.\n\n` +
    `A stale stamp means visitors keep the cached old file, so the change never\n` +
    `reaches them. Set each stamp to the file's normalised digest:\n\n` +
    stale.map(s => `  ${s.href}?v=${s.actual}   (in ${s.page})`).join('\n') +
    (stale.length ? '\n\n' : '') +
    `Recompute one with:  node scripts/check-cache-busters.mjs --digest <file>\n`
  );
  process.exit(1);
}

console.log(`\nAll ${checked} cache-buster(s) match the files they stamp.`);
