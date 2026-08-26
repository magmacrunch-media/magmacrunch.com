/* ── Magnolia API Reference — Data + Rendering ────────── */

const MODULES = [
  {
    name: "core",
    description: "Engine initialization and lifecycle",
    types: [
      {
        name: "MagnoliaConfig",
        definition: "typedef struct {\n    const char *app_name;\n    int max_scores;\n    int overscan_pct;\n} MagnoliaConfig;",
        description: "Engine configuration. app_name becomes the HBC directory name and SD path prefix."
      }
    ],
    functions: [
      {
        name: "magnolia_init",
        signature: "int magnolia_init(const MagnoliaConfig *cfg)",
        description: "Brings up SD, video, font, UI metrics, and scoring in the right order. Returns 0 on success. Negative return means usable but degraded — query the accessors and warn the player.",
        example: 'const MagnoliaConfig cfg = {\n    .app_name     = "my-game",\n    .max_scores   = 10,\n    .overscan_pct = 6\n};\nif (magnolia_init(&cfg) == -2) return 1;'
      },
      {
        name: "magnolia_shutdown",
        signature: "void magnolia_shutdown(void)",
        description: "Tears everything down. Call at exit.",
        example: "audio_shutdown();\nmagnolia_shutdown();"
      },
      {
        name: "magnolia_sd_mounted",
        signature: "int magnolia_sd_mounted(void)",
        description: "Whether the SD card was mounted successfully.",
        example: 'if (!magnolia_sd_mounted())\n    printf("no SD card");'
      },
      {
        name: "magnolia_fonts_loaded",
        signature: "int magnolia_fonts_loaded(void)",
        description: "Whether the TTF font loaded successfully.",
        example: 'if (!magnolia_fonts_loaded())\n    printf("font missing");'
      },
      {
        name: "magnolia_asset_path",
        signature: "const char *magnolia_asset_path(const char *leaf)",
        description: "Returns sd:/apps/<app_name>/<leaf>. Valid until the next call. Convenience for loading custom assets from SD.",
        example: 'const char *path = magnolia_asset_path("sfx/crash.pcm");\naudio_load_sfx(SFX_CRASH, path);'
      }
    ]
  },
  {
    name: "renderer",
    description: "Video, font, and frame presentation",
    types: [],
    functions: [
      {
        name: "renderer_init",
        signature: "int renderer_init(void)",
        description: "Video + font bring-up. Prefer magnolia_init(), which sequences this with SD mount and the rest of the engine.",
        example: "// Usually called by magnolia_init()\nrenderer_init();"
      },
      {
        name: "renderer_shutdown",
        signature: "void renderer_shutdown(void)",
        description: "Tears down video and font. Usually called by magnolia_shutdown().",
        example: "renderer_shutdown();"
      },
      {
        name: "renderer_fonts_loaded",
        signature: "int renderer_fonts_loaded(void)",
        description: "Whether the TTF font loaded successfully. Same as magnolia_fonts_loaded().",
        example: 'if (renderer_fonts_loaded())\n    ui_draw_centered_text(240, "ready", 16, COLOR_WHITE);'
      },
      {
        name: "renderer_screen_width",
        signature: "int renderer_screen_width(void)",
        description: "Real framebuffer width from the running video mode. NTSC and PAL are both 640 wide — never hardcode.",
        example: "int w = renderer_screen_width();"
      },
      {
        name: "renderer_screen_height",
        signature: "int renderer_screen_height(void)",
        description: "Real framebuffer height. NTSC=480, PAL=528.",
        example: "int h = renderer_screen_height();"
      },
      {
        name: "renderer_draw_background",
        signature: "void renderer_draw_background(void)",
        description: "Draws the background. Call at the start of each frame before drawing game content.",
        example: "renderer_draw_background();\n// draw game world...\nrenderer_finish();"
      },
      {
        name: "renderer_finish",
        signature: "void renderer_finish(void)",
        description: "Presents the frame and calls clock_tick(). Always the last call in your frame.",
        example: "renderer_draw_background();\n// draw everything...\nrenderer_finish();"
      },
      {
        name: "renderer_splash",
        signature: "void renderer_splash(const char *line1, const char *line2)",
        description: "One-line status frame, drawn and flipped immediately. Used during bring-up before the UI layer exists.",
        example: 'renderer_splash("loading", "mounting SD card...");'
      }
    ]
  },
  {
    name: "sprite",
    description: "Textures, sprite sheets and origin-based drawing",
    types: [
      {
        name: "Sprite",
        definition: "typedef struct {\n    GRRLIB_texImg *tex;\n    int origin_x;\n    int origin_y;\n} Sprite;",
        description: "Texture with an origin point. Sprites draw with their origin at the given screen position."
      },
      {
        name: "SpriteSheet",
        definition: "typedef struct {\n    Sprite base;\n    int frame_w, frame_h;\n    int cols, rows;\n    int count;\n} SpriteSheet;",
      description: "A uniform grid of frames in one texture, counted left-to-right then top-to-bottom. The origin is the frame's, not the sheet's. This is the format SPRITE//FORGE exports and all three MagmaCrunch engines read."
      }
    ],
    functions: [
      {
        name: "sprite_load",
        signature: "int sprite_load(Sprite *s, const char *path, int origin_x, int origin_y)",
        description: "Load a texture from an SD file. Returns 1 on success. Failure leaves the Sprite empty and safe to draw.",
        example: 'Sprite player;\nsprite_load(&player, "sprites/player.png", 40, 40);'
      },
      {
        name: "sprite_load_mem",
        signature: "int sprite_load_mem(Sprite *s, const void *data, int origin_x, int origin_y)",
        description: "Load from an image embedded in the binary. Assets embedded this way cannot go missing.",
        example: 'extern const unsigned char player_png[];\nextern const int player_png_size;\n\nSprite player;\nsprite_load_mem(&player, player_png, 40, 40);'
      },
      {
        name: "sprite_free",
        signature: "void sprite_free(Sprite *s)",
        description: "Frees the texture and invalidates the sprite.",
        example: "sprite_free(&player);"
      },
      {
        name: "sprite_valid",
        signature: "int sprite_valid(const Sprite *s)",
        description: "Whether the sprite has a loaded texture.",
        example: 'if (sprite_valid(&player))\n    sprite_draw(&player, x, y);'
      },
      {
        name: "sprite_width",
        signature: "int sprite_width(const Sprite *s)",
        description: "Texture width in pixels.",
        example: "int w = sprite_width(&player);"
      },
      {
        name: "sprite_height",
        signature: "int sprite_height(const Sprite *s)",
        description: "Texture height in pixels.",
        example: "int h = sprite_height(&player);"
      },
      {
        name: "sprite_draw",
        signature: "void sprite_draw(const Sprite *s, float x, float y)",
        description: "Draws with the sprite's origin at (x, y). No-ops on a failed sprite.",
        example: "sprite_draw(&player, player_x, player_y);"
      },
      {
        name: "sprite_draw_tinted",
        signature: "void sprite_draw_tinted(const Sprite *s, float x, float y, u32 tint)",
        description: "Same as sprite_draw with a color tint.",
        example: "sprite_draw_tinted(&player, x, y, GRRLIB_WHITE);"
      },
      {
        name: "sprite_draw_scaled",
        signature: "void sprite_draw_scaled(const Sprite *s, float x, float y, float scale)",
        description: "Scaled about the origin — origin still lands on (x, y). Good for thumbnails.",
        example: "sprite_draw_scaled(&player, x, y, 0.5);"
      },
      {
        name: "sprite_draw_scaled_tinted",
        signature: "void sprite_draw_scaled_tinted(const Sprite *s, float x, float y, float scale, u32 tint)",
        description: "Scaled + tinted.",
        example: "sprite_draw_scaled_tinted(&player, x, y, 2.0, tint);"
      },
      {
        name: "sprite_draw_scaled_xy",
        signature: "void sprite_draw_scaled_xy(const Sprite *s, float x, float y, float sx, float sy)",
        description: "Per-axis scaling for non-square framebuffer pixels (16:9, PAL). Origin still lands on (x, y).",
        example: "sprite_draw_scaled_xy(&player, x, y, 1.0, 0.75);"
      },
      {
        name: "sprite_draw_scaled_xy_tinted",
        signature: "void sprite_draw_scaled_xy_tinted(const Sprite *s, float x, float y, float sx, float sy, u32 tint)",
        description: "Per-axis scaling + tint.",
        example: "sprite_draw_scaled_xy_tinted(&player, x, y, 1.0, 0.75, tint);"
      },
      {
        name: "sprite_draw_ex",
        signature: "void sprite_draw_ex(const Sprite *s, float x, float y, float sx, float sy, int flip_h, u32 tint)",
        description: "Scaled, tinted and optionally mirrored. Mirroring reflects the sprite about its own origin, so an anchor point does not move when a character turns around.",
        example: "sprite_draw_ex(&player, x, y, 1.0, 1.0, facing_left, tint);"
      },
      {
        name: "sprite_sheet_load",
        signature: "int sprite_sheet_load(SpriteSheet *s, const char *path, int frame_w, int frame_h, int origin_x, int origin_y)",
        description: "Load a sheet from an SD file, stating the cell size and the per-frame origin. Frame sizes that do not divide the image leave the sheet empty rather than drawing the plausible part of a mis-exported asset.",
        example: 'SpriteSheet fighter;\nsprite_sheet_load(&fighter, "sprites/fighter.png",\n                  64, 96, 32, 96);'
      },
      {
        name: "sprite_sheet_load_mem",
        signature: "int sprite_sheet_load_mem(SpriteSheet *s, const void *data, int frame_w, int frame_h, int origin_x, int origin_y)",
        description: "Same, from a sheet embedded in the binary.",
        example: "sprite_sheet_load_mem(&fighter, fighter_png, 64, 96, 32, 96);"
      },
      {
        name: "sprite_sheet_free",
        signature: "void sprite_sheet_free(SpriteSheet *s)",
        description: "Frees the texture and empties the sheet.",
        example: "sprite_sheet_free(&fighter);"
      },
      {
        name: "sprite_sheet_valid",
        signature: "int sprite_sheet_valid(const SpriteSheet *s)",
        description: "Whether the sheet loaded and has at least one frame.",
        example: "if (!sprite_sheet_valid(&fighter))\n    show_missing_asset_warning();"
      },
      {
        name: "sprite_sheet_count",
        signature: "int sprite_sheet_count(const SpriteSheet *s)",
        description: "How many frames the sheet holds (cols x rows), or 0 if it failed to load.",
        example: "int frames = sprite_sheet_count(&fighter);"
      },
      {
        name: "sprite_sheet_draw",
        signature: "void sprite_sheet_draw(const SpriteSheet *s, int frame, float x, float y)",
        description: "Places the frame's origin at (x, y). A frame index outside the sheet draws nothing \u2014 an animation running off the end of its strip is a bug worth seeing, not one worth hiding behind a wrapped frame.",
        example: "sprite_sheet_draw(&fighter, anim_frame, x, y);"
      },
      {
        name: "sprite_sheet_draw_ex",
        signature: "void sprite_sheet_draw_ex(const SpriteSheet *s, int frame, float x, float y, float sx, float sy, int flip_h, u32 tint)",
        description: "Scaled, mirrored and tinted. Do not reach for GRRLIB_BMFX_FlipH() instead: that builds a mirrored copy of the texture pixel by pixel, which is fine once at load time and ruinous once per frame per character.",
        example: "sprite_sheet_draw_ex(&fighter, anim_frame, x, y,\n                     1.0, 1.0, facing_left, WHITE);"
      }
    ]
  },
  {
    name: "input",
    description: "Up to four Wiimotes (held sideways)",
    types: [
      {
        name: "InputDir",
        definition: "typedef enum {\n    INPUT_DIR_UP,\n    INPUT_DIR_DOWN,\n    INPUT_DIR_LEFT,\n    INPUT_DIR_RIGHT,\n    INPUT_DIR_COUNT\n} InputDir;",
        description: "Direction enum for auto-repeat queries."
      },
      {
        name: "InputButton",
        definition: "typedef enum {\n    INPUT_BTN_A,\n    INPUT_BTN_B,\n    INPUT_BTN_1,\n    INPUT_BTN_2,\n    INPUT_BTN_PLUS,\n    INPUT_BTN_MINUS,\n    INPUT_BTN_HOME,\n    INPUT_BTN_UP,\n    INPUT_BTN_DOWN,\n    INPUT_BTN_LEFT,\n    INPUT_BTN_RIGHT,\n    INPUT_BTN_COUNT\n} InputButton;",
      description: "Every button the engine reports, as an index into a player's frame."
      },
      {
        name: "InputPad",
        definition: "typedef struct {\n    unsigned short held;\n    unsigned short pressed;\n    unsigned short released;\n} InputPad;",
      description: "One player's frame, a bit per InputButton. Copyable, so a game can keep past frames \u2014 which is what an input buffer is made of."
      }
    ],
    functions: [
      {
        name: "input_init",
        signature: "void input_init(void)",
        description: "Initializes the Wiimote subsystem.",
        example: "input_init();"
      },
      {
        name: "input_scan",
        signature: "int input_scan(void)",
        description: "Samples every connected controller. Call once per frame, before querying anything: the hold counters behind the auto-repeat advance here.",
        example: "input_scan();\nif (input_a_pressed()) fire();"
      },
      {
        name: "input_player_count",
        signature: "int input_player_count(void)",
        description: "How many controllers reported in on the last scan.",
        example: "if (input_player_count() < 2)\n    draw_waiting_for_player_two();"
      },
      {
        name: "input_connected",
        signature: "int input_connected(int player)",
        description: "Whether a particular controller reported in. One that is off reads as all-buttons-up rather than as a stuck frame.",
        example: "if (!input_connected(1)) pause_match();"
      },
      {
        name: "input_pressed",
        signature: "int input_pressed(int player, InputButton b)",
        description: "The frame a button went down, for the given player. Out-of-range players and buttons read as not-pressed rather than reading off the end of the array.",
        example: "if (input_pressed(1, INPUT_BTN_A))\n    fighter_attack(&p2);"
      },
      {
        name: "input_held",
        signature: "int input_held(int player, InputButton b)",
        description: "Whether a button is currently down. What blocking, walking and charging are made of.",
        example: "if (input_held(p, INPUT_BTN_B))\n    fighter_block(&f);"
      },
      {
        name: "input_released",
        signature: "int input_released(int player, InputButton b)",
        description: "The frame a button came up. Charge moves and hold-to-aim need this; nothing before could report it.",
        example: "if (input_released(p, INPUT_BTN_A))\n    fire_charged_shot(&f);"
      },
      {
        name: "input_snapshot",
        signature: "const InputPad *input_snapshot(int player)",
        description: "A player's whole frame as a value, or NULL for an out-of-range player. Valid until the next input_scan(), so copy it to keep it. Recognising patterns across kept frames \u2014 a quarter-circle, a buffer window \u2014 stays with the game.",
        example: "buffer[head] = *input_snapshot(p);\nhead = (head + 1) % BUFFER_FRAMES;"
      },
      {
        name: "input_dir_button",
        signature: "InputButton input_dir_button(InputDir dir)",
        description: "The button belonging to a direction, so code holding an InputDir can reach the bitmask without a lookup table of its own.",
        example: "InputButton b = input_dir_button(INPUT_DIR_LEFT);\nif (input_held(p, b)) walk_left(&f);"
      },
      {
        name: "input_a_pressed",
        signature: "int input_a_pressed(void)",
        description: "A button edge — true on the frame the button was first pressed.",
        example: 'if (input_a_pressed())\n    gamestate_menu_confirm(&gs);'
      },
      {
        name: "input_back_pressed",
        signature: "int input_back_pressed(void)",
        description: "B button edge.",
        example: "if (input_back_pressed()) go_back();"
      },
      {
        name: "input_home_pressed",
        signature: "int input_home_pressed(void)",
        description: "HOME button edge. Use to exit to Homebrew Channel.",
        example: "if (input_home_pressed()) break;"
      },
      {
        name: "input_button1_pressed",
        signature: "int input_button1_pressed(void)",
        description: "Button 1 edge.",
        example: "if (input_button1_pressed()) toggle_mute();"
      },
      {
        name: "input_button2_pressed",
        signature: "int input_button2_pressed(void)",
        description: "Button 2 edge.",
        example: "if (input_button2_pressed()) pause_game();"
      },
      {
        name: "input_plus_pressed",
        signature: "int input_plus_pressed(void)",
        description: "+ button edge.",
        example: "if (input_plus_pressed()) volume_up();"
      },
      {
        name: "input_minus_pressed",
        signature: "int input_minus_pressed(void)",
        description: "- button edge.",
        example: "if (input_minus_pressed()) volume_down();"
      },
      {
        name: "input_left_pressed",
        signature: "int input_left_pressed(void)",
        description: "D-pad left edge.",
        example: "if (input_left_pressed()) move_cursor(-1);"
      },
      {
        name: "input_right_pressed",
        signature: "int input_right_pressed(void)",
        description: "D-pad right edge.",
        example: "if (input_right_pressed()) move_cursor(1);"
      },
      {
        name: "input_up_pressed",
        signature: "int input_up_pressed(void)",
        description: "D-pad up edge.",
        example: "if (input_up_pressed()) menu_up();"
      },
      {
        name: "input_down_pressed",
        signature: "int input_down_pressed(void)",
        description: "D-pad down edge.",
        example: "if (input_down_pressed()) menu_down();"
      },
      {
        name: "input_a_held",
        signature: "int input_a_held(void)",
        description: "Whether A is currently held. For thrust, charge, hold-to-aim.",
        example: "if (input_a_held())\n    player_vy += THRUST;"
      },
      {
        name: "input_dir_repeat",
        signature: "int input_dir_repeat(InputDir dir)",
        description: "Fires on the frame the direction is first pressed, then repeatedly after delay. For scrolling menus and initials editors. Player one; see input_dir_repeat_for().",
        example: "if (input_dir_repeat(INPUT_DIR_LEFT))\n    scroll_list(-1);"
      },
      {
        name: "input_dir_repeat_for",
        signature: "int input_dir_repeat_for(int player, InputDir dir)",
        description: "Auto-repeat for a given player. Counted per player, so one player holding a direction cannot step another's cursor.",
        example: "if (input_dir_repeat_for(1, INPUT_DIR_DOWN))\n    roster_move(&p2_pick, 1);"
      },
      {
        name: "input_set_repeat",
        signature: "void input_set_repeat(int delay_frames, int interval_frames)",
        description: "Configure the initial delay and repeat interval for input_dir_repeat().",
        example: "input_set_repeat(20, 6);"
      }
    ]
  },
  {
    name: "clock",
    description: "Frame timing, optional fixed timestep, easing",
    types: [],
    functions: [
      {
        name: "clock_tick",
        signature: "void clock_tick(void)",
        description: "Advances the frame counter and delta time. Called automatically by renderer_finish().",
        example: "// Usually implicit via renderer_finish()\nclock_tick();"
      },
      {
        name: "clock_frame",
        signature: "int clock_frame(void)",
        description: "Frames since start.",
        example: "int frame = clock_frame();"
      },
      {
        name: "clock_dt",
        signature: "float clock_dt(void)",
        description: "Seconds since the previous frame.",
        example: "float dt = clock_dt();\nplayer_x += speed * dt;"
      },
      {
        name: "clock_elapsed",
        signature: "float clock_elapsed(void)",
        description: "Seconds since start.",
        example: "float t = clock_elapsed();"
      },
      {
        name: "clock_reset",
        signature: "void clock_reset(void)",
        description: "Resets all counters to zero.",
        example: "clock_reset();"
      },
      {
        name: "clock_set_fixed_hz",
        signature: "void clock_set_fixed_hz(int hz)",
        description: "Turn on a fixed logic step at the given rate; 0, the default, turns it off. clock_dt() is real elapsed time and is right for anything continuous \u2014 a fade, a slide. It is wrong for rules written in frames, which stop meaning anything when the delta varies with SD reads.",
        example: "clock_set_fixed_hz(60);"
      },
      {
        name: "clock_fixed_hz",
        signature: "int clock_fixed_hz(void)",
        description: "The fixed step rate, or 0 when off.",
        example: "if (clock_fixed_hz()) draw_frame_counter();"
      },
      {
        name: "clock_fixed_dt",
        signature: "float clock_fixed_dt(void)",
        description: "Seconds in one step, or 0 when off. This is what a fixed-step game integrates with \u2014 not clock_dt(), which is however long the frame really took.",
        example: "world_step(clock_fixed_dt());"
      },
      {
        name: "clock_fixed_steps",
        signature: "int clock_fixed_steps(void)",
        description: "How many logic steps this frame owes. A frame owing more than TIMESTEP_MAX_STEPS was a stall, and its backlog is dropped rather than repaid as a burst of speed once a load finishes.",
        example: "for (int i = 0; i < clock_fixed_steps(); i++)\n    world_step(clock_fixed_dt());\nworld_draw();"
      },
      {
        name: "ease_out_quad",
        signature: "float ease_out_quad(float t)",
        description: "Quadratic ease-out. Input clamped to 0..1; output 0..1. For slides, pops, fades.",
        example: "float progress = ease_out_quad(t / duration);"
      },
      {
        name: "ease_in_out_quad",
        signature: "float ease_in_out_quad(float t)",
        description: "Quadratic ease-in-out. Input clamped to 0..1; output 0..1.",
        example: "float progress = ease_in_out_quad(t / duration);"
      }
    ]
  },
  {
    name: "audio",
    description: "PCM16 sound effects and music playback",
    types: [
      {
        name: "AudioFormat",
        definition: "typedef enum {\n    AUDIO_STEREO_16,\n    AUDIO_MONO_16\n} AudioFormat;",
        description: "PCM format for explicit-rate loading functions."
      }
    ],
    constants: [
      { name: "AUDIO_MAX_SFX", value: "8", description: "Maximum simultaneous sound effect slots" },
      { name: "AUDIO_RATE_DEFAULT", value: "48000", description: "Default sample rate (48kHz)" }
    ],
    functions: [
      {
        name: "audio_init",
        signature: "int audio_init(void)",
        description: "Initializes ASND and sound subsystem. Returns 1 on success.",
        example: "audio_init();"
      },
      {
        name: "audio_shutdown",
        signature: "void audio_shutdown(void)",
        description: "Tears down audio.",
        example: "audio_shutdown();"
      },
      {
        name: "audio_available",
        signature: "int audio_available(void)",
        description: "Whether audio is available and working.",
        example: "if (audio_available()) audio_play_sfx(SFX_CRASH);"
      },
      {
        name: "audio_load_sfx",
        signature: "int audio_load_sfx(int slot, const char *path)",
        description: "Load a PCM16 clip into slot 0..AUDIO_MAX_SFX-1 from SD. Returns 1 on success.",
        example: 'audio_load_sfx(SFX_CRASH, "sfx/crash.pcm");'
      },
      {
        name: "audio_load_sfx_mem",
        signature: "int audio_load_sfx_mem(int slot, const void *data, unsigned int len)",
        description: "Load SFX from memory (linked binary data). Handles 32-byte alignment internally.",
        example: 'audio_load_sfx_mem(SFX_CRASH, crash_pcm, crash_pcm_size);'
      },
      {
        name: "audio_load_sfx_fmt",
        signature: "int audio_load_sfx_fmt(int slot, const char *path, AudioFormat fmt, int rate)",
        description: "Load SFX with explicit format and sample rate.",
        example: 'audio_load_sfx_fmt(0, "sfx/low.pcm", AUDIO_MONO_16, 24000);'
      },
      {
        name: "audio_load_sfx_mem_fmt",
        signature: "int audio_load_sfx_mem_fmt(int slot, const void *data, unsigned int len, AudioFormat fmt, int rate)",
        description: "Load SFX from memory with explicit format and sample rate.",
        example: 'audio_load_sfx_mem_fmt(0, data, len, AUDIO_MONO_16, 24000);'
      },
      {
        name: "audio_play_sfx",
        signature: "void audio_play_sfx(int slot)",
        description: "Play the clip in the given slot.",
        example: "audio_play_sfx(SFX_CRASH);"
      },
      {
        name: "audio_play_music",
        signature: "int audio_play_music(const char *path)",
        description: "Loads and starts a looping track from SD, replacing any current one.",
        example: 'audio_play_music("music/theme.pcm");'
      },
      {
        name: "audio_play_music_mem",
        signature: "int audio_play_music_mem(const void *data, unsigned int len)",
        description: "Load and play looping music from memory.",
        example: "audio_play_music_mem(theme_pcm, theme_pcm_size);"
      },
      {
        name: "audio_play_music_fmt",
        signature: "int audio_play_music_fmt(const char *path, AudioFormat fmt, int rate)",
        description: "Play music with explicit format and sample rate.",
        example: 'audio_play_music_fmt("music/low.pcm", AUDIO_MONO_16, 24000);'
      },
      {
        name: "audio_play_music_mem_fmt",
        signature: "int audio_play_music_mem_fmt(const void *data, unsigned int len, AudioFormat fmt, int rate)",
        description: "Play music from memory with explicit format and sample rate.",
        example: "audio_play_music_mem_fmt(data, len, AUDIO_MONO_16, 24000);"
      },
      {
        name: "audio_music_loaded",
        signature: "int audio_music_loaded(void)",
        description: "Whether a music track is currently loaded in memory.",
        example: "if (!audio_music_loaded()) audio_play_music_mem(theme, len);"
      },
      {
        name: "audio_stop_music",
        signature: "void audio_stop_music(void)",
        description: "Stops and frees the current music track.",
        example: "audio_stop_music();"
      },
      {
        name: "audio_set_muted",
        signature: "void audio_set_muted(int muted)",
        description: "Mute/unmute. Muting is remembered — a track started while muted stays silent until unmuted.",
        example: "audio_set_muted(!audio_get_muted());"
      },
      {
        name: "audio_get_muted",
        signature: "int audio_get_muted(void)",
        description: "Current mute state.",
        example: "if (audio_get_muted()) show_mute_icon();"
      },
      {
        name: "audio_set_music_volume",
        signature: "void audio_set_music_volume(int vol)",
        description: "Music volume 0..255. Applied to subsequently started tracks.",
        example: "audio_set_music_volume(128);"
      },
      {
        name: "audio_set_sfx_volume",
        signature: "void audio_set_sfx_volume(int vol)",
        description: "SFX volume 0..255. Applied to subsequently played effects.",
        example: "audio_set_sfx_volume(200);"
      }
    ]
  },
  {
    name: "scoring",
    description: "High-score tables with SD card JSON persistence",
    types: [
      {
        name: "ScoreEntry",
        definition: "typedef struct {\n    char initials[4];\n    int score;\n} ScoreEntry;",
        description: "A single high-score entry: three letters + score."
      }
    ],
    functions: [
      {
        name: "scoring_init",
        signature: "void scoring_init(const char *path, int max_entries)",
        description: "Initialize the default table. Normally called by magnolia_init().",
        example: '// Usually called by magnolia_init()\nscoring_init("sd:/apps/my-game/scores.json", 10);'
      },
      {
        name: "scoring_add_table",
        signature: "int scoring_add_table(const char *id)",
        description: "Register a named table, load from card, return its index. Returns existing index if already registered.",
        example: "int easy = scoring_add_table(\"easy\");\nint hard = scoring_add_table(\"hard\");"
      },
      {
        name: "scoring_select_table",
        signature: "void scoring_select_table(int table)",
        description: "Which table the accessors act on. Default is index 0.",
        example: "scoring_select_table(hard);"
      },
      {
        name: "scoring_current_table",
        signature: "int scoring_current_table(void)",
        description: "Currently selected table index.",
        example: "int current = scoring_current_table();"
      },
      {
        name: "scoring_table_count",
        signature: "int scoring_table_count(void)",
        description: "Number of registered tables.",
        example: "int n = scoring_table_count();"
      },
      {
        name: "scoring_reset",
        signature: "void scoring_reset(void)",
        description: "Reset the run-in-progress to zero. Not per-table.",
        example: "scoring_reset();"
      },
      {
        name: "scoring_get",
        signature: "int scoring_get(void)",
        description: "Current run score.",
        example: "int score = scoring_get();"
      },
      {
        name: "scoring_add",
        signature: "void scoring_add(int points)",
        description: "Add points to the current run.",
        example: "scoring_add(10);"
      },
      {
        name: "scoring_increment",
        signature: "void scoring_increment(void)",
        description: "Convenience: scoring_add(1).",
        example: "scoring_increment();"
      },
      {
        name: "scoring_save",
        signature: "void scoring_save(void)",
        description: "Persist the selected table to SD.",
        example: "scoring_save();"
      },
      {
        name: "scoring_load",
        signature: "int scoring_load(void)",
        description: "Load the selected table from SD. Returns success.",
        example: "scoring_load();"
      },
      {
        name: "scoring_is_high_score",
        signature: "int scoring_is_high_score(int score)",
        description: "Whether score qualifies as a high score in the selected table.",
        example: "if (scoring_is_high_score(final_score))\n    gamestate_begin_initials(&gs);"
      },
      {
        name: "scoring_get_rank",
        signature: "int scoring_get_rank(int score)",
        description: "Rank a score would earn (1-based), or 0 if it doesn't qualify.",
        example: "int rank = scoring_get_rank(final_score);"
      },
      {
        name: "scoring_add_entry",
        signature: "int scoring_add_entry(const char *initials, int score)",
        description: "Insert an entry into the selected table. Returns the rank it earned, or 0.",
        example: 'scoring_add_entry("ACE", 9999);'
      },
      {
        name: "scoring_get_count",
        signature: "int scoring_get_count(void)",
        description: "Number of entries in the selected table.",
        example: "int n = scoring_get_count();"
      },
      {
        name: "scoring_get_entry",
        signature: "const ScoreEntry *scoring_get_entry(int index)",
        description: "Read-only pointer to the entry at index, or NULL if out of range.",
        example: "const ScoreEntry *e = scoring_get_entry(0);\nif (e) printf(\"%s: %d\", e->initials, e->score);"
      },
      {
        name: "scoring_persisted",
        signature: "int scoring_persisted(void)",
        description: "Whether the last save reached the card. An emulated SD card can report itself mounted and still refuse every write, so a leaderboard that resets on every power cycle looks exactly like one nobody ever qualified for. The counterpart to prefs_persisted().",
        example: 'if (!scoring_persisted())\n    ui_draw_centered_text(400, "SCORES NOT SAVING", 12, WARN);'
      }
    ]
  },
  {
    name: "prefs",
    description: "Tiny integer key/value store with SD card persistence",
    types: [],
    constants: [
      { name: "MAGNOLIA_MAX_PREFS", value: "16", description: "Maximum key/value pairs" },
      { name: "MAGNOLIA_PREF_KEY_MAX", value: "24", description: "Maximum key length (chars)" }
    ],
    functions: [
      {
        name: "prefs_init",
        signature: "void prefs_init(const char *path)",
        description: "Initialize from an sd:/ path. Normally called by magnolia_init().",
        example: '// Usually called by magnolia_init()\nprefs_init("sd:/apps/my-game/settings.json");'
      },
      {
        name: "prefs_get_int",
        signature: "int prefs_get_int(const char *key, int fallback)",
        description: "Get an integer preference. Returns fallback when the key was never set.",
        example: 'int difficulty = prefs_get_int("difficulty", 0);'
      },
      {
        name: "prefs_set_int",
        signature: "void prefs_set_int(const char *key, int value)",
        description: "Set an integer preference. Writes immediately to SD.",
        example: 'prefs_set_int("difficulty", 2);'
      },
      {
        name: "prefs_save",
        signature: "void prefs_save(void)",
        description: "Persist the current preferences to SD.",
        example: "prefs_save();"
      },
      {
        name: "prefs_load",
        signature: "int prefs_load(void)",
        description: "Reload preferences from SD. Returns success.",
        example: "prefs_load();"
      },
      {
        name: "prefs_persisted",
        signature: "int prefs_persisted(void)",
        description: "Whether the last save reached the card.",
        example: 'if (!prefs_persisted())\n    printf("settings not saved");'
      }
    ]
  },
  {
    name: "gamestate",
    description: "Score-attack game shell state machine",
    types: [
      {
        name: "GameStateId",
        definition: "typedef enum {\n    GS_TITLE,\n    GS_MENU,\n    GS_READY,\n    GS_PLAYING,\n    GS_PAUSED,\n    GS_GAME_OVER,\n    GS_INITIALS,\n    GS_HIGH_SCORES\n} GameStateId;",
        description: "All possible states in the game shell."
      },
      {
        name: "GameStateMachine",
        definition: "typedef struct {\n    GameStateId state;\n    int is_high_score;\n    int rank;\n    char initials[4];\n    int cursor_pos;\n    int selected_letter;\n    int menu_enabled;\n} GameStateMachine;",
        description: "Full state machine. Games declare one and pass it to all gamestate functions."
      }
    ],
    functions: [
      {
        name: "gamestate_init",
        signature: "void gamestate_init(GameStateMachine *g)",
        description: "Initialize the state machine to GS_TITLE.",
        example: "GameStateMachine gs;\ngamestate_init(&gs);"
      },
      {
        name: "gamestate_current",
        signature: "GameStateId gamestate_current(const GameStateMachine *g)",
        description: "Current state.",
        example: "if (gamestate_current(&gs) == GS_PLAYING) update();"
      },
      {
        name: "gamestate_set",
        signature: "void gamestate_set(GameStateMachine *g, GameStateId s)",
        description: "Force a state transition.",
        example: "gamestate_set(&gs, GS_TITLE);"
      },
      {
        name: "gamestate_end_run",
        signature: "void gamestate_end_run(GameStateMachine *g, int score)",
        description: "Call when a run ends. Works out whether the score qualifies and moves to GS_GAME_OVER.",
        example: "gamestate_end_run(&gs, scoring_get());"
      },
      {
        name: "gamestate_update",
        signature: "int gamestate_update(GameStateMachine *g, int score)",
        description: "Drive non-playing states from input. Returns 1 when the caller should start a fresh run (just entered GS_PLAYING).",
        example: "if (gamestate_update(&gs, scoring_get()))\n    start_run();"
      },
      {
        name: "gamestate_begin_initials",
        signature: "void gamestate_begin_initials(GameStateMachine *g)",
        description: "Enter the initials editor.",
        example: "gamestate_begin_initials(&gs);"
      },
      {
        name: "gamestate_commit_initials",
        signature: "void gamestate_commit_initials(GameStateMachine *g, int score)",
        description: "Commit the edited initials to the high-score table.",
        example: "gamestate_commit_initials(&gs, scoring_get());"
      },
      {
        name: "gamestate_set_menu_enabled",
        signature: "void gamestate_set_menu_enabled(GameStateMachine *g, int enabled)",
        description: "Whether A on the title screen opens GS_MENU instead of going straight to GS_READY. Off by default.",
        example: "gamestate_set_menu_enabled(&gs, 1);"
      },
      {
        name: "gamestate_menu_confirm",
        signature: "void gamestate_menu_confirm(GameStateMachine *g)",
        description: "Call from GS_MENU when the player has made their selection; transitions to GS_READY.",
        example: "gamestate_menu_confirm(&gs);"
      },
      {
        name: "gamestate_pause",
        signature: "void gamestate_pause(GameStateMachine *g)",
        description: "Transition to GS_PAUSED.",
        example: "gamestate_pause(&gs);"
      },
      {
        name: "gamestate_resume",
        signature: "void gamestate_resume(GameStateMachine *g)",
        description: "Transition back to GS_PLAYING.",
        description: "gamestate_resume(&gs);",
        example: "gamestate_resume(&gs);"
      }
    ]
  },
  {
    name: "menu",
    description: "Grid/list cursor with wrapping and scrolling",
    types: [
      {
        name: "MenuGrid",
        definition: "typedef struct {\n    int count;\n    int cols;\n    int rows_visible;\n    int cursor;\n    int top_row;\n} MenuGrid;",
        description: "Grid cursor state. Games draw the grid themselves; the struct tracks navigation."
      }
    ],
    functions: [
      {
        name: "menu_grid_init",
        signature: "void menu_grid_init(MenuGrid *g, int count, int cols, int rows_visible)",
        description: "Initialize a grid. Values below 1 are clamped to prevent divide-by-zero.",
        example: "MenuGrid mg;\nmenu_grid_init(&mg, 6, 3, 3);"
      },
      {
        name: "menu_grid_move",
        signature: "int menu_grid_move(MenuGrid *g, int dcol, int drow)",
        description: "Move by whole columns/rows, wrapping on both axes. Returns 1 when cursor moved.",
        example: "if (input_left_pressed()) menu_grid_move(&mg, -1, 0);"
      },
      {
        name: "menu_grid_set_cursor",
        signature: "void menu_grid_set_cursor(MenuGrid *g, int index)",
        description: "Jump directly to an item, scrolling the window onto it.",
        example: "menu_grid_set_cursor(&mg, 0);"
      },
      {
        name: "menu_grid_total_rows",
        signature: "int menu_grid_total_rows(const MenuGrid *g)",
        description: "Total rows in the grid (count / cols, ceiling).",
        example: "int rows = menu_grid_total_rows(&mg);"
      },
      {
        name: "menu_grid_page_count",
        signature: "int menu_grid_page_count(const MenuGrid *g)",
        description: "Number of visible pages.",
        example: "int pages = menu_grid_page_count(&mg);"
      },
      {
        name: "menu_grid_page_index",
        signature: "int menu_grid_page_index(const MenuGrid *g)",
        description: "Current page index (0-based).",
        example: "int page = menu_grid_page_index(&mg);"
      },
      {
        name: "menu_grid_item_at_slot",
        signature: "int menu_grid_item_at_slot(const MenuGrid *g, int slot)",
        description: "Item index at a visible slot, or -1 if that slot falls past the end.",
        example: "for (int i = 0; i < mg.cols * mg.rows_visible; i++) {\n    int item = menu_grid_item_at_slot(&mg, i);\n    if (item >= 0) draw_item(item, i);\n}"
      }
    ]
  },
  {
    name: "theme",
    description: "HSL color generation and complementary colors",
    types: [
      {
        name: "ThemeColor",
        definition: "typedef struct {\n    u8 r, g, b;\n} ThemeColor;",
        description: "RGB color value."
      },
      {
        name: "Theme",
        definition: "typedef struct {\n    ThemeColor primary;\n    ThemeColor secondary;\n    ThemeColor accent;\n    float hue, sat, light;\n} Theme;",
        description: "Three-color palette generated from random HSL inputs."
      }
    ],
    functions: [
      {
        name: "theme_generate",
        signature: "void theme_generate(Theme *t)",
        description: "Generate a random theme (primary, secondary, accent) from random HSL inputs stored in the struct.",
        example: "Theme theme;\ntheme_generate(&theme);"
      },
      {
        name: "theme_hsl_to_rgb",
        signature: "ThemeColor theme_hsl_to_rgb(float h, float s, float l)",
        description: "Convert HSL (all 0..1) to a ThemeColor.",
        example: "ThemeColor c = theme_hsl_to_rgb(0.5, 0.8, 0.5);"
      },
      {
        name: "theme_complementary",
        signature: "ThemeColor theme_complementary(const Theme *t)",
        description: "Hue rotated 180 degrees, with saturation/lightness boosted for legibility.",
        example: "ThemeColor comp = theme_complementary(&theme);"
      }
    ]
  },
  {
    name: "ui_utils",
    description: "Design-space (640x480) drawing with overscan-safe mapping",
    types: [],
    constants: [
      { name: "UI_DESIGN_WIDTH", value: "640", description: "Design-space width" },
      { name: "UI_DESIGN_HEIGHT", value: "480", description: "Design-space height" }
    ],
    functions: [
      {
        name: "ui_set_overscan_pct",
        signature: "void ui_set_overscan_pct(int pct)",
        description: "Set the percent of each edge assumed lost to overscan. Consumer CRTs typically clip 5-10%.",
        example: "ui_set_overscan_pct(6);"
      },
      {
        name: "ui_get_overscan_pct",
        signature: "int ui_get_overscan_pct(void)",
        description: "Current overscan percent.",
        example: "int pct = ui_get_overscan_pct();"
      },
      {
        name: "ui_safe_x",
        signature: "int ui_safe_x(void)",
        description: "Safe-area left edge in real screen pixels.",
        example: "int x = ui_safe_x();"
      },
      {
        name: "ui_safe_y",
        signature: "int ui_safe_y(void)",
        description: "Safe-area top edge in real screen pixels.",
        example: "int y = ui_safe_y();"
      },
      {
        name: "ui_safe_w",
        signature: "int ui_safe_w(void)",
        description: "Safe-area width in real screen pixels.",
        example: "int w = ui_safe_w();"
      },
      {
        name: "ui_safe_h",
        signature: "int ui_safe_h(void)",
        description: "Safe-area height in real screen pixels.",
        example: "int h = ui_safe_h();"
      },
      {
        name: "ui_map_x",
        signature: "int ui_map_x(int design_x)",
        description: "Map a design-space X to screen X.",
        example: "int sx = ui_map_x(320);"
      },
      {
        name: "ui_map_y",
        signature: "int ui_map_y(int design_y)",
        description: "Map a design-space Y to screen Y.",
        example: "int sy = ui_map_y(240);"
      },
      {
        name: "ui_map_w",
        signature: "int ui_map_w(int design_w)",
        description: "Map a design-space width to screen pixels.",
        example: "int sw = ui_map_w(200);"
      },
      {
        name: "ui_map_h",
        signature: "int ui_map_h(int design_h)",
        description: "Map a design-space height to screen pixels.",
        example: "int sh = ui_map_h(40);"
      },
      {
        name: "ui_map_size",
        signature: "unsigned int ui_map_size(unsigned int design_size)",
        description: "Map a design-space size (font, radius, etc.) to screen pixels.",
        example: "unsigned int fs = ui_map_size(16);"
      },
      {
        name: "ui_draw_text_shadow",
        signature: "void ui_draw_text_shadow(int design_x, int design_y, const char *text, unsigned int design_size, u32 color)",
        description: "Draw text with a drop shadow at design-space coordinates.",
        example: 'ui_draw_text_shadow(10, 10, "SCORE", 12, COLOR_WHITE);'
      },
      {
        name: "ui_draw_centered_text",
        signature: "void ui_draw_centered_text(int design_y, const char *text, unsigned int design_size, u32 color)",
        description: "Draw horizontally centered text at a design-space Y.",
        example: 'ui_draw_centered_text(240, "GAME OVER", 24, COLOR_WHITE);'
      },
      {
        name: "ui_draw_text_centered_in",
        signature: "void ui_draw_text_centered_in(int design_x, int design_y, int design_w, int design_h, const char *text, unsigned int design_size, u32 color)",
        description: "Centre text inside a design-space rectangle, both horizontally and vertically.",
        example: 'ui_draw_text_centered_in(200, 200, 240, 80, "OK", 16, COLOR_WHITE);'
      },
      {
        name: "ui_text_width",
        signature: "int ui_text_width(const char *text, unsigned int design_size)",
        description: "Width of text in design-space units. Returns 0 when no font loaded.",
        example: 'int w = ui_text_width("GAME OVER", 24);'
      },
      {
        name: "ui_draw_panel",
        signature: "void ui_draw_panel(int design_x, int design_y, int design_w, int design_h, u32 fill, u32 outline, int radius)",
        description: "Filled panel with optional outline and optional rounded corners. radius is in design units; 0 = plain rectangle.",
        example: 'ui_draw_panel(100, 100, 440, 280, 0x1a1a2eFF, 0x6a7a9aFF, 8);'
      },
      {
        name: "ui_draw_dim_overlay",
        signature: "void ui_draw_dim_overlay(u32 color)",
        description: "Full-screen scrim for modal layers.",
        example: "ui_draw_dim_overlay(0x000000AA);"
      },
      {
        name: "ui_draw_border",
        signature: "void ui_draw_border(void)",
        description: "Draw the safe-area border.",
        example: "ui_draw_border();"
      },
      {
        name: "ui_draw_text_wrapped",
        signature: "int ui_draw_text_wrapped(int design_x, int design_y, int design_w, const char *text, unsigned int design_size, u32 color, int line_spacing)",
        description: "Word-wrapped paragraph text inside a design-space column. Returns the Y just past the last line drawn.",
        example: 'int next_y = ui_draw_text_wrapped(100, 200, 440,\n    "Welcome to the game!", 12, COLOR_WHITE, 4);'
      },
      {
        name: "ui_set_shadow_color",
        signature: "void ui_set_shadow_color(u32 color)",
        description: "Colour of the drop shadow under every string this module draws. Defaults to black, which is right for light text on a dark background and wrong under a dark glyph on a pale panel — there it turns the letter into a smudge. Set once at startup, like the overscan.",
        example: 'ui_set_shadow_color(RGBA(60, 0, 0, 255));  /* warm, for a pale card face */'
      },
      {
        name: "ui_get_shadow_color",
        signature: "u32 ui_get_shadow_color(void)",
        description: "The current shadow colour. Useful for saving and restoring it around one oddly-coloured panel rather than changing it globally.",
        example: 'u32 saved = ui_get_shadow_color();\nui_set_shadow_color(panel_bg);\nui_draw_text_centered_in(x, y, w, h, "A", 24, fg);\nui_set_shadow_color(saved);'
      },
      {
        name: "ui_set_border_color",
        signature: "void ui_set_border_color(u32 color)",
        description: "Colour of ui_draw_border(). Defaults to cyan, which reads as another program's chrome on a game with its own palette.",
        example: 'ui_set_border_color(RGBA(107, 0, 0, 255));  /* lava, not cyan */'
      },
      {
        name: "ui_get_border_color",
        signature: "u32 ui_get_border_color(void)",
        description: "The current border colour.",
        example: "u32 border = ui_get_border_color();"
      }
    ]
  }
];

