# Widget changes for adenosine — arcade chat presence

Companion to the server-side presence fixes in `arcade/chat-server.py`. Everything
below lands in the [adenosine](https://github.com/magmacrunch-media/adenosine) repo
and reaches this one only through `npm run build:adenosine`. Editing
`arcade/shared/adenosine-chat.js` or `arcade/shared/chat-worker.js` here works
until the next sync and is then silently overwritten.

Line numbers refer to the synced copies as of this writing.

## Already fixed server-side (no widget work needed)

- Every socket is sent `user_list` on connect, so the count is correct from the
  first frame rather than waiting on a `set_name` that may be silently rate
  limited.
- `attach_socket` no longer leaves a socket in two sessions, which was creating
  roster entries that never expired.
- `broadcast_global_users` is gone. The `case "global_users":` arm at
  `adenosine-chat.js:438` is now unreachable and should be deleted with change 1
  — it writes a raw socket count into the same counter as `user_list`, so if the
  frame ever returned it would double-count anyone with two tabs open.

## 1. Reset the count when the connection drops — required

**Problem.** `updateOnlineCount` is only called from the `user_list` and
`global_users` arms of `handleMessage`. The `_worker: "disconnect"` branch
(`adenosine-chat.js:356`) adds a CSS class and returns. So when the socket dies
the last number stays on screen, indefinitely, next to a widget that is visibly
disconnected. Combined with the server not sending a roster on connect, this is
the "3 people online" report — a number from a moment that had passed.

**Change.** In the `_worker: "disconnect"` branch, blank the count and empty the
online list:

```js
if (msg._worker === "disconnect") {
  widgetEl.classList.add("disconnected");
  updateOnlineCount(0);
  updateOnlineList([]);
  return;
}
```

Prefer rendering `0` as an em dash or hiding the badge while disconnected —
"0 online" is a claim about the arcade, and what you actually know is that you
cannot see it. `updateOnlineList([])` matters as much as the count: the ONLINE
tab otherwise keeps showing names that are no longer connected.

Also delete the `case "global_users":` arm while here.

**Test.** Open two browsers, stop `arcade-chat`, confirm both widgets go to
`—` rather than holding their last number, restart, confirm both recover.

## 2. Stop counting visitors who never opened the chat — recommended

**Problem.** `sendSavedCredentials` (`adenosine-chat.js:337`) sends
`set_name` with `name: myName || "Player"` on every connect. A visitor who loads
one arcade page and never touches the widget is registered, named `PlayerNN` by
`get_unique_name`, and counted. The roster therefore measures page loads, not
participants — which is also why the number feels wrong even when it is
arithmetically right.

**Change.** Send `set_name` only once the visitor has a name of their own —
`myName` restored from `localStorage`, or set through `setName()`. Until then,
connect and listen without naming yourself. The server already supports this:
a socket with no session receives history, status and the roster, and simply is
not in it (`session_of(websocket) is None` gates posting and room joins).

```js
function sendSavedCredentials() {
  if (!myName) return;                     // lurker: connected, not present
  var token = getSessionToken();
  var nameMsg = { type: "set_name", name: myName };
  if (token) nameMsg["session_token"] = token;
  sendToServer(nameMsg);
  if (myColor) sendToServer({ type: "set_color", color: myColor });
}
```

Then call `sendSavedCredentials()` again from `setName()` so the first name the
visitor chooses registers them.

**Watch for.** `send()` and `joinRoom()` currently assume a session exists. Both
need to name the visitor first if `myName` is unset — prompting for a name on
first send is the natural place, and it removes the `PlayerNN` names entirely.
Check every call site of `sendToServer` that the server gates behind
`session_of(websocket)`: `chat`, `room_chat`, `join_room`, `leave_room`,
`typing`.

**Alternative if you want lurkers visible**, which is defensible for an arcade —
keep sending `set_name` but have the server distinguish named from unnamed
sessions and report both, so the widget can show "2 chatting · 5 browsing".
That needs a server change too: a `named: bool` on the session, set when
`set_name` arrives with a non-empty name the visitor actually chose.

## 3. Mark people away when the tab is hidden — recommended

**Problem.** There is no `visibilitychange` handler anywhere in the widget. The
server's liveness check is WebSocket protocol ping/pong (`PING_INTERVAL` 20,
`PING_TIMEOUT` 20), which the browser's network stack answers without waking the
page. A phone in a pocket with a backgrounded arcade tab is indistinguishable
from someone sitting at the keyboard, and counts as online for hours.

**Change.** Track visibility in the page, not the worker — the SharedWorker is
shared across tabs and cannot tell which of them the user is looking at:

```js
document.addEventListener("visibilitychange", function () {
  sendToServer({ type: "presence", state: document.hidden ? "away" : "here" });
});
```

Server side, add a `presence` handler that sets `info['away']` and rebroadcasts
the roster, plus an idle timer that flips a session to away after a few minutes
of no `presence`, `chat` or `typing`. Report away users in `user_list_message()`
with an `away: true` flag and exclude them from `count`, so the widget can grey
them in the ONLINE tab while the badge shows only people actually there.

Rate limit `presence` per IP like the other actions — tab switching is
high-frequency, and `ip_limiter.check((ip, "presence"), ...)` is the existing
pattern. Debounce in the widget too; a fast alt-tab should not emit a frame.

**Note.** With a SharedWorker, "hidden" must be true for *every* tab before the
person is away. Either track a per-port visibility map in the worker, or have
each page send its own state and let the server treat any `here` as here.

## 4. Cross-device identity — only if you want it

The session token is `localStorage`, which is per-origin, so the same person on
the LAN, on magmacrunch.com and on a phone is three sessions. That is inherent to
the storage.

**Do not key identity on IP address.** Behind nginx the server reads `X-Real-IP`
(`server_base.client_ip`), so the address is available — but NAT collapses a
whole household or office into one identity that would inherit name, color and
room membership from whoever connected first; mobile CGNAT addresses are shared
by many subscribers and change between towers; and IPv6 privacy extensions
rotate daily. It is also the same credential-handoff shape the `?server=`
allowlist exists to prevent: the widget replays saved credentials the moment the
socket opens, so an address-keyed identity hands your name and your rooms to
whoever holds that address next.

If cross-device identity is actually wanted, the honest version is an explicit
claim: the widget shows a short code, entering it on the second device asks the
server to merge that device's token into the same identity. Server side that is
a `claim` message, a short-lived code table, and merging one session's token into
another's — small, and it fails closed.

## Order

1 first and alone: it is two lines, it needs no server change, and it fixes the
symptom. 3 next — it is what makes the number mean "people here" rather than
"tabs open". 2 after that, since it changes what the arcade feels like and is
worth deciding on deliberately. 4 only on request.
