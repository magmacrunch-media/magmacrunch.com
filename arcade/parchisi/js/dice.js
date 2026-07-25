/**
 * dice.js — 2d6 dice rolling logic for Parchís
 */

var Dice = (function() {
    'use strict';

    var currentDice = [0, 0];
    var isRolling = false;

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

    function getSum() {
        return currentDice[0] + currentDice[1];
    }

    function hasFive() {
        return currentDice[0] === 5 || currentDice[1] === 5 || getSum() === 5;
    }

    function reset() {
        currentDice = [0, 0];
        isRolling = false;
    }

    function setRolling(val) {
        isRolling = val;
    }

    function getRolling() {
        return isRolling;
    }

    function getRandomDie() {
        return Math.floor(Math.random() * 6) + 1;
    }

    return {
        roll: roll,
        getValues: getValues,
        isDoubles: isDoubles,
        getSum: getSum,
        hasFive: hasFive,
        reset: reset,
        setRolling: setRolling,
        getRolling: getRolling,
        getRandomDie: getRandomDie,
    };
})();
