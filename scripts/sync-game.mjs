#!/usr/bin/env node
/**
 * Pull a multi-version game's browser build into arcade/ from its own repo.
 *
 * Games with more than one version (web + wii + ...) live in their own repo
 * beside this one, with the browser version under web/. The copy under
 * arcade/<game>/ is generated: this script replaces it wholesale with the
 * repo's web/ folder, so deletions propagate too. Edit the game repo, run
 * `make sync-<game>` here, commit the result.
 *
 * The GAMES allowlist is the reason this script can safely delete an arcade
 * folder: only folders known to be generated are eligible, so a typo cannot
 * remove a game that is still authored in this repo.
 */

import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Game folder name -> repo checkout expected beside this one.
 *
 * OTHER closes the generated banner by saying what else that repo holds. It used to be one
 * hardcoded sentence -- "also holds the game's Wii port, so a rules change can be made once
 * and carried to both versions" -- which is true of three of these and wrong twice over for
 * very-long-boards: its other version is a Godot desktop build, and the two are deliberately
 * NOT ports, so carrying a change across is the thing that repo tells you not to do. A
 * sentence true of most entries is the kind that goes stale silently, so it is per-game data.
 */
const WII_PORT =
  "the game's Wii port, so a rules change can be made once and carried to both\n" +
  "versions.";

const GAMES = {
  'george-boole': { repo: 'george-boole', other: WII_PORT },
  'moonlight-drift': { repo: 'moonlight-drift', other: WII_PORT },
  'very-long-boards': {
    repo: 'very-long-boards',
    other:
      'a separate Godot desktop version. Those two are deliberately not ports of each\n' +
      'other -- different scoring, different failure model -- so a change to this one is\n' +
      'usually not owed to that one.',
  },
  // Historical arcade folder name, kept because it is the live URL.
  'solitaire_THLD': { repo: 'texas-holdem-lava-dome', other: WII_PORT },
};

const game = process.argv[2];
if (!game || !GAMES[game]) {
  console.error(`Usage: node scripts/sync-game.mjs <game>`);
  console.error(`Known games: ${Object.keys(GAMES).join(', ')}`);
  process.exit(1);
}

const { repo, other } = GAMES[game];

// Where the game repo can be. Beside this one is the documented layout and what
// a fresh clone gets; a wider tree instead groups repos by kind, putting the
// games under games/ while this repo sits in web/ -- so both have to resolve, or
// the browser version becomes undeployable the moment anyone reorganises. An
// explicit GAME_SRC covers anywhere else, the way the Wii Makefile's MAGNOLIA=
// override does for the engine.
const candidates = process.env.GAME_SRC
  ? [join(process.env.GAME_SRC, 'web')]
  : [join(ROOT, '..', repo, 'web'), join(ROOT, '..', '..', 'games', repo, 'web')];

const src = candidates.find((dir) => existsSync(join(dir, 'index.html')));
const dest = join(ROOT, 'arcade', game);

// This guard stands in front of the rmSync below, so an unresolved source costs
// an error and never the deployed copy.
if (!src) {
  console.error(`No web version for ${repo}. Looked in:`);
  for (const dir of candidates) console.error(`  ${dir}`);
  console.error(`Is the ${repo} repo checked out? Set GAME_SRC=<path to it> to look elsewhere.`);
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });

// The banner is written here rather than kept in the game repo's web/ folder so
// that it cannot be missing: it is produced by the same step that makes the
// copy, so a folder that exists always carries the warning that it is a copy.
// Anyone who opens this directory is one file away from learning that editing
// it is pointless, which the game's own README cannot tell them -- from inside
// the mirror, the mirror looks like the source.
writeFileSync(
  join(dest, 'GENERATED.md'),
  `# Generated — do not edit here

Every file in \`arcade/${game}/\` is a copy. The source of truth is the
[\`${repo}\`](https://github.com/magmacrunch-media/${repo}) repository, in its
\`web/\` folder.

Edits made here are **silently destroyed** the next time anyone runs:

\`\`\`
make sync-${repo}
\`\`\`

which deletes this folder and recopies it. To change the browser game, edit that
repository's \`web/\` folder, run that target, and commit the result here. The
path is deliberately not spelled out: that repo resolves whether it is checked
out beside this one or grouped under \`games/\` in a wider tree.

That repository also holds ${other}
`,
);

console.log(`arcade/${game}/ regenerated from ${repo}/web/`);
