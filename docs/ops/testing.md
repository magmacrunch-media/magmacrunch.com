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
| `arcade/shared/tests/test_services.py` | `services.json` and the dashboard's reader of it |
| `arcade/shared/tests/test_server_base.py` | the handshake gate, `client_ip`, and the per-IP limiters |
| `arcade/tests/test_chat_server.py` | `chat-server.py`'s protocol, over a real socket on an ephemeral port |
| `arcade/tests/smoke-test.mjs` | every game page loads; multiplayer lobbies open; the chat widget connects |

`chat-server.py` is loaded with `importlib` because the hyphen in its name is not
a valid identifier — renaming it would break the systemd unit and the deploy.

The chat and `server_base` tests assert behaviour that survives a *reconnect*, not
just return values. The bugs they exist for were a limiter that reset on a new
socket and a rate-limit check whose return value every caller discarded — both
look correct in isolation, and both pass a test that only calls the function.

**No `pytest-asyncio`.** `requirements.txt` is what the Pi installs; `asyncio.run()`
inside a sync test does the same job with nothing added.

**Local dev must be served over http**, not opened off disk. A `file://` page
sends `Origin: null`, which the handshake gate refuses.

