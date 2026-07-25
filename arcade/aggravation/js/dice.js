/**
 * dice.js — Single d6 rolling logic for Aggravation
 */

var Dice = (function() {
    'use strict';

    var currentValue = 0;

    function roll() {
        currentValue = Math.floor(Math.random() * 6) + 1;
        return currentValue;
    }

    function getValue() { return currentValue; }

    function reset() { currentValue = 0; }

    return { roll: roll, getValue: getValue, reset: reset };
})();
