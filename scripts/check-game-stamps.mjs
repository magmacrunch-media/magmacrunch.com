#!/usr/bin/env node
/**
 * Assert the `?v=` stamps in the *source* repos still match the files
 * they stamp.
 *
 * check-cache-busters.mjs already checks every page in this repo, and that
 * includes the generated arcade folders. It cannot catch this, because by the
 * time a stamp is wrong here it is wrong in a copy: `make sync-<game>` deletes
 * `arcade/<game>/` and recopies the game repo's `web/`, stamps and all. The
 * hook repairs the copy, the repair never travels upstream, and the next sync
 * puts the old value back — on a game nobody touched.
 *
 * ── Why this lives here and not in the game repos ──
 *
 * Half of what those pages stamp is not in those repos. `../shared/*` resolves
 * only once `web/` has been copied into `arcade/`, so a game repo cannot check
 * its own shared stamps without fetching this one.
 *
 * More to the point, the thing that breaks them happens *here*. A stamp goes
 * stale the moment this repo takes a new adenosine bundle, and a check that
 * lived in a game repo would not run then: nothing was pushed there. It would
 * fire whenever somebody next touched that game, which could be months, and
 * the whole failure mode is already "nobody noticed". Running here means the
 * commit that causes it is the commit that fails.
 *
 * Both halves were real on 2026-09-05. Seven stamps were stale across the four
 * repos, one of them since long enough that nothing recorded when; then taking
 * adenosine-chat 0.6.0 that same afternoon staled two more in three repos,
 * between one commit and the next, with none of those pages touched.
 *
 * ── What it resolves against ──
 *
 * A reference that stays inside the game repo's own `web/` is looked up
 * there, and one that climbs out of it here. That is not a fallback so
 * much as the definition: a game's own `css/` and `js/` are checked against the
 * repo that owns them, and `../shared/*`, which exists in neither the game repo
 * nor its `web/`, lands here. Both kinds go stale, and they go stale for
 * completely different reasons — an edit that forgot a bump, versus a release
 * in another repo.
 *
 * Which of the two a reference falls to is settled by where it lands, never
 * by what happens to be on disk beside the game repo. `inspect` records why
 * that distinction is worth stating, and what it cost before it was.
 */

import { readFileSync, existsSync, readdirSync, statSync, realpathSync } from 'node:fs';
import { join, dirname, resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GAMES, webCandidates, findGameWeb } from './games.mjs';
import {
  digest, HTML_REF_RE, CSS_REF_RE, isUnresolvable, isRemote, stampOf, isDigestStamp,
} from './lib/cache-busters.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Every file with one of `exts` under a directory. */
function filesUnder(dir, exts, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) filesUnder(path, exts, out);
    else if (exts.some((x) => entry.endsWith(x))) out.push(path);
  }
  return out;
}

const posix = (p) => p.split('\\').join('/');

