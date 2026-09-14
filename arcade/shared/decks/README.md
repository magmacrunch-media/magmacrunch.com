# Decks the card games can deal

Each `*.deck.json` here is a deck drawn in **DECK//PRESS**
(`dev\magmacrunch\apps\deck-press`) and exported with **File → Export to
Arcade…**. `index.json` lists them, and is what a game reads to know a deck
exists at all — a page fetched over HTTP cannot list a directory, so a pack
added without updating the index is a file nothing will ever offer. The export
writes both.

**Generated, and committed on purpose.** The deployed artifact is the git tree,
so a deck only reaches the site by being committed here. Re-exporting the same
deck overwrites its file and updates its row rather than adding a second.

## What is in one

```json
{
  "format": "magmacrunch-arcade-deck",
  "version": "1.0",
  "name": "MagmaCrunch v1",
  "colors": { "red": "#cc0000", "black": "#111111" },
  "faces": { "A-hearts": "<svg…>", "10-spades": "<svg…>", … },
  "back":  "<svg…>",
  "extras": { "joker-red": "<svg…>" }
}
```

The 52 keys are `rank-suit` in the same vocabulary `adenosine-cards.js` uses, so
nothing translates between the two sides. `extras` holds cards with no
rank-and-suit — a joker, a tarot trump — which no 52-card game asks for and
which a pack should not have dropped on the way out. `back` is absent rather
than empty when a deck has no card back, so the loader leaves the stock one
alone instead of drawing a blank.

Faces are drawn at **trim**, not at the print media box: a card carrying its
bleed reads as subtly the wrong shape and shows 3 mm that a real card loses.

They are bigger than they look and smaller than they weigh — 162 kB for the
shipped deck, **7 kB gzipped**, because pixel art is rectangles and rectangles
compress.

## How a game uses one

One script tag, after `adenosine-cards.js`:

```html
<script src="../shared/adenosine-cards.js?v=…"></script>
<script src="../shared/cards/deck-choice.js?v=…"></script>
```

That is the whole of it. `deck-choice.js` overrides
`AdCards.Card.prototype.getHTML` — calling the original first, so every class,
`data-suit` and `data-rank` a game relies on is untouched and only the picture
changes — and remembers the choice in `localStorage`.

To offer a picker, add a `<select id="deck-choice" hidden>` somewhere on the
start screen; it fills itself and stays hidden when no deck has been exported.
Solitaire is the worked example.

**A deck change shows up on the next deal**, not immediately: `getHTML()` builds
elements, and the ones already on the table stay as they were drawn. Games that
want to redraw can listen for `deckchoice:changed` on the document.

## Opening a game from `file://`

The site's dev approach is to open `index.html` directly, and `fetch` is
CORS-blocked there — so no deck loads and the picker hides itself. That is a
graceful failure and not a broken page, but it does mean **checking this feature
needs a server**: `python -m http.server` from the repo root, or the `site`
configuration in the dev tree's `.claude/launch.json`.
