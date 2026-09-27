#!/usr/bin/env python3
"""Generate the block ASCII for an artist link strip on home/about.html.

    python scripts/make-strip-ascii.py dag henderson

Prints the block; paste it between the <pre> tags of the strip you are
replacing. Output is committed art, so this is run by hand, not by a build.

Why this exists: .link-strip-inner pre in home/about.css is
clamp(2px, 0.5vw, 5px), capped at 4px under 640px, and overflow:hidden. That
cap is the same for every strip whatever its width, so a narrower block is NOT
set larger -- the only thing that buys legibility at 5px is contrast between
"inside a letter" and "outside". The Dag Henderson strip previously used a
figlet font drawn from runs of backslash and slash over underscore fill: three
distinct characters, so every row carried the same ink density and the
letterforms disappeared entirely.

Two numbers worth keeping. The visible width is about 305px on a phone, and
Courier Prime advances 0.6em, so at the 4px cap the ceiling is roughly **127
columns**; past that the tail of the word is silently cut off rather than
scaled. And the strip is 140px tall with 12px padding, which at 1.15
line-height leaves room for about 25 rows at 4px.

texas-holdem-lava-dome's strip is 158 columns and is clipped on phones today.
"""

# 5x9 bitmap, doubled horizontally: a Courier Prime cell is about 2.4 x 5.75px,
# so at 2x a vertical stroke is 4.8px against a horizontal stroke's 5.75px and
# strokes come out roughly square rather than much taller than they are wide.
# Rows 0-1 ascender, 2-6 x-height, 7-8 descender.

GLYPHS = {
    'a': ['     ', '     ', ' ### ', '    #', ' ####', '#   #', ' ####', '     ', '     '],
    'd': ['    #', '    #', ' ####', '#   #', '#   #', '#   #', ' ####', '     ', '     '],
    'e': ['     ', '     ', ' ### ', '#   #', '#####', '#    ', ' ### ', '     ', '     '],
    'g': ['     ', '     ', ' ####', '#   #', '#   #', ' ####', '    #', '#   #', ' ### '],
    'h': ['#    ', '#    ', '#### ', '#   #', '#   #', '#   #', '#   #', '     ', '     '],
    'n': ['     ', '     ', '#### ', '#   #', '#   #', '#   #', '#   #', '     ', '     '],
    'o': ['     ', '     ', ' ### ', '#   #', '#   #', '#   #', ' ### ', '     ', '     '],
    'r': ['     ', '     ', '# ###', '##   ', '#    ', '#    ', '#    ', '     ', '     '],
    's': ['     ', '     ', ' ####', '#    ', ' ### ', '    #', '#### ', '     ', '     '],
    ' ': ['     '] * 9,
}

ROWS = 9
GAP = 1          # blank cells between glyphs
XSCALE = 2       # each bitmap cell becomes this many characters


def render(word, on='#'):
    lines = []
    for r in range(ROWS):
        cells = []
        for i, ch in enumerate(word):
            if i:
                cells.append(' ' * GAP)
            cells.append(GLYPHS[ch][r])
        row = ''.join(cells)
        lines.append(''.join((on if c == '#' else ' ') * XSCALE for c in row))
    while lines and not lines[0].strip():
        lines.pop(0)
    while lines and not lines[-1].strip():
        lines.pop()
    return [l.rstrip() for l in lines]


def stack(words, on='#'):
    """Render each word as its own block, centred over the widest.

    One line of "dag henderson" is 154 columns. .link-strip-inner pre is
    overflow:hidden and capped at 4px on phones, which leaves room for about
    127 columns, so a single line loses its last two letters on a 375px
    screen. Two lines fit at both breakpoints.
    """
    blocks = [render(w, on) for w in words]
    width = max(len(l) for b in blocks for l in b)
    out = []
    for i, b in enumerate(blocks):
        if i:
            out.append('')
        pad = (width - max(len(l) for l in b)) // 2
        out.extend((' ' * pad + l).rstrip() for l in b)
    return out


if __name__ == '__main__':
    import sys
    words = sys.argv[1:] or ['dag', 'henderson']
    on = '@'
    out = stack(words, on)
    print('%d rows x %d cols' % (len(out), max(len(l) for l in out)))
    print('\n'.join(out))
