# Audio

**This folder holds no sound yet, and the game is complete without it.** Every
cue is wired in `game.js`; each one is a silent no-op until its file is here.
Drop one in, name it in `index.json`, and it plays. No code change.

`web/audio.js` loads each asset separately with its own catch rather than
calling `AdAudio.init()`, which rejects the whole manifest over one missing
file. `p2pAudio.report()` in the console says what loaded and what did not.

## What to add

The files, and their names in **`index.json`** beside them:

```json
["theme", "lever", "stop", "slip", "nomatch", "twomatch", "jackpot", "cashout"]
```

`index.json` is the list of what is actually here. Without it an empty folder
costs one failed request instead of one per sound, and the browser logs every
failed fetch itself. A name listed with no file behind it still degrades to
silence, and `report()` names it.

**Name files without an extension in `index.json`, and ship both `.ogg` and
`.mp3` of each**: the game picks ogg where the browser takes Vorbis. Volumes and
pool sizes are in `P2P_AUDIO` at the top of `audio.js`.

| file | name in `index.json` | when it plays |
|---|---|---|
| `pay2play` | `theme` | the music bed, looped, from the first lever pull |
| `lever` | `lever` | each pull, which is also the cent going in |
| `stop` | `stop` | a reel stopping exactly where you pressed |
| `slip` | `slip` | a reel the house dragged past your press, in place of `stop` |
| `nomatch` | `nomatch` | a spin with nothing |
| `twomatch` | `twomatch` | a pair |
| `jackpot` | `jackpot` | three of a kind |
| `cashout` | `cashout` | walking away, as the prize card opens |

`slip` replacing `stop` is the one worth getting right: it is the only place the
house's edge is audible, and it should read as the reel being taken from you
rather than as a second stop.

`M` toggles all of it, and the choice is remembered.

## Audio needs a server, and the game does not

`file://` is the documented way to open this game and audio cannot work from
it, because both loaders use `fetch()`. Audio switches itself off there rather
than breaking anything. Serve the folder to hear it:

```bash
python -m http.server 8137 --directory web
```
