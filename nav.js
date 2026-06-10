/* ═══════════════════════════════════════════════
    magmacrunch media — shared nav script
    nav.js
    ═══════════════════════════════════════════════ */

/* ── NAV CONFIG ──
   Update this config to change nav across all pages at once.
   Used by the auto-nav generator below. */

window.NAV_CONFIG = {
    brand: { href: 'index.html', text: 'magmacrunch.com' },
    sections: [
        { label: 'home', href: 'index.html', items: [
            { href: 'home/about.html', label: 'about' },
            { href: 'home/links/all-links.html', label: 'all links' }
        ]},
        { label: 'music', href: 'music/index.html', items: [
            { href: 'music/jukebox/index.html', label: 'jukebox' },
            { href: 'music/distributed-music.html', label: 'distributed music' },
            { href: 'music/floppy-disk/index.html', label: 'floppy disk' },
            { href: 'music/catalog.html', label: 'full catalog' }
        ]},
        { label: 'visual', href: 'visual/index.html', items: [
            { href: 'visual/music-videos.html', label: 'music videos' },
            { href: 'visual/collage.html', label: 'collage' },
            { href: 'visual/photography.html', label: 'photography' }
        ]},
        { label: 'archive', href: 'archive/index.html', items: [
            { href: 'archive/by-artist/index.html', label: 'by artist' },
            { href: 'archive/by-place/index.html', label: 'by place' }
        ]},
        { label: 'arcade', href: 'arcade/index.html' },
        { label: 'guestbook', href: 'home/guestbook.html' }
    ]
};

/* ── AUTO-NAV GENERATOR ──
   If a page has <nav id="auto-nav">, generates nav from NAV_CONFIG.
   Respects relative paths for pages in subdirectories. */

