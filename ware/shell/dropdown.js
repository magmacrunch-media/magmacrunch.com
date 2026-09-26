/* ═══════════════════════════════════════════════
    magmacrunch media — retro dropdown
    ware/shell/dropdown.js

    One implementation of the click-to-open option list used by
    album-art-maker, media-search and pixel-process. The first two had a
    byte-identical copy of this; pixel-process had the same widget rewritten
    with `var`, taking an element instead of an id, and positioning the list
    with getBoundingClientRect() because its options are position:fixed and
    have to escape a clipping panel.

    This version covers all three:
      - `target` may be an element or an element id
      - the rect positioning runs only when .dropdown-options actually
        computes to position:fixed, so the absolute-positioned callers are
        untouched

    Pair with ware/shell/dropdown.css (album-art-maker, media-search).
    pixel-process keeps its own stylesheet — see the note in dropdown.css.

    Exposes window.RetroDropdown = { setup, getValue, setValue }.
    ═══════════════════════════════════════════════ */

(function () {
    function resolve(target) {
        return typeof target === 'string' ? document.getElementById(target) : target;
    }

    /* Put a fixed list where it can actually be read.
     *
     * A fixed list does not scroll with the page, so anything of it below the
     * fold is unreachable: pixel-process's ADD EFFECT sits at the foot of a
     * panel, and its fifteen effects opened 240px downwards from a trigger
     * 49px above the bottom of the window. Two options were visible, the
     * list's own scrollbar was off-screen, and the remaining thirteen effects
     * could not be got at by any means.
     *
     * So the list is given the room it has: dropped below the trigger when
     * there is space, lifted above it when there is more room up there, and
     * capped to whatever remains so it scrolls inside the window rather than
     * past the edge of it. MARGIN keeps it off the very edge.
     *
     * `opening` is false when this click is about to CLOSE the list, where
     * measuring a list that is about to disappear is wasted work.
     */
    const MARGIN = 8;

    function place(trigger, list, opening) {
        if (!opening) return;

        const rect = trigger.getBoundingClientRect();
        // Measure the list at its natural height, which means showing it
        // before it is placed: `display` is what the .open class toggles, so
        // a list that is still closed measures zero.
        const previous = { display: list.style.display, maxHeight: list.style.maxHeight };
        list.style.display = 'block';
        list.style.maxHeight = 'none';
        const wanted = list.scrollHeight;
        list.style.maxHeight = previous.maxHeight;
        list.style.display = previous.display;

        const below = window.innerHeight - rect.bottom - MARGIN;
        const above = rect.top - MARGIN;
        const dropDown = wanted <= below || below >= above;
        const room = Math.max(64, dropDown ? below : above);
        const height = Math.min(wanted, room);

        list.style.maxHeight = height + 'px';
        list.style.top = dropDown
            ? rect.bottom + 'px'
            : Math.max(MARGIN, rect.top - height) + 'px';

        list.style.width = rect.width + 'px';
        const width = rect.width || list.offsetWidth;
        list.style.left = Math.max(MARGIN,
            Math.min(rect.left, window.innerWidth - MARGIN - width)) + 'px';
    }

    /* Attach open/close and selection behaviour to one dropdown.
       onSelect receives the chosen option's data-value.

       opts.markActive (default true) moves the .active class to the chosen
       option. pixel-process passes false: two of its three dropdowns are
       action menus — picking "ADD EFFECT > BLUR" appends to a chain rather
       than selecting a value — so a sticky highlight would be misleading.

       opts.keepLabel (default false) is the other half of that, and it was
       missing for a year. The trigger's label was rewritten to the chosen
       option unconditionally, so "+ ADD EFFECT" became "PIXEL SORT" the
       moment you added one: the one control that adds an effect stopped
       saying so, and read instead like a display of the effect you were
       already editing. On a phone, where it is also the only way back to the
       list, the app looked as though it had no way to choose a second effect.
       A menu keeps its own name; a value picker ("SELECT" -> "WHITE NOISE")
       still wants the rewrite, which is why this is per-dropdown and not
       tied to markActive. */
    function setup(target, onSelect, opts) {
        const markActive = !(opts && opts.markActive === false);
        const keepLabel = !!(opts && opts.keepLabel);
        const container = resolve(target);
        if (!container) return;

        const selected = container.querySelector('.dropdown-selected');
        const options = container.querySelectorAll('.dropdown-option');
        const list = container.querySelector('.dropdown-options');
        if (!selected) return;

        selected.addEventListener('click', (e) => {
            e.stopPropagation();

            // Close every other open dropdown on the page.
            document.querySelectorAll('.custom-dropdown.open').forEach(d => {
                if (d !== container) d.classList.remove('open');
            });

            // A fixed-position list is outside the trigger's containing block,
            // so it has to be told where to go. Absolute lists position
            // themselves off the trigger and must not be touched.
            if (list && getComputedStyle(list).position === 'fixed') {
                place(selected, list, !container.classList.contains('open'));
            }

            container.classList.toggle('open');
        });

        options.forEach(opt => {
            opt.addEventListener('click', () => {
                if (!keepLabel) {
                    const label = selected.querySelector('span:first-child');
                    if (label) label.textContent = opt.textContent;
                }
                if (markActive) {
                    options.forEach(o => o.classList.remove('active'));
                    opt.classList.add('active');
                }
                container.classList.remove('open');
                if (onSelect) onSelect(opt.dataset.value);
            });
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) container.classList.remove('open');
        });
    }

    /* data-value of the active option, or `fallback` when there is none.
       album-art-maker wants null here, media-search wants 'all'. */
    function getValue(target, fallback) {
        const container = resolve(target);
        if (!container) return fallback === undefined ? null : fallback;
        const active = container.querySelector('.dropdown-option.active');
        if (!active) return fallback === undefined ? null : fallback;
        return active.dataset.value;
    }

    /* Mark the option carrying `value` active and sync the trigger label. */
    function setValue(target, value) {
        const container = resolve(target);
        if (!container) return;

        const options = container.querySelectorAll('.dropdown-option');
        options.forEach(o => o.classList.toggle('active', o.dataset.value === value));

        const label = container.querySelector('.dropdown-selected span:first-child');
        const active = container.querySelector('.dropdown-option.active');
        if (label && active) label.textContent = active.textContent;
    }

    /* place is exported for ware/shell/tests/test-dropdown.js. Its arithmetic
       is the whole of this fix and is worth checking without a browser: a list
       that opens off the bottom of the window cannot be scrolled to, because a
       fixed list does not move with the page. */
    window.RetroDropdown = { setup, getValue, setValue, place };
})();
