#!/usr/bin/env node
/**
 * Repin ware/adenosine/ to the published adenosine packages.
 *
 * The adenosine tools do not embed the engines — unlike the magmascript and
 * texastoast playgrounds, they load each package from jsDelivr at runtime, off
 * a version written into the source by hand. playground.js keeps a table of
 * seven, theme.js four, tiles.js one inline.
 *
 * So a release bumps nothing here, and the site keeps serving the previous
 * build to every visitor — with no error, because the old version is still on
 * the CDN and still works. A playground demonstrating behaviour the installed
 * package no longer has is worse than none, which is the same reason the other
 * two sync scripts exist.
 *
 * Run by .github/workflows/sync-adenosine-playground.yml, dispatched by the
 * adenosine release workflow and backstopped weekly. Run it by hand any time:
 *
 *     node scripts/sync-adenosine-pins.mjs
 *
 * With no arguments it asks npm what is latest. The release dispatch passes the
 * versions it just published via ADENOSINE_VERSIONS instead, so a stale
 * registry edge fails loudly rather than pinning the site to the release
 * before. Either way every version is confirmed to resolve on npm before
 * anything is written — repinning to a version jsDelivr will 404 for would
 * break the tools for everyone rather than leave them merely out of date.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WARE = join(ROOT, 'ware', 'adenosine');

const PACKAGES = ['rpg', 'puzzle', 'cards', 'audio', 'score-client', 'multiplayer', 'chat'];

/**
 * Where the pins live, and how each file spells one. Every pin in ware/ is
 * exact — the site should not change what it runs on a page reload.
 *
 * `pattern` takes the package name and returns a regex with the version as its
 * one capture group, so the replace can rewrite just that group.
 */
const TARGETS = [
  {
    file: 'playground.js',
    packages: PACKAGES,
    // rpg:  { global: "AdRPG", version: "0.2.3", css: [] }
    pattern: (pkg) => new RegExp(`("?${pkg}"?\\s*:\\s*\\{[^}]*?\\bversion:\\s*")(\\d+\\.\\d+\\.\\d+)(")`),
  },
  {
    file: 'theme.js',
    packages: ['cards', 'puzzle', 'chat', 'multiplayer'],
    // cards: { version: '0.7.4', global: 'AdCards', css: [...] }
    pattern: (pkg) => new RegExp(`("?${pkg}"?\\s*:\\s*\\{[^}]*?\\bversion:\\s*')(\\d+\\.\\d+\\.\\d+)(')`),
  },
  {
    file: 'tiles.js',
    packages: ['rpg'],
    // https://cdn.jsdelivr.net/npm/@magmacrunch/adenosine-rpg@0.2.3/dist/...
    pattern: (pkg) => new RegExp(`(@magmacrunch/adenosine-${pkg}@)(\\d+\\.\\d+\\.\\d+)()`),
  },
];

/** npm's current `latest` for one package. */
async function latest(pkg) {
  const res = await fetch(`https://registry.npmjs.org/@magmacrunch%2Fadenosine-${pkg}`);
  if (!res.ok) throw new Error(`registry returned ${res.status} for adenosine-${pkg}`);
  return (await res.json())['dist-tags'].latest;
}

/** Whether npm can actually serve this exact version. */
async function resolves(pkg, version) {
  const res = await fetch(`https://registry.npmjs.org/@magmacrunch%2Fadenosine-${pkg}/${version}`);
  return res.ok;
}

// ── Decide what to pin to ────────────────────────────────────────────────────

const targets = {};

if (process.env.ADENOSINE_VERSIONS) {
  let given;
  try {
    given = JSON.parse(process.env.ADENOSINE_VERSIONS);
  } catch {
    console.error('ADENOSINE_VERSIONS is not valid JSON.');
    process.exit(1);
  }
  // A partial map would repin some tools and leave others behind, which is a
  // worse state than the one this script exists to fix.
  const absent = PACKAGES.filter((pkg) => !given?.[pkg]);
  if (absent.length) {
    console.error(`ADENOSINE_VERSIONS is missing: ${absent.join(', ')}`);
    console.error('Expected a version for all seven packages. Not repinning some of them.');
    process.exit(1);
  }
  for (const pkg of PACKAGES) targets[pkg] = given[pkg];
  console.log('Pinning to the dispatched release.');
} else {
  for (const pkg of PACKAGES) targets[pkg] = await latest(pkg);
  console.log('Pinning to npm latest.');
}

const unresolvable = [];
for (const [pkg, version] of Object.entries(targets)) {
  if (!(await resolves(pkg, version))) unresolvable.push(`adenosine-${pkg}@${version}`);
}
if (unresolvable.length) {
  console.error(`\nnpm cannot serve: ${unresolvable.join(', ')}`);
  console.error('Not repinning the site to a version its visitors would get a 404 for.');
  process.exit(1);
}

// ── Rewrite ──────────────────────────────────────────────────────────────────

let rewritten = 0;
let unchanged = 0;
const problems = [];

for (const { file, packages, pattern } of TARGETS) {
  const path = join(WARE, file);
  const before = readFileSync(path, 'utf8');
  let after = before;

  for (const pkg of packages) {
    const re = pattern(pkg);
    const match = after.match(re);
    if (!match) {
      // Silence here would read as "already up to date". It means the file
      // moved and this script did not follow.
      problems.push(`${file}: no ${pkg} pin found — the pattern is stale`);
      continue;
    }
    const found = match[2];
    const want = targets[pkg];
    if (found === want) {
      unchanged++;
      continue;
    }
    after = after.replace(re, `$1${want}$3`);
    console.log(`  ${file}  ${pkg}  ${found} -> ${want}`);
    rewritten++;
  }

  if (after !== before) writeFileSync(path, after);
}

if (problems.length) {
  console.error(`\n${problems.join('\n')}`);
  console.error('Fix the patterns in this script; the site is not fully repinned.');
  process.exit(1);
}

console.log(
  rewritten
    ? `\n${rewritten} pin(s) updated, ${unchanged} already current.`
    : `\nAll ${unchanged} pin(s) already current.`,
);
