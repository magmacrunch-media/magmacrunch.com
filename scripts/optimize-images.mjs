#!/usr/bin/env node
/**
 * optimize-images.mjs — Resize and compress images
 *
 * Usage:
 *   node scripts/optimize-images.mjs                    # optimize all flyers + photos
 *   node scripts/optimize-images.mjs --dry-run          # preview without changes
 *   node scripts/optimize-images.mjs --dir assets/flyers # target specific folder
 */

import { readdir, stat, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const dirIdx = args.indexOf('--dir');
const TARGET_DIR = dirIdx >= 0 ? args[dirIdx + 1] : 'assets/flyers';

const MAX_WIDTH = 1200;
const MAX_SIZE_KB = 800;
const QUALITY = 82;

const EXTS = new Set(['.png', '.jpg', '.jpeg']);
const skipDirs = new Set(['node_modules', '.git', 'archive/_cache']);

async function walk(dir) {
    const results = [];
    for (const entry of await readdir(dir)) {
        if (skipDirs.has(entry)) continue;
        const full = join(dir, entry);
        const s = await stat(full);
        if (s.isDirectory()) {
            results.push(...await walk(full));
        } else if (EXTS.has(extname(entry).toLowerCase())) {
            results.push({ path: full, size: s.size });
        }
    }
    return results;
}

async function main() {
    // Dynamic import so script doesn't fail if sharp isn't installed
    let sharp;
    try {
        sharp = (await import('sharp')).default;
    } catch {
        console.error('sharp not installed. Run: npm install --save-dev sharp');
        process.exit(1);
    }

    const dir = join(ROOT, TARGET_DIR);
    console.log(`Scanning ${TARGET_DIR}/...`);

    const files = await walk(dir);
    const large = files.filter(f => f.size > MAX_SIZE_KB * 1024);

    if (large.length === 0) {
        console.log('No large images found.');
        return;
    }

    console.log(`Found ${large.length} images over ${MAX_SIZE_KB}KB:\n`);

    let totalSaved = 0;
    for (const file of large) {
        const rel = file.path.replace(ROOT + '/', '');
        const beforeKB = Math.round(file.size / 1024);

        if (DRY_RUN) {
            console.log(`  ${rel} (${beforeKB}KB)`);
            continue;
        }

        try {
            const meta = await sharp(file.path).metadata();
            const needsResize = meta.width > MAX_WIDTH;

            let pipeline = sharp(file.path);
            if (needsResize) {
                pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
            }

            // Output as PNG (preserve format) with compression
            const buf = await pipeline.png({ quality: QUALITY, compressionLevel: 9 }).toBuffer();

            if (buf.length < file.size) {
                await writeFile(file.path, buf);
                const afterKB = Math.round(buf.length / 1024);
                const saved = beforeKB - afterKB;
                totalSaved += saved;
                console.log(`  ✓ ${rel}: ${beforeKB}KB → ${afterKB}KB (saved ${saved}KB)`);
            } else {
                console.log(`  - ${rel}: already optimized (${beforeKB}KB)`);
            }
        } catch (e) {
            console.log(`  ✗ ${rel}: ${e.message}`);
        }
    }

    if (!DRY_RUN && totalSaved > 0) {
        console.log(`\nTotal saved: ${Math.round(totalSaved / 1024 * 10) / 10}MB`);
    }
}

main().catch(console.error);
