"""
Tests for the handshake gate and rate limiting in shared/multiplayer/server_base.py.

These cover the controls that every arcade server depends on and that nothing
tested before. Two of them were dead code in production for a long time, and both
failed in ways that reading the source does not reveal:

  - check_connection_rate returned False correctly, and every caller threw the
    return value away. The limit logged loudly on each flood and admitted all of
    it. A test that only checked the return value would have passed.
  - The limiter was built per connection, so its caps cost an attacker one extra
    socket to clear. A test that sent messages down a single socket would have
    passed too.

So the cases below assert the properties that actually matter — a limit that
survives reconnecting, and an X-Real-IP that is believed only when it came from
nginx — rather than that the functions merely return something.

Run:  cd arcade/shared/tests && pytest test_server_base.py -v
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "multiplayer"))
from server_base import (  # noqa: E402
    LOOPBACK,
    PUBLIC_ORIGINS,
    RateLimiter,
    check_connection_rate,
    client_ip,
    connection_history,
    ip_limiter,
    origin_allowed,
    reset_limiters,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

class FakeRequest:
    """Just enough of a websockets handshake Request to exercise the gate."""

    def __init__(self, headers=None):
        self.headers = headers or {}


class FakeConnection:
    def __init__(self, peer, request=None):
        self.remote_address = (peer, 12345) if peer else None
        self.request = request


@pytest.fixture(autouse=True)
def clean_limiters():
    """Each test starts with the process-wide limiters empty."""
    reset_limiters()
    yield
    reset_limiters()


# ── Origin ────────────────────────────────────────────────────────────────────

class TestOriginAllowed:
    @pytest.mark.parametrize("origin", PUBLIC_ORIGINS)
    def test_the_public_site_is_allowed(self, origin):
        assert origin_allowed(FakeRequest({"Origin": origin}))

    @pytest.mark.parametrize("origin", [
        "http://localhost:8080",       # what the CI smoke job serves from
        "http://127.0.0.1:8000",
        "http://192.168.1.16:8768",    # LAN
        "http://10.0.0.5",
        "http://172.16.4.4",
        "http://100.75.220.87:8785",   # Tailscale CGNAT
        "http://magmacrunch-server.local",
    ])
    def test_development_hosts_are_allowed(self, origin):
        assert origin_allowed(FakeRequest({"Origin": origin}))

    @pytest.mark.parametrize("origin", [
        "https://evil.example",
        "https://magmacrunch.com.evil.example",   # suffix, not the real domain
        "http://100.1.2.3",                       # 100.x outside the CGNAT block
        "http://172.32.0.1",                      # just outside 172.16/12
        "null",                                   # file:// page or sandboxed iframe
        "file:///C:/tmp/index.html",
    ])
    def test_everything_else_is_refused(self, origin):
        assert not origin_allowed(FakeRequest({"Origin": origin}))

    def test_a_missing_origin_is_allowed(self):
        """Non-browser clients — health bots, the dashboard, these tests."""
        assert origin_allowed(FakeRequest({}))

    def test_extra_origins_are_honoured(self):
        req = FakeRequest({"Origin": "https://staging.example"})
        assert not origin_allowed(req)
        assert origin_allowed(req, extra=["https://staging.example"])

    def test_a_request_without_headers_does_not_raise(self):
        assert origin_allowed(object())


# ── Client identity ───────────────────────────────────────────────────────────

class TestClientIp:
    def test_x_real_ip_is_believed_from_loopback(self):
        """Everything arrives from 127.0.0.1 behind nginx; without this every
        visitor on the public site shares one rate-limit bucket."""
        conn = FakeConnection("127.0.0.1", FakeRequest({"X-Real-IP": "203.0.113.9"}))
        assert client_ip(conn) == "203.0.113.9"

    @pytest.mark.parametrize("peer", LOOPBACK)
    def test_every_loopback_form_is_recognised(self, peer):
        conn = FakeConnection(peer, FakeRequest({"X-Real-IP": "203.0.113.9"}))
        assert client_ip(conn) == "203.0.113.9"

    def test_a_lan_client_cannot_spoof_the_header(self):
        """A LAN client talks to the port directly, so it sets its own headers."""
        conn = FakeConnection("192.168.1.50", FakeRequest({"X-Real-IP": "1.2.3.4"}))
        assert client_ip(conn) == "192.168.1.50"

    def test_loopback_without_the_header_falls_back_to_the_peer(self):
        assert client_ip(FakeConnection("127.0.0.1", FakeRequest({}))) == "127.0.0.1"

    def test_whitespace_is_stripped(self):
        conn = FakeConnection("127.0.0.1", FakeRequest({"X-Real-IP": "  203.0.113.9  "}))
        assert client_ip(conn) == "203.0.113.9"

    def test_an_explicit_request_wins_over_the_connection(self):
        """process_request runs before connection.request is populated."""
        conn = FakeConnection("127.0.0.1", None)
        req = FakeRequest({"X-Real-IP": "203.0.113.9"})
        assert client_ip(conn, req) == "203.0.113.9"

    def test_no_peer_at_all_is_unknown(self):
        assert client_ip(FakeConnection(None)) == "unknown"


# ── Rate limiting ─────────────────────────────────────────────────────────────

class TestRateLimiter:
    def test_allows_up_to_the_cap_then_refuses(self):
        limiter = RateLimiter()
        assert all(limiter.check("k", 5, 10) for _ in range(5))
        assert not limiter.check("k", 5, 10)

    def test_keys_are_independent(self):
        limiter = RateLimiter()
        assert all(limiter.check("a", 2, 10) for _ in range(2))
        assert not limiter.check("a", 2, 10)
        assert limiter.check("b", 2, 10)

    def test_the_window_reopens(self):
        limiter = RateLimiter()
        assert limiter.check("k", 1, 10)
        assert not limiter.check("k", 1, 10)
        # A window is judged against its start time, so rewinding it is the same
        # as waiting, without making the suite sleep.
        start, count = limiter._windows["k"]
        limiter._windows["k"] = (start - 11, count)
        assert limiter.check("k", 1, 10)

    def test_prune_drops_only_stale_windows(self):
        limiter = RateLimiter()
        limiter.check("old", 5, 10)
        limiter.check("fresh", 5, 10)
        start, count = limiter._windows["old"]
        limiter._windows["old"] = (start - 999, count)
        limiter.prune(older_than=300)
        assert "old" not in limiter._windows
        assert "fresh" in limiter._windows


class TestConnectionRate:
    def test_returns_false_past_the_cap(self):
        """The bug this covers was not the return value but every caller
        discarding it. reject_request is what makes it load-bearing."""
        assert all(check_connection_rate("9.9.9.9", 10, 60) for _ in range(10))
        assert not check_connection_rate("9.9.9.9", 10, 60)

    def test_addresses_are_independent(self):
        assert all(check_connection_rate("1.1.1.1", 2, 60) for _ in range(2))
        assert not check_connection_rate("1.1.1.1", 2, 60)
        assert check_connection_rate("2.2.2.2", 2, 60)

    def test_old_connections_age_out_of_the_window(self):
        assert check_connection_rate("3.3.3.3", 1, 60)
        assert not check_connection_rate("3.3.3.3", 1, 60)
        connection_history["3.3.3.3"] = [t - 61 for t in connection_history["3.3.3.3"]]
        assert check_connection_rate("3.3.3.3", 1, 60)

    def test_a_refused_address_does_not_grow_unboundedly(self):
        for _ in range(50):
            check_connection_rate("4.4.4.4", 3, 60)
        assert len(connection_history["4.4.4.4"]) <= 3


class TestResetLimiters:
    def test_clears_both_stores(self):
        ip_limiter.check(("1.2.3.4", "chat"), 5, 10)
        check_connection_rate("1.2.3.4", 10, 60)
        assert ip_limiter._windows and connection_history
        reset_limiters()
        assert not ip_limiter._windows
        assert not connection_history
