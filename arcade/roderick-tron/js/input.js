// input.js — Roderick Tron | MagmaCrunch Media © 2026
// Keyboard input tracking

const Input = {
    keys: {},
    justPressed: {},

    init() {
        document.addEventListener('keydown', (e) => {
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

    jump()    { return this.wasPressed('Space') || this.wasPressed('ArrowUp'); },
    shoot()   { return this.wasPressed('KeyZ'); },
};
