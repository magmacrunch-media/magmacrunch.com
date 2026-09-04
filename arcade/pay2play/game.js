// ═══════════════════════════════════════════════════════════
// PIXEL ART SYMBOLS
// ═══════════════════════════════════════════════════════════

function createSymbolCanvas(drawFn) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    drawFn(ctx);
    return c.toDataURL();
}

function drawTelephone(ctx) {
    const pink='#ff00ff', dark='#cc00cc', light='#ff66ff';
    ctx.fillStyle=dark; ctx.fillRect(16,20,12,10);
    ctx.fillStyle=pink; ctx.fillRect(18,22,8,6);
    ctx.fillStyle=light; ctx.fillRect(20,23,3,3);
    ctx.fillStyle=dark;
    ctx.fillRect(26,28,4,4); ctx.fillRect(28,32,4,4); ctx.fillRect(30,36,4,4); ctx.fillRect(32,40,4,4); ctx.fillRect(34,44,4,4);
    ctx.fillStyle=pink;
    ctx.fillRect(27,30,2,2); ctx.fillRect(29,34,2,2); ctx.fillRect(31,38,2,2); ctx.fillRect(33,42,2,2);
    ctx.fillStyle=dark; ctx.fillRect(36,48,12,10);
    ctx.fillStyle=pink; ctx.fillRect(38,50,8,6);
    ctx.fillStyle=light; ctx.fillRect(41,51,3,3);
}

function drawCoin(ctx) {
    const coinPattern=[
        '   ██████████   ','  ████████████  ',' ██████████████ ',
        '████████████████','████  ████  ████','████   ██   ████',
        '████   ██   ████','████  ████  ████','████  ████  ████',
        '████   ██   ████','████   ██   ████','████  ████  ████',
        '████████████████',' ██████████████ ','  ████████████  ',
        '   ██████████   '
    ];
    const gold='#FFD700', dark='#DAA520', light='#FFED4E';
    const scale=3, pW=8, pH=16;
    const offX=(64-pW*scale)/2, offY=(64-pH*scale)/2;
    for (let y=0;y<coinPattern.length;y++) {
        const row=coinPattern[y];
        for (let x=0;x<row.length;x+=2) {
            if (row.slice(x,x+2)==='██') {
                const px2=x/2;
                ctx.fillStyle=(y<4||px2<4)?light:(y>11||px2>11)?dark:gold;
                ctx.fillRect(offX+px2*scale, offY+y*scale, scale, scale);
            }
        }
    }
    ctx.fillStyle='#FFF'; ctx.fillRect(offX+5*scale,offY+2*scale,scale,scale); ctx.fillRect(offX+6*scale,offY+3*scale,scale,scale);
}

function drawHeart(ctx) {
    const r='#ff0066', d='#cc0033', l='#ff3388';
    ctx.fillStyle=d;
    ctx.fillRect(20,20,8,8); ctx.fillRect(36,20,8,8); ctx.fillRect(16,28,32,8);
    ctx.fillRect(20,36,24,8); ctx.fillRect(24,44,16,4); ctx.fillRect(28,48,8,4); ctx.fillRect(30,52,4,4);
    ctx.fillStyle=r;
    ctx.fillRect(22,22,4,4); ctx.fillRect(38,22,4,4); ctx.fillRect(18,30,28,4);
    ctx.fillRect(22,38,20,4); ctx.fillRect(26,46,12,2); ctx.fillRect(30,50,4,2);
    ctx.fillStyle=l; ctx.fillRect(24,24,2,2); ctx.fillRect(40,24,2,2);
}

function drawBrokenHeart(ctx) {
    drawHeart(ctx);
    ctx.fillStyle='#000';
    ctx.fillRect(31,20,2,4); ctx.fillRect(29,24,2,4); ctx.fillRect(31,28,2,4);
    ctx.fillRect(33,32,2,4); ctx.fillRect(31,36,2,4); ctx.fillRect(29,40,2,4);
    ctx.fillRect(31,44,2,4); ctx.fillRect(32,48,2,4);
}

function drawLipstick(ctx) {
    ctx.fillStyle='#FFD700'; ctx.fillRect(24,44,16,12);
    ctx.fillStyle='#cc00cc'; ctx.fillRect(26,28,12,16);
    ctx.fillStyle='#ff00ff'; ctx.fillRect(28,30,8,12);
    ctx.fillStyle='#ff0066'; ctx.fillRect(28,16,8,12); ctx.fillRect(30,14,4,2); ctx.fillRect(31,12,2,2);
    ctx.fillStyle='#ff3388'; ctx.fillRect(30,18,2,4);
}

function drawCamera(ctx) {
    ctx.fillStyle='#0099aa'; ctx.fillRect(16,24,32,24);
    ctx.fillStyle='#00ffff'; ctx.fillRect(18,26,28,20);
    ctx.fillStyle='#000'; ctx.fillRect(24,30,16,16);
    ctx.fillStyle='#0099aa'; ctx.fillRect(28,34,8,8);
    ctx.fillStyle='#000'; ctx.fillRect(20,18,8,6);
    ctx.fillStyle='#66ffff'; ctx.fillRect(22,20,4,2);
    ctx.fillStyle='#ff0066'; ctx.fillRect(40,28,4,4);
    ctx.fillStyle='#66ffff'; ctx.fillRect(30,36,2,2);
}

