// Scoreboard Modal Handler
// This handles opening and closing the high scores modal

(function() {
    'use strict';
    
    function initScoreboardModal() {
        const scoreboardBtn = document.getElementById('scoreboardBtn');
        const scoreboardModal = document.getElementById('scoreboardModal');
        const closeScoreboardModal = document.getElementById('closeScoreboardModal');

        console.log('Initializing scoreboard modal...', {
            scoreboardBtn,
            scoreboardModal,
            closeScoreboardModal
        });

        // Open scoreboard modal
        if (scoreboardBtn && scoreboardModal) {
            scoreboardBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Opening scoreboard modal');
                
                // Play button sound
                if (window.playButtonSound2) {
                    window.playButtonSound2();
                }
                
                scoreboardModal.style.display = 'flex';
                
                // Set modalOpen flag if it exists (to pause game)
                if (typeof window.modalOpen !== 'undefined') {
                    window.modalOpen = true;
                }
            });
        } else {
            console.error('Scoreboard button or modal not found!');
        }

        // Close scoreboard modal
        if (closeScoreboardModal && scoreboardModal) {
            closeScoreboardModal.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Closing scoreboard modal');
                
                // Play button sound
                if (window.playButtonSound2) {
                    window.playButtonSound2();
                }
                
                scoreboardModal.style.display = 'none';
                
                // Clear modalOpen flag
                if (typeof window.modalOpen !== 'undefined') {
                    window.modalOpen = false;
                }
            });
        }

        // Close modal when clicking outside
        if (scoreboardModal) {
            scoreboardModal.addEventListener('click', function(e) {
                if (e.target === scoreboardModal) {
                    console.log('Closing scoreboard modal (clicked outside)');
                    scoreboardModal.style.display = 'none';
                    
                    if (typeof window.modalOpen !== 'undefined') {
                        window.modalOpen = false;
                    }
                }
            });
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScoreboardModal);
    } else {
        // DOM already loaded
        initScoreboardModal();
    }
})();