# Generated — do not edit here

Every file in `arcade/pay2play/` is a copy. The source of truth is the
[`pay2play`](https://github.com/magmacrunch-media/pay2play) repository, in its
`web/` folder.

Edits made here are **silently destroyed** the next time anyone runs:

```
make sync-pay2play
```

which deletes this folder and recopies it. To change the browser game, edit that
repository's `web/` folder, run that target, and commit the result here. The
path is deliberately not spelled out: that repo resolves whether it is checked
out beside this one or grouped under `games/` in a wider tree.

That repository also holds the reel timing spike its difficulty is set from,
and its own AGENTS.md. There is no second version yet -- a terminal one is
planned -- so as with jovian-humanitarian-conflict, this sync is currently
the only thing crossing repos.
