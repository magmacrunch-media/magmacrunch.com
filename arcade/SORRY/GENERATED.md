# Generated: do not edit here

Every file in `arcade/SORRY/` is a copy. The source of truth is the
[`sorry`](https://github.com/magmacrunch-media/sorry) repository, in its
`web/` folder.

Edits made here are **silently destroyed** the next time anyone runs:

```
make sync-sorry
```

which deletes this folder and recopies it. To change the browser game, edit that
repository's `web/` folder, run that target, and commit the result here. The
path is deliberately not spelled out: that repo resolves whether it is checked
out beside this one or grouped under `games/` in a wider tree.

That repository also holds CI that runs the rule engine and server tests
against this repo's arcade/shared/. There is no second version yet; the
repo exists so the move onto adenosine has somewhere to happen.
