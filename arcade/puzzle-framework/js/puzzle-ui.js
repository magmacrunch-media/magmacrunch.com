/**
 * puzzle-ui.js — Common UI patterns: modals, dropdowns, buttons
 * Provides: Modal management, dropdown handling, common UI elements
 */

var PuzzleUI = (function() {

    /**
     * Create a new PuzzleUI instance
     */
    function create() {
        var modals = {};

        // ── Modal Management ─────────────────────────────────────────────────

        function registerModal(id, element) {
            modals[id] = element;
        }

        function showModal(id) {
            if (modals[id]) {
                modals[id].classList.add('active');
            }
        }

        function hideModal(id) {
            if (modals[id]) {
                modals[id].classList.remove('active');
            }
        }

        function hideAllModals() {
            Object.keys(modals).forEach(function(id) {
                modals[id].classList.remove('active');
            });
        }

        function isModalOpen(id) {
            return modals[id] && modals[id].classList.contains('active');
        }

        function setupModalClose(modalId, closeButtons) {
            var modal = modals[modalId];
            if (!modal) return;

            closeButtons.forEach(function(btn) {
                if (btn) {
                    btn.addEventListener('click', function() {
                        hideModal(modalId);
                    });
                }
            });

            // Close on backdrop click
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    hideModal(modalId);
                }
            });
        }

        // ── Dropdown Management ──────────────────────────────────────────────

        function setupDropdown(container, selected, options, onSelect) {
            var isOpen = false;

            selected.addEventListener('click', function(e) {
                e.stopPropagation();
                isOpen = !isOpen;
                container.classList.toggle('open', isOpen);
            });

            options.forEach(function(option) {
                option.addEventListener('click', function() {
                    selected.textContent = option.textContent;
                    selected.dataset.value = option.dataset.value;
                    container.classList.remove('open');
                    isOpen = false;
                    if (onSelect) onSelect(option.dataset.value);
                });
            });

            // Close on outside click
            document.addEventListener('click', function(e) {
                if (!container.contains(e.target)) {
                    container.classList.remove('open');
                    isOpen = false;
                }
            });
        }

        // ── Utility Functions ────────────────────────────────────────────────

        function $(selector) {
            return document.querySelector(selector);
        }

        function $$(selector) {
            return document.querySelectorAll(selector);
        }

        function show(element) {
            if (element) element.style.display = '';
        }

        function hide(element) {
            if (element) element.style.display = 'none';
        }

        function setText(element, text) {
            if (element) element.textContent = text;
        }

        function setHTML(element, html) {
            if (element) element.innerHTML = html;
        }

        // ── Score Formatting ─────────────────────────────────────────────────

        function formatTime(seconds) {
            var m = Math.floor(seconds / 60);
            var s = seconds % 60;
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        function formatScore(score) {
            return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }

        return {
            registerModal: registerModal,
            showModal: showModal,
            hideModal: hideModal,
            hideAllModals: hideAllModals,
            isModalOpen: isModalOpen,
            setupModalClose: setupModalClose,
            setupDropdown: setupDropdown,
            $: $,
            $$: $$,
            show: show,
            hide: hide,
            setText: setText,
            setHTML: setHTML,
            formatTime: formatTime,
            formatScore: formatScore
        };
    }

    return {
        create: create
    };

})();
