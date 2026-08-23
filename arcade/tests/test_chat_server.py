"""
Tests for arcade/chat-server.py — the protocol layer, over a real socket.

chat-server.py was the only arcade server with no tests, and it is the one whose
defects hid best. The controls it relies on are all in the message loop and the
handshake, so unlike the game servers there is no pure class to instantiate: these
start the real server on an ephemeral port and talk to it.

What that buys is the difference between "the function returns False" and "the
flood is actually refused" — the distinction the original bugs lived in, where a
correct-looking limiter was reset by reconnecting and a correct-looking return
value was thrown away by its only caller.

Deliberately no pytest-asyncio: requirements.txt is what the Pi installs, and
asyncio.run() inside a sync test does the same job with nothing added.

Run:  cd arcade/tests && pytest test_chat_server.py -v
"""

import asyncio
import importlib.util
import json
import os
import sys

import pytest
import websockets
from websockets.exceptions import InvalidStatus

ARCADE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ARCADE, "shared", "multiplayer"))

# chat-server.py cannot be imported by name — the hyphen is not a valid
# identifier — and renaming it would break the systemd unit and the deploy.
_spec = importlib.util.spec_from_file_location("chat_server", os.path.join(ARCADE, "chat-server.py"))
chat = importlib.util.module_from_spec(_spec)
sys.modules["chat_server"] = chat
_spec.loader.exec_module(chat)

from server_base import make_reject_request, reset_limiters  # noqa: E402

OK_ORIGIN = {"Origin": "http://localhost:8080"}
TOKEN = "test-token"


# ── Harness ───────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clean_state():
    """
    Wipe the module-level state the server accumulates.

    Every one of these outlives a connection on purpose, so without this a test
    inherits the previous test's rooms, history and rate-limit budget.
    """
    def wipe():
        reset_limiters()
        for store in (chat.connected_clients, chat.user_info, chat.rooms,
                      chat.room_messages, chat.typing_debounce,
                      chat.recently_disconnected, chat.server_statuses):
            store.clear()
        chat.messages.clear()
    wipe()
    yield
    wipe()


def serve(coro, max_connections=chat.MAX_CONNECTIONS_PER_MINUTE):
    """
    Run `coro(url)` against a freshly started chat server.

    Port 0 so a developer with the real chat server on 8768 can still run these.
    """
    async def runner():
        gate = make_reject_request(max_connections=max_connections)
        async with websockets.serve(chat.handler, "127.0.0.1", 0, process_request=gate) as server:
            port = server.sockets[0].getsockname()[1]
            return await coro(f"ws://127.0.0.1:{port}")
    return asyncio.run(runner())


async def greet(ws):
    """Consume the two frames the server pushes unprompted on connect."""
    return [json.loads(await asyncio.wait_for(ws.recv(), 5)) for _ in range(2)]


async def frames(ws, count, timeout=1.0):
    """Up to `count` frames; fewer if the server stops talking."""
    out = []
    try:
        for _ in range(count):
            out.append(json.loads(await asyncio.wait_for(ws.recv(), timeout)))
    except (asyncio.TimeoutError, websockets.ConnectionClosed):
        pass
    return out


async def until(ws, wanted, timeout=2.0):
    """Read until a frame of one of `wanted` types arrives. Returns (hit, seen)."""
    seen = []
    try:
        while True:
            msg = json.loads(await asyncio.wait_for(ws.recv(), timeout))
            seen.append(msg)
            if msg.get("type") in wanted:
                return msg, seen
    except (asyncio.TimeoutError, websockets.ConnectionClosed):
        return None, seen


async def settle(predicate, timeout=2.0):
    """
    Wait for server-side state rather than sleeping.

    Closing a client socket returns before the handler's finally block has run,
    so a reconnect test that slept a fixed interval would be a coin flip.
    """
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        if predicate():
            return True
        await asyncio.sleep(0.01)
    return False


