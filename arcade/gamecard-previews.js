// ── GAME CARD PREVIEW SPRITES ──
// One-shot canvas drawings for each collection tile on the arcade index page

/* HIDDEN: crystal mirror maze preview
(function() {
    const c = document.getElementById('cMaze');
    if (!c) return;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#080818';
    ctx.fillRect(0, 0, 72, 72);

    const cx = 36, cy = 36, r = 20;

    // top face
    ctx.fillStyle = '#c45fff';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy - r / 2);
    ctx.lineTo(cx + r / 2, cy);
    ctx.lineTo(cx - r / 2, cy);
    ctx.lineTo(cx - r, cy - r / 2);
    ctx.closePath();
    ctx.fill();

    // right face
    ctx.fillStyle = '#8a30df';
    ctx.beginPath();
    ctx.moveTo(cx + r, cy - r / 2);
    ctx.lineTo(cx + r, cy + r / 2);
    ctx.lineTo(cx + r / 2, cy + r);
    ctx.lineTo(cx + r / 2, cy);
    ctx.closePath();
    ctx.fill();

    // left face
    ctx.fillStyle = '#ff3d6e';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r / 2);
    ctx.lineTo(cx - r, cy + r / 2);
    ctx.lineTo(cx - r / 2, cy + r);
    ctx.lineTo(cx - r / 2, cy);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // highlight edge
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy - r / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx - r, cy - r / 2);
    ctx.stroke();

    // reflection shimmer
    ctx.fillStyle = 'rgba(0, 245, 255, 0.3)';
    ctx.beginPath();
    ctx.moveTo(cx - r, cy - r / 2);
    ctx.lineTo(cx - r, cy + r / 2);
    ctx.lineTo(cx - r / 2, cy + r);
    ctx.lineTo(cx - r / 2, cy);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(26, 22, 2, 2);
})();
*/

/* HIDDEN: cPay2play — to return as downloadable collection
(function() {
    const c = document.getElementById('cPay2play');
    if (!c) return;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0a0808';
    ctx.fillRect(0, 0, 72, 72);

    // red telephone
    ctx.fillStyle = '#cc2020';
    ctx.fillRect(8, 10, 20, 28);
    ctx.fillStyle = '#aa1818';
    ctx.fillRect(10, 12, 16, 24);
    ctx.fillStyle = '#222';
    ctx.fillRect(12, 8, 12, 4);
    ctx.fillRect(8, 6, 4, 6);
    ctx.fillRect(24, 6, 4, 6);
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, 38);
    ctx.quadraticCurveTo(18, 48, 28, 52);
    ctx.stroke();

    // floppy disk
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(40, 14, 24, 24);
    ctx.fillStyle = '#333';
    ctx.fillRect(44, 16, 16, 10);
    ctx.fillStyle = '#ddd';
    ctx.fillRect(44, 28, 16, 8);
    ctx.fillStyle = '#555';
    ctx.fillRect(50, 16, 4, 6);

    // coins
    [[14, 56], [28, 58], [42, 54], [56, 57]].forEach(([x, y]) => {
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#DAA520';
        ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill();
    });

    ctx.fillStyle = '#ff2e9c';
    ctx.fillRect(4, 68, 64, 2);
})();
*/


