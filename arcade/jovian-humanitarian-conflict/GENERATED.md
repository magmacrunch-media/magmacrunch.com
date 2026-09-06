# Generated — do not edit here

Every file in `arcade/jovian-humanitarian-conflict/` is a copy. The source of truth is the
[`jovian-humanitarian-conflict`](https://github.com/magmacrunch-media/jovian-humanitarian-conflict) repository, in its
`web/` folder.

Edits made here are **silently destroyed** the next time anyone runs:

```
make sync-jovian-humanitarian-conflict
```

which deletes this folder and recopies it. To change the browser game, edit that
repository's `web/` folder, run that target, and commit the result here. The
path is deliberately not spelled out: that repo resolves whether it is checked
out beside this one or grouped under `games/` in a wider tree.

That repository also holds the game's terminal version, published to PyPI as
magmacrunch-jhc. Its rules are a transcription of these very files and
are checked against them by running them in a node vm, so a tuning
change here fails that repo's Python suite until it is carried across.
