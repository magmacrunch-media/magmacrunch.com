// ═══════════════════════════════════════════════
// Very Long Boards — HUD (DOM-based)
// ═══════════════════════════════════════════════

let hudScoreEl, hudSpeedEl, hudDistEl, kickPromptEl;

window.initHUD = function() {
    hudScoreEl = document.getElementById('hudScore');
    hudSpeedEl = document.getElementById('hudSpeed');
    hudDistEl = document.getElementById('hudDist');
    kickPromptEl = document.getElementById('kickPrompt');
};

function updateHUD() {
    if (hudScoreEl) hudScoreEl.textContent = player.score;
    if (hudSpeedEl) hudSpeedEl.textContent = Math.floor(player.speed * CONFIG.SPEED_DISPLAY_FACTOR);
    if (hudDistEl) hudDistEl.textContent = Math.floor(player.distance);
    if (kickPromptEl) kickPromptEl.style.display = player.kicked ? 'none' : 'block';
}
