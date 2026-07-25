/**
 * test-game-logic.js — Pure logic tests for George Boole game.
 * Tests Boolean operations, merge logic, overflow, and gate patterns.
 * 
 * Run: node test-game-logic.js
 */

// ── Extracted Pure Functions ──────────────────────────────────────────────────
// These are the core logic functions extracted from Game2048 for testing.

function isGate(val) {
    return val === -1 || val === -2 || val === -3 || val === -4;
}

function applyGate(gate, value1, value2, maxValue) {
    let result;
    switch (gate) {
        case -1: // XOR
            result = value1 ^ value2;
            break;
        case -2: // OR
            result = value1 | value2;
            break;
        case -3: // AND
            result = value1 & value2;
            break;
        case -4: // NOT (unary)
            result = (~value1) & maxValue;
            break;
        default:
            result = value1;
    }
    return result;
}

function advanceRow(row, maxValue) {
    // Simplified version of moveLeft row processing
    // Returns { mergedRow, mergeOccurred }
    const size = row.length;
    
    // Strip zeros
    let filtered = row.filter(v => v !== 0);
    
    let result = [];
    let i = 0;
    let mergeOccurred = false;
    
    while (i < filtered.length) {
        const current = filtered[i];
        
        // NOT + NOT = cancellation
        if (current === -4 && i + 1 < filtered.length && filtered[i + 1] === -4) {
            i += 2; // Both disappear
            mergeOccurred = true;
            continue;
        }
        
        // NOT + number (unary NOT)
        if (current === -4 && i + 1 < filtered.length && !isGate(filtered[i + 1])) {
            const num = filtered[i + 1];
            const notResult = (~num) & maxValue;
            result.push(notResult === 0 ? 0 : notResult);
            i += 2;
            mergeOccurred = true;
            continue;
        }
        
        // number + NOT (reversed NOT)
        if (!isGate(current) && i + 1 < filtered.length && filtered[i + 1] === -4) {
            const num = current;
            const notResult = (~num) & maxValue;
            result.push(notResult === 0 ? 0 : notResult);
            i += 2;
            mergeOccurred = true;
            continue;
        }
        
        // number + gate + number (binary gate sandwich)
        if (!isGate(current) && i + 2 < filtered.length && 
            isGate(filtered[i + 1]) && filtered[i + 1] !== -4 && !isGate(filtered[i + 2])) {
            const gate = filtered[i + 1];
            const rightNum = filtered[i + 2];
            const gateResult = applyGate(gate, current, rightNum, maxValue);
            result.push(gateResult);
            i += 3;
            mergeOccurred = true;
            continue;
        }
        
        // Same values merge (idempotent: A+A=A)
        if (i + 1 < filtered.length && current === filtered[i + 1] && !isGate(current)) {
            result.push(current);
            i += 2;
            mergeOccurred = true;
            continue;
        }
        
        // No merge
        result.push(current);
        i++;
    }
    
    // Pad to original size
    while (result.length < size) {
        result.push(0);
    }
    
    return { mergedRow: result.slice(0, size), mergeOccurred };
}

// ── Tests ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        passed++;
    } else {
        failed++;
        console.error(`  FAIL: ${message}`);
    }
}

function assertEqual(actual, expected, message) {
    const a = JSON.stringify(actual);
    const e = JSON.stringify(expected);
    if (a === e) {
        passed++;
    } else {
        failed++;
        console.error(`  FAIL: ${message} — got ${a}, expected ${e}`);
    }
}

console.log('=== George Boole Game Logic Tests ===\n');

// ── isGate ───────────────────────────────────────────────────────────────────

console.log('isGate:');
assert(isGate(-1) === true, 'XOR is gate');
assert(isGate(-2) === true, 'OR is gate');
assert(isGate(-3) === true, 'AND is gate');
assert(isGate(-4) === true, 'NOT is gate');
assert(isGate(0) === false, '0 is not gate');
assert(isGate(1) === false, '1 is not gate');
assert(isGate(7) === false, '7 is not gate');
console.log(`  ${passed} passed\n`);

// ── applyGate: XOR ───────────────────────────────────────────────────────────

console.log('applyGate XOR:');
assertEqual(applyGate(-1, 1, 2, 3), 3, '1 XOR 2 = 3');
assertEqual(applyGate(-1, 3, 3, 3), 0, '3 XOR 3 = 0');
assertEqual(applyGate(-1, 1, 1, 3), 0, '1 XOR 1 = 0');
assertEqual(applyGate(-1, 2, 2, 3), 0, '2 XOR 2 = 0');
assertEqual(applyGate(-1, 0, 5, 7), 5, '0 XOR 5 = 5');
assertEqual(applyGate(-1, 5, 0, 7), 5, '5 XOR 0 = 5');
console.log(`  ${passed} passed\n`);

// ── applyGate: OR ────────────────────────────────────────────────────────────

console.log('applyGate OR:');
assertEqual(applyGate(-2, 1, 2, 3), 3, '1 OR 2 = 3');
assertEqual(applyGate(-2, 3, 3, 3), 3, '3 OR 3 = 3');
assertEqual(applyGate(-2, 1, 1, 3), 1, '1 OR 1 = 1');
assertEqual(applyGate(-2, 0, 5, 7), 5, '0 OR 5 = 5');
assertEqual(applyGate(-2, 5, 3, 7), 7, '5 OR 3 = 7');
console.log(`  ${passed} passed\n`);

// ── applyGate: AND ───────────────────────────────────────────────────────────

