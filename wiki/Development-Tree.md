How every magmacrunch repository is arranged on the Windows dev machine. This is
about the *checkout tree*; for the layout inside this repository see
[Project Structure](Project-Structure).

Reorganized 3 September 2026, when the repos also moved to the `magmacrunch-media`
organization.

## The tree

```
C:\magma\dev\
├── magmacrunch\      github.com/magmacrunch-media
│   ├── engines\      magnolia, adenosine, hologram, magma-kit, texastoast
│   ├── games\        george-boole, moonlight-drift, texas-holdem-lava-dome,
│   │                 crystal-mirror-maze, crystal-mirror-maze-godot,
│   │                 very-long-boards, transatlantic_colleague, balladofbandaniel
│   ├── apps\         sprite-forge, deck-press, gatefold, magmacrunch-ops,
│   │                 historian-tui, magmacrunch
│   ├── libs\         magmascript, crunch-c
│   ├── web\          website (repo: magmacrunch.com), magma-ops-backup, magmacrunchmedia
│   ├── scratch\      drafts, wiki
│   └── wii-card\     ready-to-copy Wii SD card root
├── jamccoy\          a separate personal GitHub account — unrelated work
└── _completed-migrations\
```

Two placements are worth stating because neither is obvious:

- **`texastoast` is an engine**, not a lib — its README calls it a "Python RPG engine".
- **`magmacrunch` is an app.** The name is the command you type. It does ship an engine
  at `magmacrunch/engine/`, but cabinets reach that through the `magmacrunch.games`
  entry point group at runtime, never by path.

`C:\magma\dev\` is source. `C:\magma\` itself is the working area — `apps\` there holds
the *installed* desktop programs, alongside `decks\` and `album-art_designs\`. Two
folders named `apps` is expected; the parent tells them apart.

## Repos that reach each other

Several repos reach a sibling by relative path, and a game may depend on more than one
engine, so no arrangement of folders satisfies every path on its own. Two mechanisms
cover it, and **no repository was rewritten to suit this tree** — a fresh clone still
builds the way its README describes.

**Self-resolving paths.** The three Wii games try the documented sibling location first
and fall back to the grouped one:

```make
MAGNOLIA ?= $(firstword $(wildcard ../../magnolia ../../../engines/magnolia))
```

Override with `make MAGNOLIA=<path>`. The missing-engine error is deliberately **skipped
for the `test` goal** — george-boole and texas-holdem-lava-dome run their CI host tests
from a single checkout with no engine beside them, so a guard that fired there would
break CI. `texas-holdem-lava-dome/tui/tools/js_oracle.mjs` does the same for its two
candidate website paths.

**Junctions**, where editing a repo was not worth it. Three remain, all in `apps\`:

| Junction | Target | Exists for |
|---|---|---|
| `apps\magma-kit` | `engines\magma-kit` | `../magma-kit/scripts/sync.mjs` and `../../../magma-kit/crate` in sprite-forge, deck-press, gatefold and magma-ops-app |
| `apps\website` | `web\website` | sprite-forge's web sync target `../website/ware/sprite-forge/` |
| `apps\adenosine` | `engines\adenosine` | the vendoring copy documented in deck-press |

`games\` has no junctions — nothing but games appears there.

> A recursive scan of `magmacrunch\` therefore sees magma-kit, adenosine and website
> **twice**. Walk each repo with `git ls-files` rather than the directory tree, or
> exclude the junction paths.

## Commit identity

`~/.gitconfig` carries a conditional include, so identity follows the folder and cannot
be forgotten:

```ini
[includeIf "gitdir/i:C:/magma/dev/jamccoy/"]
	path = ~/.gitconfig-jamccoy
