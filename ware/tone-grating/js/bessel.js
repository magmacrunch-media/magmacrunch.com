/* Bessel functions of the first kind: integer order, real argument.
 *
 * This file is the reason the page exists, so it is kept apart from the drawing
 * and the audio on purpose. Both panels read one J_m(beta) array. If that array
 * were computed twice, once per domain, the page would be asserting a
 * coincidence rather than showing one, and a typo in either copy would hide the
 * only claim it makes.
 *
 * Ascending power series, summed with a running ratio so no factorial is ever
 * formed:
 *
 *     J_m(x) = SUM_k  (-1)^k / (k! (k+m)!) * (x/2)^(2k+m)
 *
 *     term_0 = (x/2)^m / m!
 *     term_k = term_(k-1) * -(x/2)^2 / (k * (k + m))
 *
 * The series alternates, so it loses digits to cancellation as x grows. The
 * largest term in J_0(12) is about 4.2e3 against a sum of 4.8e-2: five digits
 * gone out of sixteen, leaving eleven, which is far more than a canvas can
 * draw. That headroom is what sets BETA_MAX at 12 rather than something
 * rounder. Past roughly x = 15 this wants the asymptotic form or a downward
 * (Miller) recurrence, and neither earns its keep behind a slider that stops
 * where this one does.
 *
 * Negative orders come from J_(-m)(x) = (-1)^m J_m(x), which is exact for
 * integer m, not an approximation.
 */

const Bessel = (() => {

    /* Past 12 the series above starts spending accuracy faster than the page
     * can use it. Anything importing this value is agreeing to stay inside the
     * range where the sum is honest. */
    const BETA_MAX = 12;

    /* Zeros of J_0. The first is the one everybody knows from FM synthesis:
     * the carrier vanishes at an index of 2.4048, and the same number is the
     * phase depth at which a sinusoidal grating sends nothing into its zero
     * order. Listed rather than solved for because there are four of them
     * inside BETA_MAX and they never move. */
    const J0_ZEROS = [2.404826, 5.520078, 8.653728, 11.791534];

    function J(m, x) {
        const n = Math.abs(m);
        const flip = (m < 0 && n % 2 === 1) ? -1 : 1;
        const half = x / 2;

        /* term_0 = half^n / n!, built as a product so neither half^n nor n!
         * exists on its own. At n = 24 and half = 6 the standalone forms are
         * 4.7e18 and 6.2e23; the ratio they would have made is 7.6e-6. */
        let term = 1;
        for (let i = 1; i <= n; i++) term *= half / i;

        let sum = term;
        const step = -half * half;

        for (let k = 1; k < 90; k++) {
            term *= step / (k * (k + n));
            sum += term;
            /* Absolute floor as well as relative, so a sum that has cancelled
             * to near zero still terminates instead of chasing its own noise. */
            if (Math.abs(term) < 1e-18 * Math.abs(sum) + 1e-300) break;
        }

        return flip * sum;
    }

    /* The array both panels share. Orders run -limit..+limit, and the limit
     * tracks beta because the series has no meaningful weight beyond roughly
     * beta + a handful: J_m(beta) falls off super-exponentially once m exceeds
     * its argument. Capped so the table stays readable. */
    function orders(beta, cap = 22) {
        const limit = Math.min(cap, Math.ceil(beta) + 7);
        const out = [];
        for (let m = -limit; m <= limit; m++) out.push({ m, J: J(m, beta) });
        return out;
    }

    /* SUM J_m(beta)^2 = 1 for every beta, which is conservation of power in the
     * audio reading and conservation of energy in the optical one. The page
     * prints it because a number that is supposed to be 1.000 and is not says
     * the truncation above has gone wrong, which nothing else on screen would
     * show. */
    function power(list) {
        return list.reduce((acc, o) => acc + o.J * o.J, 0);
    }

    function nearestNull(beta, tol = 0.02) {
        for (const z of J0_ZEROS) if (Math.abs(beta - z) < tol) return z;
        return null;
    }

    return { J, orders, power, nearestNull, BETA_MAX, J0_ZEROS };
})();
