/* ═══════════════════════════════════════════════
   magmacrunch arcade — board game HTML template
   shared/board-game-template.js
   ═══════════════════════════════════════════════
   Generates common HTML structure for board games.
   Each game provides a config object and calls
   BoardGameTemplate.render(config).

   Usage in game's index.html:
     <script src="../shared/board-game-template.js"></script>
     <script>BoardGameTemplate.render({ title: 'CHESS', ... })</script>
     ...then the game's own <script> tags, statically, after this block.

   render() builds MARKUP ONLY. It used to emit the page's <script> tags too,
   but it injects with insertAdjacentHTML, and the HTML spec says <script>
   elements inserted that way never execute — so every script it "loaded" was
   silently inert and chess, checkers and backgammon never ran at all. Script
   tags now live in each page's static HTML, which is also how every other
   arcade game loads and lets sync-adenosine.mjs stamp their cache-busters.
   ═══════════════════════════════════════════════ */

window.BoardGameTemplate = (function () {
    'use strict';

    function esc(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    /**
     * Render the full page HTML from a config object.
     * Config keys:
     *   title       — game title (e.g. "CHESS")
     *   subtitle    — subtitle (e.g. "// NEON EDITION //")
     *   footer      — array of footer lines
     *   buttons     — array of { id, label, class?, icon? }
     *   extraStart  — HTML string injected after start-buttons
     *   gameHeader  — extra stat items HTML (beyond default TURN)
     *   gameBody    — HTML injected inside game-layout (after board-area)
     *   gameControls — array of { id, label } (default: NEW GAME + MENU)
     *   instructions — HTML string for instructions modal body
     *   credits     — HTML string for credits modal body
     *   gameOverTitle — default "YOU WIN!"
     *   gameOverMsg  — default "Congratulations!"
     *   extraHead   — extra CSS/JS links in <head>
     */
    function render(cfg) {
        var title = cfg.title || 'GAME';
        var subtitle = cfg.subtitle || '// NEON EDITION //';
        var footer = cfg.footer || ['CLASSIC BOARD GAME'];
        var buttons = cfg.buttons || [
            { id: 'startGameBtn', label: '▶\u00a0\u00a0CLICK OR PRESS SPACE TO START', cls: 'primary' },
            { id: 'helpBtn', label: 'HOW TO PLAY' },
            { id: 'creditsBtn', label: 'CREDITS' }
        ];
        var gameControls = cfg.gameControls || [
            { id: 'newGameBtn', label: 'NEW GAME' },
            { id: 'menuBtn', label: 'MENU' }
        ];

        // ── Start buttons ──
        var btnsHtml = '';
        for (var i = 0; i < buttons.length; i++) {
            var b = buttons[i];
            var cls = 'start-btn' + (b.cls ? ' ' + b.cls : '');
            var icon = b.icon ? b.icon + '&nbsp;&nbsp;' : '';
            btnsHtml += '<button id="' + esc(b.id) + '" class="' + cls + '">' + icon + esc(b.label) + '</button>\n';
        }

        // ── Start footer ──
        var footerHtml = '';
        for (var j = 0; j < footer.length; j++) {
            footerHtml += '<p>' + esc(footer[j]) + '</p>\n';
        }

        // ── Game controls ──
        var controlsHtml = '';
        for (var k = 0; k < gameControls.length; k++) {
            var c = gameControls[k];
            controlsHtml += '<button id="' + esc(c.id) + '" class="control-btn">' + esc(c.label) + '</button>\n';
        }

        // ── Extra game body ──
        var gameBody = cfg.gameBody || '';

        // ── Extra game header stats ──
        var extraStats = cfg.gameHeader || '';

        // ── Instructions ──
        var instructions = cfg.instructions || '<h3>Rules</h3><p>Game instructions go here.</p>';

        // ── Credits ──
        var credits = cfg.credits || '<h3>' + esc(title) + '</h3><h4>Game Design & Development</h4><p>Jake A. McCoy</p><h4>Publisher</h4><p><strong>magmacrunch media</strong></p>';

        // ── Build HTML ──
        var html = '';

        // Start screen
        html += '<div id="startScreen" class="start-screen">\n';
        html += '  <div class="start-content">\n';
        html += '    <h1 class="game-title">' + esc(title) + '</h1>\n';
        html += '    <p class="game-subtitle">' + subtitle + '</p>\n';
        html += '    <div class="start-divider"></div>\n';
        html += '    <div class="start-buttons">\n' + btnsHtml + '    </div>\n';
        if (cfg.extraStart) html += cfg.extraStart + '\n';
        html += '    <div class="start-footer">\n' + footerHtml + '    </div>\n';
        html += '  </div>\n';
        html += '</div>\n\n';

        // Game screen
        html += '<div id="gameScreen" class="game-screen" style="display: none;">\n';
        html += '  <div class="game-header">\n';
        html += '    <h1><span style="color: #00f5ff;">◄</span> ' + esc(title) + ' <span style="color: #ff2d78;">►</span></h1>\n';
        html += '    <div class="game-stats">\n';
        html += '      <div class="stat-item"><span class="stat-label">TURN</span><span class="stat-value" id="turnIndicator">YOUR TURN</span></div>\n';
        html += extraStats;
        html += '    </div>\n';
        html += '  </div>\n\n';
        html += '  <div class="game-layout">\n';
        html += '    <div class="board-area">\n';
        html += '      <div id="boardContainer" class="board-container"></div>\n';
        html += '    </div>\n';
        html += gameBody;
        html += '  </div>\n\n';
        html += '  <div class="message-area">\n';
        html += '    <div id="gameMessage" class="game-message">Select a piece to move</div>\n';
        html += '  </div>\n\n';
        html += '  <div class="game-controls">\n' + controlsHtml + '  </div>\n';
        html += '</div>\n';

        // Lobby overlay (multiplayer)
        html += '<div id="lobbyOverlay" class="modal-overlay" style="display: none;">\n';
        html += '  <div class="modal-content lobby-content">\n';
        html += '    <div class="modal-titlebar"><span>ONLINE LOBBY</span><button id="closeLobby" class="modal-close">✕</button></div>\n';
        html += '    <div class="modal-body">\n';
        html += '      <div id="lobbyStatus" class="lobby-status">Connecting...</div>\n';
        html += '      <div id="roomCodeDisplay" class="room-code-display" style="display: none;"><span class="room-code-label">ROOM</span><span id="roomCodeValue" class="room-code-value">----</span></div>\n';
        html += '      <div class="lobby-players"><div class="lobby-players-header">PLAYERS</div><div id="lobbyPlayerList" class="lobby-player-list"></div></div>\n';
        html += '      <div class="lobby-actions">\n';
        html += '        <button id="startMultiplayerBtn" class="start-btn primary" style="display: none;">START GAME</button>\n';
        html += '        <button id="spectateBtn" class="start-btn">SPECTATE</button>\n';
        html += '        <button id="leaveLobbyBtn" class="start-btn">LEAVE</button>\n';
        html += '      </div>\n';
        html += '    </div>\n';
        html += '  </div>\n';
        html += '</div>\n\n';

        // Instructions modal
        html += '<div id="instructionsModal" class="modal-overlay">\n';
        html += '  <div class="modal-content">\n';
        html += '    <div class="modal-titlebar"><span>HOW TO PLAY</span><button id="closeInstructions" class="modal-close">✕</button></div>\n';
        html += '    <div class="modal-body">\n' + instructions + '\n';
        html += '      <div class="modal-footer"><button id="closeInstructionsBtn">GOT IT!</button></div>\n';
        html += '    </div>\n';
        html += '  </div>\n';
        html += '</div>\n\n';

        // Credits modal
        html += '<div id="creditsModal" class="modal-overlay">\n';
        html += '  <div class="modal-content">\n';
        html += '    <div class="modal-titlebar"><span>CREDITS</span><button id="closeCredits" class="modal-close">✕</button></div>\n';
        html += '    <div class="modal-body">\n' + credits + '\n';
        html += '      <div class="modal-footer"><button id="closeCreditsBtn">OK</button></div>\n';
        html += '    </div>\n';
        html += '  </div>\n';
        html += '</div>\n\n';

        // Game over modal
        html += '<div id="gameOverModal" class="modal-overlay">\n';
        html += '  <div class="modal-content game-over-content">\n';
        html += '    <div class="modal-titlebar"><span>GAME OVER</span></div>\n';
        html += '    <div class="modal-body">\n';
        html += '      <div class="game-over-icon">🏆</div>\n';
        html += '      <div id="gameOverTitle" class="game-over-title win">' + esc(cfg.gameOverTitle || 'YOU WIN!') + '</div>\n';
        html += '      <div id="gameOverMessage" class="game-over-message">' + esc(cfg.gameOverMsg || 'Congratulations!') + '</div>\n';
        html += '      <div class="modal-footer"><button id="playAgainBtn">PLAY AGAIN</button></div>\n';
        html += '    </div>\n';
        html += '  </div>\n';
        html += '</div>\n\n';


        // Inject into container
        var container = document.querySelector('.container');
        if (container) {
            // Preserve any existing content before game screen (like start screen markup)
            // and append our generated content
            container.insertAdjacentHTML('beforeend', html);
        }

        return html;
    }

    return { render: render };
})();