function drawFloppyDisk(ctx) {
    ctx.fillStyle='#333'; ctx.fillRect(16,14,32,36);
    ctx.fillStyle='#ccc'; ctx.fillRect(18,16,28,10);
    ctx.fillStyle='#999'; ctx.fillRect(20,18,24,6);
    ctx.fillStyle='#666';
    [22,26,30,34,38].forEach(x => ctx.fillRect(x,20,1,4));
    ctx.fillStyle='#666'; ctx.fillRect(20,28,24,16);
    ctx.fillStyle='#999'; ctx.fillRect(22,30,20,12);
    ctx.fillStyle='#00ffff';
    ctx.fillRect(24,32,16,2); ctx.fillRect(24,36,12,2); ctx.fillRect(24,40,14,2);
    ctx.fillStyle='#000'; ctx.fillRect(42,46,4,4); ctx.fillRect(30,50,4,4);
}

function drawEye(ctx) {
    ctx.fillStyle='#fff'; ctx.fillRect(20,28,24,12);
    ctx.fillStyle='#000';
    ctx.fillRect(18,30,2,8); ctx.fillRect(44,30,2,8); ctx.fillRect(20,26,24,2); ctx.fillRect(20,40,24,2);
    ctx.fillStyle='#00ffff'; ctx.fillRect(28,30,8,8);
    ctx.fillStyle='#000'; ctx.fillRect(30,32,4,4);
    ctx.fillStyle='#fff'; ctx.fillRect(31,33,2,2);
    ctx.fillStyle='#ff00ff'; ctx.fillRect(22,24,2,2); ctx.fillRect(40,24,2,2);
}

const symbolImages = {
    lipstick:   createSymbolCanvas(drawLipstick),
    telephone:  createSymbolCanvas(drawTelephone),
    coin:       createSymbolCanvas(drawCoin),
    camera:     createSymbolCanvas(drawCamera),
    brokenHeart:createSymbolCanvas(drawBrokenHeart),
    eye:        createSymbolCanvas(drawEye),
    heart:      createSymbolCanvas(drawHeart),
    floppyDisk: createSymbolCanvas(drawFloppyDisk),
};


// ═══════════════════════════════════════════════════════════
// GRAPHICS (cabinet, bezel, lever, coin sprite)
// ═══════════════════════════════════════════════════════════

const P = {
    bodyDark:'#1a0a2e', bodyMid:'#2d1b4e', bodyLight:'#4a2d7a', bodyHighlight:'#6644aa',
    trimDark:'#660066', trimMid:'#cc00cc', trimBright:'#ff00ff',
    cyanDark:'#007788', cyanMid:'#00bbcc', cyanBright:'#00ffff',
    black:'#000000', darkGray:'#111122', midGray:'#334455', lightGray:'#556677', white:'#ffffff', gold:'#ffdd44',
};

function px(ctx,color,x,y,w,h){ ctx.fillStyle=color; ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h)); }

function drawSpeakerGrille(ctx,x,y,w,h){
    for(let r=y+4;r<y+h-4;r+=5) for(let c=x+4;c<x+w-4;c+=5){
        px(ctx,P.black,c,r,3,3); px(ctx,P.midGray,c,r,1,1);
    }
}

function drawBevelPanel(ctx,x,y,w,h,d=4){
    px(ctx,P.bodyLight,x,y,w,h);
    px(ctx,P.bodyHighlight,x,y,w,d); px(ctx,P.bodyHighlight,x,y,d,h);
    px(ctx,P.bodyDark,x,y+h-d,w,d); px(ctx,P.bodyDark,x+w-d,y,d,h);
    px(ctx,P.white,x,y,d,d); px(ctx,P.black,x+w-d,y+h-d,d,d);
}

function drawVentStrip(ctx,x,y,w,h){
    px(ctx,P.bodyDark,x,y,w,h);
    for(let i=0;i<w;i+=6){
        px(ctx,P.midGray,x+i,y+1,3,1); px(ctx,P.black,x+i,y+2,3,1); px(ctx,P.lightGray,x+i+1,y+1,1,1);
    }
}

function drawCoinSlot(ctx,cx,y){
    const sW=28,sH=6,x=cx-sW/2;
    px(ctx,P.black,x-1,y-1,sW+2,sH+2); px(ctx,P.darkGray,x,y,sW,sH); px(ctx,P.midGray,x+1,y,sW-2,1);
    px(ctx,P.cyanBright,x-6,y+1,3,3); px(ctx,P.cyanBright,x+sW+3,y+1,3,3);
}

