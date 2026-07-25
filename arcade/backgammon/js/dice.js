/**
 * dice.js — Dice rolling and doubling cube logic
 */

var Dice = (function() {

    // ── State ────────────────────────────────────────────────────────────────
    var currentDice = [0, 0];
    var doublingCube = 1;
    var doublingOwner = null; // null = center, 'player', 'ai'
    var isRolling = false;

    // ── Roll Dice ────────────────────────────────────────────────────────────
    function roll() {
        currentDice[0] = Math.floor(Math.random() * 6) + 1;
        currentDice[1] = Math.floor(Math.random() * 6) + 1;
        return currentDice.slice();
    }

    function getValues() {
        return currentDice.slice();
    }

    function isDoubles() {
        return currentDice[0] === currentDice[1];
    }

    function getDoublesCount() {
        return isDoubles() ? 4 : 2;
    }

    // ── Doubling Cube ────────────────────────────────────────────────────────
    function canDouble(player) {
        if (doublingCube >= 64) return false;
        if (doublingOwner === null) return true; // Center, either can double
        return doublingOwner === player;
    }

    function double(player) {
        if (!canDouble(player)) return false;
        doublingCube *= 2;
        doublingOwner = player === BG.PLAYER ? BG.AI : BG.PLAYER;
        return true;
    }

    function getDoublingValue() {
        return doublingCube;
    }

    function getDoublingOwner() {
        return doublingOwner;
    }

    function reset() {
        currentDice = [0, 0];
        doublingCube = 1;
        doublingOwner = null;
        isRolling = false;
    }

    // ── Rolling Animation State ──────────────────────────────────────────────
    function setRolling(val) {
        isRolling = val;
    }

    function getRolling() {
        return isRolling;
    }

    // ── Generate random dice for animation ───────────────────────────────────
    function getRandomDie() {
        return Math.floor(Math.random() * 6) + 1;
    }

    return {
        roll: roll,
        getValues: getValues,
        isDoubles: isDoubles,
        getDoublesCount: getDoublesCount,
        canDouble: canDouble,
        double: double,
        getDoublingValue: getDoublingValue,
        getDoublingOwner: getDoublingOwner,
        reset: reset,
        setRolling: setRolling,
        getRolling: getRolling,
        getRandomDie: getRandomDie
    };

})();
