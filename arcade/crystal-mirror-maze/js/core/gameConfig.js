// =============================================================================
// gameConfig.js - Single source of truth for all game data
// =============================================================================

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
const PLAYER_START_X = 2.5;
const PLAYER_START_Z = 20.5;
const PLAYER_HEIGHT = 0.5;
const MOVE_SPEED = 0.1;
const TURN_SPEED = 0.06;
const COLLISION_RADIUS = 0.3;

// ---------------------------------------------------------------------------
// Visuals
// ---------------------------------------------------------------------------
const FOG_DISTANCE = 25;
const CAMERA_FOV = 75;

// ---------------------------------------------------------------------------
// Portal system
// ---------------------------------------------------------------------------
const PORTAL_DETECTION_RADIUS = 0.8;
const PORTAL_COOLDOWN = 800;

const PORTAL_COLORS = {
    1: 0xff6666,
    2: 0x6666ff,
    3: 0x66ff66,
    4: 0xffaa33,
    5: 0xff66ff,
    6: 0x00ddff
};

const PORTAL_SPAWNS = {
    "1-2":  { x: 14.5, z: 5.5,  facing: 0 },
    "2-1":  { x: 14.5, z: 37.5, facing: 0 },

    "1-3":  { x: 2.5,  z: 16.5, facing: 0 },
    "3-1":  { x: 16.5, z: 2.5,  facing: 0 },

    "2-4":  { x: 8.5,  z: 1.5,  facing: 0 },
    "4-2":  { x: 1.5,  z: 8.5,  facing: 0 },

    "3-5":  { x: 2.5,  z: 8.5,  facing: 0 },
    "5-3":  { x: 13.5, z: 1.5,  facing: 0 },

    "4-6":  { x: 8.5,  z: 1.5,  facing: 0 },
    "6-4":  { x: 1.5,  z: 8.5,  facing: 0 },

    "5-2":  { x: 13.5, z: 6.5,  facing: 0 },
    "2-5":  { x: 1.5,  z: 8.5,  facing: 0 },

    "6-3":  { x: 13.5, z: 6.5,  facing: 0 },
    "3-6":  { x: 1.5,  z: 8.5,  facing: 0 }
};

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------
const ROOMS = {
    1: {
        name: "The Crystal Mirror Maze",
        startX: 2.5,
        startZ: 20.5,
        hasNPC: true,
        npcId: "dag",
        npcPosition: { x: 2.5, z: -2 }
    },
    2: {
        name: "The Deeper Reflections",
        startX: 14.5,
        startZ: 5.5,
        hasNPC: true,
        npcId: "watcher",
        npcPosition: { x: 8.5, z: 4.5 }
    },
    3: {
        name: "The Whispering Corridors",
        startX: 16.5,
        startZ: 2.5,
        hasNPC: false,
        npcId: null,
        npcPosition: null
    },
    4: {
        name: "The Shattered Halls",
        startX: 1.5,
        startZ: 8.5,
        hasNPC: true,
        npcId: "echo",
        npcPosition: { x: 6.5, z: 6.5 }
    },
    5: {
        name: "The Memory Gardens",
        startX: 13.5,
        startZ: 1.5,
        hasNPC: false,
        npcId: null,
        npcPosition: null
    },
    6: {
        name: "The Infinite Corridor",
        startX: 1.5,
        startZ: 8.5,
        hasNPC: false,
        npcId: null,
        npcPosition: null
    }
};

// ---------------------------------------------------------------------------
// NPC Dialogue
// ---------------------------------------------------------------------------
const NPC_DIALOGUE = {
    dag: [
        "You found me. Or I found you. The mirrors don't distinguish.",
        "I've been walking these corridors for what feels like centuries.",
        "The crystals are gone. Only reflections remain.",
        "She built this place. Or it built itself around her. I was never sure which.",
        "The void is not empty. It is full of everything you have lost.",
        "Every room is a thought you haven't finished thinking."
    ],
    watcher: [
        "I am the one who watches the watcher. Do you understand? No. Not yet.",
        "The mirrors show what was, what could be, and what must never be.",
        "Choose carefully what you look at.",
        "There is a pattern here. Can you see it? The rooms fold into each other.",
        "I have been here so long I have become part of the reflection.",
        "When you find all the fragments, the last mirror will show you the truth."
    ],
    echo: [
        "I am not real. I am the echo of someone who left through a door that no longer exists.",
        "The deeper you go, the harder it is to remember which direction is up.",
        "Sometimes I think I am the maze dreaming that it is a person.",
        "Go deeper. The answers are not at the surface.",
        "The void remembers everything. I remember nothing. We are the same."
    ]
};

