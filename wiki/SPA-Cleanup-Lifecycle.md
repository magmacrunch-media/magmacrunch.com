How pages register cleanup functions that run before SPA navigation.

## The Pattern

```js
window.__pageCleanup = function() {
    // Save state, pause audio, clear intervals, etc.
};
```

The SPA router calls this function before every navigation:

```js
// nav.js line 578
if (typeof window.__pageCleanup === 'function') {
    window.__pageCleanup();
    window.__pageCleanup = null;
}
```

After calling it, the router sets it to `null` so it only runs once.

## Existing Implementations

### Jukebox (`assets/jukebox.js`)

Saves playback state and pauses audio:

```js
window.__pageCleanup = function() {
    stopSaveInterval();
    if (audio && isPlaying) {
        saveState();
        audio.pause();
    }
};
```

### Guestbook (`home/guestbook.html`)

Stops the 30-second polling interval:

```js
const gbPollId = setInterval(loadEntries, 30000);
window.__pageCleanup = function() { clearInterval(gbPollId); };
```

### Homepage (`index.html`)

Stops the animated canvas (volcano scene):

```js
window.__pageCleanup = function() {
    cancelAnimationFrame(rafId);
};
```

### Scientific Pages

Stops MathJax observers:

```js
window.__pageCleanup = function() {
    if (window.MathJax && MathJax.startup && MathJax.startup.promise) {
        // MathJax cleanup
    }
};
```

## Why It Matters

Without cleanup:
- Audio keeps playing during navigation
- Polling intervals keep firing
- Canvas animations keep running
- Memory leaks accumulate

## Adding Cleanup to a New Page

1. Register `window.__pageCleanup` after your page initializes
2. Clean up everything that runs asynchronously: intervals, timeouts, animation frames, audio, WebSocket connections
3. The SPA router handles the rest — it calls your function, then nulls it out

```js
// Example: page with a timer
const timerId = setInterval(updateDisplay, 1000);
window.__pageCleanup = function() {
    clearInterval(timerId);
};
```

## Notes

- `window.__pageCleanup` is checked via `typeof ... === 'function'`, so it's safe to not define it
- Only one cleanup function per page — if you need multiple, wrap them in one function
- Full page loads (non-SPA) don't call cleanup — the browser handles that natively
- The router also sets `window.__mcPageAborted = true` during navigation to abort in-flight requests 