/** `p` with the symlinks along it resolved, or `p` itself if that cannot be done. */
function realPath(p) {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

/**
 * Is `path` inside `web`, both as written and after symlinks are resolved?
 *
 * The lexical half is what sorts a `../shared/*` reference out of a `css/*`
 * one. The realpath half is the belt: a link INSIDE a game's web/ pointing
 * back at this repo would pass the lexical test and bring back exactly the
 * fault described at `inspect`. `realWeb` is resolved once per repo, so this
 * costs one syscall per reference.
 */
function containedIn(web, realWeb, path) {
  const lexical = relative(web, path);
  if (!lexical || lexical.startsWith('..') || isAbsolute(lexical)) return false;
  const real = relative(realWeb, realPath(path));
  return Boolean(real) && !real.startsWith('..') && !isAbsolute(real);
}

let checked = 0;
const stale = [];
const missing = [];
const summary = [];

// ── Does CI actually check every game repo out? ──
//
// GAMES is the list; .github/workflows/ci.yml has to carry a checkout step per
// entry, and nothing tied the two together. Three games in a row landed without
// one, and each turned main red with "no web/ found for <repo>" -- a message
// about the checkout that never ran, phrased as if the repo were the problem.
// That failure only appears in CI, so it is found after the push rather than
// before it.
//
// Both halves are read out of the workflow, so this holds on a dev box where no
// GAME_REPOS_* variable is set: a repo is covered if ci.yml checks it out, or if
// ci.yml itself declares it optional. The exemption stays where it is visible in
// a diff.
function ciCoverage() {
  const yml = join(ROOT, '.github', 'workflows', 'ci.yml');
  if (!existsSync(yml)) return null;
  const text = readFileSync(yml, 'utf8');

  const out = new Set();
  for (const [, repo] of text.matchAll(/^\s*path:\s*game-repos\/(\S+)\s*$/gm)) out.add(repo);

  const declared = new Set();
  const opt = text.match(/^\s*GAME_REPOS_OPTIONAL:\s*(.+)$/m);
  if (opt) for (const r of opt[1].split(',')) { const t = r.trim(); if (t) declared.add(t); }

  if (!out.size) return null; // the job was restructured; do not guess at it
  return { out, declared };
}

const ci = ciCoverage();
if (ci) {
  const uncovered = Object.values(GAMES)
    .map((g) => g.repo)
    .filter((repo) => !ci.out.has(repo) && !ci.declared.has(repo));
  if (uncovered.length) {
    console.error(`FAIL — .github/workflows/ci.yml never checks out: ${uncovered.join(', ')}.`);
    console.error('\nEvery repo in scripts/games.mjs needs a checkout step in the');
    console.error("game-stamps job, or a place in that job's GAME_REPOS_OPTIONAL.");
    console.error('Without one the job fails in CI saying it found no web/, which');
    console.error('reads as a broken repo rather than a missing step. Add:\n');
    for (const repo of uncovered) {
      console.error(`      - name: Check out ${repo}`);
      console.error('        uses: actions/checkout@v7');
      console.error('        with:');
      console.error(`          repository: magmacrunch-media/${repo}`);
      console.error(`          path: game-repos/${repo}\n`);
    }
    process.exit(1);
  }
}

// Locating the repos is its own pass, because "none of them are here" and "one
// of them is missing" want opposite answers.
//
// A clone with no game repos beside it — a fresh one, or the Mac — should not
// fail `npm run check` over tooling it was never given. But a run that resolved
// all but one of them must fail loudly: a check that quietly drops a repo reproduces
// the exact bug it exists to catch, which is a stamp nobody is looking at.
//
// GAME_REPOS is how CI states the repos are meant to be there, so with it set
// there is no skip at all, and a broken checkout step fails rather than passing
// over nothing.
const located = Object.entries(GAMES).map(([folder, { repo }]) => ({
  folder, repo, web: findGameWeb(repo, ROOT),
}));
const found = located.filter((g) => g.web);

if (!found.length && !process.env.GAME_REPOS) {
  console.log('No game repo checkout found beside this one, so there is nothing to');
  console.log('check. CI checks them out and sets GAME_REPOS, where a missing');
  console.log(`repo is fatal instead. Looked for: ${located.map((g) => g.repo).join(', ')}.`);
  process.exit(0);
}

// GAME_REPOS_OPTIONAL names repos this run cannot be expected to have, and it
// is not a preference: very-long-boards and pay2play are private repos, and a
// workflow's GITHUB_TOKEN reaches only the repo it runs in, so CI cannot check
// them out. Making that a soft skip would be the silent gap this whole check
// exists to close — so instead it has to be *written down*, in the workflow,
// where it shows in the diff, and it is printed on every run.
//
// A repo named here that is nonetheless present is checked normally, which is
// what happens on the dev box: every repo is on disk there, so `npm run check`
// covers what CI cannot.
const optional = new Set(
  (process.env.GAME_REPOS_OPTIONAL ?? '').split(',').map((s) => s.trim()).filter(Boolean));

const known = new Set(Object.values(GAMES).map((g) => g.repo));
const unknown = [...optional].filter((repo) => !known.has(repo));
if (unknown.length) {
  console.error(`FAIL — GAME_REPOS_OPTIONAL names ${unknown.join(', ')}, which is not a game ` +
                `repo.\nKnown: ${[...known].join(', ')}.`);
  process.exit(1);
}

const absent = located.filter((g) => !g.web);
const required = absent.filter((g) => !optional.has(g.repo));
const declared = absent.filter((g) => optional.has(g.repo));

if (required.length) {
  for (const g of required) {
    console.error(`FAIL — no web/ found for ${g.repo}. Looked in:`);
    for (const dir of webCandidates(g.repo, ROOT)) console.error(`  ${posix(dir)}`);
  }
  console.error(`\n${found.length} of ${located.length} game repos resolved. Dropping the rest ` +
                `would leave this\ncheck passing over a repo nobody is watching, which is the ` +
                `failure it exists\nto catch — so it fails instead. Set GAME_REPOS=<dir holding ` +
                `the checkouts>\nif they live somewhere else, or name a repo in ` +
                `GAME_REPOS_OPTIONAL if it\ngenuinely cannot be fetched here.`);
  process.exit(1);
}

for (const { folder, repo, web } of found) {
  const arcade = join(ROOT, 'arcade', folder);
  const realWeb = realPath(web);
  let seen = 0;

  /** Resolve one reference, and record what is wrong with it. */
  const inspect = (href, query, source) => {
    if (isUnresolvable(href) || isRemote(href)) return;

    // Inside the game repo's own web/ it is the game repo's file; anything
    // outside web/ is this repo's. `../shared/*` leaves web/, so it lands in
    // arcade/<folder>/.
    //
    // What decides it is where the reference LANDS, not whether a file
    // happens to be there. The test used to be `existsSync(inRepo)` alone,
    // and on a dev box that quietly answered a different question:
    // seventeen of the game repos keep a gitignored `shared` symlink into the
    // MAIN checkout's arcade/shared/, so `../shared/*` resolved through it and
    // was compared against the main checkout's bundles instead of the ones in
    // the tree being checked. Run from a worktree, which is where half the
    // work here happens, that compares against bytes the commit under test
    // never touched, and it comes back clean. On 2026-10-16 it reported 13
    // stale where CI, cloning the repos fresh and so having no symlink,
    // correctly reported 44 -- short by a factor of three, in the reassuring
    // direction, on the one check whose whole job is to notice a new bundle
    // staling somebody else's stamps.
    //
    // CI is unaffected either way, which is the point of fixing it here:
    // nothing in any game repo lives outside its web/ and is referenced from
    // inside it, so in a fresh clone the old rule and this one pick
    // arcade/<folder>/ for every one of them. Should such a file ever be
    // added, resolving it here is still the right answer -- `make sync-<repo>`
    // copies web/ and nothing above it, so a reference climbing out of web/ is
    // broken on the live site, and MISSING is the honest report.
    const inRepo = resolve(dirname(source), href);
    const fromRepo = existsSync(inRepo) && containedIn(web, realWeb, inRepo);
    const target = fromRepo
      ? inRepo
      : resolve(arcade, dirname(relative(web, source)), href);
    const owner = fromRepo ? repo : 'magmacrunch.com';

    if (!existsSync(target)) {
      missing.push(`${repo}/web/${posix(relative(web, source))} -> ${href}`);
      return;
    }

    const stamp = stampOf(query);
    if (stamp === undefined || !isDigestStamp(stamp)) return;

    checked++;
    seen++;
    const actual = digest(target);
    if (actual !== stamp) {
      stale.push({
        repo,
        page: posix(relative(web, source)),
        href,
        stamp,
        actual,
        owner,
      });
    }
  };

  for (const page of filesUnder(web, ['.html'])) {
    const html = readFileSync(page, 'utf8');
    for (const [, href, query] of html.matchAll(HTML_REF_RE)) inspect(href, query, page);
  }
  for (const sheet of filesUnder(web, ['.css'])) {
    const css = readFileSync(sheet, 'utf8');
    for (const [, , href, query] of css.matchAll(CSS_REF_RE)) inspect(href, query, sheet);
  }

  summary.push(`  ${repo.padEnd(24)} ${String(seen).padStart(3)} stamped reference(s)`);
}

// A pass over nothing is not a pass. check-cache-busters.mjs and
// check-shell-tokens.mjs both guard this way, having watched a sibling check go
// green on Windows by matching nothing.
if (checked === 0) {
  console.error('FAIL — no verifiable ?v= reference was found in any game repo.\n' +
                'The pattern matched nothing, which means it is wrong, not that\n' +
                'the repos are clean.');
  process.exit(1);
}

for (const m of missing) console.error(`MISSING  ${m}`);
for (const s of stale) {
  console.error(`STALE    ${s.repo}/web/${s.page}\n` +
                `           -> ${s.href}  ref=${s.stamp}  actual=${s.actual}  (file owned by ${s.owner})`);
}

if (missing.length || stale.length) {
  console.error(`\n${checked} stamped reference(s) compared across ${Object.keys(GAMES).length} ` +
                `repo(s): ${missing.length} missing, ${stale.length} stale.`);

  if (stale.length) {
    const fromHere = stale.filter((s) => s.owner === 'magmacrunch.com');
    console.error(
      `\nFix these in the game repo, not here. A stamp corrected in arcade/ is\n` +
      `reverted by the next \`make sync-<repo>\`, which recopies web/ verbatim.\n\n` +
      stale.map((s) => `  ${s.repo}/web/${s.page}: ${s.href}?v=${s.actual}`).join('\n'));

    if (fromHere.length) {
      const [verb, them] = fromHere.length === 1 ? ['stamps', 'it'] : ['stamp', 'them'];
      console.error(
        `\n${fromHere.length} of them ${verb} a file in this repo, so this commit is what\n` +
        `staled ${them} — most likely a new adenosine bundle under arcade/shared/.\n` +
        `Those repos need a commit of their own; nothing here can fix them.`);
    }
  }

  console.error('');
  process.exit(1);
}

console.log(summary.join('\n'));
for (const g of declared) {
  console.log(`  ${g.repo.padEnd(24)} not checked out here — declared in GAME_REPOS_OPTIONAL`);
}
console.log(`\n${checked} stamped reference(s) across ${found.length} game repo(s) ` +
            `match the files they stamp.`);
if (declared.length) {
  console.log(`${declared.length} repo(s) were skipped by declaration and are NOT covered by ` +
              `this run.`);
}