function drawLeverOnCanvas(ctx,lx,ly,isPulled){
    const S=2;
    // bracket
    px(ctx,'#2a0a3e',lx+6*S,ly+88*S,28*S,14*S); px(ctx,'#3a1a5e',lx+7*S,ly+89*S,26*S,12*S);
    px(ctx,'#5a2a8e',lx+8*S,ly+90*S,24*S,3*S);
    [[8,90],[30,90],[8,98],[30,98]].forEach(([ox,oy])=>{
        px(ctx,'#1a0a2e',lx+ox*S,ly+oy*S,4*S,4*S);
        px(ctx,'#4a2d7a',lx+(ox+1)*S,ly+(oy+1)*S,2*S,2*S);
        px(ctx,P.white,lx+(ox+1)*S,ly+(oy+1)*S,1,1);
    });
    // arm
    if(isPulled){
        for(let i=0;i<8;i++){
            px(ctx,'#660066',lx+(18+i*1.2)*S,ly+(20+i*9)*S,4*S,6*S);
            px(ctx,'#990099',lx+(19+i*1.2)*S,ly+(20+i*9)*S,2*S,6*S);
        }
    } else {
        px(ctx,'#660066',lx+18*S,ly+20*S,4*S,70*S);
        px(ctx,'#990099',lx+19*S,ly+20*S,2*S,70*S);
    }
    // ball
    const ballY=isPulled?ly+4*S:ly+6*S, ballX=isPulled?lx+18*S:lx+8*S;
    px(ctx,'#440044',ballX+1*S,ballY+10*S,18*S,2*S); px(ctx,'#440044',ballX-1*S,ballY+2*S,22*S,8*S); px(ctx,'#440044',ballX+1*S,ballY,18*S,2*S);
    px(ctx,'#cc00cc',ballX+2*S,ballY+10*S,16*S,2*S); px(ctx,'#cc00cc',ballX,ballY+2*S,20*S,8*S); px(ctx,'#cc00cc',ballX+2*S,ballY,16*S,2*S);
    px(ctx,'#ff00ff',ballX+3*S,ballY+1*S,14*S,8*S); px(ctx,'#ff00ff',ballX+5*S,ballY,10*S,1*S); px(ctx,'#ff00ff',ballX+5*S,ballY+9*S,10*S,1*S);
    px(ctx,'#ff66ff',ballX+5*S,ballY+2*S,8*S,3*S); px(ctx,P.white,ballX+6*S,ballY+2*S,3,1);
    // base
    px(ctx,'#440044',lx+8*S,ly+90*S,24*S,8*S); px(ctx,'#660066',lx+9*S,ly+91*S,22*S,6*S); px(ctx,'#ff00ff',lx+10*S,ly+92*S,20*S,2*S);
    ctx.save(); ctx.shadowColor='#ff00ff'; ctx.shadowBlur=8; ctx.strokeStyle='#cc00cc'; ctx.lineWidth=1;
    ctx.strokeRect(lx+8*S,ly+90*S,24*S,8*S); ctx.restore();
    // PULL label
    ctx.save(); ctx.fillStyle='#ff00ff'; ctx.font='10px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.shadowColor='#ff00ff'; ctx.shadowBlur=6; ctx.fillText('PULL',lx+20*S,ly+4*S); ctx.shadowBlur=0; ctx.restore();
}

