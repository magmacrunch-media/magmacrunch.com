// game.js

class Game2048 {
    constructor(difficulty = '11', target = 2048) {
        this.size = 4;
        this.grid = null;
        this.score = 0;
        this.gameOver = false;
        this.waitingForInitials = false;
        this.difficulty = difficulty;
        this.target = target;
        this.tileStates = {};
        this.renderer = null;

        this.init();
    }

    init() {
        this.grid = AdPuzzle.PuzzleGrid.create(this.size);
        this.score = 0;
        this.gameOver = false;
        this.waitingForInitials = false;
        this.tileStates = {};

        this.addRandomTile();
        this.addRandomTile();

        allScores.forEach(s => s.isNew = false);

        this.render();
    }

    addRandomTile() {
        const empty = AdPuzzle.PuzzleGrid.getEmptyCells(this.grid);
        if (empty.length > 0) {
            const { row, col } = empty[Math.floor(Math.random() * empty.length)];
            this.grid.board[row][col] = Math.random() < 0.9 ? 2 : 4;
            this.tileStates[`${row},${col}`] = 'new';
        }
    }

    move(direction) {
        const before = AdPuzzle.PuzzleGrid.clone(this.grid);

        if (direction === 'left') {
            this.moveLeft();
        } else if (direction === 'right') {
            this.rotateBoard(2);
            this.moveLeft();
            this.rotateBoard(2);
        } else if (direction === 'up') {
            this.rotateBoard(3);
            this.moveLeft();
            this.rotateBoard(1);
        } else if (direction === 'down') {
            this.rotateBoard(1);
            this.moveLeft();
            this.rotateBoard(3);
        }

        return !AdPuzzle.PuzzleGrid.equals(before, this.grid);
    }

    moveLeft() {
        for (let i = 0; i < this.size; i++) {
            let row = this.grid.board[i].filter(val => val !== 0);

            for (let j = 0; j < row.length - 1; j++) {
                if (row[j] === row[j + 1]) {
                    row[j] *= 2;
                    this.score += row[j];
                    row.splice(j + 1, 1);
                }
            }

            while (row.length < this.size) {
                row.push(0);
            }

            this.grid.board[i] = row;
        }
    }

    rotateBoard(times) {
        for (let t = 0; t < times; t++) {
            const newBoard = Array(this.size).fill().map(() => Array(this.size).fill(0));
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    newBoard[j][this.size - 1 - i] = this.grid.board[i][j];
                }
            }
            this.grid.board = newBoard;
        }
    }

    checkGameOver() {
        this.justWon = false;

        if (this.difficulty !== 'endless') {
            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    if (this.grid.board[i][j] >= this.target) {
                        this.gameOver = true;
                        this.justWon = true;
                        return true;
                    }
                }
            }
        }

        if (!AdPuzzle.PuzzleGrid.isFull(this.grid)) return false;

        if (AdPuzzle.PuzzleGrid.hasAdjacentMatches(this.grid)) return false;

        this.gameOver = true;
        return true;
    }

    handleGameOver() {
        if (!Array.isArray(allScores)) {
            allScores = [];
        }

        const difficultyScores = allScores
            .filter(s => s.difficulty === this.difficulty)
            .sort((a, b) => b.score - a.score);
        const lowestTopScore = difficultyScores.length >= 10 ? difficultyScores[9].score : -1;

        if (difficultyScores.length < 10 || this.score > lowestTopScore) {
            let rank = 1;
            for (let i = 0; i < difficultyScores.length; i++) {
                if (this.score > difficultyScores[i].score) {
                    break;
                }
                rank++;
            }

            this.waitingForInitials = true;

            const promptTitle = document.querySelector('#initialsPrompt h3');
            promptTitle.textContent = `NEW HIGH SCORE! YOU'RE #${rank}`;

            document.getElementById('initialsPrompt').classList.add('active');
            setTimeout(() => document.getElementById('initialsInput').focus(), 100);
        } else {
            this.showGameOver();
        }
    }

    submitInitials() {
        if (this.submittingInitials) {
            return;
        }
        this.submittingInitials = true;

        const initialsInput = document.getElementById('initialsInput');
        let initials = initialsInput.value.trim();

        if (!initials || initials.length === 0) {
            initials = 'AAA';
        }

        if (!Array.isArray(allScores)) {
            allScores = [];
        }

        allScores.push({
            initials: initials,
            score: this.score,
            difficulty: this.difficulty,
            isNew: true
        });

        allScores.sort((a, b) => b.score - a.score);

        scoreClient.save('2n', initials, this.score, { difficulty: this.difficulty });
        updateScoreboard(this.difficulty);

        document.getElementById('initialsPrompt').classList.remove('active');
        initialsInput.value = '';
        this.waitingForInitials = false;

        setTimeout(() => {
            this.submittingInitials = false;
        }, 1000);

        this.showGameOver();
    }

    showGameOver() {
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOver').classList.add('active');
    }

    render() {
        if (this.renderer) {
            this.renderer.renderGrid(this.grid, (r, c, val) => {
                const tile = document.createElement('div');
                const state = this.tileStates[`${r},${c}`];
                tile.className = state ? `tile ${state}` : 'tile';

                if (val !== 0) {
                    tile.textContent = val;
                    tile.setAttribute('data-value', val);
                }

                return tile;
            });
        } else {
            // Fallback: manual rendering if renderer not yet initialized
            const gameBoard = document.getElementById('gameBoard');
            gameBoard.innerHTML = '';

            for (let i = 0; i < this.size; i++) {
                for (let j = 0; j < this.size; j++) {
                    const tile = document.createElement('div');
                    const state = this.tileStates[`${i},${j}`];
                    tile.className = state ? `tile ${state}` : 'tile';
                    const value = this.grid.board[i][j];

                    if (value !== 0) {
                        tile.textContent = value;
                        tile.setAttribute('data-value', value);
                    }

                    gameBoard.appendChild(tile);
                }
            }

            document.getElementById('score').textContent = this.score;
        }
        this.tileStates = {};
    }
}

// Global event handlers — set up once, not per game instance
if (!window.gameHandlersSetup) {
    window.gameHandlersSetup = true;

    // ── New Game button ──
    document.getElementById('newGame').addEventListener('click', () => {
        document.querySelector('.container').classList.remove('game-active');
        document.getElementById('difficultyModal').classList.add('active');
        window.isDifficultyModalOpen = true;
    });

    // ── Restart (play again) button ──
    document.getElementById('restartGame').addEventListener('click', () => {
        document.getElementById('gameOver').classList.remove('active');
        document.querySelector('.container').classList.remove('game-active');
        document.getElementById('difficultyModal').classList.add('active');
        window.isDifficultyModalOpen = true;
    });

    // ── Initials input handlers ──
    const initialsInput = document.getElementById('initialsInput');

    initialsInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
    });

    initialsInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentGame && !currentGame.submittingInitials) {
            currentGame.submitInitials();
        }
    });

    document.getElementById('submitInitials').addEventListener('click', () => {
        if (currentGame && !currentGame.submittingInitials) {
            currentGame.submitInitials();
        }
    });
}
