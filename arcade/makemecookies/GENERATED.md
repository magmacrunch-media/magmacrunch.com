# Generated — do not edit here

Every file in `arcade/makemecookies/` is a copy. The source of truth is the
[`makemecookies`](https://github.com/magmacrunch-media/makemecookies) repository, in its
`web/` folder.

Edits made here are **silently destroyed** the next time anyone runs:

```
make sync-makemecookies
```

which deletes this folder and recopies it. To change the browser game, edit that
repository's `web/` folder, run that target, and commit the result here. The
path is deliberately not spelled out: that repo resolves whether it is checked
out beside this one or grouped under `games/` in a wider tree.

That repository also holds the rules' headless test suite, which the game
is arranged around -- js/stations.js touches no DOM so the real shipped
modules can be loaded and run without a browser. There is no second
version yet; the repo exists so that one would have somewhere to go.