async def join(ws, name, token=None, room=None):
    """Named-and-joined, the state most tests need to start from."""
    await greet(ws)
    msg = {"type": "set_name", "name": name}
    if token:
        msg["session_token"] = token
    await ws.send(json.dumps(msg))
    await until(ws, {"name_assigned"})
    if room:
        await ws.send(json.dumps({"type": "join_room", "room": room}))
        await until(ws, {"room_history"})


# ── Handshake gate ────────────────────────────────────────────────────────────

class TestHandshake:
    def test_an_allowed_origin_is_greeted_with_history_and_status(self):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                return [f.get("type") for f in await greet(ws)]
        assert serve(go) == ["history", "status"]

    def test_a_cross_origin_page_is_refused_before_the_handshake(self):
        async def go(url):
            with pytest.raises(InvalidStatus) as exc:
                async with websockets.connect(url, additional_headers={"Origin": "https://evil.example"}):
                    pass
            return exc.value.response.status_code
        assert serve(go) == 403

    def test_a_client_with_no_origin_still_connects(self):
        """The health bot, the dashboard, and these tests send none."""
        async def go(url):
            async with websockets.connect(url) as ws:
                return [f.get("type") for f in await greet(ws)]
        assert serve(go) == ["history", "status"]

    def test_plain_http_still_gets_426(self):
        """scripts/bot-check-services.sh probes the port; nginx needs it too."""
        async def go(url):
            host = url.replace("ws://", "")
            reader, writer = await asyncio.open_connection(*host.split(":"))
            writer.write(b"GET / HTTP/1.1\r\nHost: localhost\r\n\r\n")
            await writer.drain()
            line = await asyncio.wait_for(reader.readline(), 5)
            writer.close()
            return line.decode()
        assert "426" in serve(go)

    def test_a_connection_flood_is_refused(self):
        """The cap used to log and admit — its return value was discarded."""
        async def go(url):
            opened = []
            try:
                for _ in range(3):
                    opened.append(await websockets.connect(url, additional_headers=OK_ORIGIN))
                with pytest.raises(InvalidStatus) as exc:
                    await websockets.connect(url, additional_headers=OK_ORIGIN)
                return exc.value.response.status_code
            finally:
                for ws in opened:
                    await ws.close()
        assert serve(go, max_connections=3) == 429


# ── Rate limits survive reconnecting ─────────────────────────────────────────

class TestPerIpLimits:
    def test_the_chat_cap_is_not_reset_by_a_new_socket(self):
        """
        The point of the whole limiter change: a per-connection limiter hands a
        fresh budget to every new socket.

        Spends the cap on one socket and then opens a second, rather than counting
        how many of N reconnects land. N real connections can outlast the ten-second
        window, which would make the count a race rather than a fact.
        """
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as a:
                await join(a, "Flooder")
                for i in range(5):
                    await a.send(json.dumps({"type": "chat", "text": f"spam-{i}"}))
                await settle(lambda: len(chat.messages) >= 5)

            async with websockets.connect(url, additional_headers=OK_ORIGIN) as b:
                await join(b, "Flooder2")
                await b.send(json.dumps({"type": "chat", "text": "spam-after-reconnect"}))
                await asyncio.sleep(0.3)
            return [m["text"] for m in chat.messages]
        landed = serve(go, max_connections=100)
        assert "spam-after-reconnect" not in landed, (
            "a fresh socket was handed a fresh budget; the cap is per socket again"
        )
        assert len([t for t in landed if t.startswith("spam-")]) == 5


# ── get_history ───────────────────────────────────────────────────────────────

