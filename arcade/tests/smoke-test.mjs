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
  { name: 'cave-diving', path: 'cave-diving' },
  { name: 'checkers', path: 'checkers', lobby: { open: '#onlineBtn' } },
  { name: 'chess', path: 'chess', lobby: { open: '#multiplayerBtn' } },
  { name: 'chinese-checkers', path: 'chinese-checkers', lobby: { open: '#onlineBtn' } },
  { name: 'cribbage', path: 'cribbage', lobby: { open: '#multiplayerBtn' } },
  { name: 'fifteen-puzzle', path: 'fifteen-puzzle' },
  { name: 'george-boole', path: 'george-boole' },
  { name: 'klotski', path: 'klotski' },
  { name: 'makemecookies', path: 'makemecookies' },
  { name: 'moonlight-drift', path: 'moonlight-drift' },
  { name: 'parchisi', path: 'parchisi', lobby: { name: '#nameInput', open: '#joinBtn', port: 8773, joined: '#roomCodeDisplay' } },
  { name: 'roderick-tron', path: 'roderick-tron' },
  { name: 'jovian-humanitarian-conflict', path: 'jovian-humanitarian-conflict' },
  { name: 'scandinavian-stud', path: 'scandinavian-stud', lobby: { open: '#multiplayerBtn' } },
  { name: 'solitaire', path: 'solitaire' },
  { name: 'solitaire_THLD', path: 'solitaire_THLD' },
  { name: 'SORRY', path: 'SORRY', lobby: { dismiss: '#title-overlay', name: '#name-input', open: '#join-btn', overlay: '#lobby-overlay', port: 8765, joined: '#player-list' } },
  { name: 'tarot', path: 'tarot' },
  { name: 'tetris', path: 'tetris', chat: true },
  { name: 'threes', path: 'threes' },
  { name: 'very-long-boards', path: 'very-long-boards' },
];

const BOT_NAME = 'SmokeBot';

/** Any game with a lobby the suite knows how to reach. */
const hasLobby = (g) => Boolean(g.lobby);

/**
 * `chat: true` runs the floating chat widget check on that page. Declared on one
 * game rather than all 24 that load the widget: it is the same widget and the
 * same backend everywhere, so checking it once is the honest amount of coverage
 * and 24 sockets to the chat server is not.
 *
 * It sits on a game with no `lobby` on purpose. Both adenosine-multiplayer and
 * adenosine-chat read the same `?server=` parameter, so a page carrying both
 * checks could only point one of them at a local server.
 */
const hasChat = (g) => Boolean(g.chat);

/** Where chat-server.py listens. Mirrors arcade/shared/services.json. */
const CHAT_PORT = 8768;

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
 * The chat widget connects through a SharedWorker, so its first frames cross a
 * worker boundary as well as a socket.
 */
const CHAT_SETTLE_MS = 8000;

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

/**
 * Confirm the chat widget actually reached chat-server.py.
 *
 * Asserting the widget exists would pass on a widget that never connects — the
 * same hole the `joined` selector closes for lobbies. So this waits for state
 * that only a round-trip can produce: #chatMyName is empty until the server
 * answers set_name with name_assigned, and the count on the bar stays at 0
 * until a user_list counts this visitor.
 *
 * Both of those now need the visitor to do something first. adenosine-chat
 * 0.6.0 stopped sending set_name on connect, so that merely loading an arcade
 * page no longer puts a PlayerNN on the roster and the online count measures
 * participants instead of page loads. A passive load is therefore *supposed* to
 * produce no name and a count of 0 — the server sends a roster on connect and
 * deliberately leaves the asking socket out of it — and this check spent a day
 * red asserting the contract that release had just removed.
 *
 * So it sends a message first, which is the smallest thing that registers, and
 * then makes the same two assertions. That also puts ensureRegistered() under
 * test, which is the path every real participant now takes and the one 0.6.0
 * moved the behaviour onto.
 *
 * What it deliberately does not assert is the other half of that change — that
 * a passive visitor stays unregistered. From the DOM, "connected but not
 * registered" and "not connected yet" are the same empty string, so the
 * assertion would really be measuring how fast the socket came up.
 * arcade/tests/test_chat_server.py is where the roster's contents belong.
 */
