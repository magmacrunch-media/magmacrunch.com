"""
Tests for arcade/shared/services.json and the admin dashboard's reader of it.

services.json replaced five handwritten copies of the arcade's service list, and
those copies had drifted apart in ways nothing caught: the chat panel had never
heard of Chess, start-all.sh never launched Aggravation, and the dashboard never
listed Counter. These tests cover the two things that let that happen —
consumers disagreeing about the list, and the list itself claiming things about
a service that are not true — plus the validation admin/server.py runs before
letting the manifest decide which systemd units it will restart.
"""

import importlib.util
import json
import sys
import types
from pathlib import Path

import pytest

ARCADE = Path(__file__).resolve().parents[2]
MANIFEST_PATH = ARCADE / "shared" / "services.json"

with MANIFEST_PATH.open(encoding="utf-8") as fh:
    MANIFEST = json.load(fh)

SERVICES = MANIFEST["services"]
DASHBOARD_ONLY = MANIFEST["dashboard_only"]


# ── Loading admin/server.py ──────────────────────────────────────────────────
# The dashboard imports magmascript, which only exists on the Pi — it is in
# arcade/requirements.txt but not in the root requirements.txt CI installs. Stub
# it so the manifest reader can be tested anywhere; nothing here calls into it.

def _load_admin_server():
    for name in ("magmascript", "magmascript.core", "magmascript.core.config"):
        sys.modules.setdefault(name, types.ModuleType(name))
    magmascript = sys.modules["magmascript"]
    for attr in ("GHClient", "MC1Client", "PIClient"):
        setattr(magmascript, attr, type(attr, (), {}))
    magmascript.core = sys.modules["magmascript.core"]
    config = sys.modules["magmascript.core.config"]
    config.set_config = lambda *args, **kwargs: None
    config.Config = type("Config", (), {})
    sys.modules["magmascript.core"].config = config

    spec = importlib.util.spec_from_file_location(
        "arcade_admin_server", ARCADE / "admin" / "server.py"
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


admin = _load_admin_server()


# ── The manifest describes real services ─────────────────────────────────────

@pytest.mark.parametrize("svc", SERVICES, ids=lambda s: s["id"])
def test_started_service_has_every_field_its_consumers_read(svc):
    for field in ("id", "name", "kind", "dir", "exec", "port", "unit", "icon"):
        assert svc.get(field), "{} is missing {}".format(svc.get("id"), field)
    assert "path" in svc, "path may be null, but it must be present"


@pytest.mark.parametrize("svc", SERVICES, ids=lambda s: s["id"])
def test_started_service_exists_and_takes_a_port_flag(svc):
    """start-all.sh runs python3 <exec> --port <port>, so both must be real.

    This is the check that keeps arcade-private out of "services": its
    private/server.py reads the port from config.json and would reject --port.
    """
    entry = ARCADE / svc["dir"] / svc["exec"]
    assert entry.is_file(), "{}: no such file as {}".format(svc["id"], entry)
    assert "--port" in entry.read_text(encoding="utf-8"), (
        "{}: {} does not accept --port, so start-all.sh cannot launch it".format(
            svc["id"], svc["exec"]
        )
    )


@pytest.mark.parametrize("svc", SERVICES, ids=lambda s: s["id"])
def test_started_service_has_a_systemd_unit(svc):
    units = list(ARCADE.rglob(svc["unit"] + ".service"))
    assert units, "{}: no {}.service anywhere under arcade/".format(
        svc["id"], svc["unit"]
    )


@pytest.mark.parametrize("svc", DASHBOARD_ONLY, ids=lambda s: s["id"])
def test_dashboard_only_service_claims_nothing_startable(svc):
    """No dir/exec here on purpose — start-all.sh has nothing to launch.

    If one of these grows a dir/exec it probably belongs in "services", but read
    the manifest's note first: moving it there also hands it to the health bot,
    which turns it into a new "service down" alert path.
    """
    assert "dir" not in svc and "exec" not in svc
    for field in ("id", "name", "port", "unit", "icon"):
        assert svc.get(field), "{} is missing {}".format(svc.get("id"), field)


def test_ids_units_and_ports_are_unique_across_both_arrays():
    everything = SERVICES + DASHBOARD_ONLY
    for field in ("id", "unit", "port"):
        values = [svc[field] for svc in everything]
        assert len(values) == len(set(values)), "duplicate {} in manifest".format(field)


def test_paths_match_the_nginx_proxy_blocks():
    conf = (ARCADE / "scripts" / "nginx-magmacrunch.conf").read_text(encoding="utf-8")
    for svc in SERVICES:
        if not svc["path"] or svc["path"] == "/":
            continue
        assert "location {} ".format(svc["path"]) in conf, (
            "{}: no location {} block in the nginx conf".format(svc["id"], svc["path"])
        )
        assert "127.0.0.1:{}".format(svc["port"]) in conf, (
            "{}: nginx does not proxy anything to :{}".format(svc["id"], svc["port"])
        )


# ── The dashboard reads the same list ────────────────────────────────────────

def test_dashboard_renders_a_card_for_every_service():
    assert [svc["unit"] for svc in admin.SERVICES] == [
        svc["unit"] for svc in SERVICES + DASHBOARD_ONLY
    ]


def test_dashboard_keeps_only_the_fields_it_renders():
    for svc in admin.SERVICES:
        assert set(svc) == {"name", "unit", "port", "icon"}


def test_counter_is_no_longer_missing_from_the_dashboard():
    """The drift this change fixes: every other consumer had Counter, admin did not."""
    assert "arcade-counter" in admin.VALID_UNITS


def test_restart_allowlist_is_the_manifest_plus_the_dashboard_itself():
    expected = {svc["unit"] for svc in SERVICES + DASHBOARD_ONLY} | {"arcade-admin"}
    assert admin.VALID_UNITS == expected
    assert admin.valid_unit("arcade-admin")
    assert not admin.valid_unit("ssh")
    assert not admin.valid_unit("arcade-chat; reboot")
    assert not admin.valid_unit("")


# ── The allowlist does not trust the file it comes from ──────────────────────

def _write(tmp_path, services, dashboard_only=None):
    path = tmp_path / "services.json"
    payload = {"services": services}
    if dashboard_only is not None:
        payload["dashboard_only"] = dashboard_only
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


GOOD = {"id": "x", "name": "X", "port": 9999, "unit": "arcade-x", "icon": "X"}


def test_loader_accepts_a_minimal_manifest(tmp_path):
    loaded = admin._load_services(_write(tmp_path, [GOOD]))
    assert loaded == [{"name": "X", "unit": "arcade-x", "port": 9999, "icon": "X"}]


def test_loader_does_not_require_dashboard_only(tmp_path):
    assert len(admin._load_services(_write(tmp_path, [GOOD]))) == 1


@pytest.mark.parametrize("unit", [
    "ssh",                    # outside the arcade namespace entirely
    "docker",
    "arcade-chat.service",    # systemctl would take it, the regex must not
    "arcade-chat foo",
    "arcade-chat;reboot",
    "arcade-../../evil",
    "arcade-",
    "arcade-Chat",            # units on the Pi are lowercase
    "Arcade-chat",
    "",
    None,
    123,
])
def test_loader_refuses_units_outside_the_arcade_namespace(tmp_path, unit):
    with pytest.raises(ValueError):
        admin._load_services(_write(tmp_path, [dict(GOOD, unit=unit)]))


def test_loader_refuses_a_unit_listed_twice(tmp_path):
    with pytest.raises(ValueError):
        admin._load_services(_write(tmp_path, [GOOD], [dict(GOOD, id="y")]))


@pytest.mark.parametrize("port", [0, -1, 65536, "8765", None, True])
def test_loader_refuses_a_port_that_is_not_a_port(tmp_path, port):
    with pytest.raises(ValueError):
        admin._load_services(_write(tmp_path, [dict(GOOD, port=port)]))


@pytest.mark.parametrize("field", ["name", "icon"])
@pytest.mark.parametrize("value", [
    "<img src=x onerror=alert(1)>",
    "Chat & Co",
    'a"b',
    "a'b",
])
def test_loader_refuses_markup_in_interpolated_fields(tmp_path, field, value):
    """static/arcade.js and static/status.js drop name and icon into innerHTML."""
    with pytest.raises(ValueError):
        admin._load_services(_write(tmp_path, [dict(GOOD, **{field: value})]))


@pytest.mark.parametrize("field", ["name", "icon"])
@pytest.mark.parametrize("value", ["", "   ", None, 7])
def test_loader_refuses_a_missing_rendered_field(tmp_path, field, value):
    with pytest.raises(ValueError):
        admin._load_services(_write(tmp_path, [dict(GOOD, **{field: value})]))


def test_loader_refuses_an_empty_manifest(tmp_path):
    with pytest.raises(ValueError):
        admin._load_services(_write(tmp_path, []))


def test_loader_refuses_entries_that_are_not_objects(tmp_path):
    with pytest.raises(ValueError):
        admin._load_services(_write(tmp_path, ["arcade-x"]))


def test_loader_refuses_a_manifest_with_no_services_key(tmp_path):
    path = tmp_path / "services.json"
    path.write_text(json.dumps({"dashboard_only": [GOOD]}), encoding="utf-8")
    with pytest.raises((KeyError, ValueError)):
        admin._load_services(path)


def test_loader_refuses_a_file_that_is_not_json(tmp_path):
    path = tmp_path / "services.json"
    path.write_text("arcade-sorry 8765", encoding="utf-8")
    with pytest.raises(json.JSONDecodeError):
        admin._load_services(path)


def test_loader_refuses_a_missing_file(tmp_path):
    with pytest.raises(FileNotFoundError):
        admin._load_services(tmp_path / "nope.json")
