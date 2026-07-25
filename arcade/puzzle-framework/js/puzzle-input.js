/**
 * puzzle-input.js — Keyboard and touch input handling
 * Provides: Arrow key support, touch swipe detection, event cleanup
 */

var PuzzleInput = (function() {

    /**
     * Create a new PuzzleInput handler
     * @param {object} callbacks - { onMove: function(direction), isActive: function() }
     * @param {HTMLElement} boardElement - Element to attach touch events to
     */
    function create(callbacks, boardElement) {
        var touchStartX = 0;
        var touchStartY = 0;
        var SWIPE_THRESHOLD = 30;
        var listeners = [];

        function onKeyDown(e) {
            if (!callbacks.isActive()) return;

            var direction = null;
            switch (e.key) {
                case 'ArrowUp':    direction = 'up'; break;
                case 'ArrowDown':  direction = 'down'; break;
                case 'ArrowLeft':  direction = 'left'; break;
                case 'ArrowRight': direction = 'right'; break;
            }

            if (direction) {
                e.preventDefault();
                callbacks.onMove(direction);
            }
        }

        function onTouchStart(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }

        function onTouchEnd(e) {
            if (!callbacks.isActive()) return;

            var dx = e.changedTouches[0].clientX - touchStartX;
            var dy = e.changedTouches[0].clientY - touchStartY;
            var absDx = Math.abs(dx);
            var absDy = Math.abs(dy);

            if (Math.max(absDx, absDy) > SWIPE_THRESHOLD) {
                var direction;
                if (absDx > absDy) {
                    direction = dx > 0 ? 'right' : 'left';
                } else {
                    direction = dy > 0 ? 'down' : 'up';
                }
                callbacks.onMove(direction);
            }
        }

        function setup() {
            document.addEventListener('keydown', onKeyDown);
            listeners.push({ element: document, event: 'keydown', handler: onKeyDown });

            if (boardElement) {
                boardElement.addEventListener('touchstart', onTouchStart, { passive: true });
                boardElement.addEventListener('touchend', onTouchEnd);
                listeners.push({ element: boardElement, event: 'touchstart', handler: onTouchStart });
                listeners.push({ element: boardElement, event: 'touchend', handler: onTouchEnd });
            }
        }

        function destroy() {
            for (var i = 0; i < listeners.length; i++) {
                listeners[i].element.removeEventListener(
                    listeners[i].event,
                    listeners[i].handler
                );
            }
            listeners = [];
        }

        setup();

        return {
            destroy: destroy
        };
    }

    return {
        create: create
    };

})();
