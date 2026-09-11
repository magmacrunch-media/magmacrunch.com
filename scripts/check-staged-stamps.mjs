#!/usr/bin/env node
/**
 * Check the `?v=` stamps a commit records, in the tree it records.
 *
 * Run by .githooks/pre-commit:
 *   node scripts/check-staged-stamps.mjs            for `git commit -- <paths>`
 *   node scripts/check-staged-stamps.mjs --stage    for a whole-index commit
 *
 * ── Why this is not check-cache-busters.mjs ──
 *
 * That script reads the working tree. CI runs it on a fresh checkout, where the
 * working tree is the commit, so there it is exactly right. At commit time in a
 * shared checkout it is not: a commit records the index, and the working tree
 * also holds whatever every other session has in flight. The hook used to run
 * it with --fix, and each rule later added around that call patched one more
 * way the two differ. Three holes outlived all of them, and each let through a
 * commit that CI then failed:
 *
 *   - An asset committed on its own by pathspec, `git commit -- a.css`, which
 *     is how commits are supposed to be made here. The pages stamping it were
 *     repaired on disk, judged to be outside the commit, and left behind.
 *     4cd6e278, c32b819a and f4b1d678 changed arcade/arcade.css three times
 *     under one stamp. They were made in another clone, but the last two would
 *     have passed this hook too.
 *   - A page committed while another session had one of its assets in flight.
 *     The stamp was "repaired" to the digest of that uncommitted working copy,
 *     and staged.
 *   - A page loading a file that was never `git add`ed. It was on disk, so as
 *     far as the working tree was concerned it existed.
 *
 * ── The rule ──
 *
 * A commit answers for a reference when it records either end of it: the page
 * the reference is written in, or the file the reference names. For each of
 * those, in the tree the commit will record, the file must exist and a digest
 * stamp must be that file's digest. A reference with neither end in the commit
 * is somebody else's however wrong it is, and is neither reported nor touched.
 * The refusals 1772747 and 0a184c6b removed, and the stray writes into other
 * sessions' pages that 0a184c6b recorded as still unfixed, all fall out of that.
 *
 * "The tree the commit will record" is the index git points the hook at.
 * `git diff --cached`, `git ls-files` and `git cat-file` all honour
 * GIT_INDEX_FILE, including the temporary index a scoped commit builds.
 *
 * ── Repairs ──
 *
 * A stale stamp is repaired, with the digest of the file as the commit records
 * it, only in a page whose working copy matches the commit's copy, so that the
 * stamp is the only change the page picks up. A stylesheet is an asset as well
 * as a page, and repairing its url() stamps changes its own digest, so this
 * runs to a fixed point rather than making a single pass.
 *
 * Whether a repair can be staged depends on the kind of commit:
 *
 *   - A plain `git commit` (--stage). The hook runs against the real index,
 *     which is what gets committed, so `git add` simply works.
 *   - `git commit -- <paths>`. The hook runs against a temporary index. Git has
 *     already written those paths into the real index, and commits that one
 *     afterwards, untouched by anything the hook did. A page added to the
 *     temporary index reaches HEAD and not the real index, which is left
 *     holding the old page, staged: the stamp change in reverse, waiting for
 *     the next whole-index commit to record it. The old hook did exactly that.
 *     So the commit is refused with the repair on disk, and running it again
 *     with the page in the pathspec records it. The re-run finds nothing to do.
 *
 * Anything the rule cannot settle mechanically, such as a page that also has
 * uncommitted edits or a reference to a file the commit does not contain,
 * refuses the commit and writes nothing to disk.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  digestContent, HTML_REF_RE, CSS_REF_RE, isUnresolvable, isRemote, stampOf, isDigestStamp,
  resolveRef, rewriteStampsIn, rewriteStamps, isWalked, GENERATED,
} from './lib/cache-busters.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STAGE = process.argv.includes('--stage');

const git = (args, input) => execFileSync('git', args, {
  cwd: ROOT, input, maxBuffer: 1 << 30, stdio: ['pipe', 'pipe', 'inherit'],
});
const nulList = (buf) => buf.toString('utf8').split('\0').filter(Boolean);
const lf = (s) => s.replace(/\r\n/g, '\n');

// ── What the commit records ──

let base = 'HEAD';
try {
  git(['rev-parse', '--quiet', '--verify', 'HEAD']);
} catch {
  base = git(['hash-object', '-t', 'tree', '--stdin'], '').toString().trim();   // first commit
}

// Paths whose content the commit changes. --no-renames, so a moved asset shows
// up at its old path too: every page still loading it from there is broken.
const changed = new Set(nulList(git(['diff', '--cached', '--name-only', '--no-renames', '-z', base])));
if (changed.size === 0) process.exit(0);

const oidOf = new Map();   // path -> blob, for every file in the commit's tree
for (const entry of nulList(git(['ls-files', '--stage', '-z']))) {
  const tab = entry.indexOf('\t');
  const [mode, oid, stage] = entry.slice(0, tab).split(' ');
  if (stage === '0' && mode !== '160000') oidOf.set(entry.slice(tab + 1), oid);
}

/** Contents of index paths, through one `git cat-file --batch`. */
function readIndex(paths) {
  const oids = [...new Set(paths.map(p => oidOf.get(p)))];
  const out = git(['cat-file', '--batch'], oids.map(o => `${o}\n`).join(''));
  const byOid = new Map();
  let at = 0;
  for (const oid of oids) {
    const eol = out.indexOf(0x0a, at);
    const [, type, size] = out.toString('utf8', at, eol).split(' ');
    if (type !== 'blob') throw new Error(`git cat-file: ${oid} is ${type}, expected a blob`);
    at = eol + 1;
    byOid.set(oid, out.subarray(at, at + Number(size)));
    at += Number(size) + 1;
  }
  return new Map(paths.map(p => [p, byOid.get(oidOf.get(p))]));
}

