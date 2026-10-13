// A small, stateful DOM and clock for interaction tests. No browser dependency.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

module.exports = function harness(root) {
    let now = 0, nextTimer = 1;
    const timers = new Map(), observers = [], inputs = [], storage = new Map();
    let document;
    class Element {
        constructor(tag = 'div') {
            this.tagName = tag.toUpperCase(); this.nodeType = 1;
            this.children = []; this.parentNode = null; this.style = {};
            this.dataset = {}; this.attributes = {}; this.listeners = {};
            this.className = ''; this._text = ''; this.offsetWidth = 180;
            this.offsetHeight = 120; this.offsetLeft = 0; this.offsetTop = 0;
            this.classList = {
                contains: c => this.className.split(' ').includes(c),
                add: c => { if (!this.classList.contains(c)) this.className += ' ' + c; },
                remove: c => { this.className = this.className.split(' ').filter(x => x !== c).join(' '); },
                toggle: (c, on) => { if (on === undefined) on = !this.classList.contains(c); this.classList[on ? 'add' : 'remove'](c); },
            };
        }
        get textContent() { return this._text + this.children.map(x => x.textContent).join(''); }
        set textContent(v) { this._text = String(v); this.children = []; }
        set innerHTML(v) { this.textContent = v; }
        get innerHTML() { return this.textContent; }
        appendChild(el) { el.parentNode = this; this.children.push(el); return el; }
        replaceChild(fresh, old) { const index = this.children.indexOf(old); this.children[index] = fresh; fresh.parentNode = this; old.parentNode = null; return old; }
        remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this); this.parentNode = null; }
        get isConnected() { return document && document.body.contains(this); }
        contains(el) { return el === this || this.children.some(c => c.contains(el)); }
        matches(selector) {
            return selector.split(',').some(s => {
                s = s.trim();
                if (s.includes(':not(')) { const [base, no] = s.split(':not('); return this.matches(base) && !this.matches(no.slice(0,-1)); }
                if (s.startsWith('#')) return this.id === s.slice(1);
                if (s.startsWith('.')) return s.slice(1).split('.').every(c => this.classList.contains(c));
                return this.tagName.toLowerCase() === s;
            });
        }
        querySelectorAll(s) { return this.children.flatMap(c => [...(c.matches(s) ? [c] : []), ...c.querySelectorAll(s)]); }
        querySelector(s) { return this.querySelectorAll(s)[0] || null; }
        closest(s) { return this.matches(s) ? this : this.parentNode && this.parentNode.closest(s); }
        setAttribute(k,v) { this.attributes[k] = String(v); if (k === 'class') this.className = String(v); if (k.startsWith('data-')) this.dataset[k.slice(5)] = String(v); }
        getAttribute(k) { return Object.hasOwn(this.attributes,k) ? this.attributes[k] : null; }
        removeAttribute(k) { delete this.attributes[k]; if (k.startsWith('data-')) delete this.dataset[k.slice(5)]; }
        addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
        removeEventListener(k, fn) { this.listeners[k] = (this.listeners[k] || []).filter(f => f !== fn); }
        dispatchEvent(e) { e.target ||= this; for (const fn of this.listeners[e.type] || []) fn(e); return true; }
        focus() { document.activeElement = this; }
        getBoundingClientRect() { return { left: 20, top: 200, right: 120, bottom: 300, width: 100, height: 100 }; }
    }
    document = new Element('document');
    document.body = new Element('body'); document.appendChild(document.body);
    document.documentElement = { style: { setProperty() {}, getPropertyValue() { return ''; } } };
    document.activeElement = document.body;
    document.createElement = tag => new Element(tag);
    document.createTextNode = text => { const el = new Element('text'); el.textContent = text; return el; };
    document.getElementById = id => {
        let el = document.querySelector('#' + id);
        if (!el) { el = new Element(); el.id = id; document.body.appendChild(el); }
        return el;
    };
    const window = new Element('window');
    window.innerWidth = 390; window.innerHeight = 844;
    window.location = { search: '', hostname: 'localhost' };
    window.reduceMotion = false;
    window.matchMedia = () => ({ matches: window.reduceMotion, addEventListener() {} });
    const context = vm.createContext({
        document, window, console, Math: Object.create(Math),
        localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v) },
        CustomEvent: class { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } },
        MutationObserver: class { constructor(fn) { observers.push(fn); } observe() {} disconnect() {} },
        getComputedStyle: el => ({ display: el.style.display || 'block', visibility: 'visible', opacity: '1' }),
        setTimeout: (fn, delay) => { const id = nextTimer++; timers.set(id,{fn, at: now + delay}); return id; },
        clearTimeout: id => timers.delete(id),
        AdPuzzle: { createInput: callbacks => { inputs.push(callbacks); return { destroy() {} }; } },
        AdAudio: { playSfx() {} }, scoreClient: { save: async () => {}, load: async () => [] },
    });
    function load(name) { vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), context, { filename: name }); }
    function advance(ms) {
        const end = now + ms;
        while (true) {
            const due = [...timers].filter(([,t]) => t.at <= end).sort((a,b) => a[1].at-b[1].at)[0];
            if (!due) break;
            now = due[1].at; timers.delete(due[0]); due[1].fn();
        }
        now = end;
    }
    return { document, window, context, load, advance, inputs, storage, Element,
        flushMutations: () => observers.forEach(fn => fn([])),
        board: () => { load('js/game.js'); return vm.runInContext('new BooleBoard("4")', context); },
        emit: (type, detail) => document.dispatchEvent({ type, detail }),
    };
};