(function () {
    const autoNav = document.getElementById('auto-nav');
    if (!autoNav || !window.NAV_CONFIG) return;

    const cfg = window.NAV_CONFIG;
    const depth = (autoNav.dataset.depth || '../../../').replace(/([^/])\//, '$1');

    // Build nav HTML
    let navHTML = `<a href="${depth}${cfg.brand.href}" class="nav-brand">${cfg.brand.text}</a>\n<ul class="nav-links" id="navLinks">`;

    for (const sec of cfg.sections) {
        const href = depth + sec.href;
        if (sec.items && sec.items.length) {
            // Dropdown item
            navHTML += `\n<li><a href="${href}">${sec.label}</a><div class="dropdown">`;
            for (const item of sec.items) {
                navHTML += `\n<a href="${depth}${item.href}">${item.label}</a>`;
            }
            navHTML += '</div></li>';
        } else {
            // Simple item
            navHTML += `\n<li><a href="${href}">${sec.label}</a></li>`;
        }
    }
    navHTML += '\n</ul>';
    navHTML += '\n<button class="hamburger" id="hamburger" aria-label="menu"><span></span><span></span><span></span></button>';

    autoNav.innerHTML = navHTML;
})();

/* ═══════════════════════════════════════════════
   INTERACTIVE FUNCTIONALITY
   (hamburger, dropdowns, active link)
   ═══════════════════════════════════════════════ */

(function () {
    const hamburger = document.getElementById('hamburger');
    const navLinks  = document.getElementById('navLinks');

    // ── MOBILE HAMBURGER ──
    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // ── MOBILE DROPDOWN TOGGLE ──
    // On mobile, tapping a nav item with a dropdown toggles it open/closed.
    // On desktop, CSS :hover handles it — JS only needed for mobile.
    if (navLinks) {
        navLinks.querySelectorAll('li').forEach(li => {
            const dropdown = li.querySelector('.dropdown');
            if (!dropdown) return;

            li.querySelector('a').addEventListener('click', (e) => {
                // Only intercept on mobile (hamburger visible)
                if (window.getComputedStyle(hamburger).display !== 'none') {
                    e.preventDefault();
                    // Close siblings
                    navLinks.querySelectorAll('li.open').forEach(openLi => {
                        if (openLi !== li) openLi.classList.remove('open');
                    });
                    li.classList.toggle('open');
                }
            });
        });

        // Close mobile menu when a dropdown link is clicked
        navLinks.querySelectorAll('.dropdown a').forEach(a => {
            a.addEventListener('click', () => {
                navLinks.classList.remove('open');
                navLinks.querySelectorAll('li.open').forEach(li => li.classList.remove('open'));
            });
        });
    }

    // ── ACTIVE LINK HIGHLIGHT ──
    // Disabled — caused too many edge-case issues with relative paths
    // Re-enable by restoring the matching logic when ready
})();

/* ═══════════════════════════════════════════════
    archive sub-nav auto-inject
    ───────────────────────────────────────────────
    Add  data-siblings="events,personnel,recordings,works"
    (or whichever subset exist) to <main> on any
    artist or place archive sub-page. This script
    will inject a .sub-nav block with a ← back
    button plus one nav-card per sibling, skipping
    whichever page is currently active.

    Inject target (in order of preference):
      1. first  .sub-nav already in .page-header  → replaced
      2. after  .page-title inside .page-header    → inserted after
      3. after  .page-header itself                → inserted after
      4. top of <main>                             → prepended
    ═══════════════════════════════════════════════ */

(function () {
    const main = document.querySelector('main[data-siblings]');
    if (!main) return;

    const siblings = main.dataset.siblings
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    if (!siblings.length) return;

    // derive current page slug from filename (e.g. "recordings")
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');



    // back button color: use data-back-color attribute if set, else default to c-orange
    const backColor = main.dataset.backColor || 'c-orange';

    // always include ← back to parent index
    const cards = [`<a href="index.html" class="nav-card ${backColor}">← back</a>`];
    for (const s of siblings) {
        if (s === currentPage) continue;
        cards.push(`<a href="${s}.html" class="nav-card ${COLOR_MAP[s] || 'c-cyan'}">${s}</a>`);
    }

    // if a hand-authored .sub-nav already exists inside .page-header, replace it
    // so there's no duplication if someone starts adding them manually mid-migration
    const pageHeader   = main.querySelector('.page-header');
    const existingNav  = pageHeader && pageHeader.querySelector('.sub-nav');

    const subNav = document.createElement('div');
    subNav.className = 'sub-nav';
    subNav.innerHTML = cards.join('\n');

    if (existingNav) {
        existingNav.replaceWith(subNav);
    } else if (pageHeader) {
        const titleEl = pageHeader.querySelector('.page-title');
        if (titleEl) {
            titleEl.insertAdjacentElement('afterend', subNav);
        } else {
            pageHeader.appendChild(subNav);
        }
    } else {
        main.prepend(subNav);
    }
})();

/* ═══════════════════════════════════════════════
   AUTO BREADCRUMB INJECTOR
   ───────────────────────────────────────────────
   Detects archive subpages (by-artist, by-place)
   and auto-generates breadcrumbs based on URL path.

   Add <div id="breadcrumb"></div> where you want
   the breadcrumb to appear. If not present, injects
   at top of <main>.

   Supports:
   - archive/by-artist/[artist]/index.html
   - archive/by-artist/[artist]/recordings.html
   - archive/by-place/[place]/index.html
   - archive/by-place/[place]/recordings.html
   ═══════════════════════════════════════════════ */

/* DISABLED - breadcrumbs are now hardcoded in each page
(function () {
    const path = window.location.pathname;

    // Only run on archive subpages (individual artist/place folders)
    if (!path.includes('/archive/by-artist/') && !path.includes('/archive/by-place/')) return;
    // Skip the by-artist/index.html and by-place/index.html pages themselves
    if (path === '/archive/by-artist/index.html' || path === '/archive/by-place/index.html') return;
    // Skip folder index pages (they already have hardcoded breadcrumbs in page-header)
    if (path.match(/\/archive\/by-(artist|place)\/([^/]*)\/index\.html$/)) return;

    // Determine section (artist or place)
    const isArtist = path.includes('/archive/by-artist/');
    const isPlace  = path.includes('/archive/by-place/');
    if (!isArtist && !isPlace) return;

    // Extract folder depth
    const parts = path.split('/').filter(Boolean);
    const archiveIdx = parts.indexOf('archive');
    const sectionIdx = archiveIdx + 1; // by-artist or by-place
    const folderIdx  = archiveIdx + 2; // artist/place folder name

    const section = parts[sectionIdx]; // "by-artist" or "by-place"
    const folder   = parts[folderIdx]; // e.g. "bottle-boys-collective"
    const file    = parts[parts.length - 1]; // e.g. "index.html" or "recordings.html"

    if (!folder) return;

    // Build breadcrumb segments
    const crumbs = [
        { label: 'home',   href: '../../../index.html' },
        { label: 'archive', href: '../../../archive/index.html' },
        { label: section.replace('by-', ''), href: `../../../archive/${section}/index.html` },
        { label: folder.replace(/-/g, ' '), href: `../index.html`, isCurrent: file === 'index.html' || file.includes(folder) }
    ];

    // For subpages (recordings.html, works.html, etc), add the page name
    if (file !== 'index.html' && file.endsWith('.html')) {
        const pageName = file.replace('.html', '').replace(/-/g, ' ');
        crumbs.push({ label: pageName, isCurrent: true });
    }

    // Build HTML
    const html = crumbs.map((c, i) => {
        if (c.isCurrent) {
            return `<span class="current">${c.label}</span>`;
        }
        return `<a href="${c.href}">${c.label}</a>`;
    }).join('<span class="sep">›</span>');

    // Color based on section
    const color = isArtist ? 'var(--rose)' : 'var(--green)';
    const css = `
        .breadcrumb { font-family: 'Press Start 2P', monospace; font-size: 7px; letter-spacing: 0.1em; margin-bottom: 24px; }
        .breadcrumb a { color: var(--dim); text-decoration: none; transition: color 0.15s; }
        .breadcrumb a:hover { color: ${color}; }
        .breadcrumb .sep { margin: 0 8px; color: ${color}; opacity: 0.7; }
        .breadcrumb .current { color: ${color}; }
    `;

    // Inject CSS if not present
    if (!document.querySelector('#breadcrumb-style')) {
        const style = document.createElement('style');
        style.id = 'breadcrumb-style';
        style.textContent = css;
        document.head.appendChild(style);
    }

    // Find or create breadcrumb container
    let bc = document.getElementById('breadcrumb');
    if (!bc) {
        bc = document.createElement('div');
        bc.id = 'breadcrumb';
        bc.className = 'breadcrumb';
        const main = document.querySelector('main');
        if (main) main.prepend(bc);
    }

    bc.innerHTML = html;
})();*/

/* ═══════════════════════════════════════════════
   JUKEBOX MINI-PLAYER LOADER
   ───────────────────────────────────────────────
   Loads assets/jukebox.css and assets/jukebox.js
   on every page that has a <nav> element.
   Arcade games don't load nav.js, so they're
   automatically excluded.
   ═══════════════════════════════════════════════ */

(function () {
    const nav = document.querySelector('nav');
    if (!nav) return;

    // Compute base path to site root from current page
    const depth = window.location.pathname.split('/').length - 2;
    const root = depth > 0 ? '../'.repeat(depth) : '';

    // Load CSS
    if (!document.querySelector('link[href*="jukebox.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = root + 'assets/jukebox.css';
        document.head.appendChild(link);
    }

    // Load JS — return a promise so the SPA router can await it
    if (!document.querySelector('script[src*="jukebox.js"]')) {
        window.__jukeboxReady = new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = root + 'assets/jukebox.js';
            script.onload = resolve;
            script.onerror = resolve;
            document.body.appendChild(script);
        });
    } else {
        window.__jukeboxReady = Promise.resolve();
    }
})();

