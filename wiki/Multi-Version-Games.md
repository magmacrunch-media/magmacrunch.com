A game that exists in more than one version — a browser build and a Nintendo Wii
port — does not live in this repository. It gets its own repository holding
every version of itself, and the folder under `arcade/` here is a generated copy.

Eight games work this way today.

| Folder here | Repository | Regenerate with |
|---|---|---|
| `arcade/moonlight-drift/` | [moonlight-drift](https://github.com/magmacrunch-media/moonlight-drift) | `make sync-moonlight-drift` |
| `arcade/george-boole/` | [george-boole](https://github.com/magmacrunch-media/george-boole) | `make sync-george-boole` |
| `arcade/solitaire_THLD/` | [texas-holdem-lava-dome](https://github.com/magmacrunch-media/texas-holdem-lava-dome) | `make sync-texas-holdem-lava-dome` |
| `arcade/makemecookies/` | [makemecookies](https://github.com/magmacrunch-media/makemecookies) | `make sync-makemecookies` |
| `arcade/very-long-boards/` | [very-long-boards](https://github.com/magmacrunch-media/very-long-boards) | `make sync-very-long-boards` |
| `arcade/roderick-tron/` | [roderick-tron](https://github.com/magmacrunch-media/roderick-tron) | `make sync-roderick-tron` |
| `arcade/pay2play/` | [pay2play](https://github.com/magmacrunch-media/pay2play) | `make sync-pay2play` |
| `arcade/jovian-humanitarian-conflict/` | [jovian-humanitarian-conflict](https://github.com/magmacrunch-media/jovian-humanitarian-conflict) | `make sync-jovian-humanitarian-conflict` |

`solitaire_THLD` keeps its historical name because it is the live URL.

## Never edit these folders here

The sync targets **delete the folder and recopy it**. An edit made under
`arcade/moonlight-drift/` is destroyed the next time anyone syncs — silently,
because a delete-and-recopy produces no conflict and nothing to review.

Each folder carries a `GENERATED.md` saying so, written by the sync itself, so
the warning is visible from inside the copy as well as from here.

## Changing one of these games

1. Edit the game's own repository, in its `web/` folder.
2. Commit and push there.
3. In this repository, run that game's `make sync-<repo>` target.
4. Commit the regenerated folder here.

The sync also restamps cache-busters, because it replaces the very CSS and JS
whose content hashes the page's `?v=` stamps are computed from.

## Why they are laid out this way

Each game repository holds both versions side by side:

```
moonlight-drift/
├── web/     the browser version   (adenosine engine, JavaScript)
├── wii/     the Wii port          (magnolia engine, C99)
└── ...
```

The two implementations share no code — one is JavaScript on Canvas, the other
is C on GX — but they share everything that decides what the game *is*: the
rules, the tuning numbers, the sprite sheets, the audio. Before the split those
lived in two unrelated repositories, so a balance change had to be made twice
with nothing recording that the two edits were the same decision. Now one commit
carries a change to every version, and the history reads as the story of the
game rather than the story of one port.

`web/` is the source of truth for gameplay. The Wii ports cite the browser files
their behaviour came from, so a rule can be traced back to the implementation it
was ported from.

## Promoting a game to its own repository

Only when a second version actually exists. A game with one version stays here,
authored normally — see [Adding a Game](Adding-a-Game). Restructuring
twenty-odd arcade folders for ports that may never be written would cost more
than it saves.

When a game does earn it:

1. Create the repo from the existing port's repo, so its history survives.
2. Move the port's files under `wii/`, and copy the browser version in as `web/`.
3. Fix the engine path — magnolia resolves at `../../magnolia` from inside
   `wii/`, one level deeper than before — and point CI at `wii/`.
4. Add the game to the `GAMES` map in `scripts/sync-game.mjs` and add a
   `sync-<repo>` target to the `Makefile`.
5. Run the sync and commit the result here.

One caution from doing this three times: leave the game repo's `web/` folder to
`core.autocrlf` rather than pinning it to LF. The sync is a byte copy, so if the
two repositories disagree about line endings every sync rewrites every file, and
`git diff` will hide it — the content is identical after normalisation, only the
bytes on disk differ. It buries the one file that really did change.

## See also

- [Adding a Game](Adding-a-Game) — the normal, single-version workflow
- [Arcade Overview](Arcade-Overview)
- [magnolia](https://github.com/magmacrunch-media/magnolia) — the Wii engine
- [adenosine](https://github.com/magmacrunch-media/adenosine) — the browser engine