function drawOuterFrame(){
    const canvas=document.getElementById('outer-frame-canvas');
    const ctx=canvas.getContext('2d');
    const rect=canvas.parentElement.getBoundingClientRect();
    if(rect.width>0&&rect.height>0){ canvas.width=rect.width; canvas.height=rect.height; }
    const W=canvas.width, H=canvas.height;
    ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,W,H);
    const STEP=8, STEPS=6;
    const SL=6, SR=W-6, ST=6, SB=H-6;
    const archBaseY=ST+STEPS*STEP, baseH=44, baseExtraW=12, baseY=SB-baseH;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(SL-baseExtraW+16,SB); ctx.lineTo(SL-baseExtraW,SB-16); ctx.lineTo(SL-baseExtraW,baseY); ctx.lineTo(SL,baseY); ctx.lineTo(SL,archBaseY);
    for(let i=0;i<STEPS;i++){ ctx.lineTo(SL+i*STEP,archBaseY-i*STEP); ctx.lineTo(SL+(i+1)*STEP,archBaseY-i*STEP); }
    ctx.lineTo(SL+STEPS*STEP,ST); ctx.lineTo(SR-STEPS*STEP,ST);
    for(let i=STEPS-1;i>=0;i--){ ctx.lineTo(SR-(i+1)*STEP,archBaseY-i*STEP); ctx.lineTo(SR-i*STEP,archBaseY-i*STEP); }
    ctx.lineTo(SR,archBaseY); ctx.lineTo(SR,baseY); ctx.lineTo(SR+baseExtraW,baseY); ctx.lineTo(SR+baseExtraW,SB-16); ctx.lineTo(SR+baseExtraW-16,SB); ctx.closePath();
    ctx.fillStyle=P.bodyMid; ctx.fill(); ctx.clip();
    // shading bands
    const bW=Math.ceil(W/10);
    [P.bodyHighlight,P.bodyLight,P.bodyMid,P.bodyMid,P.bodyMid,P.bodyMid,P.bodyMid,P.bodyMid,P.bodyLight,P.bodyDark].forEach((c,i)=>px(ctx,c,i*bW,0,bW+1,H));
    const archW=SR-SL-STEPS*STEP*2;
    px(ctx,P.bodyDark,SL+STEPS*STEP,ST,archW,archBaseY-ST+20);
    // arch neon steps
    for(let i=0;i<STEPS;i++){
        const x1=SL+i*STEP, x2=SR-(i+1)*STEP, y=archBaseY-i*STEP;
        px(ctx,P.trimBright,x1,y,STEP,3); px(ctx,P.trimBright,x2,y,STEP,3);
        if(STEP>4){ px(ctx,P.cyanBright,x1+4,y+3,STEP-4,2); px(ctx,P.cyanBright,x2+4,y+3,STEP-4,2); }
    }
    px(ctx,P.trimBright,SL+STEPS*STEP,ST,archW,3); px(ctx,P.cyanBright,SL+STEPS*STEP,ST+3,archW,2);
    px(ctx,P.trimBright,SL,archBaseY+18,W-SL*2,3); px(ctx,P.trimMid,SL,archBaseY+21,W-SL*2,2); px(ctx,P.cyanBright,SL,archBaseY+23,W-SL*2,2);
    // speakers
    const spW=38,spH=58,spY=ST+8;
    drawBevelPanel(ctx,SL+STEPS*STEP+6,spY,spW,spH,3); drawSpeakerGrille(ctx,SL+STEPS*STEP+6,spY,spW,spH);
    drawBevelPanel(ctx,SR-STEPS*STEP-spW-6,spY,spW,spH,3); drawSpeakerGrille(ctx,SR-STEPS*STEP-spW-6,spY,spW,spH);
    // side stripes
    const stripeTop=archBaseY+28, stripeH=baseY-stripeTop-10;
    [[SL+6,P.trimBright,4],[SL+14,P.cyanBright,3],[SL+21,P.trimMid,2]].forEach(([x,c,w])=>{ px(ctx,c,x,stripeTop,w,stripeH); });
    [[SR-10,P.trimBright,4],[SR-17,P.cyanBright,3],[SR-23,P.trimMid,2]].forEach(([x,c,w])=>{ px(ctx,c,x,stripeTop,w,stripeH); });
    // side panels
    const pW2=36,pH2=110,pY2=archBaseY+30;
    px(ctx,'#0d0020',SL+28,pY2,pW2,pH2);
    px(ctx,P.trimBright,SL+28,pY2,pW2,2); px(ctx,P.trimBright,SL+28,pY2+pH2-2,pW2,2);
    px(ctx,P.trimBright,SL+28,pY2,2,pH2); px(ctx,P.trimBright,SL+28+pW2-2,pY2,2,pH2);
    ctx.save(); ctx.translate(SL+28+pW2/2,pY2+pH2/2); ctx.rotate(-Math.PI/2);
    ctx.fillStyle=P.trimBright; ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.shadowColor=P.trimBright; ctx.shadowBlur=5; ctx.fillText('PAY 2 PLAY',0,2); ctx.shadowBlur=0; ctx.restore();
    px(ctx,'#0d0020',SR-28-pW2,pY2,pW2,pH2);
    px(ctx,P.cyanBright,SR-28-pW2,pY2,pW2,2); px(ctx,P.cyanBright,SR-28-pW2,pY2+pH2-2,pW2,2);
    px(ctx,P.cyanBright,SR-28-pW2,pY2,2,pH2); px(ctx,P.cyanBright,SR-28-2,pY2,2,pH2);
    ctx.save(); ctx.translate(SR-28-pW2/2,pY2+pH2/2); ctx.rotate(Math.PI/2);
    ctx.fillStyle=P.cyanBright; ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.shadowColor=P.cyanBright; ctx.shadowBlur=5; ctx.fillText('1c A SPIN',0,2); ctx.shadowBlur=0; ctx.restore();
    // control panel
    const ctrlY=baseY-52, ctrlH=48;
    drawBevelPanel(ctx,SL+8,ctrlY,SR-SL-16,ctrlH,5);
    drawVentStrip(ctx,SL+18,ctrlY+8,SR-SL-36,10);
    drawCoinSlot(ctx,W/2,ctrlY+28);
    // coin tray
    const trayW=Math.round(W*0.55),trayH=14,trayX=Math.round((W-trayW)/2),trayY=ctrlY+ctrlH+4;
    px(ctx,P.black,trayX,trayY,trayW,trayH); px(ctx,P.darkGray,trayX+2,trayY+2,trayW-4,trayH-4);
    px(ctx,P.midGray,trayX+2,trayY+2,trayW-4,2); px(ctx,P.trimBright,trayX,trayY,trayW,2); px(ctx,P.cyanBright,trayX,trayY+2,trayW,1);
    // base
    drawBevelPanel(ctx,SL-baseExtraW,baseY,W-(SL-baseExtraW)*2+baseExtraW,baseH-6,6);
    px(ctx,P.trimBright,SL-baseExtraW,baseY,W+baseExtraW*2-12,3); px(ctx,P.cyanBright,SL-baseExtraW+2,baseY+4,W+baseExtraW*2-16,2);
    [[SL-baseExtraW+4,SB-16],[SR+baseExtraW-20,SB-16]].forEach(([fx,fy])=>{
        px(ctx,P.black,fx,fy,16,12); px(ctx,P.darkGray,fx+1,fy+1,14,10); px(ctx,P.midGray,fx+2,fy+2,6,3);
    });
    ctx.restore();
    // outer neon outline
    ctx.save();
    ctx.shadowColor=P.trimBright; ctx.shadowBlur=22; ctx.strokeStyle=P.trimBright; ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(SL-baseExtraW+16,SB); ctx.lineTo(SL-baseExtraW,SB-16); ctx.lineTo(SL-baseExtraW,baseY); ctx.lineTo(SL,baseY); ctx.lineTo(SL,archBaseY);
    for(let i=0;i<STEPS;i++){ ctx.lineTo(SL+i*STEP,archBaseY-i*STEP); ctx.lineTo(SL+(i+1)*STEP,archBaseY-i*STEP); }
    ctx.lineTo(SL+STEPS*STEP,ST); ctx.lineTo(SR-STEPS*STEP,ST);
    for(let i=STEPS-1;i>=0;i--){ ctx.lineTo(SR-(i+1)*STEP,archBaseY-i*STEP); ctx.lineTo(SR-i*STEP,archBaseY-i*STEP); }
    ctx.lineTo(SR,archBaseY); ctx.lineTo(SR,baseY); ctx.lineTo(SR+baseExtraW,baseY); ctx.lineTo(SR+baseExtraW,SB-16); ctx.lineTo(SR+baseExtraW-16,SB); ctx.closePath();
    ctx.stroke();
    ctx.shadowColor=P.cyanBright; ctx.shadowBlur=10; ctx.strokeStyle=P.cyanBright; ctx.lineWidth=1.5; ctx.stroke();
    ctx.shadowBlur=0; ctx.restore();
    // scanlines
    ctx.save(); ctx.globalAlpha=0.06; for(let y=0;y<H;y+=2) px(ctx,'#000000',0,y,W,1); ctx.restore();
}