/* ── Rendering ───────────────────────────────────────── */

let activeModule = "all";
let searchQuery = "";
let expandedCards = new Set();

function countFunctions(mod) {
  return mod.functions.length;
}

function totalFunctions() {
  return MODULES.reduce((sum, m) => sum + m.functions.length, 0);
}

function render() {
  const container = document.getElementById("api-modules");
  if (!container) return;

  const q = searchQuery.toLowerCase();
  let html = "";
  let shownCount = 0;

  for (const mod of MODULES) {
    if (activeModule !== "all" && activeModule !== mod.name) continue;

    const filtered = mod.functions.filter(f => {
      if (!q) return true;
      return f.name.toLowerCase().includes(q)
        || f.signature.toLowerCase().includes(q)
        || f.description.toLowerCase().includes(q);
    });

    if (filtered.length === 0 && q) continue;
    shownCount += filtered.length;

    const isCollapsed = !q && !expandedCards.has(mod.name);
    html += `<div class="module-section${isCollapsed ? " collapsed" : ""}" data-module="${mod.name}">`;
    html += `<div class="module-header" onclick="toggleModule('${mod.name}')">`;
    html += `<h2>${mod.name}</h2>`;
    if (mod.description) html += `<span class="module-desc">${mod.description}</span>`;
    html += `<span class="module-count">${filtered.length}</span>`;
    html += `<span class="module-toggle">▼</span>`;
    html += `</div>`;
    html += `<div class="module-body">`;

    if (mod.constants && mod.constants.length > 0) {
      html += `<div class="constants-block">`;
      html += `<div class="type-label">constants</div>`;
      html += `<pre>`;
      for (const c of mod.constants) {
        html += `#define ${c.name}  ${c.value}\n`;
      }
      html += `</pre>`;
      html += `<div class="constants-desc">${mod.constants.map(c => c.description).join(" &middot; ")}</div>`;
      html += `</div>`;
    }

    if (mod.types) {
      for (const t of mod.types) {
        html += `<div class="type-block">`;
        html += `<div class="type-label">type: ${escHtml(t.name)}</div>`;
        html += `<pre>${escHtml(t.definition)}</pre>`;
        html += `<div class="type-desc">${escHtml(t.description)}</div>`;
        html += `</div>`;
      }
    }

    for (const f of filtered) {
      const cardId = mod.name + "." + f.name;
      const isExpanded = expandedCards.has(cardId);
      html += `<div class="func-card${isExpanded ? " expanded" : ""}" data-id="${cardId}">`;
      html += `<div class="func-header" onclick="toggleCard('${cardId}')">`;
      html += `<span class="func-name">${escHtml(f.name)}</span>`;
      html += `<span class="func-signature-preview">${escHtml(f.signature)}</span>`;
      html += `<span class="func-toggle">▶</span>`;
      html += `</div>`;
      html += `<div class="func-body">`;
      html += `<div class="func-sig"><code>${escHtml(f.signature)}</code></div>`;
      html += `<div class="func-desc">${escHtml(f.description)}</div>`;
      if (f.example) {
        html += `<div class="func-example">`;
        html += `<div class="func-example-label">example</div>`;
        html += `<pre><code class="language-c">${escHtml(f.example)}</code></pre>`;
        html += `</div>`;
      }
      html += `</div>`;
      html += `</div>`;
    }

    html += `</div></div>`;
  }

  if (shownCount === 0) {
    html = `<div class="no-results">no functions match "${escHtml(searchQuery)}"</div>`;
  }

  container.innerHTML = html;

  const statsEl = document.getElementById("stats");
  if (statsEl) {
    statsEl.textContent = `${shownCount} of ${totalFunctions()} functions`;
  }

  if (typeof hljs !== "undefined") {
    document.querySelectorAll("pre code.language-c").forEach(block => {
      hljs.highlightElement(block);
    });
  }
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ── Interactions ────────────────────────────────────── */

function toggleModule(name) {
  if (expandedCards.has(name)) {
    expandedCards.delete(name);
  } else {
    expandedCards.add(name);
  }
  render();
}

function toggleCard(id) {
  if (expandedCards.has(id)) {
    expandedCards.delete(id);
  } else {
    expandedCards.add(id);
  }
  const card = document.querySelector(`.func-card[data-id="${id}"]`);
  if (card) card.classList.toggle("expanded");
}

function setModule(name) {
  activeModule = name;
  document.querySelectorAll(".module-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.module === name);
  });
  render();
}

/* ── Init ────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", function () {
  const tabs = document.querySelectorAll(".module-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => setModule(tab.dataset.module));
  });

  const search = document.getElementById("search-input");
  if (search) {
    let timeout;
    search.addEventListener("input", () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        searchQuery = search.value;
        render();
      }, 150);
    });
  }

  const clearBtn = document.getElementById("search-clear");
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      search.value = "";
      searchQuery = "";
      render();
    });
  }

  render();
});
