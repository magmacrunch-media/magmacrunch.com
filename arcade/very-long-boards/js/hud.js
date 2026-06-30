// ═══════════════════════════════════════════════
// Very Long Boards — HUD (DOM-based)
// ═══════════════════════════════════════════════

function updateHUD() {
    const elScore = document.getElementById('hudScore');
    const elSpeed = document.getElementById('hudSpeed');
    const elDist = document.getElementById('hudDist');
    if (elScore) elScore.textContent = player.score;
    if (elSpeed) elSpeed.textContent = Math.floor(player.speed * CONFIG.SPEED_DISPLAY_FACTOR);
    if (elDist) elDist.textContent = Math.floor(player.distance);
}
