"""
Tests for arcade/counter/counter-server.py.

The counter had never been exercised at all: nginx has no /counter route, so the
client's socket landed on the chat server and every increment was dropped. Nothing
noticed because nothing tested it and count.json sitting at 0 looks the same as a
quiet site.

These cover the two things that were wrong underneath that — an origin gate it did
not have, and a count held per connection rather than per process — so that neither
comes back once traffic actually reaches it.

Run:  cd arcade/counter/tests && pytest test_counter_server.py -v
"""

import asyncio
import importlib.util
import json
import os
import sys

import pytest
import websockets
from websockets.exceptions import InvalidStatus

COUNTER_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ARCADE = os.path.dirname(COUNTER_DIR)
sys.path.insert(0, os.path.join(ARCADE, "shared", "multiplayer"))

# Same reason as the chat server: the hyphen in the filename is not a valid
# identifier, and renaming it would break the systemd unit and the deploy.
_spec = importlib.util.spec_from_file_location(
    "counter_server", os.path.join(COUNTER_DIR, "counter-server.py")
)
counter = importlib.util.module_from_spec(_spec)
sys.modules["counter_server"] = counter
_spec.loader.exec_module(counter)

from server_base import make_reject_request, reset_limiters  # noqa: E402

OK_ORIGIN = {"Origin": "http://localhost:8080"}


# ── Harness ───────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clean_state(tmp_path, monkeypatch):
    """Fresh limiters, and a count file that is never the real one."""
    reset_limiters()
    monkeypatch.setattr(counter, "COUNT_FILE", str(tmp_path / "count.json"))
    monkeypatch.setattr(counter, "count", 0)
    monkeypatch.setattr(counter, "_dirty", False)
    yield
    reset_limiters()


def serve(coro, max_connections=10):
    async def runner():
        gate = make_reject_request(max_connections=max_connections)
        async with websockets.serve(counter.handler, "127.0.0.1", 0, process_request=gate) as server:
            port = server.sockets[0].getsockname()[1]
            return await coro(f"ws://127.0.0.1:{port}")
    return asyncio.run(runner())


async def ask(ws, action):
    await ws.send(json.dumps({"action": action}))
    try:
        return json.loads(await asyncio.wait_for(ws.recv(), 2))
    except (asyncio.TimeoutError, websockets.ConnectionClosed):
        return None


# ── Handshake gate ────────────────────────────────────────────────────────────

class TestHandshake:
    def test_a_cross_origin_page_is_refused(self):
        """Anyone could inflate a counter that persists to disk."""
        async def go(url):
            with pytest.raises(InvalidStatus) as exc:
                async with websockets.connect(url, additional_headers={"Origin": "https://evil.example"}):
                    pass
            return exc.value.response.status_code
        assert serve(go) == 403

    def test_the_public_site_is_allowed(self):
        async def go(url):
            async with websockets.connect(url, additional_headers={"Origin": "https://magmacrunch.com"}) as ws:
                return await ask(ws, "get_count")
        assert serve(go)["type"] == "count"

    def test_a_client_with_no_origin_still_connects(self):
        async def go(url):
            async with websockets.connect(url) as ws:
                return await ask(ws, "get_count")
        assert serve(go)["type"] == "count"

    def test_plain_http_still_gets_426(self):
        """scripts/bot-check-services.sh probes 8783 and needs an answer."""
        async def go(url):
            host, port = url.replace("ws://", "").split(":")
            reader, writer = await asyncio.open_connection(host, port)
            writer.write(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n")
            await writer.drain()
            line = await asyncio.wait_for(reader.readline(), 5)
            writer.close()
            return line.decode()
        assert "426" in serve(go)


# ── Counting ──────────────────────────────────────────────────────────────────

class TestCounting:
    def test_get_count_reports_the_current_value(self):
        counter.count = 41
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                return await ask(ws, "get_count")
        assert serve(go)["count"] == 41

    def test_increment_raises_the_count(self):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                return await ask(ws, "increment")
        assert serve(go)["count"] == 1
        assert counter.count == 1

    def test_an_increment_marks_the_count_for_flushing(self):
        """Writes are batched now — one SD-card write per visitor is not free."""
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await ask(ws, "increment")
        serve(go)
        assert counter._dirty is True

    def test_the_flush_actually_persists(self):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await ask(ws, "increment")
        serve(go)
        counter.save_count()
        with open(counter.COUNT_FILE, encoding="utf-8") as fh:
            assert json.load(fh)["count"] == 1
        assert counter._dirty is False

    def test_two_overlapping_visitors_do_not_lose_a_count(self):
        """
        The regression test for a lost update.

        `count` used to be read into a local at the top of handler, so two
        connections open at once both started from N and both wrote N+1. It never
        fired in production only because nothing could reach this server.
        """
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as a:
                async with websockets.connect(url, additional_headers=OK_ORIGIN) as b:
                    first = await ask(a, "increment")
                    second = await ask(b, "increment")
                    return first["count"], second["count"]
        assert serve(go) == (1, 2)
        assert counter.count == 2

    def test_an_unknown_action_is_ignored(self):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                return await ask(ws, "drop_database")
        assert serve(go) is None
        assert counter.count == 0

    def test_malformed_json_does_not_kill_the_socket(self):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await ws.send("not json at all")
                return await ask(ws, "get_count")
        assert serve(go)["type"] == "count"


# ── Rate limits ───────────────────────────────────────────────────────────────

class TestLimits:
    def test_the_increment_cap_survives_reconnecting(self):
        """
        The third copy of the per-connection limiter lived here. Its cap was three
        per ten seconds and cost one extra socket to clear.

        Spends the budget on one socket and then opens a second, rather than
        counting how many of N reconnects land: N real connections can outlast the
        ten-second window, which makes the count a race rather than a fact.
        """
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as a:
                for _ in range(3):
                    await ask(a, "increment")
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as b:
                refused = await ask(b, "increment")
            return counter.count, refused
        count, refused = serve(go)
        assert refused is None, "a fresh socket was handed a fresh budget"
        assert count == 3

    def test_the_get_cap_is_also_per_ip(self):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as a:
                for _ in range(10):
                    await ask(a, "get_count")
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as b:
                return await ask(b, "get_count")
        assert serve(go) is None
