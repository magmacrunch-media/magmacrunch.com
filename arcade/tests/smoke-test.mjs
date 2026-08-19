import { chromium } from 'playwright';
import net from 'net';
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
 *   dismiss  clicked before anything else — SORRY opens on a title screen that
 *            sits above its lobby, so the lobby is unreachable until it goes
 *   name     filled with BOT_NAME; the join buttons stay disabled without one
 *   open     selector for the control that opens or joins the lobby
 *   overlay  the overlay expected to become visible (default '#lobbyOverlay')
 *   port     this game's lobby is revealed by a socket message rather than by
 *            the click itself, so it needs its server.py listening on this port.
 *            The page is loaded with ?server=localhost:<port> — every one of
 *            these games honours that override, and adenosine-multiplayer
 *            allowlists localhost. Skipped when nothing is listening, so a run
 *            without game servers reports honestly instead of failing.
 *   joined   must be non-empty once joined. Proves the join actually round-
 *            tripped to the server rather than just painting an overlay, which
 *            matters most for SORRY, whose lobby is visible before you join.
 */
const GAMES = [
  { name: '2^N', path: '2^N' },
  { name: 'aggravation', path: 'aggravation', lobby: { name: '#nameInput', open: '#joinBtn', port: 8774, joined: '#lobbyRoomCode' } },
  { name: 'backgammon', path: 'backgammon', lobby: { open: '#onlineBtn' } },
  { name: 'checkers', path: 'checkers', lobby: { open: '#onlineBtn' } },
  { name: 'chess', path: 'chess', lobby: { open: '#multiplayerBtn' } },
  { name: 'chinese-checkers', path: 'chinese-checkers', lobby: { open: '#onlineBtn' } },
  { name: 'cribbage', path: 'cribbage', lobby: { open: '#multiplayerBtn' } },
  { name: 'fifteen-puzzle', path: 'fifteen-puzzle' },
  { name: 'george-boole', path: 'george-boole' },
  { name: 'klotski', path: 'klotski' },
  { name: 'moonlight-drift', path: 'moonlight-drift' },
  { name: 'parchisi', path: 'parchisi', lobby: { name: '#nameInput', open: '#joinBtn', port: 8773, joined: '#roomCodeDisplay' } },
  { name: 'roderick-tron', path: 'roderick-tron' },
  { name: 'scandinavian-stud', path: 'scandinavian-stud', lobby: { open: '#multiplayerBtn' } },
  { name: 'solitaire', path: 'solitaire' },
  { name: 'solitaire_THLD', path: 'solitaire_THLD' },
  { name: 'SORRY', path: 'SORRY', lobby: { dismiss: '#title-overlay', name: '#name-input', open: '#join-btn', overlay: '#lobby-overlay', port: 8765, joined: '#player-list' } },
  { name: 'tarot', path: 'tarot' },
  { name: 'tetris', path: 'tetris' },
  { name: 'threes', path: 'threes' },
  { name: 'very-long-boards', path: 'very-long-boards' },
];

const BOT_NAME = 'SmokeBot';

/** Any game with a lobby the suite knows how to reach. */
const hasLobby = (g) => Boolean(g.lobby);

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

/** A server-backed join has to cross a socket before the lobby paints. */
const JOIN_SETTLE_MS = 3000;

/**
 * Is a game server listening? Server-backed lobby checks are skipped rather
 * than failed when it is not, so `node smoke-test.mjs` stays useful on a
 * machine with no game servers running.
 */
function portOpen(port, timeout = 1000) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    const done = (result) => { sock.destroy(); resolve(result); };
    sock.setTimeout(timeout);
    sock.once('connect', () => done(true));
    sock.once('timeout', () => done(false));
    sock.once('error', () => done(false));
    sock.connect(port, '127.0.0.1');
  });
}

/**
 * Click a game's multiplayer button and confirm the lobby really becomes
 * visible. Returns an array of error strings (empty when the lobby opened).
 *
 * Deliberately not Playwright's toBeVisible(): that ignores opacity, so an
 * overlay sitting at opacity 0 with display:flex counts as visible and the
 * check would pass on a lobby no player can see.
 *
 * For the six games that open their lobby straight from the click handler and
 * dial the server afterwards, this asserts only that the lobby opens — no game
 * server needed. The three with a `port` cannot work that way: their lobby is
 * revealed by a socket message, so those runs do require server.py and also
 * check `joined` to prove the round-trip happened.
 */
