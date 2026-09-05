#!/usr/bin/env node
/**
 * worktree.mjs — give each parallel session its own checkout.
 *
 * ── Why ──
 *
 * Two agents working in the same clone share more than the files: they share
 * the index, the branch, and the push. That is not a theoretical hazard. In one
 * afternoon it produced, in order: a `git add` that picked up another session's
 * staged work, a pre-commit hook that refused every commit because *someone
 * else's* page had an unstaged `?v=` stamp, a near-miss where one session's
 * staged files were about to be swept into the other's commit, and a `git push`
 * rejected because the other session had pushed the same branch seconds
 * earlier — carrying the first session's commit out with it.
 *
 * A worktree fixes all four at once. Each has its own index, its own HEAD and
 * its own branch, backed by the one object store, so commits are independent
 * and nothing is shared until a push.
 *
 * ── Why a script rather than "just run git worktree add" ──
 *
 * `git worktree add` gives you a checkout that cannot run the tests. Everything
 * `npm` needs is gitignored, so a fresh worktree has no `node_modules` — `npm
 * test` dies on a missing eslint before it reaches a single suite, and
 * `arcade/tests/` has no Playwright. Installing per worktree costs 92MB and a
 * few minutes each time, which is enough friction that people stop bothering
 * and go back to sharing one clone.
 *
 * So the shared, gitignored, machine-local directories are linked in from the
 * primary tree instead: a directory junction on Windows (no admin needed, which
 * a *file* symlink would require) and an ordinary symlink elsewhere.
 *
 * ── Removal is safe ──
 *
 * Verified on this machine rather than assumed, because deleting a tree that
 * contains a link to 73MB of shared files is exactly where a bad tool eats the
 * target. `git worktree remove`, PowerShell's `Remove-Item -Recurse -Force` and
 * Git Bash's `rm -rf` all unlink the junction and leave its contents alone.
 * `git worktree remove` does, however, leave the junction directory itself
 * behind, so it reports success while the path still exists and the next `new`
 * on that path fails as "already exists". So `remove` below calls git FIRST and
 * only unlinks once git has agreed to go — unlinking first would strip a
 * worktree of its tooling for a removal that git then refuses.
 *
 * Usage:
 *   node scripts/worktree.mjs new <branch> [path]   create one and provision it
 *   node scripts/worktree.mjs link <path>           provision an existing one
 *   node scripts/worktree.mjs list                  show every worktree
 *   node scripts/worktree.mjs remove <path>         remove it and its links
 *
 * Or via npm:  npm run worktree -- new roderick-audio
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, lstatSync, symlinkSync, unlinkSync, rmdirSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Gitignored, machine-local and identical in every checkout, so they are linked
 * rather than reinstalled. Anything with per-branch content must NOT go here.
 */
const SHARED = [
    'node_modules',
    join('arcade', 'tests', 'node_modules'),
];

/**
 * Gitignored files a worktree will not have and this script will not copy:
 * they are secrets, and spreading more copies of them across the disk to save
 * a manual step is a bad trade. Reported, not resolved.
 */
const SECRETS = [
    join('arcade', 'private', 'config.json'),
    join('arcade', 'admin', 'config.json'),
    join('arcade', 'admin', 'api-keys.json'),
    join('arcade', 'admin', 'github-token.json'),
    join('mcp-server', '.env'),
];

const IS_WINDOWS = process.platform === 'win32';

function git(args, opts = {}) {
    const r = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8', ...opts });
    if (r.error) throw r.error;
    return r;
}

function gitOrDie(args, opts) {
    const r = git(args, opts);
    if (r.status !== 0) {
        process.stderr.write((r.stderr || r.stdout || '').trim() + '\n');
        process.exit(r.status || 1);
    }
    return r;
}

/** True for a symlink or a Windows junction — both report as symbolic links. */
function isLink(path) {
    try { return lstatSync(path).isSymbolicLink(); } catch { return false; }
}

/** Remove a link without following it. rmdir unlinks a junction; unlink does not. */
function removeLink(path) {
    try { unlinkSync(path); return true; } catch { /* junctions need rmdir */ }
    try { rmdirSync(path); return true; } catch { return false; }
}

function provision(worktreePath) {
    const linked = [], skipped = [];

    for (const rel of SHARED) {
        const target = join(ROOT, rel);
        const link = join(worktreePath, rel);

        if (!existsSync(target)) {
            skipped.push(`${rel} — not present in the primary tree either`);
            continue;
        }
        if (existsSync(link) || isLink(link)) {
            skipped.push(`${rel} — already there`);
            continue;
        }

        mkdirSync(dirname(link), { recursive: true });
        // 'junction' is the Windows form that needs no elevation. Everywhere
        // else a directory symlink does the same job.
        symlinkSync(target, link, IS_WINDOWS ? 'junction' : 'dir');
        linked.push(rel);
    }

    return { linked, skipped };
}

function reportProvision(worktreePath, { linked, skipped }) {
    for (const rel of linked) console.log(`  linked   ${rel}`);
    for (const note of skipped) console.log(`  skipped  ${note}`);

    const missingSecrets = SECRETS.filter((rel) => existsSync(join(ROOT, rel)));
    if (missingSecrets.length) {
        console.log('\n  These gitignored config files exist in the primary tree and were');
        console.log('  NOT copied — they hold secrets. Copy them by hand if this worktree');
        console.log('  needs the admin dashboard or a chat server:');
        for (const rel of missingSecrets) console.log(`    ${rel}`);
    }

    console.log(`\n  cd ${worktreePath}`);
    console.log('  npm test        # works now; without the link above it cannot find eslint');
}

