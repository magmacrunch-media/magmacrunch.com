// Character Selector Keyboard Navigation
// Adds arrow key navigation and Enter/Space selection to existing character modal
// Works alongside existing modal handlers in main.js

(function() {
    'use strict';
    
    let selectedCharacterIndex = 0;
    let characterCards = [];
    
    // Update visual selection highlight
    function updateSelection() {
        characterCards.forEach((card, index) => {
            if (index === selectedCharacterIndex) {
                // Add cyan outline for keyboard navigation feedback
                card.style.outline = '3px solid #00d4ff';
                card.style.outlineOffset = '2px';
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // Also add the 'selected' class to show green background
                card.classList.add('selected');
            } else {
                // Remove outline and selected class from others
                card.style.outline = 'none';
                card.classList.remove('selected');
            }
        });
    }
    
    // Select the currently highlighted character and close modal
    function selectCurrentCharacter() {
        if (characterCards[selectedCharacterIndex]) {
            // Click the character to select it (triggers the character change)
            characterCards[selectedCharacterIndex].click();
            
            // Then close the modal (same as clicking close button)
            setTimeout(() => {
                const closeBtn = document.getElementById('closeModal');
                if (closeBtn) {
                    closeBtn.click();
                }
            }, 50); // Small delay to let the selection register
        }
    }
    
    // Keyboard navigation handler
    function handleCharacterModalKeydown(e) {
        const modal = document.getElementById('characterModal');
        
        // Only handle keys when character modal is open
        if (!modal || modal.style.display === 'none' || modal.style.display === '') {
            return;
        }
        
        // Don't handle if no cards loaded yet
        if (characterCards.length === 0) {
            return;
        }
        
        // Determine grid layout (check CSS or calculate from cards)
        let columns = 5; // Default from CSS
        if (window.innerWidth <= 480) {
            columns = 2;
        } else if (window.innerWidth <= 768) {
            columns = 3;
        }
        
        const rows = Math.ceil(characterCards.length / columns);
        const currentRow = Math.floor(selectedCharacterIndex / columns);
        const currentCol = selectedCharacterIndex % columns;
        
        switch(e.key) {
            case 'ArrowRight':
                e.preventDefault();
                e.stopPropagation();
                selectedCharacterIndex = Math.min(selectedCharacterIndex + 1, characterCards.length - 1);
                updateSelection();
                // Play button sound
                if (window.playButtonSound) {
                    window.playButtonSound();
                }
                break;
                
            case 'ArrowLeft':
                e.preventDefault();
                e.stopPropagation();
                selectedCharacterIndex = Math.max(selectedCharacterIndex - 1, 0);
                updateSelection();
                // Play button sound
                if (window.playButtonSound) {
                    window.playButtonSound();
                }
                break;
                
            case 'ArrowDown':
                e.preventDefault();
                e.stopPropagation();
                const nextRowIndex = selectedCharacterIndex + columns;
                if (nextRowIndex < characterCards.length) {
                    selectedCharacterIndex = nextRowIndex;
                } else {
                    // Wrap to first row, same column (or closest)
                    selectedCharacterIndex = Math.min(currentCol, characterCards.length - 1);
                }
                updateSelection();
                // Play button sound
                if (window.playButtonSound) {
                    window.playButtonSound();
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                e.stopPropagation();
                const prevRowIndex = selectedCharacterIndex - columns;
                if (prevRowIndex >= 0) {
                    selectedCharacterIndex = prevRowIndex;
                } else {
                    // Wrap to last row, same column (or closest)
                    const lastRowStart = Math.floor((characterCards.length - 1) / columns) * columns;
                    selectedCharacterIndex = Math.min(lastRowStart + currentCol, characterCards.length - 1);
                }
                updateSelection();
                // Play button sound
                if (window.playButtonSound) {
                    window.playButtonSound();
                }
                break;
                
            case 'Enter':
            case ' ':
                e.preventDefault();
                e.stopPropagation();
                selectCurrentCharacter();
                break;
                
            case 'Escape':
                e.preventDefault();
                e.stopPropagation();
                const closeBtn = document.getElementById('closeModal');
                if (closeBtn) closeBtn.click();
                break;
        }
    }
    
    // Refresh the character cards array and find selected character
    function refreshCharacterCards() {
        const characterGrid = document.getElementById('characterGrid');
        if (!characterGrid) {
            console.log('Character grid not found');
            return;
        }
        
        characterCards = Array.from(characterGrid.querySelectorAll('.character-option'));
        console.log('Found character cards:', characterCards.length);
        
        if (characterCards.length > 0) {
            // Find currently selected character
            const selectedCard = characterCards.find(card => 
                card.classList.contains('selected')
            );
            
            if (selectedCard) {
                selectedCharacterIndex = characterCards.indexOf(selectedCard);
                console.log('Selected character index:', selectedCharacterIndex);
            } else {
                selectedCharacterIndex = 0;
            }
            
            updateSelection();
        }
    }
    
    // Hook into the existing renderCharacterGrid function to refresh cards after render
    function hookRenderCharacterGrid() {
        // Wait for renderCharacterGrid to be defined
        if (typeof window.renderCharacterGrid === 'undefined') {
            // Create a proxy that will be called
            const originalRender = window.renderCharacterGrid;
            
            // Check if main.js has defined renderCharacterGrid function
            const checkInterval = setInterval(() => {
                // Try to find the function in main.js scope
                // Since renderCharacterGrid is called from main.js but not global, 
                // we'll use MutationObserver on the grid instead
                clearInterval(checkInterval);
                observeCharacterGrid();
            }, 100);
        }
    }
    
    // Observe the character grid for changes
    function observeCharacterGrid() {
        const characterGrid = document.getElementById('characterGrid');
        if (!characterGrid) {
            console.log('Character grid not found for observation');
            return;
        }
        
        // Use MutationObserver to detect when character cards are added
        const observer = new MutationObserver((mutations) => {
            // Only refresh if children were added
            const hasAddedNodes = mutations.some(mutation => mutation.addedNodes.length > 0);
            if (hasAddedNodes) {
                console.log('Character grid updated, refreshing cards');
                setTimeout(refreshCharacterCards, 50);
            }
        });
        
        observer.observe(characterGrid, {
            childList: true,
            subtree: false
        });
        
        console.log('Character grid observer initialized');
    }
    
    // Add keyboard event listener
    document.addEventListener('keydown', handleCharacterModalKeydown);
    console.log('Character keyboard navigation initialized');
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            observeCharacterGrid();
        });
    } else {
        // DOM already loaded
        observeCharacterGrid();
    }
})();
