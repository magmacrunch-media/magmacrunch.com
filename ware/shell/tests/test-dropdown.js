/**
 * test-dropdown.js -- where a fixed option list is put.
 *
 * A `.dropdown-options` list is position:fixed for pixel-process, so it does
 * not scroll with the page: anything of it below the bottom of the window is
 * unreachable by any means, including its own scrollbar. An absolute list
 * reaches the same dead end from the other side: it scrolls with the page but
 * only inside itself, so once its own scrollbar is at the end, whatever is
 * still below the fold stays there. That is not
 * hypothetical. ADD EFFECT sits at the foot of the chain panel, and its
 * fifteen effects opened 240px downward from a trigger 49px above the bottom
 * of a 768px window: two options were visible and the remaining thirteen
 * could not be got at at all.
 *
 * The arithmetic that fixes it is worth checking without a browser, so
 * RetroDropdown.place is exported and driven here against stub elements.
 *
 * Run: node test-dropdown.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SOURCE = path.join(__dirname, '..', 'dropdown.js');

let passed = 0, failed = 0;

function ok(cond, name, detail) {
    if (cond) { passed++; console.log('  PASS  ' + name); }
    else { failed++; console.log('  FAIL  ' + name + (detail ? '\n          ' + detail : '')); }
}

function eq(actual, expected, name) {
    ok(actual === expected, name, 'got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected));
}

/** The module, loaded against a window of the given size. `position` is what
    every list reports, which is the branch place() takes. */
function load(innerWidth, innerHeight, position) {
    const win = { innerWidth: innerWidth, innerHeight: innerHeight };
    const ctx = vm.createContext({
        window: win,
        document: { addEventListener() {}, querySelectorAll: () => [] },
        getComputedStyle: () => ({ position: position || 'fixed' }),
    });
    vm.runInContext(fs.readFileSync(SOURCE, 'utf8'), ctx, { filename: 'dropdown.js' });
    return ctx.window.RetroDropdown;
}

/** A dropdown of stub elements: one trigger with a label span, two options. */
function stubDropdown(labelText) {
    const label = { textContent: labelText };
    const selected = {
        querySelector: () => label,
        addEventListener(type, fn) { this.onclick = fn; },
    };
    const options = [
        { textContent: 'ALPHA', dataset: { value: 'alpha' }, classList: stubClassList(), addEventListener(t, fn) { this.click = fn; } },
        { textContent: 'BETA', dataset: { value: 'beta' }, classList: stubClassList(), addEventListener(t, fn) { this.click = fn; } },
    ];
    const container = {
        classList: stubClassList(),
        contains: () => true,
        querySelector: (sel) => (sel === '.dropdown-selected' ? selected : null),
        querySelectorAll: () => options,
    };
    return { container, selected, label, options };
}

function stubClassList() {
    const set = new Set();
    return {
        add: (c) => set.add(c),
        remove: (c) => set.delete(c),
        contains: (c) => set.has(c),
        toggle: (c) => (set.has(c) ? (set.delete(c), false) : (set.add(c), true)),
    };
}

/** A trigger at a given place, and a list that wants `wanted` pixels.

    The style stub takes setProperty as well as plain assignment, because the
    two branches write differently: a fixed list is positioned with top and
    left, an absolute one is handed a custom property and left where it is.
    Reading style['--dd-room'] afterwards is how the second is checked. */
function stubs(trigger, wanted) {
    const style = {};
    style.setProperty = function (name, value) { style[name] = value; };
    return [
        { getBoundingClientRect: () => trigger },
        { style: style, scrollHeight: wanted, offsetWidth: 200 },
    ];
}

const px = (v) => parseInt(v, 10);

console.log('\n=== a fixed list is placed where it can be read ===');

