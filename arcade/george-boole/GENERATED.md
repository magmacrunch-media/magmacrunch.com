# Generated — do not edit here

Every file in `arcade/george-boole/` is a copy. The source of truth is the
[`george-boole`](https://github.com/magmacrunch-media/george-boole) repository, in its
`web/` folder.

This game's browser version is **derived**, not its `web/` folder: `web/` is the
complete game and the App Store build is what ships all of it. So the order is
to edit `web/`, then in that repository run:

```
node site/package.mjs
```

and only then the sync target below. See that repo's `docs/two-builds.md`.

Edits made here are **silently destroyed** the next time anyone runs:

```
make sync-george-boole
```

which deletes this folder and recopies it. To change the browser game, edit that
repository's `web/` folder, run that target, and commit the result here. The
path is deliberately not spelled out: that repo resolves whether it is checked
out beside this one or grouped under `games/` in a wider tree.

That repository also holds the game's Wii port, so a rules change can be made
once and carried to both versions.
