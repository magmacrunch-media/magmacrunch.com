// config.js — Roderick Tron | MagmaCrunch Media © 2026
// All constants, palette, difficulty curve

const CONFIG = {
    CANVAS_W: 480,
    CANVAS_H: 270,

    // Physics
    GRAVITY: 0.55,
    JUMP_FORCE: -7.5,
    MAX_FALL: 10,

    // Auto-scroll
    SCROLL_SPEED: 2,
    SCROLL_ACCEL: 0.0001,

    // Player
    PLAYER_X: 80,
    PLAYER_W: 16,
    PLAYER_H: 24,

    // Rooftops
    ROOF_MIN_W: 120,
    ROOF_MAX_W: 200,
    ROOF_GAP_MIN: 35,
    ROOF_GAP_MAX: 55,
    ROOF_HEIGHT_VAR: 50,
    ROOF_Y_BASE: 180,       // baseline Y for rooftops

    // Gargoyles
    GARGOYLE_W: 14,
    GARGOYLE_H: 14,
    GARGOYLE_CHANCE: 0.3,
    GARGOYLE_ALERT_DIST: 100,
    GARGOYLE_LUNGE_SPEED: 2,

    // Projectiles
    NOTE_SPEED: 6,
    NOTE_W: 6,
    NOTE_H: 8,
    FIRE_RATE: 12,

    // Particles
    PARTICLE_COUNT: 8,
    PARTICLE_LIFE: 20,
    PARTICLE_SPEED: 3,

    // Lives
    MAX_LIVES: 3,
    INVINCIBLE_FRAMES: 90,  // ~1.5s at 60fps

    // Palette — 1810s Dutch city
    COLORS: {
        sky:          '#1a1028',
        skyHorizon:   '#3a1830',
        canalBlue:    '#0d2a4a',
        brickRed:     '#6a2820',
        brickDark:    '#4a1810',
        roofTile:     '#8a4020',
        roofTileDark: '#6a3018',
        gableWhite:   '#e8dcc8',
        gasLamp:      '#ffe03a',
        gasLampGlow:  'rgba(255,224,58,0.15)',
        robotCyan:    '#00f5ff',
        robotSteel:   '#8899aa',
        robotCoat:    '#1a1828',
        muttonChops:  '#cc6620',
        gargoyleStone:'#4a4a5a',
        gargoyleDark: '#2a2a3a',
        gargoyleEye:  '#ff3d6e',
        noteWhite:    '#f0ead8',
        particleStone:'#7a7a8a',
        particleDust: '#5a4a3a',
        hudText:      '#f0ead8',
        lifeHeart:    '#ff3d6e',
    }
};
