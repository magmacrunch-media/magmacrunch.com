/* ═══════════════════════════════════════════════
   magmacrunch media — lyrics page template
   templates/artist-lyrics.js

   The stub HTML file provides all static structure
   (nav, main skeleton, footer). This script handles:
     1. Injecting page-specific styles (accent color)
     2. Populating dynamic stub elements (breadcrumb,
        sub-nav, artist label)
     3. Rendering song list from lyricsMap

   Requires window.ARTIST_CONFIG (defined in stub) = {
     id:        string   — MusicBrainz artist ID
     name:      string   — full artist name
     abbr:      string   — short label (e.g. "JHM")
     accent:    string   — CSS var name without --
     backColor: string   — nav-card class for ← back
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
     lyricsMap: object   — { 'song title': 'file.html' }
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.ARTIST_CONFIG;
    if (!C) { console.error('artist-lyrics.js: window.ARTIST_CONFIG is not defined'); return; }

    const d         = C.depth      || '../../../';
    const accent    = C.accent     || 'yellow';
    const lyricsMap = C.lyricsMap  || {};

    const COLOR_MAP = {
        about:       'c-about',
        links:       'c-links',
        photography: 'c-photography',
        events:      'c-events',
        recordings:  'c-recordings',
        releases:    'c-releases',
        works:       'c-works',
        lyrics:      'c-lyrics',
        'music-videos': 'c-music-videos',
        games:       'c-green',
        documentary: 'c-documentary',
        network:     'c-teal',
    };

    const BACK_COLOR_VAR = {
        'c-green':  'var(--green)',
        'c-cyan':   'var(--cyan)',
        'c-rose':   'var(--rose)',
        'c-yellow': 'var(--yellow)',
        'c-orange': 'var(--orange)',
        'c-purple': 'var(--purple)',
        'c-slate':  'var(--slate)',
        'c-blue':   'var(--blue)',
        'c-magenta':'var(--magenta)',
        'c-darkgreen': 'var(--darkgreen)',
        'c-teal':   'var(--jt-teal)',
        'c-brick':  'var(--jt-brick)',
        'c-deep':   'var(--jt-deep)',
        'c-gold':   'var(--jt-gold)',
        'c-sky':    'var(--jt-steel)',
        'c-jm-rose': 'var(--jm-rose)',
    };
    const backColorVar = BACK_COLOR_VAR[C.backColor] || 'var(--orange)';

    const ACCENT_RGB = {
        green:  '57,255,110',
        cyan:   '0,245,255',
        rose:   '255,61,110',
        yellow: '255,224,58',
        orange: '255,124,31',
        purple: '196,95,255',
        slate:  '136,153,170',
        blue:   '70,120,255',
        magenta:'255,45,120',
        teal:   '26,122,94',
        brick:  '168,72,48',
        deep:   '122,48,16',
        gold:   '245,200,66',
        sky:    '96,104,120',
        'jm-muted-rose': '200,168,168',
        'jm-deep-warm':  '120,96,80',
        'jm-deep-sage':  '88,120,104',
        'jm-taupe':      '168,152,128',
        'cpr-blue':      '104,200,240',
        'cpr-red':       '240,90,90',
        'cpr-orange':    '240,152,72',
        'svfp-cta':      '224,48,112',
        'svfp-bridge':   '200,160,216',
        'svfp-glow':     '240,184,144',
        'thld-highlight':'240,192,96',
        'thld-honey':    '176,112,48',
    };
    const accentRgb = ACCENT_RGB[accent] || '255,224,58';
    const accentVar = `var(--${accent})`;

    // ── 1. INJECT PAGE-SPECIFIC STYLES ──
    const style = document.createElement('style');
    style.textContent = `
        .breadcrumb a { color: var(--dim); text-decoration: none; transition: color 0.15s; }
        .breadcrumb a:hover { color: ${accentVar}; }
        .breadcrumb .sep { margin: 0 8px; color: ${accentVar}; opacity: 0.7; }
        .breadcrumb .current { color: ${accentVar}; }

        .page-header { width: 100%; max-width: 960px; margin-bottom: 32px; animation: fadeUp 0.5s ease both; }
        .artist-label { font-family: 'Press Start 2P', monospace; font-size: 10px; color: ${backColorVar}; letter-spacing: 0.2em; margin-bottom: 8px; opacity: 0.8; }
        .page-title { font-family: 'Press Start 2P', monospace; font-size: clamp(12px, 2.5vw, 20px); color: ${accentVar}; letter-spacing: 0.08em; line-height: 1.6; margin-bottom: 20px; text-shadow: 0 0 20px rgba(${accentRgb},0.45); }
    `;
    document.head.appendChild(style);

    // ── 2. POPULATE DYNAMIC STUB ELEMENTS ──

    const breadcrumbEl = document.querySelector('.breadcrumb');
    if (breadcrumbEl) {
        breadcrumbEl.innerHTML = `
            <a href="${d}archive/">archive</a>
            <span class="sep">›</span>
            <a href="${d}archive/by-artist/">by artist</a>
            <span class="sep">›</span>
            <a href="./">${C.abbr.toLowerCase()}</a>
        `;
    }

    const artistLabelEl = document.getElementById('artist-label');
    if (artistLabelEl) artistLabelEl.textContent = `// ${C.name} //`;

    const subNavEl = document.getElementById('sub-nav');
    if (subNavEl) {
        subNavEl.innerHTML = [
            `<a href="./" class="nav-card c-back">← back</a>`,
            ...(C.siblings || []).filter(s => s !== 'lyrics').map(s => {
                const label = s.replace(/-/g, ' ');
                return `<a href="${s}.html" class="nav-card ${COLOR_MAP[s] || 'c-cyan'}">${label}</a>`;
            })
        ].join('\n');
    }

    // ── 3. RENDER SONG LIST ──
    const listEl = document.getElementById('lyrics-list');
    if (listEl) {
        const entries = Object.entries(lyricsMap);
        if (entries.length === 0) {
            listEl.innerHTML = '<p style="font-family:\'Press Start 2P\',monospace;font-size:8px;color:var(--dim);letter-spacing:0.1em;">no lyrics available yet.</p>';
        } else {
            listEl.innerHTML = entries.map(([title, file]) => `
                <a href="lyrics/${file}" class="piece-card">
                    <div class="piece-card-info">
                        <div class="piece-card-text">
                            <div class="piece-card-title">${esc(title)}</div>
                        </div>
                        <span class="piece-card-arrow">▶</span>
                    </div>
                </a>
            `).join('');
        }
    }

    function esc(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
})();
