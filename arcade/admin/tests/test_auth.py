"""The admin socket is also the public score backend, so its gate must not
depend on configuration. See PUBLIC_ACTIONS in admin/server.py.

Until 2026-10-15 the Pi ran this server with no config.json, the gate was off,
and every dashboard action answered the internet. These tests pin the fix: the
games' actions stay open, everything else needs a session, and a server with no
real password lets nobody log in.
"""
import importlib.util
import sys
import types
from pathlib import Path

import pytest

ADMIN = Path(__file__).resolve().parents[1]


def _load():
    # server.py imports magmascript, which only exists on the Pi. Stub it, as
    # arcade/shared/tests/test_services.py does; nothing here calls into it.
    for name in ("magmascript", "magmascript.core", "magmascript.core.config"):
        sys.modules.setdefault(name, types.ModuleType(name))
    ms = sys.modules["magmascript"]
    for attr in ("GHClient", "MC1Client", "PIClient"):
        setattr(ms, attr, type(attr, (), {}))
    ms.core = sys.modules["magmascript.core"]
    cfg = sys.modules["magmascript.core.config"]
    cfg.set_config = lambda *a, **k: None
    cfg.Config = type("Config", (), {})
    sys.modules["magmascript.core"].config = cfg
    spec = importlib.util.spec_from_file_location("arcade_admin_server_auth", ADMIN / "server.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


admin = _load()

GAME_ACTIONS = ["score_load", "score_save", "scores_all"]
DANGEROUS = [
    "poweroff_pi", "restart_pi", "restart_all", "score_reset", "api_keys_load",
    "api_keys_save", "themes_save", "github_deploy_themes", "github_deploy_jukebox",
    "github_deploy_tv", "get_current_private_password", "change_private_password",
    "change_password", "logs", "nginx_traffic", "bots_trigger", "status", "system_info",
]


@pytest.fixture(autouse=True)
def clean_state():
    admin.CONFIG.clear()
    admin.authenticated_sessions.clear()
    yield
    admin.CONFIG.clear()
    admin.authenticated_sessions.clear()


@pytest.mark.parametrize("action", GAME_ACTIONS)
def test_the_games_need_no_login(action):
    assert not admin.needs_login(action, None)


@pytest.mark.parametrize("action", DANGEROUS)
def test_everything_else_needs_a_session(action):
    assert admin.needs_login(action, None)
    assert admin.needs_login(action, "made-up-token")


@pytest.mark.parametrize("action", DANGEROUS)
def test_a_session_unlocks_it(action):
    admin.authenticated_sessions.add("real-token")
    assert not admin.needs_login(action, "real-token")


def test_the_old_auth_flag_cannot_open_the_gate():
    admin.CONFIG.update({"auth": False, "password": "a-long-enough-password"})
    assert admin.needs_login("poweroff_pi", None)


@pytest.mark.parametrize("config", [
    {},                                  # no config.json: the state the Pi was in
    {"password": ""},
    {"password": "changeme"},            # the old placeholder
    {"password": "short"},
    {"password": None},
])
def test_no_usable_password_means_no_login(config):
    admin.CONFIG.update(config)
    assert admin.admin_password() is None
    assert not admin.check_login("")
    assert not admin.check_login("changeme")
    assert not admin.check_login(config.get("password") or "")


def test_the_right_password_logs_in_and_only_it():
    admin.CONFIG["password"] = "correct horse battery"
    assert admin.check_login("correct horse battery")
    assert not admin.check_login("correct horse batter")
    assert not admin.check_login("")


def test_defaults_are_closed():
    admin.CONFIG.update(admin.DEFAULT_CONFIG)
    assert admin.admin_password() is None
