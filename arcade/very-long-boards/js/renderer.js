const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function getPlayerScreenY() {
    return CONFIG.HEIGHT * 0.83;
}

function renderGame(road, steer, frame, speed) {
    ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    const slope = road.slope || 0;
    const slopeNorm = road.getSlope ? Math.max(0, Math.min(1, -slope / 3.0)) : 0;
    let tiltY = -slopeNorm * 6;

    let shakeX = 0, shakeY = 0;
    if (speed > 8) {
        const s = (speed - 8) * 0.3;
        shakeX += (Math.random() - 0.5) * s;
        shakeY += (Math.random() - 0.5) * s * 0.4;
    }
    if (player.wobbling && !player.bailing) {
        const wobbleStr = 1 - (player.stability / CONFIG.STABILITY_WOBBLE_AT);
        const intensity = CONFIG.WOBBLE_INTENSITY * wobbleStr * 15;
        shakeX += Math.sin(player.wobblePhase * 6) * intensity;
        shakeY += Math.cos(player.wobblePhase * 4.5) * intensity * 0.5;
    }

    ctx.save();
    ctx.translate(shakeX, tiltY + shakeY);

    road.render(ctx);

    renderObstacles(ctx, road);

    ctx.restore();

    ctx.save();
    ctx.translate(shakeX, tiltY + shakeY);

    let pWobble = 0;
    if (player.wobbling && !player.bailing) {
        const wobbleStr = 1 - (player.stability / CONFIG.STABILITY_WOBBLE_AT);
        pWobble = Math.sin(player.wobblePhase * 7) * wobbleStr * 8;
    }

    const screenY = getPlayerScreenY();
    const pScale = CONFIG.PLAYER_SCALE || 1;
    const char = characterSprites[currentCharacter];
    const slopeBob = slopeNorm * 6;

    if (player.bailing) {
        const progress = 1 - (player.bailTimer / 40);
        ctx.save();
        ctx.translate(player.x, screenY);
        ctx.rotate(progress * progress * 4);
        ctx.scale(pScale * (1 - progress * 0.5), pScale * (1 - progress * 0.5));
        ctx.globalAlpha = 1 - progress * 0.3;
        char.draw(ctx, -16, -40, player.lean, frame);
        ctx.restore();
    } else if (char && player.alive) {
        if (!player.invincible || Math.floor(frame / 4) % 2 === 0) {
            ctx.save();
            ctx.translate(player.x + pWobble, screenY + slopeBob);
            ctx.scale(pScale, pScale);
            ctx.rotate(player.lean * 0.15 + pWobble * 0.01 + slopeNorm * -0.1);
            char.draw(ctx, -16, -40, player.lean, frame);
            ctx.restore();
        }
    }

    renderParticles(ctx);

    road.drawSpeedLines(ctx, speed);

    renderHUD(ctx, road);

    if (player.kicking) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = '#39ff6e';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#39ff6e';
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillText('KICK OFF!', CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2 - 40);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    ctx.restore();

    if (player.wobbling && !player.bailing) {
        const danger = 1 - (player.stability / CONFIG.STABILITY_WOBBLE_AT);
        if (danger > 0.5) {
            ctx.fillStyle = `rgba(255,0,0,${(danger - 0.5) * 0.15})`;
            ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);
        }
    }
}

function renderCountdown(count) {
    ctx.clearRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    road.render(ctx);

    ctx.fillStyle = 'rgba(10,6,18,0.6)';
    ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

    const text = count > 0 ? String(count) : 'GO';
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = count > 0 ? '#ffe03a' : '#39ff6e';
    ctx.shadowBlur = 30;
    ctx.fillStyle = count > 0 ? '#ffe03a' : '#39ff6e';
    ctx.font = `bold 72px "Press Start 2P", monospace`;
    ctx.fillText(text, CONFIG.WIDTH / 2, CONFIG.HEIGHT / 2);
    ctx.shadowBlur = 0;
    ctx.restore();
}

function renderCharacterPreview(canvasId, charKey) {
    const pc = document.getElementById(canvasId);
    if (!pc) return;
    const pctx = pc.getContext('2d');
    pctx.clearRect(0, 0, 64, 80);
    const ch = characterSprites[charKey];
    if (ch) ch.draw(pctx, 16, 10, 0, 0);
}