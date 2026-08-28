/* hologram reference: module tabs and function filter.
 *
 * The reference itself is static markup in reference.html: 53 signatures is
 * small enough that rendering them from a data file would only add a fetch and
 * a way to go stale. This script does the two interactive parts, showing and
 * hiding what is already on the page.
 */
(function () {
    'use strict';

    var sections = Array.prototype.slice.call(
        document.querySelectorAll('.module-section'));
    var tabs = Array.prototype.slice.call(
        document.querySelectorAll('.module-tab'));
    var input = document.getElementById('search-input');
    var clear = document.getElementById('search-clear');
    var stats = document.getElementById('stats');
    var empty = document.getElementById('no-results');

    var activeModule = 'all';

    /* Cache each function row's searchable text once. */
    var rows = [];
    sections.forEach(function (section) {
        var module = section.dataset.module;
        Array.prototype.forEach.call(section.querySelectorAll('.fn'), function (fn) {
            rows.push({ el: fn, module: module, text: fn.textContent.toLowerCase() });
        });
    });

    function apply() {
        var query = input.value.trim().toLowerCase();
        var shown = 0;

        rows.forEach(function (row) {
            var match = (activeModule === 'all' || row.module === activeModule) &&
                (query === '' || row.text.indexOf(query) !== -1);
            row.el.hidden = !match;
            if (match) shown++;
        });

        /* A module section hides when nothing in it survived, so the headers
           and the type blocks do not float above an empty list. */
        sections.forEach(function (section) {
            var visible = section.querySelector('.fn:not([hidden])');
            section.hidden = !visible;
        });

        empty.hidden = shown !== 0;
        stats.textContent = shown === 1 ? '1 function shown'
            : shown + ' functions shown';
    }

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabs.forEach(function (t) { t.classList.remove('active'); });
            tab.classList.add('active');
            activeModule = tab.dataset.module;
            apply();
            document.getElementById('modules').scrollTop = 0;
        });
    });

    input.addEventListener('input', apply);

    clear.addEventListener('click', function () {
        input.value = '';
        input.focus();
        apply();
    });

    /* Escape clears the query without reaching for the button. */
    input.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && input.value !== '') {
            input.value = '';
            apply();
        }
    });

    apply();
})();