/* ── ABSOLUTIZE NAV HREFS ──
   Convert all <nav> links to absolute paths so
   they survive pushState URL changes from the SPA
   router. Must run before the SPA router inits.  ── */
document.querySelectorAll('nav a[href]').forEach(a => {
    try {
        const url = new URL(a.getAttribute('href'), location.href);
        if (url.origin === location.origin) a.href = url.pathname;
    } catch {}
});

/* ═══════════════════════════════════════════════
   SPA-STYLE AJAX ROUTER
   ───────────────────────────────────────────────
   Intercepts same-site <a> clicks, fetches the
   target page, parses it, swaps <main> content,
   and manages CSS/script lifecycle. Audio in <nav>
   persists across navigations.
   ═══════════════════════════════════════════════ */

(function () {
    const mainEl = document.querySelector('main');
    const navEl  = document.querySelector('nav');
    if (!mainEl || !navEl) return;

    const SPA = 'data-spa';

    /* ── GLOBAL CSS: never removed ── */
    const GLOBAL_CSS_PATTERNS = [
        'style.css',
        'assets/archive.css',
        'assets/jukebox.css',
        'assets/jukebox.min',
        'fonts/'
    ];

    /* ── EXCLUDED PATHS: full page load ── */
    const EXCLUDE_PATHS = ['/arcade/', '/music/jukebox/'];

    /* ── HELPERS ── */
    function abs(href, base) {
        try { return new URL(href, base).href; } catch { return href; }
    }

    function isGlobal(href) {
        return GLOBAL_CSS_PATTERNS.some(p => href.includes(p));
    }

    function shouldExclude(path) {
        return EXCLUDE_PATHS.some(p => path.includes(p));
    }

    function isSPAEligible(a) {
        if (!a) return false;
        if (a.target === '_blank' || a.hasAttribute('download')) return false;
        const h = a.getAttribute('href');
        if (!h || h.startsWith('mailto:') || h.startsWith('tel:') || h.startsWith('#')) return false;
        try {
            const url = new URL(h, location.href);
            if (url.origin !== location.origin) return false;
            if (shouldExclude(url.pathname)) return false;
            if (url.pathname === location.pathname && !url.hash) return false;
            return true;
        } catch { return false; }
    }

    async function fetchDoc(url) {
        const r = await fetch(url);
        if (!r.ok) throw new Error(r.status + ' ' + url);
        return new DOMParser().parseFromString(await r.text(), 'text/html');
    }

    /* ── CSS MANAGEMENT ── */
    function collectHrefs(doc, base) {
        const set = new Set();
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
            const h = el.getAttribute('href');
            if (h) set.add(abs(h, base));
        });
        return set;
    }

    function swapCSS(doc, baseURL) {
        const newHrefs = collectHrefs(doc, baseURL);

        // Remove old page-specific CSS NOT in new page
        document.querySelectorAll('link[' + SPA + ']').forEach(el => {
            const existingAbs = abs(el.getAttribute('href'), location.href);
            if (!newHrefs.has(existingAbs)) el.remove();
        });

        // Remove old inline styles
        document.querySelectorAll('style[' + SPA + ']').forEach(e => e.remove());

        // Add new page-specific CSS
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
            const raw = el.getAttribute('href');
            if (!raw) return;
            const a = abs(raw, baseURL);
            if (isGlobal(a)) {
                if (!document.querySelector('link[href="' + a + '"]')) {
                    const c = document.createElement('link');
                    c.rel = 'stylesheet';
                    c.href = a;
                    document.head.appendChild(c);
                }
            } else {
                if (!document.querySelector('link[href="' + a + '"]')) {
                    const c = document.createElement('link');
                    c.rel = 'stylesheet';
                    c.href = a;
                    c.setAttribute(SPA, '');
                    document.head.appendChild(c);
                }
            }
        });

        // Add new inline styles
        doc.querySelectorAll('style').forEach(el => {
            const c = el.cloneNode(true);
            c.setAttribute(SPA, '');
            document.head.appendChild(c);
        });
    }

    /* ── SCRIPT MANAGEMENT ── */
    async function runScripts(doc, baseURL) {
        const configs   = [];
        const externals = [];
        const inits     = [];

        doc.querySelectorAll('head script:not([src])').forEach(s => {
            const t = s.textContent.trim();
            if (t && !t.includes('NAV_CONFIG')) configs.push(t);
        });

        doc.querySelectorAll('body script').forEach(s => {
            const src = s.getAttribute('src');
            if (src) {
                if (!src.includes('nav.js') && !src.includes('jukebox.js') && !src.includes('jukebox.css')) {
                    externals.push(abs(src, baseURL));
                }
            } else {
                const t = s.textContent.trim();
                if (t && !t.includes('NAV_CONFIG')) inits.push(t);
            }
        });

        for (const t of configs) {
            const m = t.match(/window\.([\w]+)\s*=/);
            if (m && window[m[1]] !== undefined) {
                try { delete window[m[1]]; } catch {}
            }
            try { eval(t); } catch (e) { console.warn('SPA config:', e); }
        }

        for (const src of externals) {
            const alreadyLoaded = Array.from(document.querySelectorAll('script[src]')).some(s => {
                try { return new URL(s.getAttribute('src'), location.href).href === src; }
                catch { return false; }
            });
            if (alreadyLoaded) continue;
            try {
                await new Promise((res, rej) => {
                    const s = document.createElement('script');
                    s.src = src;
                    s.onload = res;
                    s.onerror = rej;
                    document.body.appendChild(s);
                });
            } catch (e) { console.warn('SPA external:', src, e); }
        }

        for (const t of inits) {
            try { eval(t); } catch (e) { console.warn('SPA init:', e); }
        }
    }

    /* ── NAVIGATION ── */
    let navigating = false;

    async function navigate(url, push) {
        if (navigating) return;
        navigating = true;

        try {
            if (typeof window.__pageCleanup === 'function') {
                window.__pageCleanup();
                window.__pageCleanup = null;
            }

            const doc = await fetchDoc(url);

            swapCSS(doc, url);
            document.body.className = doc.body.className;

            const newMain = doc.querySelector('main');
            if (newMain) mainEl.innerHTML = newMain.innerHTML;

            document.title = doc.title;

            await runScripts(doc, url);

            if (push) history.pushState({ spa: true }, '', url);

            // Re-inject jukebox mini-player if missing (e.g. after leaving full jukebox page)
            if (!document.querySelector('.nav-player') && window.__jukeboxReady) {
                await window.__jukeboxReady;
                if (typeof window.__initJukeboxPlayer === 'function' && !document.querySelector('.nav-player')) {
                    window.__initJukeboxPlayer();
                }
            }

            window.scrollTo(0, 0);

        } catch (e) {
            console.error('SPA nav failed:', e);
            location.href = url;
        } finally {
            navigating = false;
        }
    }

    /* ── CLICK INTERCEPTION ── */
    document.addEventListener('click', function (e) {
        const a = e.target.closest('a');
        if (!isSPAEligible(a)) return;
        e.preventDefault();

        // Close mobile menu
        const nl = document.getElementById('navLinks');
        if (nl) {
            nl.classList.remove('open');
            nl.querySelectorAll('li.open').forEach(li => li.classList.remove('open'));
        }

        navigate(abs(a.getAttribute('href'), location.href), true);
    });

    /* ── BACK/FORWARD ── */
    window.addEventListener('popstate', function (e) {
        navigate(location.href, false);
    });

    /* ── TAG INITIAL PAGE-SPECIFIC ELEMENTS ── */
    document.querySelectorAll('link[rel="stylesheet"]').forEach(el => {
        const h = el.getAttribute('href') || '';
        if (!isGlobal(h)) el.setAttribute(SPA, '');
    });
    document.querySelectorAll('style').forEach(el => {
        el.setAttribute(SPA, '');
    });
})();
