"""Browser stand-in for tkinter, backing the texastoast playground.

Written into Pyodide's filesystem as /home/pyodide/tkinter.py so that
`import tkinter` inside the embedded texastoast package resolves here
instead of the stdlib module (which has no _tkinter in Pyodide).

Only the surface texastoast actually uses is provided:

  Tk      -- title/resizable/protocol/bind/unbind/after/after_cancel/
             quit/destroy/mainloop
  Canvas  -- pack/delete/create_rectangle/create_text/create_image
  TclError, Misc, PhotoImage, anchor constants, Event(keysym)

Drawing calls forward to the JS host object ``globalThis.__ttHost``
(defined in app.js), which keeps a retained display list on a real
<canvas> -- tkinter is retained-mode, so per-tag delete() has to filter
a list, not erase pixels. after() maps to setTimeout; mainloop() cannot
block in WASM and returns immediately, with the game driven by the
after() chain that GameLoop already runs on.
"""

from __future__ import annotations

import js
from pyodide.ffi import create_once_callable, create_proxy

# Module-level alias: inside a class body, ``js.__ttHost`` would be
# name-mangled to ``js._ClassName__ttHost`` and miss the JS global.
_HOST = js.__ttHost

__tt_shim__ = True

# Anchor constants -- tkinter defines these as lowercase strings.
N = "n"
S = "s"
E = "e"
W = "w"
NE = "ne"
NW = "nw"
SE = "se"
SW = "sw"
CENTER = "center"

# Proxies handed to JS whose call may still be on the stack when their
# owner is torn down (a menu Quit handler runs inside a key dispatch).
# They are parked here and destroyed at the start of the next run.
_graveyard: list = []
_current_tk: "Tk | None" = None


def _bury(proxy) -> None:
    if proxy is not None:
        _graveyard.append(proxy)


def _clear_graveyard() -> None:
    while _graveyard:
        proxy = _graveyard.pop()
        try:
            proxy.destroy()
        except Exception:
            pass


class TclError(Exception):
    pass


class Misc:
    """Annotation-only placeholder (texastoast type-hints tk.Misc)."""


class PhotoImage:
    def __init__(self, *args, **kwargs):
        raise RuntimeError(
            "PhotoImage is not available in the browser playground -- "
            "SpriteSheet and image drawing need a desktop Python install"
        )


class Event:
    def __init__(self, keysym: str):
        self.keysym = keysym
        self.char = keysym if len(keysym) == 1 else ""


def _parse_sequence(sequence: str) -> tuple[str, str | None]:
    """'<KeyPress-z>' -> ('press', 'z'); '<Key>' -> ('press', None)."""
    inner = sequence[1:-1] if sequence.startswith("<") and sequence.endswith(">") else sequence
    if inner.startswith("KeyRelease"):
        kind = "release"
        rest = inner[len("KeyRelease"):]
    elif inner.startswith("KeyPress"):
        kind = "press"
        rest = inner[len("KeyPress"):]
    elif inner == "Key":
        return "press", None
    else:
        # Unsupported sequence (mouse etc.) -- register under a kind that
        # never fires rather than failing the bind call.
        return "other", inner
    detail = rest[1:] if rest.startswith("-") else None
    return kind, detail