{
    const { place } = load(1024, 768);

    // Room below: straight under the trigger, at its natural height.
    let [trigger, list] = stubs({ top: 100, bottom: 130, left: 40, width: 200 }, 300);
    place(trigger, list, true);
    eq(px(list.style.top), 130, 'a list with room below opens under the trigger');
    eq(px(list.style.maxHeight), 300, 'and is not capped when it fits');
    eq(px(list.style.left), 40, 'and lines up with the trigger');

    // The real case: a trigger near the bottom with a tall list. It must end
    // up above, and entirely on screen.
    [trigger, list] = stubs({ top: 689, bottom: 719, left: 761, width: 247 }, 345);
    place(trigger, list, true);
    const top = px(list.style.top), height = px(list.style.maxHeight);
    ok(top >= 8, 'a list with no room below stays on screen at the top (' + top + ')');
    ok(top + height <= 719, 'and sits above the trigger rather than off the bottom');
    ok(height >= 300, 'using the room that is actually there (' + height + 'px)');

    // Hemmed in both ways: it may not spill off either edge, and must be
    // capped so its own scrollbar is reachable.
    [trigger, list] = stubs({ top: 360, bottom: 400, left: 10, width: 200 }, 700);
    place(trigger, list, true);
    const top2 = px(list.style.top), height2 = px(list.style.maxHeight);
    ok(top2 >= 8 && top2 + height2 <= 768 - 8, 'a list taller than the window is capped to it');
    ok(height2 < 700, 'so it scrolls inside the window rather than past the edge');
}

{
    // Narrow window: a list at the right-hand edge is pulled back on screen.
    const { place } = load(375, 812);
    const [trigger, list] = stubs({ top: 300, bottom: 330, left: 300, width: 200 }, 345);
    place(trigger, list, true);
    const left = px(list.style.left);
    ok(left >= 8 && left + 200 <= 375 - 8,
        'a list that would hang off the right edge is pulled back (' + left + ')');
}

{
    // Closing measures nothing: `opening` false leaves the list alone.
    const { place } = load(1024, 768);
    const [trigger, list] = stubs({ top: 100, bottom: 130, left: 40, width: 200 }, 300);
    place(trigger, list, false);
    eq(list.style.top, undefined, 'closing does not move the list');
}

console.log('\n=== an absolute list is capped to the room it has ===');

{
    /* GATE//FOLD's ADD TEXT modal, measured in the LITE build at a 560px
       window: the font trigger's bottom edge at 427, a list of fifteen faces
       wanting 329px and capped by the stylesheet at 240. 427 + 240 = 667,
       which is 107px below the fold, and the list's own scrollbar runs out
       before it gets there. */
    const { place } = load(1024, 560, 'absolute');

    let [trigger, list] = stubs({ top: 397, bottom: 427, left: 319, width: 433 }, 329);
    place(trigger, list, true);
    eq(list.style.top, undefined, 'an absolute list is not moved');
    eq(list.style['--dd-room'], '125px', 'it is told the room below the trigger');
    ok(427 + 125 <= 560, 'which is a list that ends above the fold');

    // Room to spare: the stylesheet's own cap goes on deciding.
    [trigger, list] = stubs({ top: 100, bottom: 130, left: 40, width: 200 }, 329);
    place(trigger, list, true);
    ok(parseInt(list.style['--dd-room'], 10) >= 240,
        'with room to spare the measurement shrinks nothing (' + list.style['--dd-room'] + ')');

    // A trigger pinned to the very foot of the window still shows something,
    // rather than a slot where the border is the whole list.
    [trigger, list] = stubs({ top: 530, bottom: 558, left: 40, width: 200 }, 329);
    place(trigger, list, true);
    eq(list.style['--dd-room'], '64px', 'a trigger at the foot of the window gets the floor');

    // Closing measures nothing here either, and leaves nothing behind: the
    // closed state IS the stylesheet's max-height of 0, which an inline cap
    // would beat.
    [trigger, list] = stubs({ top: 100, bottom: 130, left: 40, width: 200 }, 329);
    place(trigger, list, false);
    eq(list.style['--dd-room'], undefined, 'closing publishes nothing');
}

console.log('\n=== a menu keeps its own name; a picker takes the value ===');

{
    // The default: a value picker's trigger becomes what you chose.
    const { setup } = load(375, 812);
    const d = stubDropdown('SELECT');
    setup(d.container, () => {});
    d.options[0].click();
    eq(d.label.textContent, 'ALPHA', 'a picker shows the option it was given');
}

{
    /* keepLabel: an action menu keeps its own name. "+ ADD EFFECT" that
       renames itself to the effect you just added is not a label, it is a
       readout -- and it is then the only control that can add a second one. */
    const { setup } = load(375, 812);
    const d = stubDropdown('+ ADD EFFECT');
    setup(d.container, () => {}, { markActive: false, keepLabel: true });
    d.options[0].click();
    eq(d.label.textContent, '+ ADD EFFECT', 'a menu still says what it does');
    d.options[1].click();
    eq(d.label.textContent, '+ ADD EFFECT', 'and goes on saying it for the second pick');
    ok(!d.options[0].classList.contains('active'), 'markActive false leaves no sticky highlight');
}

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
