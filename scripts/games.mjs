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
  // The one game whose browser version is NOT its web/ folder. web/ there is
  // the complete game, including the LEARN primer and the gate codex, and the
  // App Store build is what ships those: site/package.mjs derives the browser
  // version from web/ by dropping them, the way ios/package.mjs derives the
  // app. webBuild is the command that produces it and is only ever PRINTED
  // here, never run -- this repo copies directories, it does not build other
  // people's repos.
  'george-boole': {
    repo: 'george-boole',
    other: WII_PORT,
    webDir: 'site/www',
    webBuild: 'node site/package.mjs',
  },
  'moonlight-drift': { repo: 'moonlight-drift', other: WII_PORT },
  'jovian-humanitarian-conflict': {
    repo: 'jovian-humanitarian-conflict',
    other:
      "the game's terminal version, published to PyPI as\n" +
      'magmacrunch-jhc. Its rules are a transcription of these very files and\n' +
      'are checked against them by running them in a node vm, so a tuning\n' +
      'change here fails that repo' + "'" + 's Python suite until it is carried across.',
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
  // Extracted 2026-10-14 with its history. Unlike the others its folder holds
  // a SERVER as well as the client -- server.py, rule_engine.py, start.sh --
  // because the Pi's arcade-sorry.service runs from arcade/SORRY/, so the repo
  // keeps that shape and this sync delivers both halves.
  SORRY: {
    repo: 'sorry',
    other:
      'CI that runs the rule engine and server tests\n' +
      "against this repo's arcade/shared/. There is no second version yet; the\n" +
      'repo exists so the move onto adenosine has somewhere to happen.',
  },
  // Extracted 2026-10-14 the same way, server and all: arcade-cribbage.service
  // and arcade-stud.service run from these folders on the Pi.
  cribbage: {
    repo: 'cribbage',
    other:
      'CI that runs the scoring and server tests\n' +
      "against this repo's arcade/shared/. There is no second version yet.",
  },
  'scandinavian-stud': {
    repo: 'scandinavian-stud',
    other:
      'CI that runs the game logic tests against this\n' +
      "repo's arcade/shared/. There is no second version yet.",
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
 * becomes undeployable the moment anyone reorganizes.
 *
 * GAME_REPOS names a directory holding every checkout, which is what CI
 * has: the workflow checks each repo out under one path, and neither sibling
 * layout exists there.
 */
export function webCandidates(repo, root) {
  const base = mainCheckout(root);
  const roots = [];
  if (process.env.GAME_REPOS) roots.push(join(process.env.GAME_REPOS, repo));
  roots.push(join(base, '..', repo), join(base, '..', '..', 'games', repo));
  return roots.map((dir) => join(dir, webSubdir(repo)));
}

/** What a game calls the folder holding its browser build. `web` unless said. */
export function webSubdir(repo) {
  return entryFor(repo)?.webDir ?? 'web';
}

/**
 * The command that produces it, for games where it is derived rather than
 * committed. Printed in the two failure messages and nowhere else: a derived
 * directory is gitignored in its own repo, so a fresh checkout genuinely does
 * not have one and the honest answer is to say which command makes it.
 */
export function webBuild(repo) {
  return entryFor(repo)?.webBuild ?? null;
}

/** GAMES is keyed by arcade folder; the callers here have a repo name. */
function entryFor(repo) {
  return Object.values(GAMES).find((g) => g.repo === repo) ?? null;
}

/** The first of those that actually holds an index.html, or null. */
export function findGameWeb(repo, root) {
  return webCandidates(repo, root).find((dir) => existsSync(join(dir, 'index.html'))) ?? null;
}
