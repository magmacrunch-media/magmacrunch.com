/* ═══════════════════════════════════════════════
   magmacrunch media — photography page template
   templates/artist_photography.js

   The stub HTML file provides all static structure
   (nav, main skeleton, footer). This script handles:
     1. Injecting page-specific styles (accent color)
     2. Populating dynamic stub elements (breadcrumb, sub-nav, artist label)

   Requires window.ARTIST_CONFIG (defined in stub) = {
     id:        string   — MusicBrainz artist ID
     name:      string   — full artist name
     abbr:      string   — short label (e.g. "DS")
     accent:    string   — CSS var name without --
     backColor: string   — nav-card class for ← back
     siblings:  string[] — sibling page names
     depth:     string   — path prefix to site root
   }
   ═══════════════════════════════════════════════ */

(function () {
    const C = window.ARTIST_CONFIG;
    if (!C) { console.error('artist_photography.js: window.ARTIST_CONFIG is not defined'); return; }

    const d      = C.depth  || '../../../';
    const accent = C.accent || 'cyan';

    const COLOR_MAP = {
        about:       'c-deep',
        photography: 'c-blue',
        events:      'c-green',
        recordings:  'c-cyan',
        releases:    'c-rose',
        works:       'c-yellow',
    };

    const BACK_COLOR_VAR = {
        'c-back':    'var(--cyan)',
        'c-green':   'var(--green)',
        'c-cyan':    'var(--cyan)',
        'c-rose':    'var(--rose)',
        'c-yellow':  'var(--yellow)',
        'c-orange':  'var(--orange)',
        'c-purple':  'var(--purple)',
        'c-slate':   'var(--slate)',
        'c-blue':    'var(--blue)',
        'c-magenta': 'var(--magenta)',
        'c-deep':    'var(--cool-neutral)',
        'c-cool-neutral': 'var(--cool-neutral)',
    };
    const backColorVar = BACK_COLOR_VAR[C.backColor] || 'var(--cyan)';

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
        'cool-neutral': '96,148,170',
    };
    const accentRgb = ACCENT_RGB[accent] || '0,245,255';
    const accentVar = `var(--${accent})`;

    // ── 1. INJECT PAGE-SPECIFIC STYLES ──
    const style = document.createElement('style');
    style.textContent = `
        main { flex: 1; display: flex; flex-direction: column; align-items: center; padding: 72px 20px 60px; }

        .breadcrumb { position: relative; z-index: 10; font-family: 'Press Start 2P', monospace; font-size: 7px; color: var(--dim); letter-spacing: 0.1em; margin-top: -8px; margin-bottom: 16px; align-self: flex-start; }
        .breadcrumb a { color: var(--dim); text-decoration: none; transition: color 0.15s; }
        .breadcrumb a:hover { color: ${accentVar}; }
        .breadcrumb .sep { margin: 0 8px; color: ${accentVar}; opacity: 0.7; }
        .breadcrumb .current { color: ${accentVar}; }

        .page-header { width: 100%; max-width: 960px; margin-bottom: 32px; animation: fadeUp 0.5s ease both; }
        .artist-label { font-family: 'Press Start 2P', monospace; font-size: 10px; color: ${backColorVar}; letter-spacing: 0.2em; margin-bottom: 8px; opacity: 0.8; }
        .page-title { font-family: 'Press Start 2P', monospace; font-size: clamp(12px, 2.5vw, 20px); color: ${accentVar}; letter-spacing: 0.08em; line-height: 1.6; margin-bottom: 20px; text-shadow: 0 0 20px rgba(${accentRgb},0.45); }
        .sub-nav { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 36px; }

        .photo-grid-section { width: 100%; max-width: 960px; animation: fadeUp 0.5s 0.1s ease both; }
        .photo-grid-section p { font-family: 'Courier Prime', monospace; font-size: 14px; color: var(--white); line-height: 1.8; opacity: 0.7; }
    `;
    document.head.appendChild(style);

    // ── 2. POPULATE DYNAMIC STUB ELEMENTS ──

    // breadcrumb
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

    // artist label
    const artistLabelEl = document.getElementById('artist-label');
    if (artistLabelEl) artistLabelEl.textContent = `// ${C.name} //`;

    // sub-nav
    const subNavEl = document.getElementById('sub-nav');
    if (subNavEl) {
        subNavEl.innerHTML = [
            `<a href="./" class="nav-card c-back">← back</a>`,
            ...(C.siblings || []).filter(s => s !== 'photography').map(s => {
                const label = s.replace(/-/g, ' ');
                return `<a href="${s}.html" class="nav-card ${COLOR_MAP[s] || 'c-cyan'}">${label}</a>`;
            })
        ].join('\n');
    }
})();