// ---------------------------------------------------------------------------
// Room Inscriptions - glowing wall markers that reveal lore
// cell value 8 = inscription point (will be placed from these coords)
// ---------------------------------------------------------------------------
const ROOM_INSCRIPTIONS = {
    1: [
        { x: 4.5, z: 25.5, fragmentId: "void_echo_1" },
        { x: 14.5, z: 28.5, fragmentId: "void_echo_2" }
    ],
    2: [
        { x: 3.5, z: 4.5, fragmentId: "void_echo_3" },
        { x: 13.5, z: 8.5, fragmentId: "void_echo_4" }
    ],
    3: [
        { x: 5.5, z: 3.5, fragmentId: "void_echo_5" },
        { x: 11.5, z: 7.5, fragmentId: "void_echo_6" }
    ],
    4: [
        { x: 4.5, z: 5.5, fragmentId: "void_echo_7" }
    ],
    5: [],
    6: []
};

// ---------------------------------------------------------------------------
// Room Atmospheres - random floating text that appears while exploring
// ---------------------------------------------------------------------------
const ROOM_ATMOSPHERES = {
    1: [
        { fragmentId: "atmosphere_1" },
        { fragmentId: "atmosphere_2" }
    ],
    2: [
        { fragmentId: "atmosphere_3" },
        { fragmentId: "atmosphere_4" }
    ],
    3: [
        { fragmentId: "atmosphere_5" },
        { fragmentId: "atmosphere_6" }
    ],
    4: [
        { fragmentId: "atmosphere_7" },
        { fragmentId: "atmosphere_8" }
    ],
    5: [
        { fragmentId: "atmosphere_1" },
        { fragmentId: "atmosphere_5" }
    ],
    6: [
        { fragmentId: "atmosphere_3" },
        { fragmentId: "atmosphere_8" }
    ]
};

// ---------------------------------------------------------------------------
// Grid geometry
// ---------------------------------------------------------------------------
const CELL_CENTER_OFFSET = 0.5;

const WALL_Y           = 1;
const LAMP_HEIGHT      = 5;
const LAMP_CHAIN_Y     = 7.5;
const LAMP_BULB_OFFSET = 0.2;
const CUBE_CAMERA_Y    = 1.5;

// ---------------------------------------------------------------------------
// Portal visuals
// ---------------------------------------------------------------------------
const PORTAL_CELL_BASE = 70;
const PORTAL_CELL_MIN  = PORTAL_CELL_BASE + 1;
const PORTAL_CELL_MAX  = PORTAL_CELL_BASE + Object.keys(ROOMS).length;

const PORTAL_WALL_OFFSET = 0.2;

const PORTAL_BLOCKER  = { w: 0.95, h: 2.50, d: 0.95, y: 1.25 };
const PORTAL_FRAME    = { w: 0.90, h: 2.40, d: 0.15, y: 1.15 };
const PORTAL_DOOR     = { w: 0.80, h: 2.20, d: 0.10, y: 1.00 };
const PORTAL_GLOW     = { w: 0.85, h: 2.30,          y: 1.10 };

const PORTAL_FRAME_COLOR    = 0xddaa66;
const PORTAL_FRAME_EMISSIVE = 0x885533;
const PORTAL_FALLBACK_COLOR = 0x88ddff;

const PORTAL_LIGHT_INTENSITY = 1.5;
const PORTAL_LIGHT_DISTANCE  = 5;
const PORTAL_LIGHT_Y         = 2.5;

// ---------------------------------------------------------------------------
// Wall / floor material
// ---------------------------------------------------------------------------
const WALL_COLOR              = 0x666677;
const WALL_EMISSIVE           = 0x1a1a28;
const WALL_EMISSIVE_INTENSITY = 0.35;
const WALL_ENV_MAP_INTENSITY  = 2.0;

const FLOOR_COLOR      = 0x050505;
const MAZE_FLOOR_COLOR = 0x0a0a10;
const FLOOR_AMBIENT    = 0x0f0a15;

const WALL_COLLISION_PADDING  = 0.5;
const PORTAL_COLLISION_RADIUS = 0.3;

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------
const MUSIC_VOLUME = 0.5;

// ---------------------------------------------------------------------------
// Renderer / lighting themes (per room)
// ---------------------------------------------------------------------------
const ROOM_THEMES = {
    1: {
        primary:   0xff00ff,
        secondary: 0x00ddff,
        ambient:   0x1a0a2a
    },
    2: {
        primary:   0x0088ff,
        secondary: 0x00ffaa,
        ambient:   0x0a1a2a
    },
    3: {
        primary:   0x66ff66,
        secondary: 0xaaffcc,
        ambient:   0x0a1a0a
    },
    4: {
        primary:   0xff7c1f,
        secondary: 0xffcc44,
        ambient:   0x1a0f05
    },
    5: {
        primary:   0xff69b4,
        secondary: 0xffaacc,
        ambient:   0x1a0a15
    },
    6: {
        primary:   0x00ffff,
        secondary: 0xaaeeff,
        ambient:   0x051a1a
    }
};