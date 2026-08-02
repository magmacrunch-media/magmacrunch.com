/* ══════════════════════════════════════════════════
   CHANNEL DATA — server-managed via tv-channels.js, hardcoded fallback
   ══════════════════════════════════════════════════ */
const CHANNELS = window.TV_CHANNELS || [
    { title: "Hologram of a Dream",                          artist: "Dag Henderson",           id: "mby4C5PZzlQ", year: "2025" },
    { title: "Sitting on a Dock in New Shoreham",            artist: "Juanito Thompson",        id: "BirxEyAj0u0", year: "2025" },
    { title: "Very Long Boards",                             artist: "Carl Spatski",            id: "8xjZgv3us1Q", year: "2025" },
    { title: "I'm gonna need more of a commitment than that",artist: "Juanito Thompson",        id: "KiFWHj1cmOY", year: "2025" },
    { title: "Leaves",                                       artist: "Juanito Thompson",        id: "wv_6z79fQjQ", year: "2024" },
    { title: "Summer Day",                                   artist: "Woah.",                   id: "QgJfLXhV15Y", year: "2024" },
    { title: "Gravitational Voltage",                        artist: "Juanito Thompson",        id: "gtclSfU8oDM", year: "2024" },
    { title: "Beach Ave.",                                   artist: "Juanito Thompson",        id: "tkpoCxpsUAk", year: "2024" },
    { title: "Who is Richard Parker?",                       artist: "Juanito Thompson",        id: "xGzuJO_5364", year: "2024" },
    { title: "Parade Float Electronics",                     artist: "Juanito Thompson",        id: "gjo9FdBJGRk", year: "2024" },
    { title: "Figure the Shoreline",                         artist: "Texas Hold'Em Lava Dome", id: "Gm9XVmj0iVM", year: "2024" },
    { title: "Point Judith",                                 artist: "Juanito Thompson",        id: "cCUC-a6v74E", year: "2024" },
    { title: "Eternity spent in an arcade",                  artist: "Woah.",                   id: "lTmHfMZAimQ", year: "2024" },
    { title: "Try",                                          artist: "Jon McCoy",               id: "To6AJJ7-iCY", year: "2024" },
    { title: "Contemplate the Plate Tectonic",               artist: "Texas Hold'Em Lava Dome", id: "YnzQh-h5zq0", year: "2024" },
    { title: "Area Does Not Exist",                          artist: "Dag Henderson",           id: "T6lCJBrjFQ0", year: "2024" },
    { title: "Daffodil & Sweet Pea",                         artist: "Juanito Thompson",        id: "0QwOELVzeSo", year: "2024" },
    { title: "Driving",                                      artist: "Woah.",                   id: "vmUJ2O3xwJw", year: "2024" },
    { title: "Ancient Weeds",                                artist: "Juanito Thompson",        id: "pX3G_dtyMPI", year: "2023" },
    { title: "Film School",                                  artist: "Texas Hold'Em Lava Dome", id: "VN_5u6tBPts", year: "2023" },
    { title: "Little Piece No. 1",                           artist: "James R. McCoy",          id: "hlOYgcDvyaE", year: "2023" },
    { title: "Millstone Woods May 2018",                     artist: "Dag Henderson",           id: "3_jo3WEOPEI", year: "2023" },
    { title: "Bus full of time-traveling twenty-somethings", artist: "Texas Hold'Em Lava Dome", id: "OebpP5m3jms", year: "2023" },
    { title: "Sex Van Floor Plan: The Documentary",          artist: "Allison Tocmo & Mariella Lionato", id: "VSGReUKVRjk", year: "2026" },
    { title: "Live at Governor's Mansion",                   artist: "DDT LLC",                 id: "XqGW6aaLrzQ", year: "2016" },
    { title: "balloon",                                      artist: "d.spum",                  id: "UOxY4pd_lUA", year: "2016" },
    { title: "bass flip?",                                   artist: "Vinny Bobarino",          id: "AltFN6bzMPo", year: "2006" },
];

/* ══════════════════════════════════════════════════
   STATE
   ══════════════════════════════════════════════════ */
let currentChannel = -1;
let isPaused = false;
let isPoweredOn = false;
let isSwitching = false;
let guideOpen = false;
let vuInterval = null;

