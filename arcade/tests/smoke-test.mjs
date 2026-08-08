import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');

const GAMES = [
  { name: '2^N', path: '2^N' },
  { name: 'aggravation', path: 'aggravation', multiplayer: true },
  { name: 'backgammon', path: 'backgammon', multiplayer: true },
  { name: 'checkers', path: 'checkers', multiplayer: true },
  { name: 'chess', path: 'chess', multiplayer: true },
  { name: 'chinese-checkers', path: 'chinese-checkers', multiplayer: true },
  { name: 'cribbage', path: 'cribbage', multiplayer: true },
  { name: 'fifteen-puzzle', path: 'fifteen-puzzle' },
  { name: 'george-boole', path: 'george-boole' },
  { name: 'klotski', path: 'klotski' },
  { name: 'moonlight-drift', path: 'moonlight-drift' },
  { name: 'parchisi', path: 'parchisi', multiplayer: true },
  { name: 'roderick-tron', path: 'roderick-tron' },
  { name: 'scandinavian-stud', path: 'scandinavian-stud', multiplayer: true },
  { name: 'solitaire', path: 'solitaire' },
  { name: 'solitaire_THLD', path: 'solitaire_THLD' },
  { name: 'SORRY', path: 'SORRY', multiplayer: true },
  { name: 'tarot', path: 'tarot' },
  { name: 'tetris', path: 'tetris' },
  { name: 'threes', path: 'threes' },
  { name: 'very-long-boards', path: 'very-long-boards' },
];

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const TIMEOUT = 15000;
const IS_LOCAL = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');

async function testGame(page, game) {
  const url = `${BASE_URL}/arcade/${game.path}/`;
  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      if (IS_LOCAL && text.includes('WebSocket')) return;
      errors.push(text);
    }
    if (msg.type() === 'warning') warnings.push(text);
  });

  page.on('pageerror', err => {
    errors.push(err.message);
  });

  const startTime = Date.now();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: TIMEOUT });
    await page.waitForTimeout(1000);
    const loadTime = Date.now() - startTime;

    const hasCanvas = await page.locator('canvas').count() > 0;
    const hasGameBoard = await page.locator('.game-board, .board, .game-container, #game-container, .start-screen, .menu').count() > 0;
    const hasNav = await page.locator('nav').count() > 0;

    return {
      name: game.name,
      path: game.path,
      url,
      status: errors.length === 0 ? 'pass' : 'fail',
      loadTime,
      errors,
      warnings,
      elements: { hasCanvas, hasGameBoard, hasNav },
    };
  } catch (err) {
    return {
      name: game.name,
      path: game.path,
      url,
      status: 'fail',
      loadTime: Date.now() - startTime,
      errors: [err.message],
      warnings,
      elements: { hasCanvas: false, hasGameBoard: false, hasNav: false },
    };
  }
}

async function saveScreenshot(page, game) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  const screenshotPath = join(SCREENSHOTS_DIR, `${game.path}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  return screenshotPath;
}

function formatMarkdown(results) {
  const now = new Date().toISOString().split('T')[0];
  const passed = results.filter(r => r.status === 'pass');
  const failed = results.filter(r => r.status === 'fail');

  let md = `# Arcade Smoke Test — ${now}\n\n`;

  if (failed.length === 0) {
    md += `All ${passed.length} games passed.\n\n`;
  } else {
    md += `**${failed.length} game(s) failed** out of ${results.length} tested.\n\n`;
  }

  md += `| Game | Status | Load Time | Errors |\n`;
  md += `|------|--------|-----------|--------|\n`;

  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : '❌';
    const time = `${r.loadTime}ms`;
    const errs = r.errors.length > 0 ? r.errors[0].slice(0, 80) : '—';
    md += `| ${r.name} | ${icon} ${r.status} | ${time} | ${errs} |\n`;
  }

  if (failed.length > 0) {
    md += `\n## Failures\n\n`;
    for (const r of failed) {
      md += `### ${r.name}\n\n`;
      md += `**URL:** ${r.url}\n\n`;
      md += `**Errors:**\n`;
      for (const e of r.errors) {
        md += `- ${e}\n`;
      }
      if (r.warnings.length > 0) {
        md += `\n**Warnings:**\n`;
        for (const w of r.warnings) {
          md += `- ${w}\n`;
        }
      }
      md += `\n`;
    }
  }

  return md;
}

async function main() {
  console.log(`Testing ${GAMES.length} games against ${BASE_URL}...\n`);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const results = [];

  for (const game of GAMES) {
    const page = await context.newPage();
    process.stdout.write(`  ${game.name}...`);

    const result = await testGame(page, game);

    if (result.status === 'fail') {
      const screenshotPath = await saveScreenshot(page, game);
      result.screenshot = screenshotPath;
      console.log(` FAIL (screenshot saved)`);
    } else {
      console.log(` pass (${result.loadTime}ms)`);
    }

    results.push(result);
    await page.close();
  }

  await browser.close();

  const markdown = formatMarkdown(results);
  const outputPath = join(__dirname, 'results.md');
  writeFileSync(outputPath, markdown);
  console.log(`\nResults written to ${outputPath}`);

  const failed = results.filter(r => r.status === 'fail');
  if (failed.length > 0) {
    console.log(`\n${failed.length} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\nAll ${results.length} tests passed.`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
