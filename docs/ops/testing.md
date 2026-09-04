# Testing internals — runner design, Python interpreter selection, and what each suite covers.

`make test`, `make check`, `make test-py` and `make test-js` do the same thing —
both routes call `scripts/run-tests.mjs`, so there is one implementation of
"find the suites and run them" rather than a copy in each.

**Python interpreter.** The runner probes `$PYTHON`, then `$VIRTUAL_ENV`, then
`py -3`, `python3`, `python`, and uses the first that actually executes. It does
not simply take the first on PATH: on Windows `python3` is usually the Microsoft
Store stub, which exists, is not Python, and opens the Store when run. To test
against a virtualenv without activating it in whatever shell npm spawns:

```bash
PYTHON=/path/to/venv/bin/python npm run test:py
```

pytest comes from the root `requirements.txt` (`pip install -r requirements.txt`).
If it is missing the runner says so and exits non-zero — it does not report a pass.

**These scripts used to be POSIX one-liners** and npm hands scripts to cmd.exe
unless `script-shell` is set, so on Windows neither ran: `test:py` died on
`'while' is not recognized` and `test:js` on ``find: missing argument to `-exec'``.
`npm test` is `lint && test:js`, so it reported success while running no tests at
all. Keep the runner in Node for that reason.

### What covers what

| suite | covers |
|---|---|
| `arcade/<game>/tests/test_*.py` | game rules, in-process — no sockets |
| `arcade/roderick-tron/tests/test-simulation.js` | the running game itself: frame-rate independence, terrain fairness, entity behaviour |
| `arcade/shared/tests/test_services.py` | `services.json` and the dashboard's reader of it |
| `arcade/shared/tests/test_server_base.py` | the handshake gate, `client_ip`, and the per-IP limiters |
| `arcade/tests/test_chat_server.py` | `chat-server.py`'s protocol, over a real socket on an ephemeral port |
| `arcade/tests/smoke-test.mjs` | every game page loads; multiplayer lobbies open; the chat widget connects |

`chat-server.py` is loaded with `importlib` because the hyphen in its name is not
a valid identifier — renaming it would break the systemd unit and the deploy.

**Roderick Tron's suite runs the shipped files, not a copy of them.** `config.js`,
`player.js`, `world.js`, `entities.js` and `renderer.js` are plain scripts that
assign globals and touch no DOM outside their `draw()` methods, so the suite
loads them into a `vm` context with a stubbed `Input`, a seeded `Math.random`
and a recording no-op 2D context. Nothing there can drift from what the browser
runs, which is the failure mode a hand-copied `advanceRow()` has.

Two of its checks are worth knowing about before changing that game's tuning:

- *dt invariance* runs the same ten seconds at 60, 120 and 30 frames per second
  and asserts the three agree to within 0.05%. They cannot agree exactly —
  scroll speed is a function of distance and distance is the integral of scroll
  speed, so a coarser step samples that loop at different points. The bug it
  replaced was a factor of two: `dt` was applied to gravity but not to the
  position step, and not at all to the camera, so the game ran twice as fast on
  a 120Hz display.
- *every gap is clearable* flies each consecutive pair of rooftops with the real
  `Player.update`, across every jump timing and every hold length, and asserts
  both that something lands it and that the hold window is at least four frames
  wide. Widening a gap or raising `SCROLL_MAX` past what a jump carries fails
  here rather than in someone's run. It is the slow part — about ten seconds of
  the suite's fourteen.

The chat and `server_base` tests assert behaviour that survives a *reconnect*, not
just return values. The bugs they exist for were a limiter that reset on a new
socket and a rate-limit check whose return value every caller discarded — both
look correct in isolation, and both pass a test that only calls the function.

**No `pytest-asyncio`.** `requirements.txt` is what the Pi installs; `asyncio.run()`
inside a sync test does the same job with nothing added.

**Local dev must be served over http**, not opened off disk. A `file://` page
sends `Origin: null`, which the handshake gate refuses.