const screen   = document.getElementById('tv-screen');
const staticCanvas = document.getElementById('static-canvas');
const staticCtx    = staticCanvas.getContext('2d');
const colorBars    = document.getElementById('color-bars');
const channelNum   = document.getElementById('channel-number');
const ambient      = document.getElementById('tv-ambient');
const powerLed     = document.getElementById('power-led');
const vuMeter      = document.getElementById('vu-meter');

/* ══════════════════════════════════════════════════
   STATIC NOISE
   ══════════════════════════════════════════════════ */
function resizeStaticCanvas() {
    const rect = screen.getBoundingClientRect();
    staticCanvas.width  = Math.floor(rect.width / 3);
    staticCanvas.height = Math.floor(rect.height / 3);
}
resizeStaticCanvas();
window.addEventListener('resize', resizeStaticCanvas);

let staticAnimFrame = null;
function drawStatic() {
    const w = staticCanvas.width, h = staticCanvas.height;
    const imgData = staticCtx.createImageData(w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const v = Math.random() * 255;
        data[i] = v;
        data[i+1] = v;
        data[i+2] = v;
        data[i+3] = 255;
    }
    staticCtx.putImageData(imgData, 0, 0);
    staticAnimFrame = requestAnimationFrame(drawStatic);
}

function startStatic() {
    staticCanvas.classList.add('active');
    drawStatic();
}
function stopStatic() {
    staticCanvas.classList.remove('active');
    if (staticAnimFrame) {
        cancelAnimationFrame(staticAnimFrame);
        staticAnimFrame = null;
    }
}

/* ══════════════════════════════════════════════════
   VU METER
   ══════════════════════════════════════════════════ */
function startVuMeter() {
    const bars = vuMeter.querySelectorAll('.vu-bar');
    vuInterval = setInterval(() => {
        bars.forEach(bar => {
            const h = 3 + Math.random() * 11;
            bar.style.height = h + 'px';
            bar.classList.toggle('active', h > 7);
        });
    }, 120);
}
function stopVuMeter() {
    clearInterval(vuInterval);
    vuMeter.querySelectorAll('.vu-bar').forEach(bar => {
        bar.style.height = '4px';
        bar.classList.remove('active');
    });
}

/* ─── ON-SCREEN TITLE OVERLAY ─── */
let onScreenTimeout = null;
function showOnScreenInfo(chNum, title, artist) {
    const overlay = document.getElementById('tv-screen-overlay');
    document.getElementById('tv-on-screen-ch').textContent = String(chNum).padStart(2, '0');
    document.getElementById('tv-on-screen-title').textContent = title;
    document.getElementById('tv-on-screen-artist').textContent = artist;
    overlay.classList.add('visible');
    clearTimeout(onScreenTimeout);
    onScreenTimeout = setTimeout(() => overlay.classList.remove('visible'), 3000);
}
function hideOnScreenInfo() {
    clearTimeout(onScreenTimeout);
    document.getElementById('tv-screen-overlay').classList.remove('visible');
}

/* ══════════════════════════════════════════════════
   YOUTUBE VIDEO — static iframe, src swap
   ══════════════════════════════════════════════════ */
const playerFrame = document.getElementById('yt-player');

function loadVideo(videoId) {
    playerFrame.style.opacity = '0';
    playerFrame.src = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1&rel=0&iv_load_policy=3&modestbranding=1&enablejsapi=1&controls=0&showinfo=0';
    isPaused = false;
    const icon = document.getElementById('pp-icon');
    const label = document.querySelector('#btn-playpause .knob-label');
    if (icon) icon.innerHTML = '&#9646;&#9646;';
    if (label) label.textContent = 'PAUSE';
    setTimeout(() => { playerFrame.style.opacity = '1'; }, 300);
}

function unloadVideo() {
    playerFrame.style.opacity = '0';
    playerFrame.src = 'about:blank';
}

function postYTCommand(func) {
    if (playerFrame && playerFrame.contentWindow) {
        playerFrame.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: '' }), '*');
    }
}

/* ══════════════════════════════════════════════════
   CHANNEL SWITCHING
   ══════════════════════════════════════════════════ */
