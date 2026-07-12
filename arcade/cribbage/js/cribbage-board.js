// cribbage-board.js — Cribbage board rendering | MagmaCrunch Media © 2026
// Traditional 121-hole cribbage board with pegging animation

const CribbageBoard = {
    // Board configuration
    TRACKS: 3,           // Number of tracks per player
    HOLES_PER_TRACK: 41, // Holes per track (41 × 3 = 123, enough for 121)
    TOTAL_HOLES: 121,    // Total holes

    // Player colors
    COLORS: {
        player: { peg: '#00f5ff', shadow: '#007a80' },  // Cyan
        ai:     { peg: '#ff3d6e', shadow: '#991a3a' }   // Rose
    },

    // Current scores
    scores: { player: 0, ai: 0 },

    // Previous scores (for back peg)
    prevScores: { player: 0, ai: 0 },

    // DOM element references
    boardEl: null,
    playerPegEl: null,
    aiPegEl: null,
    playerBackPegEl: null,
    aiBackPegEl: null,

    // ── Initialize the board ──────────────────────────────────
    init(containerId) {
        this.boardEl = document.getElementById(containerId);
        if (!this.boardEl) return;

        this.reset();
        this.render();
        this.updatePegs(0, 0);
    },

    // ── Render the board HTML ─────────────────────────────────
    render() {
        this.boardEl.innerHTML = '';
        this.boardEl.className = 'cribbage-board';

        // Create score displays
        const scoreDisplay = document.createElement('div');
        scoreDisplay.className = 'board-scores';
        scoreDisplay.innerHTML = `
            <div class="score-item player-score">
                <span class="score-label">You</span>
                <span class="score-value" id="playerScoreDisplay">0</span>
            </div>
            <div class="score-item ai-score">
                <span class="score-label">Opponent</span>
                <span class="score-value" id="aiScoreDisplay">0</span>
            </div>
        `;
        this.boardEl.appendChild(scoreDisplay);

        // Create board tracks
        const tracksEl = document.createElement('div');
        tracksEl.className = 'board-tracks';

        // Player track (bottom)
        const playerTrack = this.createTrack('player');
        tracksEl.appendChild(playerTrack);

        // AI track (top)
        const aiTrack = this.createTrack('ai');
        tracksEl.appendChild(aiTrack);

        this.boardEl.appendChild(tracksEl);

        // Create pegs
        this.createPegs();
    },

    // ── Create a single track ─────────────────────────────────
    createTrack(player) {
        const track = document.createElement('div');
        track.className = `board-track ${player}-track`;

        // Create 30 holes per track
        for (let i = 1; i <= this.HOLES_PER_TRACK; i++) {
            const hole = document.createElement('div');
            hole.className = 'board-hole';
            hole.dataset.position = i;
            hole.dataset.player = player;

            // Add markers for every 5th hole
            if (i % 5 === 0) {
                hole.classList.add('marker');
            }

            // Add start hole
            if (i === 1) {
                hole.classList.add('start');
            }

            track.appendChild(hole);
        }

        return track;
    },

    // ── Create peg elements ───────────────────────────────────
    createPegs() {
        // Player pegs
        this.playerPegEl = document.createElement('div');
        this.playerPegEl.className = 'board-peg player-peg';
        this.playerPegEl.style.backgroundColor = this.COLORS.player.peg;
        this.playerPegEl.style.boxShadow = `0 0 6px ${this.COLORS.player.shadow}`;
        this.boardEl.appendChild(this.playerPegEl);

        this.playerBackPegEl = document.createElement('div');
        this.playerBackPegEl.className = 'board-peg player-peg back-peg';
        this.playerBackPegEl.style.backgroundColor = this.COLORS.player.shadow;
        this.boardEl.appendChild(this.playerBackPegEl);

        // AI pegs
        this.aiPegEl = document.createElement('div');
        this.aiPegEl.className = 'board-peg ai-peg';
        this.aiPegEl.style.backgroundColor = this.COLORS.ai.peg;
        this.aiPegEl.style.boxShadow = `0 0 6px ${this.COLORS.ai.shadow}`;
        this.boardEl.appendChild(this.aiPegEl);

        this.aiBackPegEl = document.createElement('div');
        this.aiBackPegEl.className = 'board-peg ai-peg back-peg';
        this.aiBackPegEl.style.backgroundColor = this.COLORS.ai.shadow;
        this.boardEl.appendChild(this.aiBackPegEl);
    },

    // ── Update peg positions ──────────────────────────────────
    updatePegs(playerScore, aiScore, animate = true) {
        // Store previous scores for back peg
        this.prevScores.player = this.scores.player;
        this.prevScores.ai = this.scores.ai;

        // Update current scores
        this.scores.player = playerScore;
        this.scores.ai = aiScore;

        // Update score displays
        const playerScoreEl = document.getElementById('playerScoreDisplay');
        const aiScoreEl = document.getElementById('aiScoreDisplay');
        if (playerScoreEl) playerScoreEl.textContent = playerScore;
        if (aiScoreEl) aiScoreEl.textContent = aiScore;

        // Position pegs
        this.positionPeg(this.playerPegEl, playerScore, 'player');
        this.positionPeg(this.playerBackPegEl, this.prevScores.player, 'player');
        this.positionPeg(this.aiPegEl, aiScore, 'ai');
        this.positionPeg(this.aiBackPegEl, this.prevScores.ai, 'ai');
    },

    // ── Position a single peg ─────────────────────────────────
    positionPeg(pegEl, score, player) {
        if (!pegEl) return;

        if (score === 0) {
            // Hide peg at start
            pegEl.style.display = 'none';
            return;
        }

        pegEl.style.display = 'block';

        // Calculate track and position
        const track = Math.floor((score - 1) / this.HOLES_PER_TRACK);
        const position = score - (track * this.HOLES_PER_TRACK);

        // Find the hole element
        const trackEl = this.boardEl.querySelector(`.${player}-track`);
        if (!trackEl) return;

        const hole = trackEl.querySelector(`[data-position="${position}"]`);
        if (!hole) return;

        // Position peg at hole
        const rect = hole.getBoundingClientRect();
        const boardRect = this.boardEl.getBoundingClientRect();

        pegEl.style.left = `${rect.left - boardRect.left + rect.width / 2 - 6}px`;
        pegEl.style.top = `${rect.top - boardRect.top + rect.height / 2 - 6}px`;
    },

    // ── Check for winner ──────────────────────────────────────
    checkWinner() {
        if (this.scores.player >= WINNING_SCORE) return 'player';
        if (this.scores.ai >= WINNING_SCORE) return 'ai';
        return null;
    },

    // ── Reset the board ───────────────────────────────────────
    reset() {
        this.scores.player = 0;
        this.scores.ai = 0;
        this.prevScores.player = 0;
        this.prevScores.ai = 0;
        this.updatePegs(0, 0, false);
    }
};