console.log('applyGate AND:');
assertEqual(applyGate(-3, 1, 2, 3), 0, '1 AND 2 = 0');
assertEqual(applyGate(-3, 3, 3, 3), 3, '3 AND 3 = 3');
assertEqual(applyGate(-3, 1, 3, 3), 1, '1 AND 3 = 1');
assertEqual(applyGate(-3, 5, 3, 7), 1, '5 AND 3 = 1');
assertEqual(applyGate(-3, 6, 3, 7), 2, '6 AND 3 = 2');
console.log(`  ${passed} passed\n`);

// ── applyGate: NOT ───────────────────────────────────────────────────────────

console.log('applyGate NOT:');
assertEqual(applyGate(-4, 0, 0, 3), 3, 'NOT 0 = 3 (2-bit)');
assertEqual(applyGate(-4, 1, 0, 3), 2, 'NOT 1 = 2 (2-bit)');
assertEqual(applyGate(-4, 2, 0, 3), 1, 'NOT 2 = 1 (2-bit)');
assertEqual(applyGate(-4, 3, 0, 3), 0, 'NOT 3 = 0 (2-bit)');
assertEqual(applyGate(-4, 0, 0, 7), 7, 'NOT 0 = 7 (3-bit)');
assertEqual(applyGate(-4, 7, 0, 7), 0, 'NOT 7 = 0 (3-bit)');
assertEqual(applyGate(-4, 5, 0, 15), 10, 'NOT 5 = 10 (4-bit)');
console.log(`  ${passed} passed\n`);

// ── advanceRow: Basic merges ─────────────────────────────────────────────────

console.log('advanceRow basic:');
assertEqual(advanceRow([1, 2, 3, 0], 3).mergedRow, [1, 2, 3, 0], 'No merge');
assertEqual(advanceRow([1, 1, 0, 0], 3).mergedRow, [1, 0, 0, 0], 'Same merge');
assertEqual(advanceRow([2, 2, 0, 0], 3).mergedRow, [2, 0, 0, 0], 'Same merge 2');
assertEqual(advanceRow([3, 3, 0, 0], 3).mergedRow, [3, 0, 0, 0], 'Same merge 3');
assertEqual(advanceRow([1, 2, 1, 2], 3).mergedRow, [1, 2, 1, 2], 'No merge different');
console.log(`  ${passed} passed\n`);

// ── advanceRow: Idempotent merge ─────────────────────────────────────────────

console.log('advanceRow idempotent:');
assertEqual(advanceRow([1, 1, 0, 0], 3).mergedRow, [1, 0, 0, 0], '1+1=1');
assertEqual(advanceRow([2, 2, 0, 0], 3).mergedRow, [2, 0, 0, 0], '2+2=2');
assertEqual(advanceRow([3, 3, 0, 0], 3).mergedRow, [3, 0, 0, 0], '3+3=3');
assertEqual(advanceRow([5, 5, 0, 0], 7).mergedRow, [5, 0, 0, 0], '5+5=5 (3-bit)');
assertEqual(advanceRow([7, 7, 0, 0], 7).mergedRow, [7, 0, 0, 0], '7+7=7 (3-bit)');
console.log(`  ${passed} passed\n`);

// ── advanceRow: Gate patterns ────────────────────────────────────────────────

console.log('advanceRow gate patterns:');
// XOR sandwich
assertEqual(advanceRow([1, -1, 2, 0], 3).mergedRow, [3, 0, 0, 0], '1 XOR 2 = 3');
assertEqual(advanceRow([3, -1, 3, 0], 3).mergedRow, [0, 0, 0, 0], '3 XOR 3 = 0');
// OR sandwich
assertEqual(advanceRow([1, -2, 2, 0], 3).mergedRow, [3, 0, 0, 0], '1 OR 2 = 3');
// AND sandwich
assertEqual(advanceRow([3, -3, 3, 0], 3).mergedRow, [3, 0, 0, 0], '3 AND 3 = 3');
assertEqual(advanceRow([1, -3, 2, 0], 3).mergedRow, [0, 0, 0, 0], '1 AND 2 = 0');
console.log(`  ${passed} passed\n`);

// ── advanceRow: NOT patterns ─────────────────────────────────────────────────

console.log('advanceRow NOT patterns:');
// NOT + number
assertEqual(advanceRow([-4, 1, 0, 0], 3).mergedRow, [2, 0, 0, 0], 'NOT 1 = 2');
// number + NOT
assertEqual(advanceRow([1, -4, 0, 0], 3).mergedRow, [2, 0, 0, 0], '1 NOT = 2');
// NOT + NOT = cancellation
assertEqual(advanceRow([-4, -4, 0, 0], 3).mergedRow, [0, 0, 0, 0], 'NOT NOT cancels');
assertEqual(advanceRow([-4, -4, 1, 0], 3).mergedRow, [1, 0, 0, 0], 'NOT NOT then 1');
console.log(`  ${passed} passed\n`);

// ── advanceRow: Edge cases ───────────────────────────────────────────────────

console.log('advanceRow edge cases:');
assertEqual(advanceRow([0, 0, 0, 0], 3).mergedRow, [0, 0, 0, 0], 'All zeros');
assertEqual(advanceRow([1, 2, 3, 4], 7).mergedRow, [1, 2, 3, 4], 'Full row no merge');
assertEqual(advanceRow([-4, 0, 0, 0], 3).mergedRow, [-4, 0, 0, 0], 'NOT at edge stays (gate waiting for number)');
console.log(`  ${passed} passed\n`);

// ── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
