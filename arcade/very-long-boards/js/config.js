const CONFIG = {
    WIDTH: 960,
    HEIGHT: 540,

    SEGMENT_LENGTH: 200,
    ROAD_WIDTH: 2000,
    CAMERA_HEIGHT: 500,
    CAMERA_DEPTH: 1 / Math.tan((100 / 2) * Math.PI / 180),
    CAMERA_LERP: 0.06,
    DOWNHILL_EXAGGERATION: 1.3,
    HORIZON_LOOKAHEAD: 20,
    HORIZON_TILT_SCALE: 0.55,
    DRAW_DISTANCE: 300,
    NUM_SEGMENTS: 600,

    TURN_SPEED: 4.0,
    BASE_SPEED: 0,
    MAX_SPEED: 18,
    FRICTION: 0.997,
    ACCELERATION: 0.03,
    BRAKE_FORCE: 0.3,
    CURVE_PUSH: 0.45,
    HILL_DOWN_BOOST: 0.06,
    OFFROAD_SLOW: 0.90,
    SPEED_DISPLAY_FACTOR: 5,

    PLAYER_SCALE: 2,

    KICK_ACCEL: 0.08,
    KICK_DURATION: 60,

    STABILITY_DECAY: 0.4,
    STABILITY_GAIN: 6.0,
    STABILITY_MAX: 100,
    STABILITY_WOBBLE_AT: 55,
    STABILITY_DANGER_AT: 25,
    STABILITY_BAIL_AT: 0,
    WOBBLE_INTENSITY: 0.3,

    COUNTDOWN_SECS: 3,

    OBS_FIRST: 2000,
    OBS_MIN_GAP: 1000,
    OBS_MAX_GAP: 2000,
    OBS_TYPES: [
        { type: 'cone', w: 18, h: 28, color: '#ff6b35' },
        { type: 'rock', w: 28, h: 22, color: '#888' },
        { type: 'skater', w: 28, h: 40, color: '#ff2e9c', points: 150 },
        { type: 'sign', w: 20, h: 34, color: '#ffe03a' },
        { type: 'puddle', w: 40, h: 16, color: '#4a90d9', points: 50 },
    ],

    TRICK_POINTS: 200,
    NEAR_MISS_POINTS: 75,
    NEAR_MISS_PX: 25,

    SKY_TOP: '#3a7bd5',
    SKY_MID: '#6db3f2',
    SKY_BOTTOM: '#b4d7f0',
    MOUNTAIN_FAR: '#5a7a6a',
    MOUNTAIN_NEAR: '#3d6650',
};

const CHARACTERS = {
    'office-carl': {
        name: 'OFFICE CARL',
        desc: 'the everyman',
        speedMult: 1.0,
        handlingMult: 1.0,
        trickMult: 1.0,
        stabilityMult: 1.0,
        hitbox: { w: 40, h: 60 },
        trail: 'dust',
    },
    'party-carl': {
        name: 'PARTY CARL',
        desc: 'the maniac',
        speedMult: 1.3,
        handlingMult: 0.75,
        trickMult: 1.5,
        stabilityMult: 0.85,
        hitbox: { w: 36, h: 54 },
        trail: 'sparkle',
    },
    'dark-carl': {
        name: 'DARK CARL',
        desc: 'the enigma',
        speedMult: 1.2,
        handlingMult: 0.85,
        trickMult: 2.0,
        stabilityMult: 0.9,
        hitbox: { w: 38, h: 56 },
        trail: 'shadow',
    },
};

const SEG = { STRAIGHT: 0, CURVE_L: 1, CURVE_R: 2, HILL_DOWN: 3 };