class Tk:
    def __init__(self):
        global _current_tk
        if _current_tk is not None:
            _current_tk._teardown()
        _clear_graveyard()
        _current_tk = self

        # kind -> {detail-or-None: [(funcid, callback), ...]}
        self._handlers: dict[str, dict[str | None, list]] = {
            "press": {}, "release": {}, "other": {},
        }
        self._funcid = 0
        self._afters: dict = {}
        self._dispatch_proxy = create_proxy(self._on_key)
        self._close_proxy = None
        self._alive = True
        _HOST.reset()
        _HOST.setDispatch(self._dispatch_proxy)

    # -- window chrome ------------------------------------------------

    def title(self, text: str):
        _HOST.setTitle(str(text))

    def resizable(self, *args, **kwargs):
        pass

    def protocol(self, name: str, callback=None):
        if name == "WM_DELETE_WINDOW" and callback is not None:
            _bury(self._close_proxy)
            self._close_proxy = create_proxy(callback)
            _HOST.setCloseHandler(self._close_proxy)

    # -- key bindings -------------------------------------------------

    def bind(self, sequence: str, callback) -> str:
        kind, detail = _parse_sequence(sequence)
        self._funcid += 1
        funcid = str(self._funcid)
        self._handlers[kind].setdefault(detail, []).append((funcid, callback))
        return funcid

    def unbind(self, sequence: str, funcid: str | None = None):
        kind, detail = _parse_sequence(sequence)
        table = self._handlers[kind]
        entries = table.get(detail)
        if entries is None:
            return
        if funcid is None:
            entries.clear()
        else:
            table[detail] = [(f, cb) for f, cb in entries if f != funcid]

    def _on_key(self, kind: str, keysym: str):
        if not self._alive:
            return
        table = self._handlers.get(kind)
        if not table:
            return
        event = Event(keysym)
        # Specific bindings first, then the <Key> catch-all -- both fire,
        # matching tkinter's bind behaviour for our flat use case.
        for detail in (keysym, None):
            for _funcid, callback in list(table.get(detail, ())):
                callback(event)

    # -- scheduling ---------------------------------------------------

    def after(self, ms, callback):
        box: list = []

        def _fire():
            if box:
                self._afters.pop(box[0], None)
            callback()

        proxy = create_once_callable(_fire)
        after_id = _HOST.after(int(ms), proxy)
        box.append(after_id)
        self._afters[after_id] = proxy
        return after_id

    def after_cancel(self, after_id):
        _HOST.afterCancel(after_id)
        proxy = self._afters.pop(after_id, None)
        if proxy is not None:
            try:
                proxy.destroy()
            except Exception:
                pass

    # -- lifecycle ----------------------------------------------------

    def mainloop(self):
        # Cannot block in WASM; the after() chain drives the game.
        pass

    def quit(self):
        pass

    def destroy(self):
        self._teardown()

    def _teardown(self):
        global _current_tk
        if not self._alive:
            return
        self._alive = False
        for after_id, proxy in list(self._afters.items()):
            _HOST.afterCancel(after_id)
            _bury(proxy)
        self._afters.clear()
        _bury(self._dispatch_proxy)
        _bury(self._close_proxy)
        self._dispatch_proxy = None
        self._close_proxy = None
        _HOST.teardown()
        if _current_tk is self:
            _current_tk = None


def _tag_string(tags) -> str:
    if not tags:
        return ""
    if isinstance(tags, (tuple, list)):
        return ",".join(str(t) for t in tags)
    return str(tags)


def _css_font(font) -> str:
    """('Courier', 10, 'bold') -> 'bold 13px ...' (tk points -> px @96dpi)."""
    size_pt = 10
    bold = ""
    if isinstance(font, (tuple, list)):
        if len(font) > 1:
            try:
                size_pt = int(font[1])
            except (TypeError, ValueError):
                pass
        if any("bold" in str(part).lower() for part in font[2:]):
            bold = "bold "
    elif isinstance(font, str) and font:
        parts = font.split()
        for part in parts[1:]:
            if part.isdigit():
                size_pt = int(part)
            elif part.lower() == "bold":
                bold = "bold "
    size_px = max(1, round(size_pt * 4 / 3))
    return f"{bold}{size_px}px 'Courier Prime', Courier, monospace"


class Canvas:
    def __init__(self, master=None, width=640, height=480, bg="#000000",
                 highlightthickness=0, **kwargs):
        self._width = int(width)
        self._height = int(height)
        _HOST.initCanvas(self._width, self._height, str(bg))

    def pack(self, *args, **kwargs):
        pass

    def delete(self, *tags):
        _HOST.deleteItems(",".join(str(t) for t in tags) or "all")

    def create_rectangle(self, x1, y1, x2, y2, fill="", outline="black",
                         width=1, tags="", **kwargs):
        return _HOST.rect(
            float(x1), float(y1), float(x2), float(y2),
            str(fill or ""), str(outline or ""), float(width),
            _tag_string(tags),
        )

    def create_text(self, x, y, text="", fill="black", font=None,
                    anchor="center", width=0, tags="", **kwargs):
        return _HOST.text(
            float(x), float(y), str(text), str(fill or ""),
            _css_font(font), str(anchor or "center"), float(width or 0),
            _tag_string(tags),
        )

    def create_image(self, x, y, image=None, anchor="nw", tags="", **kwargs):
        raise RuntimeError(
            "create_image is not available in the browser playground"
        )

    def winfo_width(self):
        return self._width

    def winfo_height(self):
        return self._height
