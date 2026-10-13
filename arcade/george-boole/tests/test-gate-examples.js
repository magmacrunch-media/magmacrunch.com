const assert = require('node:assert/strict');
const fs = require('node:fs');
const h = require('./dom-harness.cjs')(__dirname + '/..');
const game = h.board();
const html = fs.readFileSync(__dirname + '/../index.html', 'utf8');
const examples = [...html.matchAll(/<span class="gate-bits">((?:[^<]|<span class="glyph">[^<]*<\/span>)+)<\/span>/g)];
assert.equal(examples.length, 16, 'both sets of four gate cards carry two binary examples');
for (const [, markup] of examples) {
    const text = markup.replace(/<[^>]+>/g, '').replace(/&oplus;/g,'⊕').replace(/&or;/g,'∨').replace(/&and;/g,'∧').replace(/&not;/g,'¬');
    const unary = text.match(/^¬\s*([01]+)\s*=\s*([01]+)$/);
    const binary = text.match(/^([01]+)\s*([⊕∨∧])\s*([01]+)\s*=\s*([01]+)$/);
    assert.ok(unary || binary, 'only binary operands/results: ' + text);
    const a = unary ? unary[1] : binary[1], result = unary ? unary[2] : binary[4];
    const b = unary ? null : binary[3];
    assert.equal(result.length, a.length); if (b) assert.equal(b.length, a.length);
    game.bitMode = a.length; game.maxValue = 2 ** a.length - 1; game.highestValueEver = game.maxValue;
    const gate = unary ? -4 : ({'⊕':-1,'∨':-2,'∧':-3})[binary[2]];
    assert.equal(game.applyGate(gate, parseInt(a,2), b === null ? null : parseInt(b,2)), parseInt(result,2), text);
}
const lore = html.slice(html.indexOf('<div class="lore-examples">'), html.indexOf('<!-- The rule the three payouts'));
assert.equal((lore.match(/class="example-binary"/g)||[]).length, 7);
assert.ok(!lore.includes('class="tile-decimal"'));
assert.ok(!lore.includes('class="tile-binary"'), 'examples do not inherit the board display toggle');
console.log('Binary examples: passed (16 equations against real gates, consistent widths, menu examples)');
