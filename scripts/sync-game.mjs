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

/** Game folder name -> repo checkout expected beside this one. */
const GAMES = {
  'george-boole': 'george-boole',
  'moonlight-drift': 'moonlight-drift',
  // Historical arcade folder name, kept because it is the live URL.
  'solitaire_THLD': 'texas-holdem-lava-dome',
};

const game = process.argv[2];
if (!game || !GAMES[game]) {
  console.error(`Usage: node scripts/sync-game.mjs <game>`);
  console.error(`Known games: ${Object.keys(GAMES).join(', ')}`);
  process.exit(1);
}

const src = join(ROOT, '..', GAMES[game], 'web');
const dest = join(ROOT, 'arcade', game);

if (!existsSync(join(src, 'index.html'))) {
  console.error(`No web version at ${src} — is the ${GAMES[game]} repo checked out beside this one?`);
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
const repo = GAMES[game];
writeFileSync(
  join(dest, 'GENERATED.md'),
  `# Generated — do not edit here

Every file in \`arcade/${game}/\` is a copy. The source of truth is the
[\`${repo}\`](https://github.com/magmacrunch-media/${repo}) repository, in its
\`web/\` folder, checked out beside this one.

Edits made here are **silently destroyed** the next time anyone runs:

\`\`\`
make sync-${repo}
\`\`\`

which deletes this folder and recopies it. To change the browser game, edit
\`../../../${repo}/web/\`, run that target, and commit the result here.

That repository also holds the game's Wii port, so a rules change can be made
once and carried to both versions.
`,
);

console.log(`arcade/${game}/ regenerated from ${repo}/web/`);