// The same pages check-cache-busters.mjs walks, as the commit has them.
const pages = [...oidOf.keys()].filter(p => /\.(?:html|css)$/.test(p) && isWalked(p));
if (pages.length === 0) {
  // A pass over nothing is not a pass: an index with no pages in it means this
  // is reading the wrong index or the wrong repo, not that the commit is clean.
  console.error('check-staged-stamps: found no .html or .css in the index, so checked nothing.');
  process.exit(1);
}

const original = new Map();   // page -> text as the commit has it
for (const [page, buf] of readIndex(pages)) original.set(page, buf.toString('utf8'));
const text = new Map(original);   // the same, with repairs applied as they are decided
const blobs = new Map();          // non-page file -> content, read when first needed

const digestOf = (path) => text.has(path)
  ? digestContent(Buffer.from(text.get(path), 'utf8'))
  : digestContent(blobs.get(path));

/** Whether a page's working copy is the commit's copy, so a repair adds only the stamp. */
function isClean(page) {
  const file = join(ROOT, page);
  return existsSync(file) && lf(readFileSync(file, 'utf8')) === lf(original.get(page));
}

/** Every local reference in a page, resolved. */
function refsOf(page) {
  const isCss = page.endsWith('.css');
  const refs = [];
  for (const m of text.get(page).matchAll(isCss ? CSS_REF_RE : HTML_REF_RE)) {
    // HTML captures (href, query); CSS captures (quote, href, query).
    const [href, query] = isCss ? [m[2], m[3]] : [m[1], m[2]];
    if (isUnresolvable(href) || isRemote(href)) continue;
    const target = resolveRef(href, page);
    if (GENERATED.has(target)) continue;
    refs.push({ page, href, stamp: stampOf(query), target });
  }
  return refs;
}

// ── Settle every reference the commit answers for ──

const ours = new Set(pages.filter(p => changed.has(p)));   // pages the commit records
const moved = new Set(changed);                            // files whose content it changes
const repaired = new Map();   // page -> Map(href -> { from, to })
const held = new Map();       // page -> stale entries, in a page with other uncommitted edits
const missing = new Map();    // "page\0href" -> reference to a file the commit does not have

for (let round = 1; ; round++) {
  if (round > 20) {
    console.error('check-staged-stamps: stamps were still changing after 20 rounds of repair.\n' +
                  'Two stylesheets probably stamp each other, which no stamp can satisfy.');
    process.exit(1);
  }

  const answerable = pages.flatMap(refsOf).filter(r => ours.has(r.page) || moved.has(r.target));

  const unread = [...new Set(answerable.map(r => r.target))]
    .filter(t => oidOf.has(t) && !text.has(t) && !blobs.has(t));
  for (const [path, buf] of readIndex(unread)) blobs.set(path, buf);

  const stale = new Map();   // page -> [{ href, stamp, actual }]
  for (const r of answerable) {
    if (!oidOf.has(r.target)) {
      missing.set(`${r.page}\0${r.href}`, r);
      continue;
    }
    if (r.stamp === undefined || !isDigestStamp(r.stamp)) continue;
    const actual = digestOf(r.target);
    if (actual === r.stamp) continue;
    if (!stale.has(r.page)) stale.set(r.page, []);
    stale.get(r.page).push({ href: r.href, stamp: r.stamp, actual });
  }

  let progressed = false;
  for (const [page, entries] of stale) {
    if (!isClean(page)) {
      held.set(page, entries);
      continue;
    }
    text.set(page, rewriteStampsIn(text.get(page), page.endsWith('.css'), entries).text);
    if (!repaired.has(page)) repaired.set(page, new Map());
    for (const e of entries) {
      const seen = repaired.get(page).get(e.href);
      repaired.get(page).set(e.href, { from: seen?.from ?? e.stamp, to: e.actual });
    }
    // Recorded now, and changed: its own references are this commit's, and so
    // is every stamp elsewhere that names it.
    ours.add(page);
    moved.add(page);
    progressed = true;
  }
  if (!progressed) break;
}