// ── Board Games — checkerboard + two checkers pieces ──
(function() {
    const c = document.getElementById('cBoardGames');
    if (!c) return;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#00f5ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);

    const sq = 8;
    for (let r = 0; r < 8; r++) {
        for (let col = 0; col < 8; col++) {
            ctx.fillStyle = (r + col) % 2 === 1 ? '#1a0a2a' : '#2a1a3a';
            ctx.fillRect(4 + col * sq, 4 + r * sq, sq, sq);
        }
    }

    // light piece
    ctx.fillStyle = '#f0ece0';
    ctx.beginPath(); ctx.arc(16, 24, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8c0b0';
    ctx.beginPath(); ctx.arc(16, 24, 1.5, 0, Math.PI * 2); ctx.fill();

    // dark piece
    ctx.fillStyle = '#ff3d6e';
    ctx.beginPath(); ctx.arc(56, 48, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cc2050';
    ctx.beginPath(); ctx.arc(56, 48, 1.5, 0, Math.PI * 2); ctx.fill();
})();

// ── Card Games — fanned hand ──
(function() {
    const c = document.getElementById('cCardGames');
    if (!c) return;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#39ff6e';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);

    const cardW = 18, cardH = 26;
    const cards = [
        { x: 6,  suit: '\u2660', rank: 'A', color: '#0a1628' },
        { x: 18, suit: '\u2665', rank: 'K', color: '#ff3d6e' },
        { x: 30, suit: '\u2666', rank: 'Q', color: '#ff3d6e' },
        { x: 42, suit: '\u2663', rank: 'J', color: '#0a1628' },
    ];
    const startY = 10;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    cards.forEach(card => ctx.fillRect(card.x + 2, startY + 2, cardW, cardH));

    cards.forEach((card, i) => {
        ctx.fillStyle = '#f0ead8';
        ctx.fillRect(card.x, startY - i, cardW, cardH);
        ctx.strokeStyle = '#39ff6e';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(card.x + 1, startY - i + 1, cardW - 2, cardH - 2);
        ctx.fillStyle = card.color;
        ctx.font = "bold 5px 'Press Start 2P', monospace";
        ctx.textAlign = 'left';
        ctx.fillText(card.rank, card.x + 2, startY - i + 7);
        ctx.font = '6px serif';
        ctx.fillText(card.suit, card.x + 3, startY - i + 13);
        ctx.font = '10px serif';
        ctx.textAlign = 'center';
        ctx.fillText(card.suit, card.x + cardW / 2, startY - i + 22);
    });
})();

// ── Puzzles — question mark grid ──
(function() {
    const c = document.getElementById('cPuzzles');
    if (!c) return;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#ffe03a';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);

    const tiles = [
        { color: '#0a2a5a', text: '2' },
        { color: '#b0006a', text: '?' },
        { color: '#006a8a', text: '8' },
        { color: '#1a0a2a', text: '' },
    ];
    const cellSize = 32, gap = 2, boardPad = 4;
    tiles.forEach((t, i) => {
        const x = (i % 2) * cellSize + boardPad;
        const y = Math.floor(i / 2) * cellSize + boardPad;
        ctx.fillStyle = t.color;
        ctx.fillRect(x, y, cellSize - gap, cellSize - gap);
        if (t.text) {
            ctx.fillStyle = t.text === '?' ? '#ffe03a' : '#fff';
            ctx.font = "bold 10px 'Press Start 2P', monospace";
            ctx.textAlign = 'center';
            ctx.fillText(t.text, x + (cellSize - gap) / 2, y + (cellSize - gap) / 2 + 4);
        }
    });
})();

// ── Action — arcade joystick ──
(function() {
    const c = document.getElementById('cAction');
    if (!c) return;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#ff2e9c';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);

    // base
    ctx.fillStyle = '#1a1a2a';
    ctx.fillRect(20, 48, 32, 12);
    ctx.strokeStyle = '#ff2e9c';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 48, 32, 12);

    // buttons
    ctx.fillStyle = '#00f5ff';
    ctx.beginPath(); ctx.arc(30, 54, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe03a';
    ctx.beginPath(); ctx.arc(42, 54, 3, 0, Math.PI * 2); ctx.fill();

    // stick
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(35, 24, 2, 24);

    // ball top
    ctx.fillStyle = '#ff3d6e';
    ctx.beginPath(); ctx.arc(36, 20, 6, 0, Math.PI * 2); ctx.fill();

    // highlight
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillRect(33, 17, 2, 2);
})();

// ── Private — lock icon ──
(function() {
    const c = document.getElementById('cPrivate');
    if (!c) return;
    const ctx = c.getContext('2d');

    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, 72, 72);
    ctx.strokeStyle = '#ff3d6e';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 68, 68);

    // lock body
    ctx.fillStyle = '#1a0a1a';
    ctx.fillRect(22, 30, 28, 22);
    ctx.strokeStyle = '#ff3d6e';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(22, 30, 28, 22);

    // shackle
    ctx.beginPath();
    ctx.arc(36, 30, 10, Math.PI, 0);
    ctx.strokeStyle = '#ff3d6e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // keyhole
    ctx.fillStyle = '#ff3d6e';
    ctx.beginPath(); ctx.arc(36, 38, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(35, 38, 2, 8);
})();
