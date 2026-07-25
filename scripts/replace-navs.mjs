#!/usr/bin/env node
/* ═══════════════════════════════════════════════
   replace-navs.mjs
   Replaces inline <nav> blocks with <nav id="auto-nav" data-depth="...">
   based on each file's directory depth relative to site root.
   ═══════════════════════════════════════════════ */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, relative as relPath, dirname, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function walk(dir, acc = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (entry === 'node_modules' || entry === '.git') continue;
        if (statSync(full).isDirectory()) {
            walk(full, acc);
        } else if (entry.endsWith('.html')) {
            acc.push(full);
        }
    }
    return acc;
}

const htmlFiles = walk(ROOT);
let updated = 0;
let skipped = 0;
let errors = 0;

for (const filePath of htmlFiles) {
    let content;
    try {
        content = readFileSync(filePath, 'utf8');
    } catch (e) {
        console.error(`ERROR reading ${filePath}: ${e.message}`);
        errors++;
        continue;
    }

    // Skip files without a <nav> tag
    if (!content.includes('<nav')) {
        skipped++;
        continue;
    }

    // Skip files with tool-nav or mc-back (non-standard nav)
    if (content.includes('class="tool-nav"') || content.includes('class="mc-back"')) {
        skipped++;
        continue;
    }

    // Skip admin pages
    if (filePath.includes('/admin/')) {
        skipped++;
        continue;
    }

    // Skip drafts
    if (filePath.includes('/drafts/')) {
        skipped++;
        continue;
    }

    // Match the <nav>...</nav> block
    const navMatch = content.match(/<nav\b[^>]*>[\s\S]*?<\/nav>/);
    if (!navMatch) {
        skipped++;
        continue;
    }

    const navBlock = navMatch[0];

    // Skip if already has auto-nav
    if (navBlock.includes('id="auto-nav"')) {
        skipped++;
        continue;
    }

    // Calculate depth: number of directory levels from file to site root
    const fileDir = dirname(filePath);
    const rel = relPath(fileDir, ROOT);

    // Count separators to determine depth
    const depthLevels = (rel === '.' || rel === '') ? 0 : rel.split(sep).length;
    const depth = depthLevels === 0 ? './' : '../'.repeat(depthLevels);

    // Build replacement nav
    const replacement = `<nav id="auto-nav" data-depth="${depth}"></nav>`;

    // Replace the nav block
    const newContent = content.replace(navBlock, replacement);

    try {
        writeFileSync(filePath, newContent, 'utf8');
        const shortPath = relPath(filePath, ROOT);
        console.log(`UPDATED: ${shortPath} (depth="${depth}")`);
        updated++;
    } catch (e) {
        console.error(`ERROR writing ${filePath}: ${e.message}`);
        errors++;
    }
}

console.log(`\nDone: ${updated} updated, ${skipped} skipped, ${errors} errors`);