// ── Commands ──────────────────────────────────────────────────────────────────

function cmdNew(branch, explicitPath) {
    if (!branch) die('usage: worktree.mjs new <branch> [path]');

    // Default alongside the repo rather than inside it: a worktree under the
    // repo would be walked by every recursive scan of it, and this project has
    // already been bitten by directories that appear twice in a tree walk.
    const path = explicitPath
        ? resolve(explicitPath)
        : resolve(ROOT, '..', '.worktrees', branch.replace(/[/\\]/g, '-'));

    if (existsSync(path)) die(`${path} already exists`);

    const exists = git(['rev-parse', '--verify', '--quiet', `refs/heads/${branch}`]).status === 0;
    const args = exists
        ? ['worktree', 'add', path, branch]
        : ['worktree', 'add', '-b', branch, path];

    console.log(`Creating worktree for ${exists ? 'existing' : 'new'} branch "${branch}"...`);
    gitOrDie(args, { stdio: ['ignore', 'ignore', 'pipe'] });
    console.log(`  ${path}\n`);

    reportProvision(path, provision(path));
}

function cmdLink(path) {
    if (!path) die('usage: worktree.mjs link <path>');
    const full = resolve(path);
    if (!existsSync(full)) die(`${full} does not exist`);
    if (!listWorktrees().some((w) => resolve(w.path) === full)) {
        die(`${full} is not a registered worktree of this repo — see: worktree.mjs list`);
    }
    console.log(`Provisioning ${full}...`);
    reportProvision(full, provision(full));
}

function listWorktrees() {
    const out = gitOrDie(['worktree', 'list', '--porcelain']).stdout;
    const trees = [];
    let cur = null;
    for (const line of out.split('\n')) {
        if (line.startsWith('worktree ')) {
            cur = { path: line.slice(9).trim(), branch: null };
            trees.push(cur);
        } else if (line.startsWith('branch ') && cur) {
            cur.branch = line.slice(7).trim().replace('refs/heads/', '');
        } else if (line.startsWith('detached') && cur) {
            cur.branch = '(detached)';
        }
    }
    return trees;
}

function cmdList() {
    const trees = listWorktrees();
    const width = Math.max(...trees.map((w) => w.path.length));
    for (const w of trees) {
        const provisioned = SHARED.every(
            (rel) => !existsSync(join(ROOT, rel)) || existsSync(join(w.path, rel))
        );
        const flag = resolve(w.path) === ROOT ? 'primary'
            : provisioned ? 'provisioned'
            : 'NOT provisioned — run: worktree.mjs link';
        console.log(`${w.path.padEnd(width)}  ${(w.branch || '?').padEnd(24)}  ${flag}`);
    }
}

function cmdRemove(path) {
    if (!path) die('usage: worktree.mjs remove <path>');
    const full = resolve(path);
    if (resolve(full) === ROOT) die('refusing to remove the primary worktree');

    // git goes FIRST. It refuses a worktree with uncommitted work, and if the
    // links were dropped before that refusal the worktree would be left intact
    // but unprovisioned — `npm test` broken in a tree the user still wants,
    // for a removal that did not happen. The shared directories are gitignored,
    // so their presence does not make git think the tree is dirty.
    const r = git(['worktree', 'remove', full]);
    if (r.status !== 0) {
        process.stderr.write((r.stderr || '').trim() + '\n');
        process.stderr.write('\nNothing was changed. Uncommitted work is the usual cause —\n');
        process.stderr.write('commit it, or discard the worktree with:\n');
        process.stderr.write(`  git worktree remove --force ${full}\n`);
        process.stderr.write(`  node scripts/worktree.mjs remove ${full}   # to clear the leftover links\n`);
        process.exit(r.status || 1);
    }

    // git unlinks nothing and deletes nothing through a link, so the shared
    // directories survive — but the junctions themselves are left behind, and
    // with them the worktree path, which then collides with the next `new`.
    for (const rel of SHARED) {
        const link = join(full, rel);
        if (isLink(link) && removeLink(link)) console.log(`  unlinked ${rel}`);
    }
    pruneEmptyDirs(full);

    console.log(`  removed ${full}`);
    console.log('\nThe branch is still there. Delete it when merged:');
    console.log('  git branch -d <branch>');
}

/** Drop the directory skeleton git left behind around the links it would not touch. */
function pruneEmptyDirs(root) {
    if (!existsSync(root)) return;
    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory() && !isLink(join(dir, entry.name))) walk(join(dir, entry.name));
        }
        try { rmdirSync(dir); } catch { /* not empty — something real is in it */ }
    };
    walk(root);
    if (existsSync(root)) {
        console.log(`  note: ${root} still holds files git did not manage; left in place`);
    }
}

function die(msg) {
    process.stderr.write(msg + '\n');
    process.exit(1);
}

// ── Entry ─────────────────────────────────────────────────────────────────────

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
    case 'new':    cmdNew(rest[0], rest[1]); break;
    case 'link':   cmdLink(rest[0]); break;
    case 'list':   cmdList(); break;
    case 'remove': cmdRemove(rest[0]); break;
    default:
        console.log(`Give each parallel session its own checkout.

  node scripts/worktree.mjs new <branch> [path]   create one and provision it
  node scripts/worktree.mjs link <path>           provision an existing one
  node scripts/worktree.mjs list                  show every worktree
  node scripts/worktree.mjs remove <path>         remove it and its links

Worktrees default to ../.worktrees/<branch>, beside the repo rather than
inside it. Each has its own index, HEAD and branch, so two sessions cannot
stage into each other's commits or block each other's pre-commit hook.`);
        process.exit(cmd ? 1 : 0);
}
