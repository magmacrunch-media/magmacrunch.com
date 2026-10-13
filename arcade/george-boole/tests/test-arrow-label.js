const assert = require('node:assert/strict');
const h = require('./dom-harness.cjs')(__dirname + '/..');
h.load('js/arrow-label.js');
const el = h.document.createElement('button');
for (const text of ['← back', 'next →', 'out → in', '↑ move ↓', '<img onerror=bad()> →', 'no arrow']) {
    h.context.setArrowLabel(el, text);
    assert.equal(el.textContent, text, 'label and accessible name stay intact');
    assert.equal(el.querySelectorAll('.ui-arrow').length, [...text].filter(x=>'←→↑↓'.includes(x)).length);
    assert.equal(el.querySelectorAll('img').length, 0, 'labels are text, never HTML');
}
console.log('Arrow labels: passed (directions, repeated updates, accessible text, escaping)');
