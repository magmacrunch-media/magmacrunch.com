#!/usr/bin/env node

/**
 * migrate-jsonbin.mjs
 * Fetches all high scores from JSONBin and saves them as local JSON files
 * in arcade/admin/scores/{game}.json
 *
 * Run once before switching games to the new ScoreClient backend.
 * Usage: node scripts/migrate-jsonbin.mjs
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORES_DIR = join(__dirname, '..', 'admin', 'scores');

const JSONBIN_API = 'https://api.jsonbin.io/v3/b';

const GAMES = [
  {
    id: '2n',
    name: '2^N',
    binId: '6993768643b1c97be9842566',
    apiKey: '$2a$10$JiB3vjivV/azBnUh7jKjbuiiU7T9UnaOKTC0C9WnTR5WfLhnGSS.W',
    headerKey: 'X-Access-Key',
    responsePath: (data) => data.record, // raw array
  },
  {
    id: 'george-boole',
    name: 'George Boole',
    binId: '69500bfb43b1c97be9088543',
    apiKey: '$2a$10$JiB3vjivV/azBnUh7jKjbuiiU7T9UnaOKTC0C9WnTR5WfLhnGSS.W',
    headerKey: 'X-Access-Key',
    responsePath: (data) => data.record,
  },
  {
    id: 'moonlight-drift',
    name: 'Moonlight Drift',
    binId: '694f6062ae596e708fb34dbb',
    apiKey: '$2a$10$JiB3vjivV/azBnUh7jKjbuiiU7T9UnaOKTC0C9WnTR5WfLhnGSS.W',
    headerKey: 'X-Access-Key',
    responsePath: (data) => data.record,
  },
  {
    id: 'solitaire',
    name: 'Solitaire',
    binId: '6954997843b1c97be90f995a',
    apiKey: '$2a$10$JiB3vjivV/azBnUh7jKjbuiiU7T9UnaOKTC0C9WnTR5WfLhnGSS.W',
    headerKey: 'X-Access-Key',
    responsePath: (data) => data.record,
  },
  {
    id: 'solitaire-thld',
    name: 'Solitaire (Threshold)',
    binId: '6995078143b1c97be9872947',
    apiKey: '$2a$10$JiB3vjivV/azBnUh7jKjbuiiU7T9UnaOKTC0C9WnTR5WfLhnGSS.W',
    headerKey: 'X-Access-Key',
    responsePath: (data) => data.record,
  },
  {
    id: 'tetris',
    name: 'Tetris',
    binId: '69ba0cf1c3097a1dd5354835',
    apiKey: '$2a$10$M7cd1hhCen4LGmIgKtK3X.6gD1qwjBSaTHadpdnPpGzfBU11otauO',
    headerKey: 'X-Master-Key',
    responsePath: (data) => data.record,
  },
  {
    id: 'scandinavian-stud',
    name: 'Scandinavian Stud',
    binId: '6a2c54f7f5f4af5e29e840a7',
    apiKey: '$2a$10$JiB3vjivV/azBnUh7jKjbuiiU7T9UnaOKTC0C9WnTR5WfLhnGSS.W',
    headerKey: 'X-Access-Key',
    responsePath: (data) => data.record?.scores || data.record || [],
  },
];

async function fetchScores(game) {
  const url = `${JSONBIN_API}/${game.binId}/latest`;
  console.log(`  Fetching ${game.name} (${game.binId})...`);

  const res = await fetch(url, {
    headers: { [game.headerKey]: game.apiKey },
  });

  if (!res.ok) {
    console.log(`  ✗ ${game.name}: HTTP ${res.status} ${res.statusText}`);
    return null;
  }

  const json = await res.json();
  const scores = game.responsePath(json);

  if (!Array.isArray(scores)) {
    console.log(`  ✗ ${game.name}: unexpected data shape`, typeof scores);
    return null;
  }

  console.log(`  ✓ ${game.name}: ${scores.length} scores`);
  return scores;
}

async function main() {
  console.log('JSONBin → Local Migration\n');
  console.log(`Output: ${SCORES_DIR}\n`);

  await mkdir(SCORES_DIR, { recursive: true });

  const results = [];

  for (const game of GAMES) {
    try {
      const scores = await fetchScores(game);
      if (scores !== null) {
        const out = {
          game: game.name,
          gameId: game.id,
          migratedFrom: `jsonbin:${game.binId}`,
          migratedAt: new Date().toISOString(),
          scores,
        };
        const path = join(SCORES_DIR, `${game.id}.json`);
        await writeFile(path, JSON.stringify(out, null, 2));
        results.push({ game: game.name, status: 'ok', count: scores.length });
      } else {
        results.push({ game: game.name, status: 'failed', count: 0 });
      }
    } catch (err) {
      console.log(`  ✗ ${game.name}: ${err.message}`);
      results.push({ game: game.name, status: 'error', count: 0 });
    }

    // JSONBin rate limit: ~1 req/sec
    await new Promise((r) => setTimeout(r, 1200));
  }

  console.log('\n--- Migration Summary ---');
  for (const r of results) {
    const icon = r.status === 'ok' ? '✓' : '✗';
    console.log(`  ${icon} ${r.game}: ${r.count} scores (${r.status})`);
  }

  const ok = results.filter((r) => r.status === 'ok').length;
  console.log(`\n${ok}/${results.length} games migrated successfully.`);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
