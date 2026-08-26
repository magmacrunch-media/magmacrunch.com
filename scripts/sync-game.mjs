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

import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Game folder name -> repo checkout expected beside this one. */
const GAMES = {
  'george-boole': 'george-boole',
  'moonlight-drift': 'moonlight-drift',
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
console.log(`arcade/${game}/ regenerated from ${GAMES[game]}/web/`);
