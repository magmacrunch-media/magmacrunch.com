# Generated — do not edit here

Every file in `arcade/very-long-boards/` is a copy. The source of truth is the
[`very-long-boards`](https://github.com/magmacrunch-media/very-long-boards) repository, in its
`web/` folder.

Edits made here are **silently destroyed** the next time anyone runs:

```
make sync-very-long-boards
```

which deletes this folder and recopies it. To change the browser game, edit that
repository's `web/` folder, run that target, and commit the result here. The
path is deliberately not spelled out: that repo resolves whether it is checked
out beside this one or grouped under `games/` in a wider tree.

That repository also holds a separate Godot desktop version. Those two are
deliberately not ports of each other -- different scoring, different failure
model -- so a change to this one is usually not owed to that one.