function changeChannel(dir) {
    if (isSwitching || !isPoweredOn) return;
    isSwitching = true;

    // Pick a random channel (avoid repeating the current one)
    let next;
    if (CHANNELS.length <= 1) {
        next = 0;
    } else {
        do { next = Math.floor(Math.random() * CHANNELS.length); } while (next === currentChannel);
    }
    currentChannel = next;

    const ch = CHANNELS[currentChannel];

    // Phase 1: flicker + static
    screen.classList.add('flicker');
    startStatic();
    stopVuMeter();
    hideOnScreenInfo();

    setTimeout(() => {
        // Phase 2: color bars flash
        stopStatic();
        colorBars.classList.add('active');

        // Update channel number
        channelNum.textContent = String(currentChannel + 1).padStart(2, '0');

        setTimeout(() => {
            // Phase 3: load new video
            colorBars.classList.remove('active');
            loadVideo(ch.id);

            // Phase 4: settle
            screen.classList.remove('off', 'flicker');
            screen.classList.add('on-air');
            showOnScreenInfo(currentChannel + 1, ch.title, ch.artist);
            startVuMeter();

            isSwitching = false;
        }, 200);
    }, 350);
}

function togglePower() {
    if (isSwitching) return;

    if (isPoweredOn) {
        // Turn off
        isSwitching = true;
        screen.classList.add('turn-off');
        stopStatic();
        stopVuMeter();
        hideOnScreenInfo();
        powerLed.style.opacity = '0.2';

        setTimeout(() => {
            screen.classList.remove('on-air', 'turn-off');
            screen.classList.add('off');
            channelNum.textContent = '--';
            currentChannel = -1;
            isPoweredOn = false;
            isSwitching = false;
            ambient.classList.remove('on');
            unloadVideo();
        }, 400);
    } else {
        // Turn on
        isPoweredOn = true;
        isSwitching = true;
        screen.classList.remove('off');
        screen.classList.add('turn-on', 'on-air');
        powerLed.style.opacity = '1';
        ambient.classList.add('on');

        // Show static briefly
        startStatic();

        setTimeout(() => {
            stopStatic();
            currentChannel = Math.floor(Math.random() * CHANNELS.length);
            const ch = CHANNELS[currentChannel];
            channelNum.textContent = String(currentChannel + 1).padStart(2, '0');

            loadVideo(ch.id);

            screen.classList.remove('turn-on');
            showOnScreenInfo(1, ch.title, ch.artist);
            startVuMeter();
            isSwitching = false;
        }, 700);
    }
}

/* ══════════════════════════════════════════════════
   TV GUIDE
   ══════════════════════════════════════════════════ */