// ── Report, repair, stage ──

const show = (label, page, lines) =>
  console.error(`${label.padEnd(9)}${page}\n${lines.map(l => `           -> ${l}`).join('\n')}`);

const fixedLines = (hrefs) => [...hrefs].map(([href, { from, to }]) => `${href}  ${from} -> ${to}`);

if (missing.size || held.size) {
  for (const r of missing.values()) show('MISSING', r.page, [`${r.href}  (${r.target} is not in this commit)`]);
  for (const [page, entries] of held) {
    show('STALE', page, entries.map(e => `${e.href}  ref=${e.stamp}  should be ${e.actual}`));
  }
  for (const [page, hrefs] of repaired) {
    show('STALE', page, [...hrefs].map(([href, { from, to }]) => `${href}  ref=${from}  should be ${to}`));
  }

  console.error('\npre-commit: refusing; nothing was changed on disk.');
  if (repaired.size) {
    const names = [...repaired.keys()];
    console.error(`\n  The hook can correct ${names.length > 3 ? `${names.length} of those pages` : names.join(', ')}\n` +
                  '  itself, and will once the rest below is settled.');
  }
  if (missing.size) {
    console.error(
      '\n  MISSING: the commit loads a file it does not contain, so every page load\n' +
      '  is a 404 once it deploys. `git add` the file, or remove the reference. A\n' +
      '  file a service generates belongs in GENERATED in scripts/lib/cache-busters.mjs.');
  }
  if (held.size) {
    console.error(
      '\n  These pages stamp a file this commit changes, but they also carry edits\n' +
      '  the commit does not record, so their stamps cannot be corrected without\n' +
      '  recording those edits too:\n' +
      [...held.keys()].map(p => `    ${p}`).join('\n') + '\n' +
      '  If the edits are yours, commit them with this. If they are another\n' +
      '  session\'s, wait for them, or leave the asset out of this commit.');
  }
  console.error('\n  `git commit --no-verify` skips this check and leaves CI to fail\n' +
                '  check:cachebust instead.\n');
  process.exit(1);
}

if (!repaired.size) process.exit(0);

for (const [page, hrefs] of repaired) {
  const file = join(ROOT, page);
  rewriteStamps(file, [...hrefs].map(([href, { to }]) => ({ href, actual: to })));
  // The disk must now say what was decided above. If it does not, the two
  // rewrites saw different text, and what would be staged is unknown.
  if (lf(readFileSync(file, 'utf8')) !== lf(text.get(page))) {
    console.error(`check-staged-stamps: ${page} did not come out as computed; not staging it.`);
    process.exit(1);
  }
}

if (STAGE) {
  git(['add', '--', ...repaired.keys()]);
  for (const [page, hrefs] of repaired) console.log(`FIXED    ${page}\n${fixedLines(hrefs).map(l => `           -> ${l}`).join('\n')}`);
  console.log('pre-commit: stamps corrected and staged.');
  process.exit(0);
}

for (const [page, hrefs] of repaired) show('FIXED', page, fixedLines(hrefs));
const extra = [...repaired.keys()].filter(p => !changed.has(p));
console.error(
  '\npre-commit: stamps corrected on disk, and nothing committed yet.\n' +
  '\n  A scoped commit cannot take a file the hook stages: git has already\n' +
  '  written your paths to the real index and commits that one afterwards, so\n' +
  '  the page would reach HEAD while the index kept the old one, staged.\n' +
  (extra.length
    ? '\n  Run the commit again with these added to the pathspec:\n' +
      extra.map(p => `    ${p}`).join('\n') + '\n'
    : '\n  Run the same commit again; the pages are already in its pathspec.\n'));
process.exit(1);
