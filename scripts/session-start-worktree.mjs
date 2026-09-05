#!/usr/bin/env node
/**
 * session-start-worktree.mjs — tell a session it is in the shared checkout.
 *
 * Wired to the SessionStart hook (see .claude/settings.json). Prints nothing
 * from a linked worktree; silence there is the point.
 *
 * ── Why ──
 *
 * scripts/worktree.mjs made isolation available and AGENTS.md documented it,
 * and neither made it the default. On the afternoon it was written, the session
 * that wrote it went on to run `npm install` in the primary tree anyway, and a
 * concurrent session's `git commit` swallowed the resulting package.json bump
 * into a commit whose message described something else entirely.
 *
 * The pre-commit gate does not catch that case: it only fires when
 * `git worktree list` shows more than one checkout, so three sessions all
 * sitting in the primary tree — the exact situation — trips nothing. This runs
 * before any of that, at the only moment when switching is still free.
 *
 * ── Why it addresses the model, not just the human ──
 *
 * The output goes back as `additionalContext`, so it lands in the session's
 * context rather than only on screen. The agent is the one that forgets; a
 * banner it never reads would repeat the original failure exactly.
 *
 * Advisory by design. It cannot chdir the session, and blocking startup over a
 * heuristic would be worse than the problem.
 */

import { execFileSync } from 'node:child_process';

/** git, or null if this is not a repo / git is missing. Never throws. */
function git(args) {
    try {
        return execFileSync('git', args, {
            encoding: 'utf8',
            stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
    } catch {
        return null;
    }
}

const gitDir = git(['rev-parse', '--git-dir']);
if (gitDir === null) process.exit(0);                 // not a repo; nothing to say

// In a linked worktree these differ. That is the state we want, so say nothing.
if (gitDir !== git(['rev-parse', '--git-common-dir'])) process.exit(0);

const worktrees = (git(['worktree', 'list']) || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || 'HEAD';
const dirty = (git(['status', '--porcelain']) || '').split('\n').filter(Boolean).length;
const staged = (git(['diff', '--cached', '--name-only']) || '').split('\n').filter(Boolean).length;

const lines = [];
lines.push(`You are in the PRIMARY worktree of this repo, on ${branch}.`);
lines.push('');
lines.push('Before substantive work — anything that edits files, stages, commits, or');
lines.push('runs `npm install` — take your own checkout:');
lines.push('');
lines.push('    npm run worktree -- new <branch>');
lines.push('');
lines.push('The primary tree shares its index, branch and node_modules with every');
lines.push('other session in it. A bare `git commit` here records whatever is staged,');
lines.push('whoever staged it, and `npm install` rewrites package.json under them.');

if (staged > 0) {
    lines.push('');
    lines.push(`WARNING: ${staged} file(s) are ALREADY STAGED in this shared index, and`);
    lines.push('they may not be yours. Check `git diff --cached --name-only` before you');
    lines.push('stage or commit anything, and prefer `git commit -- <paths>`.');
}

if (worktrees.length > 1) {
    lines.push('');
    lines.push(`${worktrees.length} checkouts are registered, so other sessions are likely live:`);
    for (const w of worktrees) lines.push(`    ${w}`);
} else if (dirty > 0) {
    lines.push('');
    lines.push(`${dirty} file(s) are modified here with no other worktree registered —`);
    lines.push('consistent with another session working in this same directory.');
}

const context = lines.join('\n');

process.stdout.write(JSON.stringify({
    systemMessage: staged > 0
        ? `Primary worktree, and ${staged} file(s) are already staged by someone else. Consider: npm run worktree -- new <branch>`
        : 'Primary worktree — for substantive work run: npm run worktree -- new <branch>',
    hookSpecificOutput: {
        hookEventName: 'SessionStart',
        additionalContext: context,
    },
}));
