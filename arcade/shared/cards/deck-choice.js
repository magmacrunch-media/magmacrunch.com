/* deck-choice.js — let a card game be played with a deck somebody drew.
 *
 * DECK//PRESS (dev\magmacrunch\apps\deck-press) exports a pack into
 * ../decks/: one JSON per deck holding an SVG for each of the 52 faces, the
 * back, and the suit inks, plus an index.json listing what is there. This is
 * the other half — it reads that index, remembers which deck you picked, and
 * puts those faces on the table.
 *
 * ONE SEAM, AND IT IS ALREADY THERE. Every card game here draws through
 * AdCards.Card.prototype.getHTML(), so overriding that one method reaches
 * cribbage, scandinavian-stud, solitaire, solitaire_THLD and tarot at once and
 * needs no change in any of them beyond loading this file.
 *
 * THE OVERRIDE CALLS THE ORIGINAL FIRST. getHTML() does more than draw: it sets
 * .card, .face-up/.face-down, the colour class, and data-suit/data-rank, and
 * the games read all of those to lay out and animate a table. Rebuilding the
 * element here would mean keeping a second copy of that in step forever. So the
 * stock element is built, and only what is INSIDE it is replaced — a deck
 * changes the picture and nothing else.
 *
 * adenosine-cards.js is a generated bundle vendored out of the adenosine
 * engine, which is why this is a file beside it rather than an edit to it.
 */

(function () {
    'use strict';

    var DECKS = '../shared/decks/';
    var INDEX = DECKS + 'index.json';
    var STORAGE = 'magmacrunch.arcade.deck';
    var FORMAT = 'magmacrunch-arcade-deck';

    var pack = null;        // the loaded deck, or null for the stock one
    var installed = false;

    /* localStorage throws outright in a few settings rather than returning
       nothing — a page opened from file://, and Safari's private mode — and a
       card game that will not deal because it could not remember a preference
       is a worse failure than one that forgets. */
    function remembered() {
        try { return window.localStorage.getItem(STORAGE) || ''; } catch (e) { return ''; }
    }

    function remember(file) {
        try {
            if (file) window.localStorage.setItem(STORAGE, file);
            else window.localStorage.removeItem(STORAGE);
        } catch (e) { /* not remembering is survivable */ }
    }

    function listDecks() {
        return fetch(INDEX, { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data || data.format !== FORMAT || !Array.isArray(data.decks)) return [];
                return data.decks;
            })
            .catch(function () { return []; });    // no decks exported yet
    }

    function loadDeck(file) {
        if (!file) return Promise.resolve(null);
        return fetch(DECKS + file, { cache: 'no-cache' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data || data.format !== FORMAT || !data.faces) return null;
                return data;
            })
            .catch(function () { return null; });
    }

    /**
     * A pack's SVG, sized to whatever box the game's CSS gave the card.
     *
     * The width and height attributes are REMOVED, not overridden. They are
     * millimetres — the pack is drawn at the real size of a real card — and a
     * card element here is a hundred-odd pixels, so leaving them would draw a
     * card two and a half times the size of the table it is on. Dropping them
     * lets the viewBox do the scaling it is for.
     */
    function faceElement(svgText) {
        var holder = document.createElement('div');
        holder.className = 'deck-face';
        holder.innerHTML = svgText;
        var svg = holder.querySelector('svg');
        if (!svg) return null;
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.display = 'block';
        holder.style.width = '100%';
        holder.style.height = '100%';
        return holder;
    }

    function install() {
        if (installed || !window.AdCards || !window.AdCards.Card) return;
        installed = true;

        var Card = window.AdCards.Card;
        var original = Card.prototype.getHTML;

        Card.prototype.getHTML = function () {
            var el = original.call(this);
            if (!pack) return el;

            var svg = this.faceUp
                ? pack.faces[this.rank + '-' + this.suit]
                : pack.back;
            if (!svg) return el;                  // a card this pack lacks keeps the stock face

            var face = faceElement(svg);
            if (!face) return el;
            el.innerHTML = '';
            el.appendChild(face);
            return el;
        };
    }

    /**
     * Choose a deck. `file` is a name from the index, or '' for the stock deck.
     *
     * Resolves once the pack is loaded and in use, so a caller can redraw the
     * table straight after and be sure the new faces are what it draws.
     */
    function choose(file) {
        return loadDeck(file).then(function (loaded) {
            // A file that will not load falls back to the stock deck rather
            // than to a table of blank cards, and stops being remembered.
            pack = loaded;
            remember(loaded ? file : '');
            install();
            return loaded;
        });
    }

    function current() { return pack; }

    /**
     * Fill a <select> with the decks on offer, and switch on change.
     *
     * The element is left ALONE when nothing has been exported: a picker with
     * one entry that does nothing is worse than no picker, and a game that
     * hides it in that case reads as though the feature is simply not set up
     * yet — which is exactly what is true.
     */
    function picker(select, onChange) {
        if (!select) return Promise.resolve([]);
        return listDecks().then(function (decks) {
            if (!decks.length) {
                select.hidden = true;
                return decks;
            }
            var chosen = remembered();
            select.hidden = false;
            select.innerHTML = '';
            var stock = document.createElement('option');
            stock.value = '';
            stock.textContent = 'Standard deck';
            select.appendChild(stock);
            decks.forEach(function (d) {
                var option = document.createElement('option');
                option.value = d.file;
                option.textContent = d.name;
                select.appendChild(option);
            });
            select.value = decks.some(function (d) { return d.file === chosen; }) ? chosen : '';
            select.addEventListener('change', function () {
                choose(select.value).then(function () {
                    if (typeof onChange === 'function') onChange(current());
                });
            });
            return decks;
        });
    }

    /**
     * Put the remembered deck back on the table.
     *
     * Called by a game before it deals. It resolves either way, so a game can
     * simply await it and carry on: no decks exported, or a deck that has since
     * been deleted, both come back as the stock deck.
     */
    function restore() {
        var file = remembered();
        if (!file) { install(); return Promise.resolve(null); }
        return choose(file);
    }

    /**
     * Wire itself up, so adding this to a game is one script tag.
     *
     * THE RACE IS WON BY THE START SCREEN. Loading a pack is a fetch, and a
     * game that dealt the moment the page loaded would deal stock faces and
     * only then hear about the deck. Every card game here opens on a start
     * screen and builds its deck when the button is pressed — solitaire's
     * game.js says so in as many words — so the pack has the whole of that
     * time to arrive, and by the deal it is in place.
     *
     * The override is installed IMMEDIATELY and separately from the fetch, so
     * even a game that deals early gets stock faces rather than an error, and
     * the next redraw picks the deck up.
     *
     * A game that would rather be certain can await DeckChoice.restore() and
     * deal after it; one that redraws on demand can listen for
     * `deckchoice:changed` on the document.
     */
    function autoStart() {
        install();
        restore().then(function () {
            document.dispatchEvent(new CustomEvent('deckchoice:changed', { detail: current() }));
            picker(document.getElementById('deck-choice'), function () {
                document.dispatchEvent(new CustomEvent('deckchoice:changed', { detail: current() }));
            });
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoStart);
    } else {
        autoStart();
    }

    window.DeckChoice = {
        listDecks: listDecks, choose: choose, current: current,
        picker: picker, restore: restore, DECKS: DECKS,
    };
}());