function escGuide(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function toggleGuide() {
    if (!isPoweredOn) return;
    const guide = document.getElementById('tv-guide');
    guideOpen = !guideOpen;
    guide.classList.toggle('hidden', !guideOpen);
    if (guideOpen) {
        renderGuide();
        screen.classList.add('guide-open');
        stopVuMeter();
    } else {
        screen.classList.remove('guide-open');
        if (currentChannel >= 0) startVuMeter();
    }
}

function renderGuide() {
    const list = document.getElementById('tv-guide-scroll');
    list.innerHTML = '';
    CHANNELS.forEach((ch, i) => {
        const row = document.createElement('div');
        row.className = 'guide-channel' + (i === currentChannel ? ' active' : '');
        row.innerHTML =
            '<div class="guide-ch-num">' + String(i + 1).padStart(2, '0') + '</div>' +
            '<div class="guide-ch-info">' +
                '<div class="guide-ch-title">' + escGuide(ch.title) + '</div>' +
                '<div class="guide-ch-artist">' + escGuide(ch.artist) + ' · ' + escGuide(ch.year) + '</div>' +
            '</div>';
        row.addEventListener('click', function() {
            currentChannel = i;
            guideOpen = false;
            document.getElementById('tv-guide').classList.add('hidden');
            screen.classList.remove('guide-open');
            screen.classList.add('flicker');
            startStatic();
            setTimeout(() => {
                stopStatic();
                loadVideo(ch.id);
                channelNum.textContent = String(i + 1).padStart(2, '0');
                showOnScreenInfo(i + 1, ch.title, ch.artist);
                screen.classList.remove('flicker');
                screen.classList.add('on-air');
                startVuMeter();
            }, 300);
        });
        list.appendChild(row);
    });
    const active = list.querySelector('.active');
    if (active) active.scrollIntoView({ block: 'center' });
}

/* ══════════════════════════════════════════════════
   CONTROLS
   ══════════════════════════════════════════════════ */
function togglePlayPause() {
    if (!isPoweredOn || currentChannel < 0) return;
    const icon = document.getElementById('pp-icon');
    const label = document.querySelector('#btn-playpause .knob-label');
    if (isPaused) {
        postYTCommand('playVideo');
        isPaused = false;
        icon.innerHTML = '&#9646;&#9646;';
        label.textContent = 'PAUSE';
    } else {
        postYTCommand('pauseVideo');
        isPaused = true;
        icon.innerHTML = '&#9654;';
        label.textContent = 'PLAY';
    }
}

document.getElementById('btn-ch-up').addEventListener('click', () => changeChannel(1));
document.getElementById('btn-ch-down').addEventListener('click', () => changeChannel(-1));
document.getElementById('btn-power').addEventListener('click', togglePower);
document.getElementById('btn-playpause').addEventListener('click', togglePlayPause);
document.getElementById('btn-guide').addEventListener('click', toggleGuide);
document.getElementById('guide-close-btn').addEventListener('click', toggleGuide);

/* ══════════════════════════════════════════════════
   KEYBOARD CONTROLS
   ══════════════════════════════════════════════════ */
const tvAbort = new AbortController();

document.addEventListener('keydown', function(e) {
    // Ignore if focused on an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
        case 'ArrowUp':
        case 'ArrowRight':
            e.preventDefault();
            if (guideOpen) {
                document.getElementById('tv-guide-scroll').scrollBy(0, -40);
            } else {
                changeChannel(1);
            }
            break;
        case 'ArrowDown':
        case 'ArrowLeft':
            e.preventDefault();
            if (guideOpen) {
                document.getElementById('tv-guide-scroll').scrollBy(0, 40);
            } else {
                changeChannel(-1);
            }
            break;
        case 'g':
        case 'G':
            e.preventDefault();
            toggleGuide();
            break;
        case ' ':
            e.preventDefault();
            if (isPoweredOn && currentChannel >= 0) {
                togglePlayPause();
            }
            break;
        case 'm':
        case 'M':
            break;
    }
}, { signal: tvAbort.signal });

/* ══════════════════════════════════════════════════
   ROTATE PROMPT — orientation detection
   ══════════════════════════════════════════════════ */
const rotatePrompt = document.getElementById('rotate-prompt');
const rotateDismiss = document.getElementById('rotate-dismiss');
let rotateDismissed = false;

if (rotateDismiss) {
    rotateDismiss.addEventListener('click', function() {
        rotateDismissed = true;
        rotatePrompt.style.display = 'none';
        document.querySelector('.tv-wrap').style.display = '';
        document.querySelector('.page-subtitle').style.display = '';
    });
}

const portraitMQL = window.matchMedia('(max-width: 640px) and (orientation: portrait)');
function handleOrientation(e) {
    if (rotateDismissed) return;
    if (e.matches) {
        rotatePrompt.style.display = '';
        document.querySelector('.tv-wrap').style.display = 'none';
        document.querySelector('.page-subtitle').style.display = 'none';
    } else {
        rotatePrompt.style.display = 'none';
        document.querySelector('.tv-wrap').style.display = '';
        document.querySelector('.page-subtitle').style.display = '';
    }
}
portraitMQL.addEventListener('change', handleOrientation);
handleOrientation(portraitMQL);

/* ══════════════════════════════════════════════════
   TOUCH SUPPORT — swipe to change channel
   ══════════════════════════════════════════════════ */
let touchStartY = 0;
screen.addEventListener('touchstart', function(e) {
    touchStartY = e.touches[0].clientY;
}, { passive: true });
screen.addEventListener('touchend', function(e) {
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dy) > 40) {
        changeChannel(dy < 0 ? 1 : -1);
    }
}, { passive: true });

/* ══════════════════════════════════════════════════
   CLEANUP — prevent resource leaks on SPA navigation
   ══════════════════════════════════════════════════ */
window.__pageCleanup = function() {
    stopStatic();
    stopVuMeter();
    clearTimeout(onScreenTimeout);
    cancelAnimationFrame(staticAnimFrame);
    window.removeEventListener('resize', resizeStaticCanvas);
    portraitMQL.removeEventListener('change', handleOrientation);
    tvAbort.abort();
    unloadVideo();
};
