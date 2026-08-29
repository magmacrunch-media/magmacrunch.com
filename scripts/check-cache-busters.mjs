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
 * Stamps that are not 8 hex are a different convention — a hand-bumped serial,
 * `?v=11` — and cannot be verified against content. Those are counted and named
 * in the summary rather than skipped in silence.
 *
 * ── Existence is checked before the hash, and for every reference ──
 *
 * A stamp that cannot be verified is not the same as one that need not be, and
 * the first thing worth asking of any reference is whether the file is there at
 * all. press/lyrics/ paid for the version that only looked at hashes: twelve
 * pages carried `lyrics-work.js?v=11` and `mb-cache.js` for a month after
 * 134fb53 deleted both, two 404s per page load, invisible to a check that
 * skipped the serial and never looked at the plain tag beside it.
 *
 * So existence is asserted for every local .js and .css, stamped or not, and
 * the hash comparison is the extra step for the ones that carry a real digest.
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

// src="..." or href="...", ending in .js or .css, with an optional query.
const REF_RE = /(?:src|href)\s*=\s*["']([^"']+?\.(?:js|css))(\?[^"']*)?["']/gi;

// Written by a running service rather than committed, so absent from a fresh
// clone and from CI without that being a fault. arcade/admin/server.py renders
// visual/tv/channels.js from tv-channels.json whenever the channel list is
// saved, and visual/tv/main.js reads `window.TV_CHANNELS || [ ...fallback ]`
// precisely so the page works in the window where the file does not exist.
// Anything added here must have that shape: a generator in the tree, and a
// consumer that copes with its absence.
const GENERATED = new Set(['visual/tv/channels.js']);

let checked = 0;   // stamped with a real digest, and compared against the file
let present = 0;   // resolved to a file that exists, stamped or not
const stale = [];
const missing = [];
const unverifiable = [];

for (const page of htmlFiles(ROOT)) {
  const html = readFileSync(page, 'utf8');

  for (const [, href, query] of html.matchAll(REF_RE)) {
    if (/^(?:https?:)?\/\//.test(href)) continue;          // someone else's asset

    const target = href.startsWith('/')
      ? join(ROOT, href)
      : join(dirname(page), href);

    if (GENERATED.has(rel(target))) continue;

    if (!existsSync(target)) {
      missing.push(`${rel(page)} -> ${href}`);
      continue;
    }

    present++;

    const stamp = query?.match(/^\?v=([^&]*)$/)?.[1];
    if (stamp === undefined) continue;                     // unstamped, but present

    if (!/^[0-9a-f]{8}$/.test(stamp)) {
      unverifiable.push(`${rel(page)} -> ${href}?v=${stamp}`);
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
  console.error(`\n${present} reference(s) resolved, ${checked} of them stamped and compared: ` +
                `${missing.length} missing, ${stale.length} stale.`);

  if (missing.length) {
    console.error(
      `\nA missing file is a 404 on every page load. Either the reference is dead\n` +
      `and the tag should go, or the file is generated by a service — in which\n` +
      `case add it to GENERATED at the top of this script, with the generator\n` +
      `and the consumer's fallback named in the comment.`
    );
  }

  if (stale.length) {
    console.error(
      `\nA stale stamp means visitors keep the cached old file, so the change never\n` +
      `reaches them. Set each stamp to the file's normalised digest:\n\n` +
      stale.map(s => `  ${s.href}?v=${s.actual}   (in ${s.page})`).join('\n') +
      `\n\nRecompute one with:  node scripts/check-cache-busters.mjs --digest <file>`
    );
  }

  console.error('');
  process.exit(1);
}

console.log(`\n${present} local asset reference(s) resolve, and all ${checked} stamped ` +
            `one(s) match the file they stamp.`);
