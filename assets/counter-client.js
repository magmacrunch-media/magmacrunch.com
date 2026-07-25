/**
 * counter-client.js — Retro hit counter client for magmacrunch.com
 *
 * Connects to the counter server on the Raspberry Pi via WebSocket.
 * Two modes:
 *   1. Increment mode (nav.js): fire-and-forget increment on page load
 *   2. Display mode (guestbook): render retro LED counter, live updates
 *
 * Usage:
 *   // In nav.js — increment on every page load (invisible)
 *   CounterClient.increment();
 *
 *   // On guestbook page — display the counter
 *   CounterClient.display('#hit-counter');
 *
 * Falls back to localStorage-cached count when Pi is unreachable.
 */

var CounterClient = (function () {
    'use strict';

    var LS_KEY = 'mc_counter_cache';
    var INCREMENT_KEY = 'mc_counter_incremented';
    var SESSION_KEY = 'mc_counter_session';

    // ── Host detection ──────────────────────────────────────────────────────

    function _getWsUrl() {
        try {
            var param = new URLSearchParams(window.location.search).get('counter-server');
            if (param) return 'ws://' + param;
        } catch (e) {}

        var h = window.location.hostname;
        if (h === 'localhost' || h === '127.0.0.1') return 'ws://192.168.1.16:8783';
        return 'ws://magmacrunch.duckdns.org:8783';
    }

    // ── State ───────────────────────────────────────────────────────────────

    var _ws = null;
    var _connected = false;
    var _displayCallback = null;
    var _reconnectTimer = null;
    var _currentCount = 0;

    // ── localStorage helpers ────────────────────────────────────────────────

    function _lsGetCount() {
        try {
            return parseInt(localStorage.getItem(LS_KEY), 10) || 0;
        } catch (e) {
            return 0;
        }
    }

    function _lsSetCount(n) {
        try {
            localStorage.setItem(LS_KEY, String(n));
        } catch (e) {}
    }

    function _hasIncrementedThisSession() {
        try {
            return sessionStorage.getItem(INCREMENT_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function _markIncremented() {
        try {
            sessionStorage.setItem(INCREMENT_KEY, '1');
        } catch (e) {}
    }

    // ── WebSocket ───────────────────────────────────────────────────────────

    function _connect() {
        if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        try {
            _ws = new WebSocket(_getWsUrl());
        } catch (e) {
            _connected = false;
            _scheduleReconnect();
            return;
        }

        _ws.onopen = function () {
            _connected = true;
            // If in display mode, request the current count
            if (_displayCallback) {
                _ws.send(JSON.stringify({ action: 'get_count' }));
            }
        };

        _ws.onmessage = function (evt) {
            var data;
            try {
                data = JSON.parse(evt.data);
            } catch (e) {
                return;
            }
            if (data.type === 'count' && typeof data.count === 'number') {
                _currentCount = data.count;
                _lsSetCount(data.count);
                if (_displayCallback) _displayCallback(data.count);
            }
        };

        _ws.onclose = function () {
            _connected = false;
            _scheduleReconnect();
        };

        _ws.onerror = function () {
            _connected = false;
        };
    }

    function _scheduleReconnect() {
        if (_reconnectTimer) return;
        _reconnectTimer = setTimeout(function () {
            _reconnectTimer = null;
            if (!_connected) _connect();
        }, 5000);
    }

    function _send(msg) {
        if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
        _ws.send(JSON.stringify(msg));
    }

    // ── Public API ──────────────────────────────────────────────────────────

    return {
        /**
         * Increment the counter (fire-and-forget).
         * Called by nav.js on every page load.
         * Debounced per session — won't double-count SPA back/forward.
         */
        increment: function () {
            if (_hasIncrementedThisSession()) return;
            _markIncremented();
            _connect();
            // Wait briefly for connection, then send
            setTimeout(function () {
                _send({ action: 'increment' });
            }, 500);
        },

        /**
         * Display the counter in a DOM element.
         * Called by guestbook.html.
         * @param {string} selector — CSS selector for the container element
         */
        display: function (selector) {
            var container = document.querySelector(selector);
            if (!container) return;

            _displayCallback = function (count) {
                var digits = String(count).padStart(6, '0');
                var html = '<div class="hit-counter">' +
                    '<div class="hit-counter-label">TOTAL VISITORS</div>' +
                    '<div class="hit-counter-digits">';
                for (var i = 0; i < digits.length; i++) {
                    html += '<span class="hit-counter-digit">' + digits[i] + '</span>';
                }
                html += '</div></div>';
                container.innerHTML = html;
            };

            // Show cached count immediately, then update via WebSocket
            var cached = _lsGetCount();
            if (cached > 0) _displayCallback(cached);

            _connect();
        }
    };
})();
