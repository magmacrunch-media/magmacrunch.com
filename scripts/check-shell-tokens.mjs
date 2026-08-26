#!/usr/bin/env node
/**
 * Assert every page that loads the ware shell defines the tokens the shell reads.
 *
 * `ware/shell/app-shell.css` reads --bg, --surface, --border, --text, --dim and
 * --accent across eighteen sites and defines none of them. That is deliberate —
 * the shell draws the chrome and each app picks the palette — but it means the
 * contract is enforced by nothing. A `var()` with no fallback and no definition
 * does not fall back to black or to inherit; the whole declaration is dropped.
 * An app that forgets --dim loses every dim-coloured label and the page still
 * renders, still deploys, and still looks plausible.
 *
 * This repo has already paid for the un-guarded version of exactly this shape.
 * scripts/sync-adenosine.mjs records that a published cards.css referenced six
 * custom properties it never defined, so cards rendered fully transparent for
 * everyone outside this repo — and "nothing here noticed, because the arcade
 * loaded its own copy and the published file had no consumer at all". The same
 * blindness applies here: the shell's only consumers are in this tree, so a
 * broken contract looks fine from inside it.
 *
 * The token list is derived from app-shell.css rather than hardcoded, so adding
 * a seventh token to the shell cannot silently skip the check.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHELL = join(ROOT, 'ware', 'shell', 'app-shell.css');

/** Every .html under a directory, skipping node_modules and dotfiles. */
function htmlFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.') || entry === 'node_modules') continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) htmlFiles(path, out);
    else if (entry.endsWith('.html')) out.push(path);
  }
  return out;
}

const definitionsIn = (css) => new Set(
  [...css.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map(m => m[1]));

/** Reads without a fallback — `var(--x)`, not `var(--x, #fff)`. */
const bareReadsIn = (css) => new Set(
  [...css.matchAll(/var\(\s*(--[\w-]+)\s*\)/g)].map(m => m[1]));

if (!existsSync(SHELL)) {
  console.error(`FAIL — ${SHELL} not found; nothing to derive the contract from.`);
  process.exit(1);
}

const shellCss = readFileSync(SHELL, 'utf8');
const shellDefines = definitionsIn(shellCss);
// What the shell needs from an app: read with no fallback, and not defined here.
const required = [...bareReadsIn(shellCss)].filter(t => !shellDefines.has(t)).sort();

if (!required.length) {
  console.error('FAIL — app-shell.css declares no unmet tokens; the check has nothing to assert.');
  process.exit(1);
}

console.log(`app-shell.css requires: ${required.join(', ')}\n`);

let checked = 0, failed = 0;

for (const page of htmlFiles(join(ROOT, 'ware'))) {
  const html = readFileSync(page, 'utf8');
  const hrefs = [...html.matchAll(/<link\b[^>]*?href=["']([^"']+)["']/g)].map(m => m[1]);
  const local = hrefs
    .filter(h => !/^(https?:)?\/\//.test(h) && /\.css(\?|$)/i.test(h))
    .map(h => h.split('?')[0]);

  if (!local.some(h => h.endsWith('shell/app-shell.css'))) continue;

  const rel = page.slice(ROOT.length + 1).replace(/\\/g, '/');
  checked++;

  // Union of every non-shell stylesheet the page loads: an app may split its
  // palette across files, and only the page knows which ones it actually gets.
  const defined = new Set();
  const missingFiles = [];
  for (const href of local) {
    if (href.includes('shell/')) continue;
    const path = join(dirname(page), href);
    if (!existsSync(path)) { missingFiles.push(href); continue; }
    for (const t of definitionsIn(readFileSync(path, 'utf8'))) defined.add(t);
  }

  const missing = required.filter(t => !defined.has(t));
  if (missingFiles.length) {
    console.error(`FAIL ${rel} — links stylesheet(s) that do not exist: ${missingFiles.join(', ')}`);
    failed++;
  } else if (missing.length) {
    console.error(`FAIL ${rel} — loads the shell but never defines: ${missing.join(', ')}`);
    failed++;
  } else {
    console.log(`ok   ${rel} — defines all ${required.length}`);
  }
}

if (checked === 0) {
  // A pass over nothing is not a pass; this is the failure mode check-api-docs
  // had on Windows, where every package hit the catch and the run still went green.
  console.error('\nFAIL — no page was found loading ware/shell/app-shell.css.');
  process.exit(1);
}

if (failed) {
  console.error(
    `\n${failed} page(s) load the shell without honouring its token contract.\n` +
    `Define the missing properties on :root in that app's own stylesheet, which\n` +
    `loads after the shell. An undefined var() drops the whole declaration.`
  );
  process.exit(1);
}

console.log(`\nAll ${checked} shell page(s) honour the token contract.`);
