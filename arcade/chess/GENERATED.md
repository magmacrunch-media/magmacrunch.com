# Generated: do not edit here

Every file in `arcade/chess/` is a copy. The source of truth is the
[`chess`](https://github.com/magmacrunch-media/chess) repository, in its
`web/` folder.

Edits made here are **silently destroyed** the next time anyone runs:

```
make sync-chess
```

which deletes this folder and recopies it. To change the browser game, edit that
repository's `web/` folder, run that target, and commit the result here. The
path is deliberately not spelled out: that repo resolves whether it is checked
out beside this one or grouped under `games/` in a wider tree.

That repository also holds CI that runs the server tests against this
repo's arcade/shared/. There is no second version yet.
