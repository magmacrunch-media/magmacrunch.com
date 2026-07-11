/**
 * puzzle-scoring.js — Score tracking with localStorage persistence
 * Provides: Score storage, high scores, ranking
 */

var PuzzleScoring = (function() {

    /**
     * Create a new PuzzleScoring instance
     * @param {string} gameName - Unique name for the game (e.g., '2048', 'fifteen-puzzle')
     * @param {object} config - Optional configuration
     * @param {boolean} config.ascending - If true, lower scores rank higher (e.g., fewest moves)
     */
    function create(gameName, config) {
        config = config || {};
        var storageKey = gameName + '_scores';
        var ascending = config.ascending || false;
        var scores = loadScores();

        function loadScores() {
            try {
                var data = localStorage.getItem(storageKey);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                return [];
            }
        }

        function saveScores() {
            try {
                localStorage.setItem(storageKey, JSON.stringify(scores));
            } catch (e) {
                console.error('Failed to save scores:', e);
            }
        }

        /**
         * Add a new score
         * @param {number} score - The score value
         * @param {string} difficulty - Difficulty key
         * @param {object} metadata - Additional data (moves, time, highestTile, etc.)
         * @returns {number} The rank of this score (1-based)
         */
        function addScore(score, difficulty, metadata) {
            metadata = metadata || {};
            var entry = {
                score: score,
                difficulty: difficulty,
                date: new Date().toISOString(),
                moves: metadata.moves || 0,
                time: metadata.time || 0,
                highestTile: metadata.highestTile || 0
            };
            scores.push(entry);
            scores.sort(function(a, b) {
                return ascending ? a.score - b.score : b.score - a.score;
            });
            scores = scores.slice(0, 100); // Keep top 100
            saveScores();
            return getRank(score, difficulty);
        }

        /**
         * Get rank of a score (1-based)
         */
        function getRank(score, difficulty) {
            var filtered = difficulty
                ? scores.filter(function(s) { return s.difficulty === difficulty; })
                : scores;
            for (var i = 0; i < filtered.length; i++) {
                if (ascending ? score <= filtered[i].score : score >= filtered[i].score) return i + 1;
            }
            return filtered.length + 1;
        }

        /**
         * Get top scores
         * @param {string} difficulty - Filter by difficulty (null for all)
         * @param {number} limit - Max number to return
         */
        function getTopScores(difficulty, limit) {
            limit = limit || 10;
            var filtered = scores;
            if (difficulty) {
                filtered = scores.filter(function(s) { return s.difficulty === difficulty; });
            }
            return filtered.slice(0, limit);
        }

        /**
         * Check if a score qualifies as a new high score
         */
        function isNewHighScore(score, difficulty) {
            var topScores = getTopScores(difficulty, 10);
            if (topScores.length < 10) return true;
            return ascending ? score < topScores[topScores.length - 1].score : score > topScores[topScores.length - 1].score;
        }

        /**
         * Get all unique difficulties that have scores
         */
        function getDifficulties() {
            var diffMap = {};
            scores.forEach(function(s) {
                if (s.difficulty) diffMap[s.difficulty] = true;
            });
            return Object.keys(diffMap);
        }

        /**
         * Clear all scores for this game
         */
        function clearScores() {
            scores = [];
            saveScores();
        }

        return {
            addScore: addScore,
            getRank: getRank,
            getTopScores: getTopScores,
            isNewHighScore: isNewHighScore,
            getDifficulties: getDifficulties,
            clearScores: clearScores
        };
    }

    return {
        create: create
    };

})();
