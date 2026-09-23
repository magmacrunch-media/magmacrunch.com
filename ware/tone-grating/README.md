# TONE//GRATING

A twin-panel demonstration that FM synthesis and a sinusoidal phase grating are
the same calculation.

Unlike `ware/sprite-forge/`, `ware/pixel-process/` and the playgrounds, this app
has **no upstream repo**. The source of truth is this directory, so edit it here.
Nothing syncs into it and nothing syncs out of it.

## The claim

Both halves of the page read one array, `Bessel.orders(beta)`, computed in
`js/bessel.js`. Only the rule that places each value differs:

| | time | space |
|---|---|---|
| carrier | audible pitch `fc` | the zero-order direction |
| phase applied | `beta * sin(2*pi*fm*t)` | `beta * sin(2*pi*x/d)` |
| component `m` sits at | `fc + m*fm` (Hz) | `sin(theta) = m*lambda/d` |
| amplitude of component `m` | `J_m(beta)` | `J_m(beta)` |
| what a detector measures | `J_m(beta)^2` | `J_m(beta)^2` |

For FM this is Chowning's sideband result. For the grating it is the
Jacobi-Anger expansion of `exp(i*beta*sin(2*pi*x/d))`. They are one identity
written twice, which is why `js/bessel.js` is a separate file and why both
panels are forbidden from computing their own copy: the agreement has to be a
property of the maths, not of this directory.

The page opens at `beta = 2.404826`, the first zero of `J_0`, because that is
where the claim is cheapest to check by ear. Press PLAY and the pitch you
nominated as the carrier is the one frequency absent from the sound. No code
arranged that; it falls out of `J_0(2.404826) = 0`, and the same zero is why a
sinusoidal grating at that phase depth sends nothing straight through.

## Where the analogy stops

Deliberately shown rather than hidden, because it is the part that teaches what
a conjugate variable actually is:

- A sideband driven below 0 Hz **folds** onto its own magnitude. The table marks
  it and the spectrum draws it hollow.
- An order past `|sin(theta)| = 1` **does not propagate**. It is not drawn at
  all, only counted.
- `lambda` appears in the optical placement rule and nowhere in the audio one.
  That asymmetry is dispersion, and it has no clean acoustic counterpart.

## Numerics

`js/bessel.js` sums the ascending power series with a running ratio, so no
factorial is ever formed. The series alternates and loses digits to cancellation
as its argument grows, which is what fixes `BETA_MAX` at 12: the largest term in
`J_0(12)` is about `4.2e3` against a sum of `4.8e-2`, five digits of sixteen
gone. Eleven remain, far more than a canvas can draw.

The self-check is on screen. `SUM J_m(beta)^2` is exactly 1 for every `beta`
(power conservation in the audio reading, energy conservation in the optical
one), so the right-hand panel prints it. If it stops reading `1.0000` the order
list is being truncated too early and both panels are wrong by the same amount.

## Files

| | |
|---|---|
| `js/bessel.js` | `J_m(x)`, the order list, the power sum, the zeros of `J_0` |
| `js/audio.js` | two oscillators; the physics is `modGain.gain = beta * fm` |
| `js/draw.js` | four canvases, one bar routine, two placement rules |
| `js/app.js` | state, controls, the shared table |

Bar height is `|J_m(beta)|` in **both** spectra. Drawing amplitude on one side
and intensity on the other would be more conventional and would destroy the
only thing worth looking at, so the squares live in the table instead.

## Chrome

Standard ware shell: `../shell/fonts.css` then `../shell/app-shell.css` then
`css/style.css`, and the six palette tokens the shell consumes are defined under
the `PALETTE` banner at the top of that file. No toast and no dropdown, so
neither is loaded. `npm run check:shell` covers the token contract.

Write new asset tags with no `?v=` and run `npm run build:adenosine` to stamp
them.

Colour is load-bearing: amber is time, violet is space, and cyan is reserved for
what belongs to neither, meaning `J_m(beta)`, the carrier, the zero order and
the shared slider. Nothing else on the page may be cyan.