class TestGetHistory:
    def test_without_a_token_it_returns_nothing_and_does_not_break_the_socket(self, monkeypatch):
        """
        Ignored rather than refused: chat-worker.js still sends this on every
        socket open, and an error frame would surface as a broken widget.
        """
        monkeypatch.setattr(chat, "ADMIN_TOKEN", TOKEN)

        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await greet(ws)
                await ws.send(json.dumps({"type": "get_history"}))
                silent = await frames(ws, 1) == []
                await ws.send(json.dumps({"type": "set_name", "name": "After"}))
                hit, _ = await until(ws, {"name_assigned"})
                return silent, hit is not None
        silent, usable = serve(go)
        assert silent and usable

    def test_a_wrong_token_returns_nothing(self, monkeypatch):
        monkeypatch.setattr(chat, "ADMIN_TOKEN", TOKEN)

        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await greet(ws)
                await ws.send(json.dumps({"type": "get_history", "token": "wrong"}))
                return await frames(ws, 1)
        assert serve(go) == []

    def test_the_right_token_returns_both_dumps(self, monkeypatch):
        monkeypatch.setattr(chat, "ADMIN_TOKEN", TOKEN)

        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await greet(ws)
                await ws.send(json.dumps({"type": "get_history", "token": TOKEN}))
                return [f.get("type") for f in await frames(ws, 2, timeout=2.0)]
        assert serve(go) == ["history", "room_histories"]

    def test_an_unset_token_refuses_everyone(self, monkeypatch):
        """Fail closed: the dump carries every room's private sub-chat."""
        monkeypatch.setattr(chat, "ADMIN_TOKEN", "")

        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await greet(ws)
                await ws.send(json.dumps({"type": "get_history", "token": ""}))
                return await frames(ws, 1)
        assert serve(go) == []


# ── Rooms ─────────────────────────────────────────────────────────────────────

class TestRooms:
    @pytest.mark.parametrize("code", ["../../etc", "A" * 40, "ab", "", "ab!2", "  "])
    def test_a_bad_room_code_is_rejected_and_leaves_no_state(self, code):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await join(ws, "Tester")
                await ws.send(json.dumps({"type": "join_room", "room": code}))
                got = await frames(ws, 1)
                return [f.get("type") for f in got]
        assert "room_history" not in serve(go)
        assert chat.rooms == {}
        assert chat.room_messages == {}

    def test_a_valid_code_is_accepted(self):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await join(ws, "Tester")
                await ws.send(json.dumps({"type": "join_room", "room": "AB12"}))
                hit, _ = await until(ws, {"room_history"})
                return hit
        assert serve(go)["room"] == "AB12"

    def test_the_room_cap_refuses_new_codes(self, monkeypatch):
        monkeypatch.setattr(chat, "MAX_ROOMS", 2)

        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await join(ws, "Tester")
                for code in ("AAAA", "BBBB", "CCCC"):
                    await ws.send(json.dumps({"type": "join_room", "room": code}))
                    await frames(ws, 2)
                return sorted(chat.rooms)
        assert serve(go) == ["AAAA", "BBBB"]

    def test_an_emptied_room_takes_its_history_with_it(self):
        """Transcripts used to outlive every code the arcade ever issued."""
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await join(ws, "Tester", room="ZZ99")
                await ws.send(json.dumps({"type": "chat", "room": "ZZ99", "text": "hi"}))
                await settle(lambda: "ZZ99" in chat.room_messages)
                await ws.send(json.dumps({"type": "leave_room", "room": "ZZ99"}))
                await settle(lambda: "ZZ99" not in chat.rooms)
            return None
        serve(go)
        assert "ZZ99" not in chat.rooms
        assert "ZZ99" not in chat.room_messages

    def test_posting_to_a_room_you_are_not_in_is_dropped(self):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws1:
                await join(ws1, "Member", room="RM01")
                async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws2:
                    await join(ws2, "Outsider")
                    await ws2.send(json.dumps({"type": "chat", "room": "RM01", "text": "let me in"}))
                    # Not an empty read: the member still has presence broadcasts
                    # queued from its own join. What must not arrive is the chat.
                    return [f.get("type") for f in await frames(ws1, 4)]
        assert "room_chat" not in serve(go)

    def test_a_room_code_is_normalised_to_upper_case(self):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await join(ws, "Tester")
                await ws.send(json.dumps({"type": "join_room", "room": "ab12"}))
                await until(ws, {"room_history"})
                # the widget may echo the code back in the case the user typed
                await ws.send(json.dumps({"type": "chat", "room": "ab12", "text": "yo"}))
                await settle(lambda: chat.room_messages.get("AB12"))
                return list(chat.room_messages)
        assert serve(go) == ["AB12"]


