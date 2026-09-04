// input.js — Roderick Tron | MagmaCrunch Media © 2026
// Keyboard input tracking

const Input = {
    keys: {},
    justPressed: {},

    init() {
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            if (!this.keys[e.code]) {
                this.justPressed[e.code] = true;
            }
            this.keys[e.code] = true;
            if (['Space', 'KeyZ', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
                e.preventDefault();
            }
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        // A tabbed-away window never sees the keyup, so the key would read as
        // held forever and the next jump would be cut short on the first frame.
        window.addEventListener('blur', () => {
            this.keys = {};
            this.justPressed = {};
        });
    },

    isDown(code) {
        return !!this.keys[code];
    },

    wasPressed(code) {
        if (this.justPressed[code]) {
            this.justPressed[code] = false;
            return true;
        }
        return false;
    },

    clearJustPressed() {
        this.justPressed = {};
    },

    jump()     { return this.wasPressed('Space') || this.wasPressed('ArrowUp'); },
    jumpHeld() { return this.isDown('Space') || this.isDown('ArrowUp'); },
    shoot()    { return this.wasPressed('KeyZ'); },
};
