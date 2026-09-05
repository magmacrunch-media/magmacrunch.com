// cribbage-board.js — Cribbage board rendering | MagmaCrunch Media © 2026
// Traditional 121-hole cribbage board with front and back pegs

const CribbageBoard = {
    // Board configuration — three streets of forty, then the game hole
    STREETS: 3,
    HOLES_PER_STREET: 40,
    HOLES_PER_GROUP: 5,
    TOTAL_HOLES: 121,

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

    // ── Initialize the board ──────────────────────────────────
    init(containerId) {
        this.boardEl = document.getElementById(containerId);
        if (!this.boardEl) return;

        this.scores = { player: 0, ai: 0 };
        this.prevScores = { player: 0, ai: 0 };
        this.render();
        this.updatePegs(0, 0);
    },

    // ── Render the board HTML ─────────────────────────────────
    render() {
        // Rebuilding must not undo the collapse the player (or the phone
        // layout) chose, so only the contents are replaced.
        this.boardEl.innerHTML = '';
        this.boardEl.classList.add('cribbage-board');

        this.boardEl.appendChild(this.createScoreDisplay());

        const lanes = document.createElement('div');
        lanes.className = 'board-lanes';
        lanes.appendChild(this.createLane('player', 'You'));
        lanes.appendChild(this.createLane('ai', 'Opponent'));
        this.boardEl.appendChild(lanes);
    },

    createScoreDisplay() {
        const scores = document.createElement('div');
        scores.className = 'board-scores';

        for (const [player, label] of [['player', 'You'], ['ai', 'Opponent']]) {
            const item = document.createElement('div');
            item.className = `score-item ${player}-score`;

            const name = document.createElement('span');
            name.className = 'score-label';
            name.textContent = label;

            const value = document.createElement('span');
            value.className = 'score-value';
            value.id = `${player}ScoreDisplay`;
            value.textContent = '0';

            item.append(name, value);
            scores.appendChild(item);
        }

        return scores;
    },

    // ── Create one player's three streets ─────────────────────
    createLane(player, label) {
        const lane = document.createElement('div');
        lane.className = `board-lane ${player}-lane`;
        lane.style.setProperty('--peg-color', this.COLORS[player].peg);
        lane.style.setProperty('--peg-shadow', this.COLORS[player].shadow);

        const title = document.createElement('div');
        title.className = 'track-label';
        title.textContent = label;
        lane.appendChild(title);

        const streets = document.createElement('div');
        streets.className = 'board-streets';

        for (let street = 0; street < this.STREETS; street++) {
            const row = document.createElement('div');
            row.className = 'board-street';

            // Holes are grouped in fives, the way a real board is drilled, so
            // a glance lands on the right one without counting.
            for (let start = 0; start < this.HOLES_PER_STREET; start += this.HOLES_PER_GROUP) {
                const group = document.createElement('div');
                group.className = 'hole-group';

                for (let i = 0; i < this.HOLES_PER_GROUP; i++) {
                    const position = street * this.HOLES_PER_STREET + start + i + 1;
                    group.appendChild(this.createHole(player, position));
                }
                row.appendChild(group);
            }
            streets.appendChild(row);
        }

        lane.appendChild(streets);

        // 121 sits on its own, past the last street.
        const game = document.createElement('div');
        game.className = 'board-game-hole';
        game.appendChild(this.createHole(player, this.TOTAL_HOLES));
        const gameLabel = document.createElement('span');
        gameLabel.className = 'game-hole-label';
        gameLabel.textContent = '121';
        game.appendChild(gameLabel);
        lane.appendChild(game);

        return lane;
    },

    createHole(player, position) {
        const hole = document.createElement('div');
        hole.className = 'board-hole';
        hole.dataset.position = position;
        hole.dataset.player = player;
        if (position % this.HOLES_PER_GROUP === 0) hole.classList.add('marker');
        return hole;
    },

    // ── Update peg positions ──────────────────────────────────
    updatePegs(playerScore, aiScore) {
        this.prevScores.player = this.scores.player;
        this.prevScores.ai = this.scores.ai;
        this.scores.player = playerScore;
        this.scores.ai = aiScore;

        for (const player of ['player', 'ai']) {
            const scoreEl = document.getElementById(`${player}ScoreDisplay`);
            if (scoreEl) scoreEl.textContent = this.scores[player];

            this.placePegs(player, this.scores[player], this.prevScores[player]);
        }
    },

    // ── Seat both pegs for one player ─────────────────────────
    // Pegs live inside their hole rather than at absolute coordinates, so the
    // board can reflow — collapse, rotate, resize — without them drifting off.
    placePegs(player, score, prevScore) {
        if (!this.boardEl) return;

        const lane = this.boardEl.querySelector(`.${player}-lane`);
        if (!lane) return;

        lane.querySelectorAll('.board-peg').forEach(peg => peg.remove());
        lane.querySelectorAll('.board-hole.pegged').forEach(h => h.classList.remove('pegged'));

        this.seatPeg(lane, prevScore, 'back-peg');
        this.seatPeg(lane, score, 'front-peg');
    },

    seatPeg(lane, score, className) {
        if (score <= 0) return;

        const position = Math.min(score, this.TOTAL_HOLES);
        const hole = lane.querySelector(`.board-hole[data-position="${position}"]`);
        if (!hole) return;

        const peg = document.createElement('div');
        peg.className = `board-peg ${className}`;
        hole.classList.add('pegged');
        hole.appendChild(peg);
    },

    // ── Check for winner ──────────────────────────────────────
    checkWinner() {
        if (this.scores.player >= WINNING_SCORE) return 'player';
        if (this.scores.ai >= WINNING_SCORE) return 'ai';
        return null;
    },

    // ── Reset the board ───────────────────────────────────────
    reset() {
        this.scores = { player: 0, ai: 0 };
        this.prevScores = { player: 0, ai: 0 };
        this.updatePegs(0, 0);
    }
};