# ── Reconnect ─────────────────────────────────────────────────────────────────

class TestReconnect:
    def test_a_reconnecting_player_is_put_back_in_their_room(self):
        """
        The room list was saved on disconnect and then dropped on restore, so a
        player whose socket blipped mid-game stopped receiving their game's
        sub-chat while the widget still believed it was in the room.
        """
        async def go(url):
            ws1 = await websockets.connect(url, additional_headers=OK_ORIGIN)
            await join(ws1, "Rejoiner", token="tok", room="ZZ99")
            await ws1.close()
            assert await settle(lambda: "tok" in chat.recently_disconnected), "session never stored"

            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws2:
                await greet(ws2)
                await ws2.send(json.dumps({"type": "set_name", "name": "Rejoiner",
                                           "session_token": "tok"}))
                hit, seen = await until(ws2, {"room_users"})
                return hit, [f.get("type") for f in seen]
        hit, types = serve(go)
        assert hit is not None and hit["room"] == "ZZ99", types
        assert "room_history" not in types, (
            "room_history was replayed; the widget never cleared the pane, so this "
            "duplicates every message already on screen"
        )

    def test_a_restored_member_can_still_post_to_the_room(self):
        async def go(url):
            ws1 = await websockets.connect(url, additional_headers=OK_ORIGIN)
            await join(ws1, "Rejoiner", token="tok", room="ZZ99")
            await ws1.close()
            await settle(lambda: "tok" in chat.recently_disconnected)

            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws2:
                await greet(ws2)
                await ws2.send(json.dumps({"type": "set_name", "name": "Rejoiner",
                                           "session_token": "tok"}))
                await until(ws2, {"room_users"})
                async with websockets.connect(url, additional_headers=OK_ORIGIN) as witness:
                    await join(witness, "Witness", room="ZZ99")
                    await ws2.send(json.dumps({"type": "chat", "room": "ZZ99", "text": "still here"}))
                    hit, seen = await until(witness, {"room_chat"})
                    return hit, [f.get("type") for f in seen]
        hit, types = serve(go)
        assert hit is not None and hit["text"] == "still here", types


# ── Names ─────────────────────────────────────────────────────────────────────

class TestNames:
    def test_a_taken_name_is_made_unique(self):
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as a:
                await join(a, "Twin")
                async with websockets.connect(url, additional_headers=OK_ORIGIN) as b:
                    await greet(b)
                    await b.send(json.dumps({"type": "set_name", "name": "Twin"}))
                    hit, _ = await until(b, {"name_assigned"})
                    return hit["name"]
        assert serve(go) != "Twin"

    def test_renaming_yourself_to_your_own_name_is_not_a_collision(self):
        """`ws != None` excluded nobody, so this used to grow a suffix."""
        async def go(url):
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                await join(ws, "Solo")
                await ws.send(json.dumps({"type": "set_name", "name": "Solo"}))
                hit, _ = await until(ws, {"name_assigned"})
                return hit["name"]
        assert serve(go) == "Solo"


# ── Status ────────────────────────────────────────────────────────────────────

class TestStatus:
    def test_every_game_in_the_manifest_is_reported(self):
        """
        The drift this closes: Chess and Aggravation were running and proxied,
        and the status panel had never heard of either.
        """
        async def go(url):
            await chat.refresh_statuses()
            return dict(chat.server_statuses)
        assert set(serve(go)) == set(chat.GAME_SERVERS)

    def test_the_manifest_supplies_the_game_list(self):
        names = set(chat.GAME_SERVERS)
        assert {"Chess", "Aggravation"} <= names
        assert "Chat" not in names, "the chat server should not probe itself"

    def test_the_greeting_serves_the_cache_rather_than_probing(self):
        async def go(url):
            chat.server_statuses.update({"Fake Game": True})
            async with websockets.connect(url, additional_headers=OK_ORIGIN) as ws:
                _, status = await greet(ws)
                return status["statuses"]
        assert serve(go) == {"Fake Game": True}
