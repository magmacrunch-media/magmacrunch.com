/**
 * The arcade folders that are generated from another repo, and where to find
 * that repo.
 *
 * Extracted from sync-game.mjs so check-game-stamps.mjs works from the same
 * list. This is an allowlist with teeth: it is what lets sync-game.mjs delete
 * an arcade folder before recopying it, so only folders known to be generated
 * are eligible and a typo cannot remove a game that is still authored here.
 * A second, drifting copy of it in the checker would mean a game silently
 * dropping out of the check — the failure being checked for is already silent,
 * and that would make the check silent too.
 *
 * OTHER closes the generated banner by saying what else that repo holds. It used to be one
 * hardcoded sentence -- "also holds the game's Wii port, so a rules change can be made once
 * and carried to both versions" -- which is true of three of these and wrong twice over for
 * very-long-boards: its other version is a Godot desktop build, and the two are deliberately
 * NOT ports, so carrying a change across is the thing that repo tells you not to do. A
 * sentence true of most entries is the kind that goes stale silently, so it is per-game data.
 *
 * The strings are wrapped as continuations, not from column 0: the template
 * line in sync-game.mjs already reads `That repository also holds ${other}`,
 * which is 27 characters before `other` begins.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const WII_PORT =
  "the game's Wii port, so a rules change can be made\n" +
  "once and carried to both versions.";

export const GAMES = {
  'george-boole': { repo: 'george-boole', other: WII_PORT },
  'moonlight-drift': { repo: 'moonlight-drift', other: WII_PORT },
  'jovian-humanitarian-conflict': {
    repo: 'jovian-humanitarian-conflict',
    other:
      "the game's simulation tests and its own AGENTS.md.\n" +
      'There is no second version yet -- a terminal one is planned -- so unlike\n' +
      'the other entries here, this sync is the only thing crossing repos today.',
  },
  'makemecookies': {
    repo: 'makemecookies',
    other:
      "the rules' headless test suite, which the game\n" +
      'is arranged around -- js/stations.js touches no DOM so the real shipped\n' +
      'modules can be loaded and run without a browser. There is no second\n' +
      'version yet; the repo exists so that one would have somewhere to go.',
  },
  'roderick-tron': {
    repo: 'roderick-tron',
    other:
      'nothing else yet. The browser build is the only\n' +
      'version so far, and the repo exists ahead of the others so that when one\n' +
      'arrives it has somewhere to live rather than being bolted on afterwards.',
  },
  'very-long-boards': {
    repo: 'very-long-boards',
    other:
      'a separate Godot desktop version. Those two are\n' +
      'deliberately not ports of each other -- different scoring, different failure\n' +
      'model -- so a change to this one is usually not owed to that one.',
  },
  pay2play: {
    repo: 'pay2play',
    other:
      'the reel timing spike its difficulty is set from,\n' +
      "and its own AGENTS.md. There is no second version yet -- a terminal one is\n" +
      'planned -- so as with jovian-humanitarian-conflict, this sync is currently\n' +
      'the only thing crossing repos.',
  },
  // Historical arcade folder name, kept because it is the live URL.
  'solitaire_THLD': { repo: 'texas-holdem-lava-dome', other: WII_PORT },
};

/**
 * The main checkout this tree belongs to, which is `root` itself unless `root`
 * is a linked worktree.
 *
 * A worktree's `.git` is a file reading `gitdir: <main>/.git/worktrees/<name>`,
 * so the main checkout is the part before `/.git/`. This matters because every
 * sibling path below is relative to where the repo actually sits, and the
 * worktrees live somewhere else entirely -- `web/.worktrees/<branch>` for the
 * ones `npm run worktree` makes, and `.claude/worktrees/<name>`, inside the
 * repo, for the ones Claude Code makes. Resolving from the worktree finds
 * neither the games nor anything else, and AGENTS.md tells every second session
 * to work from one, so this is the normal case rather than the exotic one.
 */
function mainCheckout(root) {
  const dotgit = join(root, '.git');
  try {
    if (!statSync(dotgit).isFile()) return root;
    const gitdir = readFileSync(dotgit, 'utf8').trim().replace(/^gitdir:\s*/, '');
    const at = gitdir.replace(/\\/g, '/').indexOf('/.git/');
    return at === -1 ? root : resolve(gitdir.slice(0, at));
  } catch {
    return root;
  }
}

/**
 * Where a game repo's web/ can be, best first.
 *
 * Beside this repo is the documented layout and what a fresh clone gets; a
 * wider tree instead groups repos by kind, putting the games under games/ while
 * this repo sits in web/ -- so both have to resolve, or the browser version
 * becomes undeployable the moment anyone reorganises.
 *
 * GAME_REPOS names a directory holding all four checkouts, which is what CI
 * has: the workflow checks each repo out under one path, and neither sibling
 * layout exists there.
 */
export function webCandidates(repo, root) {
  const base = mainCheckout(root);
  const roots = [];
  if (process.env.GAME_REPOS) roots.push(join(process.env.GAME_REPOS, repo));
  roots.push(join(base, '..', repo), join(base, '..', '..', 'games', repo));
  return roots.map((dir) => join(dir, 'web'));
}

/** The first of those that actually holds an index.html, or null. */
export function findGameWeb(repo, root) {
  return webCandidates(repo, root).find((dir) => existsSync(join(dir, 'index.html'))) ?? null;
}
