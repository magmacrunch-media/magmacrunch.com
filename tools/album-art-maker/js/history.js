/* ── history.js — undo/redo stack ── */
window.History = (function () {
    const MAX_STATES = 50;
    let stack = [];
    let index = -1;

    function push(elements) {
        // remove any future states beyond current index
        stack = stack.slice(0, index + 1);
        // deep clone elements
        stack.push(JSON.parse(JSON.stringify(elements)));
        if (stack.length > MAX_STATES) stack.shift();
        index = stack.length - 1;
    }

    function undo() {
        if (index > 0) {
            index--;
            return JSON.parse(JSON.stringify(stack[index]));
        }
        return null;
    }

    function redo() {
        if (index < stack.length - 1) {
            index++;
            return JSON.parse(JSON.stringify(stack[index]));
        }
        return null;
    }

    function canUndo() { return index > 0; }
    function canRedo() { return index < stack.length - 1; }

    function clear() {
        stack = [];
        index = -1;
    }

    return { push, undo, redo, canUndo, canRedo, clear };
})();
