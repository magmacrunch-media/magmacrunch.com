/**
 * protocol.js — Shared message type constants for multiplayer games
 * Import this file to avoid magic strings in network code.
 */

var MSG = {
  // ── Client → Server ──────────────────────────────────────────────────────
  JOIN:           'join',
  CREATE_ROOM:    'create_room',
  JOIN_ROOM:      'join_room',
  SPECTATE:       'spectate',
  START_GAME:     'start_game',
  GAME_ACTION:    'game_action',
  CHAT:           'chat',
  QUIT:           'quit',

  // ── Server → Client ──────────────────────────────────────────────────────
  LOBBY_SNAPSHOT: 'lobby_snapshot',
  WELCOME:        'welcome',
  SPECTATOR_WELCOME: 'spectator_welcome',
  REJECTED:       'rejected',
  LOBBY_UPDATE:   'lobby_update',
  GAME_STARTED:   'game_started',
  GAME_STATE:     'game_state',
  GAME_ACTION_BC: 'game_action',   // broadcast game action
  CHAT_MSG:       'chat',
  SYSTEM_MSG:     'system',
  PLAYER_QUIT:    'player_quit',
};

// Color palette (matches server)
var MP_PALETTE = [
  '#ff2d55', '#ff7c1e', '#ffe135', '#39d353',
  '#6cd4f5', '#4059c8', '#9b30ff', '#ff69b4',
  '#fff5e1', '#00fa9a', '#ff4f6d', '#7b68ee',
];
