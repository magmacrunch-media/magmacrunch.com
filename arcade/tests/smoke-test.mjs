import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(__dirname, 'screenshots');

/**
 * `lobby` describes how to reach a game's multiplayer lobby, and is what makes
 * the lobby check run. It replaces a `multiplayer: true` flag that was declared
 * on nine games and never read by anything — so a chess build whose MULTIPLAYER
 * button did nothing at all still passed this suite, because the page loaded and
 * logged no errors. See checkLobby().
 *
 *   open        selector for the control that opens the lobby
 *   overlay     the overlay expected to become visible (default '#lobbyOverlay')
 *   needsServer the lobby is revealed by a socket message rather than by the
 *               click itself, so a static file server can never open it. These
 *               are reported as skipped; covering them means running their
 *               server.py alongside the tests.
 */
const GAMES = [
  { name: '2^N', path: '2^N' },
  { name: 'aggravation', path: 'aggravation', lobby: { open: '#joinBtn', needsServer: true } },
  { name: 'backgammon', path: 'backgammon', lobby: { open: '#onlineBtn' } },
  { name: 'checkers', path: 'checkers', lobby: { open: '#onlineBtn' } },
  { name: 'chess', path: 'chess', lobby: { open: '#multiplayerBtn' } },
  { name: 'chinese-checkers', path: 'chinese-checkers', lobby: { open: '#onlineBtn' } },
  { name: 'cribbage', path: 'cribbage', lobby: { open: '#multiplayerBtn' } },
  { name: 'fifteen-puzzle', path: 'fifteen-puzzle' },
  { name: 'george-boole', path: 'george-boole' },
  { name: 'klotski', path: 'klotski' },
  { name: 'moonlight-drift', path: 'moonlight-drift' },
  { name: 'parchisi', path: 'parchisi', lobby: { open: '#joinBtn', needsServer: true } },
  { name: 'roderick-tron', path: 'roderick-tron' },
  { name: 'scandinavian-stud', path: 'scandinavian-stud', lobby: { open: '#multiplayerBtn' } },
  { name: 'solitaire', path: 'solitaire' },
  { name: 'solitaire_THLD', path: 'solitaire_THLD' },
  { name: 'SORRY', path: 'SORRY', lobby: { open: '#join-btn', overlay: '#lobby-overlay', needsServer: true } },
  { name: 'tarot', path: 'tarot' },
  { name: 'tetris', path: 'tetris' },
  { name: 'threes', path: 'threes' },
  { name: 'very-long-boards', path: 'very-long-boards' },
];

/** Games whose lobby this suite can actually open without a game server. */
const runnableLobby = (g) => Boolean(g.lobby) && !g.lobby.needsServer;

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const TIMEOUT = 15000;
const IS_LOCAL = BASE_URL.includes('localhost') || BASE_URL.includes('127.0.0.1');

const LOBBY_ONLY = process.argv.includes('--lobby-only') || process.env.LOBBY_ONLY === '1';

/**
 * Overlays animate in over 0.2s. getComputedStyle sampled inside that window
 * returns the interpolated value rather than the cascaded one, which is exactly
 * what produced a phantom "opacity is 0" diagnosis once already. Wait it out.
 */
const TRANSITION_SETTLE_MS = 400;

/**
 * Click a game's multiplayer button and confirm the lobby really becomes
 * visible. Returns an array of error strings (empty when the lobby opened).
 *
 * Deliberately not Playwright's toBeVisible(): that ignores opacity, so an
 * overlay sitting at opacity 0 with display:flex counts as visible and the
 * check would pass on a lobby no player can see.
 *
 * Asserts only that the lobby opens, not that it connects — every one of these
 * games opens the overlay first and dials the server afterwards, so this stays
 * green without a multiplayer server running.
 */
async function checkLobby(page, game) {
  const selector = game.lobby.overlay || '#lobbyOverlay';

  const trigger = page.locator(game.lobby.open).first();
  if (await trigger.count() === 0) {
    return [`lobby: trigger ${game.lobby.open} not found on the page`];
  }

  try {
    await trigger.click({ timeout: 5000 });
  } catch (err) {
    return [`lobby: could not click ${game.lobby.open}: ${err.message}`];
  }

  await page.waitForTimeout(TRANSITION_SETTLE_MS);

  const state = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return {
      opacity: cs.opacity,
      visibility: cs.visibility,
      display: cs.display,
      width: box.width,
      height: box.height,
    };
  }, selector);

  if (!state) return [`lobby: overlay ${selector} not found in the DOM`];

  const problems = [];
  if (state.display === 'none') problems.push('display is none');
  if (state.visibility !== 'visible') problems.push(`visibility is ${state.visibility}`);
  if (state.opacity !== '1') problems.push(`opacity is ${state.opacity}`);
  if (state.width === 0 || state.height === 0) {
    problems.push(`box is ${state.width}x${state.height}`);
  }

  if (problems.length === 0) return [];
  return [
    `lobby: clicked ${game.lobby.open} but ${selector} did not become visible ` +
      `(${problems.join(', ')})`,
  ];
}

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

    let lobbyChecked = false;
    if (runnableLobby(game)) {
      errors.push(...await checkLobby(page, game));
      lobbyChecked = true;
    }

    return {
      name: game.name,
      path: game.path,
      url,
      status: errors.length === 0 ? 'pass' : 'fail',
      loadTime,
      errors,
      warnings,
      lobbyChecked,
      lobbySkipped: Boolean(game.lobby) && game.lobby.needsServer,
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

  md += `| Game | Status | Lobby | Load Time | Errors |\n`;
  md += `|------|--------|-------|-----------|--------|\n`;

  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : '❌';
    const time = `${r.loadTime}ms`;
    const errs = r.errors.length > 0 ? r.errors[0].slice(0, 80) : '—';
    let lobby = '—';
    if (r.lobbyChecked) lobby = 'checked';
    else if (r.lobbySkipped) lobby = 'skipped (needs server)';
    md += `| ${r.name} | ${icon} ${r.status} | ${lobby} | ${time} | ${errs} |\n`;
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
  const games = LOBBY_ONLY ? GAMES.filter(runnableLobby) : GAMES;

  if (LOBBY_ONLY) {
    console.log(`Testing ${games.length} multiplayer lobbies against ${BASE_URL}...\n`);
  } else {
    console.log(`Testing ${games.length} games against ${BASE_URL}...\n`);
    const skipped = GAMES.filter((g) => g.lobby && g.lobby.needsServer).map((g) => g.name);
    if (skipped.length > 0) {
      console.log(`  (lobby check skipped, needs a game server: ${skipped.join(', ')})\n`);
    }
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const results = [];

  for (const game of games) {
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