```

Anything under `dev\jamccoy\` commits as that account; everything else commits as
`magmacrunchmedia <magmacrunchmedia@gmail.com>`. Do not set `user.email` inside a repo —
a local value silently defeats the split.

## Licensing

**A licence is a grant to other people. It does not bind us.** We hold the copyright, so
we can sell anything here on the App Store or anywhere else whatever the repo says.
PolyForm Noncommercial has never stopped us selling a game; it stops *other people*
selling it. Apache 2.0 does the opposite: under it anyone may build the thing and sell it.

So the question is never "do we want to sell this", it is **is this offered for other
people to build on**:

| | Licence | Why |
|---|---|---|
| Published for others to build on | **Apache 2.0** | `crunch-c`, and nothing else. `magmascript` is MIT, from before this settled. |
| A product, or private to one | **PolyForm Noncommercial 1.0.0** | Every game, every app and every engine. |

The permissive row held `magnolia`, `adenosine`, `texastoast` and `hypnopompia`
too, on the argument that a library nobody may use commercially is not much of a
library. **That argument lost to measurement.** `hypnopompia` moved on
2026-09-26, being private and published to no registry, so none of the reasoning
ever applied to it. The other three moved on 2026-10-15, once adoption was
actually counted: adenosine's per-version npm downloads were one pinned consumer
plus a tail of exactly one hit per historical version, which is registry
scanners walking the list rather than people, and texastoast's PyPI figures were
the same noise floor. magnolia is private and published nowhere at all, so its
permissive grant had no audience whatsoever. A grant nobody is using buys
nothing and gives away the one protection the licence provided, which is the
same conclusion the section below reaches from the opposite direction.

**None of it is retroactive.** Versions already published under Apache 2.0 stay
available under it, and that cannot be withdrawn. No version was bumped with the
relicensing, so the npm and PyPI releases keep advertising Apache until each
package's next release.

So the split is not "engines are permissive, games are not", and it is no longer
about engines at all: everything magmacrunch writes is Noncommercial except
`crunch-c`. Ask what the repo is *for*.

### Relicensing is almost always the wrong move

On 25 September 2026 four repos were relicensed to Apache 2.0 in twelve minutes, with the
commit subject `Relicense to Apache 2.0 for commercial distribution` in each. All four
were reverted the same night. The reasoning was backwards: no licence change was needed
to sell, and the change gave away the one protection the old licence provided.

**`LICENSE` is never the only place a licence is written.** That sweep touched the root
file alone, and left behind, in one repo:

- `tui/pyproject.toml`, which declares `license = "PolyForm-Noncommercial-1.0.0"` and
  ships it to PyPI by Trusted Publishing, so a release would have announced a licence
  whose text was no longer in the repo
- `tui/LICENSE`, a copy carrying the full old text beside a root file that now disagreed
- `NOTICE`, `README.md`, `wii/README.md` and `AGENTS.md`, the last of which explains that
  the `tui/` copy exists *because* of the licence it names

Check all of them, or revert instead. Reverting fixed five references at once.

### Repos with no `LICENSE` at all

Nine as of 26 September 2026, including `nanofab-simulator`, `gratinglab`, `font-litho`,
`historian-tui` and `magmacrunch-ops`. A repo with no licence grants nothing to anybody,
which is the safe default but not a decision. Give a new repo its `LICENSE` when it stops
being a sketch.

## wii-card

`magmacrunch\wii-card\` is the one place all three magnolia games' `boot.dol` and
`meta.xml` sit together, ready to copy onto a FAT32 card for the Homebrew Channel. Each
`.dol` also exists, byte-identical and gitignored, under each game's `wii\build\` and
`wii\sdcard\`. This folder is a copy rather than a build, so it can fall behind:

```powershell
.\refresh.ps1          # compare by hash, report what is stale
.\refresh.ps1 -Apply   # copy the newer builds in
```

Producing a new `.dol` needs devkitPPC, which is not installed on the dev machine —
`make test` in a game's `wii\` runs the host tests without it.

## The org rename

Repos moved from the personal account `magmacrunchmedia` to the `magmacrunch-media`
organization. Old URLs still resolve through GitHub's redirects, but those lapse if a
repo is recreated under the old name.

**Do not blanket-replace the string `magmacrunchmedia`.** These are unrelated to the org
and keep the old spelling:

- `magmacrunchmedia@gmail.com`, and the git author *name* `magmacrunchmedia`
- the Substack handle, the PyPI user, the profile-view counter
- `actions.runner.magmacrunchmedia-magmacrunch.com.MC1-*` — the self-hosted runner's
  systemd service names, fixed when it was registered. Rewriting them makes the
  [Admin Dashboard](Admin-Dashboard) poll a service that does not exist; they change
  only if the runner is re-registered. See [GitHub Actions](GitHub-Actions).
- `github.com/magmacrunchmedia/magmacrunchmedia` — the profile-README repo, which was
  never transferred. Organization profiles use a `.github` repo instead.
