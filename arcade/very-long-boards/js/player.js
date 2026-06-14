const player = {
    x: 0,
    speed: 0,
    lean: 0,
    targetLean: 0,
    distance: 0,
    score: 0,
    alive: true,
    trickActive: false,
    trickTimer: 0,
    invincible: false,
    invincibleTimer: 0,
    kicking: false,
    kickFrames: 0,
    stability: 100,
    wobbling: false,
    wobblePhase: 0,
    bailing: false,
    bailTimer: 0,
};

function resetPlayer() {
    player.x = CONFIG.WIDTH / 2;
    player.speed = 0;
    player.lean = 0;
    player.targetLean = 0;
    player.distance = 0;
    player.score = 0;
    player.alive = true;
    player.trickActive = false;
    player.trickTimer = 0;
    player.invincible = false;
    player.invincibleTimer = 0;
    player.kicking = true;
    player.kickFrames = CONFIG.KICK_DURATION;
    player.stability = CONFIG.STABILITY_MAX;
    player.wobbling = false;
    player.wobblePhase = 0;
    player.bailing = false;
    player.bailTimer = 0;
}

function updatePlayer(input, road) {
    const char = CHARACTERS[currentCharacter];
    const maxSpd = CONFIG.MAX_SPEED * char.speedMult;
    const handling = CONFIG.TURN_SPEED * char.handlingMult;
    const stabMult = char.stabilityMult;

    if (player.bailing) {
        player.bailTimer--;
        player.speed *= 0.92;
        player.wobblePhase += 0.4;
        if (player.bailTimer <= 0) return 'bail';
        return null;
    }

    if (player.kicking) {
        player.speed += CONFIG.KICK_ACCEL;
        player.kickFrames--;
        if (player.kickFrames <= 0) player.kicking = false;
    } else {
        const slope = road.getSlope();
        if (input.brake) {
            player.speed -= CONFIG.BRAKE_FORCE;
        } else {
            const slopeAccel = slope < -0.3 ? CONFIG.HILL_DOWN_BOOST : (slope > 0.3 ? -0.02 : 0);
            player.speed += CONFIG.ACCELERATION + slopeAccel;
        }
    }

    const turning = input.left || input.right;
    if (turning) {
        player.stability += CONFIG.STABILITY_GAIN * stabMult;
        if (player.stability > CONFIG.STABILITY_MAX) player.stability = CONFIG.STABILITY_MAX;
    } else if (player.speed > 2) {
        const speedFactor = Math.min(player.speed / CONFIG.MAX_SPEED, 1);
        player.stability -= CONFIG.STABILITY_DECAY * (0.5 + speedFactor * 1.5);
        if (player.stability < 0) player.stability = 0;
    }

    player.wobbling = player.stability < CONFIG.STABILITY_WOBBLE_AT;
    player.wobblePhase += player.wobbling ? 0.15 + (1 - player.stability / CONFIG.STABILITY_WOBBLE_AT) * 0.3 : 0;

    if (player.stability <= CONFIG.STABILITY_BAIL_AT && player.speed > 3) {
        player.bailing = true;
        player.bailTimer = 40;
        return null;
    }

    if (input.left) {
        player.targetLean = -1;
        player.x -= handling;
    } else if (input.right) {
        player.targetLean = 1;
        player.x += handling;
    } else {
        player.targetLean = 0;
    }
    player.lean += (player.targetLean - player.lean) * 0.2;

    player.x += road.getCurvePush();

    player.speed *= CONFIG.FRICTION;
    player.speed = Math.max(0, Math.min(maxSpd, player.speed));

    if (input.left || input.right) {
        road.playerX += player.lean * 0.01;
    }
    road.playerX = clamp(road.playerX, -1.5, 1.5);

    player.distance = road.playerZ;
    player.score += Math.floor(player.speed);

    const halfRoad = CONFIG.WIDTH * 0.45;
    const center = CONFIG.WIDTH / 2;
    if (Math.abs(player.x - center) > halfRoad) {
        player.speed *= CONFIG.OFFROAD_SLOW;
    }
    const maxX = halfRoad + 50;
    player.x = Math.max(center - maxX, Math.min(center + maxX, player.x));

    if (player.trickActive) {
        player.trickTimer--;
        if (player.trickTimer <= 0) player.trickActive = false;
    }
    if (player.invincible) {
        player.invincibleTimer--;
        if (player.invincibleTimer <= 0) player.invincible = false;
    }

    return null;
}

function performTrick() {
    if (!player.trickActive && player.speed > 3 && !player.bailing) {
        player.trickActive = true;
        player.trickTimer = 30;
        player.score += CONFIG.TRICK_POINTS * CHARACTERS[currentCharacter].trickMult;
        return true;
    }
    return false;
}

function checkCollision(obstacles, road) {
    if (player.invincible || player.bailing) return false;
    const char = CHARACTERS[currentCharacter];
    const hitbox = char.hitbox;
    const pY = getPlayerScreenY();
    const dd = CONFIG.DRAW_DISTANCE * CONFIG.SEGMENT_LENGTH;

    for (const obs of obstacles) {
        if (!obs.active) continue;
        const relZ = obs.z - player.distance;
        if (relZ < CONFIG.CAMERA_DEPTH || relZ > dd) continue;

        const seg = road.findSegment(obs.z);
        if (!seg) continue;
        const proj = road._project(relZ, obs.worldX * CONFIG.ROAD_WIDTH, seg.y);
        if (!proj) continue;
        const sx = proj.cx;
        const sy = proj.screenY;
        const oW = obs.w * proj.scale;
        const oH = obs.h * proj.scale;

        if (Math.abs(player.x - sx) < (hitbox.w + oW) / 2 &&
            Math.abs(pY - sy) < (hitbox.h + oH) / 2) {
            obs.active = false;
            return true;
        }

        if (!obs.nearMissed &&
            Math.abs(player.x - sx) < (hitbox.w + oW) / 2 + CONFIG.NEAR_MISS_PX &&
            Math.abs(pY - sy) < (hitbox.h + oH) / 2 + CONFIG.NEAR_MISS_PX) {
            obs.nearMissed = true;
            player.score += CONFIG.NEAR_MISS_POINTS;
            playNearMissSound();
        }
    }
    return false;
}