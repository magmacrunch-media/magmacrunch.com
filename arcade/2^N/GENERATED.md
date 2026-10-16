# Generated: do not edit here

Every file in `arcade/2^N/` is a copy. The source of truth is the
[`two-to-the-n`](https://github.com/magmacrunch-media/two-to-the-n) repository, in its
`web/` folder.

Edits made here are **silently destroyed** the next time anyone runs:

```
make sync-two-to-the-n
```

which deletes this folder and recopies it. To change the browser game, edit that
repository's `web/` folder, run that target, and commit the result here. The
path is deliberately not spelled out: that repo resolves whether it is checked
out beside this one or grouped under `games/` in a wider tree.

That repository also holds CI that runs its tests. There is no second
version yet, and the repo exists so one has somewhere to go.