async function checkLobby(page, game) {
  const selector = game.lobby.overlay || '#lobbyOverlay';

  // SORRY boots onto a title screen stacked above its lobby. Playwright reports
  // the join button as enabled and still refuses the click, because the title's
  // own children sit over it — a different one at every viewport.
  if (game.lobby.dismiss) {
    try {
      await page.locator(game.lobby.dismiss).first().click({ timeout: 5000 });
      await page.waitForTimeout(TRANSITION_SETTLE_MS);
    } catch (err) {
      return [`lobby: could not dismiss ${game.lobby.dismiss}: ${err.message}`];
    }
  }

  // Join buttons stay disabled until a name is present.
  if (game.lobby.name) {
    const field = page.locator(game.lobby.name).first();
    if (await field.count() === 0) {
      return [`lobby: name field ${game.lobby.name} not found on the page`];
    }
    await field.fill(BOT_NAME);
    await page.waitForTimeout(200);
  }

  const trigger = page.locator(game.lobby.open).first();
  if (await trigger.count() === 0) {
    return [`lobby: trigger ${game.lobby.open} not found on the page`];
  }

  try {
    await trigger.click({ timeout: 5000 });
  } catch (err) {
    return [`lobby: could not click ${game.lobby.open}: ${err.message}`];
  }

  // A server-backed lobby only appears once the join round-trips.
  await page.waitForTimeout(game.lobby.port ? JOIN_SETTLE_MS : TRANSITION_SETTLE_MS);

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

  if (problems.length > 0) {
    return [
      `lobby: clicked ${game.lobby.open} but ${selector} did not become visible ` +
        `(${problems.join(', ')})`,
    ];
  }

  if (game.lobby.joined) {
    const joined = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el ? (el.innerText || '').trim() : null;
    }, game.lobby.joined);

    if (joined === null) {
      return [`lobby: joined-evidence ${game.lobby.joined} not found in the DOM`];
    }
    if (joined === '') {
      return [
        `lobby: ${selector} is visible but ${game.lobby.joined} is empty — ` +
          `the join did not reach the server`,
      ];
    }
  }

  return [];
}

async function testGame(page, game, lobbyServerUp) {
  // Point the game at the local server.py instead of its baked-in default,
  // which is the Pi either way — magmacrunch.duckdns.org, or 192.168.1.16 via
  // mpServerFor(). Without this a "passing" run could be talking to production.
  const query = game.lobby && game.lobby.port && lobbyServerUp
    ? `?server=localhost:${game.lobby.port}`
    : '';
  const url = `${BASE_URL}/arcade/${game.path}/${query}`;
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

    const runLobby = hasLobby(game) && (!game.lobby.port || lobbyServerUp);
    if (runLobby) {
      errors.push(...await checkLobby(page, game));
    }

    return {
      name: game.name,
      path: game.path,
      url,
      status: errors.length === 0 ? 'pass' : 'fail',
      loadTime,
      errors,
      warnings,
      lobbyChecked: runLobby,
      lobbySkipped: hasLobby(game) && !runLobby,
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
    else if (r.lobbySkipped) lobby = "skipped (no server)";
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
  const games = LOBBY_ONLY ? GAMES.filter(hasLobby) : GAMES;

  // One probe per distinct port, before the browser starts.
  const ports = [...new Set(GAMES.filter((g) => g.lobby && g.lobby.port).map((g) => g.lobby.port))];
  const serverUp = new Map(await Promise.all(ports.map(async (p) => [p, await portOpen(p)])));

  const noun = LOBBY_ONLY ? 'multiplayer lobbies' : 'games';
  console.log(`Testing ${games.length} ${noun} against ${BASE_URL}...\n`);

  const down = GAMES.filter((g) => g.lobby && g.lobby.port && !serverUp.get(g.lobby.port));
  if (down.length > 0) {
    console.log(
      `  (lobby check skipped, no server on ${down.map((g) => `${g.name}:${g.lobby.port}`).join(', ')})\n`,
    );
  }

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const results = [];

  for (const game of games) {
    const page = await context.newPage();
    process.stdout.write(`  ${game.name}...`);

    const lobbyServerUp = Boolean(game.lobby && game.lobby.port && serverUp.get(game.lobby.port));
    const result = await testGame(page, game, lobbyServerUp);

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