async function checkChat(page) {
  const errors = [];

  if (await page.locator('#arcadeChatWidget').count() === 0) {
    return ['chat: #arcadeChatWidget never mounted'];
  }

  // The widget boots minimized unless localStorage says otherwise, and a fresh
  // context says nothing, so the composer starts closed. Clicking the bar
  // toggles, so this checks the state rather than clicking blind.
  try {
    if (await page.locator('#arcadeChatWidget.minimized').count() > 0) {
      await page.locator('#acwBar').click({ timeout: 5000 });
    }
    await page.locator('#chatInput').waitFor({ state: 'visible', timeout: 5000 });
  } catch (err) {
    return [`chat: could not open the widget: ${err.message}`];
  }

  // send() returns silently until the socket is open, and there is nothing to
  // wait on first: the widget dials through a SharedWorker, so the page cannot
  // see the socket at all and exposes no connected flag. Retrying is what
  // closes that race — every attempt before the socket is up does nothing
  // whatsoever, and the first one after it registers. Polling rather than
  // sleeping a guessed interval also means a fast connection is not paid for.
  try {
    await page.waitForFunction(() => {
      const name = document.getElementById('chatMyName');
      if (name && name.textContent.trim().length > 0) return true;
      const input = document.getElementById('chatInput');
      const send = document.getElementById('chatSend');
      // send() clears the field on success, so refilling each time is both the
      // retry and the check that the last attempt went nowhere.
      if (input && send) {
        input.value = 'smoke test';
        send.click();
      }
      return false;
    }, { timeout: CHAT_SETTLE_MS, polling: 500 });
  } catch {
    errors.push('chat: no name was assigned, so set_name never reached the server');
  }

  try {
    await page.waitForFunction(() => {
      const el = document.getElementById('acwOnlineCount');
      return el && Number(el.textContent) > 0;
    }, { timeout: CHAT_SETTLE_MS });
  } catch {
    errors.push('chat: online count stayed at 0, so the roster never counted this visitor');
  }

  return errors;
}

async function testGame(page, game, lobbyServerUp, chatServerUp) {
  // Point the game at the local server.py instead of its baked-in default,
  // which is the Pi either way — magmacrunch.duckdns.org, or 192.168.1.16 via
  // mpServerFor(). Without this a "passing" run could be talking to production.
  const query = game.lobby && game.lobby.port && lobbyServerUp
    ? `?server=localhost:${game.lobby.port}`
    : hasChat(game) && chatServerUp
      ? `?server=localhost:${CHAT_PORT}`
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

    const runChat = hasChat(game) && chatServerUp;
    if (runChat) {
      errors.push(...await checkChat(page));
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
      chatChecked: runChat,
      chatSkipped: hasChat(game) && !runChat,
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

  md += `| Game | Status | Lobby | Chat | Load Time | Errors |\n`;
  md += `|------|--------|-------|------|-----------|--------|\n`;

  for (const r of results) {
    const icon = r.status === 'pass' ? '✅' : '❌';
    const time = `${r.loadTime}ms`;
    const errs = r.errors.length > 0 ? r.errors[0].slice(0, 80) : '—';
    let lobby = '—';
    if (r.lobbyChecked) lobby = 'checked';
    else if (r.lobbySkipped) lobby = "skipped (no server)";
    let chat = '—';
    if (r.chatChecked) chat = 'checked';
    else if (r.chatSkipped) chat = 'skipped (no server)';
    md += `| ${r.name} | ${icon} ${r.status} | ${lobby} | ${chat} | ${time} | ${errs} |\n`;
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
  // --lobby-only means "only the checks that need a server", which the chat
  // check does too.
  const games = LOBBY_ONLY ? GAMES.filter((g) => hasLobby(g) || hasChat(g)) : GAMES;

  // One probe per distinct port, before the browser starts.
  const ports = [...new Set(GAMES.filter((g) => g.lobby && g.lobby.port).map((g) => g.lobby.port))];
  if (GAMES.some(hasChat)) ports.push(CHAT_PORT);
  const serverUp = new Map(await Promise.all(ports.map(async (p) => [p, await portOpen(p)])));

  const noun = LOBBY_ONLY ? 'multiplayer lobbies' : 'games';
  console.log(`Testing ${games.length} ${noun} against ${BASE_URL}...\n`);

  if (GAMES.some(hasChat) && !serverUp.get(CHAT_PORT)) {
    console.log(`  (chat check skipped, no chat-server.py on ${CHAT_PORT})\n`);
  }

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
    // Passed explicitly rather than smuggled through lobbyServerUp, which is
    // a per-game boolean, not the probe map.
    const chatServerUp = Boolean(hasChat(game) && serverUp.get(CHAT_PORT));
    const result = await testGame(page, game, lobbyServerUp, chatServerUp);

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