let _leverPulled=false;

function drawMachineFrame(isPulled){
    if(isPulled!==undefined) _leverPulled=isPulled;
    const canvas=document.getElementById('machine-frame-canvas');
    const container=document.getElementById('slot-machine');
    const eL=20,eR=100,eT=20,eB=20;
    canvas.width=container.offsetWidth+eL+eR; canvas.height=container.offsetHeight+eT+eB;
    const ctx=canvas.getContext('2d');
    ctx.imageSmoothingEnabled=false; ctx.clearRect(0,0,canvas.width,canvas.height);
    const reelsEl=document.getElementById('reels-container');
    const mR=container.getBoundingClientRect(), rR=reelsEl.getBoundingClientRect();
    const PAD=14, sx=rR.left-mR.left-PAD+eL, sy=rR.top-mR.top-PAD+eT, sw=rR.width+PAD*2, sh=rR.height+PAD*2;
    const bW=14, bx=sx-bW, by=sy-bW, bw=sw+bW*2, bh=sh+bW*2;
    const bezelC=document.createElement('canvas');
    bezelC.width=canvas.width; bezelC.height=canvas.height;
    const bc=bezelC.getContext('2d');
    bc.imageSmoothingEnabled=false;
    px(bc,'#0a0010',bx-2,by-2,bw+4,bh+4); px(bc,'#3a1a5e',bx,by,bw,bh);
    px(bc,'#5a2a8e',bx,by,bw,bW); px(bc,'#4a1e78',bx,by,bW,bh);
    px(bc,'#150025',bx,by+bh-bW,bw,bW); px(bc,'#1e0038',bx+bw-bW,by,bW,bh);
    bc.globalCompositeOperation='destination-out'; bc.fillStyle='rgba(0,0,0,1)'; bc.fillRect(sx,sy,sw,sh);
    ctx.drawImage(bezelC,0,0);
    ctx.save();
    ctx.strokeStyle='#050008'; ctx.lineWidth=6; ctx.strokeRect(sx-.5,sy-.5,sw+1,sh+1);
    ctx.shadowColor='#ff00ff'; ctx.shadowBlur=12; ctx.strokeStyle='#cc00cc'; ctx.lineWidth=2; ctx.strokeRect(sx-4,sy-4,sw+8,sh+8);
    ctx.shadowColor='#00ffff'; ctx.shadowBlur=6; ctx.strokeStyle='#00bbcc'; ctx.lineWidth=1; ctx.strokeRect(sx-7,sy-7,sw+14,sh+14);
    ctx.restore();
    ctx.save(); ctx.globalAlpha=.10; for(let y=sy;y<sy+sh;y+=2){ ctx.fillStyle='#000'; ctx.fillRect(sx,y,sw,1); } ctx.restore();
    ctx.save();
    const vig=ctx.createRadialGradient(sx+sw/2,sy+sh/2,sh*.3,sx+sw/2,sy+sh/2,sh*.75);
    vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(.75,'rgba(0,0,0,0.05)'); vig.addColorStop(1,'rgba(0,0,0,0.40)');
    ctx.fillStyle=vig; ctx.fillRect(sx,sy,sw,sh); ctx.restore();
    ctx.save(); ctx.globalAlpha=.12;
    const glare=ctx.createLinearGradient(sx,sy,sx+sw*.5,sy+sh*.4);
    glare.addColorStop(0,'rgba(255,255,255,0.9)'); glare.addColorStop(.3,'rgba(255,255,255,0.2)'); glare.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=glare; ctx.fillRect(sx,sy,sw,sh);
    ctx.globalAlpha=.18; ctx.strokeStyle='#fff'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(sx+8,sy+3); ctx.lineTo(sx+sw*.5,sy+3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx+3,sy+8); ctx.lineTo(sx+3,sy+sh*.35); ctx.stroke();
    ctx.restore();
    const screwOff=Math.round(bW*.55);
    [[bx+screwOff,by+screwOff],[bx+bw-screwOff,by+screwOff],[bx+screwOff,by+bh-screwOff],[bx+bw-screwOff,by+bh-screwOff]].forEach(([cx2,cy2])=>{
        ctx.fillStyle='#1a0a2e'; ctx.beginPath(); ctx.arc(cx2,cy2,5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#4a2d7a'; ctx.beginPath(); ctx.arc(cx2,cy2,4,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#1a0a2e'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(cx2-3,cy2); ctx.lineTo(cx2+3,cy2); ctx.moveTo(cx2,cy2-3); ctx.lineTo(cx2,cy2+3); ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(cx2-2,cy2-2,1,1);
    });
    const plateW=84,plateH=11,plateX=Math.round(sx+sw/2-plateW/2),plateY=sy+sh+bW+4;
    px(ctx,'#0a0015',plateX,plateY,plateW,plateH); px(ctx,'#2a1044',plateX+1,plateY+1,plateW-2,plateH-2);
    ctx.fillStyle='#ff00ff'; ctx.font='6px "Press Start 2P",monospace'; ctx.textAlign='center';
    ctx.shadowColor='#ff00ff'; ctx.shadowBlur=4; ctx.fillText('PAY 2 PLAY',sx+sw/2,plateY+8); ctx.shadowBlur=0; ctx.textAlign='left';
    // lever
    const leverEl=document.getElementById('lever');
    const leverRect=leverEl.getBoundingClientRect();
    const leverX=leverRect.left-mR.left+eL;
    const leverY=leverRect.top-mR.top+eT-30;
    drawLeverOnCanvas(ctx,leverX,leverY,_leverPulled);
}

function createCoinSprite(){
    const c=document.createElement('canvas');
    c.width=c.height=16;
    const ctx=c.getContext('2d');
    const coinPattern=['   ██████████   ','  ████████████  ',' ██████████████ ','████████████████','████  ████  ████','████   ██   ████','████   ██   ████','████  ████  ████','████  ████  ████','████   ██   ████','████   ██   ████','████  ████  ████','████████████████',' ██████████████ ','  ████████████  ','   ██████████   '];
    const gold='#FFD700',dark='#DAA520',light='#FFED4E';
    for(let y=0;y<coinPattern.length;y++){
        const row=coinPattern[y];
        for(let x=0;x<row.length;x+=2){
            if(row.slice(x,x+2)==='██'){
                const p=x/2;
                ctx.fillStyle=(y<4||p<4)?light:(y>11||p>11)?dark:gold;
                ctx.fillRect(p,y,1,1);
            }
        }
    }
    ctx.fillStyle='#FFF'; ctx.fillRect(5,2,1,1); ctx.fillRect(6,3,1,1);
    return c.toDataURL();
}


// ═══════════════════════════════════════════════════════════
// GAME STATE & CONSTANTS
// ═══════════════════════════════════════════════════════════

const SYMBOLS = ['lipstick','telephone','coin','camera','brokenHeart','eye','heart','floppyDisk'];
const SPIN_COST = 1;       // 1¢ per spin
const JACKPOT_PAYOUT = 10; // 10¢ jackpot (need 10 jackpots to break even — rigged!)
const TWO_MATCH_PAYOUT = 2;
const CONSOLATION = 0;

const ATTENTION_DECAY = 2;     // attention lost per second once a result has landed
const DECAY_GRACE_MS = 1200;   // a beat to enjoy a result before interest starts to slide
const DECAY_DT_CAP = 0.25;     // largest frame delta honoured, in seconds (see decayTick)
const FADE_NOTICE_FLOOR = 40;  // below this, a decline is not worth remarking on
const ATTENTION_HIGH = 50;     // still hot when you walked away
const DEBT_DEEP = 10;          // cents; roughly fifty spins of drift at this edge

let coins = 0, attention = 0, spins = 0;
let attentionMark = 0;         // attention at the last result, for judging a decline against
let decayActive = false, decayLastFrame = 0, decayHoldUntil = 0;
let fadingNoted = false, goneNoted = false;
let isSpinning = false;
let reelStates = [true,true,true];
let reelIntervals = [null,null,null];
let reelResults = [null,null,null];

const MESSAGES = {
    allMatch: ["JACKPOT! Everyone's watching now...","You won! But what did you really win?","Triple match! The crowd goes wild!","Perfect! They love you right now.","Winner! Is this what you wanted?"],
    twoMatch: ["So close! Keep going...","Almost perfect! One more spin?","Not bad! They're interested...","Two out of three! That counts, right?","Getting there! Don't stop now..."],
    noMatch:  ["Nothing this time. Try again?","Keep playing... they're still watching.","No match. But you can do better.","Maybe next time...","Not quite. Pull again?"],
    debt:     ["In debt, but who's counting?","You can always earn it back..."],
    fading:   ["They're starting to look away...","You're losing them. Pull again?","The room is getting quieter..."],
    gone:     ["Nobody's watching anymore.","The room emptied while you stood there.","Attention: zero. Was it worth it?"]
};

const reels      = [document.getElementById('reel1'),document.getElementById('reel2'),document.getElementById('reel3')];
const stopBtns   = [document.getElementById('stop1'),document.getElementById('stop2'),document.getElementById('stop3')];
const lever      = document.getElementById('lever');
const messageEl  = document.getElementById('message');
const coinsEl    = document.getElementById('coins');
const attentionEl= document.getElementById('attention');
const attentionBox= document.getElementById('attention-display');
const spinsEl    = document.getElementById('spins');


// ═══════════════════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════════════════

function getRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function displaySymbol(reelEl, name){
    reelEl.textContent='';
    reelEl.style.backgroundImage=`url(${symbolImages[name]})`;
    reelEl.style.backgroundSize='contain';
    reelEl.style.backgroundRepeat='no-repeat';
    reelEl.style.backgroundPosition='center';
}

function updateStats(){
    const val=Math.abs(coins);
    coinsEl.textContent = coins<0 ? `-${val}¢` : `${val}¢`;
    document.getElementById('coins-display').classList.toggle('negative', coins<0);
    attentionEl.textContent = Math.floor(attention);
    attentionBox.classList.toggle('draining', isDraining());
    spinsEl.textContent = spins;
}

// ═══════════════════════════════════════════════════════════
// ATTENTION DECAY
// ═══════════════════════════════════════════════════════════
//
// Attention used to only ever climb, which made it a scoreboard rather than a
// stat: nothing was ever at stake in stopping. Now it drains in real time, so
// playing costs money and standing still costs the thing you are playing for,
// and the cash-out button has something to argue with. The clock runs during a
// spin too — waiting on the reels is not a refuge.

function isDraining(){
    return decayActive && attention>0 && performance.now()>=decayHoldUntil;
}

function startDecay(){
    if(decayActive) return;
    decayActive=true; decayLastFrame=0;
    requestAnimationFrame(decayTick);
}

function stopDecay(){ decayActive=false; }

function decayTick(now){
    if(!decayActive) return;
    if(!decayLastFrame) decayLastFrame=now;
    // Capped because a backgrounded tab stops firing rAF entirely: without this,
    // the first frame back settles up the whole absence at once and clears the
    // board. Being away is not the sin the game is about.
    const dt=Math.min((now-decayLastFrame)/1000, DECAY_DT_CAP);
    decayLastFrame=now;
    if(now>=decayHoldUntil && attention>0){
        const shown=Math.floor(attention);
        attention=Math.max(0, attention-ATTENTION_DECAY*dt);
        // Also fire on the landing at exactly zero: floor() reads 0 for everything
        // below 1, so the last step down would otherwise change nothing visible
        // and the room would empty without comment. The outer attention>0 guard
        // means this can only be true on the one frame that reaches it.
        if(Math.floor(attention)!==shown || attention===0){ updateStats(); noteFade(); }
    }
    requestAnimationFrame(decayTick);
}

// Said once per decline, not once per frame, and never over a live spin message.
function noteFade(){
    if(isSpinning) return;
    if(attention<=0){
        if(!goneNoted){ goneNoted=true; messageEl.textContent=getRandom(MESSAGES.gone); }
        return;
    }
    if(!fadingNoted && attentionMark>=FADE_NOTICE_FLOOR && attention<attentionMark*0.5){
        fadingNoted=true; messageEl.textContent=getRandom(MESSAGES.fading);
    }
}


function pullLever(){
    if(isSpinning) return;
    startDecay();
    coins -= SPIN_COST;
    updateStats();
    lever.classList.add('pulled');
    drawMachineFrame(true);
    setTimeout(()=>{ lever.classList.remove('pulled'); drawMachineFrame(false); }, 300);
    startSpin();
}

function startSpin(){
    isSpinning=true; spins++;
    reelStates=[true,true,true];
    reelResults=[getRandom(SYMBOLS),getRandom(SYMBOLS),getRandom(SYMBOLS)];
    messageEl.textContent='Spinning... Hit STOP for each reel!';
    reels.forEach((reel,i)=>{
        reel.classList.remove('stopped'); reel.classList.add('spinning');
        stopBtns[i].disabled=false;
        reelIntervals[i]=setInterval(()=>{ displaySymbol(reel,getRandom(SYMBOLS)); },100);
    });
}

function stopReel(i){
    if(!reelStates[i]) return;
    reelStates[i]=false;
    clearInterval(reelIntervals[i]);
    displaySymbol(reels[i],reelResults[i]);
    reels[i].classList.remove('spinning'); reels[i].classList.add('stopped');
    stopBtns[i].disabled=true;
    if(!reelStates[0]&&!reelStates[1]&&!reelStates[2]) setTimeout(()=>{ checkResults(); isSpinning=false; },300);
}

function checkResults(){
    const [r1,r2,r3]=reelResults;
    let payout=0, msgArr, attnGain=5;
    if(r1===r2&&r2===r3){       payout=JACKPOT_PAYOUT; attnGain=100; msgArr=MESSAGES.allMatch; }
    else if(r1===r2||r2===r3||r1===r3){ payout=TWO_MATCH_PAYOUT; attnGain=30; msgArr=MESSAGES.twoMatch; }
    else{                               payout=CONSOLATION;        attnGain=5;  msgArr=MESSAGES.noMatch; }
    coins+=payout; attention+=attnGain;
    attentionMark=attention; decayHoldUntil=performance.now()+DECAY_GRACE_MS;
    fadingNoted=false; goneNoted=false;
    let msg=getRandom(msgArr);
    if(payout>0) msg+=` +${payout}¢`;
    if(coins<0&&Math.random()<0.3) msg=getRandom(MESSAGES.debt);
    messageEl.textContent=msg;
    updateStats();
    if(payout===JACKPOT_PAYOUT){ document.getElementById('game-container').classList.add('flicker'); setTimeout(()=>document.getElementById('game-container').classList.remove('flicker'),500); }
}

// ═══════════════════════════════════════════════════════════
// END GAME / PRIZE
// ═══════════════════════════════════════════════════════════

// The ending is the two numbers you finished on, read as four corners: the
// attention you still had when you walked away, against what it cost you to
// keep it. It used to be a coin flip, which meant the stats on the card were
// decoration — you could play any way at all and get told the same thing.
//
// The two extremes are fixed art. Broke and adored is the song, so it gets the
// song. Broke and ignored gets the loss meme, which is the joke landing on you
// rather than for you. The two middling exits hand you a band member instead,
// chosen by spin count so a different session shows a different face without
// putting the ending itself back on a dice roll.

function portrait(){ return 1 + (spins % 4); }   // CHUCK, RHO, ELI, JAKE

function pickEnding(){
    const hot  = attention >= ATTENTION_HIGH;
    const deep = coins <= -DEBT_DEEP;
    if(hot && deep) return {
        prize: 0, title: 'PAY2PLAY',
        message: 'You bought every second of it. They watched right up to the moment you stopped paying.'
    };
    if(hot) return {
        prize: portrait(), title: 'CASHED OUT',
        message: 'You stopped while they were still looking. Hardly anybody does.'
    };
    if(deep) return {
        prize: 5, title: 'NOBODY WAS WATCHING',
        message: 'You paid for the room and performed to it empty.'
    };
    return {
        prize: portrait(), title: 'YOU BARELY PLAYED',
        message: 'A few cents in, a few cents gone. Nobody noticed either way.'
    };
}

function showPrize(){
    stopDecay();
    document.getElementById('final-spins').textContent   = spins;
    document.getElementById('final-attention').textContent = Math.floor(attention);
    const debtDollars = Math.abs(coins)/100;
    document.getElementById('final-debt').textContent = coins<0 ? `$${debtDollars.toFixed(2)}` : '$0.00';

    const ending = pickEnding();
    document.getElementById('prize-ascii-display').textContent = ASCII_PRIZES[ending.prize];
    document.getElementById('end-title').textContent = ending.title;
    document.getElementById('end-message-text').textContent = ending.message;

    document.getElementById('prize-modal').classList.add('active');
}


// ═══════════════════════════════════════════════════════════
// EVENTS
// ═══════════════════════════════════════════════════════════

lever.addEventListener('click', pullLever);
stopBtns.forEach((btn,i)=>btn.addEventListener('click',()=>stopReel(i)));
document.getElementById('cash-out-btn').addEventListener('click',()=>{ if(!isSpinning) showPrize(); });
document.getElementById('prize-close-btn').addEventListener('click',()=>{
    document.getElementById('prize-modal').classList.remove('active');
    coins=0; attention=0; spins=0;
    attentionMark=0; decayHoldUntil=0; fadingNoted=false; goneNoted=false;
    updateStats();
    messageEl.textContent='MAKE MORE MONEY GO OUT FOR THE WEEKEND';
    displaySymbol(reels[0],'lipstick');
    displaySymbol(reels[1],'telephone');
    displaySymbol(reels[2],'coin');
});

document.addEventListener('keydown', e=>{
    if(e.key===' '){ e.preventDefault(); if(isSpinning){ const next=reelStates.indexOf(true); if(next!==-1) stopReel(next); } }
    else if(e.key==='Enter'&&!isSpinning) pullLever();
    else if(e.key==='1'&&isSpinning) stopReel(0);
    else if(e.key==='2'&&isSpinning) stopReel(1);
    else if(e.key==='3'&&isSpinning) stopReel(2);
    else if(e.key==='Escape') { if(isSpinning){ messageEl.textContent='Wait for reels to stop...'; } else { showPrize(); } }
});


// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

updateStats();
drawOuterFrame();
drawMachineFrame(false);
document.getElementById('coin-icon').src = createCoinSprite();
displaySymbol(reels[0],'lipstick');
displaySymbol(reels[1],'telephone');
displaySymbol(reels[2],'coin');

window.addEventListener('resize', ()=>{
    drawOuterFrame();
    drawMachineFrame(false);
});
