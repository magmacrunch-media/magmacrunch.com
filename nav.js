/* ═══════════════════════════════════════════════
    magmacrunch media — shared nav script
    nav.js
    ═══════════════════════════════════════════════ */

/* ── NAV CONFIG ──
   Update this config to change nav across all pages at once.
   Used by the auto-nav generator below. */

window.NAV_CONFIG = {
    brand: { href: './', text: 'magmacrunch.com' },
    sections: [
        { label: 'home', href: './' },
        { label: 'about', href: 'home/about.html' },
        { label: 'music', href: 'music/', items: [
            { href: 'music/jukebox/', label: 'jukebox' },
            { href: 'music/distributed-music.html', label: 'distributed music' },
            { href: 'music/physical-media/', label: 'physical media' }
        ]},
        { label: 'visual', href: 'visual/', items: [
            { href: 'visual/music-videos.html', label: 'music videos' },
            { href: 'visual/tv.html', label: 'teevee' },
            { href: 'visual/collage.html', label: 'collage' },
            { href: 'visual/photography.html', label: 'photography' }
        ]},
        { label: 'archive', href: 'archive/', items: [
            { href: 'archive/by-artist/', label: 'by artist' },
            { href: 'archive/by-place/', label: 'by place' },
            { href: 'archive/by-label/', label: 'by label' },
            { href: 'archive/by-contributor/', label: 'by contributor' }
        ]},
        { label: 'arcade', href: 'arcade/', items: [
            { href: 'arcade/board-games/', label: 'board games' },
            { href: 'arcade/card-games/', label: 'card games' },
            { href: 'arcade/puzzles/', label: 'puzzles' },
            { href: 'arcade/action/', label: 'action' }
        ]},
        { label: 'press', href: 'press/', items: [
            { href: 'press/scientific/', label: 'scientific' },
            { href: 'press/experimental/', label: 'experimental' },
            { href: 'press/lyrics/', label: 'lyrics' }
        ]},
        { label: 'tools', href: 'tools/', items: [
            { href: 'tools/album-art-maker/', label: 'album art' },
            { href: 'tools/media-search/', label: 'media search' },
            { href: 'tools/pixel-process/', label: 'pixel process' }
        ]},
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
    const depth = autoNav.dataset.depth || '';

    // Build nav HTML
    let navHTML = `<a href="${depth}${cfg.brand.href}" class="nav-brand">${cfg.brand.text}</a>\n<ul class="nav-links" id="navLinks">`;

    for (const sec of cfg.sections) {
        const href = depth + sec.href;
        if (sec.items && sec.items.length) {
            // Dropdown item
            navHTML += `\n<li><a href="${href}">${sec.label}</a><div class="dropdown">`;
            navHTML += `\n<a href="${href}" class="dropdown-view-all">view all ${sec.label}</a>`;
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

/* ── AUTO FAVICON ──
   Injects favicon from site root using the same
   depth prefix as nav links. Skips pages that
   already have a <link rel="icon"> in <head>. */

(function () {
    if (document.querySelector('link[rel="icon"], link[rel="shortcut icon"]')) return;
    const nav = document.getElementById('auto-nav');
    if (!nav) return;
    const depth = nav.dataset.depth || '';
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = depth + 'favicon.ico';
    link.type = 'image/x-icon';
    document.head.appendChild(link);
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

    // color map for sibling nav cards
    const COLOR_MAP = {
        events: 'c-rose',
        recordings: 'c-cyan',
        releases: 'c-cyan',
        works: 'c-purple',
        personnel: 'c-green',
        about: 'c-yellow',
        members: 'c-green',
        photography: 'c-orange',
    };

    // derive current page slug from filename (e.g. "recordings")
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');

    // back button color: use data-back-color attribute if set, else default to c-orange
    const backColor = main.dataset.backColor || 'c-orange';

    // always include ← back to parent index
    const cards = [`<a href="./" class="nav-card ${backColor}">← back</a>`];
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
    if (!nav || document.body.classList.contains('no-jukebox')) return;

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

/* ═══════════════════════════════════════════════
   SEARCH LOADER
   ───────────────────────────────────────────────
   Loads assets/search.css and assets/search.js
   on every page that has a <nav> element.
   ═══════════════════════════════════════════════ */

(function () {
    const nav = document.querySelector('nav');
    if (!nav || document.body.classList.contains('no-search')) return;

    const depth = window.location.pathname.split('/').length - 2;
    const root = depth > 0 ? '../'.repeat(depth) : '';

    /* Load CSS */
    if (!document.querySelector('link[href*="search.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = root + 'assets/search.css';
        document.head.appendChild(link);
    }

    /* Load JS */
    if (!document.querySelector('script[src*="search.js"]')) {
        const script = document.createElement('script');
        script.src = root + 'assets/search.js';
        document.body.appendChild(script);
    }
})();

/* ═══════════════════════════════════════════════
    HIT COUNTER LOADER
    ───────────────────────────────────────────────
    Loads assets/counter-client.js on every page
    that has a <nav> element. Increments the
    counter once per session (fire-and-forget).
    ═══════════════════════════════════════════════ */

(function () {
    const nav = document.querySelector('nav');
    if (!nav || document.body.classList.contains('no-counter')) return;

    const depth = window.location.pathname.split('/').length - 2;
    const root = depth > 0 ? '../'.repeat(depth) : '';

    if (!document.querySelector('script[src*="counter-client.js"]')) {
        const script = document.createElement('script');
        script.src = root + 'assets/counter-client.js';
        script.onload = function () {
            if (window.CounterClient) CounterClient.increment();
        };
        document.body.appendChild(script);
    }
})();

/* ── AUTO FONT LOADER ──
   Injects Google Fonts <link> tags so the browser
   can fetch them in parallel with style.css (which
   used to have a render-blocking @import). Fonts
   swap in when ready via font-display: swap. */

(function () {
    if (document.querySelector('link[href*="fonts.googleapis.com"][href*="Courier+Prime"]')) return;
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);
    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Courier+Prime:wght@400;700&display=swap';
    document.head.appendChild(link);
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
        'assets/search.css',
        'fonts/'
    ];

    /* ── EXCLUDED PATHS: full page load ── */
    const EXCLUDE_PATHS = ['/arcade/', '/by-contributor/', '/by-label/', '/tools/'];

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

        // Collect head external scripts (e.g. MathJax CDN)
        doc.querySelectorAll('head script[src]').forEach(s => {
            const src = abs(s.getAttribute('src'), baseURL);
            if (src && !src.includes('nav.js') && !src.includes('jukebox')) {
                externals.push(src);
            }
        });

        doc.querySelectorAll('body script').forEach(s => {
            const src = s.getAttribute('src');
            if (src) {
                if (!src.includes('nav.js') && !src.includes('jukebox.js') && !src.includes('jukebox.css')) {
                    externals.push(abs(src, baseURL));
                }
            } else {
                const t = s.textContent.trim();
                if (t && !t.includes('NAV_CONFIG')) {
                    // Config scripts (window.*_CONFIG = ...) must run before templates
                    if (/window\.[A-Z_]+CONFIG\s*=/.test(t)) {
                        configs.push(t);
                    } else {
                        inits.push(t);
                    }
                }
            }
        });

        for (const t of configs) {
            // Special handling: MathJax config — merge macros without destroying runtime
            if (t.includes('MathJax') && t.includes('tex')) {
                try {
                    const valueStr = t.replace(/MathJax\s*=\s*/, '');
                    const cfg = new Function('return (' + valueStr + ')')();
                    if (cfg && cfg.tex && cfg.tex.macros && MathJax.config && MathJax.config.tex) {
                        if (!MathJax.config.tex.macros) MathJax.config.tex.macros = {};
                        Object.assign(MathJax.config.tex.macros, cfg.tex.macros);
                    }
                } catch (e) { console.warn('SPA MathJax config:', e); }
                continue;
            }
            const m = t.match(/window\.([\w]+)\s*=\s*([\s\S]+?)\s*;?\s*$/);
            if (m) {
                const varName = m[1];
                const valueStr = m[2];
                if (window[varName] !== undefined) {
                    try { delete window[varName]; } catch {}
                }
                try { window[varName] = new Function('return (' + valueStr + ')')(); } catch (e) { console.warn('SPA config:', e); }
            }
        }

        for (const src of externals) {
            try {
                const bustSrc = src + (src.includes('?') ? '&' : '?') + '_spa=' + Date.now();
                await new Promise((res, rej) => {
                    const s = document.createElement('script');
                    s.src = bustSrc;
                    s.onload = () => { s.remove(); res(); };
                    s.onerror = () => { s.remove(); rej(); };
                    document.body.appendChild(s);
                });
            } catch (e) { console.warn('SPA external:', src, e); }
        }

        for (const t of inits) {
            try { new Function(t)(); } catch (e) { console.warn('SPA init:', e); }
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
            window.__MB_CACHE = null;
            window.__mcPageAborted = true;

            // Reset scroll lock from lightboxes
            document.body.style.overflow = '';

            // Remove template-injected <style> tags (no data-spa)
            document.querySelectorAll('head style:not([data-spa])').forEach(e => e.remove());

            const doc = await fetchDoc(url);

            swapCSS(doc, url);
            document.body.className = doc.body.className;

            // Update favicon
            const newFavicon = doc.querySelector('link[rel="icon"]');
            if (newFavicon) {
                let favicon = document.querySelector('link[rel="icon"]');
                if (!favicon) {
                    favicon = document.createElement('link');
                    favicon.rel = 'icon';
                    document.head.appendChild(favicon);
                }
                favicon.href = newFavicon.href;
                if (newFavicon.type) favicon.type = newFavicon.type;
            }

            const newMain = doc.querySelector('main');
            if (newMain) {
                // Resolve relative src/href to absolute using target page URL
                newMain.querySelectorAll('[src]').forEach(el => {
                    const src = el.getAttribute('src');
                    if (src && !src.startsWith('http') && !src.startsWith('/') && !src.startsWith('data:')) {
                        el.setAttribute('src', new URL(src, url).href);
                    }
                });
                newMain.querySelectorAll('[href]').forEach(el => {
                    const href = el.getAttribute('href');
                    if (href && !href.startsWith('http') && !href.startsWith('/') && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
                        el.setAttribute('href', new URL(href, url).href);
                    }
                });
                mainEl.innerHTML = newMain.innerHTML;
            }

            const newFooter = doc.querySelector('footer');
            const curFooter = document.querySelector('footer');
            if (newFooter && curFooter) {
                curFooter.innerHTML = newFooter.innerHTML;
            }

            // Hide chat widget on non-arcade pages
            const chatWidget = document.getElementById('arcadeChatWidget');
            if (chatWidget) {
                chatWidget.style.display = url.includes('/arcade/') ? '' : 'none';
            }

            document.title = doc.title;

            await runScripts(doc, url);
            window.__mcPageAborted = false;

            // Re-render MathJax if present (for pages with equations)
            if (window.MathJax) {
                const doTypeset = async () => {
                    if (MathJax.typesetClear) MathJax.typesetClear();
                    if (MathJax.typesetPromise) await MathJax.typesetPromise();
                };
                if (MathJax.typesetPromise) {
                    try { await doTypeset(); } catch (e) {}
                } else if (MathJax.startup) {
                    await new Promise(r => {
                        const check = setInterval(() => {
                            if (MathJax.typesetPromise) { clearInterval(check); doTypeset().then(r).catch(r); }
                        }, 100);
                        setTimeout(() => { clearInterval(check); r(); }, 5000);
                    });
                }
            }

            if (push) history.pushState({ spa: true }, '', url);

            // Re-inject jukebox widget if missing after SPA navigation
            if (!document.querySelector('.mcj') && window.__jukeboxReady) {
                await window.__jukeboxReady;
                if (typeof window.__initJukeboxPlayer === 'function' && !document.querySelector('.mcj')) {
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
        if (e.defaultPrevented) return;
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
