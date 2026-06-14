// ═══════════════════════════════════════════════
// Very Long Boards — HUD
// Speed, stability bar, hill indicator
// ═══════════════════════════════════════════════

function renderHUD(ctx, road) {
    const W = CONFIG.WIDTH;
    const H = CONFIG.HEIGHT;
    const char = CHARACTERS[currentCharacter];
    const maxSpd = CONFIG.MAX_SPEED * char.speedMult;
    const kmh = Math.floor(player.speed * CONFIG.SPEED_DISPLAY_FACTOR);
    const speedPct = Math.min(1, player.speed / maxSpd);
    const stabPct = player.stability / CONFIG.STABILITY_MAX;

    const barW = 140;
    const barH = 12;
    const barX = 16;
    const barY = H - 28;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    const barColor = speedPct > 0.8 ? '#ff2e9c' : speedPct > 0.5 ? '#ffe03a' : '#39ff6e';
    ctx.fillStyle = barColor;
    ctx.fillRect(barX, barY, barW * speedPct, barH);

    ctx.fillStyle = '#fff';
    ctx.font = '20px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    const speedText = kmh < 5 ? '--' : String(kmh);
    ctx.fillText(speedText, barX, barY - 10);

    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillStyle = '#aaa';
    const kmhWidth = ctx.measureText(speedText).width;
    ctx.fillText(kmh < 5 ? '' : 'KM/H', barX + kmhWidth + 8, barY - 10);

    ctx.fillStyle = '#888';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText('SPD', barX, barY + barH + 14);

    const stabBarY = barY + barH + 22;
    const stabBarW = 140;
    const stabBarH = 6;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX - 2, stabBarY - 2, stabBarW + 4, stabBarH + 4);

    let stabColor;
    if (stabPct > 0.55) stabColor = '#39ff6e';
    else if (stabPct > 0.25) stabColor = '#ffe03a';
    else stabColor = '#ff2e9c';

    ctx.fillStyle = stabColor;
    ctx.fillRect(barX, stabBarY, stabBarW * stabPct, stabBarH);

    ctx.fillStyle = '#888';
    ctx.font = '5px "Press Start 2P", monospace';
    ctx.fillText('CARVE', barX, stabBarY + stabBarH + 10);

    if (player.wobbling && !player.bailing) {
        const danger = 1 - stabPct;
        ctx.fillStyle = danger > 0.5 ? '#ff2e9c' : '#ffe03a';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        if (Math.floor(performance.now() / 300) % 2 === 0 || danger > 0.7) {
            ctx.fillText(danger > 0.7 ? '!! BAIL !!' : '! WOBBLE !', W / 2, 50);
        }
    }

    ctx.fillStyle = '#ffe03a';
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('SCORE ' + player.score.toString().padStart(6, '0'), W - 16, 22);

    ctx.fillStyle = '#fff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.fillText(Math.floor(player.distance) + 'm', W - 16, 38);

    const hill = road.hillVal;
    if (hill === SEG.HILL_DOWN) {
        ctx.fillStyle = '#39ff6e';
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('\u25BC STEEP \u25BC', W / 2, H - 12);
    }

    if (player.trickActive) {
        ctx.fillStyle = '#ffe03a';
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TRICK!', W / 2, 60);
    }

    ctx.fillStyle = '#555';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(char.name, W - 16, H - 12);
}

function updateHUD() {
    const elScore = document.getElementById('hudScore');
    const elSpeed = document.getElementById('hudSpeed');
    const elDist = document.getElementById('hudDist');
    if (elScore) elScore.textContent = player.score;
    if (elSpeed) elSpeed.textContent = Math.floor(player.speed * CONFIG.SPEED_DISPLAY_FACTOR);
    if (elDist) elDist.textContent = Math.floor(player.distance);
}