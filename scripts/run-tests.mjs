#!/usr/bin/env node
/**
 * run-tests.mjs — find and run the arcade's test suites.
 *
 * Usage:  node scripts/run-tests.mjs py
 *         node scripts/run-tests.mjs js
 *
 * This exists because the one-line shell versions in package.json did not run
 * at all on Windows. npm hands scripts to cmd.exe unless `script-shell` is set,
 * and both were POSIX sh:
 *
 *   test:py  ->  'while' is not recognized as an internal or external command
 *   test:js  ->  find: missing argument to `-exec'
 *
 * `npm test` is `lint && test:js`, so it reported success while running no tests
 * whatsoever — the worst possible failure mode for a test command, and the
 * reason this is a Node script rather than a fixed one-liner.
 *
 * The Makefile and .github/workflows/ci.yml used to carry their own copies of
 * the same loop. The Makefile now calls this; CI still has its own because it
 * annotates failures per suite, but it runs on Linux where the shell version
 * works.
 */

import { spawnSync } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ARCADE = join(ROOT, 'arcade');

const SKIP_DIRS = new Set(['node_modules', '__pycache__', 'venv', '.git']);

/** Every file under `dir` whose basename matches `pred`. */
function walk(dir, pred, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') || SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, pred, out);
    else if (pred(entry.name)) out.push(full);
  }
  return out;
}

/**
 * A Python that actually runs.
 *
 * `python3` on Windows is usually the Microsoft Store stub in WindowsApps/,
 * which is on PATH, is not Python, and opens the Store when invoked. The
 * Makefile called it directly and got nowhere. So candidates are probed by
 * running something trivial rather than trusted for existing.
 */
function findPython() {
  const candidates = [];
  // An explicit choice wins, then an activated virtualenv. Without these the
  // only way to test against a venv would be to activate it in the shell npm
  // happens to spawn, which on Windows is not the shell you are typing in.
  if (process.env.PYTHON) candidates.push([process.env.PYTHON, []]);
  if (process.env.VIRTUAL_ENV) {
    candidates.push([join(process.env.VIRTUAL_ENV, 'Scripts', 'python.exe'), []]);
    candidates.push([join(process.env.VIRTUAL_ENV, 'bin', 'python'), []]);
  }
  candidates.push(['py', ['-3']], ['python3', []], ['python', []]);
  for (const [cmd, pre] of candidates) {
    const probe = spawnSync(cmd, [...pre, '-c', 'import sys; print(sys.version_info[0])'], {
      encoding: 'utf8',
      shell: false,
    });
    if (probe.status === 0 && probe.stdout.trim() === '3') return [cmd, pre];
  }
  return null;
}

function runPython() {
  const found = findPython();
  if (!found) {
    console.error('No working Python 3 found. Tried $PYTHON, $VIRTUAL_ENV, py -3, python3, python.');
    console.error('On Windows, `python3` on PATH is often the Microsoft Store stub, not Python.');
    return 1;
  }
  const [cmd, pre] = found;

  const hasPytest = spawnSync(cmd, [...pre, '-c', 'import pytest'], { shell: false });
  if (hasPytest.status !== 0) {
    console.error(`pytest is not installed for ${cmd} ${pre.join(' ')}`.trim());
    console.error('Install it with:  pip install -r requirements.txt');
    console.error('Or point at a venv:  PYTHON=/path/to/venv/bin/python npm run test:py');
    return 1;
  }

  const dirs = [...new Set(
    walk(ARCADE, (name) => name.startsWith('test_') && name.endsWith('.py')).map(dirname)
  )].sort();

  if (dirs.length === 0) {
    console.error('No test_*.py files found under arcade/.');
    return 1;
  }

  let failures = 0;
  for (const dir of dirs) {
    console.log(`=== ${relative(ROOT, dir)} ===`);
    const res = spawnSync(cmd, [...pre, '-m', 'pytest', '-v', '--tb=short'], {
      cwd: dir,
      stdio: 'inherit',
      shell: false,
    });
    if (res.status !== 0) failures++;
  }
  if (failures > 0) console.error(`\n${failures} Python suite(s) failed`);
  return failures > 0 ? 1 : 0;
}

function runJs() {
  const files = walk(ARCADE, (name) => name.startsWith('test-') && name.endsWith('.js'))
    .filter((f) => f.split(/[\\/]/).includes('tests'))
    .sort();

  if (files.length === 0) {
    console.error('No tests/test-*.js files found under arcade/.');
    return 1;
  }

  let failures = 0;
  for (const file of files) {
    console.log(`=== ${relative(ROOT, file)} ===`);
    const res = spawnSync(process.execPath, [file], { stdio: 'inherit', shell: false });
    if (res.status !== 0) failures++;
  }
  if (failures > 0) console.error(`\n${failures} JS suite(s) failed`);
  return failures > 0 ? 1 : 0;
}

const mode = process.argv[2];
if (mode === 'py') process.exit(runPython());
else if (mode === 'js') process.exit(runJs());
else {
  console.error('Usage: node scripts/run-tests.mjs <py|js>');
  process.exit(2);
}
