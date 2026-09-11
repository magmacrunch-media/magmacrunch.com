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
 * ── Fixing ──
 *
 * `npm run fix:cachebust` (this script with `--fix`) rewrites stale stamps in
 * place, since the correct value is a function of the file and retyping it by
 * hand is a transcription step with nothing to decide. It touches stale stamps
 * only: unstamped references stay unstamped, and a missing file stays a hard
 * failure. See the FIX comment further down for why the line is drawn there.
 *
 * .githooks/pre-commit does not run this. It used to, and that was the flaw:
 * this reads the working tree, and a commit records the index, which in a
 * shared checkout routinely differ. The hook runs check-staged-stamps.mjs,
 * which applies the same rule to what the commit will actually record. Install
 * it with `npm run hooks:install`.
 *
 * ── The rule itself lives in scripts/lib/cache-busters.mjs ──
 *
 * digest(), the reference patterns, what counts as unresolvable, how a
 * reference resolves and which trees are skipped are shared with
 * check-game-stamps.mjs, which applies the same rule to the game repos the
 * generated arcade folders are copied from, and with check-staged-stamps.mjs.
 * Why the digest normalises newlines before hashing is explained there.
 *
 * ── Scope ──
 *
 * src=, href= and poster= in HTML, and url() in CSS, pointing at a local
 * script, stylesheet, image, media file or font. A stylesheet's url() resolves
 * against the stylesheet rather than the page, which is its own way to go
 * unnoticed.
 *
 * Page-to-page .html links are deliberately out of scope: the check-links
 * workflow already follows those, and it knows about redirects and the
 * generated archive stubs, which this does not.
 *
 * Two kinds of match are stepped over rather than resolved. A `?v=` in a JS
 * string is usually a YouTube video id, never a cache-buster. And the archive
 * gallery pages build markup inside template literals, so a src can read
 * `${thumbUrl}` or `about:blank` — references to no fixed path, which this must
 * not guess at. isUnresolvable() holds both rules.
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
 * So existence is asserted for every local asset a page or stylesheet loads,
 * stamped or not, and the hash comparison is the extra step for the ones that
 * carry a real digest. Widening that from scripts to images immediately found
 * three more: a deleted gallery photo still set as a CSS background, and two
 * <img> tags on a placeholder that was never committed at all.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  digest, HTML_REF_RE, CSS_REF_RE, isUnresolvable, isRemote, stampOf, isDigestStamp,
  resolveRef, rewriteStamps, SKIP_DIRS, GENERATED,
} from './lib/cache-busters.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every file with one of `exts` under a directory, skipping untracked trees. */
function filesUnder(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) filesUnder(path, exts, out);
    else if (exts.some(x => entry.endsWith(x))) out.push(path);
  }
  return out;
}

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

// `--fix` rewrites every stale stamp in place instead of reporting it. The
// stamp is derived from the file, so a human retyping it is a transcription
// step with nothing to decide — and the failure mode of forgetting is silent,
// which is the whole reason this check exists. b8ee311 repinned the adenosine
// tools and left three stamps behind; that repair was eight digests copied by
// hand out of this script's own error message.
//
// Only stale stamps are touched. An unstamped reference is left unstamped —
// adding stamps is a judgement about caching that belongs to whoever writes
// the tag — and a missing file is still a hard failure, since the repair is
// either deleting a tag or declaring a generator, neither of which is
// mechanical.
const FIX = process.argv.includes('--fix');

let checked = 0;   // stamped with a real digest, and compared against the file
let present = 0;   // resolved to a file that exists, stamped or not
const stale = [];
const missing = [];
const unverifiable = [];

/** Resolve one reference found in `source`, and record what is wrong with it. */
function inspect(href, query, source) {
  if (isUnresolvable(href)) return;
  if (isRemote(href)) return;                              // someone else's asset

  const target = join(ROOT, resolveRef(href, rel(source)));

  if (GENERATED.has(rel(target))) return;

  if (!existsSync(target)) {
    missing.push(`${rel(source)} -> ${href}`);
    return;
  }

  present++;

  const stamp = stampOf(query);
  if (stamp === undefined) return;                         // unstamped, but present

  if (!isDigestStamp(stamp)) {
    unverifiable.push(`${rel(source)} -> ${href}?v=${stamp}`);
    return;
  }

  checked++;
  const actual = digest(target);
  if (actual !== stamp) {
    stale.push({ page: rel(source), href, stamp, actual });
  }
}

for (const page of filesUnder(ROOT, ['.html'])) {
  const html = readFileSync(page, 'utf8');
  for (const [, href, query] of html.matchAll(HTML_REF_RE)) inspect(href, query, page);
}

// A stylesheet's url() resolves against the stylesheet, not the page that
// loaded it — which is how archive/by-artist/thld/thld-about.css kept pointing
// at a photo deleted three weeks earlier without any page looking wrong enough
// to notice.
for (const sheet of filesUnder(ROOT, ['.css'])) {
  const css = readFileSync(sheet, 'utf8');
  for (const [, , href, query] of css.matchAll(CSS_REF_RE)) inspect(href, query, sheet);
}

// rewriteStamps() in the lib does the editing, so this and the pre-commit hook
// cannot disagree about what a repaired reference looks like.
if (FIX && stale.length) {
  const byFile = new Map();
  for (const s of stale) {
    if (!byFile.has(s.page)) byFile.set(s.page, []);
    byFile.get(s.page).push(s);
  }

  let fixed = 0;
  for (const [page, entries] of byFile) {
    const n = rewriteStamps(join(ROOT, page), entries);
    fixed += n;
    for (const e of entries) {
      console.log(`FIXED    ${page}\n           -> ${e.href}  ${e.stamp} -> ${e.actual}`);
    }
    // A stale entry the rewrite could not land on means the two passes disagree
    // about what they are looking at. Stop rather than report a repair that did
    // not happen.
    if (n !== entries.length) {
      console.error(`\nFAIL — ${page}: rewrote ${n} of ${entries.length} stale stamp(s).`);
      process.exit(1);
    }
  }

  console.log(`\n${fixed} stale stamp(s) updated in ${byFile.size} file(s).`);
  stale.length = 0;
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
      `\n\nFix all of them with:  npm run fix:cachebust` +
      `\nRecompute one with:    node scripts/check-cache-busters.mjs --digest <file>`
    );
  }

  console.error('');
  process.exit(1);
}

console.log(`\n${present} local asset reference(s) resolve, and all ${checked} stamped ` +
            `one(s) match the file they stamp.`);
